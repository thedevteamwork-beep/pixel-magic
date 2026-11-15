import type { UpscaleFactor, UpscaleModelId, UpscaleSettings } from "./types";

export type UpscalePreset = { value: string; label: string; description: string };
export type UpscaleModel = {
  id: UpscaleModelId;
  name: string;
  description: string;
  premium?: boolean;
  factors: readonly UpscaleFactor[];
  presets: readonly UpscalePreset[];
};

/** Provider names/presets are catalog metadata; every current output is a local resize.
 * fal Precision currently documents up to4×; Topaz8× here is an app-local preview
 * choice and must be gated separately before enabling a future provider request.
 * Future fal sharpen/denoise values use UI percentages divided by100.
 */
export const upscaleModels: readonly UpscaleModel[] = [
  {
    id: "bytedance",
    name: "ByteDance Upscale",
    description: "High-resolution image upscaling.",
    factors: [2, 4],
    presets: [],
  },
  {
    id: "topaz",
    name: "Topaz",
    description: "The default model for general-purpose use.",
    factors: [1, 2, 4, 8],
    presets: [
      { value: "Standard V2", label: "Standard", description: "The default preset for general-purpose use." },
      {
        value: "High Fidelity V3",
        label: "High Fidelity V3",
        description: "A precision preset for detailed photographs.",
      },
      { value: "High Fidelity V2", label: "High Fidelity V2", description: "An alternative high-fidelity preset." },
      {
        value: "Low Resolution V2",
        label: "Low Resolution V2",
        description: "Restores compressed or lower-resolution images.",
      },
      { value: "CGI", label: "CGI", description: "For artwork and rendered graphics." },
      { value: "Text Refine", label: "Text Refine", description: "For text and defined shapes." },
      { value: "Faces", label: "Faces", description: "A portrait and facial-detail preset." },
    ],
  },
  {
    id: "topaz-generative",
    name: "Topaz Generative",
    description: "Diffusion-based enhancement that adds new detail.",
    premium: true,
    factors: [1, 2, 4],
    presets: [
      { value: "Wonder 3", label: "Wonder 3", description: "Generative enhancement for natural textures and detail." },
      { value: "Wonder 3.5", label: "Wonder 3.5", description: "A finer-detail generative preset." },
      { value: "Wonder 4", label: "Wonder 4", description: "Automatic enhancement with integrated face recovery." },
      { value: "Wonder 2", label: "Wonder 2", description: "An earlier Wonder preset." },
      { value: "Wonder", label: "Wonder", description: "One-click restoration for low-resolution images." },
      { value: "Recover 3", label: "Recover 3", description: "Natural-detail restoration." },
      { value: "Standard MAX", label: "Standard MAX", description: "A precision-oriented generative preset." },
      { value: "Redefine", label: "Redefine", description: "Creative detail with manual tuning controls." },
      { value: "Recovery V2", label: "Recovery V2", description: "A recovery preset for small sources." },
      { value: "Recovery", label: "Recovery", description: "An alternative low-resolution recovery preset." },
    ],
  },
];

export const UPSCALE_SETTING_KEYS = [
  "model",
  "upscale_factor",
  "preset",
  "sharpness",
  "denoise",
  "face_enhancement",
] as const;

export function getUpscaleModel(id: string): UpscaleModel | undefined {
  return upscaleModels.find((model) => model.id === id);
}

export function supportsUpscaleTuning(model: string, preset: string | null): boolean {
  return (
    (model === "topaz" && Boolean(getUpscaleModel(model)?.presets.some((item) => item.value === preset))) ||
    (model === "topaz-generative" && preset === "Redefine")
  );
}

export function supportsFaceEnhancement(model: string, preset: string | null): boolean {
  const definition = getUpscaleModel(model);
  return (
    Boolean(definition?.presets.some((item) => item.value === preset)) &&
    (model === "topaz" || (model === "topaz-generative" && preset !== "Wonder 4"))
  );
}

export const defaultUpscaleSettings: Readonly<UpscaleSettings> = {
  model: "topaz",
  upscale_factor: 1,
  preset: "Standard V2",
  sharpness: 50,
  denoise: 20,
  face_enhancement: false,
};

/** UI transitions only. Request validation never calls this or silently repairs input. */
export function normalizeUpscaleSettings(settings: UpscaleSettings): UpscaleSettings {
  const model = getUpscaleModel(settings.model);
  if (!model) throw new Error("Choose a supported upscale model.");
  const preset = model.presets.length
    ? (model.presets.find((item) => item.value === settings.preset)?.value ?? model.presets[0].value)
    : null;
  const tuning = supportsUpscaleTuning(model.id, preset);
  return {
    model: model.id,
    upscale_factor: model.factors.includes(settings.upscale_factor) ? settings.upscale_factor : model.factors[0],
    preset,
    sharpness: tuning ? (settings.sharpness ?? 50) : null,
    denoise: tuning ? (settings.denoise ?? 20) : null,
    face_enhancement: supportsFaceEnhancement(model.id, preset) ? (settings.face_enhancement ?? false) : null,
  };
}

export function createUpscaleSettings(model: UpscaleModelId): UpscaleSettings {
  return normalizeUpscaleSettings({ ...defaultUpscaleSettings, model });
}
