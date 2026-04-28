import os
import pandas as pd


def get_upload_dir() -> str:
    return os.getenv("UPLOAD_DIR", "/tmp/fairlens_uploads")


def load_csv(file_id: str) -> pd.DataFrame:
    path = os.path.join(get_upload_dir(), f"{file_id}.csv")
    if not os.path.exists(path):
        raise FileNotFoundError(f"Dataset {file_id} not found")
    try:
        return pd.read_csv(path, sep=None, engine="python")
    except Exception:
        return pd.read_csv(path, sep=None, engine="python", header=None)


def save_csv(df: pd.DataFrame, file_id: str) -> None:
    upload_dir = get_upload_dir()
    os.makedirs(upload_dir, exist_ok=True)
    df.to_csv(os.path.join(upload_dir, f"{file_id}.csv"), index=False)
