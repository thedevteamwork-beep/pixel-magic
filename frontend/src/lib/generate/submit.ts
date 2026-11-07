import { buildOptions } from "@/lib/generate/formFromSchema";
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
};

async function uploadImage(p: SubmitParams, file: File): Promise<string> {
  const upload = await p.api.post<UploadResponse>("/v1/uploads", {
    filename: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
  });
  await p.uploadFile(upload, file);
  return upload.uploadId;
}

/** Uploads the image (if any), then creates the job. Returns the new job. */
export async function submitGeneration(p: SubmitParams): Promise<JobView> {
  const body: Record<string, unknown> = {
    model: p.model.key,
    prompt: p.prompt,
    options: buildOptions(p.model, p.values),
  };
  if (p.file) body.uploadIds = [await uploadImage(p, p.file)];

  return p.api.post<JobView>("/v1/jobs", body, { idempotencyKey: p.idempotencyKey });
}
