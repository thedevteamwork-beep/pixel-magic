import Transport from "winston-transport";
import { describe, expect, it } from "vitest";
import { createLogger } from "../src/logger.js";

class MemoryTransport extends Transport {
  constructor(private readonly sink: Record<string, unknown>[]) {
    super();
  }
  override log(info: Record<string, unknown>, next: () => void): void {
    this.sink.push(info);
    next();
  }
}

describe("createLogger", () => {
  it("adds severity and stack", () => {
    const records: Record<string, unknown>[] = [];
    const logger = createLogger("info", [new MemoryTransport(records)]);
    logger.error("boom", { err: new Error("x") });
    expect(records[0]).toMatchObject({ severity: "ERROR", message: "boom" });
    expect(JSON.stringify(records[0])).toContain("Error: x");
  });
  it("maps warn, info and debug severities", () => {
    const records: Record<string, unknown>[] = [];
    const logger = createLogger("debug", [new MemoryTransport(records)]);
    logger.warn("a");
    logger.info("b");
    logger.debug("c");
    expect(records.map((r) => r.severity)).toEqual([
      "WARNING",
      "INFO",
      "DEBUG",
    ]);
  });
});
