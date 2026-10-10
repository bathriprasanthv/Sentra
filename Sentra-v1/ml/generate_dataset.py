"""
Sentra - Synthetic session telemetry generator.
Creates a labeled dataset: 0 = normal, 1 = anomaly.
Run:  python ml/generate_dataset.py
Output: ml/data/sessions.csv
"""
from __future__ import annotations
import os
import numpy as np
import pandas as pd


SEED = 42
np.random.seed(SEED)

OUT_PATH = os.path.join(os.path.dirname(__file__), "data", "sessions.csv")
os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)


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


def make_normal(n: int) -> pd.DataFrame:
    """
    Normal user behavior.
    Includes natural variety in request spacing (0.5s - 8s) and session length.
    """
    n_short = n // 2
    n_long  = n - n_short

    # ----- SHORT sessions (early, warming up) -----
    rpm_s        = np.random.normal(10, 5, n_short).clip(1, 30)
    duration_s   = np.random.uniform(5, 60, n_short)
    failed_s     = np.random.poisson(0.2, n_short).clip(0, 2)
    endpoints_s  = np.random.randint(3, 7, n_short)
    sensitive_s  = np.random.poisson(0.05, n_short).clip(0, 1)
    # KEY FIX: realistic inter-request spacing
    interval_s   = np.random.uniform(0.5, 8.0, n_short)
    burst_s      = np.random.normal(0.05, 0.06, n_short).clip(0, 0.25)
    # KEY FIX: nav_dev is unique/total, so short sessions naturally have higher
    # values. Train the model to accept that.
    nav_dev_s    = np.random.normal(0.45, 0.12, n_short).clip(0.2, 0.8)
    device_s     = np.random.binomial(1, 0.01, n_short)
    location_s   = np.random.binomial(1, 0.01, n_short)
    time_dev_s   = np.random.normal(0.15, 0.1, n_short).clip(0, 0.4)

    # ----- LONG sessions (steady state) -----
    rpm_l        = np.random.normal(22, 5, n_long).clip(8, 45)
    duration_l   = np.random.normal(600, 120, n_long).clip(60, 1800)
    failed_l     = np.random.poisson(0.4, n_long).clip(0, 3)
    endpoints_l  = np.random.randint(4, 10, n_long)
    sensitive_l  = np.random.poisson(0.3, n_long).clip(0, 2)
    interval_l   = np.random.uniform(1.2, 6.0, n_long)
    burst_l      = np.random.normal(0.05, 0.03, n_long).clip(0, 0.2)
    nav_dev_l    = np.random.normal(0.20, 0.10, n_long).clip(0.05, 0.45)
    device_l     = np.random.binomial(1, 0.02, n_long)
    location_l   = np.random.binomial(1, 0.02, n_long)
    time_dev_l   = np.random.normal(0.1, 0.05, n_long).clip(0, 0.3)

    return pd.DataFrame({
        "requests_per_minute": np.concatenate([rpm_s, rpm_l]),
        "session_duration":    np.concatenate([duration_s, duration_l]),
        "failed_requests":     np.concatenate([failed_s, failed_l]),
        "unique_endpoints":    np.concatenate([endpoints_s, endpoints_l]),
        "sensitive_requests":  np.concatenate([sensitive_s, sensitive_l]),
        "request_interval":    np.concatenate([interval_s, interval_l]),
        "burst_rate":          np.concatenate([burst_s, burst_l]),
        "navigation_deviation":np.concatenate([nav_dev_s, nav_dev_l]),
        "device_change":       np.concatenate([device_s, device_l]),
        "location_change":     np.concatenate([location_s, location_l]),
        "activity_time_deviation": np.concatenate([time_dev_s, time_dev_l]),
        "label": 0,
    })


def make_anomaly(n: int) -> pd.DataFrame:
    """Attacker: burst, failures, sensitive probing, device/location flips."""
    rpm         = np.random.normal(180, 60, n).clip(50, 500)
    duration    = np.random.normal(400, 180, n).clip(30, 1200)
    failed      = np.random.poisson(18, n).clip(5, 80)
    endpoints   = np.random.randint(10, 40, n)
    sensitive   = np.random.poisson(12, n).clip(3, 60)
    interval    = np.random.normal(0.3, 0.15, n).clip(0.02, 1.0)
    burst       = np.random.normal(0.65, 0.15, n).clip(0.3, 1.0)
    nav_dev     = np.random.normal(0.70, 0.10, n).clip(0.5, 1.0)
    device_ch   = np.random.binomial(1, 0.7, n)
    location_ch = np.random.binomial(1, 0.6, n)
    time_dev    = np.random.normal(0.65, 0.15, n).clip(0.3, 1.0)
    return pd.DataFrame({
        "requests_per_minute": rpm,
        "session_duration": duration,
        "failed_requests": failed,
        "unique_endpoints": endpoints,
        "sensitive_requests": sensitive,
        "request_interval": interval,
        "burst_rate": burst,
        "navigation_deviation": nav_dev,
        "device_change": device_ch,
        "location_change": location_ch,
        "activity_time_deviation": time_dev,
        "label": 1,
    })


def main():
    n_normal    = 3000
    n_anomaly   = 600      # imbalanced, like real life (~17%)
    df = pd.concat([make_normal(n_normal), make_anomaly(n_anomaly)], ignore_index=True)
    df = df.sample(frac=1.0, random_state=SEED).reset_index(drop=True)
    df.to_csv(OUT_PATH, index=False)
    print(f"[generate] wrote {len(df)} rows -> {OUT_PATH}")
    print(f"[generate] normal={n_normal}  anomaly={n_anomaly}")


if __name__ == "__main__":
    main()