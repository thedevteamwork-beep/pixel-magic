import type { Deps } from "../deps.js";

export const DOWNLOAD_URL_TTL_SECONDS = 3600;

type StorageObject = { bucket: string; path: string };

/** Signs download URLs for the objects with one Storage call per bucket. */
export async function signObjects(
  deps: Deps,
  objects: StorageObject[],
): Promise<{ urlFor: (o: StorageObject) => string; expiresAt: Date }> {
  const expiresAt = new Date(
    deps.clock.now().getTime() + DOWNLOAD_URL_TTL_SECONDS * 1000,
  );

  const pathsByBucket = new Map<string, string[]>();
  for (const o of objects) {
    pathsByBucket.set(o.bucket, [
      ...(pathsByBucket.get(o.bucket) ?? []),
      o.path,
    ]);
  }
  const urlByObject = new Map<string, string>();
  for (const [bucket, paths] of pathsByBucket) {
    const urls = await deps.storage.createSignedUrls(
      bucket,
      paths,
      DOWNLOAD_URL_TTL_SECONDS,
    );
    paths.forEach((path, i) => urlByObject.set(`${bucket}/${path}`, urls[i]));
  }

  return {
    urlFor: (o) => urlByObject.get(`${o.bucket}/${o.path}`)!,
    expiresAt,
  };
}
