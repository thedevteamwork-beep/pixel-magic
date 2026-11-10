import { createHash } from "node:crypto";

function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v !== null && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(o)
        .sort()
        .map((k) => [k, sortKeys(o[k])]),
    );
  }
  return v;
}

/** JSON with object keys sorted recursively; array order is kept. */
export function canonicalJson(v: unknown): string {
  return JSON.stringify(sortKeys(v));
}

export function sha256Hex(s: string | Buffer): string {
  return createHash("sha256").update(s).digest("hex");
}
