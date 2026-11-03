import { randomUUID } from "node:crypto";
import type { Deps } from "../deps.js";
import {
  getUserUploads,
  insertUpload,
  markUploadReady,
} from "../db/repositories/uploads.repo.js";
import type { UploadRow } from "../db/rows.js";
import { AppError } from "../lib/errors.js";

const SIGNED_UPLOAD_TTL_MS = 2 * 60 * 60 * 1000;

export async function createUpload(
  deps: Deps,
  userId: string,
  body: { filename: string; mimeType: string; sizeBytes: number },
): Promise<{
  uploadId: string;
  path: string;
  signedUrl: string;
  token: string;
  expiresAt: Date;
}> {
  const { config } = deps;
  if (!config.UPLOAD_MIME_TYPES.includes(body.mimeType)) {
    throw new AppError(422, "VALIDATION_FAILED", "Unsupported file type");
  }
  if (
    !Number.isInteger(body.sizeBytes) ||
    body.sizeBytes < 1 ||
    body.sizeBytes > config.UPLOAD_MAX_BYTES
  ) {
    throw new AppError(422, "VALIDATION_FAILED", "File size out of range");
  }
  const uploadId = randomUUID();
  const path = `${userId}/${uploadId}`;
  const bucket = config.STORAGE_BUCKET_INPUTS;
  const { signedUrl, token } = await deps.storage.createSignedUploadUrl(
    bucket,
    path,
  );
  const now = deps.clock.now();
  await insertUpload(deps.db, {
    id: uploadId,
    user_id: userId,
    bucket,
    path,
    mime_type: body.mimeType,
    size_bytes: body.sizeBytes,
    now,
  });
  return {
    uploadId,
    path,
    signedUrl,
    token,
    expiresAt: new Date(now.getTime() + SIGNED_UPLOAD_TTL_MS),
  };
}

/** Confirms each upload against the real stored object; returns rows in request order. */
export async function resolveUploads(
  deps: Deps,
  userId: string,
  ids: string[],
): Promise<UploadRow[]> {
  if (new Set(ids).size !== ids.length) {
    throw new AppError(422, "VALIDATION_FAILED", "Duplicate upload ids");
  }
  const rows = await getUserUploads(deps.db, userId, ids);
  const byId = new Map(rows.map((r) => [r.id, r]));
  const checked: Array<{
    row: UploadRow;
    info: { sizeBytes: number; mimeType: string };
  }> = [];
  for (const uploadId of ids) {
    const fail = (
      reason: "not_found" | "not_uploaded" | "mime_type" | "too_large",
    ) =>
      new AppError(422, "UPLOAD_NOT_READY", "Upload is not ready", {
        uploadId,
        reason,
      });
    const row = byId.get(uploadId);
    if (!row) throw fail("not_found");
    const info = await deps.storage.getObjectInfo(row.bucket, row.path);
    if (!info) throw fail("not_uploaded");
    if (!deps.config.UPLOAD_MIME_TYPES.includes(info.mimeType)) {
      throw fail("mime_type");
    }
    if (info.sizeBytes > deps.config.UPLOAD_MAX_BYTES) throw fail("too_large");
    checked.push({ row, info });
  }
  const now = deps.clock.now();
  const result: UploadRow[] = [];
  for (const { row, info } of checked) {
    await markUploadReady(deps.db, row.id, {
      mime_type: info.mimeType,
      size_bytes: info.sizeBytes,
      now,
    });
    result.push({
      ...row,
      status: "ready",
      mime_type: info.mimeType,
      size_bytes: String(info.sizeBytes),
      updated_at: now,
    });
  }
  return result;
}
