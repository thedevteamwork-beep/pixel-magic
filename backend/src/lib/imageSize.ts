/** An image's pixel size. */
export type ImageSize = { width: number; height: number };

/** How much of a file `imageSize` may need: enough for JPEG files with large metadata before the frame header. */
export const IMAGE_HEADER_BYTES = 512 * 1024;

function png(bytes: Buffer): ImageSize | null {
  // Signature, then the IHDR chunk: width and height are its first 8 bytes.
  if (bytes.length < 24 || bytes.readUInt32BE(0) !== 0x89504e47) return null;
  if (bytes.toString("ascii", 12, 16) !== "IHDR") return null;
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

// JPEG frame headers (SOF0–SOF15, except DHT, JPG and DAC) carry the size.
const SOF_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

function jpeg(bytes: Buffer): ImageSize | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 <= bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    const marker = bytes[offset + 1]!;
    // Fill bytes and markers without a length.
    if (marker === 0xff) {
      offset += 1;
      continue;
    }
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    const length = bytes.readUInt16BE(offset + 2);
    if (SOF_MARKERS.has(marker)) {
      return {
        height: bytes.readUInt16BE(offset + 5),
        width: bytes.readUInt16BE(offset + 7),
      };
    }
    if (length < 2) return null;
    offset += 2 + length;
  }
  return null;
}

function webp(bytes: Buffer): ImageSize | null {
  if (
    bytes.length < 30 ||
    bytes.toString("ascii", 0, 4) !== "RIFF" ||
    bytes.toString("ascii", 8, 12) !== "WEBP"
  )
    return null;
  const chunk = bytes.toString("ascii", 12, 16);
  // Lossy: a 14-bit width and height after the frame start code.
  if (chunk === "VP8 ") {
    return {
      width: bytes.readUInt16LE(26) & 0x3fff,
      height: bytes.readUInt16LE(28) & 0x3fff,
    };
  }
  // Lossless: 14-bit width-1 and height-1, packed after the signature byte.
  if (chunk === "VP8L") {
    const bits = bytes.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  // Extended: 24-bit canvas width-1 and height-1.
  if (chunk === "VP8X") {
    return {
      width: bytes.readUIntLE(24, 3) + 1,
      height: bytes.readUIntLE(27, 3) + 1,
    };
  }
  return null;
}

/**
 * The pixel size of a PNG, JPEG or WebP from the start of its file, or null
 * if the bytes aren't one of those (or the size isn't within them).
 */
export function imageSize(bytes: Buffer): ImageSize | null {
  const size = png(bytes) ?? jpeg(bytes) ?? webp(bytes);
  return size && size.width > 0 && size.height > 0 ? size : null;
}
