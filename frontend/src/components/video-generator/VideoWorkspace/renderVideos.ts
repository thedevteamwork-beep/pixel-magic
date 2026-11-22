import { api, newIdempotencyKey } from "@/lib/api/client";
import type { JobView, ProjectView } from "@/lib/api/types";
import { notifyCreditsChanged } from "@/lib/balance";
import { pollJob } from "@/lib/generate/pollJob";
import { submitGeneration, uploadInputFile } from "@/lib/generate/submit";
import { uploadFile } from "@/lib/generate/uploadFile";
import { jobToVideoResults, jobValues } from "@/lib/video-generator/models";
import {
  createVideoProject,
  isProjectGone,
  sameProjectData,
  updateVideoProject,
  videoProjectData,
  videoProjectTitle,
  VIDEO_PROJECT_TYPE,
} from "@/lib/video-generator/projects";
import type { VideoModel, VideoResult, VideoSettings } from "@/types/video-generator";
import { SAMPLE_RENDER_MS, VIDEO_POLL_INTERVAL_MS, VIDEO_WAIT_LIMIT_MS } from "../constants";
import { sampleVideoJob } from "../fixtures/sampleVideos";

/** The studio stopped waiting on a render that is still running; it appears in the feed on a later visit. */
export class StillRenderingError extends Error {
  constructor() {
    super("This is taking longer than usual. It keeps rendering and will appear here when you come back.");
    this.name = "StillRenderingError";
  }
}

/** One file a render sends: uploaded already (`uploadId`), or to upload (`file`). `key` names it in the studio. */
export type RenderUpload = { key: string; uploadId?: string; file?: File };

export type RenderRequest = {
  model: VideoModel;
  /** Fitted to the model; `count` videos are made, each its own job. */
  settings: VideoSettings;
  prompt: string;
  /** The files to send, by the model's upload field (`image`, `end_image`, `reference_images`, `video`). */
  uploads: Record<string, RenderUpload[]>;
  /** The video idea to add these takes to; without one, a new project is made. */
  project?: ProjectView;
  /** Shown on the results until their video loads. */
  poster?: string;
  /** Development only: pretend, without the API. */
  sample?: boolean;
  /** The ids each job is created with, kept across a retry so it never creates twice. */
  keys: string[];
};

/**
 * What a render saved: the project it is in, and every file's upload by its
 * studio key, so the next take (or a retry) reuses them instead of uploading again.
 */
export type RenderSaved = { project: ProjectView; uploadIds: Record<string, string> };

const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });

/** Polls one job to the end, giving up (not failing) after the wait limit, counted from when it was created. */
export async function followJob(job: JobView, signal: AbortSignal): Promise<JobView> {
  const waited = Date.now() - Date.parse(job.createdAt);
  const deadline = new AbortController();
  const timer = setTimeout(
    () => deadline.abort(),
    Math.max(VIDEO_WAIT_LIMIT_MS - (Number.isFinite(waited) ? waited : 0), 10_000),
  );
  const stop = () => deadline.abort();
  signal.addEventListener("abort", stop, { once: true });
  try {
    return await pollJob(job.jobId, { get: api.get, intervalMs: VIDEO_POLL_INTERVAL_MS, signal: deadline.signal });
  } catch (error) {
    if (deadline.signal.aborted && !signal.aborted) throw new StillRenderingError();
    throw error;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", stop);
  }
}

/** The video idea for this render: the open one, updated only when its settings changed, or a new one. */
async function saveProject(request: RenderRequest, fields: Record<string, string[]>): Promise<ProjectView> {
  const data = videoProjectData({ ...request.settings, prompt: request.prompt }, fields);
  const open = request.project;
  if (!open) return createVideoProject(api, data);
  if (sameProjectData(open, data)) return open;
  try {
    return await updateVideoProject(api, open.projectId, data);
  } catch (error) {
    // Deleted meanwhile (on another device, say): this render starts a new idea instead.
    if (isProjectGone(error)) return createVideoProject(api, data);
    throw error;
  }
}

/** A stand-in project for sample mode, which never calls the API. */
function sampleProject(request: RenderRequest): ProjectView {
  const now = new Date().toISOString();
  return (
    request.project ?? {
      projectId: `sample-${crypto.randomUUID()}`,
      type: VIDEO_PROJECT_TYPE,
      title: videoProjectTitle(request.prompt),
      data: videoProjectData({ ...request.settings, prompt: request.prompt }),
      cover: null,
      upload: null,
      createdAt: now,
      updatedAt: now,
    }
  );
}

/**
 * Makes the videos of one Generate, as the AI influencer does with its portraits:
 *   1. uploads the start image, once per idea;
 *   2. saves the idea as a project (the first time) or updates it (when its settings changed);
 *   3. creates one job per video in the project;
 *   4. waits for all of them.
 * `onSaved` hears about step 2 as soon as it is done, so the studio keeps the idea even if a render
 * then fails. Returns every video that finished; throws only when none did. Credits are reserved
 * per job and returned for any that fail.
 */
export async function renderVideos(
  request: RenderRequest,
  signal: AbortSignal,
  onSaved: (saved: RenderSaved) => void,
): Promise<VideoResult[]> {
  const { model, settings, prompt, poster } = request;
  const values = jobValues(model, settings);

  if (request.sample) {
    const project = sampleProject(request);
    onSaved({ project, uploadIds: {} });
    await wait(SAMPLE_RENDER_MS, signal);
    const sent = Object.fromEntries(
      Object.entries(request.uploads).map(([field, files]) => [field, files.map((file) => file.key)]),
    );
    return request.keys.flatMap(() => {
      const { job, poster: samplePoster } = sampleVideoJob(
        model.id,
        { ...values, prompt, ...sent },
        model.source.credits.min,
      );
      return jobToVideoResults({ ...job, projectId: project.projectId }, { poster: poster ?? samplePoster });
    });
  }

  // 1. Every file, uploaded once (in order, so a failure keeps the uploads before it): later takes reuse them.
  const uploadIds: Record<string, string> = {};
  const fields: Record<string, string[]> = {};
  for (const [field, files] of Object.entries(request.uploads)) {
    fields[field] = [];
    for (const upload of files) {
      const id = upload.uploadId ?? (upload.file ? await uploadInputFile(api, uploadFile, upload.file) : undefined);
      if (!id) throw new Error("A file to send is missing. Please add it again.");
      uploadIds[upload.key] = id;
      fields[field].push(id);
    }
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
  }

  // 2. The idea, saved before any credits are spent.
  const project = await saveProject(request, fields);
  onSaved({ project, uploadIds });
  if (signal.aborted) throw new DOMException("Aborted", "AbortError");

  // 3. One job per video, in the project.
  const created: JobView[] = [];
  try {
    for (const key of request.keys) {
      created.push(
        await submitGeneration({
          api,
          uploadFile,
          model: model.source,
          prompt,
          values,
          files: [],
          fieldUploads: fields,
          idempotencyKey: key,
          projectId: project.projectId,
        }),
      );
    }
  } finally {
    if (created.length) notifyCreditsChanged();
  }

  // 4. Wait for every take; show what finished.
  const outcomes = await Promise.allSettled(created.map((job) => followJob(job, signal)));
  notifyCreditsChanged();
  const results = outcomes.flatMap((outcome) =>
    outcome.status === "fulfilled" ? jobToVideoResults(outcome.value, { poster: poster ?? project.upload?.url }) : [],
  );
  if (!results.length) {
    const failure = outcomes.find((outcome) => outcome.status === "rejected");
    throw failure?.status === "rejected" ? failure.reason : new Error("No video was made.");
  }
  return results;
}

export function newRenderKeys(count: number): string[] {
  return Array.from({ length: count }, () => newIdempotencyKey());
}
