from __future__ import annotations

from datetime import datetime, timezone
import json
from typing import Any, Dict


def _ts() -> str:
    return datetime.now(timezone.utc).isoformat()


def log(level: str, event: str, **fields: Any) -> None:
    payload: Dict[str, Any] = {
        "ts": _ts(),
        "level": level,
        "service": "aura-ai-worker",
        "event": event,
    }
    payload.update(fields)
    print(json.dumps(payload, ensure_ascii=False))

