import { type ScanStatus } from "@prisma/client";

import {
  type WorkerImageUpdate,
  updateImageLogFromWorker,
} from "../repositories/imageLogRepository";
import { AppError } from "../utils/appError";

export type ProcessWorkerCallbackInput = WorkerImageUpdate & {
  status: ScanStatus;
};

export const allowedScanStatuses: ScanStatus[] = ["PENDING", "SAFE", "UNSAFE", "ERROR"];

export const processWorkerCallback = async (imageId: string, payload: ProcessWorkerCallbackInput) => {
  if (!allowedScanStatuses.includes(payload.status)) {
    throw new AppError({
      statusCode: 400,
      code: "invalid_status",
      message: "status must be one of PENDING|SAFE|UNSAFE|ERROR",
    });
  }

  return updateImageLogFromWorker(imageId, payload);
};