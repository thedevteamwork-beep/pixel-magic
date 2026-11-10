"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, ApiError, newIdempotencyKey } from "@/lib/api/client";
import type { PublicModel } from "@/lib/api/types";
import { notifyCreditsChanged } from "@/lib/balance";
import { defaultOptions } from "@/lib/generate/formFromSchema";
import { messageForError } from "@/lib/generate/messages";
import { submitGeneration } from "@/lib/generate/submit";
import { fieldClasses } from "@/app/generate/fieldClasses";
import { JobResult } from "@/app/generate/JobResult";
import { useJobPolling } from "@/app/generate/useJobPolling";
import { Button } from "@/ui/Button";

const DEFAULT_PROMPT = "A small red fox in a snowy forest, soft morning light, digital art";

// This page never uploads an image, so the upload step must not be reached.
async function noUpload(): Promise<void> {
  throw new Error("The test page does not upload images");
}

function isSessionEnded(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 401 || error.code === "UNAUTHENTICATED");
}

/** One button that creates an image with the first image model, then shows the result. */
export function TestImage() {
  // `undefined` while the models load, `null` when there is no image model.
  const [model, setModel] = useState<PublicModel | null | undefined>(undefined);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<unknown>(null);
  const submittingRef = useRef(false);
  const { job, error: pollError, polling, waiting, start, checkAgain, clear } = useJobPolling(() => "image");

  useEffect(() => {
    api
      .get<PublicModel[]>("/v1/models")
      .then((list) => setModel(list.find((m) => m.kind === "image") ?? null))
      .catch(setLoadError);
  }, []);

  async function generate(event: FormEvent) {
    event.preventDefault();
    if (!model || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError(null);
    clear();

    try {
      // A new key for every click: each click is a new test job.
      const created = await submitGeneration({
        api,
        uploadFile: noUpload,
        model,
        prompt,
        values: defaultOptions(model),
        idempotencyKey: newIdempotencyKey(),
      });
      notifyCreditsChanged();
      start(created.jobId, "image");
    } catch (err) {
      setSubmitError(err);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  if (loadError) return <p role="alert">{messageForError(loadError)}</p>;
  if (model === undefined) return <p className="text-sm text-subtle">Loading models…</p>;
  if (model === null) return <p role="alert">No image model is available.</p>;

  const busy = submitting || polling || waiting;
  const promptField = model.input.prompt;

  return (
    <div className="max-w-xl">
      <p className="mb-4 text-sm text-subtle">
        Model: {model.name} ({model.credits.min}–{model.credits.max} credits)
      </p>
      <form onSubmit={generate} className="flex flex-col gap-4">
        {promptField && (
          <label className="flex flex-col gap-1 text-sm">
            Prompt
            <textarea
              className={fieldClasses}
              rows={3}
              value={prompt}
              disabled={busy}
              required
              maxLength={promptField.type === "string" ? promptField.maxLength : undefined}
              onChange={(event) => setPrompt(event.target.value)}
            />
          </label>
        )}
        <Button type="submit" disabled={busy} className="self-start">
          {busy ? "Generating…" : "Generate image"}
        </Button>
      </form>

      {submitError != null && (
        <p role="alert" className="mt-4 text-sm text-red-500">
          {messageForError(submitError)}{" "}
          {isSessionEnded(submitError) && (
            <Link href={`/sign-in?next=${encodeURIComponent("/test")}`} className="underline">
              Sign in
            </Link>
          )}
        </p>
      )}
      <JobResult job={job} waiting={waiting} error={pollError} onCheckAgain={checkAgain} />
    </div>
  );
}
