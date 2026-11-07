"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, ApiError, newIdempotencyKey } from "@/lib/api/client";
import type { ModelKind, PublicModel, UploadResponse } from "@/lib/api/types";
import { notifyCreditsChanged } from "@/lib/balance";
import { defaultOptions, imageField, optionFields } from "@/lib/generate/formFromSchema";
import { messageForError } from "@/lib/generate/messages";
import { submitGeneration } from "@/lib/generate/submit";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { fieldClasses } from "@/app/generate/fieldClasses";
import { JobResult } from "@/app/generate/JobResult";
import { OptionField } from "@/app/generate/OptionField";
import { useJobPolling } from "@/app/generate/useJobPolling";
import { Button } from "@/ui/Button";

async function uploadFile(upload: UploadResponse, file: File): Promise<void> {
  const storage = createSupabaseBrowserClient().storage;
  const { error } = await storage.from(upload.bucket).uploadToSignedUrl(upload.path, upload.token, file);
  if (error) throw error;
}

function isSessionEnded(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 401 || error.code === "UNAUTHENTICATED");
}

function isNetworkError(error: unknown): boolean {
  return error instanceof ApiError && error.code === "NETWORK_ERROR";
}

function showJobInUrl(jobId: string) {
  window.history.replaceState(null, "", `/generate?job=${encodeURIComponent(jobId)}`);
}

export function GenerateForm({ initialJobId }: { initialJobId: string | null }) {
  const router = useRouter();
  const [models, setModels] = useState<PublicModel[] | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [modelKey, setModelKey] = useState("");
  const [prompt, setPrompt] = useState("");
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [file, setFile] = useState<File | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<unknown>(null);
  const [retrying, setRetrying] = useState(false);

  // One Idempotency-Key per Generate click; kept for a retry after a network error.
  const keyRef = useRef<string | null>(null);
  const submittingRef = useRef(false);
  const jobIdRef = useRef<string | null>(initialJobId);

  const kindOf = (key: string): ModelKind => models?.find((m) => m.key === key)?.kind ?? "image";
  const { job, error: pollError, polling, start, clear } = useJobPolling(kindOf);

  const model = models?.find((m) => m.key === modelKey);

  function selectModel(next: PublicModel) {
    setModelKey(next.key);
    setValues(defaultOptions(next));
    setFile(undefined);
    edited();
  }

  // Any edit makes a new request, so it gets a new key.
  function edited() {
    keyRef.current = null;
    setRetrying(false);
  }

  useEffect(() => {
    api
      .get<PublicModel[]>("/v1/models")
      .then((list) => {
        setModels(list);
        if (list[0]) selectModel(list[0]);
      })
      .catch(setLoadError);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // A reload with ?job=<id> resumes polling.
  useEffect(() => {
    if (initialJobId) start(initialJobId);
  }, [initialJobId, start]);

  // An ended session sends the user to sign in, then back to this job.
  const error = submitError ?? pollError;
  useEffect(() => {
    if (!isSessionEnded(error)) return;
    const back = jobIdRef.current ? `/generate?job=${jobIdRef.current}` : "/generate";
    router.push(`/sign-in?next=${encodeURIComponent(back)}`);
  }, [error, router]);

  async function generate(event: FormEvent) {
    event.preventDefault();
    if (!model || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError(null);
    clear();
    keyRef.current ??= newIdempotencyKey();

    try {
      const created = await submitGeneration({
        api,
        uploadFile,
        model,
        prompt,
        values,
        file,
        idempotencyKey: keyRef.current,
      });
      edited();
      jobIdRef.current = created.jobId;
      showJobInUrl(created.jobId);
      notifyCreditsChanged();
      start(created.jobId, model.kind);
    } catch (err) {
      // After a network error the key stays, so "Try again" cannot create a second job.
      const keepKey = isNetworkError(err);
      if (!keepKey) keyRef.current = null;
      setRetrying(keepKey);
      setSubmitError(err);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  if (loadError) return <p role="alert">{messageForError(loadError)}</p>;
  if (!models) return <p className="text-sm text-subtle">Loading models…</p>;

  const busy = submitting || polling;
  const image = model ? imageField(model) : undefined;
  const promptField = model?.input.prompt;

  return (
    <div className="max-w-xl">
      <form onSubmit={generate} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Model
          <select
            className={fieldClasses}
            value={modelKey}
            disabled={busy}
            onChange={(event) => selectModel(models.find((m) => m.key === event.target.value)!)}
          >
            {models.map((m) => (
              <option key={m.key} value={m.key}>
                {m.name} ({m.credits.min}–{m.credits.max} credits)
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Prompt
          <textarea
            className={fieldClasses}
            rows={4}
            value={prompt}
            disabled={busy}
            required={promptField?.type === "string" && Boolean(promptField.required)}
            maxLength={promptField?.type === "string" ? promptField.maxLength : undefined}
            onChange={(event) => {
              edited();
              setPrompt(event.target.value);
            }}
          />
        </label>

        {model &&
          optionFields(model).map(([name, field]) => (
            <OptionField
              key={`${model.key}:${name}`}
              name={name}
              field={field}
              value={values[name]}
              disabled={busy}
              onChange={(value) => {
                edited();
                setValues((current) => ({ ...current, [name]: value }));
              }}
            />
          ))}

        {image && (
          <label className="flex flex-col gap-1 text-sm">
            <span>
              Image <span className="text-subtle">— {image.description}</span>
            </span>
            <input
              key={model?.key}
              type="file"
              accept={image.supportedContentTypes.join(",")}
              required={image.required}
              disabled={busy}
              onChange={(event) => {
                edited();
                setFile(event.target.files?.[0]);
              }}
            />
          </label>
        )}

        <Button type="submit" disabled={busy || !model} className="self-start">
          {retrying ? "Try again" : "Generate"}
        </Button>
      </form>

      {submitError != null && !isSessionEnded(submitError) && (
        <p role="alert" className="mt-4 text-sm text-red-500">
          {messageForError(submitError)}
        </p>
      )}
      <JobResult
        job={job}
        error={pollError}
        onCheckAgain={() => job && start(job.jobId, kindOf(job.model))}
      />
    </div>
  );
}
