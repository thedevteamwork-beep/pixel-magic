import type { JobView } from "@/lib/api/types";

/** Appends a page of jobs, skipping any job already in the list. */
export function appendPage(current: JobView[], page: JobView[]): JobView[] {
  const seen = new Set(current.map((job) => job.jobId));
  return [...current, ...page.filter((job) => !seen.has(job.jobId))];
}

/** Swaps in the fresh copy of a job, matched by `jobId`. */
export function replaceJob(list: JobView[], job: JobView): JobView[] {
  return list.map((existing) => (existing.jobId === job.jobId ? job : existing));
}
