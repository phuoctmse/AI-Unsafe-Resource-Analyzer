import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    redis_url: str
    scan_queue_key: str
    backend_url: str
    model_version: str
    label_set_version: str
    thresholds_version: str
    worker_version: str
    unsafe_threshold: float


def load_settings() -> Settings:
    return Settings(
        redis_url=os.getenv("REDIS_URL", "redis://localhost:6379"),
        scan_queue_key=os.getenv("SCAN_QUEUE_KEY", "aura:scanQueue"),
        backend_url=os.getenv("BACKEND_URL", "http://localhost:3001"),
        model_version=os.getenv("MODEL_VERSION", "mock-deterministic-0.1.0"),
        label_set_version=os.getenv("LABEL_SET_VERSION", "aura-labels-v1"),
        thresholds_version=os.getenv("THRESHOLDS_VERSION", "aura-thresholds-v1"),
        worker_version=os.getenv("WORKER_VERSION", "dev"),
        unsafe_threshold=float(os.getenv("UNSAFE_THRESHOLD", "0.6")),
    )

