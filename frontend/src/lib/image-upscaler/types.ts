export type UpscaleFactor = 1 | 2 | 4 | 8 | 16;
export type UpscaleModelId = "bytedance" | "topaz" | "topaz-generative";
export type UpscaleFormat = "png" | "jpg" | "webp";

export type UpscaleSettings = {
  model: UpscaleModelId;
  upscale_factor: UpscaleFactor;
  preset: string | null;
  sharpness: number | null;
  denoise: number | null;
  face_enhancement: boolean | null;
};

export type UpscaleSource = {
  width: number;
  height: number;
  contentType: string;
  size: number;
};

/** Metadata only. Image files and object URLs stay in the browser. */
export type UpscaleRequest = UpscaleSettings & {
  source: UpscaleSource;
};

export type UpscaleOutput = {
  width: number;
  height: number;
  contentType: string;
  format: UpscaleFormat;
};

export type UpscalePlan = {
  demo: true;
  creditsCharged: 0;
  settings: UpscaleSettings;
  output: UpscaleOutput;
};

/** The caller owns `url` and must revoke it when replacing or removing the image. */
export type LoadedUpscaleFile = {
  file: File;
  url: string;
  width: number;
  height: number;
};
