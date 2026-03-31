import os
from typing import TYPE_CHECKING

import torch
from PIL import Image

from .labels import CLIP_TEXT_PROMPTS, LABEL_ORDER
from ..logger import log

if TYPE_CHECKING:
    from transformers import CLIPModel, CLIPProcessor

_model: "CLIPModel | None" = None
_processor: "CLIPProcessor | None" = None
_device: torch.device | None = None


def is_loaded() -> bool:
    return _model is not None and _processor is not None


def load_clip(model_id: str) -> None:
    global _model, _processor, _device

    from transformers import CLIPModel, CLIPProcessor

    threads = int(os.getenv("TORCH_NUM_THREADS", "4"))
    torch.set_num_threads(threads)

    _device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    log("info", "clip.load.begin", modelId=model_id, device=str(_device))

    _processor = CLIPProcessor.from_pretrained(model_id)
    _model = CLIPModel.from_pretrained(model_id)
    _model.eval()
    _model.to(_device)

    # Warm-up pass
    with torch.no_grad():
        dummy = Image.new("RGB", (224, 224), color=(128, 128, 128))
        inputs = _processor(text=list(CLIP_TEXT_PROMPTS), images=dummy, return_tensors="pt", padding=True)
        inputs = {k: v.to(_device) if hasattr(v, "to") else v for k, v in inputs.items()}
        _model(**inputs)

    log("info", "clip.load.done", modelId=model_id, device=str(_device))


def run_clip_scores(image: Image.Image) -> dict[str, float]:
    """
    Returns per-label scores using independent binary contrast scoring.

    For each label we compute:
        score = cosine_sim(image, unsafe_prompt) - cosine_sim(image, safe_prompt)
    then map to [0, 1] via sigmoid.

    This avoids the softmax competition problem where safe_neutral always wins
    because it is the most generic prompt in the label set.
    """
    if _model is None or _processor is None or _device is None:
        raise RuntimeError("CLIP model not loaded")

    # Build paired prompts: [unsafe_prompt, safe_anchor] for each label
    unsafe_prompts = list(CLIP_TEXT_PROMPTS)
    safe_anchor = "a safe, ordinary, everyday photograph with no harmful content"

    all_texts = unsafe_prompts + [safe_anchor]

    with torch.no_grad():
        inputs = _processor(
            text=all_texts,
            images=image,
            return_tensors="pt",
            padding=True,
        )
        inputs = {k: v.to(_device) if hasattr(v, "to") else v for k, v in inputs.items()}
        outputs = _model(**inputs)

        # image_embeds: (1, D), text_embeds: (N, D)
        image_embeds = outputs.image_embeds  # (1, D)
        text_embeds = outputs.text_embeds    # (N+1, D)

        # Normalize
        image_norm = image_embeds / image_embeds.norm(dim=-1, keepdim=True)
        text_norm = text_embeds / text_embeds.norm(dim=-1, keepdim=True)

        # Cosine similarities: (N+1,)
        sims = (image_norm @ text_norm.T).squeeze(0)

        n = len(CLIP_TEXT_PROMPTS)
        unsafe_sims = sims[:n]   # one per label
        safe_sim = sims[n]       # safe anchor (always last)

        # Score = how much more the image matches this label vs the safe anchor
        # sigmoid maps (-inf, +inf) → (0, 1)
        # Multiply by scale factor to spread the sigmoid curve
        scale = float(os.getenv("CLIP_SCORE_SCALE", "10.0"))
        deltas = (unsafe_sims - safe_sim) * scale
        scores = torch.sigmoid(deltas).cpu().tolist()

    if len(scores) != len(LABEL_ORDER):
        raise RuntimeError("label count mismatch")

    return {LABEL_ORDER[i]: float(scores[i]) for i in range(len(LABEL_ORDER))}
