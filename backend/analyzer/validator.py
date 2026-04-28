import numpy as np
import pandas as pd


def validate_target_column(df: pd.DataFrame, target_col: str) -> list:
    """
    Validates the target column for classification suitability.
    Returns a list of warning strings.
    Raises ValueError for hard rejections (ID-like, single-value).
    """
    warnings = []
    col = df[target_col]
    n = len(df)
    n_unique = col.nunique()

    # Hard reject: every row is unique — clearly an ID or primary key
    if n_unique >= max(n * 0.95, n - 1) and n_unique > 20:
        raise ValueError(
            f"Column '{target_col}' has {n_unique} unique values for {n} rows — "
            "it looks like an ID or key, not a prediction target. "
            "Choose a binary (yes/no, 0/1) or categorical outcome column."
        )

    # Hard reject: only one distinct value — impossible to classify
    if n_unique <= 1:
        raise ValueError(
            f"Column '{target_col}' has only {n_unique} unique value(s). "
            "Classification requires at least 2 distinct values."
        )

    # Warn: continuous numeric with many unique values (will be binarized)
    if pd.api.types.is_numeric_dtype(col) and n_unique > 20:
        warnings.append(
            f"Target '{target_col}' has {n_unique} unique numeric values and will be "
            "binarized at its median. For best results, use a binary (0/1) column."
        )

    # Warn: severe class imbalance
    value_counts = col.value_counts(normalize=True)
    min_class_frac = float(value_counts.min())
    if min_class_frac < 0.05:
        minority_class = value_counts.idxmin()
        warnings.append(
            f"Target '{target_col}' is severely imbalanced — "
            f"class '{minority_class}' has only {min_class_frac:.1%} of rows. "
            "Fairness metrics may be unreliable."
        )

    return warnings


def detect_leakage(df: pd.DataFrame, target_col: str, sensitive_col: str) -> list:
    """
    Checks for features with suspiciously high correlation to the target (potential leakage).
    Returns a list of warning strings.
    """
    warnings = []
    try:
        from sklearn.preprocessing import LabelEncoder

        y = df[target_col].copy()
        if not pd.api.types.is_numeric_dtype(y):
            y = pd.Series(
                LabelEncoder().fit_transform(y.astype(str).values),
                index=df.index,
            )
        else:
            if y.nunique() > 2:
                y = (y > y.median()).astype(int)
        y = y.fillna(0)

        leaky = []
        for col in df.columns:
            if col in (target_col, sensitive_col):
                continue
            try:
                x = df[col].copy()
                if not pd.api.types.is_numeric_dtype(x):
                    x = pd.Series(
                        LabelEncoder().fit_transform(
                            x.astype(str).fillna("__NA__").values
                        ),
                        index=df.index,
                    )
                else:
                    x = x.fillna(x.median())
                corr = abs(float(np.corrcoef(x.values, y.values)[0, 1]))
                if corr > 0.95:
                    leaky.append((col, corr))
            except Exception:
                continue

        if leaky:
            cols = ", ".join(f"'{c}' (r={r:.2f})" for c, r in leaky)
            warnings.append(
                f"Potential feature leakage detected: {cols}. "
                f"These features are very highly correlated with '{target_col}' "
                "and may be encoding the outcome directly, making fairness metrics unreliable."
            )
    except Exception:
        pass
    return warnings
