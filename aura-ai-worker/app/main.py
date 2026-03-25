import asyncio
import time
from typing import Literal

import redis.asyncio as redis
from fastapi import FastAPI

from .backend_client import post_processed_to_backend
from .config import load_settings
from .mock_inference import deterministic_mock_scores
from .queue_consumer import consumer_loop
from .schemas import AnalyzeRequest, ProcessedCallback

app = FastAPI(title="Aura AI Worker")

_settings = load_settings()
_redis_client: redis.Redis | None = None
_consumer_task: asyncio.Task[None] | None = None


def _decide_status(
    nsfw_score: float,
    violence_score: float,
) -> Literal["SAFE", "UNSAFE", "ERROR"]:
    return "UNSAFE" if max(nsfw_score, violence_score) > 0.6 else "SAFE"


async def analyze_and_callback(image_id: str, image_url: str) -> None:
    start = time.perf_counter()
    nsfw_score, violence_score = deterministic_mock_scores(image_url)
    status = _decide_status(nsfw_score, violence_score)
    processed_time_ms = int((time.perf_counter() - start) * 1000)

    await post_processed_to_backend(
        _settings.backend_url,
        image_id,
        ProcessedCallback(
            status=status,
            nsfwScore=nsfw_score,
            violenceScore=violence_score,
            processedTimeMs=processed_time_ms,
        ),
    )


@app.get("/health")
async def health() -> dict:
    return {"success": True, "data": {"service": "aura-ai-worker", "status": "ok"}}


@app.post("/analyze")
async def analyze(req: AnalyzeRequest) -> dict:
    # Synchronous-style API for manual smoke testing.
    await analyze_and_callback(req.imageId, req.imageUrl)
    return {"success": True, "data": {"imageId": req.imageId}}


@app.on_event("startup")
async def startup_event() -> None:
    global _redis_client, _consumer_task

    _redis_client = redis.Redis.from_url(
        _settings.redis_url,
        decode_responses=True,
    )
    # Ensure connection is established.
    await _redis_client.ping()

    _consumer_task = asyncio.create_task(
        consumer_loop(
            redis_client=_redis_client,
            settings=_settings,
            analyze_and_callback=analyze_and_callback,
        ),
    )


@app.on_event("shutdown")
async def shutdown_event() -> None:
    global _redis_client, _consumer_task

    if _consumer_task:
        _consumer_task.cancel()
        try:
            await _consumer_task
        except asyncio.CancelledError:
            pass

    if _redis_client:
        await _redis_client.aclose()
        _redis_client = None

