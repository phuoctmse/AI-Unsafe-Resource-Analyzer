import { Prisma, type ScanStatus } from "@prisma/client";

import { prisma } from "../database/prisma";

export type ImageLogSummary = {
  id: string;
  imageUrl: string;
  status: ScanStatus;
  objectKey: string;
};

export type WorkerImageUpdate = {
  status: ScanStatus;
  nsfwScore?: number | null;
  violenceScore?: number | null;
  topLabels?: Prisma.InputJsonValue;
  reasonShort?: string | null;
  modelVersion?: string | null;
  labelSetVersion?: string | null;
  thresholdsVersion?: string | null;
  scoresFull?: Prisma.InputJsonValue;
  workerVersion?: string | null;
  processedTimeMs?: number | null;
};

export const createPendingImageLog = async (params: {
  imageId: string;
  imageUrl: string;
  objectKey: string;
}): Promise<void> => {
  await prisma.imageLog.create({
    data: {
      id: params.imageId,
      imageUrl: params.imageUrl,
      objectKey: params.objectKey,
      status: "PENDING",
    },
  });
};

export const findImageLogSummaryById = async (imageId: string): Promise<ImageLogSummary | null> => {
  return prisma.imageLog.findUnique({
    where: { id: imageId },
    select: {
      id: true,
      imageUrl: true,
      status: true,
      objectKey: true,
    },
  });
};

export const listRecentImageLogs = async (limit: number) => {
  return prisma.imageLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
};

export const resetImageLogForQueue = async (imageId: string): Promise<void> => {
  await prisma.imageLog.update({
    where: { id: imageId },
    data: {
      status: "PENDING",
      nsfwScore: null,
      violenceScore: null,
      topLabels: Prisma.DbNull,
      reasonShort: null,
      modelVersion: null,
      labelSetVersion: null,
      thresholdsVersion: null,
      scoresFull: Prisma.DbNull,
      workerVersion: null,
      processedTimeMs: null,
    },
  });
};

export const updateImageLogFromWorker = async (imageId: string, update: WorkerImageUpdate) => {
  return prisma.imageLog.update({
    where: { id: imageId },
    data: {
      status: update.status,
      nsfwScore: update.nsfwScore ?? null,
      violenceScore: update.violenceScore ?? null,
      topLabels: update.topLabels === undefined ? undefined : update.topLabels,
      reasonShort: update.reasonShort === undefined ? undefined : update.reasonShort,
      modelVersion: update.modelVersion === undefined ? undefined : update.modelVersion,
      labelSetVersion: update.labelSetVersion === undefined ? undefined : update.labelSetVersion,
      thresholdsVersion: update.thresholdsVersion === undefined ? undefined : update.thresholdsVersion,
      scoresFull: update.scoresFull === undefined ? undefined : update.scoresFull,
      workerVersion: update.workerVersion === undefined ? undefined : update.workerVersion,
      processedTimeMs: update.processedTimeMs ?? null,
    },
  });
};