import { ApiError } from "@/lib/api/client";
import { messageForError } from "@/lib/generate/messages";
import type { ImageRun } from "@/types/image-generator";

/** A run still worth a card: not finished, finished but not yet seen, or on the canvas now. */
function stillRelevant(run: ImageRun, viewingId: string | null): boolean {
  return run.status !== "done" || !run.seen || run.id === viewingId;
}

/** Runs to keep, dropping finished ones the user has already seen elsewhere: those live in History. */
export function pruneRuns(runs: readonly ImageRun[], viewingId: string | null): ImageRun[] {
  return runs.filter((run) => stillRelevant(run, viewingId));
}

/**
 * Runs to keep when a new one starts: finished ones leave (seen or not, they
 * are in History and a toast already offered them), so the cards never pile up.
 */
export function runsBeforeNew(runs: readonly ImageRun[]): ImageRun[] {
  return runs.filter((run) => run.status !== "done");
}

/**
 * The cards under the canvas. They only appear when more than one run
 * matters, so generating one image after another looks just as it always has.
 */
export function stripRuns(runs: readonly ImageRun[], viewingId: string | null): ImageRun[] {
  const shown = pruneRuns(runs, viewingId);
  return shown.length > 1 ? shown : [];
}

export function runningCount(runs: readonly ImageRun[]): number {
  return runs.filter((run) => run.status === "running").length;
}

/** Plain words for why a generation didn't come through, with what to do about it. */
export function generationError(error: unknown): string {
  if (error instanceof ApiError && error.code === "INSUFFICIENT_CREDITS") {
    return "You don’t have enough credits for this. Add credits on the Pricing page, or create fewer images.";
  }
  if (error instanceof ApiError && error.code === "TOO_MANY_ACTIVE_JOBS") {
    return "You have as many generations running as you can at once, here or in another studio. Retry when one finishes.";
  }
  return messageForError(error);
}
