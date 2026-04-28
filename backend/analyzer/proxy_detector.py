import numpy as np
import pandas as pd
from scipy.stats import chi2_contingency


def detect(df: pd.DataFrame, sensitive_col: str, target_col: str) -> list:
    results = []
    exclude = {sensitive_col, target_col}
    sensitive = df[sensitive_col].astype(str)

    for col in df.columns:
        if col in exclude:
            continue
        try:
            col_data = df[col]
            # Bin numeric columns into 5 quantile buckets
            if pd.api.types.is_numeric_dtype(col_data):
                col_data = pd.qcut(col_data, q=5, duplicates="drop", labels=False).astype(str)
            else:
                col_data = col_data.astype(str)

            contingency = pd.crosstab(col_data, sensitive)
            if contingency.shape[0] < 2 or contingency.shape[1] < 2:
                continue

            chi2, p_value, _, _ = chi2_contingency(contingency)
            if p_value < 0.05:
                results.append({
                    "column": col,
                    "chi2": round(float(chi2), 4),
                    "p_value": round(float(p_value), 6),
                })
        except Exception:
            continue

    results.sort(key=lambda x: x["chi2"], reverse=True)
    return results[:10]
