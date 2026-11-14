import { z } from "zod";
import type { ProjectTypeDefinition } from "../registry.js";

/** One trait value. Not checked against the frontend's option lists. */
const trait = z.string().max(40).optional();

/** Mirrors the frontend's `InfluencerTraits`. */
export const aiInfluencer: ProjectTypeDefinition = {
  type: "ai-influencer",
  data: z.strictObject({
    traits: z
      .strictObject({
        gender: trait,
        age: trait,
        ethnicity: trait,
        skinTone: trait,
        hairStyle: trait,
        hairColor: trait,
        eyeColor: trait,
        build: trait,
        outfit: trait,
        setting: trait,
      })
      .default({}),
    extra: z.string().trim().max(500).optional(), // MAX_EXTRA_LENGTH on the frontend
    archetypeId: z.string().max(60).optional(),
  }),
  modelKinds: ["image"],
};
