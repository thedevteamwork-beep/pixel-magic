import type { Knex } from "knex";
import type { PageCursor } from "../../services/jobs/cursor.js";
import type { JobRow, ProjectRow } from "../rows.js";
import { T } from "../tables.js";

type Db = Knex | Knex.Transaction;

export async function insertProject(
  db: Db,
  p: {
    user_id: string;
    type: string;
    title: string;
    data: unknown;
    now: Date;
  },
): Promise<ProjectRow> {
  const rows: ProjectRow[] = await db(T.projects)
    .insert({
      user_id: p.user_id,
      type: p.type,
      title: p.title,
      data: JSON.stringify(p.data),
      created_at: p.now,
      updated_at: p.now,
    })
    .returning("*");
  return rows[0];
}

export async function getUserProject(
  db: Db,
  userId: string,
  id: string,
  opts: { forUpdate?: boolean } = {},
): Promise<ProjectRow | null> {
  const query = db(T.projects).where({ id, user_id: userId });
  if (opts.forUpdate) query.forUpdate();
  return (await query.first()) ?? null;
}

/** One page of a user's projects, most recently updated first. `before` is the last row of the previous page. */
export async function listUserProjects(
  db: Db,
  userId: string,
  p: { type?: string; limit: number; before?: PageCursor },
): Promise<ProjectRow[]> {
  const query = db(T.projects)
    .where("user_id", userId)
    .orderBy([
      { column: "updated_at", order: "desc" },
      { column: "id", order: "desc" },
    ])
    .limit(p.limit);
  if (p.type) query.where("type", p.type);
  if (p.before) {
    query.whereRaw("(updated_at, id) < (?, ?)", [p.before.at, p.before.id]);
  }
  return query;
}

/** Null when the user has no such project. Always sets updated_at. */
export async function updateUserProject(
  db: Db,
  userId: string,
  id: string,
  patch: { title?: string; data?: unknown },
  now: Date,
): Promise<ProjectRow | null> {
  const values: Record<string, unknown> = { updated_at: now };
  if (patch.title !== undefined) values.title = patch.title;
  if (patch.data !== undefined) values.data = JSON.stringify(patch.data);
  const rows: ProjectRow[] = await db(T.projects)
    .where({ id, user_id: userId })
    .update(values)
    .returning("*");
  return rows[0] ?? null;
}

/** Detaches the user's jobs from the project; run before deleting the project (lock order). */
export async function unlinkProjectJobs(
  trx: Knex.Transaction,
  userId: string,
  projectId: string,
): Promise<void> {
  await trx(T.jobs)
    .where({ user_id: userId, project_id: projectId })
    .update({ project_id: null });
}

/** True when a project was deleted. */
export async function deleteUserProject(
  trx: Knex.Transaction,
  userId: string,
  id: string,
): Promise<boolean> {
  const count = await trx(T.projects).where({ id, user_id: userId }).delete();
  return count > 0;
}

/** Moves the project to the top of the list. */
export async function touchProject(
  trx: Knex.Transaction,
  id: string,
  now: Date,
): Promise<void> {
  await trx(T.projects).where("id", id).update({ updated_at: now });
}

/** The newest completed job (by completed_at) of each given project; none for projects without one. */
export async function latestCompletedJobs(
  db: Db,
  projectIds: string[],
): Promise<JobRow[]> {
  if (projectIds.length === 0) return [];
  const result = await db.raw(
    `SELECT DISTINCT ON (project_id) *
       FROM ${T.jobs}
      WHERE project_id = ANY(?) AND status = 'completed'
      ORDER BY project_id, completed_at DESC, id DESC`,
    [projectIds],
  );
  return result.rows;
}
