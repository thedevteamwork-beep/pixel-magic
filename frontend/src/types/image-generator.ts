import type { MediaId } from "./landing";

export type GeneratorMode = "create" | "edit";
export type QueueMode = "credits" | "unlimited";
export type OutputFormat = "png" | "jpeg" | "webp";

export type ImageSettings = {
  model: string;
  prompt: string;
  mode: GeneratorMode;
  aspectRatio: string;
  resolution: string;
  quality: string;
  count: number;
  queue: QueueMode;
  style: string;
  seed: number | null;
  negativePrompt: string;
  enhancePrompt: boolean;
  private: boolean;
  format: OutputFormat;
  background: "auto" | "opaque" | "transparent";
};

export type ReferenceImage = {
  id: string;
  url: string;
  name: string;
  mimeType: string;
  size: number;
  source: "upload" | "sample";
  /** Local art-direction role, converted to prompt guidance before submission. */
  role?: "subject" | "style";
};
export type ReferenceDescriptor = Pick<ReferenceImage, "id" | "mimeType" | "size">;

export type ImageGenerationRequest = ImageSettings & { references: ReferenceDescriptor[] };

export type ImageResult = {
  id: string;
  url: string;
  alt: string;
  prompt: string;
  model: string;
  aspectRatio: string;
  resolution: string;
  quality: string;
  createdAt: string;
  favorite: boolean;
  seed: number;
  style: string;
  format: string;
  demo: true;
};

export type ImageGenerationResponse = {
  id: string;
  demo: true;
  creditsCharged: 0;
  images: ImageResult[];
};

export type InspirationItem = {
  id: string;
  title: string;
  category: string;
  prompt: string;
  asset: MediaId;
  aspectRatio: string;
};

export type ImageModel = {
  id: string;
  name: string;
  maker: string;
  description: string;
  symbol: string;
  tag?: string;
};
