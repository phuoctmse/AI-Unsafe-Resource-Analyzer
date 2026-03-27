from __future__ import annotations

from typing import Iterable


def top_k_labels(scores: dict[str, float], k: int = 3) -> list[dict[str, float | str]]:
    """
    Convert a raw score dict like {"nude": 0.9, "weapon": 0.8, ...}
    into a top-k sorted list like [{"label": "nude", "score": 0.9}, ...].
    """
    if k <= 0:
        return []

    items: Iterable[tuple[str, float]] = (
        (label, float(score)) for label, score in scores.items() if score is not None
    )
    top = sorted(items, key=lambda x: x[1], reverse=True)[:k]
    return [{"label": label, "score": score} for label, score in top]

