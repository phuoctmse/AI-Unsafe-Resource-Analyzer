import asyncio
import time
from typing import Literal

import redis.asyncio as redis
from fastapi import FastAPI
from dotenv import load_dotenv

from .backend_client import post_processed_to_backend
from .clip_engine import is_loaded, load_clip, run_clip_scores
from .config import load_settings
from .image_io import decode_pil_rgb, fetch_image_bytes_http
from .labeling import build_reason_short, top_k_labels
from .logger import log
from .mock_inference import (
    aggregate_nsfw_violence,
    deterministic_label_scores,
    max_unsafe_score,
)
from .queue_consumer import consumer_loop
from .schemas import AnalyzeRequest, ProcessedCallback
from .s3_fetch import fetch_object_bytes

load_dotenv()

app = FastAPI(title="Aura AI Worker")

_settings = load_settings()
_redis_client: redis.Redis | None = None
_consumer_task: asyncio.Task[None] | None = None
_inference_sem: asyncio.Semaphore = asyncio.Semaphore(_settings.max_concurrent_inference)


def _decide_status(scores: dict[str, float], threshold: float) -> Literal["SAFE", "UNSAFE", "ERROR"]:
    return "UNSAFE" if max_unsafe_score(scores) >= threshold else "SAFE"


async def _load_image_bytes(image_url: str, object_key: str) -> bytes:
    if object_key:
        return await asyncio.to_thread(
            fetch_object_bytes,
            bucket=_settings.s3_bucket,
            key=object_key,
            endpoint=_settings.s3_endpoint,
            region=_settings.s3_region,
            access_key=_settings.s3_access_key,
            secret_key=_settings.s3_secret_key,
        )
    log("warn", "analyze.no_object_key", fallback="http_get")
    return await fetch_image_bytes_http(image_url, timeout_s=_settings.download_timeout_s)


async def _run_inference_pipeline(image_id: str, image_url: str, object_key: str) -> dict[str, float]:
    raw = await _load_image_bytes(image_url, object_key)
    image = await asyncio.to_thread(decode_pil_rgb, raw, _settings.max_image_side)

    if _settings.use_mock_inference:
        return deterministic_label_scores(image_url)

    return await asyncio.to_thread(run_clip_scores, image)


async def analyze_and_callback(image_id: str, image_url: str, object_key: str) -> None:
    start = time.perf_counter()
    log(
        "info",
        "analyze.started",
        imageId=image_id,
        objectKeyPresent=bool(object_key),
        mock=_settings.use_mock_inference,
    )

    async with _inference_sem:
        try:
            raw_scores = await asyncio.wait_for(
                _run_inference_pipeline(image_id, image_url, object_key),
                timeout=_settings.inference_timeout_s,
            )
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
                max_retries=_settings.backend_callback_retries,
            )
            log(
                "info",
                "analyze.completed",
                imageId=image_id,
                status=status,
                processedTimeMs=processed_time_ms,
            )
        except Exception as e:
            processed_time_ms = int((time.perf_counter() - start) * 1000)
            msg = str(e)[:500]
            log("error", "analyze.failed", imageId=image_id, error=msg, processedTimeMs=processed_time_ms)
            await post_processed_to_backend(
                _settings.backend_url,
                image_id,
                ProcessedCallback(
                    status="ERROR",
                    reasonShort=f"Inference failed: {msg}",
                    modelVersion=_settings.model_version,
                    labelSetVersion=_settings.label_set_version,
                    thresholdsVersion=_settings.thresholds_version,
                    workerVersion=_settings.worker_version,
                    processedTimeMs=processed_time_ms,
                ),
                max_retries=_settings.backend_callback_retries,
            )


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
    await _redis_client.ping()
    log("info", "worker.startup.redis_ready")

    if not _settings.use_mock_inference:
        await asyncio.to_thread(load_clip, _settings.clip_model_id)

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
