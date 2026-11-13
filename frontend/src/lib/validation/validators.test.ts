import { describe, expect, it } from "vitest";
import {
  collectErrors,
  isInRange,
  isLength,
  isNotEmpty,
  isOneOf,
  isTextLength,
  matchesPattern,
  runValidators,
  satisfies,
  transform,
  trimContent,
  trimmed,
  validateFields,
  when,
} from "./validators";

describe("validators", () => {
  it("isNotEmpty handles text, arrays, null and non-text values", () => {
    expect(isNotEmpty("Required")("   ")).toBe("Required");
    expect(isNotEmpty()(" a ")).toBeNull();
    expect(isNotEmpty()([])).toBe("This field is required.");
    expect(isNotEmpty()(null)).toBe("This field is required.");
    expect(isNotEmpty()(0)).toBeNull();
  });

  it("isLength works on trimmed text and on arrays", () => {
    const text = isLength<string>({ min: 2, max: 5 });
    expect(text(" a ", {})).toBe("Use at least 2 characters.");
    expect(text("  abcde  ", {})).toBeNull();
    expect(text("abcdef", {})).toBe("Use 5 characters or fewer.");
    expect(isLength<string[]>({ max: 2 })(["a", "b", "c"], {})).toBe("Use 2 items or fewer.");
    expect(isTextLength({ max: 3 }, (value) => `${value} is too long`)("abcd", {})).toBe("abcd is too long");
  });

  it("isInRange, isOneOf and matchesPattern", () => {
    expect(isInRange({ min: 1, max: 4 })(5, {})).toBe("Use a number from 1 to 4.");
    expect(isInRange({ min: 1, max: 4 })(2, {})).toBeNull();
    expect(isInRange({ min: 1 })(Number.NaN, {})).toBe("Use a valid number.");
    expect(isOneOf(["a", "b"])("c", {})).toBe("Choose a supported option.");
    expect(matchesPattern(/^[a-z]+$/, "Letters only")(" ab ", {})).toBeNull();
    expect(matchesPattern(/^[a-z]+$/, "Letters only")("a1", {})).toBe("Letters only");
  });

  it("satisfies accepts any rule", () => {
    expect(satisfies((value: number) => value % 2 === 0, "Use an even number")(3, {})).toBe("Use an even number");
  });

  it("when only runs the validators if the condition holds", () => {
    const rule = when<string, { mode: string }>((_, values) => values.mode === "edit", isNotEmpty("Add one"));
    expect(rule("", { mode: "create" })).toBeNull();
    expect(rule("", { mode: "edit" })).toBe("Add one");
  });

  it("transform and trimmed change the value first", () => {
    expect(trimmed(isNotEmpty("empty"))("   ", undefined)).toBe("empty");
    expect(transform((value: string[]) => value.length, isInRange({ max: 1 }))(["a", "b"], undefined)).toBe(
      "Use a valid number.",
    );
    expect(trimContent("  x ")).toBe("x");
  });

  it("runValidators returns the first error; collectErrors returns all", () => {
    const rules = [isNotEmpty<string>("empty"), isTextLength({ min: 3 })];
    expect(runValidators("", rules)).toBe("empty");
    expect(runValidators("ab", rules)).toBe("Use at least 3 characters.");
    expect(runValidators("abc", [])).toBeNull();
    expect(collectErrors("", rules)).toEqual(["empty", "Use at least 3 characters."]);
  });
});

describe("validateFields", () => {
  type Form = { name: string; tags: string[]; count: number; confirm: string };
  const base: Form = { name: "Mira", tags: ["a"], count: 2, confirm: "Mira" };

  it("checks each field with its own type and ignores fields without rules", () => {
    const result = validateFields<Form>(
      { ...base, name: " ", tags: [], count: 9 },
      {
        name: [isNotEmpty("Name it")],
        tags: [isNotEmpty("Add a tag")],
        count: [isInRange({ min: 1, max: 4 })],
      },
    );
    expect(result.ok).toBe(false);
    expect(result.errors).toEqual({ name: "Name it", tags: "Add a tag", count: "Use a number from 1 to 4." });
  });

  it("passes all values to cross-field rules", () => {
    const rules = { confirm: [satisfies<string, Form>((value, values) => value === values.name, "Must match name")] };
    expect(validateFields(base, rules).ok).toBe(true);
    expect(validateFields({ ...base, confirm: "x" }, rules).errors).toEqual({ confirm: "Must match name" });
  });
});
