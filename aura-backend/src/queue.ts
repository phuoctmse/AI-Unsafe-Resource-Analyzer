import Redis from "ioredis";

import { config } from "./config";
import { log } from "./logger";

export const redis = new Redis(config.redisUrl, { lazyConnect: true });

export const enqueueScanTask = async (imageId: string, imageUrl: string): Promise<void> => {
  // ioredis will auto-connect on first command with lazyConnect=true
  await redis.rpush(
    config.scanQueueKey,
    JSON.stringify({ imageId, imageUrl }),
  );

  log("info", "queue.enqueued", {
    imageId,
    queueKey: config.scanQueueKey,
  });
};

