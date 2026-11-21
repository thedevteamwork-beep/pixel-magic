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
import { getUserUploads } from "../db/repositories/uploads.repo.js";
import type { JobOutput, ProjectRow } from "../db/rows.js";
import { AppError } from "../lib/errors.js";
import type { ModelKind } from "../models/types.js";
import { getProjectType } from "../projects/registry.js";
import { signObjects } from "./signing.js";
import { resolveUploads } from "./uploads.js";

export type ProjectView = {
  projectId: string;
  type: string;
  title: string;
  data: Record<string, unknown>;
  /** First output of the newest completed job in the project, signed; null if none yet. */
  cover: { mimeType: string; url: string; expiresAt: Date } | null;
  /** The project's own image, for a type with an upload field (a style), signed; null otherwise. */
  upload: {
    uploadId: string;
    mimeType: string;
    url: string;
    expiresAt: Date;
  } | null;
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
  const data = definition.data.parse(body.data ?? {});
  await checkProjectUpload(deps, userId, body.type, data);
  return insertProject(deps.db, {
    user_id: userId,
    type: body.type,
    title: body.title,
    data,
    now: deps.clock.now(),
  });
}

/** Parses a stored project's new `data` with its type's schema. */
function parseProjectData(type: string, data: unknown): unknown {
  const definition = getProjectType(type);
  if (!definition) throw new Error(`Unknown project type: ${type}`);
  return definition.data.parse(data);
}

/** The upload id in a project's data, for a type that has an upload field. */
function projectUploadId(type: string, data: unknown): string | undefined {
  const field = getProjectType(type)?.uploadField;
  if (!field) return undefined;
  const value = (data as Record<string, unknown>)[field];
  return typeof value === "string" ? value : undefined;
}

/**
 * A type with an upload field takes only the user's own upload whose file is
 * in storage. Anything else is 422 UPLOAD_NOT_READY.
 */
async function checkProjectUpload(
  deps: Deps,
  userId: string,
  type: string,
  data: unknown,
): Promise<void> {
  const uploadId = projectUploadId(type, data);
  if (uploadId) await resolveUploads(deps, userId, [uploadId]);
}

/** `data` replaces the whole object and is parsed again. */
export async function updateProject(
  deps: Deps,
  userId: string,
  id: string,
  body: { title?: string; data?: unknown },
): Promise<ProjectRow> {
  // The new data is parsed and its upload checked before the row is locked: the check reads through `deps.db`,
  // and needing a second connection while holding the lock can starve the pool. A type never changes.
  let data: unknown;
  if (body.data !== undefined) {
    const project = await getUserProject(deps.db, userId, id);
    if (!project) throw notFound();
    data = parseProjectData(project.type, body.data);
    await checkProjectUpload(deps, userId, project.type, data);
  }
  return deps.db.transaction(async (trx) => {
    const current = await getUserProject(trx, userId, id, { forUpdate: true });
    if (!current) throw notFound();
    const row = await updateUserProject(
      trx,
      userId,
      id,
      { title: body.title, data },
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

/**
 * Views in the order of `rows`, all one user's projects. Covers and uploads
 * are each signed with one call per bucket.
 */
export async function projectViews(
  deps: Deps,
  rows: ProjectRow[],
): Promise<ProjectView[]> {
  // 1. Covers: the first output of each project's newest completed job.
  const latest = await latestCompletedJobs(
    deps.db,
    rows.map((row) => row.id),
  );
  const coverByProject = new Map<string, JobOutput>();
  for (const job of latest) {
    const first = job.outputs?.[0];
    if (first) coverByProject.set(job.project_id!, first);
  }
  const covers = await signObjects(deps, [...coverByProject.values()]);

  // 2. Uploads: the image a project's data points at, looked up as the user's own.
  const uploadIdByProject = new Map<string, string>();
  for (const row of rows) {
    const uploadId = projectUploadId(row.type, row.data);
    if (uploadId) uploadIdByProject.set(row.id, uploadId);
  }
  const uploadRows =
    uploadIdByProject.size > 0
      ? await getUserUploads(deps.db, rows[0].user_id, [
          ...uploadIdByProject.values(),
        ])
      : [];
  const uploadById = new Map(uploadRows.map((upload) => [upload.id, upload]));
  const uploads = await signObjects(
    deps,
    uploadRows,
    deps.config.PROJECT_UPLOAD_URL_TTL_SECONDS,
  );

  return rows.map((row) => {
    const output = coverByProject.get(row.id);
    const upload = uploadById.get(uploadIdByProject.get(row.id) ?? "");
    return {
      projectId: row.id,
      type: row.type,
      title: row.title,
      data: row.data,
      cover: output
        ? {
            mimeType: output.mimeType,
            url: covers.urlFor(output),
            expiresAt: covers.expiresAt,
          }
        : null,
      upload: upload
        ? {
            uploadId: upload.id,
            mimeType: upload.mime_type,
            url: uploads.urlFor(upload),
            expiresAt: uploads.expiresAt,
          }
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
