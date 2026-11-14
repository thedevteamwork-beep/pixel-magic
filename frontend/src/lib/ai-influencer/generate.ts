import { sampleCrops, sampleHues, VARIATION_COUNT } from "@/components/ai-influencer/constants";
import { landingAssets } from "@/constants/landing-media";
import type { InfluencerTraits, InfluencerVariation } from "@/types/ai-influencer";
import { composeInfluencerPrompt, seedFrom } from "./prompt";

const DELAY_MS = 1600;

/**
 * Preview generator: waits like a real job, then returns sample portraits.
 * Replace the body with the real generation request when the backend model lands.
 */
export function generateInfluencerPreview(
  traits: InfluencerTraits,
  signal: AbortSignal,
  hasReference = false,
): Promise<InfluencerVariation[]> {
  return new Promise((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      const base = seedFrom(composeInfluencerPrompt(traits, hasReference)) ^ Date.now();
      resolve(
        Array.from({ length: VARIATION_COUNT }, (_, index) => ({
          id: `${base >>> 0}-${index}`,
          url: landingAssets.portrait.image,
          alt: landingAssets.portrait.alt,
          seed: (base + index * 7919) >>> 0,
          hue: sampleHues[index % sampleHues.length],
          position: sampleCrops[index % sampleCrops.length],
        })),
      );
    }, DELAY_MS);
    if (signal.aborted) abort();
    else signal.addEventListener("abort", abort, { once: true });
  });
}
