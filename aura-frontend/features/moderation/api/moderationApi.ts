import type { ApiResponse, ImageLog } from "../types";

const getBackendUrl = (): string => process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

export const fetchRecentImages = async (limit = 50): Promise<ImageLog[]> => {
  const res = await fetch(`${getBackendUrl()}/images?limit=${limit}`, { cache: "no-store" });

  if (!res.ok) {
    throw new Error(`Network error: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as ApiResponse<ImageLog[]>;
  if (!json.success) {
    throw new Error(json.error);
  }

  return json.data;
};
