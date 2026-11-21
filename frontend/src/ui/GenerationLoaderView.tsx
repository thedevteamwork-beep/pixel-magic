"use client";

import { LottieSvg } from "lottie-react";
import { useState } from "react";
import animation from "@/assets/lottie/generation-loader.json";
import { cn } from "@/lib/cn";

/**
 * hinata's generation loader: the gradient video filling its box with the animation in the middle. Decorative; the
 * caller says what is being made. With reduced motion the video and the animation stay still.
 */
export function GenerationLoaderView({ className }: { className?: string }) {
  // Read once: the loader lives only while a generation runs, and this file only ever renders in the browser.
  const [reducedMotion] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  return (
    <div aria-hidden="true" className={cn("relative h-full w-full overflow-hidden", className)}>
      <video
        src="/media/generation-gradient.webm"
        autoPlay={!reducedMotion}
        loop
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        {/* The size sits on a wrapper: lottie-react's own stylesheet makes its element fill whatever box it is in. */}
        <div className="h-[30%] max-h-[100px] min-h-4 w-[30%] max-w-[100px] min-w-4">
          <LottieSvg src={animation} loop autoplay={!reducedMotion} />
        </div>
      </div>
    </div>
  );
}
