import { basename } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/** Mirrors Next's static image imports (an object with `src` under `/_next/static/media/`) so tests can import images. */
const staticImages = {
  name: "static-images",
  transform(_code: string, id: string) {
    if (!/\.(png|jpe?g|webp|avif)$/.test(id)) return null;
    return `export default { src: ${JSON.stringify(`/_next/static/media/${basename(id)}`)}, width: 1, height: 1 };`;
  },
};

export default defineConfig({
  plugins: [staticImages],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: { environment: "node" },
});
