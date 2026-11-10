import { describe, expect, it } from "vitest";
import {
  createFalKeySource,
  verifyFalWebhook,
  type FalWebhookHeaders,
} from "../../src/clients/falWebhook.js";
import { TestClock } from "../helpers/app.js";
import {
  signFalWebhook,
  testFalKeys,
  testJwksDocument,
} from "../helpers/falWebhook.js";

const nowSec = 1_800_000_000;
const now = new Date(nowSec * 1000);
const body = { request_id: "req_1", status: "OK", payload: { a: 1 } };

function toHeaders(h: Record<string, string>): FalWebhookHeaders {
  return {
    requestId: h["x-fal-webhook-request-id"],
    userId: h["x-fal-webhook-user-id"],
    timestamp: h["x-fal-webhook-timestamp"],
    signature: h["x-fal-webhook-signature"],
  };
}

function signed(opts: Parameters<typeof signFalWebhook>[1] = {}) {
  const s = signFalWebhook(body, { timestamp: nowSec, ...opts });
  return { rawBody: s.raw, headers: toHeaders(s.headers) };
}

describe("verifyFalWebhook", () => {
  it("accepts a correctly signed webhook", async () => {
    expect(
      await verifyFalWebhook({ ...signed(), now, keys: testFalKeys }),
    ).toBe(true);
  });

  it.each([
    ["other key", { key: "other" as const }],
    ["tampered body", "tamper" as const],
    ["301 s old", { timestamp: nowSec - 301 }],
  ])("rejects %s", async (_name, variant) => {
    const s = typeof variant === "string" ? signed() : signed(variant);
    if (variant === "tamper") s.rawBody = Buffer.from('{"request_id":"x"}');
    expect(await verifyFalWebhook({ ...s, now, keys: testFalKeys })).toBe(
      false,
    );
  });

  it("accepts 300 s skew in either direction", async () => {
    for (const ts of [nowSec - 300, nowSec + 300]) {
      expect(
        await verifyFalWebhook({
          ...signed({ timestamp: ts }),
          now,
          keys: testFalKeys,
        }),
      ).toBe(true);
    }
  });

  it.each(["requestId", "userId", "timestamp", "signature"] as const)(
    "rejects when header %s is missing",
    async (name) => {
      const s = signed();
      delete s.headers[name];
      expect(await verifyFalWebhook({ ...s, now, keys: testFalKeys })).toBe(
        false,
      );
    },
  );

  it("rejects a malformed signature and timestamp", async () => {
    const s = signed();
    expect(
      await verifyFalWebhook({
        ...s,
        headers: { ...s.headers, signature: "zz" },
        now,
        keys: testFalKeys,
      }),
    ).toBe(false);
    expect(
      await verifyFalWebhook({
        ...s,
        headers: { ...s.headers, timestamp: "abc" },
        now,
        keys: testFalKeys,
      }),
    ).toBe(false);
  });
});

describe("expectedUserId", () => {
  it("accepts a matching user id", async () => {
    expect(
      await verifyFalWebhook({
        ...signed(),
        now,
        keys: testFalKeys,
        expectedUserId: "fal-user",
      }),
    ).toBe(true);
  });

  it("rejects a different user id even with a valid signature", async () => {
    expect(
      await verifyFalWebhook({
        ...signed(),
        now,
        keys: testFalKeys,
        expectedUserId: "someone-else",
      }),
    ).toBe(false);
  });

  it("does not check the user id when unset", async () => {
    expect(
      await verifyFalWebhook({ ...signed(), now, keys: testFalKeys }),
    ).toBe(true);
  });
});

describe("createFalKeySource", () => {
  it("verifies a webhook using keys parsed by the key source", async () => {
    const keys = createFalKeySource(
      "https://jwks",
      new TestClock(),
      (async () =>
        new Response(JSON.stringify(testJwksDocument()))) as typeof fetch,
    );
    expect(await verifyFalWebhook({ ...signed(), now, keys })).toBe(true);
  });

  it("skips unusable keys but keeps the Ed25519 one", async () => {
    const doc = {
      keys: [
        { kty: "RSA", n: "abc", e: "AQAB" },
        { kty: "OKP", crv: "Ed25519", x: "!!!bad" },
        ...testJwksDocument().keys,
      ],
    };
    const keys = createFalKeySource(
      "https://jwks",
      new TestClock(),
      (async () => new Response(JSON.stringify(doc))) as typeof fetch,
    );
    expect(await keys()).toHaveLength(1);
    expect(await verifyFalWebhook({ ...signed(), now, keys })).toBe(true);
  });

  it("keeps the old cache when a refresh has no usable keys", async () => {
    const clock = new TestClock();
    let doc: unknown = testJwksDocument();
    const keys = createFalKeySource(
      "https://jwks",
      clock,
      (async () => new Response(JSON.stringify(doc))) as typeof fetch,
    );
    await keys();
    doc = { keys: [{ kty: "RSA", n: "abc", e: "AQAB" }] };
    clock.advance(86_400_001);
    expect(await keys()).toHaveLength(1);
  });

  it("throws on a cold cache with no usable keys", async () => {
    const keys = createFalKeySource(
      "https://jwks",
      new TestClock(),
      (async () => new Response(JSON.stringify({ keys: [] }))) as typeof fetch,
    );
    await expect(keys()).rejects.toThrow();
  });

  function makeFetch(state: { calls: number; fail: boolean }): typeof fetch {
    return (async () => {
      state.calls += 1;
      if (state.fail) return new Response("boom", { status: 500 });
      return new Response(JSON.stringify(testJwksDocument()), { status: 200 });
    }) as typeof fetch;
  }

  it("caches keys for 24 h", async () => {
    const clock = new TestClock();
    const state = { calls: 0, fail: false };
    const keys = createFalKeySource("https://jwks", clock, makeFetch(state));
    expect(await keys()).toHaveLength(1);
    clock.advance(86_400_000 - 1000);
    await keys();
    expect(state.calls).toBe(1);
    clock.advance(2000);
    await keys();
    expect(state.calls).toBe(2);
  });

  it("keeps the cached keys when a refresh fails", async () => {
    const clock = new TestClock();
    const state = { calls: 0, fail: false };
    const keys = createFalKeySource("https://jwks", clock, makeFetch(state));
    await keys();
    state.fail = true;
    clock.advance(86_400_001);
    expect(await keys()).toHaveLength(1);
    expect(state.calls).toBe(2);
  });

  it("throws when the first fetch fails", async () => {
    const state = { calls: 0, fail: true };
    const keys = createFalKeySource(
      "https://jwks",
      new TestClock(),
      makeFetch(state),
    );
    await expect(keys()).rejects.toThrow();
  });
});
