import { z } from "zod";
import type { ProjectTypeDefinition } from "../registry.js";

/**
 * One video idea in the video studio: the direction (prompt, start image)
 * and the settings it was last rendered with. Every render of it is a job in
 * the project, so reopening it shows all its takes. Mirrors the frontend's
 * `VideoProjectData`; values are not checked against a model's options (the
 * job is, when it is created).
 */
export const video: ProjectTypeDefinition = {
  type: "video",
  data: z.strictObject({
    prompt: z.string().max(2500).default(""), // MAX_VIDEO_PROMPT_LENGTH on the frontend
    mode: z.enum(["text", "image", "reference", "motion"]).default("text"),
    model: z.string().max(80),
    duration: z.number().int().min(1).max(120).optional(),
    aspectRatio: z.string().max(10).optional(),
    resolution: z.string().max(10).optional(),
    audio: z.boolean().optional(),
    count: z.number().int().min(1).max(4).optional(),
    // The start image (the user's own upload): returned signed as the project's `upload`,
    // and reused by every render, so it is uploaded once.
    startImageUploadId: z.string().uuid().optional(),
    // The idea's other files (end frame, references, motion clip): kept so it can be rendered again.
    // Not checked here: a job checks every upload is the user's own when it is created.
    endImageUploadId: z.string().uuid().optional(),
    referenceUploadIds: z.array(z.string().uuid()).max(10).optional(),
    clipUploadId: z.string().uuid().optional(),
  }),
  modelKinds: ["video"],
  uploadField: "startImageUploadId",
};
