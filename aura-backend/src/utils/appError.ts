import type { ContentfulStatusCode } from "hono/utils/http-status";

export class AppError extends Error {
  public readonly statusCode: ContentfulStatusCode;

  public readonly code: string;

  public readonly details?: string;

  constructor(params: {
    statusCode: ContentfulStatusCode;
    code: string;
    message: string;
    details?: string;
  }) {
    super(params.message);
    this.name = "AppError";
    this.statusCode = params.statusCode;
    this.code = params.code;
    this.details = params.details;
  }
}

export const isAppError = (error: unknown): error is AppError => error instanceof AppError;