import { randomUUID } from "node:crypto";

import { config } from "../config";
import { enqueueScanTask } from "../integrations/redis/queue";
import { headObjectExists, presignPutObject } from "../integrations/s3/s3";
import {
  createPendingImageLog,
  findImageLogSummaryById,
  resetImageLogForQueue,
} from "../repositories/imageLogRepository";
import { AppError } from "../utils/appError";

export type PresignUploadInput = {
  filename: string;
  contentType: string;
};

export type PresignUploadResult = {
  imageId: string;
  key: string;
  uploadUrl: string;
  imageUrl: string;
  expiresInSeconds: number;
};

export type CompleteUploadInput = {
  imageId: string;
  key: string;
  force?: boolean;
};

export type CompleteUploadResult = {
  imageId: string;
  status: "PENDING" | "SAFE" | "UNSAFE" | "ERROR";
  enqueued: boolean;
};

export const presignUpload = async (input: PresignUploadInput): Promise<PresignUploadResult> => {
  const imageId = randomUUID();
  const key = `${imageId}/${input.filename}`;

  const { uploadUrl, imageUrl } = await presignPutObject({
    key,
    contentType: input.contentType,
  });

  await createPendingImageLog({
    imageId,
    imageUrl,
    objectKey: key,
  });

  return {
    imageId,
    key,
    uploadUrl,
    imageUrl,
    expiresInSeconds: 300,
  };
};

export const completeUpload = async (input: CompleteUploadInput): Promise<CompleteUploadResult> => {
  const image = await findImageLogSummaryById(input.imageId);

  if (!image) {
    throw new AppError({
      statusCode: 404,
      code: "image_not_found",
      message: "image not found",
    });
  }

  if (input.key !== image.objectKey) {
    throw new AppError({
      statusCode: 400,
      code: "key_mismatch",
      message: "key_mismatch",
    });
  }

  const shouldEnqueue = input.force === true ? true : image.status === "PENDING";

  if (!shouldEnqueue) {
    return {
      imageId: image.id,
      status: image.status,
      enqueued: false,
    };
  }

  const exists = await headObjectExists(image.objectKey);
  if (!exists) {
    throw new AppError({
      statusCode: 409,
      code: "object_not_found",
      message: "upload not yet available in storage",
    });
  }

  if (input.force === true || image.status !== "PENDING") {
    await resetImageLogForQueue(image.id);
  }

  await enqueueScanTask(image.id, image.imageUrl, image.objectKey);

  return {
    imageId: image.id,
    status: "PENDING",
    enqueued: true,
  };
};

export const getQueueKey = (): string => config.scanQueueKey;