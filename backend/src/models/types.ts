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

export type ModelDefinition<O extends z.ZodObject = z.ZodObject> = {
  key: string;
  falModelId: string;
  kind: ModelKind;
  displayName: string;
  prompt: { required: boolean; maxLength: number };
  uploads: { min: number; max: number };
  /** Every field has a default, so `options.parse({})` works. */
  options: O;
  creditCost(o: z.output<O>): number;
  buildInput(p: {
    prompt: string;
    options: z.output<O>;
    inputUrls: string[];
  }): Record<string, unknown>;
  parseOutput(data: unknown): ParsedOutput;
  timeoutMinutes: number;
};
