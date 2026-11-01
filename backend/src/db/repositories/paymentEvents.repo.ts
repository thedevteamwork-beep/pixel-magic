import type { Knex } from "knex";
import { T } from "../tables.js";

type Db = Knex | Knex.Transaction;

/** Returns true if the event is new, false if its id was already recorded. */
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
    .ignore()
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
