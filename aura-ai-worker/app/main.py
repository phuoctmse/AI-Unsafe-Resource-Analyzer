import asyncio

import redis.asyncio as redis
from fastapi import FastAPI
from dotenv import load_dotenv

from .inference.clip_engine import is_loaded, load_clip
from .config import load_settings
from .logger import log
from .pipeline.queue_consumer import consumer_loop
from .schemas import AnalyzeRequest
from .services.analyze_service import AnalyzeService

load_dotenv()

app = FastAPI(title="Aura AI Worker")

_settings = load_settings()
_redis_client: redis.Redis | None = None
_consumer_task: asyncio.Task[None] | None = None
_inference_sem: asyncio.Semaphore = asyncio.Semaphore(_settings.max_concurrent_inference)
_analyze_service: AnalyzeService = AnalyzeService(_settings, _inference_sem)


@app.get("/health")
async def health() -> dict:
    mock = _settings.use_mock_inference
    ready = mock or is_loaded()
    return {
        "success": True,
        "data": {
            "service": "aura-ai-worker",
            "status": "ok" if ready else "degraded",
            "modelLoaded": ready,
            "mockInference": mock,
        },
    }


@app.post("/analyze")
async def analyze(req: AnalyzeRequest) -> dict:
    await _analyze_service.analyze_and_callback(req.imageId, req.imageUrl, req.objectKey)
    return {"success": True, "data": {"imageId": req.imageId}}


@app.on_event("startup")
async def startup_event() -> None:
    global _redis_client, _consumer_task

    log("info", "worker.startup.begin", redisUrl=_settings.redis_url, queueKey=_settings.scan_queue_key)
    _redis_client = redis.Redis.from_url(
        _settings.redis_url,
        decode_responses=True,
    )
    await _redis_client.ping()
    log("info", "worker.startup.redis_ready")

    if not _settings.use_mock_inference:
        await asyncio.to_thread(load_clip, _settings.clip_model_id)

    _consumer_task = asyncio.create_task(
        consumer_loop(
            redis_client=_redis_client,
            settings=_settings,
            analyze_and_callback=_analyze_service.analyze_and_callback,
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
