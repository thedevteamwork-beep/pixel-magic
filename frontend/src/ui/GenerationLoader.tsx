"use client";

import dynamic from "next/dynamic";

/**
 * The loader shown where an image is being made. Loaded only when it is shown, so its animation and video (about
 * 1.5 MB) aren't part of the page; a plain box holds the space until they arrive. Fills its parent.
 */
export const GenerationLoader = dynamic(
  () => import("./GenerationLoaderView").then((mod) => mod.GenerationLoaderView),
  {
    ssr: false,
    loading: () => <div aria-hidden="true" className="h-full w-full bg-[var(--surface-raised)]" />,
  },
);
