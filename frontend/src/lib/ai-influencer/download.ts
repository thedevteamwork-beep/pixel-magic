import { downloadFile } from "@/lib/download";

/** "pixel-magic-mira-kapoor.png": the influencer's name (letters and numbers only) and the image's own extension. */
export function portraitFileName(name: string, url: string): string {
  const slug =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "influencer";
  const extension = new URL(url, "http://localhost").pathname.match(/\.(png|jpe?g|webp)$/i)?.[1].toLowerCase();
  return `pixel-magic-${slug}.${extension ?? "jpg"}`;
}

/** Saves the portrait on show under the influencer's name. */
export function downloadPortrait(name: string, url: string): Promise<void> {
  return downloadFile(url, portraitFileName(name, url));
}
