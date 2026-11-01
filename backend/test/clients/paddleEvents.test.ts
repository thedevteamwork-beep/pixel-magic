import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { parsePaddleEvent } from "../../src/clients/paddleEvents.js";

const fixture = (name: string): Record<string, unknown> =>
  JSON.parse(
    readFileSync(
      new URL(`../fixtures/paddle/${name}.json`, import.meta.url),
      "utf8",
    ),
  );

describe("parsePaddleEvent", () => {
  it("parses transaction.completed", () => {
    expect(parsePaddleEvent(fixture("transaction.completed"))).toMatchObject({
      kind: "transaction",
      eventId: "evt_txn_01",
      eventType: "transaction.completed",
      occurredAt: new Date("2026-03-10T12:00:05Z"),
      txn: {
        id: "txn_01",
        origin: "api",
        status: "completed",
        subscriptionId: "sub_01",
        priceId: "pri_01",
        totalCents: "1000",
        currency: "USD",
        customData: { user_id: "user-1" },
        billingPeriod: {
          startsAt: new Date("2026-03-10T12:00:00Z"),
          endsAt: new Date("2026-04-10T12:00:00Z"),
        },
      },
    });
  });

  it("parses subscription.updated with a scheduled cancel", () => {
    expect(parsePaddleEvent(fixture("subscription.updated"))).toMatchObject({
      kind: "subscription",
      sub: {
        id: "sub_01",
        status: "active",
        priceId: "pri_01",
        canceledAt: null,
        scheduledChange: {
          action: "cancel",
          effectiveAt: new Date("2026-04-10T12:00:00Z"),
        },
      },
    });
  });

  it("parses subscription.canceled", () => {
    expect(parsePaddleEvent(fixture("subscription.canceled"))).toMatchObject({
      kind: "subscription",
      sub: {
        status: "canceled",
        scheduledChange: null,
        canceledAt: new Date("2026-04-10T12:00:00Z"),
      },
    });
  });

  it("treats unknown event types as other", () => {
    expect(
      parsePaddleEvent({
        event_id: "evt_x",
        event_type: "address.created",
        occurred_at: "2026-03-10T12:00:00Z",
        data: {},
      }),
    ).toMatchObject({ kind: "other", eventId: "evt_x" });
  });

  it("throws on a malformed transaction.completed", () => {
    const bad = fixture("transaction.completed");
    bad.data = { id: "txn_01" };
    expect(() => parsePaddleEvent(bad)).toThrow(ZodError);
  });
});
