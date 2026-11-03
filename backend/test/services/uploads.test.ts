import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { T } from "../../src/db/tables.js";
import { AppError } from "../../src/lib/errors.js";
import { createUpload, resolveUploads } from "../../src/services/uploads.js";
import { makeDeps } from "../helpers/app.js";
import { resetDb, testDb } from "../helpers/db.js";
import { insertProfile } from "../helpers/factories.js";

const body = { filename: "a.png", mimeType: "image/png", sizeBytes: 1000 };

describe("uploads service", () => {
  let userId: string;
  beforeEach(async () => {
    await resetDb();
    userId = await insertProfile(testDb);
  });

  async function make(
    h: ReturnType<typeof makeDeps>,
    uid = userId,
    mimeType = "image/png",
  ) {
    const u = await createUpload(h.deps, uid, { ...body, mimeType });
    return u;
  }

  async function reason(p: Promise<unknown>): Promise<unknown> {
    const err = await p.then(
      () => null,
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(AppError);
    const e = err as AppError;
    expect(e.status).toBe(422);
    expect(e.code).toBe("UPLOAD_NOT_READY");
    return (e.meta as { reason: string }).reason;
  }

  it("resolveUploads marks ready with Storage's real size and type", async () => {
    const h = makeDeps();
    const u = await make(h);
    h.storage.put("inputs", u.path, { sizeBytes: 1234, mimeType: "image/png" });
    h.clock.advance(60_000);
    const rows = await resolveUploads(h.deps, userId, [u.uploadId]);
    expect(rows).toHaveLength(1);
    const row = await testDb(T.uploads).where({ id: u.uploadId }).first();
    expect(row).toMatchObject({
      status: "ready",
      size_bytes: "1234",
      mime_type: "image/png",
    });
    expect(row.updated_at).toEqual(h.clock.now());
  });

  it("rejects an upload that isn't in Storage yet", async () => {
    const h = makeDeps();
    const u = await make(h);
    expect(await reason(resolveUploads(h.deps, userId, [u.uploadId]))).toBe(
      "not_uploaded",
    );
  });

  it("rejects when the real object differs from what was declared", async () => {
    const h = makeDeps();
    const a = await make(h);
    h.storage.put("inputs", a.path, {
      sizeBytes: 10,
      mimeType: "application/pdf",
    });
    expect(await reason(resolveUploads(h.deps, userId, [a.uploadId]))).toBe(
      "mime_type",
    );
    const b = await make(h);
    h.storage.put("inputs", b.path, {
      sizeBytes: 30 * 1024 * 1024,
      mimeType: "image/png",
    });
    expect(await reason(resolveUploads(h.deps, userId, [b.uploadId]))).toBe(
      "too_large",
    );
    const row = await testDb(T.uploads).where({ id: b.uploadId }).first();
    expect(row.status).toBe("pending");
  });

  it("rejects another user's upload as not_found", async () => {
    const h = makeDeps();
    const u = await make(h);
    h.storage.put("inputs", u.path, { sizeBytes: 5, mimeType: "image/png" });
    const other = await insertProfile(testDb);
    expect(await reason(resolveUploads(h.deps, other, [u.uploadId]))).toBe(
      "not_found",
    );
    expect(await reason(resolveUploads(h.deps, userId, [randomUUID()]))).toBe(
      "not_found",
    );
  });

  it("rejects duplicate ids", async () => {
    const h = makeDeps();
    const u = await make(h);
    h.storage.put("inputs", u.path, { sizeBytes: 5, mimeType: "image/png" });
    const err = await resolveUploads(h.deps, userId, [
      u.uploadId,
      u.uploadId,
    ]).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).code).toBe("VALIDATION_FAILED");
  });

  it("keeps request order", async () => {
    const h = makeDeps();
    const a = await make(h);
    const b = await make(h);
    const c = await make(h);
    for (const u of [a, b, c])
      h.storage.put("inputs", u.path, { sizeBytes: 5, mimeType: "image/png" });
    const ids = [c.uploadId, a.uploadId, b.uploadId];
    const rows = await resolveUploads(h.deps, userId, ids);
    expect(rows.map((r) => r.id)).toEqual(ids);
  });
});
