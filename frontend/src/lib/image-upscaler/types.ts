import type { PublicModel } from "@/lib/api/types";

export type UpscaleValue = string | number | boolean;
/** A model's settings, by its own field names (e.g. `upscale_factor`). */
export type UpscaleValues = Record<string, UpscaleValue>;

/** A setting beyond the scale, shown under "More settings", from the model's schema. */
export type UpscaleControl = { field: string; label: string; description: string } & (
  | { kind: "choice"; options: readonly string[]; default: string }
  | { kind: "toggle"; default: boolean }
  | { kind: "slider"; min: number; max: number; default: number }
  | { kind: "text"; maxLength?: number; default: string }
);

/** A backend upscale model, described by the controls the upscaler shows for it. */
export type UpscaleModel = {
  key: string;
  name: string;
  description: string;
  maker: string;
  symbol: string;
  /** What it is best at, in a few words. */
  bestFor: string;
  tag?: string;
  credits: { min: number; max: number };
  /** Scaling by a factor, if the model lets you choose one. */
  factor?: { field: string; min: number; max: number; default: number };
  /** Scaling to a resolution instead, if the model offers it. */
  target?: { modeField: string; field: string; options: readonly string[]; default: string };
  controls: UpscaleControl[];
  /** The model as `GET /v1/models` returned it; jobs are built from this. */
  source: PublicModel;
};

/** Display details the backend doesn't carry, keyed by model key. */
export type UpscalePresentation = { maker: string; symbol: string; bestFor: string; tag?: string };

export type ImageSize = { width: number; height: number };

/** The caller owns `url` and must revoke it when replacing or removing the image. */
export type LoadedUpscaleFile = {
  file: File;
  url: string;
  width: number;
  height: number;
};

/** A finished upscale. */
export type UpscaleResult = {
  jobId: string;
  url: string;
  mimeType: string;
  model: string;
  modelName: string;
  /** The settings it was made with. */
  values: UpscaleValues;
  creditCost: number;
  createdAt: string;
  /** The input's size, when known; the result's is read from the image. */
  inputSize: ImageSize | null;
};
