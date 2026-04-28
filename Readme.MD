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
| **Fairlearn + AIF360 metrics** | Demographic Parity, Disparate Impact, Equalized Odds, Mean Difference |
| **Proxy feature detection** | Chi-squared test catches hidden bias beyond obvious sensitive columns |
| **Two mitigation techniques** | Reweighing (pre-processing) + Threshold Optimization (post-processing) |
| **Before / after comparison** | Measurable improvement shown in the same dashboard |
| **Gemini plain-language report** | Translates metric numbers into actionable, non-technical audit findings |
| **Demo datasets built in** | Adult Income, German Credit, COMPAS — bias shows up immediately |
| **EU AI Act framing** | Positioned as a compliance tool against real regulatory context |

---

## Tech Stack

**Backend** — Python 3.11+, FastAPI, `fairlearn`, `aif360`, `scikit-learn`, `pandas`, `scipy`, Gemini API (`google-generativeai`), Supabase (audit history)

**Frontend** — React + Vite, Tailwind CSS, shadcn/ui, Recharts, Supabase JS client

**Infrastructure** — Vercel (frontend), backend deployable on Google Cloud Run, Supabase (storage + history)

---

## Project Structure

```
fairlens/
├── backend/
│   ├── main.py                  # FastAPI entry point
│   ├── requirements.txt
│   ├── routers/
│   │   ├── upload.py            # POST /upload
│   │   ├── analyze.py           # POST /analyze
│   │   └── mitigate.py          # POST /mitigate
│   ├── analyzer/
│   │   ├── feature_detector.py  # Keyword + cardinality + Gemini detection
│   │   ├── model_trainer.py     # Auto-trains RandomForest / LR / DT
│   │   ├── metrics.py           # Fairlearn MetricFrame + AIF360
│   │   ├── proxy_detector.py    # Chi2 proxy detection
│   │   ├── mitigation.py        # Reweighing + ThresholdOptimizer
│   │   └── explainer.py         # Gemini report generation
│   └── utils/
│       └── data_loader.py       # CSV parsing + encoding
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.jsx         # Upload page
│   │   │   ├── Configure.jsx    # Column selection
│   │   │   ├── Results.jsx      # Metrics dashboard
│   │   │   └── Report.jsx       # Audit report + PDF download
│   │   ├── components/
│   │   │   ├── FileUpload.jsx
│   │   │   ├── MetricCard.jsx
│   │   │   ├── BiasChart.jsx
│   │   │   ├── GroupComparisonBar.jsx
│   │   │   └── MitigationPanel.jsx
│   │   └── api/
│   │       └── fairlens.js      # Axios API calls
└── demo_datasets/
    ├── adult_income.csv
    ├── german_credit.csv
    └── compas_recidivism.csv
```

---

## API Endpoints

### `POST /upload`
Accepts a CSV file. Returns detected columns, shape, and auto-identified sensitive features.

### `POST /analyze`
Accepts `file_id`, `sensitive_col`, `target_col`, `model_type`. Returns full metrics object, proxy feature warnings, bias verdict, and Gemini report.

### `POST /mitigate`
Accepts `file_id`, `sensitive_col`, `target_col`, `technique`. Returns before/after metric comparison.

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

See **[SETUP.md](./SETUP.md)** for full step-by-step instructions.

---

## Team

Built for Solution Challenge 2026.
