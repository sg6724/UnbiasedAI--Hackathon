# FairLens — AI Bias Auditing Tool

> **Solution Challenge 2026 · Theme: Unbiased AI Decision**
> Live demo → https://unbiased-ai-bice.vercel.app/

---

## What Is FairLens?

AI systems decide who gets hired, who gets a loan, who gets medical care. When those systems are trained on historically biased data, they silently repeat and amplify discrimination — and most teams have no accessible tool to catch it before it harms real people.

**FairLens** is a web-based AI bias auditing tool. Upload any tabular CSV dataset, point it at a sensitive attribute (gender, race, age …) and an outcome column, and FairLens delivers a complete fairness audit: quantitative bias metrics, proxy-feature warnings, before/after mitigation comparison, and a plain-language Gemini-generated report you can download as PDF.

No data-science expertise required.

---

## Key Features

| Feature | Detail |
|---|---|
| **Auto model training** | Trains a baseline ML model on the fly — no pre-existing model needed |
| **Fairlearn metrics** | Demographic Parity, Disparate Impact, Equalized Odds, Mean Difference |
| **Proxy feature detection** | Chi-squared test catches hidden bias beyond obvious sensitive columns |
| **Two mitigation techniques** | Reweighing (pre-processing) + Threshold Optimization (post-processing) |
| **Before / after comparison** | Measurable improvement shown in the same dashboard |
| **Gemini plain-language report** | Translates metric numbers into actionable, non-technical audit findings |
| **Demo datasets built in** | Adult Income, German Credit, COMPAS — bias shows up immediately |
| **EU AI Act framing** | Positioned as a compliance tool against real regulatory context |

---

## Tech Stack

**Backend** — Python 3.11, FastAPI, `fairlearn`, `scikit-learn`, `pandas`, `scipy`, Gemini API (`google-genai`), Supabase (auth + audit history), Google Cloud Storage (file storage)

**Frontend** — React 18 + Vite, TypeScript, Tailwind CSS, Recharts, Supabase JS client

**Infrastructure** — Vercel (frontend), Google Cloud Run (backend, `asia-south1`), Google Cloud Storage (CSV uploads), Supabase (auth + audit history)

---

## Deployed URLs

| Service | URL |
|---|---|
| Frontend | https://unbiased-ai-bice.vercel.app/ |
| Backend API | https://fairlens-backend-1059141951832.asia-south1.run.app |
| API Docs | https://fairlens-backend-1059141951832.asia-south1.run.app/docs |

---

## Project Structure

```
UnbiasedAI--Hackathon/
├── backend/
│   ├── main.py                  # FastAPI entry point, CORS, middleware
│   ├── Dockerfile               # Cloud Run deployment
│   ├── requirements.txt
│   ├── routers/
│   │   ├── upload.py            # POST /upload — CSV ingestion → GCS + Supabase Storage
│   │   ├── analyze.py           # POST /analyze — model training + fairness metrics
│   │   ├── mitigate.py          # POST /mitigate — bias mitigation techniques
│   │   └── proxy.py             # POST /proxy — proxy feature detection
│   ├── analyzer/
│   │   ├── feature_detector.py  # Keyword + cardinality sensitive column detection
│   │   ├── model_trainer.py     # Auto-trains RandomForest / LogisticRegression / DecisionTree
│   │   ├── metrics.py           # Fairlearn MetricFrame fairness metrics
│   │   ├── proxy_detector.py    # Chi-squared proxy feature detection
│   │   ├── mitigation.py        # Reweighing + ThresholdOptimizer
│   │   ├── explainer.py         # Gemini report generation
│   │   └── validator.py         # Target column validation + leakage detection
│   └── utils/
│       ├── data_loader.py       # GCS-backed CSV read/write
│       ├── auth.py              # Supabase JWT validation
│       └── supabase_client.py   # Supabase client config
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.tsx
│   │   │   └── Dashboard.tsx
│   │   ├── components/
│   │   │   ├── AuthModal.tsx
│   │   │   ├── AuditHistory.tsx
│   │   │   ├── Navbar.tsx
│   │   │   └── ...
│   │   └── lib/
│   │       ├── supabase.ts      # Supabase client
│   │       └── api.ts           # Axios API calls to backend
│   ├── index.html
│   └── vite.config.ts
├── Readme.MD
└── setup.md
```

---

## API Endpoints

### `POST /upload`
Accepts a CSV file (multipart). Saves to GCS, mirrors to Supabase Storage.
Returns detected columns, shape, and auto-identified sensitive features.

### `POST /analyze`
Accepts `file_id`, `sensitive_col`, `target_col`, `model_type`.
Returns full metrics, proxy feature warnings, bias verdict, and Gemini report. Saves audit to Supabase.

### `POST /mitigate`
Accepts `file_id`, `sensitive_col`, `target_col`, `technique` (`reweighing` | `threshold`).
Returns before/after metric comparison.

---

## Fairness Metrics & Thresholds

| Metric | Pass | Borderline | Fail |
|--------|------|------------|------|
| Demographic Parity Difference | < 0.1 | 0.1 – 0.2 | > 0.2 |
| Disparate Impact Ratio | > 0.8 | 0.6 – 0.8 | < 0.6 |
| Equalized Odds Difference | < 0.1 | 0.1 – 0.2 | > 0.2 |
| Mean Difference | < 0.1 | 0.1 – 0.2 | > 0.2 |

The 0.8 Disparate Impact threshold comes directly from the US EEOC 4/5ths rule — a legally recognized standard for discriminatory hiring.

---

## Demo Datasets

| Dataset | Sensitive | Target | Known Bias |
|---|---|---|---|
| Adult Income (UCI) | gender, race | income >50K | Men predicted high income 34% more than women |
| German Credit (UCI) | age, gender | credit_risk | Older applicants and women rated higher risk |
| COMPAS Recidivism (ProPublica) | race | two_year_recid | Black defendants flagged high-risk at 2× white defendants |

---

## Local Setup

See **[setup.md](./setup.md)** for full step-by-step instructions.

---

## Team

Built for Google Solution Challenge 2026.
