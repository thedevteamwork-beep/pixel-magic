import type { CSSProperties } from "react";
import type { InfluencerVariation } from "@/types/ai-influencer";

/** Crop and tint that make the one sample portrait look like different people. Real renders have neither, so get no style. */
export const portraitStyle = ({ position, hue }: Pick<InfluencerVariation, "position" | "hue">): CSSProperties => {
  if (position === undefined || hue === undefined) return {};
  return {
    objectPosition: position,
    filter: `hue-rotate(${hue}deg) saturate(1.05)`,
  };
};
