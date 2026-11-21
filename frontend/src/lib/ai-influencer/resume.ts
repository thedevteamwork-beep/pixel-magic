import { SAMPLE_RENDER_MS } from "@/components/ai-influencer/constants";
import type { JobView } from "@/lib/api/types";
import { isActiveJob } from "@/lib/image-generator/results";
import type { InfluencerTraits } from "@/types/ai-influencer";

/** The newest job still running for one of these influencers (the list is newest first); none when all are done. */
export function pendingInfluencerJob(jobs: JobView[], influencerIds: ReadonlySet<string>): JobView | undefined {
  return jobs.find((job) => job.projectId !== null && influencerIds.has(job.projectId) && isActiveJob(job));
}

/** A sample Generate in progress, kept in the tab's session so leaving or refreshing the page doesn't lose it. */
export type PendingSample = {
  traits: InfluencerTraits;
  archetypeId: string | null;
  aspectRatio: string;
  projectId: string | null;
  startedAt: number;
};

const PENDING_SAMPLE_KEY = "pixel-magic:influencer-sample";
/** Older than this, a pending sample is forgotten instead of finished. */
const PENDING_SAMPLE_MAX_AGE_MS = 30 * 60_000;

export function savePendingSample(storage: Pick<Storage, "setItem">, pending: PendingSample): void {
  storage.setItem(PENDING_SAMPLE_KEY, JSON.stringify(pending));
}

export function clearPendingSample(storage: Pick<Storage, "removeItem">): void {
  storage.removeItem(PENDING_SAMPLE_KEY);
}

/**
 * The sample Generate left running, with how long its loader still has to show (0 when it finished while the page was
 * away). Null when there is none, or it is stale or unreadable.
 */
export function readPendingSample(
  storage: Pick<Storage, "getItem">,
  now: number,
): { pending: PendingSample; remainingMs: number } | null {
  let pending: PendingSample;
  try {
    pending = JSON.parse(storage.getItem(PENDING_SAMPLE_KEY) ?? "null") as PendingSample;
  } catch {
    return null;
  }
  if (!pending || typeof pending.startedAt !== "number" || typeof pending.traits?.name !== "string") return null;
  const elapsed = now - pending.startedAt;
  if (elapsed < 0 || elapsed > PENDING_SAMPLE_MAX_AGE_MS) return null;
  return { pending, remainingMs: Math.max(0, SAMPLE_RENDER_MS - elapsed) };
}
