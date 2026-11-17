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
  /** Uploads kept from an earlier attempt with this key, by file index: reused, not uploaded again. */
  uploadIds?: readonly (string | undefined)[];
  onUploaded?: (uploadId: string, index: number) => void;
};

async function uploadImage(p: SubmitParams, file: File, index: number): Promise<string> {
  const upload = await p.api.post<UploadResponse>("/v1/uploads", {
    filename: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
  });
  await p.uploadFile(upload, file);
  p.onUploaded?.(upload.uploadId, index);
  return upload.uploadId;
}

/** Uploads the images (if any), then creates the job. Returns the new job. */
export async function submitGeneration(p: SubmitParams): Promise<JobView> {
  const uploadIds: string[] = [];
  // In order, so a failure part-way keeps every upload before it for the retry.
  for (const [index, file] of (p.files ?? []).entries()) {
    uploadIds.push(p.uploadIds?.[index] ?? (await uploadImage(p, file, index)));
  }
  const input = buildInput(p.model, { prompt: p.prompt, values: p.values, uploadIds });

  const { plugin, operation } = p.model;
  const path = `/v1/jobs/${encodeURIComponent(plugin)}/${encodeURIComponent(operation)}`;
  return p.api.post<JobView>(path, { input }, { idempotencyKey: p.idempotencyKey });
}
