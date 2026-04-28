from dataclasses import dataclass
import httpx
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from utils.supabase_client import SUPABASE_URL, SUPABASE_ANON_KEY

security = HTTPBearer()


@dataclass
class AuthUser:
    user_id: str
    token: str


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> AuthUser:
    token = credentials.credentials
    try:
        response = httpx.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={
                "Authorization": f"Bearer {token}",
                "apikey": SUPABASE_ANON_KEY,
            },
            timeout=10,
        )
        response.raise_for_status()
        user_id = response.json()["id"]
        return AuthUser(user_id=user_id, token=token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
