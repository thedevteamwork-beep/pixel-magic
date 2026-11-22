import { describe, expect, it } from "vitest";
import { validateFields } from "@/lib/validation/validators";
import { MAX_NAME_LENGTH, textFieldRules, type TextValues } from "./constants";

describe("textFieldRules", () => {
  it("lets the name be left empty", () => {
    expect(validateFields<TextValues>({ name: "", extra: "" }, textFieldRules).ok).toBe(true);
    expect(validateFields<TextValues>({ name: "M", extra: "" }, textFieldRules).ok).toBe(true);
  });

  it("still caps the name's length", () => {
    const tooLong = validateFields<TextValues>({ name: "x".repeat(MAX_NAME_LENGTH + 1), extra: "" }, textFieldRules);
    expect(tooLong.ok).toBe(false);
  });
});
