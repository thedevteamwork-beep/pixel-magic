import type { z } from "zod";
import type { ModelKind } from "../models/types.js";
import { aiInfluencer } from "./types/aiInfluencer.js";

export type ProjectTypeDefinition = {
  type: string; // "ai-influencer"
  /** Checks `data` on create and update. */
  data: z.ZodObject;
  /** Which model kinds may create jobs in this project. */
  modelKinds: readonly ModelKind[];
};

const PROJECT_TYPES: Record<string, ProjectTypeDefinition> = {
  "ai-influencer": aiInfluencer,
};

/** The definition for a project's type, if there is one. */
export function getProjectType(
  type: string,
): ProjectTypeDefinition | undefined {
  // Only real types, never built-in keys like "constructor".
  if (!Object.hasOwn(PROJECT_TYPES, type)) return undefined;
  return PROJECT_TYPES[type];
}

export function listProjectTypes(): string[] {
  return Object.keys(PROJECT_TYPES);
}
