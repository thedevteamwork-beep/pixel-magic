import {
  createHash,
  createPublicKey,
  verify,
  type JsonWebKey,
  type KeyObject,
} from "node:crypto";
import { z } from "zod";
import type { Clock } from "../lib/time.js";

export type FalWebhookHeaders = {
  requestId?: string;
  userId?: string;
  timestamp?: string;
  signature?: string;
};

export type FalPublicKeys = () => Promise<KeyObject[]>;

export const FalWebhookBody = z.object({
  request_id: z.string(),
  status: z.enum(["OK", "ERROR"]),
  payload: z.unknown().optional(),
  error: z.string().nullish(),
});

const KEY_CACHE_MS = 24 * 60 * 60 * 1000;
const TOLERANCE_MS = 300_000;

const Jwks = z.object({
  keys: z.array(z.object({ kty: z.string(), crv: z.string(), x: z.string() })),
});

export function createFalKeySource(
  jwksUrl: string,
  clock: Clock,
  fetchFn: typeof fetch = fetch,
): FalPublicKeys {
  let cache: { keys: KeyObject[]; fetchedAt: number } | undefined;

  async function load(): Promise<KeyObject[]> {
    const res = await fetchFn(jwksUrl);
    if (!res.ok) throw new Error(`fal JWKS fetch failed: HTTP ${res.status}`);
    const doc = Jwks.parse(await res.json());
    return doc.keys
      .filter((k) => k.kty === "OKP" && k.crv === "Ed25519")
      .map((k) => createPublicKey({ key: k as JsonWebKey, format: "jwk" }));
  }

  return async () => {
    const nowMs = clock.now().getTime();
    if (cache && nowMs - cache.fetchedAt <= KEY_CACHE_MS) return cache.keys;
    try {
      cache = { keys: await load(), fetchedAt: nowMs };
    } catch (err) {
      if (!cache) throw err;
    }
    return cache.keys;
  };
}

export async function verifyFalWebhook(p: {
  headers: FalWebhookHeaders;
  rawBody: Buffer;
  now: Date;
  keys: FalPublicKeys;
}): Promise<boolean> {
  const { requestId, userId, timestamp, signature } = p.headers;
  if (!requestId || !userId || !timestamp || !signature) return false;
  if (!/^\d+$/.test(timestamp)) return false;
  if (!/^(?:[0-9a-fA-F]{2})+$/.test(signature)) return false;
  if (Math.abs(p.now.getTime() - Number(timestamp) * 1000) > TOLERANCE_MS) {
    return false;
  }
  const message = Buffer.from(
    [
      requestId,
      userId,
      timestamp,
      createHash("sha256").update(p.rawBody).digest("hex"),
    ].join("\n"),
  );
  const sig = Buffer.from(signature, "hex");
  const keys = await p.keys();
  return keys.some((key) => {
    try {
      return verify(null, message, key, sig);
    } catch {
      return false;
    }
  });
}
