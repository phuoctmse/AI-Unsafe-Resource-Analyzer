import httpx

from .schemas import ProcessedCallback


async def post_processed_to_backend(
    backend_url: str,
    image_id: str,
    payload: ProcessedCallback,
) -> None:
    url = f"{backend_url}/internal/images/{image_id}/processed"
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(url, json=payload.model_dump())
        resp.raise_for_status()

