import asyncio
import json
from typing import Awaitable, Callable

import redis.asyncio as redis

from .config import Settings
from .logger import log


async def consumer_loop(
    redis_client: redis.Redis,
    settings: Settings,
    analyze_and_callback: Callable[[str, str, str], Awaitable[None]],
) -> None:
    while True:
        # BLPOP blocks until an item is available.
        popped = await redis_client.blpop(settings.scan_queue_key)
        if not popped:
            continue

        _, raw_value = popped
        try:
            payload = json.loads(raw_value)
            image_id = payload["imageId"]
            image_url = payload["imageUrl"]
            object_key = payload.get("objectKey") or ""
            log("info", "queue.dequeued", imageId=image_id, queueKey=settings.scan_queue_key)
            await analyze_and_callback(image_id, image_url, object_key)
        except asyncio.CancelledError:
            raise
        except Exception as e:
            # Skeleton mode: log and keep going.
            # Phase 4 will add structured retries + DLQ.
            log("error", "queue.item_failed", queueKey=settings.scan_queue_key, error=str(e))

