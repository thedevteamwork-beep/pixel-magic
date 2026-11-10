import type { Knex } from "knex";
import { T } from "../tables.js";

type Db = Knex | Knex.Transaction;

/**
 * Returns true if the event is to be processed: it is new, or it was recorded
 * but never processed (a signed delivery we couldn't parse), in which case the
 * redelivered payload replaces the stored one. False once it was processed.
 */
export async function recordPaymentEvent(
  trx: Db,
  p: {
    paddleEventId: string;
    eventType: string;
    occurredAt: Date;
    payload: unknown;
    createdAt: Date;
  },
): Promise<boolean> {
  const rows = await trx(T.paymentEvents)
    .insert({
      paddle_event_id: p.paddleEventId,
      event_type: p.eventType,
      occurred_at: p.occurredAt,
      payload: JSON.stringify(p.payload),
      created_at: p.createdAt,
    })
    .onConflict("paddle_event_id")
    .merge(["payload", "occurred_at"])
    .whereNull(`${T.paymentEvents}.processed_at`)
    .returning("id");
  return rows.length > 0;
}

export async function markEventProcessed(
  trx: Db,
  paddleEventId: string,
  at: Date,
): Promise<void> {
  await trx(T.paymentEvents)
    .where({ paddle_event_id: paddleEventId })
    .update({ processed_at: at });
}
