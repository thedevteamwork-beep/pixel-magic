import { z } from "zod";

export const optionsSchema = z.object({
  image_size: z
    .enum([
      "square_hd",
      "square",
      "portrait_4_3",
      "portrait_16_9",
      "landscape_4_3",
      "landscape_16_9",
    ])
    .default("landscape_4_3"),
  num_images: z.number().int().min(1).max(4).default(1),
});

export type FluxOptions = z.output<typeof optionsSchema>;

// Extra fields (timings, seed, prompt) are tolerated and ignored.
export const falOutputSchema = z.object({
  images: z.array(
    z.object({
      url: z.string().url(),
      width: z.number().optional(),
      height: z.number().optional(),
      content_type: z.string().optional(),
    }),
  ),
  has_nsfw_concepts: z.array(z.boolean()).optional(),
});
