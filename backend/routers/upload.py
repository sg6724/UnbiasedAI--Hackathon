import os
import uuid
import logging
import shutil
import httpx
import pandas as pd
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from analyzer import feature_detector
from utils.data_loader import get_upload_dir
from utils.auth import get_current_user, AuthUser
from utils.supabase_client import SUPABASE_URL, SUPABASE_ANON_KEY

router = APIRouter()
logger = logging.getLogger("fairlens.upload")


@router.post("/upload")
async def upload_dataset(
    file: UploadFile = File(...),
    auth: AuthUser = Depends(get_current_user),
):
    logger.info("Upload request — user=%s  file=%s", auth.user_id[:8], file.filename)

    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")

    file_id = str(uuid.uuid4())
    upload_dir = get_upload_dir()
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, f"{file_id}.csv")

    try:
        with open(file_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        logger.info("Saved to disk: %s", file_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    try:
        df = pd.read_csv(file_path, sep=None, engine="python")
        logger.info("Parsed CSV: %d rows × %d cols", *df.shape)
    except Exception:
        try:
            df = pd.read_csv(file_path, sep=None, engine="python", header=None)
            logger.info("Parsed CSV (no header): %d rows × %d cols", *df.shape)
        except Exception as e:
            os.remove(file_path)
            logger.error("CSV parse failed: %s", e)
            raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {str(e)}")

    if df.empty or len(df.columns) < 2:
        os.remove(file_path)
        raise HTTPException(status_code=400, detail="CSV must have at least 2 columns and 1 row")

    try:
        with open(file_path, "rb") as f:
            file_bytes = f.read()
        storage_path = f"{auth.user_id}/{file_id}.csv"
        logger.info("Uploading to Supabase Storage: datasets/%s", storage_path)
        response = httpx.post(
            f"{SUPABASE_URL}/storage/v1/object/datasets/{storage_path}",
            content=file_bytes,
            headers={
                "Authorization": f"Bearer {auth.token}",
                "apikey": SUPABASE_ANON_KEY,
                "Content-Type": "text/csv",
            },
            timeout=30,
        )
        response.raise_for_status()
        logger.info("Storage upload OK")
    except httpx.HTTPStatusError as e:
        logger.error("Storage upload failed: %s", e.response.text)
        raise HTTPException(status_code=500, detail=f"Failed to upload to storage: {e.response.text}")
    except Exception as e:
        logger.error("Storage upload error: %s", e)
        raise HTTPException(status_code=500, detail=f"Failed to upload to storage: {str(e)}")

    detected = feature_detector.detect(df)
    logger.info("Auto-detected sensitive cols: %s", detected["auto_detected"])

    sample_df = df.head(5)
    sample = {}
    for col in sample_df.columns:
        sample[col] = [
            None if pd.isna(v) else (v.item() if hasattr(v, "item") else v)
            for v in sample_df[col].values
        ]

    logger.info("Upload complete — file_id=%s", file_id)
    return {
        "file_id": file_id,
        "columns": detected["all_columns"],
        "shape": list(df.shape),
        "auto_detected_sensitive": detected["auto_detected"],
        "sample": sample,
    }
