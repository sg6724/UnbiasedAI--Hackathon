import numpy as np
from fairlearn.metrics import (
    MetricFrame,
    selection_rate,
    demographic_parity_difference,
    equalized_odds_difference,
)
from sklearn.metrics import accuracy_score

MIN_GROUP_SIZE = 10


def _safe_float(val) -> float:
    try:
        return round(float(val), 4)
    except Exception:
        return 0.0


def compute(y_true: np.ndarray, y_pred: np.ndarray, sensitive_test: np.ndarray) -> dict:
    warnings = []
    sensitive_test = np.asarray(sensitive_test)
    y_true = np.asarray(y_true)
    y_pred = np.asarray(y_pred)

    mf = MetricFrame(
        metrics={
            "selection_rate": selection_rate,
            "accuracy": accuracy_score,
        },
        y_true=y_true,
        y_pred=y_pred,
        sensitive_features=sensitive_test,
    )

    by_group = {}
    groups = np.unique(sensitive_test)
    group_pos_rates = {}
    small_groups = []
    zero_rate_groups = []

    for group in groups:
        mask = sensitive_test == group
        yt = y_true[mask]
        yp = y_pred[mask]
        count = int(np.sum(mask))

        # Fix #6: flag groups too small for reliable metrics
        if count < MIN_GROUP_SIZE:
            small_groups.append(f"'{group}' (n={count})")

        pos_rate = float(np.mean(yp)) if len(yp) > 0 else 0.0
        group_pos_rates[group] = pos_rate

        # Fix #7: flag zero positive prediction rate
        if pos_rate == 0.0 and count >= MIN_GROUP_SIZE:
            zero_rate_groups.append(str(group))

        tp = int(np.sum((yt == 1) & (yp == 1)))
        fn = int(np.sum((yt == 1) & (yp == 0)))
        tpr = tp / (tp + fn) if (tp + fn) > 0 else 0.0

        sr = mf.by_group["selection_rate"].get(group, 0.0)
        acc = mf.by_group["accuracy"].get(group, 0.0)

        # Fix #12: transparency — expose count and positive_prediction_rate prominently
        by_group[str(group)] = {
            "count": count,
            "positive_prediction_rate": _safe_float(pos_rate),
            "selection_rate": _safe_float(sr),
            "accuracy": _safe_float(acc),
            "tpr": _safe_float(tpr),
        }

    if small_groups:
        warnings.append(
            f"Small group warning: {', '.join(small_groups)} — "
            f"groups with fewer than {MIN_GROUP_SIZE} samples produce unreliable fairness metrics."
        )
    if zero_rate_groups:
        warnings.append(
            f"Zero positive prediction rate for group(s): {', '.join(zero_rate_groups)}. "
            "Disparate Impact Ratio = 0, indicating extreme apparent bias — "
            "verify the model is not collapsed."
        )

    # Scalar metrics
    if len(group_pos_rates) >= 2:
        rates = list(group_pos_rates.values())
        privileged_rate = max(rates)
        unprivileged_rate = min(rates)
        disparate_impact = _safe_float(
            unprivileged_rate / privileged_rate if privileged_rate > 0 else 1.0
        )
        mean_diff = _safe_float(privileged_rate - unprivileged_rate)
    else:
        disparate_impact = 1.0
        mean_diff = 0.0

    try:
        dpd = _safe_float(demographic_parity_difference(y_true, y_pred, sensitive_features=sensitive_test))
    except Exception:
        dpd = mean_diff

    try:
        eod = _safe_float(equalized_odds_difference(y_true, y_pred, sensitive_features=sensitive_test))
    except Exception:
        eod = 0.0

    overall_accuracy = _safe_float(accuracy_score(y_true, y_pred))

    # Fix #11: sanity check for suspiciously perfect fairness
    if abs(dpd) < 0.001 and abs(eod) < 0.001 and abs(mean_diff) < 0.001 and disparate_impact > 0.999:
        warnings.append(
            "Unusually perfect fairness metrics (DPD≈0, DIR≈1, EOD≈0, MD≈0). "
            "This may indicate a collapsed model, an ID-like sensitive column, "
            "or too few test samples — verify the pipeline."
        )

    verdict = _compute_verdict(dpd, disparate_impact, eod, mean_diff)

    return {
        "demographic_parity_difference": abs(dpd),
        "disparate_impact_ratio": disparate_impact,
        "equalized_odds_difference": abs(eod),
        "mean_difference": abs(mean_diff),
        "by_group": by_group,
        "overall_accuracy": overall_accuracy,
        "verdict": verdict,
        "warnings": warnings,
    }


def _compute_verdict(dpd: float, dir_: float, eod: float, md: float) -> str:
    dpd, eod, md = abs(dpd), abs(eod), abs(md)
    if dpd > 0.2 or dir_ < 0.6 or eod > 0.2 or md > 0.2:
        return "biased"
    if dpd > 0.1 or dir_ < 0.8 or eod > 0.1 or md > 0.1:
        return "borderline"
    return "fair"
