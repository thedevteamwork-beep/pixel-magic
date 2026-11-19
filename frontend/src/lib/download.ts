/**
 * Saves a file under a readable name. Storage URLs are on another origin,
 * where `<a download>` is ignored, so the bytes are fetched first; if that
 * fails the file opens in a new tab instead.
 */
export async function downloadFile(url: string, filename: string): Promise<void> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Download failed (${response.status})`);
    const objectUrl = URL.createObjectURL(await response.blob());
    const link = Object.assign(document.createElement("a"), { href: objectUrl, download: filename });
    link.click();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  } catch {
    window.open(url, "_blank", "noopener");
  }
}
