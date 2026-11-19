import { describe, expect, it } from "vitest";
import { imageSize } from "../../src/lib/imageSize.js";

function png(width: number, height: number): Buffer {
  const header = Buffer.alloc(24);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(header);
  header.writeUInt32BE(13, 8);
  header.write("IHDR", 12, "ascii");
  header.writeUInt32BE(width, 16);
  header.writeUInt32BE(height, 20);
  return header;
}

/** A JPEG with an APP1 segment before its baseline frame header. */
function jpeg(width: number, height: number, app1Bytes = 64): Buffer {
  const app1 = Buffer.alloc(4 + app1Bytes);
  app1.writeUInt16BE(0xffe1, 0);
  app1.writeUInt16BE(app1Bytes + 2, 2);
  const sof = Buffer.alloc(11);
  sof.writeUInt16BE(0xffc0, 0);
  sof.writeUInt16BE(9, 2);
  sof[4] = 8;
  sof.writeUInt16BE(height, 5);
  sof.writeUInt16BE(width, 7);
  return Buffer.concat([Buffer.from([0xff, 0xd8]), app1, sof]);
}

// The first 32 bytes of real files made with cwebp.
const WEBP_LOSSY =
  "52494646601b00005745425056503820541b000090c9009d012a1c0230013e91"; // 540×304
const WEBP_LOSSLESS =
  "52494646aef40000574542505650384ca1f400002f1bc24b004d506c23499224"; // 540×304
const WEBP_EXTENDED =
  "52494646da00000057454250565038580a000000100000004001007a0000414c"; // 321×123

describe("imageSize", () => {
  it("reads a PNG", () => {
    expect(imageSize(png(1448, 1086))).toEqual({ width: 1448, height: 1086 });
  });

  it("reads a JPEG past its metadata", () => {
    expect(imageSize(jpeg(4032, 3024, 20_000))).toEqual({
      width: 4032,
      height: 3024,
    });
  });

  it.each([
    ["lossy", WEBP_LOSSY, { width: 540, height: 304 }],
    ["lossless", WEBP_LOSSLESS, { width: 540, height: 304 }],
    ["extended", WEBP_EXTENDED, { width: 321, height: 123 }],
  ])("reads a %s WebP", (_, hex, size) => {
    expect(imageSize(Buffer.from(hex, "hex"))).toEqual(size);
  });

  it("returns null for other bytes, a cut-off header or a zero size", () => {
    expect(
      imageSize(Buffer.from("GIF89a and more bytes here......")),
    ).toBeNull();
    expect(imageSize(jpeg(10, 10).subarray(0, 40))).toBeNull();
    expect(imageSize(png(0, 10))).toBeNull();
  });
});
