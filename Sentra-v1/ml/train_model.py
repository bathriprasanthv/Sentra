"""
Sentra - Train Isolation Forest on synthetic session telemetry.
Run: python ml/train_model.py
"""
from __future__ import annotations
import os
import json
import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler


HERE       = os.path.abspath(os.path.dirname(__file__))
DATA_PATH  = os.path.join(HERE, "data", "sessions.csv")
MODELS_DIR = os.path.abspath(os.path.join(HERE, "..", "backend", "models"))

FEATURES = [
    "requests_per_minute",
    "session_duration",
    "failed_requests",
    "unique_endpoints",
    "sensitive_requests",
    "request_interval",
    "burst_rate",
    "navigation_deviation",
    "device_change",
    "location_change",
    "activity_time_deviation",
]


def main():
    print("=" * 60)
    print(f"[train] HERE        = {HERE}")
    print(f"[train] DATA_PATH   = {DATA_PATH}")
    print(f"[train] MODELS_DIR  = {MODELS_DIR}")
    print(f"[train] DATA EXISTS = {os.path.exists(DATA_PATH)}")
    print(f"[train] MODELS DIR EXISTS = {os.path.isdir(MODELS_DIR)}")
    print("=" * 60)

    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(f"Dataset not found at {DATA_PATH}. Run generate_dataset.py first.")

    os.makedirs(MODELS_DIR, exist_ok=True)

    df = pd.read_csv(DATA_PATH)
    print(f"[train] rows = {len(df)}, cols = {list(df.columns)}")

    X = df[FEATURES].values
    y = df["label"].values

    scaler = StandardScaler().fit(X)
    Xs = scaler.transform(X)

    contamination = float(np.clip(y.mean(), 0.05, 0.35))
    print(f"[train] contamination = {contamination:.4f}")

    model = IsolationForest(
        n_estimators=200,
        max_samples="auto",
        contamination=contamination,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(Xs)

    model_path  = os.path.join(MODELS_DIR, "isolation_forest.pkl")
    scaler_path = os.path.join(MODELS_DIR, "scaler.pkl")
    feats_path  = os.path.join(MODELS_DIR, "feature_names.json")

    joblib.dump(model,  model_path)
    joblib.dump(scaler, scaler_path)
    with open(feats_path, "w") as f:
        json.dump(FEATURES, f, indent=2)

    # Verify what we just wrote
    import datetime
    mtime = datetime.datetime.fromtimestamp(os.path.getmtime(model_path))
    print(f"[train] WROTE   {model_path}")
    print(f"[train] MTIME   {mtime}")
    print(f"[train] SIZE    {os.path.getsize(model_path)} bytes")
    print(f"[train] WROTE   {scaler_path}")
    print(f"[train] MTIME   {datetime.datetime.fromtimestamp(os.path.getmtime(scaler_path))}")
    print(f"[train] WROTE   {feats_path}")
    print("=" * 60)


if __name__ == "__main__":
    main()