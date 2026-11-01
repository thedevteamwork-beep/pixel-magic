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
});
