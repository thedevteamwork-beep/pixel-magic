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
  file?: File;
  idempotencyKey: string;
  /** An upload kept from an earlier attempt with this key: reused, not uploaded again. */
  uploadId?: string;
  onUploaded?: (uploadId: string) => void;
};

async function uploadImage(p: SubmitParams, file: File): Promise<string> {
  const upload = await p.api.post<UploadResponse>("/v1/uploads", {
    filename: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
  });
  await p.uploadFile(upload, file);
  p.onUploaded?.(upload.uploadId);
  return upload.uploadId;
}

/** Uploads the image (if any), then creates the job. Returns the new job. */
export async function submitGeneration(p: SubmitParams): Promise<JobView> {
  const uploadIds: string[] = [];
  if (p.file) uploadIds.push(p.uploadId ?? (await uploadImage(p, p.file)));
  const input = buildInput(p.model, { prompt: p.prompt, values: p.values, uploadIds });

  const { plugin, operation } = p.model;
  const path = `/v1/jobs/${encodeURIComponent(plugin)}/${encodeURIComponent(operation)}`;
  return p.api.post<JobView>(path, { input }, { idempotencyKey: p.idempotencyKey });
}
