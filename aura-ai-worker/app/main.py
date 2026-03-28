import asyncio
import time
from typing import Literal

import redis.asyncio as redis
from fastapi import FastAPI
from dotenv import load_dotenv

from .backend_client import post_processed_to_backend
from .config import load_settings
from .labeling import build_reason_short, top_k_labels
from .logger import log
from .mock_inference import (
    aggregate_nsfw_violence,
    deterministic_label_scores,
    max_unsafe_score,
)
from .queue_consumer import consumer_loop
from .schemas import AnalyzeRequest, ProcessedCallback

load_dotenv()

app = FastAPI(title="Aura AI Worker")

_settings = load_settings()
_redis_client: redis.Redis | None = None
_consumer_task: asyncio.Task[None] | None = None


def _decide_status(scores: dict[str, float], threshold: float) -> Literal["SAFE", "UNSAFE", "ERROR"]:
    return "UNSAFE" if max_unsafe_score(scores) >= threshold else "SAFE"


async def analyze_and_callback(image_id: str, image_url: str, object_key: str) -> None:
    start = time.perf_counter()
    log(
        "info",
        "analyze.started",
        imageId=image_id,
        objectKeyPresent=bool(object_key),
    )
    # Seed ties mock scores to the stored URL; real inference will fetch by object_key from S3/MinIO.
    raw_scores = deterministic_label_scores(image_url)
    nsfw_score, violence_score = aggregate_nsfw_violence(raw_scores)
    status = _decide_status(raw_scores, _settings.unsafe_threshold)
    top = top_k_labels(raw_scores, k=3)
    reason = build_reason_short(top, status)
    processed_time_ms = int((time.perf_counter() - start) * 1000)

    await post_processed_to_backend(
        _settings.backend_url,
        image_id,
        ProcessedCallback(
            status=status,
            nsfwScore=nsfw_score,
            violenceScore=violence_score,
            topLabels=top,
            reasonShort=reason,
            modelVersion=_settings.model_version,
            labelSetVersion=_settings.label_set_version,
            thresholdsVersion=_settings.thresholds_version,
            scoresFull=raw_scores,
            workerVersion=_settings.worker_version,
            processedTimeMs=processed_time_ms,
        ),
    )
    log(
        "info",
        "analyze.completed",
        imageId=image_id,
        status=status,
        processedTimeMs=processed_time_ms,
    )


@app.get("/health")
async def health() -> dict:
    return {"success": True, "data": {"service": "aura-ai-worker", "status": "ok"}}


@app.post("/analyze")
async def analyze(req: AnalyzeRequest) -> dict:
    # Synchronous-style API for manual smoke testing.
    await analyze_and_callback(req.imageId, req.imageUrl, req.objectKey)
    return {"success": True, "data": {"imageId": req.imageId}}


@app.on_event("startup")
async def startup_event() -> None:
    global _redis_client, _consumer_task

    log("info", "worker.startup.begin", redisUrl=_settings.redis_url, queueKey=_settings.scan_queue_key)
    _redis_client = redis.Redis.from_url(
        _settings.redis_url,
        decode_responses=True,
    )
    # Ensure connection is established.
    await _redis_client.ping()
    log("info", "worker.startup.redis_ready")

    _consumer_task = asyncio.create_task(
        consumer_loop(
            redis_client=_redis_client,
            settings=_settings,
            analyze_and_callback=analyze_and_callback,
        ),
    )
    log("info", "worker.startup.consumer_started")


@app.on_event("shutdown")
async def shutdown_event() -> None:
    global _redis_client, _consumer_task

    log("info", "worker.shutdown.begin")
    if _consumer_task:
        _consumer_task.cancel()
        try:
            await _consumer_task
        except asyncio.CancelledError:
            pass

    if _redis_client:
        await _redis_client.aclose()
        _redis_client = None
    log("info", "worker.shutdown.complete")

