import { describe, expect, it } from "vitest";
import { checkoutPath, finishPath, nextStep, parseTransactionId, runOnce } from "@/lib/billing/purchase";

describe("nextStep", () => {
  it("sends a checkout result to the checkout page", () => {
    expect(nextStep({ action: "checkout", transactionId: "txn_01abc", checkoutUrl: null })).toEqual({
      kind: "checkout",
      path: "/checkout?_ptxn=txn_01abc",
    });
  });

  it("describes a scheduled change", () => {
    expect(nextStep({ action: "scheduled", effectiveAt: "2026-12-01T12:00:00.000Z" })).toEqual({
      kind: "done",
      message: "Your plan changes on Dec 1, 2026.",
    });
  });

  it("describes a reverted change", () => {
    expect(nextStep({ action: "reverted" })).toEqual({
      kind: "done",
      message: "Your scheduled change was undone.",
    });
  });

  it("describes a canceled plan", () => {
    expect(nextStep({ action: "canceled" })).toEqual({
      kind: "done",
      message: "Your plan was canceled.",
    });
  });
});

describe("paths", () => {
  it("builds checkout and finish paths", () => {
    expect(checkoutPath("txn_01abc")).toBe("/checkout?_ptxn=txn_01abc");
    expect(finishPath("txn_01abc")).toBe("/checkout/finish?txn=txn_01abc");
  });
});

describe("parseTransactionId", () => {
  it("keeps a valid id", () => {
    expect(parseTransactionId("txn_01h2abc")).toBe("txn_01h2abc");
  });

  it.each([null, undefined, "", "abc", "txn_", "txn_01/../x", "txn_" + "a".repeat(196)])("rejects %s", (value) => {
    expect(parseTransactionId(value)).toBeNull();
  });
});

describe("runOnce", () => {
  it("ignores calls while one is in flight", async () => {
    let release!: (v: string) => void;
    let calls = 0;
    const guarded = runOnce(() => {
      calls += 1;
      return new Promise<string>((resolve) => (release = resolve));
    });
    const first = guarded();
    expect(await guarded()).toBeUndefined();
    release("ok");
    expect(await first).toBe("ok");
    expect(calls).toBe(1);
  });

  it("runs again after success or failure", async () => {
    let calls = 0;
    const ok = runOnce(async () => ++calls);
    await ok();
    await ok();
    expect(calls).toBe(2);

    let failures = 0;
    const bad = runOnce(async () => {
      failures += 1;
      throw new Error("x");
    });
    await expect(bad()).rejects.toThrow("x");
    await expect(bad()).rejects.toThrow("x");
    expect(failures).toBe(2);
  });
});
