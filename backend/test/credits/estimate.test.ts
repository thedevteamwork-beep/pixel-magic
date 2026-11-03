import { describe, expect, it } from "vitest";
import { DEFAULT_TIERED_CREDIT_MAPPING } from "../../src/credits/defaultTieredCreditMapping.js";
import type { TieredCreditMapping } from "../../src/credits/tieredCredits.js";
import { fluxSchnell } from "../../src/models/flux-schnell/index.js";
import { kling21 } from "../../src/models/kling21/index.js";
import { listModels } from "../../src/models/registry.js";
import { optionsValidator } from "../../src/models/schemaGenerator.js";
import type { ModelDefinition, ModelSchema } from "../../src/models/types.js";
import {
  creditRange,
  estimateCredits,
  loadCreditMapping,
} from "../../src/services/credits/estimate.js";
import { readmeExampleMapping } from "../helpers/creditMappings.js";

/** The default mapping with flux-schnell's one meter changed. */
function fluxMeter(meter: object): TieredCreditMapping {
  return {
    ...DEFAULT_TIERED_CREDIT_MAPPING,
    "flux-schnell": {
      tiers: [
        {
          name: "Basic",
          isDefault: true,
          meters: [{ metric: "images", unitSize: 1, rate: 1, ...meter }],
        },
      ],
    },
  };
}

describe("creditRange", () => {
  it("with the default mapping: kling21 30 to 60, flux 1 to 4", () => {
    const deps = { creditMapping: DEFAULT_TIERED_CREDIT_MAPPING };
    expect(creditRange(deps, kling21)).toEqual({ min: 30, max: 60 });
    expect(creditRange(deps, fluxSchnell)).toEqual({ min: 1, max: 4 });
  });

  it("includes image jobs: the README mapping's dearest kling21 job is 10 s from an image", () => {
    // "Image to video": credits 5 + 10 s x rate 7 = 75.
    const deps = { creditMapping: readmeExampleMapping() };
    expect(creditRange(deps, kling21)).toEqual({ min: 30, max: 75 });
  });
});

/** kling21 with an extra `style` option: an enum with no default, so it can be left out. */
function klingWithStyle(): ModelDefinition {
  const schema: ModelSchema = {
    ...kling21.schema,
    input: {
      ...kling21.schema.input,
      style: { type: "string", description: "A look", enum: ["a", "b"] },
    },
  };
  return { ...kling21, schema, options: optionsValidator(schema) };
}

describe("creditRange with an option that can be left out", () => {
  it("prices the job that leaves it out too", () => {
    // Only a job with no style matches "Plain": 10 s x 100 = 1000.
    const creditMapping: TieredCreditMapping = {
      kling21: {
        tiers: [
          DEFAULT_TIERED_CREDIT_MAPPING.kling21!.tiers[0]!,
          {
            name: "Plain",
            conditions: { fact: "style", operator: "notIn", value: ["a", "b"] },
            meters: [{ metric: "duration", unitSize: 1, rate: 100 }],
          },
        ],
      },
    };
    expect(creditRange({ creditMapping }, klingWithStyle())).toEqual({
      min: 30,
      max: 1000,
    });
  });
});

describe("loadCreditMapping", () => {
  it("returns the validated mapping", () => {
    expect(
      loadCreditMapping(DEFAULT_TIERED_CREDIT_MAPPING, listModels()),
    ).toEqual(DEFAULT_TIERED_CREDIT_MAPPING);
  });

  it.each([
    [
      "a floor tier that prices 1 image at 0",
      { unitSize: 10, round: "floor" },
      /at 0 credits/,
    ],
    ["a huge rate", { rate: 1e12 }, /at 1000000000000 credits/],
  ])("refuses %s, naming the model and the tier", (_name, meter, price) => {
    const start = () => loadCreditMapping(fluxMeter(meter), listModels());
    expect(start).toThrow(
      /^TIERED_CREDIT_MAPPING invalid \(flux-schnell, tier Basic\): /,
    );
    expect(start).toThrow(price);
    expect(start).toThrow(/it must be 1 to 2147483647/);
  });

  it("refuses a price only an image job reaches", () => {
    // The image tier floors 5 s to 0 units, so a 5 s image job costs 0.
    const mapping = readmeExampleMapping();
    mapping.kling21!.tiers[1]!.credits = 0;
    mapping.kling21!.tiers[1]!.meters = [
      { metric: "duration", unitSize: 10, rate: 7, round: "floor" },
    ];
    expect(() => loadCreditMapping(mapping, listModels())).toThrow(
      /^TIERED_CREDIT_MAPPING invalid \(kling21, tier Image to video\): .*"image":true.* at 0 credits/,
    );
  });

  it("still fails a bad mapping on its shape first", () => {
    expect(() => loadCreditMapping({}, listModels())).toThrow(
      /TIERED_CREDIT_MAPPING invalid \(flux-schnell\): the model has no mapping entry/,
    );
  });
});

describe("estimateCredits", () => {
  it("keeps its own price guard as a backstop behind the startup check", () => {
    // Set the mapping directly, skipping loadCreditMapping.
    const deps = { creditMapping: fluxMeter({ unitSize: 10, round: "floor" }) };
    expect(() =>
      estimateCredits(deps, fluxSchnell, { options: {}, uploadCount: 0 }),
    ).toThrow(
      /^TIERED_CREDIT_MAPPING invalid \(flux-schnell, tier Basic\): .* at 0 credits/,
    );
    const huge = { creditMapping: fluxMeter({ rate: 1e12 }) };
    expect(() =>
      estimateCredits(huge, fluxSchnell, { options: {}, uploadCount: 0 }),
    ).toThrow(/it must be 1 to 2147483647/);
  });

  it("returns the tier's base credits next to the breakdown", () => {
    const deps = { creditMapping: readmeExampleMapping() };
    expect(
      estimateCredits(deps, kling21, {
        options: { duration: "5" },
        uploadCount: 1,
      }),
    ).toEqual({
      creditsPerJob: 40,
      tier: "Image to video",
      baseCredits: 5,
      breakdown: [
        { unit: "duration", quantity: 5, units: 5, rate: 7, credits: 35 },
      ],
    });
  });
});
