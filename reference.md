# FairLens — AI Bias Auditing Tool
### Solution Challenge 2026 | Theme: Unbiased AI Decision

---

## 1. Project Overview

### What Are We Building?
FairLens is a web-based AI bias auditing tool that allows organizations, researchers, and developers to upload any tabular dataset, automatically train a baseline ML model on it, and receive a comprehensive fairness audit — including bias metrics, visualizations, and a plain-language AI-generated report with mitigation suggestions.

### Problem Statement
AI systems are making life-changing decisions — who gets hired, who gets a loan, who receives medical care. When these systems are trained on flawed or historically biased data, they silently repeat and amplify discrimination. Most organizations have no accessible, easy-to-use tool to detect or fix this before their systems impact real people.

### Solution
FairLens makes AI fairness auditing accessible to everyone — not just data scientists. A user uploads a CSV dataset, selects the sensitive attribute (gender, race, age, etc.) and the target outcome column, and FairLens:
1. Auto-trains a baseline ML model on the dataset
2. Runs fairness metrics using Fairlearn and AIF360
3. Detects proxy features that encode hidden bias
4. Generates a plain-language audit report via Gemini API
5. Suggests and applies bias mitigation techniques
6. Shows before/after metric comparison

---

## 2. Tech Stack

### Backend
- **Language**: Python 3.11+
- **Framework**: FastAPI
- **Bias Libraries**:
  - `fairlearn` — MetricFrame, demographic parity, equalized odds
  - `aif360` — disparate impact, mean difference, equal opportunity
- **ML Libraries**: `scikit-learn`, `pandas`, `numpy`, `scipy`
- **LLM**: Gemini API for plain-language report generation
- **File Handling**: `python-multipart` for CSV upload

### Frontend
- decide on your own.

### Infrastructure (Google Stack — Hackathon Aligned)
- **Hosting**: Google Cloud Run (backend), Firebase Hosting (frontend)
- **Storage**: Google Cloud Storage (uploaded datasets)
- **Auth**: Firebase Authentication
- **Database**: Firebase Firestore (audit history per user)

---

## 3. Project Folder Structure

```
fairlens/
├── backend/
│   ├── main.py                  # FastAPI app entry point
│   ├── requirements.txt
│   ├── routers/
│   │   ├── upload.py            # Dataset upload endpoint
│   │   ├── analyze.py           # Bias analysis endpoint
│   │   └── mitigate.py          # Mitigation endpoint
│   ├── analyzer/
│   │   ├── feature_detector.py  # Auto-detect sensitive features
│   │   ├── model_trainer.py     # Auto-train baseline ML model
│   │   ├── metrics.py           # Fairlearn + AIF360 metrics
│   │   ├── proxy_detector.py    # Proxy feature detection via chi2
│   │   ├── mitigation.py        # Reweighing + threshold optimization
│   │   └── explainer.py         # Gemini API report generation
│   └── utils/
│       └── data_loader.py       # CSV parsing, encoding
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.jsx         # Landing + upload page
│   │   │   ├── Configure.jsx    # Feature selection confirmation UI
│   │   │   ├── Results.jsx      # Bias metrics dashboard
│   │   │   └── Report.jsx       # Plain-language audit report
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

## 4. Core Modules — What Each Does

### 4.1 Feature Detector (`feature_detector.py`)
Automatically identifies which columns in an uploaded dataset are likely sensitive attributes.

**Three-layer detection:**

**Layer 1 — Keyword Match**
Scan column names against a predefined list of sensitive keywords:
```
["gender", "sex", "race", "ethnicity", "age", "religion",
 "nationality", "disability", "caste", "marital_status"]
```

**Layer 2 — Cardinality Check**
If a column has ≤ 6 unique values and is of type `object` or categorical, flag it as a potential sensitive feature.

**Layer 3 — LLM Assist (Gemini)**
For ambiguous columns, send column names + 5 sample values to Gemini and ask it to identify which might be sensitive attributes. Return the suggestions to the user for confirmation.

Output: List of auto-detected sensitive columns + list of all columns for user to confirm.

---

### 4.2 Model Trainer (`model_trainer.py`)
Auto-trains a baseline ML model on the uploaded dataset so bias can be audited even without a pre-existing model.

**Steps:**
1. Drop the target column from features (X)
2. Label-encode all categorical columns
3. Train/test split (70/30)
4. Train one of three models (user selects or default = RandomForest):
   - `RandomForestClassifier(n_estimators=100)` — default, most realistic
   - `LogisticRegression()` — interpretable
   - `DecisionTreeClassifier()` — easy to explain

**Returns:**
- `y_true` — actual outcomes from test set
- `y_pred` — model predictions on test set
- `sensitive_test` — sensitive feature values for the test set (used for group splitting)

**Important Note:** The sensitive column is NOT dropped before training. This mirrors real-world bias — models trained with or without sensitive columns can still encode bias via proxy features.

---

### 4.3 Metrics (`metrics.py`)
Runs fairness metrics using both Fairlearn and AIF360.

**Fairlearn Metrics (via MetricFrame):**

| Metric | Description | Ideal Value |
|--------|-------------|-------------|
| Selection Rate | % of positive predictions per group | Equal across groups |
| Demographic Parity Difference | Gap in selection rates between groups | 0.0 |
| Equalized Odds Difference | Max gap in TPR and FPR across groups | 0.0 |
| Accuracy per Group | Model accuracy broken down by group | Equal across groups |

**AIF360 Metrics (via BinaryLabelDatasetMetric):**

| Metric | Description | Ideal Value |
|--------|-------------|-------------|
| Disparate Impact Ratio | Unprivileged positive rate / Privileged positive rate | 1.0 (below 0.8 = legally biased) |
| Mean Difference | Raw difference in positive outcome rates | 0.0 |
| Equal Opportunity Difference | TPR gap between unprivileged and privileged | 0.0 |

**Returns:** A unified JSON object with all metrics, group-wise breakdown, and a bias verdict (biased / borderline / fair).

---

### 4.4 Proxy Detector (`proxy_detector.py`)
Detects columns that are not sensitive attributes themselves but are statistically correlated with one — i.e., they act as proxies for the sensitive feature.

**Method:** Chi-squared test between each non-sensitive column and the sensitive column.
If p-value < 0.05, the column is flagged as a proxy feature.

**Common real-world proxies:**

| Proxy Column | Encodes |
|---|---|
| zip_code | Race / socioeconomic status |
| first_name | Ethnicity / gender |
| university_name | Wealth / privilege |
| years_of_gap | Gender (maternity breaks) |

**Output:** List of proxy features with their chi2 score and p-value, displayed as warnings in the dashboard.

---

### 4.5 Mitigation (`mitigation.py`)
Implements two bias mitigation techniques and returns before/after metric comparisons.

**Technique 1 — Reweighing (Pre-processing, via AIF360)**
Assigns different weights to training samples based on their group membership to make the dataset more balanced before training.
- Unprivileged + positive label → higher weight
- Privileged + positive label → lower weight
Re-trains the model with these weights and re-runs metrics.

**Technique 2 — Threshold Optimization (Post-processing, via Fairlearn)**
Uses `ThresholdOptimizer` to find group-specific decision thresholds that satisfy a fairness constraint (e.g., Demographic Parity or Equalized Odds).
Does NOT retrain the model — only adjusts the decision boundary per group.

**Output:** Side-by-side before/after comparison of all fairness metrics for both techniques.

---

### 4.6 Explainer (`explainer.py`)
Sends the computed metrics to Gemini API and receives a plain-language audit report.

**Prompt structure sent to Gemini:**
```
You are an AI fairness auditor. Given the following bias metrics for a [domain] model:

Sensitive Feature: {sensitive_col}
Target Outcome: {target_col}
Model Used: {model_name}

Fairness Metrics:
- Demographic Parity Difference: {value}
- Disparate Impact Ratio: {value}
- Equalized Odds Difference: {value}
- Mean Difference: {value}

Group-wise outcomes:
{group breakdown table}

Proxy Features Detected: {list}

Write a clear, non-technical audit report that:
1. Explains what bias was found and which groups are disadvantaged
2. Explains why this bias is harmful in real-world context
3. Gives 3 specific, actionable mitigation recommendations
4. Rates the overall bias severity as: Low / Medium / High / Critical

Return the report in clear paragraphs. Do not use jargon.
```

**Output:** Plain-language report string rendered in the frontend Report page, downloadable as PDF.

---

## 5. API Endpoints

### POST `/upload`
**Input:** Multipart form — CSV file
**Output:**
```json
{
  "columns": ["age", "gender", "income", "hired"],
  "shape": [1000, 4],
  "auto_detected_sensitive": ["gender", "age"],
  "sample": { ... }
}
```

### POST `/analyze`
**Input:**
```json
{
  "file_id": "abc123",
  "sensitive_col": "gender",
  "target_col": "hired",
  "model_type": "random_forest"
}
```
**Output:**
```json
{
  "metrics": {
    "demographic_parity_difference": 0.34,
    "disparate_impact_ratio": 0.52,
    "equalized_odds_difference": 0.28,
    "mean_difference": -0.30,
    "by_group": {
      "Male":   { "selection_rate": 0.72, "accuracy": 0.81 },
      "Female": { "selection_rate": 0.38, "accuracy": 0.79 }
    }
  },
  "proxy_features": ["zip_code", "first_name"],
  "verdict": "biased",
  "report": "The model shows significant gender bias..."
}
```

### POST `/mitigate`
**Input:**
```json
{
  "file_id": "abc123",
  "sensitive_col": "gender",
  "target_col": "hired",
  "technique": "reweighing"
}
```
**Output:**
```json
{
  "before": { "demographic_parity_difference": 0.34 },
  "after":  { "demographic_parity_difference": 0.08 },
  "improvement": "76% reduction in demographic parity gap"
}
```

---

## 6. Frontend Flow (Page by Page)

### Page 1 — Home / Upload
- Hero section with project description
- Drag-and-drop CSV upload component
- "Try with demo dataset" buttons (Adult Income, German Credit, COMPAS)
- On upload → call POST `/upload` → navigate to Configure page

### Page 2 — Configure
- Show auto-detected sensitive columns with checkboxes (pre-checked)
- Show all columns — user selects target column (outcome)
- Dropdown to select model type (RandomForest default)
- "Run Bias Audit" button → call POST `/analyze`

### Page 3 — Results Dashboard
Displays after analysis completes:

**Section A — Verdict Banner**
Large colored banner: BIASED (red) / BORDERLINE (orange) / FAIR (green)

**Section B — Metric Cards**
4 metric cards showing:
- Demographic Parity Difference
- Disparate Impact Ratio
- Equalized Odds Difference
- Mean Difference
Each card shows value + what it means + whether it passes/fails threshold

**Section C — Group Comparison Chart**
Grouped bar chart (Recharts) showing selection rate, accuracy, TPR per group side by side

**Section D — Proxy Feature Warning**
Yellow warning box listing proxy features detected with their correlation scores

**Section E — Mitigation Panel**
Two buttons: "Apply Reweighing" and "Apply Threshold Optimization"
On click → call POST `/mitigate` → show before/after metric comparison

### Page 4 — Audit Report
- Full plain-language Gemini-generated report
- Severity rating (Low / Medium / High / Critical)
- Mitigation recommendations in bullet points
- "Download as PDF" button
- "Save to History" button (Firebase)

---

## 7. Full End-to-End Flow

```
User opens FairLens
        ↓
Uploads CSV dataset (e.g. adult_income.csv)
        ↓
Backend parses CSV → detects column types → auto-detects sensitive features
        ↓
Frontend shows Configure page with detected columns
        ↓
User confirms: sensitive = "gender", target = "hired", model = RandomForest
        ↓
Backend:
  1. Label-encodes categorical columns
  2. Trains RandomForestClassifier on 70% of data
  3. Predicts on 30% test set
  4. Runs Fairlearn MetricFrame → selection rate, accuracy, equalized odds per group
  5. Runs AIF360 BinaryLabelDatasetMetric → disparate impact, mean difference
  6. Runs chi2 proxy detection on remaining columns
  7. Sends all metrics to Gemini API → receives plain-language report
        ↓
Frontend renders Results Dashboard:
  - Verdict: BIASED (red)
  - Demographic Parity Difference: 0.34
  - Disparate Impact Ratio: 0.52 (below 0.8 legal threshold)
  - Group chart: Male 72% hired vs Female 38% hired
  - Proxy warnings: zip_code, first_name
        ↓
User clicks "Apply Reweighing"
        ↓
Backend retrains model with AIF360 sample weights → re-runs metrics
        ↓
Before/After shown:
  Demographic Parity: 0.34 → 0.08 (76% improvement)
        ↓
User views Audit Report page → downloads PDF
```

---

## 8. Demo Datasets

Use these publicly available datasets for demo and testing. Bias is well-documented and will reliably show up in metrics.

### Adult Income Dataset (UCI)
- **URL**: https://archive.ics.uci.edu/ml/machine-learning-databases/adult/adult.data
- **Sensitive**: gender, race
- **Target**: income (>50K or ≤50K)
- **Known bias**: Men predicted high income 34% more than women

### German Credit Dataset (UCI)
- **URL**: https://archive.ics.uci.edu/ml/machine-learning-databases/statlog/german/german.data
- **Sensitive**: age, gender
- **Target**: credit_risk (good/bad)
- **Known bias**: Older applicants and women rated higher credit risk

### COMPAS Recidivism Dataset (ProPublica)
- **URL**: https://raw.githubusercontent.com/propublica/compas-analysis/master/compas-scores-two-years.csv
- **Sensitive**: race
- **Target**: two_year_recid (recidivism prediction)
- **Known bias**: Black defendants flagged high risk at 2x the rate of white defendants

---

## 9. Fairness Metric Thresholds (Pass/Fail Logic)

| Metric | Pass | Borderline | Fail |
|--------|------|------------|------|
| Demographic Parity Difference | < 0.1 | 0.1 – 0.2 | > 0.2 |
| Disparate Impact Ratio | > 0.8 | 0.6 – 0.8 | < 0.6 |
| Equalized Odds Difference | < 0.1 | 0.1 – 0.2 | > 0.2 |
| Mean Difference | < 0.1 | 0.1 – 0.2 | > 0.2 |

The **0.8 Disparate Impact threshold** is derived from the US Equal Employment Opportunity Commission's 4/5ths rule — a legally recognized standard for detecting discriminatory hiring practices.

---

## 10. Key Dependencies

### Backend `requirements.txt`
```
fastapi
uvicorn
pandas
numpy
scikit-learn
fairlearn
aif360
scipy
google-generativeai
python-multipart
```


---

## 11. What Makes This Project Stand Out

1. **End-to-end pipeline** — from raw CSV to plain-language audit report in one flow
2. **No model required** — auto-trains a baseline model on the fly
3. **Proxy feature detection** — catches hidden bias beyond obvious sensitive columns
4. **Before/after mitigation** — shows measurable improvement, not just detection
5. **LLM explainability** — Gemini translates metrics into actionable plain-language
6. **Demo datasets built in** — judges can immediately try it without uploading anything
7. **EU AI Act alignment** — framed as a compliance tool for real regulatory context
8. **Google stack** — Cloud Run + Firebase + Gemini = perfectly aligned with hackathon criteria

---

## 12. Hackathon Submission Checklist

- [ ] Live MVP deployed on Google Cloud Run (backend) + Firebase Hosting (frontend)
- [ ] GitHub repository — clean README, structured code, requirements.txt
- [ ] Project deck — problem → solution → demo → impact → tech stack → metrics
- [ ] Demo video (max 3 minutes) — show upload → configure → results → report flow
- [ ] Prototype tested with Adult Income dataset (guaranteed bias results for demo)

---

## 13. Prompting Instructions for LLM Code Generation

When prompting an LLM to build this project, use this order:

1. **Start with Backend**
   - Prompt: "Build the FastAPI backend for FairLens with the folder structure above. Start with `main.py` and the `/upload` endpoint that parses a CSV, detects column types, and auto-detects sensitive features using keyword matching and cardinality checks."

2. **Model Trainer + Metrics**
   - Prompt: "Build `model_trainer.py` that takes a dataframe, target column, and sensitive column, trains a RandomForestClassifier, and returns y_true, y_pred, and sensitive_test. Then build `metrics.py` that takes these and runs Fairlearn MetricFrame and AIF360 BinaryLabelDatasetMetric."

3. **Proxy Detector + Mitigation**
   - Prompt: "Build `proxy_detector.py` using scipy chi2_contingency to detect proxy features. Build `mitigation.py` with both Reweighing (AIF360) and ThresholdOptimizer (Fairlearn) and return before/after metric dicts."

4. **Gemini Explainer**
   - Prompt: "Build `explainer.py` that takes a metrics dict, sensitive_col, target_col, and model_name, formats the prompt above, calls the Gemini API using google-generativeai, and returns the plain-language report string."

5. **Frontend**
   - Prompt: "Build the React frontend for FairLens with 4 pages: Home (upload), Configure (column selection), Results (metrics dashboard with Recharts bar charts and metric cards), and Report (plain-language audit report). Use shadcn/ui and Tailwind."