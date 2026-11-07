import { z } from "zod";
import { AppError } from "../../lib/errors.js";

export type JobCursor = { createdAt: Date; id: string };

const payload = z.object({
  t: z.string().datetime(),
  id: z.string().uuid(),
});

/** The opaque page cursor: base64url of `{"t": <created_at ISO>, "id": <job id>}`. */
export function encodeCursor(job: JobCursor): string {
  const json = JSON.stringify({ t: job.createdAt.toISOString(), id: job.id });
  return Buffer.from(json).toString("base64url");
}

/** Throws 422 for anything that is not a cursor we issued. */
export function decodeCursor(cursor: string): JobCursor {
  try {
    const json = Buffer.from(cursor, "base64url").toString("utf8");
    const { t, id } = payload.parse(JSON.parse(json));
    return { createdAt: new Date(t), id };
  } catch {
    throw new AppError(422, "VALIDATION_FAILED", "Invalid cursor");
  }
}
