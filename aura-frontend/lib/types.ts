export type ScanStatus = "PENDING" | "SAFE" | "UNSAFE" | "ERROR";

export type ImageLog = {
  id: string;
  imageUrl: string;
  status: ScanStatus;
  nsfwScore: number | null;
  violenceScore: number | null;
  processedTimeMs: number | null;
  createdAt: string;
  objectKey?: string;
};

export type ApiOk<T> = { success: true; data: T };
export type ApiErr = { success: false; error: string };
export type ApiResponse<T> = ApiOk<T> | ApiErr;

