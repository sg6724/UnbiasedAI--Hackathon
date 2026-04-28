import pandas as pd

# Protected/demographic attributes that are valid sensitive columns
SENSITIVE_KEYWORDS = [
    "gender", "sex", "race", "ethnicity", "age", "religion",
    "nationality", "disability", "caste", "marital_status",
    "marital", "color", "colour", "origin",
]

# These patterns suggest IDs or keys — never auto-detect as sensitive
ID_PATTERNS = ["_id", "id_", " id", "uuid", "key", "index", "idx", "num", "number", "code", "ref"]

# Financial/economic features — exclude from sensitive auto-detection
FINANCIAL_PATTERNS = [
    "income", "salary", "wage", "revenue", "profit",
    "price", "cost", "amount", "balance", "credit", "loan",
]


def detect(df: pd.DataFrame) -> dict:
    all_columns = df.columns.tolist()
    n = len(df)
    detected = set()

    for col in all_columns:
        col_lower = col.lower().replace("-", "_").replace(" ", "_")

        # Reject: ID-like column names
        if any(p in col_lower for p in ID_PATTERNS):
            continue

        # Reject: financial/economic column names
        if any(p in col_lower for p in FINANCIAL_PATTERNS):
            continue

        # Reject: high-cardinality columns (likely IDs or free text)
        n_unique = df[col].nunique()
        if n_unique > n * 0.5 and n > 20:
            continue

        # Layer 1: keyword match on known sensitive attribute names
        if any(keyword in col_lower for keyword in SENSITIVE_KEYWORDS):
            detected.add(col)
            continue

        # Layer 2: low-cardinality non-numeric (likely categorical demographic)
        if not pd.api.types.is_numeric_dtype(df[col]) and 2 <= n_unique <= 6:
            detected.add(col)

    return {
        "auto_detected": list(detected),
        "all_columns": all_columns,
    }
