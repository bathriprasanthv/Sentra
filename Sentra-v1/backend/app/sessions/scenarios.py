"""
Sentra - Lab Scenarios.
Each scenario is a list of steps: (delay_seconds, event_dict).
The runner executes them sequentially against a live session so the security
pipeline reacts in real time.
"""
from __future__ import annotations
from typing import List, Dict, Any


# Common devices/locations for demo
KNOWN_DEVICE = "device-known-01"
KNOWN_LOCATION = "Mumbai"
UNKNOWN_DEVICE = "device-UNKNOWN-99"
UNKNOWN_LOCATION = "Unknown-Region"


def _ev(endpoint: str, event_type: str = "PAGE_VIEW", **kw) -> Dict[str, Any]:
    """Helper to build an event dict."""
    base = {
        "endpoint": endpoint,
        "event_type": event_type,
        "method": "GET",
        "status_code": 200,
    }
    base.update(kw)
    return base


# ============================================================
# SCENARIO DEFINITIONS
# Each = list of (delay_in_seconds, event_dict_or_special_marker)
# Special markers:
#   {"__action__": "reset"}       -> clear session state
#   {"__action__": "device"}      -> switch device mid-session
#   {"__action__": "location"}    -> switch location mid-session
# ============================================================


NORMAL_USER: List = [
    (0.0, _ev("/dashboard")),
    (1.5, _ev("/profile")),
    (1.5, _ev("/products")),
    (2.0, _ev("/reports")),
    (1.5, _ev("/settings")),
    (2.0, _ev("/dashboard")),
    (1.5, _ev("/products")),
    (2.0, _ev("/reports")),
]


SESSION_HIJACKING: List = [
    # Start normal...
    (0.0, _ev("/dashboard")),
    (1.5, _ev("/profile")),
    (1.5, _ev("/products")),
    # ...attacker takes over: device + location change silently
    (2.0, {"__action__": "device", "value": UNKNOWN_DEVICE}),
    (0.5, {"__action__": "location", "value": UNKNOWN_LOCATION}),
    # Then rapid privileged probing
    (0.3, _ev("/admin", "ADMIN_ACCESS", status_code=200)),
    (0.3, _ev("/api/users", "API_REQUEST", status_code=200)),
    (0.3, _ev("/admin/settings", "SENSITIVE_ACTION", status_code=200)),
    (0.3, _ev("/api/keys", "API_REQUEST", status_code=200)),
    (0.3, _ev("/reports/export", "SENSITIVE_ACTION", status_code=200)),
]


REQUEST_BURST: List = [
    # Steady, then sudden burst
    (0.0, _ev("/dashboard")),
    (1.5, _ev("/products")),
    (1.5, _ev("/reports")),
]
# Then we append 60 rapid requests
for i in range(60):
    REQUEST_BURST.append((0.08, _ev("/products", "API_REQUEST")))


ENUMERATION: List = [
    (0.0, _ev("/dashboard")),
]
# Rapidly enumerate many distinct endpoints
for path in [
    "/products/1", "/products/2", "/products/3", "/products/4", "/products/5",
    "/reports/1", "/reports/2", "/reports/3", "/reports/4", "/reports/5",
    "/api/users/1", "/api/users/2", "/api/users/3", "/api/users/4", "/api/users/5",
    "/api/orders/1", "/api/orders/2", "/api/orders/3", "/api/orders/4", "/api/orders/5",
    "/settings/1", "/settings/2", "/settings/3",
]:
    ENUMERATION.append((0.15, _ev(path, "API_REQUEST", status_code=404)))


ABNORMAL_NAVIGATION: List = [
    (0.0, _ev("/dashboard")),
    (1.0, _ev("/admin", "ADMIN_ACCESS")),
    (0.3, _ev("/profile")),
    (0.2, _ev("/admin/users", "ADMIN_ACCESS")),
    (0.5, _ev("/products")),
    (0.2, _ev("/admin/settings", "ADMIN_ACCESS")),
    (0.4, _ev("/reports")),
    (0.2, _ev("/api/keys", "SENSITIVE_ACTION")),
]


SENSITIVE_ACCESS: List = [
    (0.0, _ev("/dashboard")),
    (0.8, _ev("/admin", "ADMIN_ACCESS")),
    (0.5, _ev("/admin/users", "ADMIN_ACCESS")),
    (0.5, _ev("/admin/settings", "ADMIN_ACCESS")),
    (0.5, _ev("/api/keys", "SENSITIVE_ACTION")),
    (0.5, _ev("/api/users", "SENSITIVE_ACTION")),
    (0.5, _ev("/reports/export", "SENSITIVE_ACTION")),
    (0.5, _ev("/billing", "SENSITIVE_ACTION")),
]


DEVICE_CHANGE: List = [
    (0.0, _ev("/dashboard")),
    (1.5, _ev("/profile")),
    (1.5, {"__action__": "device", "value": UNKNOWN_DEVICE}),
    (0.5, _ev("/products")),
    (1.0, _ev("/reports")),
    (1.0, {"__action__": "device", "value": "device-UNKNOWN-77"}),
    (0.5, _ev("/settings")),
]


LOCATION_CHANGE: List = [
    (0.0, _ev("/dashboard")),
    (1.5, _ev("/profile")),
    (1.5, {"__action__": "location", "value": "Tokyo"}),
    (0.5, _ev("/products")),
    (1.0, {"__action__": "location", "value": "Sao Paulo"}),
    (0.5, _ev("/reports")),
]


FAILED_AUTH_BURST: List = [
    (0.0, _ev("/dashboard")),
]
# Rapid failed requests
for i in range(25):
    FAILED_AUTH_BURST.append((0.15, _ev("/login", "FAILED_REQUEST",
                                          method="POST", status_code=401)))
for i in range(15):
    FAILED_AUTH_BURST.append((0.15, _ev("/admin", "FAILED_REQUEST", status_code=403)))


PRIVILEGE_ESCALATION: List = [
    (0.0, _ev("/dashboard")),
    (1.0, _ev("/profile")),
    (1.0, _ev("/settings")),
    # Probing for admin
    (0.5, _ev("/admin", "FAILED_REQUEST", status_code=403)),
    (0.3, _ev("/admin", "FAILED_REQUEST", status_code=403)),
    (0.3, _ev("/admin/users", "FAILED_REQUEST", status_code=403)),
    # Then "succeeds"
    (1.0, _ev("/admin", "ADMIN_ACCESS", status_code=200)),
    (0.5, _ev("/admin/users", "ADMIN_ACCESS", status_code=200)),
    (0.5, _ev("/api/keys", "SENSITIVE_ACTION", status_code=200)),
    (0.5, _ev("/admin/settings", "SENSITIVE_ACTION", status_code=200)),
]


COMBINED: List = [
    # Everything at once: device + location + burst + sensitive + failures
    (0.0, _ev("/dashboard")),
    (0.5, {"__action__": "device", "value": UNKNOWN_DEVICE}),
    (0.5, {"__action__": "location", "value": "Unknown-Region"}),
]
for i in range(20):
    COMBINED.append((0.1, _ev("/admin", "ADMIN_ACCESS", status_code=200)))
for i in range(15):
    COMBINED.append((0.1, _ev("/api/keys", "SENSITIVE_ACTION", status_code=200)))
for i in range(20):
    COMBINED.append((0.1, _ev("/api/users", "FAILED_REQUEST", status_code=403)))


SCENARIOS: Dict[str, List] = {
    "normal_user":          NORMAL_USER,
    "session_hijacking":    SESSION_HIJACKING,
    "request_burst":        REQUEST_BURST,
    "enumeration":          ENUMERATION,
    "abnormal_navigation":  ABNORMAL_NAVIGATION,
    "sensitive_access":     SENSITIVE_ACCESS,
    "device_change":        DEVICE_CHANGE,
    "location_change":      LOCATION_CHANGE,
    "failed_auth_burst":    FAILED_AUTH_BURST,
    "privilege_escalation": PRIVILEGE_ESCALATION,
    "combined":             COMBINED,
}


SCENARIO_META = {
    "normal_user":          {"label": "Normal User",           "severity": "info"},
    "session_hijacking":    {"label": "Session Hijacking",     "severity": "critical"},
    "request_burst":        {"label": "Request Burst",         "severity": "high"},
    "enumeration":          {"label": "Endpoint Enumeration",  "severity": "high"},
    "abnormal_navigation":  {"label": "Abnormal Navigation",   "severity": "medium"},
    "sensitive_access":     {"label": "Sensitive Access",      "severity": "high"},
    "device_change":        {"label": "Device Change",         "severity": "medium"},
    "location_change":      {"label": "Location Change",       "severity": "medium"},
    "failed_auth_burst":    {"label": "Failed Auth Burst",     "severity": "high"},
    "privilege_escalation": {"label": "Privilege Escalation",  "severity": "critical"},
    "combined":             {"label": "Combined Scenario",     "severity": "critical"},
}