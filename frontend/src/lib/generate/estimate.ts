/**
 * Pricing a job before it exists. `POST /v1/credits/estimate` checks the same
 * input a job takes, so a required prompt and the uploads need stand-ins: the
 * price never depends on the prompt's words, and upload ids are counted, not read.
 */
export const ESTIMATE_PROMPT = "estimate";

export function placeholderUploadId(index = 0): string {
  return `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
}
