import type { ErrorRequestHandler, RequestHandler } from "express";
import type winston from "winston";
import { ZodError } from "zod";
import { AppError, type ErrorCode } from "../../lib/errors.js";

export const notFound: RequestHandler = (_req, _res, next) => {
  next(new AppError(404, "NOT_FOUND", "Not found"));
};

function bodyParserStatus(err: unknown): number | null {
  if (typeof err !== "object" || err === null) return null;
  const e = err as { status?: unknown; type?: unknown };
  return typeof e.type === "string" &&
    typeof e.status === "number" &&
    e.status >= 400 &&
    e.status < 500
    ? e.status
    : null;
}

export function errorHandler(logger: winston.Logger): ErrorRequestHandler {
  const send = (
    res: Parameters<ErrorRequestHandler>[2],
    status: number,
    code: ErrorCode,
    message: string,
    meta?: unknown,
  ) => {
    res
      .status(status)
      .json({ message, status, code, ...(meta === undefined ? {} : { meta }) });
  };
  return (err, _req, res, next) => {
    if (res.headersSent) {
      next(err);
      return;
    }
    if (err instanceof AppError) {
      send(res, err.status, err.code, err.message, err.meta);
      return;
    }
    if (err instanceof ZodError) {
      send(res, 422, "VALIDATION_FAILED", "Validation failed", err.issues);
      return;
    }
    const status = bodyParserStatus(err);
    if (status !== null) {
      send(res, status, "VALIDATION_FAILED", (err as Error).message);
      return;
    }
    logger.error("Unhandled error", { err });
    send(res, 500, "INTERNAL", "Internal error");
  };
}
