import {
  DEFAULT_ASPECT_RATIO,
  INFLUENCER_MODEL_KEY,
  PROJECT_JOBS_PAGE_SIZE,
  PROJECT_TYPE,
  PROJECTS_PAGE_SIZE,
  VARIATION_COUNT,
  traitGroups,
} from "@/components/ai-influencer/constants";
import { ApiError, type ApiClient } from "@/lib/api/client";
import type { JobList, JobView, ProjectList, ProjectView, PublicModel } from "@/lib/api/types";
import { buildInput, defaultOptions, imageFieldName } from "@/lib/generate/formFromSchema";
import type { InfluencerTraits, InfluencerVariation, ReferencePhoto, TraitKey } from "@/types/ai-influencer";
import { composeInfluencerPrompt, userNotesFromPrompt } from "./prompt";

export type InfluencerProjectData = {
  traits: Partial<Record<TraitKey, string>>;
  extra?: string;
  archetypeId?: string;
  /** The image shape, e.g. "4:5". Projects saved before it existed have none. */
  aspectRatio?: string;
  /** The face photo's upload; the backend returns it signed as the project's `upload`. */
  photoUploadId?: string;
  /** The picked saved style (an influencer-style project). */
  styleId?: string;
};

/** What an influencer saves besides its traits. */
export type SavedSettings = Pick<InfluencerProjectData, "aspectRatio" | "photoUploadId" | "styleId">;

const traitKeys: TraitKey[] = traitGroups.flatMap((group) => group.fields.map((field) => field.key));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** What is saved in a project: only the traits that were chosen, and extra direction when there is some. */
export function projectData(
  traits: InfluencerTraits,
  archetypeId: string | null,
  settings: SavedSettings = {},
): InfluencerProjectData {
  const data: InfluencerProjectData = { traits: {} };
  for (const key of traitKeys) {
    if (traits[key]) data.traits[key] = traits[key];
  }
  if (traits.extra.trim()) data.extra = traits.extra.trim();
  if (archetypeId) data.archetypeId = archetypeId;
  if (settings.aspectRatio) data.aspectRatio = settings.aspectRatio;
  if (settings.photoUploadId) data.photoUploadId = settings.photoUploadId;
  if (settings.styleId) data.styleId = settings.styleId;
  return data;
}

/** The saved project is the whole state, so traits it does not mention are empty (not the defaults). */
export function traitsFromProject(view: ProjectView): InfluencerTraits {
  const traits = { name: view.title, extra: "" } as InfluencerTraits;
  for (const key of traitKeys) traits[key] = "";

  const saved = view.data.traits;
  if (isRecord(saved)) {
    for (const key of traitKeys) {
      const value = saved[key];
      if (typeof value === "string") traits[key] = value;
    }
  }
  if (typeof view.data.extra === "string") traits.extra = view.data.extra;
  return traits;
}

/** The character type the project was started from, or null. */
export function archetypeFromProject(view: ProjectView): string | null {
  return typeof view.data.archetypeId === "string" ? view.data.archetypeId : null;
}

/** The aspect ratio the project was saved with, or null (projects saved before it existed). */
export function aspectRatioFromProject(view: ProjectView): string | null {
  return typeof view.data.aspectRatio === "string" ? view.data.aspectRatio : null;
}

/** The saved face photo, from the project's signed upload; null when none was saved. */
export function photoFromProject(view: ProjectView): ReferencePhoto | null {
  return view.upload ? { url: view.upload.url, name: "Saved photo", uploadId: view.upload.uploadId } : null;
}

/** The saved style's project id, or null. */
export function styleIdFromProject(view: ProjectView): string | null {
  return typeof view.data.styleId === "string" ? view.data.styleId : null;
}

/** The images of completed jobs, in the order given. */
export function variationsFromJobs(jobs: JobView[], alt: string): InfluencerVariation[] {
  const variations: InfluencerVariation[] = [];
  for (const job of jobs) {
    if (job.status !== "completed") continue;
    const { aspect_ratio: ratio, prompt } = job.input;
    for (const output of job.outputs) {
      if (!output.url) continue;
      const variation: InfluencerVariation = { id: `${job.jobId}-${output.index}`, url: output.url, alt };
      if (typeof ratio === "string") variation.aspectRatio = ratio;
      if (typeof prompt === "string") variation.userPrompt = userNotesFromPrompt(prompt);
      variations.push(variation);
    }
  }
  return variations;
}

/** The reference images for a generation: the face photo and the style image, each optional. */
export type References<T> = { photo?: T; style?: T };

/**
 * The references the model actually receives: the photo first, then the style, as many as its image field takes.
 * A model without an image field receives none.
 */
export function usedReferences<T>(model: PublicModel, references: References<T>): References<T> {
  const name = imageFieldName(model);
  const field = name ? model.input[name] : undefined;
  if (field?.type !== "image") return {};

  const used: References<T> = {};
  let room = field.maxItems;
  if (references.photo !== undefined && room > 0) {
    used.photo = references.photo;
    room -= 1;
  }
  if (references.style !== undefined && room > 0) used.style = references.style;
  return used;
}

/** The model every influencer is made with: Nano Banana 2 when the backend lists it, otherwise the first one. */
export function influencerModel(models: PublicModel[]): PublicModel | undefined {
  return models.find((model) => model.key === INFLUENCER_MODEL_KEY) ?? models[0];
}

/** The aspect ratios the model offers, in its own order; none when it has no `aspect_ratio` option. */
export function aspectRatios(model: PublicModel | undefined): string[] {
  const field = model?.input.aspect_ratio;
  return field?.type === "string" && field.enum ? [...field.enum] : [];
}

/** `wanted` when the model offers it, else 4:5, else the model's own default, else 4:5. */
export function pickAspectRatio(model: PublicModel | undefined, wanted: string | null): string {
  const offered = aspectRatios(model);
  if (wanted && offered.includes(wanted)) return wanted;
  if (offered.length === 0 || offered.includes(DEFAULT_ASPECT_RATIO)) return DEFAULT_ASPECT_RATIO;
  const field = model?.input.aspect_ratio;
  return field?.type === "string" && typeof field.default === "string" ? field.default : DEFAULT_ASPECT_RATIO;
}

/**
 * The job input for a set of traits: the picked aspect ratio (or a portrait size for a model without one), up to
 * VARIATION_COUNT images, the references and the prompt.
 */
export function influencerInput(
  model: PublicModel,
  traits: InfluencerTraits,
  uploadIds: References<string>,
  aspectRatio: string,
): Record<string, unknown> {
  const values = defaultOptions(model);
  if (aspectRatios(model).length > 0) values.aspect_ratio = pickAspectRatio(model, aspectRatio);

  const size = model.input.image_size;
  if (size?.type === "string" && size.enum?.includes("portrait_4_3")) values.image_size = "portrait_4_3";

  const count = model.input.num_images;
  if (count?.type === "integer") values.num_images = Math.min(VARIATION_COUNT, count.maximum);

  const used = usedReferences(model, uploadIds);
  const prompt = composeInfluencerPrompt(traits, { photo: used.photo !== undefined, style: used.style !== undefined });
  const references = [used.photo, used.style].filter((id): id is string => id !== undefined);
  return buildInput(model, { prompt, values, uploadIds: references });
}

export function influencerImageModels(models: PublicModel[]): PublicModel[] {
  return models.filter((model) => model.kind === "image");
}

export function createInfluencerProject(
  api: ApiClient,
  title: string,
  data: InfluencerProjectData,
): Promise<ProjectView> {
  return api.post<ProjectView>("/v1/projects", { type: PROJECT_TYPE, title, data });
}

export function updateInfluencerProject(
  api: ApiClient,
  id: string,
  patch: { title?: string; data?: InfluencerProjectData },
): Promise<ProjectView> {
  return api.patch<ProjectView>(`/v1/projects/${encodeURIComponent(id)}`, patch);
}

export function listInfluencerProjects(api: ApiClient, cursor?: string): Promise<ProjectList> {
  const query = `type=${PROJECT_TYPE}&limit=${PROJECTS_PAGE_SIZE}`;
  return api.get<ProjectList>(`/v1/projects?${query}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`);
}

export function getInfluencerProject(api: ApiClient, id: string): Promise<ProjectView> {
  return api.get<ProjectView>(`/v1/projects/${encodeURIComponent(id)}`);
}

export function listProjectJobs(api: ApiClient, id: string): Promise<JobList> {
  return api.get<JobList>(`/v1/jobs?projectId=${encodeURIComponent(id)}&limit=${PROJECT_JOBS_PAGE_SIZE}`);
}

export function deleteInfluencerProject(api: ApiClient, id: string): Promise<void> {
  return api.delete<void>(`/v1/projects/${encodeURIComponent(id)}`);
}

/** The project a request named is gone: it was deleted, for example on another device. */
export class ProjectDeletedError extends Error {
  readonly projectId: string;

  constructor(projectId: string) {
    super("This influencer was deleted. Start a new one.");
    this.name = "ProjectDeletedError";
    this.projectId = projectId;
  }
}

/** Waits for a request about project `projectId`. Its 404 becomes a ProjectDeletedError; other errors pass through. */
export async function catchDeletedProject<T>(projectId: string, request: Promise<T>): Promise<T> {
  try {
    return await request;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) throw new ProjectDeletedError(projectId);
    throw error;
  }
}

/** Starts a generation inside the project. A retry with the same key returns the same job. */
export function createInfluencerJob(
  api: ApiClient,
  p: { model: PublicModel; projectId: string; input: Record<string, unknown>; idempotencyKey: string },
): Promise<JobView> {
  const path = `/v1/jobs/${encodeURIComponent(p.model.plugin)}/${encodeURIComponent(p.model.operation)}`;
  return api.post<JobView>(path, { input: p.input, projectId: p.projectId }, { idempotencyKey: p.idempotencyKey });
}
