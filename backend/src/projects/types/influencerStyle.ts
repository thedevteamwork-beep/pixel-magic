import { z } from "zod";
import type { ProjectTypeDefinition } from "../registry.js";

/**
 * A saved style reference for the AI influencer: one uploaded image, named by
 * the project title. Project views return the image signed as `upload`.
 */
export const influencerStyle: ProjectTypeDefinition = {
  type: "influencer-style",
  data: z.strictObject({
    uploadId: z.string().uuid(),
  }),
  // A style only holds its image; no jobs run inside it.
  modelKinds: [],
  uploadField: "uploadId",
};
