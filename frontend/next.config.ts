import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // Remote media used by reusable legacy widgets and ImageKit templates.
    remotePatterns: [
      new URL("https://static.higgsfield.ai/**"),
      new URL("https://static-public-media.higgsfield.ai/**"),
      {
        protocol: "https",
        hostname: "cdn.pixelbin.io",
        pathname: "/v2/dummy-cloudname/original/input1/**",
      },
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
