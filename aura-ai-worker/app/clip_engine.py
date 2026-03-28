import os
from typing import TYPE_CHECKING

import torch
from PIL import Image

from .labels import CLIP_TEXT_PROMPTS, LABEL_ORDER
from .logger import log

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

    # Warm-up (small random image)
    with torch.no_grad():
        dummy = Image.new("RGB", (224, 224), color=(128, 128, 128))
        inputs = _processor(text=list(CLIP_TEXT_PROMPTS), images=dummy, return_tensors="pt", padding=True)
        inputs = {k: v.to(_device) if hasattr(v, "to") else v for k, v in inputs.items()}
        _model(**inputs)

    log("info", "clip.load.done", modelId=model_id, device=str(_device))


def run_clip_scores(image: Image.Image) -> dict[str, float]:
    if _model is None or _processor is None or _device is None:
        raise RuntimeError("CLIP model not loaded")

    with torch.no_grad():
        inputs = _processor(
            text=list(CLIP_TEXT_PROMPTS),
            images=image,
            return_tensors="pt",
            padding=True,
        )
        inputs = {k: v.to(_device) if hasattr(v, "to") else v for k, v in inputs.items()}
        outputs = _model(**inputs)
        logits = outputs.logits_per_image[0]
        probs = logits.softmax(dim=-1).cpu().tolist()

    if len(probs) != len(LABEL_ORDER):
        raise RuntimeError("label count mismatch")

    return {LABEL_ORDER[i]: float(probs[i]) for i in range(len(LABEL_ORDER))}
