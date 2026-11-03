import { z } from "zod";
import type { BillingFacts, ModelDefinition } from "../models/types.js";
import { UNIT_NAMES, type SupportedUnit } from "./units.js";

// The shape of a tiered credit mapping, in the style of Pixelbin's
// TIERED_CREDIT_MAPPING. Every object is strict, so a typo stops the app at
// startup (or, for the env value, fails loadConfig).

const meter = z.strictObject({
  metric: z.enum(UNIT_NAMES),
  unitSize: z.number().positive(),
  rate: z.number().min(0),
  round: z.enum(["ceil", "floor", "round", "precise"]).optional(),
});

const factValue = z.union([z.string(), z.number(), z.boolean()]);

const factCondition = z.strictObject({
  fact: z.string(),
  operator: z.enum([
    "equal",
    "notEqual",
    "greaterThan",
    "greaterThanInclusive",
    "lessThan",
    "lessThanInclusive",
    "in",
    "notIn",
  ]),
  value: z.union([factValue, z.array(factValue)]),
});

export type Condition =
  z.infer<typeof factCondition> | { all: Condition[] } | { any: Condition[] };

// A condition is one test, or `all` / `any` of nested conditions.
const condition: z.ZodType<Condition> = z.lazy(() =>
  z.union([
    factCondition,
    z.strictObject({ all: z.array(condition) }),
    z.strictObject({ any: z.array(condition) }),
  ]),
);

const tier = z.strictObject({
  name: z.string().min(1),
  isDefault: z.boolean().optional(),
  priority: z.number().optional(),
  conditions: condition.optional(),
  credits: z.number().min(0).optional(),
  meters: z.array(meter).optional(),
});

const modelEntry = z.strictObject({
  tiers: z.array(tier).min(1),
});

/** One entry per model key. */
export const tieredCreditMapping = z.record(z.string(), modelEntry);

export type Meter = z.infer<typeof meter>;
export type Tier = z.infer<typeof tier>;
export type TieredCreditMapping = z.infer<typeof tieredCreditMapping>;

type FactCondition = z.infer<typeof factCondition>;

/** Every plain test inside a condition, however deeply nested. */
function factConditions(c: Condition): FactCondition[] {
  if ("all" in c) return c.all.flatMap(factConditions);
  if ("any" in c) return c.any.flatMap(factConditions);
  return [c];
}

/** The facts a model can be priced on: its inputs (not the prompt), its units and `image`. */
function factNames(model: ModelDefinition): string[] {
  const inputs = Object.keys(model.schema.input).filter((k) => k !== "prompt");
  return [...inputs, ...model.schema.billing.units, "image"];
}

/**
 * Checks a mapping against the registered models. Throws a message naming
 * TIERED_CREDIT_MAPPING, the model and the problem.
 */
export function validateCreditMapping(
  mapping: unknown,
  models: ModelDefinition[],
): TieredCreditMapping {
  const fail = (where: string, message: string): never => {
    throw new Error(`TIERED_CREDIT_MAPPING invalid (${where}): ${message}`);
  };

  // Step 1: only the allowed properties, with the right types. This also
  // rejects a unit that is not supported, a negative rate or credits, and a
  // unitSize that is not above zero.
  const result = tieredCreditMapping.safeParse(mapping);
  if (!result.success) {
    const issue = result.error.issues[0]!;
    return fail(issue.path.join(".") || "(root)", issue.message);
  }
  const parsed = result.data;

  // Step 2: every key is a registered model, and every model has an entry.
  // 1. a mapping entry for an unknown model
  for (const key of Object.keys(parsed)) {
    if (!models.some((m) => m.key === key)) {
      fail(key, "no registered model has this key");
    }
  }
  for (const model of models) {
    const entry = parsed[model.key];
    // 2. a registered model with no mapping entry
    if (!entry) {
      return fail(model.key, "the model has no mapping entry");
    }
    const names = factNames(model);
    const defaults = entry.tiers.filter((t) => t.isDefault);
    // 3. exactly one default tier
    if (defaults.length !== 1) {
      fail(
        model.key,
        `needs exactly one default tier, found ${defaults.length}`,
      );
    }
    const seen = new Set<string>();
    for (const t of entry.tiers) {
      const where = `${model.key}, tier ${t.name}`;
      // 4. tier names are unique
      if (seen.has(t.name)) fail(where, "the tier name is used twice");
      seen.add(t.name);
      // 5. the default tier is picked without conditions
      if (t.isDefault && t.conditions) {
        fail(where, "the default tier must not have conditions");
      }
      // 6. any other tier needs conditions, or it could never be picked
      if (!t.isDefault && !t.conditions) {
        fail(where, "a tier that is not the default needs conditions");
      }
      // 7. a meter may only use a unit the model declares
      for (const m of t.meters ?? []) {
        if (!model.schema.billing.units.includes(m.metric)) {
          fail(where, `the model does not declare the unit ${m.metric}`);
        }
      }
      for (const c of t.conditions ? factConditions(t.conditions) : []) {
        // 8. a condition may only test one of the model's facts
        if (!names.includes(c.fact)) {
          fail(
            where,
            `${c.fact} is not a fact of this model (${names.join(", ")})`,
          );
        }
        // 9. in / notIn take a list; every other operator takes one value
        const isList = c.operator === "in" || c.operator === "notIn";
        if (isList !== Array.isArray(c.value)) {
          fail(
            where,
            `${c.operator} ${isList ? "needs a list" : "needs a single value"}`,
          );
        }
      }
    }
  }
  return parsed;
}

type FactValue = string | number | boolean | undefined;

function compare(c: FactCondition, fact: FactValue): boolean {
  const { operator, value } = c;
  if (Array.isArray(value)) {
    const found = value.includes(fact as string | number | boolean);
    return operator === "in" ? found : !found;
  }
  if (operator === "equal") return fact === value;
  if (operator === "notEqual") return fact !== value;
  // The ordering operators only compare numbers; anything else does not match.
  if (typeof fact !== "number" || typeof value !== "number") return false;
  if (operator === "greaterThan") return fact > value;
  if (operator === "greaterThanInclusive") return fact >= value;
  if (operator === "lessThan") return fact < value;
  return fact <= value;
}

function matches(c: Condition, facts: BillingFacts): boolean {
  if ("all" in c) return c.all.every((x) => matches(x, facts));
  if ("any" in c) return c.any.some((x) => matches(x, facts));
  return compare(c, facts[c.fact]);
}

/** Removes float noise (0.7 × 10) so it can never become an extra credit. */
const clean = (n: number): number => Math.round(n * 1e9) / 1e9;

const ROUNDERS = {
  ceil: Math.ceil,
  floor: Math.floor,
  round: Math.round,
  precise: (n: number) => n,
};

/**
 * Picks the tier for these facts and prices it. `total` can be fractional;
 * the caller rounds it up once (see `estimateCredits`).
 */
export function priceTier(
  entry: TieredCreditMapping[string],
  facts: BillingFacts,
): {
  tier: string;
  total: number;
  breakdown: {
    unit: SupportedUnit;
    quantity: number;
    units: number;
    rate: number;
    credits: number;
  }[];
} {
  // Step 1: the first matching conditional tier by priority (missing = 1,
  // ties keep file order), else the default tier.
  const conditional = entry.tiers
    .filter((t) => !t.isDefault && t.conditions)
    .sort((a, b) => (a.priority ?? 1) - (b.priority ?? 1));
  const picked =
    conditional.find((t) => matches(t.conditions!, facts)) ??
    entry.tiers.find((t) => t.isDefault);
  if (!picked) throw new Error("Credit mapping has no default tier");

  // Step 2: base credits plus each meter's rounded units times its rate.
  let total = picked.credits ?? 0;
  const breakdown = [];
  for (const m of picked.meters ?? []) {
    const quantity = facts[m.metric];
    if (typeof quantity !== "number" || !Number.isFinite(quantity)) {
      throw new Error(`Billing fact ${m.metric} must be a finite number`);
    }
    const units = ROUNDERS[m.round ?? "ceil"](clean(quantity / m.unitSize));
    const credits = clean(units * m.rate);
    total += credits;
    breakdown.push({ unit: m.metric, quantity, units, rate: m.rate, credits });
  }
  return { tier: picked.name, total: clean(total), breakdown };
}
