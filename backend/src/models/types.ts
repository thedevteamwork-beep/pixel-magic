import type { z } from "zod";

export type ModelKind = "image" | "video";

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
 * (type "string") and at most one "image" field.
 */
export type ModelSchema = {
  info: {
    name: string;
    displayName: string;
    kind: ModelKind;
    category: readonly string[];
    description: string;
  };
  input: Record<string, FieldSchema>;
  output: { description: string; mimeTypes: readonly string[] };
};

export type ModelDefinition<O extends z.ZodObject = z.ZodObject> = {
  key: string;
  kind: ModelKind;
  displayName: string;
  schema: ModelSchema;
  prompt: { required: boolean; maxLength: number };
  uploads: { min: number; max: number; supportedContentTypes: string[] };
  /** Every field has a default, so `options.parse({})` works. */
  options: O;
  creditCost(o: z.output<O>): number;
  /**
   * The fal endpoint for a job. It depends only on the job's upload count, so
   * submit, webhook, finalize and reconcile always agree.
   */
  falEndpoint(p: { uploadCount: number }): string;
  buildInput(p: {
    prompt: string;
    options: z.output<O>;
    inputUrls: string[];
  }): Record<string, unknown>;
  parseOutput(data: unknown): ParsedOutput;
  timeoutMinutes: number;
};
