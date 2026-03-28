export type ScanStatus = "PENDING" | "SAFE" | "UNSAFE" | "ERROR";

export type TopLabel = {
  label: string;
  score: number;
};

export type ImageLog = {
  id: string;
  imageUrl: string;
  status: ScanStatus;
  nsfwScore: number | null;
  violenceScore: number | null;
  topLabels?: TopLabel[] | null;
  reasonShort?: string | null;
  modelVersion?: string | null;
  labelSetVersion?: string | null;
  thresholdsVersion?: string | null;
  scoresFull?: Record<string, number> | null;
  workerVersion?: string | null;
  processedTimeMs: number | null;
  createdAt: string;
  objectKey?: string;
};

export type ApiOk<T> = { success: true; data: T };
export type ApiErr = { success: false; error: string };
export type ApiResponse<T> = ApiOk<T> | ApiErr;

