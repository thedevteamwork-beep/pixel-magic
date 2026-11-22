import type { z } from "zod";
import type { ModelKind } from "../models/types.js";
import { aiInfluencer } from "./types/aiInfluencer.js";
import { influencerStyle } from "./types/influencerStyle.js";
import { video } from "./types/video.js";

export type ProjectTypeDefinition = {
  type: string; // "ai-influencer"
  /** Checks `data` on create and update. */
  data: z.ZodObject;
  /** Which model kinds may create jobs in this project. */
  modelKinds: readonly ModelKind[];
  /**
   * The `data` field that holds an upload id, if the type has one. The upload
   * must be the user's own and in storage; views return it signed as `upload`.
   */
  uploadField?: string;
};

const PROJECT_TYPES: Record<string, ProjectTypeDefinition> = {
  "ai-influencer": aiInfluencer,
  "influencer-style": influencerStyle,
  video,
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
