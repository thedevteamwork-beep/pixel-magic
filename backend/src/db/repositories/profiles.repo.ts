import type { Knex } from "knex";
import type { ProfileRow } from "../rows.js";
import { T } from "../tables.js";

type Db = Knex | Knex.Transaction;

export async function upsertProfile(
  db: Db,
  p: { id: string; email: string | null },
): Promise<void> {
  await db(T.profiles)
    .insert({ id: p.id, email: p.email })
    .onConflict("id")
    .ignore();
}

export async function getProfile(
  db: Db,
  id: string,
): Promise<ProfileRow | null> {
  return (await db(T.profiles).where("id", id).first()) ?? null;
}

/**
 * Per-user lock; always taken before any of the user's subscription or grant
 * rows. NO KEY UPDATE serializes lockers but doesn't conflict with the
 * FOR KEY SHARE that FK checks (jobs.user_id, subscriptions.user_id, ...)
 * take on the profile.
 */
export async function lockProfile(
  trx: Knex.Transaction,
  id: string,
): Promise<ProfileRow> {
  const res: { rows: ProfileRow[] } = await trx.raw(
    "SELECT * FROM ?? WHERE id = ? FOR NO KEY UPDATE",
    [T.profiles, id],
  );
  const row = res.rows[0];
  if (!row) throw new Error(`Profile not found: ${id}`);
  return row;
}

export async function setProfileEmail(
  db: Db,
  id: string,
  email: string,
): Promise<void> {
  await db(T.profiles).where("id", id).update({ email });
}

export async function setPaddleCustomerId(
  db: Db,
  id: string,
  customerId: string,
): Promise<void> {
  await db(T.profiles)
    .where("id", id)
    .update({ paddle_customer_id: customerId });
}
