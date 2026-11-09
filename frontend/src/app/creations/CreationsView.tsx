"use client";

import { useEffect, useRef, useState } from "react";
import { CreationCard } from "@/app/creations/CreationCard";
import { api } from "@/lib/api/client";
import type { JobList, JobView, PublicModel } from "@/lib/api/types";
import { appendPage, replaceJob } from "@/lib/creations/pages";
import { messageForError } from "@/lib/generate/messages";
import { Button, ButtonWithLink } from "@/ui/Button";

const PAGE_SIZE = 24;
const REFRESH_MS = 8000;

function isRunning(job: JobView): boolean {
  return job.status !== "completed" && job.status !== "failed";
}

export function CreationsView() {
  const [jobs, setJobs] = useState<JobView[] | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [models, setModels] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  /** Bumped by "Try again" to re-run the load effect. */
  const [attempt, setAttempt] = useState(0);

  const jobsRef = useRef<JobView[]>([]);
  const hasRunning = jobs?.some(isRunning) ?? false;

  useEffect(() => {
    jobsRef.current = jobs ?? [];
  }, [jobs]);

  useEffect(() => {
    let current = true;
    api.get<JobList>(`/v1/jobs?limit=${PAGE_SIZE}`).then(
      (page) => {
        if (!current) return;
        setJobs(page.jobs);
        setNextCursor(page.nextCursor);
      },
      (e) => current && setError(messageForError(e)),
    );
    // Names are a nicety: without them a card shows the model key.
    api.get<PublicModel[]>("/v1/models").then(
      (list) => current && setModels(Object.fromEntries(list.map((m) => [m.key, m.name]))),
      () => {},
    );
    return () => {
      current = false;
    };
  }, [attempt]);

  // One timer for the whole page; it runs only while some job is still running.
  useEffect(() => {
    if (!hasRunning) return;
    let current = true;
    const timer = setInterval(() => {
      for (const job of jobsRef.current.filter(isRunning)) {
        api.get<JobView>(`/v1/jobs/${encodeURIComponent(job.jobId)}`).then(
          (fresh) => current && setJobs((list) => list && replaceJob(list, fresh)),
          () => {}, // try again on the next tick
        );
      }
    }, REFRESH_MS);
    return () => {
      current = false;
      clearInterval(timer);
    };
  }, [hasRunning]);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const page = await api.get<JobList>(`/v1/jobs?limit=${PAGE_SIZE}&cursor=${encodeURIComponent(nextCursor)}`);
      setJobs((list) => appendPage(list ?? [], page.jobs));
      setNextCursor(page.nextCursor);
    } catch (e) {
      setError(messageForError(e));
    } finally {
      setLoadingMore(false);
    }
  }

  if (error && !jobs) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 text-sm">
        <p>{error}</p>
        <Button
          className="mt-4"
          size="sm"
          variant="outline"
          onClick={() => {
            setError(null);
            setAttempt((n) => n + 1);
          }}
        >
          Try again
        </Button>
      </div>
    );
  }
  if (!jobs) return <p className="text-sm text-subtle">Loading your creations…</p>;

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-sm text-subtle">Nothing here yet.</p>
        <ButtonWithLink href="/generate">Start creating</ButtonWithLink>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* MasonryGrid only renders bare media, so cards (status, date, credits, download) sit in a plain grid. */}
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {jobs.map((job) => (
          <CreationCard key={job.jobId} job={job} modelName={models[job.model] ?? job.model} />
        ))}
      </ul>
      {error && (
        <p role="alert" className="text-center text-sm text-muted">
          {error}
        </p>
      )}
      {nextCursor && (
        <div className="flex justify-center">
          <Button variant="outline" disabled={loadingMore} onClick={() => void loadMore()}>
            {error ? "Try again" : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}
