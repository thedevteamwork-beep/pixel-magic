import type { UploadResponse } from "@/lib/api/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/** Puts a file at the signed upload URL `POST /v1/uploads` returned. */
export async function uploadFile(upload: UploadResponse, file: File): Promise<void> {
  const storage = createSupabaseBrowserClient().storage;
  const { error } = await storage.from(upload.bucket).uploadToSignedUrl(upload.path, upload.token, file);
  if (error) throw error;
}
