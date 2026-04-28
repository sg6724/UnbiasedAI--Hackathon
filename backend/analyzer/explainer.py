import os


def generate_report(
    metrics: dict,
    proxy_features: list,
    sensitive_col: str,
    target_col: str,
    model_type: str,
) -> str:
    try:
        from google import genai
        api_key = os.getenv("GEMINI_API_KEY", "")
        if not api_key or api_key == "your_gemini_api_key_here":
            return _template_report(metrics, proxy_features, sensitive_col, target_col, model_type)

        client = genai.Client(api_key=api_key)

        group_table = _format_group_table(metrics.get("by_group", {}))
        proxy_list = ", ".join([p["column"] for p in proxy_features]) if proxy_features else "None detected"

        prompt = f"""You are an AI fairness auditor. Given the following bias metrics for a {model_type.replace("_", " ")} model:

Sensitive Feature: {sensitive_col}
Target Outcome: {target_col}
Model Used: {model_type.replace("_", " ").title()}

Fairness Metrics:
- Demographic Parity Difference: {metrics.get("demographic_parity_difference", 0):.4f} (ideal: 0.0, threshold: <0.1 to pass)
- Disparate Impact Ratio: {metrics.get("disparate_impact_ratio", 1):.4f} (ideal: 1.0, >0.8 passes, <0.8 is legally concerning)
- Equalized Odds Difference: {metrics.get("equalized_odds_difference", 0):.4f} (ideal: 0.0, threshold: <0.1 to pass)
- Mean Difference: {metrics.get("mean_difference", 0):.4f} (ideal: 0.0, threshold: <0.1 to pass)

Group-wise outcomes:
{group_table}

Proxy Features Detected (columns statistically correlated with the sensitive attribute):
{proxy_list}

Write a clear, non-technical audit report that:
1. Explains what bias was found and which groups are disadvantaged
2. Explains why this bias is harmful in real-world context
3. Gives 3 specific, actionable mitigation recommendations
4. Rates the overall bias severity as: Low / Medium / High / Critical

Return the report in clear paragraphs. End with a line: SEVERITY: [Low/Medium/High/Critical]. Do not use jargon."""

        response = client.models.generate_content(
            model="gemini-2.5-flash-preview-04-17",
            contents=prompt,
        )
        return response.text

    except Exception:
        return _template_report(metrics, proxy_features, sensitive_col, target_col, model_type)


def _format_group_table(by_group: dict) -> str:
    if not by_group:
        return "No group data available"
    lines = ["Group | Selection Rate | Accuracy | TPR"]
    for group, vals in by_group.items():
        lines.append(
            f"{group} | {vals.get('selection_rate', 0):.2%} | {vals.get('accuracy', 0):.2%} | {vals.get('tpr', 0):.2%}"
        )
    return "\n".join(lines)


def _template_report(metrics, proxy_features, sensitive_col, target_col, model_type) -> str:
    dpd = metrics.get("demographic_parity_difference", 0)
    dir_ = metrics.get("disparate_impact_ratio", 1)
    eod = metrics.get("equalized_odds_difference", 0)
    md = metrics.get("mean_difference", 0)
    verdict = metrics.get("verdict", "unknown")

    if verdict == "biased":
        severity = "High"
        summary = f"This {model_type.replace('_', ' ')} model shows significant bias related to the '{sensitive_col}' attribute when predicting '{target_col}'."
    elif verdict == "borderline":
        severity = "Medium"
        summary = f"This {model_type.replace('_', ' ')} model shows potential bias related to the '{sensitive_col}' attribute when predicting '{target_col}'."
    else:
        severity = "Low"
        summary = f"This {model_type.replace('_', ' ')} model appears relatively fair with respect to the '{sensitive_col}' attribute."

    proxy_text = ""
    if proxy_features:
        cols = ", ".join([p["column"] for p in proxy_features[:5]])
        proxy_text = f"\n\nProxy features detected: {cols}. These columns are statistically correlated with '{sensitive_col}' and may encode hidden bias even if the sensitive attribute is excluded from the model."

    report = f"""{summary}

The Demographic Parity Difference of {dpd:.4f} indicates that different groups receive positive predictions at different rates. The Disparate Impact Ratio of {dir_:.4f} {'is below the legally recognized 0.8 threshold, which may indicate discriminatory outcomes under the EEOC 4/5ths rule' if dir_ < 0.8 else 'is within acceptable range'}. The Equalized Odds Difference of {eod:.4f} and Mean Difference of {md:.4f} further characterize the extent of disparity.{proxy_text}

Recommendations:
1. Apply reweighing or oversampling techniques to balance representation of disadvantaged groups in the training data.
2. Use fairness-aware algorithms such as ThresholdOptimizer or Adversarial Debiasing to reduce disparities at prediction time.
3. Regularly audit model performance across demographic groups and establish fairness monitoring in production.

SEVERITY: {severity}"""

    return report.strip()
