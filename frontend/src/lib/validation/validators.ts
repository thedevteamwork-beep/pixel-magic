/**
 * A validator takes a value (and, optionally, all the form values for cross-field checks)
 * and returns an error message, or null when the value is fine. Nothing here is tied to
 * strings or to one form: build validators for any type and combine them in a list.
 */
export type Validator<T = unknown, Values = unknown> = (value: T, values?: Values) => string | null;

/** A fixed message, or one built from the offending value. */
export type Message<T = unknown> = string | ((value: T) => string);

const resolve = <T>(message: Message<T> | undefined, value: T, fallback: string): string =>
  typeof message === "function" ? message(value) : (message ?? fallback);

export const trimContent = (value: string): string => value.trim();

const isBlank = (value: unknown): boolean =>
  value === null ||
  value === undefined ||
  (typeof value === "string" && !value.trim()) ||
  (Array.isArray(value) && value.length === 0);

/** Fails for null, undefined, blank text and empty arrays. Numbers and booleans always pass. */
export const isNotEmpty =
  <T = unknown>(message?: Message<T>): Validator<T> =>
  (value) =>
    isBlank(value) ? resolve(message, value, "This field is required.") : null;

/** Length of trimmed text, or the number of items in an array. Set `min`, `max` or both. */
export const isLength =
  <T extends string | readonly unknown[]>(
    { min, max }: { min?: number; max?: number },
    message?: Message<T>,
  ): Validator<T> =>
  (value) => {
    const length = typeof value === "string" ? trimContent(value).length : value.length;
    if (min !== undefined && length < min)
      return resolve(message, value, `Use at least ${min} ${typeof value === "string" ? "characters" : "items"}.`);
    if (max !== undefined && length > max)
      return resolve(message, value, `Use ${max} ${typeof value === "string" ? "characters" : "items"} or fewer.`);
    return null;
  };

/** Text-only alias of isLength, for readability at the call site. */
export const isTextLength = (range: { min?: number; max?: number }, message?: Message<string>): Validator<string> =>
  isLength<string>(range, message);

export const isInRange =
  ({ min, max }: { min?: number; max?: number }, message?: Message<number>): Validator<number> =>
  (value) => {
    if (!Number.isFinite(value) || (min !== undefined && value < min) || (max !== undefined && value > max)) {
      return resolve(
        message,
        value,
        min !== undefined && max !== undefined ? `Use a number from ${min} to ${max}.` : "Use a valid number.",
      );
    }
    return null;
  };

export const isOneOf =
  <T>(options: readonly T[], message?: Message<T>): Validator<T> =>
  (value) =>
    options.includes(value) ? null : resolve(message, value, "Choose a supported option.");

export const matchesPattern =
  (pattern: RegExp, message: Message<string>): Validator<string> =>
  (value) =>
    pattern.test(trimContent(value)) ? null : resolve(message, value, "");

/** Escape hatch: any rule you can write as a true/false check. */
export const satisfies =
  <T, Values = unknown>(predicate: (value: T, values: Values) => boolean, message: Message<T>): Validator<T, Values> =>
  (value, values) =>
    predicate(value, values as Values) ? null : resolve(message, value, "");

/** Runs the validators only when the condition holds, e.g. "required only in edit mode". */
export const when =
  <T, Values = unknown>(
    condition: (value: T, values: Values) => boolean,
    ...validators: readonly Validator<T, Values>[]
  ): Validator<T, Values> =>
  (value, values) =>
    condition(value, values as Values) ? runValidators(value, validators, values) : null;

/** Changes the value before the validators see it, e.g. trim text or read `.length`. */
export const transform =
  <From, To, Values = unknown>(
    map: (value: From) => To,
    ...validators: readonly Validator<To, Values>[]
  ): Validator<From, Values> =>
  (value, values) =>
    runValidators(map(value), validators, values);

/** Shorthand for transform(trimContent, …) so surrounding spaces never count. */
export const trimmed = <Values = unknown>(
  ...validators: readonly Validator<string, Values>[]
): Validator<string, Values> => transform<string, string, Values>(trimContent, ...validators);

/** Returns the first error from the list, or null when every validator passes. */
export function runValidators<T, Values = unknown>(
  value: T,
  validators: readonly Validator<T, Values>[],
  values?: Values,
): string | null {
  for (const validator of validators) {
    const error = validator(value, values);
    if (error) return error;
  }
  return null;
}

/** Every error from the list instead of just the first. */
export function collectErrors<T, Values = unknown>(
  value: T,
  validators: readonly Validator<T, Values>[],
  values?: Values,
): string[] {
  return validators.flatMap((validator) => validator(value, values) ?? []);
}

/** Validators per field of a values object; fields without an entry are not checked. */
export type FieldRules<V> = { [K in keyof V]?: readonly Validator<V[K], V>[] };
export type FieldErrors<V> = { [K in keyof V]?: string };

/** Validates a whole values object against its rules. Values are never modified. */
export function validateFields<V extends object>(
  values: V,
  rules: FieldRules<V>,
): { ok: boolean; errors: FieldErrors<V> } {
  const errors: FieldErrors<V> = {};
  for (const key of Object.keys(rules) as (keyof V)[]) {
    const error = runValidators(values[key], (rules[key] ?? []) as readonly Validator<V[keyof V], V>[], values);
    if (error) errors[key] = error;
  }
  return { ok: Object.keys(errors).length === 0, errors };
}
