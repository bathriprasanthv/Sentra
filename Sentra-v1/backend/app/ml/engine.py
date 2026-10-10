"""
Sentra - ML Engine (runtime).
Loads trained Isolation Forest and produces anomaly scores on live sessions.
Uses a robust, self-calibrating normalization so scores remain meaningful
across retrains and sklearn versions.
"""
from __future__ import annotations
import os
import json
import time
import numpy as np
import joblib


MODELS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "models"))

# Debug flag — set to True to see per-session scoring in the server console
DEBUG = True


class MLEngine:
    def __init__(self):
        self.model = None
        self.scaler = None
        self.features = []
        self.ready = False
        self._score_cache = {}     # session_id -> (timestamp, score, event_count)
        self._cache_ttl = 0.5      # seconds

        # Calibration state — learned from first N normal sessions
        self._raw_history = []     # list of raw scores seen so far
        self._max_history = 200

    def load(self):
        try:
            self.model   = joblib.load(os.path.join(MODELS_DIR, "isolation_forest.pkl"))
            self.scaler  = joblib.load(os.path.join(MODELS_DIR, "scaler.pkl"))
            with open(os.path.join(MODELS_DIR, "feature_names.json")) as f:
                self.features = json.load(f)
            self.ready = True
            print(f"[ML] Isolation Forest loaded — {len(self.features)} features")
        except Exception as e:
            self.ready = False
            print(f"[ML] WARNING — could not load model: {e}")

    # ---------- Feature extraction ----------
    def _extract_features(self, sess) -> np.ndarray:
        rpm      = float(sess.requests_per_minute)
        duration = float(sess.age_seconds)
        failed   = float(sess.failed_requests)
        uniq_ep  = float(len(sess.unique_endpoints))
        sens     = float(sess.sensitive_requests)

        # request_interval
        times = list(sess.request_times)[-50:]
        if len(times) >= 2:
            gaps = np.diff(times)
            interval = float(np.mean(gaps)) if len(gaps) else 5.0
        else:
            interval = 5.0

        # burst_rate
        if len(times) >= 5:
            gaps = np.diff(times)
            burst_rate = float(np.mean(gaps < 0.5))
        else:
            burst_rate = 0.0

        # navigation_deviation
        # Use a minimum denominator so short sessions don't hit 1.0 spuriously.
        # Same formula used at training time so distributions match.
        total_events = max(len(sess.events), 10)
        nav_dev = min(1.0, float(len(sess.unique_endpoints) / total_events))

        device_change   = float(min(sess.device_changes, 3)) / 3.0
        location_change = float(min(sess.location_changes, 3)) / 3.0

        # activity_time_deviation
        hour = time.localtime().tm_hour
        if 9 <= hour <= 18:
            time_dev = 0.0
        elif hour in (7, 8, 19, 20):
            time_dev = 0.3
        else:
            time_dev = 0.7

        vec = np.array([[
            rpm, duration, failed, uniq_ep, sens,
            interval, burst_rate, nav_dev,
            device_change, location_change, time_dev,
        ]], dtype=np.float64)

        # Safety: replace NaN/inf
        vec = np.nan_to_num(vec, nan=0.0, posinf=1e6, neginf=-1e6)
        return vec

    # ---------- Calibration ----------
    def _calibrate(self, raw: float) -> float:
        """
        Map raw score_samples output (negated: higher = more anomalous) to [0, 1].

        Empirically observed on our training data:
            NORMAL sessions: raw ≈ 0.30 – 0.55
            ANOMALOUS:       raw ≈ 0.55 – 0.95
        """
        anchors_x = [0.30, 0.40, 0.50, 0.60, 0.75]
        anchors_y = [0.00, 0.15, 0.35, 0.65, 1.00]

        if raw <= anchors_x[0]:
            return 0.0
        if raw >= anchors_x[-1]:
            return 1.0

        for i in range(len(anchors_x) - 1):
            if anchors_x[i] <= raw <= anchors_x[i + 1]:
                x0, x1 = anchors_x[i], anchors_x[i + 1]
                y0, y1 = anchors_y[i], anchors_y[i + 1]
                t = (raw - x0) / (x1 - x0)
                return float(y0 + t * (y1 - y0))
        return 0.0

    # ---------- Public API ----------
    def score_session(self, sess) -> float:
        if not self.ready:
            return 0.0

        now = time.time()
        event_count = len(sess.events)

        cached = self._score_cache.get(sess.id)
        if cached:
            ts, score, cached_events = cached
            # Invalidate if TTL passed OR session has new events
            if (now - ts) < self._cache_ttl and cached_events == event_count:
                return score

        try:
            X  = self._extract_features(sess)
            Xs = self.scaler.transform(X)

            # Robust anomaly score: use score_samples (mean path depth).
            # Lower = more anomalous. We negate so higher = more anomalous.
            raw = float(-self.model.score_samples(Xs)[0])

            score = self._calibrate(raw)

            if DEBUG:
                print(f"[ML] sess={sess.id[:12]} events={event_count} "
                      f"rpm={sess.requests_per_minute:.0f} "
                      f"raw={raw:+.4f} score={score:.3f}")
        except Exception as e:
            if DEBUG:
                print(f"[ML] ERROR scoring session {sess.id[:12]}: {e}")
            score = 0.0

        self._score_cache[sess.id] = (now, score, event_count)
        return score

    def health(self) -> dict:
        return {
            "ready": self.ready,
            "features": self.features,
            "model_dir": MODELS_DIR,
            "history_size": len(self._raw_history),
        }


# Singleton
ml_engine = MLEngine()