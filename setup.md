# FairLens — Local Setup Guide

This guide gets the full FairLens stack running on your machine in under 10 minutes.

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Python | 3.11+ | https://python.org |
| `uv` (fast Python package manager) | latest | `pip install uv` or `curl -LsSf https://astral.sh/uv/install.sh \| sh` |
| Node.js | 18+ | https://nodejs.org |
| npm | 9+ | comes with Node |
| Git | any | https://git-scm.com |

---

## Step 1 — Clone the Repository

```bash
git clone <YOUR_GITHUB_REPO_URL>
cd fairlens
```

---

## Step 2 — Backend Setup

### 2a. Enter the backend directory

```bash
cd backend
```

### 2b. Create environment file

Create a file named `.env` inside `backend/` and paste the following:

```env
GEMINI_API_KEY=your_gemini_api_key_here
UPLOAD_DIR=/tmp/fairlens_uploads
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2c. Install dependencies and start the server

```bash
uv run uvicorn main:app --reload
```

> `uv` will automatically create a virtual environment and install all packages from `requirements.txt` on the first run. This takes ~2 minutes the first time.

The backend will be running at **http://localhost:8000**

You can verify it's working by opening http://localhost:8000/docs — you'll see the interactive FastAPI Swagger UI.

---

## Step 3 — Frontend Setup

Open a **new terminal tab/window** (keep the backend running).

### 3a. Enter the frontend directory

```bash
cd frontend   # from the repo root, or: cd ../frontend from backend/
```

### 3b. Create environment file

Create a file named `.env` inside `frontend/` and paste the following:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_BASE_URL=http://localhost:8000
```

### 3c. Install dependencies and start the dev server

```bash
npm install
npm run dev
```

The frontend will be running at **http://localhost:5173**

---

## Step 4 — Verify Everything Works

1. Open http://localhost:5173 in your browser
2. Click **"Try with demo dataset"** → select Adult Income
3. It should auto-configure → run the audit → show the results dashboard
4. If you see a **BIASED** verdict with metrics, the full stack is working correctly

---

## Quick Reference — Running the App

Every time you want to develop locally, you need two terminals:

**Terminal 1 — Backend**
```bash
cd fairlens/backend
uv run uvicorn main:app --reload
```

**Terminal 2 — Frontend**
```bash
cd fairlens/frontend
npm run dev
```

---

## Troubleshooting

**`ModuleNotFoundError` on backend start**
`uv` should handle this automatically. If it doesn't, run: `uv pip install -r requirements.txt`

**`aif360` install fails**
Try: `uv pip install aif360 --no-deps` then `uv pip install -r requirements.txt`

**Frontend shows "Network Error" or blank metrics**
Make sure the backend is running at port 8000 and `VITE_API_BASE_URL=http://localhost:8000` is set in `frontend/.env`

**Port 8000 already in use**
Run backend on a different port: `uv run uvicorn main:app --reload --port 8001`
Then update `VITE_API_BASE_URL=http://localhost:8001` in `frontend/.env`

**`/tmp/fairlens_uploads` permission error (Windows)**
Change `UPLOAD_DIR` in `backend/.env` to a path like `C:/tmp/fairlens_uploads` and create that folder manually.

---

## Production / Deployed Version

The live deployed version is available at https://unbiased-ai-bice.vercel.app/ — frontend on Vercel, backend deployable to Google Cloud Run.
