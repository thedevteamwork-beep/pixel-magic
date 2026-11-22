import { buildInput } from "@/lib/generate/formFromSchema";
import type { JobView, PublicModel, UploadResponse } from "@/lib/api/types";

type SubmitParams = {
  api: {
    post<T>(path: string, body: unknown, opts?: { idempotencyKey?: string }): Promise<T>;
  };
  uploadFile: (upload: UploadResponse, file: File) => Promise<void>;
  model: PublicModel;
  prompt: string;
  values: Record<string, unknown>;
  /** Images for the model's image field, in order. */
  files?: readonly File[];
  idempotencyKey: string;
  /**
   * Uploads kept from an earlier attempt with this key, by file index: reused, not uploaded again.
   * With no `files`, these are the job's images as they are.
   */
  uploadIds?: readonly (string | undefined)[];
  onUploaded?: (uploadId: string, index: number) => void;
  /** The project the job belongs to (an influencer, a video idea); it then shows among the project's jobs. */
  projectId?: string;
  /**
   * Uploads for other upload fields, by field name (a video's `end_image`,
   * `reference_images` or `video`); already uploaded.
   */
  fieldUploads?: Record<string, readonly string[]>;
};

/** Uploads one file: `POST /v1/uploads` for a signed URL, then the bytes straight to storage. Returns the upload id. */
export async function uploadInputFile(
  api: SubmitParams["api"],
  uploadFile: SubmitParams["uploadFile"],
  file: File,
): Promise<string> {
  const upload = await api.post<UploadResponse>("/v1/uploads", {
    filename: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
  });
  await uploadFile(upload, file);
  return upload.uploadId;
}

async function uploadImage(p: SubmitParams, file: File, index: number): Promise<string> {
  const uploadId = await uploadInputFile(p.api, p.uploadFile, file);
  p.onUploaded?.(uploadId, index);
  return uploadId;
}

/** Uploads the images (if any), then creates the job. Returns the new job. */
export async function submitGeneration(p: SubmitParams): Promise<JobView> {
  const uploadIds: string[] = [];
  // In order, so a failure part-way keeps every upload before it for the retry.
  for (const [index, file] of (p.files ?? []).entries()) {
    uploadIds.push(p.uploadIds?.[index] ?? (await uploadImage(p, file, index)));
  }
  // No files: images uploaded earlier (a video idea's start image) are used as they are.
  if (!p.files?.length) uploadIds.push(...(p.uploadIds ?? []).filter((id): id is string => Boolean(id)));
  const input = buildInput(p.model, { prompt: p.prompt, values: p.values, uploadIds });
  for (const [field, ids] of Object.entries(p.fieldUploads ?? {})) if (ids.length) input[field] = [...ids];

  const { plugin, operation } = p.model;
  const path = `/v1/jobs/${encodeURIComponent(plugin)}/${encodeURIComponent(operation)}`;
  const body = p.projectId ? { input, projectId: p.projectId } : { input };
  return p.api.post<JobView>(path, body, { idempotencyKey: p.idempotencyKey });
}
