"""
Policy label keys and CLIP text prompts (order must stay aligned).
"""

from __future__ import annotations

# Order matches CLIP softmax output indexing.
LABEL_ORDER: tuple[str, ...] = (
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

# One descriptive phrase per class for zero-shot CLIP.
CLIP_TEXT_PROMPTS: tuple[str, ...] = (
    "a photograph of ordinary safe neutral everyday content",
    "a photograph of documents, screenshots, or text pages",
    "a photograph with mildly suggestive or suggestive clothing",
    "a photograph with explicit sexual content or nudity meant to be sexual",
    "a photograph of artistic nudity or non-sexual nudity in art context",
    "a photograph with mild violence or rough sports",
    "a photograph with graphic violence, blood, or severe injury",
    "a photograph of firearms, knives, or weapons used as weapons",
    "a photograph of illegal drugs, pills, or drug paraphernalia",
    "a photograph of hate symbols, extremist propaganda, or racist imagery",
    "a photograph of self-harm, suicide, or injury to self",
    "a photograph that may involve minors in unsafe or inappropriate contexts",
    "a photograph of spam, scams, or low-quality repetitive content",
    "a photograph dominated by QR codes or barcodes",
    "a photograph with heavy text overlays or memes",
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

# Validate alignment at import time so misconfiguration is caught immediately.
if len(CLIP_TEXT_PROMPTS) != len(LABEL_ORDER):
    raise RuntimeError(
        f"CLIP_TEXT_PROMPTS ({len(CLIP_TEXT_PROMPTS)}) and LABEL_ORDER "
        f"({len(LABEL_ORDER)}) must have the same length."
    )
