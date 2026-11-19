import { lightingOptions, paletteOptions, stylePresets } from "@/components/image-generator/constants";
import type { ImageResult } from "@/types/image-generator";
import { parseImageGuidance } from "./guidance";

/** "3:4" → 0.75; anything else → 1. */
export function ratioValue(aspectRatio: string): number {
  const [width, height] = aspectRatio.split(":").map(Number);
  return width > 0 && height > 0 ? width / height : 1;
}

export type ResultSpec = { label: string; value: string };

const FORMATS: Record<string, string> = { "image/jpeg": "JPG", "image/png": "PNG", "image/webp": "WebP" };

/** Model fields worth showing on a result, by the name the studio gives them. */
const OPTION_LABELS: readonly [field: string, label: string][] = [
  ["output_resolution", "Resolution"],
  ["resolution", "Resolution"],
  ["quality", "Quality"],
  ["seed", "Seed"],
];

function humanize(value: unknown): string {
  const text = String(value);
  return /^[a-z]/.test(text) ? text[0].toUpperCase() + text.slice(1).replaceAll("_", " ") : text;
}

/** The settings a result was made with, as label/value pairs. (Its cost shows on "Generate again".) */
export function resultSpecs(item: ImageResult): ResultSpec[] {
  const specs: ResultSpec[] = [{ label: "Size", value: item.sizeLabel }];
  const seen = new Set<string>();
  for (const [field, label] of OPTION_LABELS) {
    const value = item.options[field];
    if ((typeof value !== "string" && typeof value !== "number") || value === "" || seen.has(label)) continue;
    seen.add(label);
    specs.push({ label, value: humanize(value) });
  }
  specs.push({ label: "Format", value: FORMATS[item.mimeType] ?? item.mimeType });
  if (item.batchSize > 1) specs.push({ label: "Images", value: String(item.batchSize) });
  return specs;
}

/** The creative direction the studio added to the brief, e.g. ["Editorial", "Dramatic"]. */
export function resultGuidance(item: Pick<ImageResult, "guidance">): string[] {
  if (!item.guidance) return [];
  const { style, lighting, palette } = parseImageGuidance(item.guidance);
  return [
    stylePresets.find((preset) => preset.value === style && style !== "None")?.name,
    lightingOptions.find((option) => option.value === lighting && lighting !== "none")?.label,
    paletteOptions.find((option) => option.value === palette && palette !== "none")?.label,
  ].filter((label): label is string => Boolean(label));
}
