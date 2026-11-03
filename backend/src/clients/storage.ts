import { createClient } from "@supabase/supabase-js";
import type { Config } from "../config.js";

export type StorageObjectInfo = { sizeBytes: number; mimeType: string };

export interface StorageClient {
  createSignedUploadUrl(
    bucket: string,
    path: string,
  ): Promise<{ signedUrl: string; token: string }>;
  /** Resolves null when the object does not exist. */
  getObjectInfo(
    bucket: string,
    path: string,
  ): Promise<StorageObjectInfo | null>;
  createSignedUrl(
    bucket: string,
    path: string,
    expiresInSeconds: number,
  ): Promise<string>;
  /** Streams sourceUrl into the bucket, overwriting any existing object. */
  copyFromUrl(
    bucket: string,
    path: string,
    sourceUrl: string,
    mimeType: string,
  ): Promise<void>;
}

export class StorageError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "StorageError";
  }
}

export const STORAGE_COPY_TIMEOUT_MS = 600_000;

function isNotFound(err: unknown): boolean {
  const e = err as { status?: unknown; statusCode?: unknown };
  return e.status === 404 || e.statusCode === "404" || e.statusCode === 404;
}

async function wrap<T>(what: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof StorageError) throw err;
    throw new StorageError(
      `${what} failed: ${err instanceof Error ? err.message : String(err)}`,
      { cause: err },
    );
  }
}

export function createSupabaseStorage(config: Config): StorageClient {
  const supabase = createClient(
    config.SUPABASE_URL,
    config.SUPABASE_SECRET_KEY,
    { auth: { persistSession: false } },
  );

  return {
    createSignedUploadUrl: (bucket, path) =>
      wrap("createSignedUploadUrl", async () => {
        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUploadUrl(path);
        if (error) throw error;
        return { signedUrl: data.signedUrl, token: data.token };
      }),

    getObjectInfo: (bucket, path) =>
      wrap("getObjectInfo", async () => {
        const { data, error } = await supabase.storage.from(bucket).info(path);
        if (error) {
          if (isNotFound(error)) return null;
          throw error;
        }
        return {
          sizeBytes: data.size ?? 0,
          mimeType: data.contentType ?? "application/octet-stream",
        };
      }),

    createSignedUrl: (bucket, path, expiresInSeconds) =>
      wrap("createSignedUrl", async () => {
        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrl(path, expiresInSeconds);
        if (error) throw error;
        return data.signedUrl;
      }),

    copyFromUrl: (bucket, path, sourceUrl, mimeType) =>
      wrap("copyFromUrl", async () => {
        const res = await fetch(sourceUrl, {
          signal: AbortSignal.timeout(STORAGE_COPY_TIMEOUT_MS),
        });
        if (!res.ok || !res.body) {
          throw new StorageError(`source fetch returned HTTP ${res.status}`);
        }
        const { error } = await supabase.storage
          .from(bucket)
          .upload(path, res.body, {
            contentType: mimeType,
            upsert: true,
            duplex: "half",
          });
        if (error) throw error;
      }),
  };
}
