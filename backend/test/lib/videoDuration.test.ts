import { describe, expect, it } from "vitest";
import { videoDuration } from "../../src/lib/videoDuration.js";

/** A movie header box, as MP4/MOV files carry it. */
function mvhd(version: 0 | 1, timescale: number, duration: number): Buffer {
  const body = Buffer.alloc(version === 0 ? 100 : 112);
  body[0] = version;
  if (version === 0) {
    body.writeUInt32BE(timescale, 12);
    body.writeUInt32BE(duration, 16);
  } else {
    body.writeUInt32BE(timescale, 20);
    body.writeBigUInt64BE(BigInt(duration), 24);
  }
  const head = Buffer.alloc(8);
  head.writeUInt32BE(body.length + 8, 0);
  head.write("mvhd", 4, "ascii");
  return Buffer.concat([head, body]);
}

describe("videoDuration", () => {
  it("reads a version 0 header, wherever it sits in the bytes", () => {
    const bytes = Buffer.concat([
      Buffer.from("....ftypisom....moov"),
      mvhd(0, 1000, 8500),
    ]);
    expect(videoDuration(bytes)).toBe(8.5);
  });

  it("reads a version 1 header", () => {
    expect(videoDuration(mvhd(1, 600, 7200))).toBe(12);
  });

  it("returns null without a header, or with one that doesn't add up", () => {
    expect(videoDuration(Buffer.from("not a movie at all"))).toBeNull();
    expect(videoDuration(mvhd(0, 0, 100))).toBeNull();
    expect(videoDuration(mvhd(0, 1000, 8500).subarray(0, 20))).toBeNull();
  });
});
