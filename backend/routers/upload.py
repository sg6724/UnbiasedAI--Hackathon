import os
import io
import uuid
import logging
import httpx
import pandas as pd
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from google.cloud import storage
from analyzer import feature_detector
from utils.auth import get_current_user, AuthUser
from utils.supabase_client import SUPABASE_URL, SUPABASE_ANON_KEY

router = APIRouter()
logger = logging.getLogger("fairlens.upload")

_GCS_BUCKET = os.getenv("GCS_BUCKET", "fairlens-uploads-foresightflow")


def _bucket() -> storage.Bucket:
    client = storage.Client()
    return client.bucket(_GCS_BUCKET)


@router.post("/upload")
async def upload_dataset(
    file: UploadFile = File(...),
    auth: AuthUser = Depends(get_current_user),
):
    logger.info("Upload request — user=%s  file=%s", auth.user_id[:8], file.filename)

    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")

    file_bytes = await file.read()
    file_id = str(uuid.uuid4())

    try:
        df = pd.read_csv(io.BytesIO(file_bytes), sep=None, engine="python")
        logger.info("Parsed CSV: %d rows × %d cols", *df.shape)
    except Exception:
        try:
            df = pd.read_csv(io.BytesIO(file_bytes), sep=None, engine="python", header=None)
            logger.info("Parsed CSV (no header): %d rows × %d cols", *df.shape)
        except Exception as e:
            logger.error("CSV parse failed: %s", e)
            raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {str(e)}")

    if df.empty or len(df.columns) < 2:
        raise HTTPException(status_code=400, detail="CSV must have at least 2 columns and 1 row")

    try:
        blob = _bucket().blob(f"{file_id}.csv")
        blob.upload_from_string(file_bytes, content_type="text/csv")
        logger.info("Uploaded to GCS: %s/%s.csv", _GCS_BUCKET, file_id)
    except Exception as e:
        logger.error("GCS upload error: %s", e)
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    try:
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
