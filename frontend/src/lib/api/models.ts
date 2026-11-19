import { api } from "./client";
import type { PublicModel } from "./types";

// One request per page load, shared by every studio; a failure is not cached.
let cached: Promise<PublicModel[]> | null = null;

/** `GET /v1/models`, fetched once and shared. */
export function fetchModels(): Promise<PublicModel[]> {
  cached ??= api.get<PublicModel[]>("/v1/models").catch((error: unknown) => {
    cached = null;
    throw error;
  });
  return cached;
}
