import type {
  BillingFacts,
  FieldSchema,
  ModelDefinition,
} from "../models/types.js";

// `GET /v1/models` shows the cheapest and the dearest job, and startup checks
// that every job is priced in range, by pricing every job a model can take:
// each option combination at each upload count. A model with more
// combinations than this is a startup error.
export const MAX_BILLING_SAMPLES = 10_000;

type OptionValue = string | number | boolean;

/**
 * The whole numbers from min to max. It stops one past the cap: a longer
 * list is too many combinations anyway, and is never built.
 */
function wholeNumbers(min: number, max: number): number[] {
  const values: number[] = [];
  for (let n = Math.ceil(min); n <= max; n++) {
    if (values.length > MAX_BILLING_SAMPLES) break;
    values.push(n);
  }
  return values;
}

/** Stands in for what a user types in a required free-text option; a price can't depend on it. */
const FREE_TEXT_SAMPLE = "sample";

/**
 * The values one option can take. `undefined` means "left out", which a
 * string with no default allows unless it is required.
 */
function optionChoices(field: FieldSchema): (OptionValue | undefined)[] {
  const canLeaveOut =
    field.type === "string" &&
    field.default === undefined &&
    field.required !== true;
  // 1. an enum: each value, and left out when it can be
  if (field.type === "string" && field.enum) {
    const values: (OptionValue | undefined)[] = [...field.enum];
    if (canLeaveOut) values.push(undefined);
    return values;
  }
  // 2. required free text: a sample text, since it can't be left out
  if (field.type === "string" && field.required) return [FREE_TEXT_SAMPLE];
  // 3. other free text: its default, or left out when it has none
  if (field.type === "string") return [field.default];
  // 4. an integer: every value from minimum to maximum
  if (field.type === "integer") {
    return wholeNumbers(field.minimum, field.maximum);
  }
  // 5. a boolean: both
  if (field.type === "boolean") return [true, false];
  // 6. the image is not an option; the upload count covers it
  return [];
}

/**
 * Every job a model can take, as the facts it is priced on: each combination
 * of its options (the prompt and the image aside) at each upload count from
 * `uploads.min` to `uploads.max`, built the way a job's facts are. Throws,
 * naming the model, above MAX_BILLING_SAMPLES combinations.
 */
export function billingSamples(model: ModelDefinition): BillingFacts[] {
  // Step 1: the choices for each option, and the upload counts.
  const options: [string, (OptionValue | undefined)[]][] = [];
  for (const [name, field] of Object.entries(model.schema.input)) {
    if (name === "prompt" || field.type === "image") continue;
    options.push([name, optionChoices(field)]);
  }
  const uploadCounts = wholeNumbers(model.uploads.min, model.uploads.max);

  // Step 2: count the combinations before building any.
  let count = uploadCounts.length;
  for (const [, choices] of options) count *= choices.length;
  if (count > MAX_BILLING_SAMPLES) {
    throw new Error(
      `Model ${model.key} has more than ${MAX_BILLING_SAMPLES} option and upload combinations to price`,
    );
  }
  if (count === 0) {
    throw new Error(`Model ${model.key} has no option or upload combination`);
  }

  // Step 3: every combination of options, then each at every upload count.
  let combos: Record<string, OptionValue>[] = [{}];
  for (const [name, choices] of options) {
    combos = combos.flatMap((combo) =>
      choices.map((value) =>
        value === undefined ? combo : { ...combo, [name]: value },
      ),
    );
  }
  return uploadCounts.flatMap((uploadCount) =>
    combos.map((combo) =>
      model.billingInputs({ options: model.options.parse(combo), uploadCount }),
    ),
  );
}
