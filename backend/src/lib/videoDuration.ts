/** How much of each end of a clip `videoDuration` may need: MP4/MOV keep their header (moov) at the start or the end. */
export const VIDEO_HEADER_BYTES = 1024 * 1024;

const MVHD = Buffer.from("mvhd", "ascii");

/**
 * The length in seconds of an MP4 or QuickTime clip, read from its movie
 * header box (`mvhd`) in `bytes` (the start or the end of the file), or null
 * when the box isn't there or doesn't add up.
 */
export function videoDuration(bytes: Buffer): number | null {
  for (
    let at = bytes.indexOf(MVHD);
    at !== -1;
    at = bytes.indexOf(MVHD, at + 4)
  ) {
    // After the type: version (1 byte) and flags (3), then the times, the timescale and the duration.
    const version = bytes[at + 4];
    let timescale: number;
    let duration: number;
    if (version === 0 && at + 24 <= bytes.length) {
      timescale = bytes.readUInt32BE(at + 16);
      duration = bytes.readUInt32BE(at + 20);
    } else if (version === 1 && at + 36 <= bytes.length) {
      timescale = bytes.readUInt32BE(at + 24);
      duration = Number(bytes.readBigUInt64BE(at + 28));
    } else {
      continue;
    }
    if (timescale > 0 && duration > 0) return duration / timescale;
  }
  return null;
}
