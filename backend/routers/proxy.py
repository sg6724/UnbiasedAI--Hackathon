import logging
import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

router = APIRouter()
logger = logging.getLogger("fairlens.proxy")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; FairLens/1.0; +https://fairlens.app)",
    "Accept": "text/csv,text/plain,*/*",
}


@router.get("/proxy-dataset")
async def proxy_dataset(url: str):
    logger.info("Fetching demo dataset: %s", url)
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=60, verify=True) as client:
            resp = await client.get(url, headers=HEADERS)
            logger.info("Remote responded %d, content-length=%s", resp.status_code, resp.headers.get("content-length", "unknown"))
            resp.raise_for_status()
    except httpx.HTTPStatusError as e:
        logger.error("HTTP error fetching dataset: %s — %s", url, e)
        raise HTTPException(status_code=502, detail=f"Remote returned {e.response.status_code}")
    except httpx.TimeoutException:
        logger.error("Timeout fetching dataset: %s", url)
        raise HTTPException(status_code=504, detail="Remote dataset timed out")
    except Exception as e:
        logger.error("Failed to fetch dataset: %s — %s", url, e)
        raise HTTPException(status_code=502, detail=str(e))

    logger.info("Dataset fetched OK, %d bytes", len(resp.content))
    return Response(content=resp.content, media_type="text/csv")
