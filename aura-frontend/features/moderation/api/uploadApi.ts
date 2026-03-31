import type { ApiResponse } from "../types";

const getBackendUrl = (): string => process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

type PresignResult = {
  imageId: string;
  key: string;
  uploadUrl: string;
  imageUrl: string;
  expiresInSeconds: number;
};

const presign = async (file: File): Promise<PresignResult> => {
  const res = await fetch(`${getBackendUrl()}/uploads/presign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: file.name, contentType: file.type }),
  });
  const json = (await res.json()) as ApiResponse<PresignResult>;
  if (!json.success) throw new Error(json.error);
  return json.data;
};

const putToStorage = async (uploadUrl: string, file: File): Promise<void> => {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Storage upload failed (${res.status}): ${text}`);
  }
};

const complete = async (imageId: string, key: string): Promise<void> => {
  const res = await fetch(`${getBackendUrl()}/uploads/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageId, key }),
  });
  const json = (await res.json()) as ApiResponse<unknown>;
  if (!json.success) throw new Error(json.error);
};

// Full 3-step flow: presign → PUT to MinIO → complete (triggers scan)
export const uploadAndScan = async (
  file: File,
  onProgress?: (step: "presigning" | "uploading" | "queuing") => void,
): Promise<{ imageId: string }> => {
  onProgress?.("presigning");
  const { imageId, key, uploadUrl } = await presign(file);

  onProgress?.("uploading");
  await putToStorage(uploadUrl, file);

  onProgress?.("queuing");
  await complete(imageId, key);

  return { imageId };
};
