from __future__ import annotations

import json
from datetime import UTC, datetime
from typing import Any


def _ts() -> str:
    return datetime.now(UTC).isoformat()


def log(level: str, event: str, **fields: Any) -> None:
    payload: dict[str, Any] = {
        "ts": _ts(),
        "level": level,
        "service": "aura-ai-worker",
        "event": event,
    }
    payload.update(fields)
    print(json.dumps(payload, ensure_ascii=False))

