import { lightingOptions, paletteOptions, stylePresets } from "@/components/image-generator/constants";
import type { ReferenceImage } from "@/types/image-generator";

export type CreativeGuidance = { lighting: string; palette: string };
export const defaultCreativeGuidance: Readonly<CreativeGuidance> = { lighting: "none", palette: "none" };

/** Keep the typed brief intact. Guidance is transparent, optional and composed once. */
export function composeImageGuidance(
  style: string,
  guidance: CreativeGuidance,
  references: readonly Pick<ReferenceImage, "role">[],
): string {
  const instructions = [
    ...references.map((reference, index) =>
      reference.role === "style"
        ? `Use image ${index + 1} as a visual style reference for lighting, color and atmosphere; do not copy its subject.`
        : `Use image ${index + 1} as a subject reference, preserving its defining visual features where possible.`,
    ),
    stylePresets.find((preset) => preset.value === style)?.instruction,
    lightingOptions.find((option) => option.value === guidance.lighting)?.instruction,
    paletteOptions.find((option) => option.value === guidance.palette)?.instruction,
  ].filter((value): value is string => Boolean(value));
  return instructions.length
    ? `${instructions.join("\n")}\nTreat these as optional visual guidance. If they conflict with the user's explicit brief, follow the brief.`
    : "";
}

export function composeImagePrompt(prompt: string, additions: string): string {
  const brief = prompt.trim().replace(/@image(\d+)\b/g, "image $1");
  return additions ? `${brief}\n\nOptional visual guidance:\n${additions}` : brief;
}

const GUIDANCE_HEADING = "\n\nOptional visual guidance:\n";

/** Undoes `composeImagePrompt`: the brief the user typed, and the guidance appended to it. */
export function splitImagePrompt(prompt: string): { brief: string; guidance: string } {
  const at = prompt.indexOf(GUIDANCE_HEADING);
  return at < 0
    ? { brief: prompt.trim(), guidance: "" }
    : { brief: prompt.slice(0, at).trim(), guidance: prompt.slice(at + GUIDANCE_HEADING.length) };
}

/** The style, lighting and palette whose exact instructions appear in composed guidance. */
export function parseImageGuidance(guidance: string): { style: string } & CreativeGuidance {
  const lines = new Set(guidance.split("\n"));
  return {
    style: stylePresets.find((preset) => lines.has(preset.instruction))?.value ?? "None",
    lighting: lightingOptions.find((option) => option.instruction && lines.has(option.instruction))?.value ?? "none",
    palette: paletteOptions.find((option) => option.instruction && lines.has(option.instruction))?.value ?? "none",
  };
}
