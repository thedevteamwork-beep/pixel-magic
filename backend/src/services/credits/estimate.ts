import type { Deps } from "../../deps.js";
import { priceTier } from "../../credits/tieredCredits.js";
import { AppError } from "../../lib/errors.js";
import type { BillingFacts, ModelDefinition } from "../../models/types.js";

/** Throws 422 when the number of uploads is outside what the model takes. */
export function assertUploadCount(
  model: ModelDefinition,
  uploadCount: number,
): void {
  if (uploadCount < model.uploads.min || uploadCount > model.uploads.max) {
    throw new AppError(
      422,
      "VALIDATION_FAILED",
      `This model takes ${model.uploads.min} to ${model.uploads.max} uploads`,
    );
  }
}

const MAX_CREDITS = 2147483647; // the largest credit_cost the database holds

/**
 * Prices one job from its facts. The tier total can be fractional; it is
 * rounded up here, once. A price that is not a whole number from 1 to the
 * database limit is a mapping bug: the estimate and job creation both throw.
 */
function priceJob(
  deps: Deps,
  model: ModelDefinition,
  facts: BillingFacts,
): {
  credits: number;
  tier: string;
  breakdown: ReturnType<typeof priceTier>["breakdown"];
} {
  const entry = deps.creditMapping[model.key];
  if (!entry) throw new Error(`No credit mapping for model ${model.key}`);
  const { tier, total, breakdown } = priceTier(entry, facts);
  const credits = Math.ceil(total);
  if (!Number.isInteger(credits) || credits < 1 || credits > MAX_CREDITS) {
    throw new Error(
      `Model ${model.key} tier ${tier} prices a job at ${total} credits; it must be 1 to ${MAX_CREDITS}`,
    );
  }
  return { credits, tier, breakdown };
}

/**
 * The price of one job. Job creation and the estimate endpoint both call
 * this, so what is shown is what is reserved.
 */
export function estimateCredits(
  deps: Deps,
  model: ModelDefinition,
  p: { options: unknown; uploadCount: number },
): {
  creditsPerJob: number;
  tier: string;
  breakdown: ReturnType<typeof priceTier>["breakdown"];
} {
  assertUploadCount(model, p.uploadCount);
  const options = model.options.parse(p.options ?? {});
  const facts = model.billingInputs({ options, uploadCount: p.uploadCount });
  const { credits, tier, breakdown } = priceJob(deps, model, facts);
  return { creditsPerJob: credits, tier, breakdown };
}

/** The cheapest and the dearest job for `GET /v1/models`. */
export function creditRange(
  deps: Deps,
  model: ModelDefinition,
): { min: number; max: number } {
  const { min, max } = model.billingRange();
  return {
    min: priceJob(deps, model, min).credits,
    max: priceJob(deps, model, max).credits,
  };
}
