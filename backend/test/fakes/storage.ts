import {
  StorageError,
  type StorageClient,
  type StorageObjectInfo,
} from "../../src/clients/storage.js";

type Method = keyof StorageClient;

export class FakeStorage implements StorageClient {
  objects = new Map<string, StorageObjectInfo>();
  copies: Array<{
    bucket: string;
    path: string;
    sourceUrl: string;
    mimeType: string;
  }> = [];
  calls: Array<{ method: string; args: unknown[] }> = [];
  private failures = new Map<Method, number>();

  put(bucket: string, path: string, info: StorageObjectInfo): void {
    this.objects.set(`${bucket}/${path}`, info);
  }

  failNext(method: Method, times = 1): void {
    this.failures.set(method, times);
  }

  private enter(method: Method, args: unknown[]): void {
    this.calls.push({ method, args });
    const remaining = this.failures.get(method) ?? 0;
    if (remaining > 0) {
      this.failures.set(method, remaining - 1);
      throw new StorageError(`fake storage ${method} failure`);
    }
  }

  async createSignedUploadUrl(
    bucket: string,
    path: string,
  ): Promise<{ signedUrl: string; token: string }> {
    this.enter("createSignedUploadUrl", [bucket, path]);
    return {
      signedUrl: `https://storage.test/${bucket}/${path}?mode=upload`,
      token: "tok-" + path,
    };
  }

  async getObjectInfo(
    bucket: string,
    path: string,
  ): Promise<StorageObjectInfo | null> {
    this.enter("getObjectInfo", [bucket, path]);
    return this.objects.get(`${bucket}/${path}`) ?? null;
  }

  async createSignedUrl(
    bucket: string,
    path: string,
    expiresInSeconds: number,
  ): Promise<string> {
    this.enter("createSignedUrl", [bucket, path, expiresInSeconds]);
    return `https://storage.test/${bucket}/${path}?mode=read&expires=${expiresInSeconds}`;
  }

  async createSignedUrls(
    bucket: string,
    paths: string[],
    expiresInSeconds: number,
  ): Promise<string[]> {
    this.enter("createSignedUrls", [bucket, paths, expiresInSeconds]);
    return paths.map(
      (path) =>
        `https://storage.test/${bucket}/${path}?mode=read&expires=${expiresInSeconds}`,
    );
  }

  async copyFromUrl(
    bucket: string,
    path: string,
    sourceUrl: string,
    mimeType: string,
  ): Promise<void> {
    this.enter("copyFromUrl", [bucket, path, sourceUrl, mimeType]);
    this.copies.push({ bucket, path, sourceUrl, mimeType });
    this.put(bucket, path, { sizeBytes: 1, mimeType });
  }
}
