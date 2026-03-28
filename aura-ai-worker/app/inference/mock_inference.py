import hashlib

from .labels import LABEL_ORDER, NSFW_RELATED, UNSAFE_LABELS, VIOLENCE_RELATED


def deterministic_label_scores(seed: str) -> dict[str, float]:
    """
    Deterministic pseudo-scores per label (no model weights).
    Stable for the same seed so the pipeline is testable offline.
    """
    scores: dict[str, float] = {}
    for label in LABEL_ORDER:
        digest = hashlib.sha256(f"{seed}|{label}".encode("utf-8")).digest()
        scores[label] = int.from_bytes(digest[0:4], "big") / 2**32
    return scores


def aggregate_nsfw_violence(scores: dict[str, float]) -> tuple[float, float]:
    nsfw = max((scores[l] for l in NSFW_RELATED if l in scores), default=0.0)
    violence = max((scores[l] for l in VIOLENCE_RELATED if l in scores), default=0.0)
    return nsfw, violence


def max_unsafe_score(scores: dict[str, float]) -> float:
    return max((scores[l] for l in UNSAFE_LABELS if l in scores), default=0.0)
