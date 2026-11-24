/** Downloads images (a template's sample photos, say) as files the reference uploader can take. */
export async function urlsAsFiles(urls: readonly string[], signal: AbortSignal, name = "reference"): Promise<File[]> {
  return Promise.all(
    urls.map(async (url, index) => {
      const response = await fetch(url, { signal });
      if (!response.ok) throw new Error("Image unavailable");
      const blob = await response.blob();
      return new File([blob], `${name}-${index + 1}.jpg`, { type: blob.type || "image/jpeg" });
    }),
  );
}
