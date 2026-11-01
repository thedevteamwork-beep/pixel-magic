import { describe, expect, it } from "vitest";
import { FakePaddle } from "../fakes/paddle.js";
import { signPaddle } from "../helpers/paddleEvents.js";

const body = JSON.stringify({ event_id: "evt_1", event_type: "x" });
const fake = new FakePaddle();

describe("FakePaddle.verifyWebhook (real SDK verification)", () => {
  it("accepts a correct signature", async () => {
    expect(await fake.verifyWebhook(body, signPaddle(body))).toBe(true);
  });

  it.each([
    ["missing", undefined],
    ["wrong secret", signPaddle(body, "nope")],
    ["tampered body", signPaddle("other-body")],
    ["garbage", "sig-of-other-body"],
  ])("rejects %s", async (_name, sig) => {
    expect(await fake.verifyWebhook(body, sig)).toBe(false);
  });

  it("accepts a correctly signed body the SDK cannot build into an entity", async () => {
    const odd = JSON.stringify({
      event_id: "evt_x",
      event_type: "transaction.completed",
      occurred_at: "2026-03-10T12:00:00Z",
      data: {},
    });
    expect(await fake.verifyWebhook(odd, signPaddle(odd))).toBe(true);
  });
});
