from __future__ import annotations

import asyncio
import time
from typing import Literal

from ..pipeline.backend_client import post_processed_to_backend
from ..inference.clip_engine import run_clip_scores
from ..config import Settings
from ..storage.image_io import decode_pil_rgb, fetch_image_bytes_http
from ..inference.labeling import build_reason_short, top_k_labels
from ..logger import log
from ..inference.mock_inference import aggregate_nsfw_violence, deterministic_label_scores, max_unsafe_score
from ..storage.s3_fetch import fetch_object_bytes
from ..schemas import ProcessedCallback


class AnalyzeService:
    def __init__(self, settings: Settings, inference_sem: asyncio.Semaphore) -> None:
        self._settings = settings
        self._inference_sem = inference_sem

    @staticmethod
    def _decide_status(scores: dict[str, float], threshold: float) -> Literal["SAFE", "UNSAFE", "ERROR"]:
        return "UNSAFE" if max_unsafe_score(scores) >= threshold else "SAFE"

    async def _load_image_bytes(self, image_url: str, object_key: str) -> bytes:
        if object_key:
            return await asyncio.to_thread(
                fetch_object_bytes,
                bucket=self._settings.s3_bucket,
                key=object_key,
                endpoint=self._settings.s3_endpoint,
                region=self._settings.s3_region,
                access_key=self._settings.s3_access_key,
                secret_key=self._settings.s3_secret_key,
            )

        log("warn", "analyze.no_object_key", fallback="http_get")
        return await fetch_image_bytes_http(image_url, timeout_s=self._settings.download_timeout_s)

    async def _run_inference_pipeline(self, image_url: str, object_key: str) -> dict[str, float]:
        raw = await self._load_image_bytes(image_url, object_key)
        image = await asyncio.to_thread(decode_pil_rgb, raw, self._settings.max_image_side)

        if self._settings.use_mock_inference:
            return deterministic_label_scores(image_url)

        return await asyncio.to_thread(run_clip_scores, image)

    async def analyze_and_callback(self, image_id: str, image_url: str, object_key: str) -> None:
        start = time.perf_counter()
        log(
            "info",
            "analyze.started",
            imageId=image_id,
            objectKeyPresent=bool(object_key),
            mock=self._settings.use_mock_inference,
        )

        async with self._inference_sem:
            try:
                raw_scores = await asyncio.wait_for(
                    self._run_inference_pipeline(image_url, object_key),
                    timeout=self._settings.inference_timeout_s,
                )

                nsfw_score, violence_score = aggregate_nsfw_violence(raw_scores)
                status = self._decide_status(raw_scores, self._settings.unsafe_threshold)
                top = top_k_labels(raw_scores, k=3)
                reason = build_reason_short(top, status)
                processed_time_ms = int((time.perf_counter() - start) * 1000)

                await post_processed_to_backend(
                    self._settings.backend_url,
                    image_id,
                    ProcessedCallback(
                        status=status,
                        nsfwScore=nsfw_score,
                        violenceScore=violence_score,
                        topLabels=top,
                        reasonShort=reason,
                        modelVersion=self._settings.model_version,
                        labelSetVersion=self._settings.label_set_version,
                        thresholdsVersion=self._settings.thresholds_version,
                        scoresFull=raw_scores,
                        workerVersion=self._settings.worker_version,
                        processedTimeMs=processed_time_ms,
                    ),
                    max_retries=self._settings.backend_callback_retries,
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
                    self._settings.backend_url,
                    image_id,
                    ProcessedCallback(
                        status="ERROR",
                        reasonShort=f"Inference failed: {msg}",
                        modelVersion=self._settings.model_version,
                        labelSetVersion=self._settings.label_set_version,
                        thresholdsVersion=self._settings.thresholds_version,
                        workerVersion=self._settings.worker_version,
                        processedTimeMs=processed_time_ms,
                    ),
                    max_retries=self._settings.backend_callback_retries,
                )
