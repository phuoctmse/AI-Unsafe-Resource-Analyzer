import hashlib

# Fixed label set aligned with vision–text moderation policy (mock scores only).
MOCK_LABEL_ORDER: tuple[str, ...] = (
    "safe_neutral",
    "safe_document",
    "suggestive",
    "sexual_explicit",
    "nudity_artistic",
    "violence_mild",
    "violence_graphic",
    "weapons",
    "drugs",
    "hate_symbols",
    "self_harm",
    "minors_risk",
    "spam",
    "qr_code",
    "text_overlay",
)

UNSAFE_LABELS: frozenset[str] = frozenset(
    {
        "sexual_explicit",
        "violence_graphic",
        "hate_symbols",
        "self_harm",
        "minors_risk",
    }
)

NSFW_RELATED: frozenset[str] = frozenset(
    {"suggestive", "sexual_explicit", "nudity_artistic"},
)
VIOLENCE_RELATED: frozenset[str] = frozenset(
    {"violence_mild", "violence_graphic", "weapons"},
)


def deterministic_label_scores(seed: str) -> dict[str, float]:
    """
    Deterministic pseudo-scores per label (no model weights).
    Stable for the same seed so the pipeline is testable offline.
    """
    scores: dict[str, float] = {}
    for label in MOCK_LABEL_ORDER:
        digest = hashlib.sha256(f"{seed}|{label}".encode("utf-8")).digest()
        scores[label] = int.from_bytes(digest[0:4], "big") / 2**32
    return scores


def aggregate_nsfw_violence(scores: dict[str, float]) -> tuple[float, float]:
    nsfw = max((scores[l] for l in NSFW_RELATED if l in scores), default=0.0)
    violence = max((scores[l] for l in VIOLENCE_RELATED if l in scores), default=0.0)
    return nsfw, violence


def max_unsafe_score(scores: dict[str, float]) -> float:
    return max((scores[l] for l in UNSAFE_LABELS if l in scores), default=0.0)
