import { ApiError, type ApiClient } from "@/lib/api/client";
import type { ProjectList, ProjectView } from "@/lib/api/types";
import type { VideoMode, VideoSettings } from "@/types/video-generator";
import { VIDEO_FIELDS } from "./models";

/** Projects of this type are video ideas. */
export const VIDEO_PROJECT_TYPE = "video";
const TITLE_LENGTH = 80;

/**
 * What a video project saves (the backend's `video` project type): the
 * direction and the settings of its latest render. Every render is a job in
 * the project, so reopening it shows all its takes.
 */
export type VideoProjectData = {
  prompt: string;
  mode: VideoMode;
  model: string;
  duration: number;
  aspectRatio: string;
  resolution?: string;
  audio: boolean;
  count: number;
  /** The start image's (or motion control's character) upload; the backend returns it signed as the project's `upload`. */
  startImageUploadId?: string;
  /** The other files the idea was made from, so it can be rendered again without uploading them. */
  endImageUploadId?: string;
  referenceUploadIds?: string[];
  clipUploadId?: string;
};

/** A short name for the project, from its prompt: what the history and the feed show. */
export function videoProjectTitle(prompt: string): string {
  const text = prompt.trim().replace(/\s+/g, " ");
  if (!text) return "Animated image";
  return text.length > TITLE_LENGTH ? `${text.slice(0, TITLE_LENGTH - 1).trimEnd()}…` : text;
}

/** What a project saves: the settings, and the upload ids it was sent, by the model's upload field. */
export function videoProjectData(
  settings: VideoSettings,
  fields: Record<string, readonly string[]> = {},
): VideoProjectData {
  const [startImageUploadId] = fields[VIDEO_FIELDS.image] ?? [];
  const [endImageUploadId] = fields[VIDEO_FIELDS.end] ?? [];
  const [clipUploadId] = fields[VIDEO_FIELDS.clip] ?? [];
  const references = fields[VIDEO_FIELDS.references] ?? [];
  return {
    prompt: settings.prompt.trim(),
    mode: settings.mode,
    model: settings.model,
    duration: settings.duration,
    aspectRatio: settings.aspectRatio,
    ...(settings.resolution ? { resolution: settings.resolution } : {}),
    audio: settings.audio,
    count: settings.count,
    ...(startImageUploadId ? { startImageUploadId } : {}),
    ...(endImageUploadId ? { endImageUploadId } : {}),
    ...(references.length ? { referenceUploadIds: [...references] } : {}),
    ...(clipUploadId ? { clipUploadId } : {}),
  };
}

/** The upload ids a project saved, by the model's upload field: a render of it sends them again. */
export function uploadFieldsFromProject(view: ProjectView): Record<string, string[]> {
  const data = view.data as Partial<VideoProjectData>;
  const fields: Record<string, string[]> = {};
  if (data.startImageUploadId) fields[VIDEO_FIELDS.image] = [data.startImageUploadId];
  if (data.endImageUploadId) fields[VIDEO_FIELDS.end] = [data.endImageUploadId];
  if (data.referenceUploadIds?.length) fields[VIDEO_FIELDS.references] = [...data.referenceUploadIds];
  if (data.clipUploadId) fields[VIDEO_FIELDS.clip] = [data.clipUploadId];
  return fields;
}

const MODES: readonly VideoMode[] = ["text", "image", "reference", "motion"];

/** The settings a project saved, over `base` for anything it doesn't say (older or partial data). */
export function settingsFromProject(view: ProjectView, base: VideoSettings): VideoSettings {
  const data = view.data;
  const text = (value: unknown, fallback: string) => (typeof value === "string" ? value : fallback);
  const number = (value: unknown, fallback: number) =>
    typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return {
    ...base,
    prompt: text(data.prompt, base.prompt),
    mode: MODES.includes(data.mode as VideoMode) ? (data.mode as VideoMode) : base.mode,
    model: text(data.model, base.model),
    duration: number(data.duration, base.duration),
    aspectRatio: text(data.aspectRatio, base.aspectRatio),
    resolution: text(data.resolution, base.resolution),
    audio: typeof data.audio === "boolean" ? data.audio : base.audio,
    count: number(data.count, base.count),
  };
}

/** Whether saving `next` would change what the project holds (so a render only patches when needed). */
export function sameProjectData(view: ProjectView, next: VideoProjectData): boolean {
  return JSON.stringify(sorted(view.data)) === JSON.stringify(sorted(next));
}

/** An object's entries in key order, so two with the same values compare equal. */
function sorted(value: object): [string, unknown][] {
  return Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
}

export function createVideoProject(api: ApiClient, data: VideoProjectData): Promise<ProjectView> {
  return api.post<ProjectView>("/v1/projects", {
    type: VIDEO_PROJECT_TYPE,
    title: videoProjectTitle(data.prompt),
    data,
  });
}

export function updateVideoProject(api: ApiClient, id: string, data: VideoProjectData): Promise<ProjectView> {
  return api.patch<ProjectView>(`/v1/projects/${encodeURIComponent(id)}`, {
    title: videoProjectTitle(data.prompt),
    data,
  });
}

export function listVideoProjects(api: ApiClient, limit: number): Promise<ProjectList> {
  return api.get<ProjectList>(`/v1/projects?type=${VIDEO_PROJECT_TYPE}&limit=${limit}`);
}

/** The project is gone (deleted, for example on another device): a 404 for a request that named it. */
export function isProjectGone(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}
