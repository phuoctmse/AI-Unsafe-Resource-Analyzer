"""
Score aggregation utilities — used by both real and mock inference paths.
"""

from .labels import NSFW_RELATED, UNSAFE_LABELS, VIOLENCE_RELATED


def aggregate_nsfw_violence(scores: dict[str, float]) -> tuple[float, float]:
    """Return (nsfw_score, violence_score) as the max within each group."""
    nsfw = max((scores[lbl] for lbl in NSFW_RELATED if lbl in scores), default=0.0)
    violence = max((scores[lbl] for lbl in VIOLENCE_RELATED if lbl in scores), default=0.0)
    return nsfw, violence


def max_unsafe_score(scores: dict[str, float]) -> float:
    """Return the highest score among hard-unsafe labels."""
    return max((scores[lbl] for lbl in UNSAFE_LABELS if lbl in scores), default=0.0)
