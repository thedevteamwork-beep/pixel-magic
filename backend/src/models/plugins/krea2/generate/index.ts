import { defineFalModel, imageUrls } from "../../../falModel.js";
import { schema } from "./schema.js";

// Ported from Pixelbin's krea2 plugin.
export const krea2Generate = defineFalModel({
  plugin: "krea2",
  operation: "generate",
  schema,
  // The model option picks the Medium or Large endpoint; references never change it.
  endpoint: (input) =>
    `krea/v2/${input.model === "large" ? "large" : "medium"}/text-to-image`,
  app: "krea/v2",
  payload: (input) => {
    // References guide the style only; fal takes each as an object.
    const references = imageUrls(input.images).map((url) => ({
      image_url: url,
    }));
    return {
      prompt: input.prompt,
      aspect_ratio: input.aspect_ratio,
      creativity: input.creativity,
      ...(references.length ? { image_style_references: references } : {}),
    };
  },
  output: "images",
  // As Pixelbin bills it: the mapping names the model option `quality`.
  billing: ({ options, uploadCount }) => ({
    ...options,
    image: uploadCount > 0,
    quality: options.model as string,
  }),
});
