import type { NextStepOption } from "@/types/image-generator";
import type { UpscalePresentation } from "@/lib/image-upscaler/types";

/** Display details the backend doesn't carry, keyed by model key. */
export const upscalePresentation: Record<string, UpscalePresentation> = {
  topaz_upscale: {
    maker: "Topaz Labs",
    symbol: "T",
    bestFor: "Photos, faces and text, true to the original",
    tag: "Popular",
  },
  seedvr_upscale: { maker: "ByteDance", symbol: "S", bestFor: "Restoring soft or older photos, up to 10×" },
  recraftCrisp_upscale: { maker: "Recraft", symbol: "R", bestFor: "Quick, faithful sharpening", tag: "Fast" },
  recraftCreative_upscale: { maker: "Recraft", symbol: "R", bestFor: "Adds new texture and finer detail" },
  ideogram_upscale: { maker: "Ideogram", symbol: "I", bestFor: "New detail you can steer with a prompt" },
};

/** Where an upscaled image can go next. */
export const upscaleNextSteps: readonly NextStepOption[] = [
  { id: "animate", label: "Animate", description: "Turn it into a video", icon: "film" },
  { id: "edit", label: "Edit", description: "Change it with a prompt in the image studio", icon: "wand" },
];

export const UPSCALE_POLL_INTERVAL_MS = 2_500;
/** Past this the upscaler stops waiting; the job still finishes. */
export const UPSCALE_WAIT_LIMIT_MS = 10 * 60_000;
/** How long sample mode (`/upscale?sample=1`, development only) pretends an upscale takes. */
export const SAMPLE_UPSCALE_MS = 2_500;
