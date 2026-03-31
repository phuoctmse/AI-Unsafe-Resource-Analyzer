import asyncio
import os

import httpx

from ..schemas import ProcessedCallback
from ..logger import log


async def post_processed_to_backend(
    backend_url: str,
    image_id: str,
    payload: ProcessedCallback,
    *,
    max_retries: int = 3,
    timeout_s: float = 30.0,
) -> None:
    url = f"{backend_url}/internal/images/{image_id}/processed"
    internal_api_key = os.getenv("INTERNAL_API_KEY")
    if not internal_api_key:
        raise RuntimeError("INTERNAL_API_KEY is not configured")

    body = payload.model_dump(exclude_none=False)

    for attempt in range(max_retries):
        try:
            async with httpx.AsyncClient(timeout=timeout_s) as client:
                log("info", "backend.callback.sending", imageId=image_id, attempt=attempt + 1)
                resp = await client.post(
                    url,
                    json=body,
                    headers={"x-internal-key": internal_api_key},
                )

                if 200 <= resp.status_code < 300:
                    log("info", "backend.callback.succeeded", imageId=image_id, statusCode=resp.status_code)
                    return

                if (resp.status_code == 429 or resp.status_code >= 500) and attempt < max_retries - 1:
                    wait = 0.5 * (2**attempt)
                    log(
                        "warn",
                        "backend.callback.retry",
                        imageId=image_id,
                        statusCode=resp.status_code,
                        waitSec=wait,
                    )
                    await asyncio.sleep(wait)
                    continue

                resp.raise_for_status()
        except httpx.RequestError as e:
            if attempt < max_retries - 1:
                wait = 0.5 * (2**attempt)
                log("warn", "backend.callback.transport_retry", imageId=image_id, error=str(e), waitSec=wait)
                await asyncio.sleep(wait)
                continue
            log(
                "error",
                "backend.callback.failed",
                imageId=image_id,
                error=str(e),
            )
            raise
