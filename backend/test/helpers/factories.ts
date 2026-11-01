import { randomUUID } from "node:crypto";
import type { Knex } from "knex";
import { insertGrant as insertGrantRepo } from "../../src/db/repositories/credits.repo.js";
import type { GrantRow, JobRow, SubscriptionRow } from "../../src/db/rows.js";
import { T } from "../../src/db/tables.js";

export async function insertProfile(
  db: Knex,
  id: string = randomUUID(),
): Promise<string> {
  await db(T.profiles).insert({ id });
  return id;
}

export async function insertSubscriptionRow(
  db: Knex,
  partial: Partial<SubscriptionRow> & { user_id: string; plan_id: string },
): Promise<SubscriptionRow> {
  const start =
    partial.current_period_start ?? new Date("2026-03-10T12:00:00Z");
  const [row] = await db(T.subscriptions)
    .insert({
      next_plan_id: partial.plan_id,
      status: "active",
      active: false,
      current_period_start: start,
      current_period_end:
        partial.current_period_end ??
        new Date(start.getTime() + 30 * 86_400_000),
      ...partial,
    })
    .returning("*");
  return row;
}

export async function insertGrant(
  db: Knex,
  partial: Partial<Omit<GrantRow, "id">> & { user_id: string },
): Promise<GrantRow> {
  const now = new Date("2026-03-10T12:00:00Z");
  const g = await insertGrantRepo(db, {
    user_id: partial.user_id,
    kind: partial.kind ?? "manual",
    subscription_id: partial.subscription_id ?? undefined,
    customer_addon_id: partial.customer_addon_id ?? undefined,
    total: partial.total ?? 100,
    starts_at: partial.starts_at ?? now,
    expires_at: partial.expires_at ?? new Date(now.getTime() + 30 * 86_400_000),
    created_at: partial.created_at ?? now,
  });
  return g;
}

export async function insertJob(db: Knex, userId: string): Promise<JobRow> {
  const [row] = await db(T.jobs)
    .insert({
      user_id: userId,
      model_key: "test",
      input: {},
      credit_cost: 0,
      status: "queued",
      idempotency_key: randomUUID(),
      request_hash: "x",
    })
    .returning("*");
  return row;
}
