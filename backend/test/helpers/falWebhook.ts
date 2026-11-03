import {
  createHash,
  generateKeyPairSync,
  sign,
  type KeyObject,
} from "node:crypto";
import type { FalPublicKeys } from "../../src/clients/falWebhook.js";

const testPair = generateKeyPairSync("ed25519");
const otherPair = generateKeyPairSync("ed25519");

export const testFalKeys: FalPublicKeys = async () => [testPair.publicKey];

/** The test public key as a JWKS document, for key-source tests. */
export function testJwksDocument(): { keys: unknown[] } {
  return { keys: [testPair.publicKey.export({ format: "jwk" })] };
}

export function signFalWebhook(
  body: object,
  opts: { requestId?: string; timestamp?: number; key?: "test" | "other" } = {},
): { raw: Buffer; headers: Record<string, string> } {
  const raw = Buffer.from(JSON.stringify(body));
  const requestId = opts.requestId ?? "req_1";
  const userId = "fal-user";
  const timestamp = String(opts.timestamp ?? Math.floor(Date.now() / 1000));
  const privateKey: KeyObject = (opts.key === "other" ? otherPair : testPair)
    .privateKey;
  const message = [
    requestId,
    userId,
    timestamp,
    createHash("sha256").update(raw).digest("hex"),
  ].join("\n");
  const signature = sign(null, Buffer.from(message), privateKey).toString(
    "hex",
  );
  return {
    raw,
    headers: {
      "x-fal-webhook-request-id": requestId,
      "x-fal-webhook-user-id": userId,
      "x-fal-webhook-timestamp": timestamp,
      "x-fal-webhook-signature": signature,
    },
  };
}
