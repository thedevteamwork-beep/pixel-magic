import { MAX_REFERENCE_BYTES, REFERENCE_MIME_TYPES } from "@/constants/image-generator";
import { api } from "@/lib/api/client";
import type { UploadResponse } from "@/lib/api/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isInRange, isOneOf, runValidators } from "@/lib/validation/validators";

/** Checks for a reference image (the face photo or a style), with the same generic validators as the text fields. */
const imageRules = {
  type: [isOneOf<string>(REFERENCE_MIME_TYPES, "Use a JPEG, PNG or WebP photo.")],
  size: [isInRange({ min: 1, max: MAX_REFERENCE_BYTES }, "Use a photo under 20 MB.")],
};

/** Why `file` can't be used as a reference image, or null when it can. */
export function imageFileError(file: File): string | null {
  return runValidators(file.type, imageRules.type) ?? runValidators(file.size, imageRules.size);
}

/** Puts a reference image in storage and returns its upload id, for a job input or a saved style. */
export async function uploadImage(file: File): Promise<string> {
  const upload = await api.post<UploadResponse>("/v1/uploads", {
    filename: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
  });
  const storage = createSupabaseBrowserClient().storage;
  const { error } = await storage.from(upload.bucket).uploadToSignedUrl(upload.path, upload.token, file);
  if (error) throw error;
  return upload.uploadId;
}
