# FairLens — Setup Guide

---

## Live Deployment

| Service | URL |
|---|---|
| Frontend | https://unbiased-ai-bice.vercel.app/ |
| Backend API | https://fairlens-backend-1059141951832.asia-south1.run.app |
| API Docs (Swagger) | https://fairlens-backend-1059141951832.asia-south1.run.app/docs |

---

## Local Development

### Prerequisites

| Tool | Version | Install |
|---|---|---|
| Python | 3.11+ | https://python.org |
| `uv` | latest | `pip install uv` or `curl -LsSf https://astral.sh/uv/install.sh \| sh` |
| Node.js | 18+ | https://nodejs.org |
| npm | 9+ | comes with Node |

---

### Step 1 — Clone

```bash
git clone <YOUR_GITHUB_REPO_URL>
cd UnbiasedAI--Hackathon
```

---

### Step 2 — Backend

#### 2a. Create `backend/.env`

```env
GEMINI_API_KEY=your_gemini_api_key_here
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
GCS_BUCKET=your_gcs_bucket_name        # or omit to use local /tmp storage
UPLOAD_DIR=/tmp/fairlens_uploads       # only used as fallback
```

> For local dev without GCS, the backend falls back to local disk at `UPLOAD_DIR`. Set `GCS_BUCKET` only if you have a Google Cloud project configured.

#### 2b. Start the backend

```bash
cd backend
uv run uvicorn main:app --reload
```

`uv` auto-creates a virtualenv and installs `requirements.txt` on first run (~2 min).

Backend runs at **http://localhost:8000** — verify at http://localhost:8000/docs.

---

### Step 3 — Frontend

Open a new terminal (keep the backend running).

#### 3a. Create `frontend/.env`

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_BASE_URL=http://localhost:8000
```

#### 3b. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at **http://localhost:5173**.

---

### Step 4 — Verify

1. Open http://localhost:5173
2. Sign up / sign in via the auth modal
3. Upload a CSV (or use a demo dataset)
4. Configure sensitive + target columns → run the audit
5. You should see a **BIASED** or **FAIR** verdict with metrics

---

## Deploying

### Backend — Google Cloud Run

```bash
# Set project
gcloud config set project YOUR_PROJECT_ID

# Build and push image
gcloud builds submit --tag asia-south1-docker.pkg.dev/YOUR_PROJECT_ID/YOUR_REPO/fairlens-backend backend/

# Deploy
gcloud run deploy fairlens-backend \
  --image asia-south1-docker.pkg.dev/YOUR_PROJECT_ID/YOUR_REPO/fairlens-backend \
  --platform managed \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars="GEMINI_API_KEY=...,SUPABASE_URL=...,SUPABASE_ANON_KEY=...,GCS_BUCKET=..." \
  --memory=1Gi
```

### Frontend — Vercel

```bash
cd frontend
npm run build
vercel --prod
```

Or connect the GitHub repo to Vercel and set these environment variables in the Vercel dashboard:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_API_BASE_URL=https://your-cloud-run-url.run.app
```

---

## Troubleshooting

**`ModuleNotFoundError` on backend start**
Run: `uv pip install -r requirements.txt`

**Frontend shows "Network Error" or blank metrics**
Check that `VITE_API_BASE_URL` points to a running backend.

**Sign-in fails on deployed frontend**
Add your frontend URL to Supabase → Authentication → URL Configuration → Redirect URLs.

**Port 8000 already in use**
```bash
uv run uvicorn main:app --reload --port 8001
# then set VITE_API_BASE_URL=http://localhost:8001 in frontend/.env
```

**GCS permission error**
Ensure the Cloud Run service account has `roles/storage.objectAdmin` on your bucket:
```bash
gcloud storage buckets add-iam-policy-binding gs://YOUR_BUCKET \
  --member="serviceAccount:YOUR_SA@developer.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"
```
