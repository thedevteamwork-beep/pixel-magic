import type { Knex } from "knex";
import { T } from "../tables.js";

type Db = Knex | Knex.Transaction;

/** Returns true when the event is new (false for a redelivery). */
export async function recordProviderEvent(
  db: Db,
  p: {
    provider: "fal";
    requestId: string;
    status: string;
    payload: unknown;
    now: Date;
  },
): Promise<boolean> {
  const rows = await db(T.providerEvents)
    .insert({
      provider: p.provider,
      request_id: p.requestId,
      status: p.status,
      payload: JSON.stringify(p.payload ?? null),
      received_at: p.now,
    })
    .onConflict(["provider", "request_id"])
    .ignore()
    .returning("id");
  return rows.length > 0;
}
