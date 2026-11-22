import { randomUUID } from "node:crypto";
import type { Deps } from "../deps.js";
import {
  getUserUploads,
  insertUpload,
  markUploadReady,
} from "../db/repositories/uploads.repo.js";
import type { UploadRow } from "../db/rows.js";
import { AppError } from "../lib/errors.js";
import { VIDEO_HEADER_BYTES, videoDuration } from "../lib/videoDuration.js";
import {
  IMAGE_HEADER_BYTES,
  imageSize,
  type ImageSize,
} from "../lib/imageSize.js";

const SIGNED_UPLOAD_TTL_MS = 2 * 60 * 60 * 1000;

/** The largest clip motion control takes, in seconds (fal's limit with the video's orientation). */
export const MAX_VIDEO_SECONDS = 30;

/** The size limit for a file of this type, or null when it can't be uploaded at all. */
function uploadLimit(config: Deps["config"], mimeType: string): number | null {
  if (config.UPLOAD_MIME_TYPES.includes(mimeType))
    return config.UPLOAD_MAX_BYTES;
  if (config.UPLOAD_VIDEO_MIME_TYPES.includes(mimeType))
    return config.UPLOAD_VIDEO_MAX_BYTES;
  return null;
}

/** The longest image side accepted where size matters (upscaling). */
export const MAX_IMAGE_SIDE = 16_384;

export async function createUpload(
  deps: Deps,
  userId: string,
  body: { filename: string; mimeType: string; sizeBytes: number },
): Promise<{
  uploadId: string;
  bucket: string;
  path: string;
  signedUrl: string;
  token: string;
  expiresAt: Date;
}> {
  const { config } = deps;
  const limit = uploadLimit(config, body.mimeType);
  if (limit === null) {
    throw new AppError(422, "VALIDATION_FAILED", "Unsupported file type");
  }
  if (
    !Number.isInteger(body.sizeBytes) ||
    body.sizeBytes < 1 ||
    body.sizeBytes > limit
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
    bucket,
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
    const limit = uploadLimit(deps.config, info.mimeType);
    if (limit === null) throw fail("mime_type");
    if (info.sizeBytes > limit) throw fail("too_large");
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

/**
 * The pixel size of a confirmed image upload, read from its header in
 * storage. 422 when it can't be read or is too large to work with.
 */
export async function measureUpload(
  deps: Deps,
  upload: UploadRow,
): Promise<ImageSize> {
  const fail = (reason: "unreadable" | "too_large") =>
    new AppError(422, "UPLOAD_NOT_READY", "Upload is not ready", {
      uploadId: upload.id,
      reason,
    });
  const bytes = await deps.storage.readObjectStart(
    upload.bucket,
    upload.path,
    IMAGE_HEADER_BYTES,
  );
  const size = bytes && imageSize(bytes);
  if (!size) throw fail("unreadable");
  if (size.width > MAX_IMAGE_SIDE || size.height > MAX_IMAGE_SIDE) {
    throw fail("too_large");
  }
  return size;
}

/**
 * The length in seconds of a confirmed clip upload, read from its header in
 * storage (at the start or the end of the file). 422 when it can't be read
 * (export it as MP4) or is longer than MAX_VIDEO_SECONDS.
 */
export async function measureClip(
  deps: Deps,
  upload: UploadRow,
): Promise<number> {
  const fail = (reason: "unreadable" | "too_long") =>
    new AppError(422, "UPLOAD_NOT_READY", "Upload is not ready", {
      uploadId: upload.id,
      reason,
    });
  const start = await deps.storage.readObjectStart(
    upload.bucket,
    upload.path,
    VIDEO_HEADER_BYTES,
  );
  let seconds = start && videoDuration(start);
  if (!seconds) {
    const end = await deps.storage.readObjectEnd(
      upload.bucket,
      upload.path,
      VIDEO_HEADER_BYTES,
    );
    seconds = end && videoDuration(end);
  }
  if (!seconds) throw fail("unreadable");
  // A hair over the limit (a 30.02 s export) still counts as the limit.
  if (seconds > MAX_VIDEO_SECONDS + 0.5) throw fail("too_long");
  return Math.min(seconds, MAX_VIDEO_SECONDS);
}
