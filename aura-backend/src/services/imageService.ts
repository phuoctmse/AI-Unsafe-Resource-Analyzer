import { listRecentImageLogs } from "../repositories/imageLogRepository";

export const listImages = async (limit: number) => {
  return listRecentImageLogs(limit);
};