import os
import io
import pandas as pd
from google.cloud import storage

_GCS_BUCKET = os.getenv("GCS_BUCKET", "fairlens-uploads-foresightflow")


def _bucket() -> storage.Bucket:
    client = storage.Client()
    return client.bucket(_GCS_BUCKET)


def load_csv(file_id: str) -> pd.DataFrame:
    blob = _bucket().blob(f"{file_id}.csv")
    if not blob.exists():
        raise FileNotFoundError(f"Dataset {file_id} not found")
    data = blob.download_as_bytes()
    try:
        return pd.read_csv(io.BytesIO(data), sep=None, engine="python")
    except Exception:
        return pd.read_csv(io.BytesIO(data), sep=None, engine="python", header=None)


def save_csv(df: pd.DataFrame, file_id: str) -> None:
    buf = io.BytesIO()
    df.to_csv(buf, index=False)
    buf.seek(0)
    _bucket().blob(f"{file_id}.csv").upload_from_file(buf, content_type="text/csv")


def get_upload_dir() -> str:
    return os.getenv("UPLOAD_DIR", "/tmp/fairlens_uploads")
