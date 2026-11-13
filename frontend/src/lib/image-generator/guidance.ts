import { lightingOptions, paletteOptions, stylePresets } from "@/constants/image-guidance";
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

/** Mentions refer to upload IDs, not whatever happens to occupy the old index. */
export function rebindReferenceMentions(
  prompt: string,
  originalIds: readonly string[],
  currentIds: readonly string[],
): { prompt: string; removed: boolean } {
  let removed = false;
  const updated = prompt.replace(/@image(\d+)\b/g, (_token, number: string) => {
    const id = originalIds[Number(number) - 1];
    const index = id === undefined ? -1 : currentIds.indexOf(id);
    if (index >= 0) return `@image${index + 1}`;
    removed = true;
    return "";
  });
  return { prompt: updated, removed };
}
