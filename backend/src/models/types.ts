import type { z } from "zod";
import type { FalClient, FalResult, FalStatus } from "../clients/fal.js";
import type { SupportedUnit } from "../credits/units.js";

export type ModelKind = "image" | "video";

/** What a credit mapping can test and meter: option values, unit values, `image`. */
export type BillingFacts = Record<string, string | number | boolean>;

export type ParsedOutput = {
  outputs: { url: string; mimeType: string }[];
  blockedCount: number;
};

export class OutputInvalidError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OutputInvalidError";
  }
}

/** One input a model accepts, described the way the public API shows it. */
export type FieldSchema =
  | {
      type: "string";
      description: string;
      enum?: readonly string[];
      default?: string;
      required?: boolean;
      maxLength?: number;
    }
  | {
      type: "integer";
      description: string;
      minimum: number;
      maximum: number;
      default: number;
    }
  | { type: "boolean"; description: string; default: boolean }
  | {
      type: "image";
      description: string;
      required: boolean;
      maxItems: number;
      supportedContentTypes: readonly string[];
    };

/**
 * Everything a model declares about itself. `input` must contain `prompt`
 * (type "string") and at most one "image" field. `metaSchema.ts` checks this.
 */
export type ModelSchema = {
  info: {
    name: string;
    displayName: string;
    kind: ModelKind;
    category: readonly string[];
    description: string;
    bannerImage?: string;
    logo?: string;
  };
  input: Record<string, FieldSchema>;
  output: { description: string; mimeTypes: readonly string[] };
  billing: { units: SupportedUnit[] };
};

/** What a model needs to start a prediction: the prompt, the options, an image URL. */
export type PredictionInput = { prompt: string; image?: string } & Record<
  string,
  unknown
>;

/** Identifies a started prediction. `hasImage` is `job.upload_ids.length > 0`. */
type PredictionRef = { fal: FalClient; requestId: string; hasImage: boolean };

export type ModelDefinition<O extends z.ZodObject = z.ZodObject> = {
  key: string;
  kind: ModelKind;
  displayName: string;
  schema: ModelSchema;
  prompt: { required: boolean; maxLength: number };
  uploads: { min: number; max: number; supportedContentTypes: string[] };
  /** Every field has a default, so `options.parse({})` works. */
  options: O;
  /** The facts credits are priced on: the options, the unit values and `image`. */
  billingInputs(p: { options: z.output<O>; uploadCount: number }): BillingFacts;
  /** The cheapest and the dearest request, as full fact sets. */
  billingRange(): { min: BillingFacts; max: BillingFacts };
  /**
   * The model makes its own fal calls. The endpoint depends only on whether
   * the job has an image, so submit, status, result and cancel always agree.
   */
  requestPrediction(p: {
    fal: FalClient;
    input: PredictionInput;
    webhook: string;
  }): Promise<{ requestId: string }>;
  checkPredictionStatus(p: PredictionRef): Promise<FalStatus>;
  getPredictionResult(p: PredictionRef): Promise<FalResult>;
  cancelPrediction(p: PredictionRef): Promise<void>;
  parseOutput(data: unknown): ParsedOutput;
  timeoutMinutes: number;
};
