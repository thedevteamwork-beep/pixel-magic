import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // Retained for reusable legacy widgets; the landing page uses local media.
    remotePatterns: [
      new URL("https://static.higgsfield.ai/**"),
      new URL("https://static-public-media.higgsfield.ai/**"),
    ],
  },
  turbopack: {
    rules: {
      // Only the Tailwind entry needs this loader. Rewriting *.module.css
      // as plain CSS would remove its scoped class-name exports.
      "globals.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
