import logging
import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from analyzer import model_trainer, metrics as metrics_module, proxy_detector, explainer
from analyzer.validator import validate_target_column, detect_leakage
from utils.data_loader import load_csv
from utils.auth import get_current_user, AuthUser
from utils.supabase_client import SUPABASE_URL, SUPABASE_ANON_KEY

router = APIRouter()
logger = logging.getLogger("fairlens.analyze")


class AnalyzeRequest(BaseModel):
    file_id: str
    file_name: str
    sensitive_col: str
    target_col: str
    model_type: str = "random_forest"


@router.post("/analyze")
async def analyze_dataset(
    req: AnalyzeRequest,
    auth: AuthUser = Depends(get_current_user),
):
    logger.info(
        "Analyze request — user=%s  file=%s  sensitive=%s  target=%s  model=%s",
        auth.user_id[:8], req.file_name, req.sensitive_col, req.target_col, req.model_type,
    )

    try:
        df = load_csv(req.file_id)
        logger.info("Loaded CSV: %d rows × %d cols", *df.shape)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Dataset not found. Please upload again.")

    if req.sensitive_col not in df.columns:
        raise HTTPException(status_code=400, detail=f"Column '{req.sensitive_col}' not found in dataset")
    if req.target_col not in df.columns:
        raise HTTPException(status_code=400, detail=f"Column '{req.target_col}' not found in dataset")
    if req.sensitive_col == req.target_col:
        raise HTTPException(status_code=400, detail="Sensitive column and target column must be different")

    valid_models = {"random_forest", "logistic_regression", "decision_tree"}
    if req.model_type not in valid_models:
        raise HTTPException(status_code=400, detail=f"model_type must be one of {valid_models}")

    # Fix #1: validate target column before training
    logger.info("Validating target column...")
    try:
        target_warnings = validate_target_column(df, req.target_col)
    except ValueError as e:
        logger.warning("Target column rejected: %s", e)
        raise HTTPException(status_code=400, detail=str(e))

    # Fix #8: detect feature leakage
    logger.info("Checking for feature leakage...")
    leakage_warnings = detect_leakage(df, req.target_col, req.sensitive_col)
    if leakage_warnings:
        for w in leakage_warnings:
            logger.warning("Leakage: %s", w)

    logger.info("Training model...")
    try:
        trained = model_trainer.train(df, req.sensitive_col, req.target_col, req.model_type)
    except Exception as e:
        logger.error("Model training failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Model training failed: {str(e)}")

    trainer_warnings = trained.get("warnings", [])

    logger.info("Computing fairness metrics...")
    try:
        computed_metrics = metrics_module.compute(
            trained["y_true"], trained["y_pred"], trained["sensitive_test"]
        )
    except Exception as e:
        logger.error("Metrics computation failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Metrics computation failed: {str(e)}")

    metrics_warnings = computed_metrics.pop("warnings", [])

    try:
        proxy_features = proxy_detector.detect(df, req.sensitive_col, req.target_col)
        logger.info("Proxy features detected: %d", len(proxy_features))
    except Exception:
        proxy_features = []

    logger.info("Generating Gemini report...")
    try:
        report = explainer.generate_report(
            computed_metrics, proxy_features, req.sensitive_col, req.target_col, req.model_type
        )
    except Exception as e:
        logger.warning("Report generation failed: %s", e)
        report = "Report generation failed. Please check your Gemini API key."

    # Collect all warnings in order of importance
    all_warnings = target_warnings + leakage_warnings + trainer_warnings + metrics_warnings
    for w in all_warnings:
        logger.info("Pipeline warning: %s", w)

    verdict = computed_metrics.pop("verdict", "biased")
    logger.info("Verdict: %s  Warnings: %d", verdict, len(all_warnings))

    logger.info("Saving audit to Supabase...")
    try:
        response = httpx.post(
            f"{SUPABASE_URL}/rest/v1/audit_history",
            json={
                "user_id": auth.user_id,
                "file_name": req.file_name,
                "sensitive_col": req.sensitive_col,
                "target_col": req.target_col,
                "model_type": req.model_type,
                "verdict": verdict,
                "metrics": computed_metrics,
                "proxy_features": proxy_features,
                "report": report,
            },
            headers={
                "Authorization": f"Bearer {auth.token}",
                "apikey": SUPABASE_ANON_KEY,
                "Content-Type": "application/json",
                "Prefer": "return=minimal",
            },
            timeout=10,
        )
        response.raise_for_status()
        logger.info("Audit saved to Supabase OK")
    except httpx.HTTPStatusError as e:
        logger.error("Failed to save audit: %s", e.response.text)
        raise HTTPException(status_code=500, detail=f"Failed to save audit: {e.response.text}")
    except Exception as e:
        logger.error("Failed to save audit: %s", e)
        raise HTTPException(status_code=500, detail=f"Failed to save audit: {str(e)}")

    logger.info("Analysis complete")
    return {
        "metrics": computed_metrics,
        "proxy_features": proxy_features,
        "verdict": verdict,
        "report": report,
        "warnings": all_warnings,
    }
