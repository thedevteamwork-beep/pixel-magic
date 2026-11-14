import { z } from "zod";
import { AppError } from "../../lib/errors.js";

/** Where a page ends: the sort timestamp and id of its last row. */
export type PageCursor = { at: Date; id: string };

const payload = z.object({
  t: z.string().datetime(),
  id: z.string().uuid(),
});

/** The opaque page cursor: base64url of `{"t": <timestamp ISO>, "id": <row id>}`. */
export function encodeCursor(c: PageCursor): string {
  const json = JSON.stringify({ t: c.at.toISOString(), id: c.id });
  return Buffer.from(json).toString("base64url");
}

/** Throws 422 for anything that is not a cursor we issued. */
export function decodeCursor(cursor: string): PageCursor {
  try {
    const json = Buffer.from(cursor, "base64url").toString("utf8");
    const { t, id } = payload.parse(JSON.parse(json));
    return { at: new Date(t), id };
  } catch {
    throw new AppError(422, "VALIDATION_FAILED", "Invalid cursor");
  }
}
