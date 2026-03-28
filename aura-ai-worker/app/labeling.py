from __future__ import annotations

from typing import Iterable, Literal


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


def build_reason_short(
    top: list[dict[str, float | str]],
    status: Literal["SAFE", "UNSAFE", "ERROR"],
) -> str:
    """Templated explanation for audit/UI (no LLM)."""
    if status == "ERROR":
        return "Processing failed."
    if not top:
        return "No label scores available."
    first = top[0]
    label = str(first["label"])
    score = float(first["score"])
    pct = f"{score * 100:.0f}%"
    if len(top) >= 3:
        l2, l3 = str(top[1]["label"]), str(top[2]["label"])
        return f"Highest signal: {label} ({pct}); also {l2}, {l3}."
    if len(top) == 2:
        return f"Highest signal: {label} ({pct}); also {top[1]['label']}."
    return f"Highest signal: {label} ({pct})."

