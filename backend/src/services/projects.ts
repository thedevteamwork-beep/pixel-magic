import type { Knex } from "knex";
import type { Deps } from "../deps.js";
import {
  deleteUserProject,
  getUserProject,
  insertProject,
  latestCompletedJobs,
  unlinkProjectJobs,
  updateUserProject,
} from "../db/repositories/projects.repo.js";
import type { JobOutput, ProjectRow } from "../db/rows.js";
import { AppError } from "../lib/errors.js";
import type { ModelKind } from "../models/types.js";
import { getProjectType } from "../projects/registry.js";
import { signObjects } from "./signing.js";

export type ProjectView = {
  projectId: string;
  type: string;
  title: string;
  data: Record<string, unknown>;
  /** First output of the newest completed job in the project, signed; null if none yet. */
  cover: { mimeType: string; url: string; expiresAt: Date } | null;
  createdAt: Date;
  updatedAt: Date;
};

/** A ZodError from the type's schema becomes 422 in the error handler. */
export async function createProject(
  deps: Deps,
  userId: string,
  body: { type: string; title: string; data?: unknown },
): Promise<ProjectRow> {
  const definition = getProjectType(body.type);
  if (!definition) {
    throw new AppError(422, "VALIDATION_FAILED", "Unknown project type");
  }
  return insertProject(deps.db, {
    user_id: userId,
    type: body.type,
    title: body.title,
    data: definition.data.parse(body.data ?? {}),
    now: deps.clock.now(),
  });
}

/** Parses a stored project's new `data` with its type's schema. */
function parseProjectData(type: string, data: unknown): unknown {
  const definition = getProjectType(type);
  if (!definition) throw new Error(`Unknown project type: ${type}`);
  return definition.data.parse(data);
}

/** `data` replaces the whole object and is parsed again. */
export async function updateProject(
  deps: Deps,
  userId: string,
  id: string,
  body: { title?: string; data?: unknown },
): Promise<ProjectRow> {
  return deps.db.transaction(async (trx) => {
    const current = await getUserProject(trx, userId, id, { forUpdate: true });
    if (!current) throw notFound();
    const patch = {
      title: body.title,
      data:
        body.data === undefined
          ? undefined
          : parseProjectData(current.type, body.data),
    };
    const row = await updateUserProject(
      trx,
      userId,
      id,
      patch,
      deps.clock.now(),
    );
    return row!;
  });
}

export async function deleteProject(
  deps: Deps,
  userId: string,
  id: string,
): Promise<void> {
  await deps.db.transaction(async (trx) => {
    // Jobs first, then the project (spec 6.3: avoids a three-way deadlock).
    await unlinkProjectJobs(trx, userId, id);
    if (!(await deleteUserProject(trx, userId, id))) throw notFound();
  });
}

/** Views in the order of `rows`; the covers are signed with one call per bucket. */
export async function projectViews(
  deps: Deps,
  rows: ProjectRow[],
): Promise<ProjectView[]> {
  const latest = await latestCompletedJobs(
    deps.db,
    rows.map((row) => row.id),
  );
  const coverByProject = new Map<string, JobOutput>();
  for (const job of latest) {
    const first = job.outputs?.[0];
    if (first) coverByProject.set(job.project_id!, first);
  }
  const { urlFor, expiresAt } = await signObjects(deps, [
    ...coverByProject.values(),
  ]);

  return rows.map((row) => {
    const output = coverByProject.get(row.id);
    return {
      projectId: row.id,
      type: row.type,
      title: row.title,
      data: row.data,
      cover: output
        ? { mimeType: output.mimeType, url: urlFor(output), expiresAt }
        : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });
}

export function notFound(): AppError {
  return new AppError(404, "NOT_FOUND", "Project not found");
}

/**
 * Locks the user's project and checks its type accepts jobs of this model kind.
 * Call inside a transaction, after the profile lock (lock order: profile, then project).
 */
export async function assertProjectAcceptsModel(
  trx: Knex.Transaction,
  userId: string,
  projectId: string,
  kind: ModelKind,
): Promise<void> {
  const project = await getUserProject(trx, userId, projectId, {
    forUpdate: true,
  });
  if (!project) throw notFound();
  const definition = getProjectType(project.type);
  if (!definition) throw new Error(`Unknown project type: ${project.type}`);
  if (!definition.modelKinds.includes(kind)) {
    throw new AppError(
      422,
      "VALIDATION_FAILED",
      "This model can't be used in this project",
    );
  }
}
