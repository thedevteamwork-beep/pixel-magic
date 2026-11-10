import type { Knex } from "knex";
import type { UploadRow } from "../rows.js";
import { T } from "../tables.js";

type Db = Knex | Knex.Transaction;

export async function insertUpload(
  db: Db,
  p: {
    id: string;
    user_id: string;
    bucket: string;
    path: string;
    mime_type: string;
    size_bytes: number;
    now: Date;
  },
): Promise<UploadRow> {
  const { now, ...fields } = p;
  const [row] = await db(T.uploads)
    .insert({ ...fields, status: "pending", created_at: now, updated_at: now })
    .returning("*");
  return row as UploadRow;
}

export async function getUserUploads(
  db: Db,
  userId: string,
  ids: string[],
): Promise<UploadRow[]> {
  return db(T.uploads).where({ user_id: userId }).whereIn("id", ids);
}

export async function markUploadReady(
  db: Db,
  id: string,
  p: { mime_type: string; size_bytes: number; now: Date },
): Promise<void> {
  await db(T.uploads).where({ id }).update({
    status: "ready",
    mime_type: p.mime_type,
    size_bytes: p.size_bytes,
    updated_at: p.now,
  });
}
