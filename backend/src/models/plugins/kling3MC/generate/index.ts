import { defineFalModel } from "../../../falModel.js";
import { schema } from "./schema.js";

// Ported from Pixelbin's kling3MC plugin.
export const kling3MCGenerate = defineFalModel({
  plugin: "kling3MC",
  operation: "generate",
  schema,
  endpoint: "fal-ai/kling-video/v3/pro/motion-control",
  app: "fal-ai/kling-video",
  payload: (input) => ({
    image_url: input.image,
    video_url: input.video,
    keep_original_sound: input.audio,
    // The video's orientation allows the longest clips (30 s) and the most complex moves.
    character_orientation: "video",
    ...(input.prompt ? { prompt: input.prompt } : {}),
  }),
  output: "video",
  // As Pixelbin bills it: per second of the clip, which the video follows.
  pricedByVideoLength: true,
  billing: ({ options, videoSeconds }) => ({
    ...(options as Record<string, string | number | boolean>),
    duration: videoSeconds ?? 1,
  }),
});
