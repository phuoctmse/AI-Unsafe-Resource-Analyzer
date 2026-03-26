import os

import httpx

from .schemas import ProcessedCallback
from .logger import log


async def post_processed_to_backend(
    backend_url: str,
    image_id: str,
    payload: ProcessedCallback,
) -> None:
    url = f"{backend_url}/internal/images/{image_id}/processed"
    internal_api_key = os.getenv("INTERNAL_API_KEY")
    if not internal_api_key:
        raise RuntimeError("INTERNAL_API_KEY is not configured")
    async with httpx.AsyncClient(timeout=10) as client:
        log("info", "backend.callback.sending", imageId=image_id)
        resp = await client.post(
            url,
            json=payload.model_dump(),
            headers={"x-internal-key": internal_api_key},
        )
        try:
            resp.raise_for_status()
        except Exception as e:
            log(
                "error",
                "backend.callback.failed",
                imageId=image_id,
                statusCode=resp.status_code,
                error=str(e),
            )
            raise
        log("info", "backend.callback.succeeded", imageId=image_id, statusCode=resp.status_code)

