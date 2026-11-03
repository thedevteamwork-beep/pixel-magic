import type { z } from "zod";
import type { ModelSchema } from "./metaSchema.js";

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

// Derived from the strict meta-schema so there is one source of truth.
export type { ModelSchema } from "./metaSchema.js";
export type FieldSchema = ModelSchema["input"][string];

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
