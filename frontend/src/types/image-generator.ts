import type { PublicModel } from "@/lib/api/types";
import type { MediaId } from "./landing";

/** An option value the studio sends: the model's own field names, e.g. `image_size`, `num_images`. */
export type ImageOptionValue = string | number;

/** What the composer holds. */
export type ImageSettings = {
  /** The backend model key; `null` means "the first image model". */
  model: string | null;
  prompt: string;
  style: string;
  /** The preferred shape, e.g. "3:4"; mapped to the model's closest size option. */
  ratio: string;
  /** Values for the model's own input fields, keyed by field name. */
  options: Record<string, ImageOptionValue>;
};

export type ReferenceImage = {
  id: string;
  url: string;
  name: string;
  mimeType: string;
  size: number;
  source: "upload" | "result";
  /** The bytes that are uploaded when the image is used. */
  file: File;
  /** Local art-direction role, converted to prompt guidance before submission. */
  role?: "subject" | "style";
};

/** One generated image: a job output with the settings that made it. */
export type ImageResult = {
  /** `<jobId>:<output index>`. */
  id: string;
  jobId: string;
  url: string;
  expiresAt: string | null;
  mimeType: string;
  alt: string;
  /** The user's brief, without the creative guidance the studio appended. */
  prompt: string;
  /** The creative guidance sent with the brief, if any. */
  guidance: string;
  model: string;
  modelName: string;
  /** e.g. "3:4"; drives the card's shape. */
  aspectRatio: string;
  /** How the model names the size, e.g. "1:1 HD". */
  sizeLabel: string;
  options: Record<string, unknown>;
  createdAt: string;
  favorite: boolean;
};

export type InspirationItem = {
  id: string;
  title: string;
  category: string;
  prompt: string;
  asset: MediaId;
  aspectRatio: string;
};

export type ShapeOption = { value: string; label: string; ratio: string };

/** A backend image model, described by the controls the studio shows for it. */
export type StudioModel = {
  key: string;
  name: string;
  description: string;
  maker: string;
  symbol: string;
  tag?: string;
  credits: { min: number; max: number };
  promptMaxLength: number;
  /** The size or aspect-ratio field, if the model has one. */
  shape?: { field: string; options: ShapeOption[]; default: string };
  /** How many images one job makes, if the model lets you choose. */
  count?: { field: string; min: number; max: number; default: number };
  /** Reference images, if the model takes any. */
  references?: { field: string; max: number; required: boolean; mimeTypes: readonly string[] };
  /** Other choices the model declares, shown as small selects. */
  choices: { field: string; label: string; options: readonly string[]; default?: string }[];
  /** The model as `GET /v1/models` returned it; jobs are built from this. */
  source: PublicModel;
};

/** Display details the backend doesn't carry, keyed by model key. */
export type ModelPresentation = { maker: string; symbol: string; tag?: string };
