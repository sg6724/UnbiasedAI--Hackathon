import os
import logging
import time
from dotenv import load_dotenv

load_dotenv()

import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from routers import upload, analyze, mitigate, proxy

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("fairlens")

app = FastAPI(
    title="FairLens API",
    description="AI Bias Auditing Tool — Google Solution Challenge 2026",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    logger.info("→ %s %s", request.method, request.url.path)
    response = await call_next(request)
    elapsed = (time.perf_counter() - start) * 1000
    logger.info("← %s %s  %d  %.0fms", request.method, request.url.path, response.status_code, elapsed)
    return response


app.include_router(upload.router)
app.include_router(analyze.router)
app.include_router(mitigate.router)
app.include_router(proxy.router)


@app.on_event("startup")
async def startup():
    upload_dir = os.getenv("UPLOAD_DIR", "/tmp/fairlens_uploads")
    os.makedirs(upload_dir, exist_ok=True)
    logger.info("FairLens API started — upload dir: %s", upload_dir)


@app.get("/")
async def root():
    return {"status": "ok", "service": "FairLens API"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
