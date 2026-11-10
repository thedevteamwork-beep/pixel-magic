import type { Deps } from "../../deps.js";
import { billingSamples } from "../../credits/billingSamples.js";
import {
  priceTier,
  validateCreditMapping,
  type TieredCreditMapping,
} from "../../credits/tieredCredits.js";
import { optionsIn, uploadIdsIn } from "../../models/schemaGenerator.js";
import type { BillingFacts, ModelDefinition } from "../../models/types.js";

/** Pricing only needs the mapping. */
type PricingDeps = Pick<Deps, "creditMapping">;

const MAX_CREDITS = 2147483647; // the largest credit_cost the database holds

/**
 * Prices one job from its facts. The tier total can be fractional; it is
 * rounded up here, once. A price that is not a whole number from 1 to the
 * database limit is a mapping bug. Startup prices every job a model can
 * take (see `loadCreditMapping`), so this check is a backstop: if it fails,
 * the estimate and job creation both throw.
 */
function priceJob(
  deps: PricingDeps,
  model: ModelDefinition,
  facts: BillingFacts,
): {
  credits: number;
  tier: string;
  baseCredits: number;
  breakdown: ReturnType<typeof priceTier>["breakdown"];
} {
  const entry = deps.creditMapping[model.key];
  if (!entry) throw new Error(`No credit mapping for model ${model.key}`);
  const { tier, total, baseCredits, breakdown } = priceTier(entry, facts);
  const credits = Math.ceil(total);
  if (!Number.isInteger(credits) || credits < 1 || credits > MAX_CREDITS) {
    throw new Error(
      `TIERED_CREDIT_MAPPING invalid (${model.key}, tier ${tier}): prices the job ${JSON.stringify(facts)} at ${total} credits; it must be 1 to ${MAX_CREDITS}`,
    );
  }
  return { credits, tier, baseCredits, breakdown };
}

/**
 * The price of one job, from the same input the job is created with. Job
 * creation and the estimate endpoint both call this, so what is shown is
 * what is reserved. `creditsPerJob` is `baseCredits` plus every breakdown
 * item's credits, rounded up once. Upload ids are counted, never looked up.
 */
export function estimateCredits(
  deps: PricingDeps,
  model: ModelDefinition,
  rawInput: unknown,
): {
  creditsPerJob: number;
  tier: string;
  baseCredits: number;
  breakdown: ReturnType<typeof priceTier>["breakdown"];
} {
  const input = model.input.parse(rawInput);
  const facts = model.billingInputs({
    options: optionsIn(model.uploads, input),
    uploadCount: uploadIdsIn(model.uploads, input).length,
  });
  const { credits, tier, baseCredits, breakdown } = priceJob(
    deps,
    model,
    facts,
  );
  return { creditsPerJob: credits, tier, baseCredits, breakdown };
}

/**
 * The cheapest and the dearest job for `GET /v1/models`: the lowest and the
 * highest price over every option combination and upload count.
 */
export function creditRange(
  deps: PricingDeps,
  model: ModelDefinition,
): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  for (const facts of billingSamples(model)) {
    const { credits } = priceJob(deps, model, facts);
    min = Math.min(min, credits);
    max = Math.max(max, credits);
  }
  return { min, max };
}

/**
 * The credit mapping the app runs with, checked at startup. After
 * `validateCreditMapping`, every job each model can take is priced (via
 * `creditRange`), so a mapping that would price any job outside 1 to
 * MAX_CREDITS stops the app here, naming the model and the tier, instead of
 * failing requests later.
 */
export function loadCreditMapping(
  mapping: unknown,
  models: ModelDefinition[],
): TieredCreditMapping {
  const creditMapping = validateCreditMapping(mapping, models);
  for (const model of models) creditRange({ creditMapping }, model);
  return creditMapping;
}
