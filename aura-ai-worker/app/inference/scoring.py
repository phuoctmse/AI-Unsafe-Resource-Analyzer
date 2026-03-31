"""
Score aggregation utilities — used by both real and mock inference paths.
"""

from .labels import NSFW_RELATED, UNSAFE_LABELS, VIOLENCE_RELATED


def aggregate_nsfw_violence(scores: dict[str, float]) -> tuple[float, float]:
    """Return (nsfw_score, violence_score) as the max within each group."""
    nsfw = max((scores[l] for l in NSFW_RELATED if l in scores), default=0.0)
    violence = max((scores[l] for l in VIOLENCE_RELATED if l in scores), default=0.0)
    return nsfw, violence


def max_unsafe_score(scores: dict[str, float]) -> float:
    """Return the highest score among hard-unsafe labels."""
    return max((scores[l] for l in UNSAFE_LABELS if l in scores), default=0.0)
