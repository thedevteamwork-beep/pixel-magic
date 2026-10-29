"use client";

import { createContext, useContext, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import type { TemplateFilters } from "@/types/landing";

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
const getReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const getServerReducedMotion = () => true;
function subscribePageVisibility(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}
const getPageVisibility = () => !document.hidden;
const getServerPageVisibility = () => true;
type MotionContextValue = { motionEnabled: boolean; reducedMotion: boolean; toggleMotion: () => void };
type FilterContextValue = { filters: TemplateFilters; setFilters: (filters: TemplateFilters) => void };
const MotionContext = createContext<MotionContextValue | null>(null);
const FilterContext = createContext<FilterContextValue | null>(null);

/** Separate contexts keep filter updates from rerendering every video. */
export function LandingProvider({ children }: { children: ReactNode }) {
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, getReducedMotion, getServerReducedMotion);
  const [motionOverride, setMotionOverride] = useState<boolean | null>(null);
  const pageVisible = useSyncExternalStore(subscribePageVisibility, getPageVisibility, getServerPageVisibility);
  const motionEnabled = (motionOverride ?? !reducedMotion) && pageVisible;
  const [filters, setFilters] = useState<TemplateFilters>({ category: "video", model: "all" });
  const motion = useMemo(() => ({ motionEnabled, reducedMotion,
    toggleMotion: () => setMotionOverride((current) => !(current ?? !reducedMotion)),
  }), [motionEnabled, reducedMotion]);
  const filtering = useMemo(() => ({ filters, setFilters }), [filters]);
  return <MotionContext value={motion}><FilterContext value={filtering}>{children}</FilterContext></MotionContext>;
}

export function useLandingMotion() {
  const value = useContext(MotionContext);
  if (!value) throw new Error("useLandingMotion requires LandingProvider");
  return value;
}

export function useTemplateFilters() {
  const value = useContext(FilterContext);
  if (!value) throw new Error("useTemplateFilters requires LandingProvider");
  return value;
}
