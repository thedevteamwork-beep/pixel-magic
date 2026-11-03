import { randomUUID } from "node:crypto";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/api/server.js";
import { T } from "../../src/db/tables.js";
import { makeDeps } from "../helpers/app.js";
import { authHeader } from "../helpers/auth.js";
import { seedTestCatalog } from "../helpers/catalog.js";
import { resetDb, testDb } from "../helpers/db.js";

describe("POST /v1/uploads", () => {
  let userId: string;
  beforeEach(async () => {
    await resetDb();
    await seedTestCatalog(testDb);
    userId = randomUUID();
  });

  it("creates a pending upload and a signed upload URL", async () => {
    const { deps } = makeDeps();
    const res = await request(createApp(deps))
      .post("/v1/uploads")
      .set(await authHeader(userId))
      .send({ filename: "a.png", mimeType: "image/png", sizeBytes: 1000 });
    expect(res.status).toBe(201);
    const { uploadId, path, signedUrl, token, expiresAt } = res.body;
    expect(path).toBe(`${userId}/${uploadId}`);
    expect(signedUrl).toBe(`https://storage.test/inputs/${path}?mode=upload`);
    expect(token).toBe(`tok-${path}`);
    expect(expiresAt).toBe("2026-03-10T14:00:00.000Z");
    const row = await testDb(T.uploads).where({ id: uploadId }).first();
    expect(row).toMatchObject({
      user_id: userId,
      bucket: "inputs",
      path,
      status: "pending",
      mime_type: "image/png",
      size_bytes: "1000",
    });
  });

  it.each([
    ["application/pdf", 10],
    ["image/png", 20971521],
    ["image/png", 0],
  ])("rejects %s / %i bytes with 422", async (mimeType, sizeBytes) => {
    const { deps } = makeDeps();
    const res = await request(createApp(deps))
      .post("/v1/uploads")
      .set(await authHeader(userId))
      .send({ filename: "a.png", mimeType, sizeBytes });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe("VALIDATION_FAILED");
    expect(await testDb(T.uploads).count()).toEqual([{ count: "0" }]);
  });
});
