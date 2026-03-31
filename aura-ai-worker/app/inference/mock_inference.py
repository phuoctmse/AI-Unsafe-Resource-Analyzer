"""
Mock inference — only used when USE_MOCK_INFERENCE=true (local dev / CI).
Not imported in production paths.
"""

import hashlib

from .labels import LABEL_ORDER

# Realistic baseline scores: safe labels dominate, unsafe labels are low.
_BASELINE: dict[str, float] = {
    "safe_neutral":     0.55,
    "safe_document":    0.20,
    "suggestive":       0.05,
    "sexual_explicit":  0.02,
    "nudity_artistic":  0.03,
    "violence_mild":    0.04,
    "violence_graphic": 0.01,
    "weapons":          0.02,
    "drugs":            0.02,
    "hate_symbols":     0.01,
    "self_harm":        0.01,
    "minors_risk":      0.01,
    "spam":             0.01,
    "qr_code":          0.01,
    "text_overlay":     0.01,
}

_JITTER_RANGE = 0.04


def deterministic_label_scores(seed: str) -> dict[str, float]:
    """
    Deterministic pseudo-scores — no model weights, stable per seed.
    Used only when USE_MOCK_INFERENCE=true.
    """
    scores: dict[str, float] = {}
    for label in LABEL_ORDER:
        digest = hashlib.sha256(f"{seed}|{label}".encode("utf-8")).digest()
        jitter = (int.from_bytes(digest[0:4], "big") / 2**32 - 0.5) * 2 * _JITTER_RANGE
        scores[label] = max(0.0, min(1.0, _BASELINE[label] + jitter))
    return scores
