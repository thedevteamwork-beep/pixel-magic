import { z } from "zod";

export const optionsSchema = z.object({
  duration: z.enum(["5", "10"]).default("5"),
});

export type KlingOptions = z.output<typeof optionsSchema>;

// Extra fields are tolerated and ignored.
export const falOutputSchema = z.object({
  video: z.object({
    url: z.string().url(),
    content_type: z.string().optional(),
    file_name: z.string().optional(),
    file_size: z.number().optional(),
  }),
});
