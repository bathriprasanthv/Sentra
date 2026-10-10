"""
Sentra - Evaluate Isolation Forest.
Run: python ml/evaluate_model.py
"""
from __future__ import annotations
import os
import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import (
    classification_report, confusion_matrix, roc_auc_score, precision_recall_curve
)


HERE       = os.path.dirname(__file__)
DATA_PATH  = os.path.join(HERE, "data", "sessions.csv")
MODELS_DIR = os.path.abspath(os.path.join(HERE, "..", "backend", "models"))


def main():
    df     = pd.read_csv(DATA_PATH)
    model  = joblib.load(os.path.join(MODELS_DIR, "isolation_forest.pkl"))
    scaler = joblib.load(os.path.join(MODELS_DIR, "scaler.pkl"))

    features = [c for c in df.columns if c != "label"]
    X = df[features].values
    y = df["label"].values
    Xs = scaler.transform(X)

    # Isolation Forest: predict returns 1 (inlier) / -1 (outlier)
    raw_pred = model.predict(Xs)
    y_pred   = (raw_pred == -1).astype(int)

    # Anomaly score: lower = more anomalous. Flip so higher = more anomalous.
    scores = -model.score_samples(Xs)     # higher = more anomalous
    # Normalize to [0,1] using training distribution
    s_min, s_max = scores.min(), scores.max()
    norm = (scores - s_min) / (s_max - s_min + 1e-9)

    print("=== Confusion Matrix ===")
    print(confusion_matrix(y, y_pred))
    print()
    print("=== Classification Report ===")
    print(classification_report(y, y_pred, digits=3))
    try:
        auc = roc_auc_score(y, norm)
        print(f"ROC AUC (anomaly score): {auc:.3f}")
    except Exception as e:
        print("ROC AUC skipped:", e)

    # Threshold sweep — pick the score above which we'd flag
    prec, rec, thr = precision_recall_curve(y, norm)
    # Best F1
    f1 = (2 * prec * rec) / (prec + rec + 1e-9)
    idx = int(np.argmax(f1[:-1]))
    print(f"Best F1 = {f1[idx]:.3f} at threshold {thr[idx]:.3f}  (prec={prec[idx]:.3f}, rec={rec[idx]:.3f})")


if __name__ == "__main__":
    main()