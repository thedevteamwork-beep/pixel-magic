import type { Knex } from "knex";
import type { JobRow, JobStatus } from "../rows.js";
import { ACTIVE_JOB_STATUSES } from "../rows.js";
import { T } from "../tables.js";

type Db = Knex | Knex.Transaction;

export type NewJob = {
  user_id: string;
  model_key: string;
  input: unknown;
  upload_ids: string[];
  credit_cost: number;
  idempotency_key: string;
  request_hash: string;
  now: Date;
};

/** Returns null when (user_id, idempotency_key) already exists. */
export async function insertJob(trx: Db, j: NewJob): Promise<JobRow | null> {
  const { now, input, ...fields } = j;
  const rows: JobRow[] = await trx(T.jobs)
    .insert({
      ...fields,
      input: JSON.stringify(input),
      status: "queued",
      created_at: now,
      updated_at: now,
    })
    .onConflict(["user_id", "idempotency_key"])
    .ignore()
    .returning("*");
  return rows[0] ?? null;
}

export async function getJobByIdempotencyKey(
  db: Db,
  userId: string,
  key: string,
): Promise<JobRow | null> {
  return (
    (await db(T.jobs)
      .where({ user_id: userId, idempotency_key: key })
      .first()) ?? null
  );
}

export async function getJob(db: Db, id: string): Promise<JobRow | null> {
  return (await db(T.jobs).where("id", id).first()) ?? null;
}

export async function getUserJob(
  db: Db,
  userId: string,
  id: string,
): Promise<JobRow | null> {
  return (await db(T.jobs).where({ id, user_id: userId }).first()) ?? null;
}

export async function getJobByFalRequestId(
  db: Db,
  requestId: string,
): Promise<JobRow | null> {
  return (await db(T.jobs).where("fal_request_id", requestId).first()) ?? null;
}

export async function countActiveJobs(db: Db, userId: string): Promise<number> {
  const r = await db(T.jobs)
    .where("user_id", userId)
    .whereIn("status", ACTIVE_JOB_STATUSES)
    .count({ n: "*" })
    .first();
  return Number(r?.n ?? 0);
}

/** Compare-and-set on status; always sets updated_at. Null when not applied. */
export async function transitionJob(
  db: Db,
  id: string,
  from: JobStatus[],
  patch: Partial<JobRow> & { status: JobStatus },
  now: Date,
): Promise<JobRow | null> {
  const values: Record<string, unknown> = { ...patch, updated_at: now };
  if (patch.outputs !== undefined && patch.outputs !== null) {
    values.outputs = JSON.stringify(patch.outputs);
  }
  const rows: JobRow[] = await db(T.jobs)
    .where("id", id)
    .whereIn("status", from)
    .update(values)
    .returning("*");
  return rows[0] ?? null;
}

export async function claimJob(
  db: Db,
  id: string,
  p: {
    from: JobStatus;
    orExpiredLease: JobStatus;
    to: JobStatus;
    leaseUntil: Date;
    now: Date;
    incrementAttempts: boolean;
  },
): Promise<JobRow | null> {
  const update: Record<string, unknown> = {
    status: p.to,
    lease_expires_at: p.leaseUntil,
    updated_at: p.now,
  };
  if (p.incrementAttempts) update.attempts = db.raw("attempts + 1");
  const rows: JobRow[] = await db(T.jobs)
    .where("id", id)
    .andWhere((q) =>
      q
        .where("status", p.from)
        .orWhere((q2) =>
          q2
            .where("status", p.orExpiredLease)
            .andWhere("lease_expires_at", "<", p.now),
        ),
    )
    .update(update)
    .returning("*");
  return rows[0] ?? null;
}
