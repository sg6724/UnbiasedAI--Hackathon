import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OrdinalEncoder, LabelEncoder
from sklearn.impute import SimpleImputer


def _build_preprocessor(X: pd.DataFrame, model_type: str) -> ColumnTransformer:
    """
    Build a ColumnTransformer that handles numeric and categorical columns separately.
    Fitted on train only — never sees test data during fit.
    """
    numeric_cols = X.select_dtypes(include="number").columns.tolist()
    categorical_cols = X.select_dtypes(exclude="number").columns.tolist()

    transformers = []

    if numeric_cols:
        steps = [("imputer", SimpleImputer(strategy="median"))]
        # Logistic regression is scale-sensitive; tree models are not
        if model_type == "logistic_regression":
            steps.append(("scaler", StandardScaler()))
        transformers.append(("num", Pipeline(steps), numeric_cols))

    if categorical_cols:
        # OrdinalEncoder is safe for tree models; for LR it still implies ordinal
        # relationships, but OneHotEncoder would explode dimensionality on high-cardinality
        # cols. OrdinalEncoder + handle_unknown is the pragmatic choice here.
        transformers.append((
            "cat",
            Pipeline([
                ("imputer", SimpleImputer(strategy="most_frequent")),
                ("encoder", OrdinalEncoder(
                    handle_unknown="use_encoded_value",
                    unknown_value=-1,
                )),
            ]),
            categorical_cols,
        ))

    return ColumnTransformer(transformers, remainder="drop")


def train(df: pd.DataFrame, sensitive_col: str, target_col: str, model_type: str) -> dict:
    warnings = []
    df = df.copy()

    # Drop rows with missing target; reset index so positional and label indices match
    df = df.dropna(subset=[target_col]).reset_index(drop=True)

    # Save original sensitive labels before any transformation.
    # These are used only for fairness grouping — never for prediction.
    original_sensitive = df[sensitive_col].astype(str).values.copy()

    # Separate features (drop both target and sensitive — sensitive is grouping-only)
    cols_to_drop = [c for c in [target_col, sensitive_col] if c in df.columns]
    X = df.drop(columns=cols_to_drop)
    y_raw = df[target_col].copy()

    # Split BEFORE any fitting so no test information leaks into encoders or imputers
    try:
        X_train, X_test, y_train_raw, y_test_raw, idx_train, idx_test = train_test_split(
            X, y_raw, np.arange(len(df)),
            test_size=0.3, random_state=42, stratify=y_raw,
        )
    except ValueError:
        X_train, X_test, y_train_raw, y_test_raw, idx_train, idx_test = train_test_split(
            X, y_raw, np.arange(len(df)),
            test_size=0.3, random_state=42,
        )

    # Binarize target using train-set statistics only (no leakage into threshold)
    train_unique = sorted(y_train_raw.unique())
    if len(train_unique) > 2:
        threshold = float(y_train_raw.median())
        y_train = (y_train_raw > threshold).astype(int).values
        y_test = (y_test_raw > threshold).astype(int).values
        warnings.append(
            f"Target '{target_col}' binarized at train-set median ({threshold:.4g}): "
            f"values > {threshold:.4g} → 1, otherwise → 0."
        )
    elif len(train_unique) == 2 and set(train_unique) != {0, 1}:
        pos_label = train_unique[1]
        y_train = (y_train_raw == pos_label).astype(int).values
        y_test = (y_test_raw == pos_label).astype(int).values
    else:
        # Already binary numeric — encode consistently from train labels
        le_target = LabelEncoder()
        y_train = le_target.fit_transform(y_train_raw.astype(str).values)
        y_test = le_target.transform(y_test_raw.astype(str).values)

    # Build and fit preprocessor on train only — transform both splits
    preprocessor = _build_preprocessor(X_train, model_type)
    X_train_proc = preprocessor.fit_transform(X_train)
    X_test_proc = preprocessor.transform(X_test)

    # Align sensitive labels using positional indices from the split
    sensitive_test = original_sensitive[idx_test]
    sensitive_train = original_sensitive[idx_train]

    # Build model
    if model_type == "logistic_regression":
        model = LogisticRegression(max_iter=1000, random_state=42)
    elif model_type == "decision_tree":
        model = DecisionTreeClassifier(random_state=42)
    else:
        model = RandomForestClassifier(n_estimators=100, random_state=42)

    model.fit(X_train_proc, y_train)

    # Always predict on test set — never on train (fix #2 + #3)
    y_pred = model.predict(X_test_proc)

    # Detect collapsed model (fix #4)
    unique_preds = np.unique(y_pred)
    if len(unique_preds) == 1:
        warnings.append(
            f"Model collapsed — all {len(y_pred)} predictions are '{unique_preds[0]}'. "
            "Fairness metrics will be misleading. "
            "Try a different model type or verify the target column."
        )

    return {
        "y_true": y_test,
        "y_pred": y_pred,
        "sensitive_test": sensitive_test,
        "sensitive_train": sensitive_train,
        "model": model,
        "preprocessor": preprocessor,
        "X_train": X_train_proc,
        "X_test": X_test_proc,
        "y_train": y_train,
        "warnings": warnings,
    }
