from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from analyzer import mitigation
from utils.data_loader import load_csv

router = APIRouter()


class MitigateRequest(BaseModel):
    file_id: str
    sensitive_col: str
    target_col: str
    model_type: str = "random_forest"
    technique: str = "reweighing"


@router.post("/mitigate")
async def mitigate_dataset(req: MitigateRequest):
    try:
        df = load_csv(req.file_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Dataset not found. Please upload again.")

    if req.sensitive_col not in df.columns:
        raise HTTPException(status_code=400, detail=f"Column '{req.sensitive_col}' not found")
    if req.target_col not in df.columns:
        raise HTTPException(status_code=400, detail=f"Column '{req.target_col}' not found")

    valid_techniques = {"reweighing", "threshold"}
    if req.technique not in valid_techniques:
        raise HTTPException(status_code=400, detail=f"technique must be one of {valid_techniques}")

    try:
        result = mitigation.apply(
            df, req.sensitive_col, req.target_col, req.model_type, req.technique
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Mitigation failed: {str(e)}")
