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
  /** One URL per path, in the order of `paths`. */
  createSignedUrls(
    bucket: string,
    paths: string[],
    expiresInSeconds: number,
  ): Promise<string[]>;
  /**
   * Up to the first `maxBytes` of an object (e.g. an image's header), or
   * null when it doesn't exist.
   */
  readObjectStart(
    bucket: string,
    path: string,
    maxBytes: number,
  ): Promise<Buffer | null>;
  /**
   * Up to the last `maxBytes` of an object (a clip's header, kept at its
   * end), or null when it doesn't exist.
   */
  readObjectEnd(
    bucket: string,
    path: string,
    maxBytes: number,
  ): Promise<Buffer | null>;
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
export const STORAGE_READ_TIMEOUT_MS = 30_000;

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

export function createSupabaseStorage(
  config: Config,
  fetchFn: typeof fetch = fetch,
): StorageClient {
  const supabase = createClient(
    config.SUPABASE_URL,
    config.SUPABASE_SECRET_KEY,
    { auth: { persistSession: false } },
  );

  /**
   * Part of an object, by an HTTP Range (`bytes=0-99`, `bytes=-100`): only the
   * header is needed, however large the file. `keep` trims a whole file sent by
   * a server that ignores Range. Null when the object doesn't exist.
   */
  async function readRange(
    bucket: string,
    path: string,
    range: string,
    keep: (bytes: Buffer) => Buffer,
  ): Promise<Buffer | null> {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 60);
    if (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
    const res = await fetchFn(data.signedUrl, {
      headers: { Range: range },
      signal: AbortSignal.timeout(STORAGE_READ_TIMEOUT_MS),
    });
    if (res.status === 404) return null;
    if (!res.ok)
      throw new StorageError(`object read returned HTTP ${res.status}`);
    return keep(Buffer.from(await res.arrayBuffer()));
  }

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

    createSignedUrls: (bucket, paths, expiresInSeconds) =>
      wrap("createSignedUrls", async () => {
        if (paths.length === 0) return [];
        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrls(paths, expiresInSeconds);
        if (error) throw error;
        return data.map((item) => {
          if (item.error || !item.signedUrl) {
            throw new StorageError(
              `createSignedUrls failed for ${item.path}: ${item.error}`,
            );
          }
          return item.signedUrl;
        });
      }),

    readObjectStart: (bucket, path, maxBytes) =>
      wrap("readObjectStart", () =>
        readRange(bucket, path, `bytes=0-${maxBytes - 1}`, (b) =>
          b.subarray(0, maxBytes),
        ),
      ),

    readObjectEnd: (bucket, path, maxBytes) =>
      wrap("readObjectEnd", () =>
        readRange(bucket, path, `bytes=-${maxBytes}`, (b) =>
          b.subarray(-maxBytes),
        ),
      ),

    copyFromUrl: (bucket, path, sourceUrl, mimeType) =>
      wrap("copyFromUrl", async () => {
        const res = await fetchFn(sourceUrl, {
          signal: AbortSignal.timeout(STORAGE_COPY_TIMEOUT_MS),
        });
        // Redirects are followed, but the bytes must still come over https.
        if (!res.url.startsWith("https://")) {
          await res.body?.cancel();
          throw new StorageError(
            "source fetch redirected to a non-https URL; not copied",
          );
        }
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
