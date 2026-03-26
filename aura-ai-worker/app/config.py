import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    redis_url: str
    scan_queue_key: str
    backend_url: str


def load_settings() -> Settings:
    return Settings(
        redis_url=os.getenv("REDIS_URL", "redis://localhost:6379"),
        scan_queue_key=os.getenv("SCAN_QUEUE_KEY", "aura:scanQueue"),
        backend_url=os.getenv("BACKEND_URL", "http://localhost:3001"),
    )

