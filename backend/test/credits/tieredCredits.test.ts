import { describe, expect, it } from "vitest";
import { DEFAULT_TIERED_CREDIT_MAPPING } from "../../src/credits/defaultTieredCreditMapping.js";
import {
  priceTier,
  type Condition,
  type Meter,
  type Tier,
  validateCreditMapping,
  type TieredCreditMapping,
} from "../../src/credits/tieredCredits.js";
import { listModels } from "../../src/models/registry.js";

type Operator = Extract<Condition, { operator: string }>["operator"];
type Entry = TieredCreditMapping[string];

const meter: Meter = { metric: "duration", unitSize: 1, rate: 1 };
const basic: Tier = { name: "Basic", isDefault: true, meters: [meter] };

/** A model with a default tier plus one conditional tier priced at `rate`. */
function withCondition(conditions: Condition, rate = 10): Entry {
  return {
    tiers: [
      basic,
      {
        name: "Special",
        conditions,
        meters: [{ ...meter, rate }],
      },
    ],
  };
}

// Loose on purpose: tests mutate the mapping into invalid shapes.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = Record<string, any>;

const defaults = () => structuredClone(DEFAULT_TIERED_CREDIT_MAPPING) as Loose;

describe("priceTier", () => {
  it("uses the default tier's meter: kling21 5 s → 30, 10 s → 60", () => {
    const entry = DEFAULT_TIERED_CREDIT_MAPPING.kling21!;
    const five = priceTier(entry, { duration: 5, image: false });
    expect(five).toEqual({
      tier: "Basic",
      total: 30,
      breakdown: [
        { unit: "duration", quantity: 5, units: 5, rate: 6, credits: 30 },
      ],
    });
    expect(priceTier(entry, { duration: 10, image: false }).total).toBe(60);
  });

  it("picks the first matching conditional tier by ascending priority", () => {
    const hit: Condition = { fact: "image", operator: "equal", value: true };
    const entry: Entry = {
      tiers: [
        basic,
        { name: "Late", priority: 2, conditions: hit, meters: [meter] },
        { name: "Early", priority: 1, conditions: hit, meters: [meter] },
      ],
    };
    expect(priceTier(entry, { duration: 1, image: true }).tier).toBe("Early");
    expect(priceTier(entry, { duration: 1, image: false }).tier).toBe("Basic");
  });

  it("keeps file order for equal (or missing) priorities", () => {
    const hit: Condition = { fact: "image", operator: "equal", value: true };
    const entry: Entry = {
      tiers: [
        basic,
        { name: "First", conditions: hit, meters: [meter] },
        { name: "Second", priority: 1, conditions: hit, meters: [meter] },
      ],
    };
    expect(priceTier(entry, { duration: 1, image: true }).tier).toBe("First");
  });

  it.each([
    ["equal", 5, 5, true],
    ["equal", 5, 6, false],
    ["notEqual", 5, 6, true],
    ["notEqual", 5, 5, false],
    ["greaterThan", 5, 6, true],
    ["greaterThan", 5, 5, false],
    ["greaterThanInclusive", 5, 5, true],
    ["greaterThanInclusive", 5, 4, false],
    ["lessThan", 5, 4, true],
    ["lessThan", 5, 5, false],
    ["lessThanInclusive", 5, 5, true],
    ["lessThanInclusive", 5, 6, false],
    ["in", [4, 5], 5, true],
    ["in", [4, 5], 6, false],
    ["notIn", [4, 5], 6, true],
    ["notIn", [4, 5], 5, false],
  ])("supports %s (value %j, fact %j → %s)", (operator, value, fact, hit) => {
    const entry = withCondition({
      fact: "duration",
      operator: operator as Operator,
      value,
    });
    const result = priceTier(entry, { duration: fact as number });
    expect(result.tier).toBe(hit ? "Special" : "Basic");
  });

  it("supports nested all/any", () => {
    const entry = withCondition({
      all: [
        { fact: "image", operator: "equal", value: true },
        {
          any: [
            { fact: "duration", operator: "equal", value: 5 },
            { fact: "duration", operator: "greaterThan", value: 8 },
          ],
        },
      ],
    });
    const tier = (duration: number, image: boolean) =>
      priceTier(entry, { duration, image }).tier;
    expect(tier(5, true)).toBe("Special");
    expect(tier(10, true)).toBe("Special");
    expect(tier(7, true)).toBe("Basic");
    expect(tier(5, false)).toBe("Basic");
  });

  it.each([
    ["ceil", 7.2, 8],
    ["floor", 7.8, 7],
    ["round", 7.5, 8],
    ["precise", 7.5, 7.5],
  ] as const)("rounds units with %s", (round, value, expected) => {
    const entry: Entry = {
      tiers: [{ ...basic, meters: [{ ...meter, round }] }],
    };
    const result = priceTier(entry, { duration: value });
    expect(result.total).toBe(expected);
    expect(result.breakdown[0]!.units).toBe(expected);
  });

  it("divides by unitSize before rounding", () => {
    const entry: Entry = {
      tiers: [{ ...basic, meters: [{ ...meter, unitSize: 4, rate: 3 }] }],
    };
    expect(priceTier(entry, { duration: 5 }).total).toBe(6);
  });

  it("adds base credits to meters", () => {
    const entry: Entry = {
      tiers: [{ ...basic, credits: 2 }],
    };
    expect(priceTier(entry, { duration: 5 }).total).toBe(7);
  });

  it("does not turn float noise into an extra credit", () => {
    const entry: Entry = {
      tiers: [{ ...basic, meters: [{ ...meter, rate: 0.7 }] }],
    };
    expect(priceTier(entry, { duration: 10 }).total).toBe(7);
  });

  it("throws when a meter's fact is missing or not a number", () => {
    const entry = DEFAULT_TIERED_CREDIT_MAPPING.kling21!;
    expect(() => priceTier(entry, {})).toThrow(/duration/);
    expect(() => priceTier(entry, { duration: "5" })).toThrow(/duration/);
    expect(() => priceTier(entry, { duration: Infinity })).toThrow(/duration/);
  });
});

describe("validateCreditMapping", () => {
  it("accepts the default mapping", () => {
    expect(() =>
      validateCreditMapping(DEFAULT_TIERED_CREDIT_MAPPING, listModels()),
    ).not.toThrow();
  });

  it.each<[string, (m: Loose) => void, RegExp]>([
    [
      "unknown unit metric",
      (m) => (m.kling21.tiers[0].meters[0].metric = "megapixels"),
      /kling21.*metric/,
    ],
    [
      "a unit the model doesn't declare",
      (m) => (m.kling21.tiers[0].meters[0].metric = "images"),
      /kling21.*images/,
    ],
    ["unknown model key", (m) => (m.klng21 = m.kling21), /klng21/],
    ["missing model", (m) => delete m["flux-schnell"], /flux-schnell/],
    [
      "two defaults",
      (m) => m.kling21.tiers.push({ ...m.kling21.tiers[0], name: "Other" }),
      /kling21.*default/,
    ],
    [
      "no default",
      (m) => (m.kling21.tiers[0].isDefault = false),
      /kling21.*default/,
    ],
    [
      "unknown fact",
      (m) =>
        m.kling21.tiers.push({
          name: "X",
          conditions: { fact: "resolution", operator: "equal", value: "hd" },
          meters: [{ metric: "duration", unitSize: 1, rate: 1 }],
        }),
      /kling21.*resolution/,
    ],
    [
      "a condition on prompt",
      (m) =>
        m.kling21.tiers.push({
          name: "X",
          conditions: { fact: "prompt", operator: "equal", value: "a" },
          meters: [{ metric: "duration", unitSize: 1, rate: 1 }],
        }),
      /kling21.*prompt/,
    ],
    ["negative rate", (m) => (m.kling21.tiers[0].meters[0].rate = -1), /rate/],
    [
      "zero unitSize",
      (m) => (m.kling21.tiers[0].meters[0].unitSize = 0),
      /unitSize/,
    ],
    ["negative credits", (m) => (m.kling21.tiers[0].credits = -1), /credits/],
    ["extra property", (m) => (m.kling21.tiers[0].meters[0].rat = 1), /rat/],
    [
      "a non-default tier without conditions",
      (m) =>
        m.kling21.tiers.push({
          name: "X",
          meters: [{ metric: "duration", unitSize: 1, rate: 1 }],
        }),
      /kling21.*X.*conditions/,
    ],
    [
      "a default tier with conditions",
      (m) =>
        (m.kling21.tiers[0].conditions = {
          fact: "image",
          operator: "equal",
          value: true,
        }),
      /kling21.*Basic.*conditions/,
    ],
    [
      "duplicate tier names",
      (m) =>
        m.kling21.tiers.push({
          name: "Basic",
          conditions: { fact: "image", operator: "equal", value: true },
          meters: [{ metric: "duration", unitSize: 1, rate: 1 }],
        }),
      /kling21.*Basic.*twice|kling21.*duplicate/i,
    ],
    [
      "an `in` condition whose value is not an array",
      (m) =>
        m.kling21.tiers.push({
          name: "X",
          conditions: { fact: "image", operator: "in", value: true },
          meters: [{ metric: "duration", unitSize: 1, rate: 1 }],
        }),
      /kling21.*in/,
    ],
    [
      "a tier that prices a job at 0",
      (m) => (m.kling21.tiers[0].meters[0].rate = 0),
      /kling21.*Basic.*0 credits/,
    ],
    [
      "a tier with no meters and no credits",
      (m) => delete m.kling21.tiers[0].meters,
      /kling21.*Basic.*0 credits/,
    ],
    [
      "a string value on a number fact",
      (m) =>
        m.kling21.tiers.push({
          name: "X",
          conditions: { fact: "duration", operator: "equal", value: "10" },
          meters: [{ metric: "duration", unitSize: 1, rate: 1 }],
        }),
      /kling21.*X.*duration.*number/,
    ],
    [
      "a mistyped element in an in list",
      (m) =>
        m.kling21.tiers.push({
          name: "X",
          conditions: { fact: "duration", operator: "in", value: [5, "10"] },
          meters: [{ metric: "duration", unitSize: 1, rate: 1 }],
        }),
      /kling21.*X.*duration.*number/,
    ],
    [
      "an ordering operator on a string fact",
      (m) =>
        m.kling21.tiers.push({
          name: "X",
          conditions: {
            fact: "aspect_ratio",
            operator: "greaterThan",
            value: "1:1",
          },
          meters: [{ metric: "duration", unitSize: 1, rate: 1 }],
        }),
      /kling21.*X.*greaterThan.*number fact.*aspect_ratio/,
    ],
  ])("rejects a mapping with %s", (_name, mutate, message) => {
    const mapping = defaults();
    mutate(mapping);
    expect(() => validateCreditMapping(mapping, listModels())).toThrow(message);
  });

  it("names TIERED_CREDIT_MAPPING in its errors", () => {
    const mapping = defaults();
    delete mapping.kling21;
    expect(() => validateCreditMapping(mapping, listModels())).toThrow(
      /TIERED_CREDIT_MAPPING/,
    );
  });
});
