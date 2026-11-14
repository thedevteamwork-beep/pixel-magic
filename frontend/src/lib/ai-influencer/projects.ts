import {
  PROJECT_JOBS_PAGE_SIZE,
  PROJECT_TYPE,
  PROJECTS_PAGE_SIZE,
  VARIATION_COUNT,
  traitGroups,
} from "@/components/ai-influencer/constants";
import { ApiError, type ApiClient } from "@/lib/api/client";
import type { JobList, JobView, ProjectList, ProjectView, PublicModel } from "@/lib/api/types";
import { buildInput, defaultOptions, imageFieldName } from "@/lib/generate/formFromSchema";
import type { InfluencerTraits, InfluencerVariation, TraitKey } from "@/types/ai-influencer";
import { composeInfluencerPrompt } from "./prompt";

export type InfluencerProjectData = {
  traits: Partial<Record<TraitKey, string>>;
  extra?: string;
  archetypeId?: string;
};

const traitKeys: TraitKey[] = traitGroups.flatMap((group) => group.fields.map((field) => field.key));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** What is saved in a project: only the traits that were chosen, and extra direction when there is some. */
export function projectData(traits: InfluencerTraits, archetypeId: string | null): InfluencerProjectData {
  const data: InfluencerProjectData = { traits: {} };
  for (const key of traitKeys) {
    if (traits[key]) data.traits[key] = traits[key];
  }
  if (traits.extra.trim()) data.extra = traits.extra.trim();
  if (archetypeId) data.archetypeId = archetypeId;
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

/** The images of completed jobs, in the order given. */
export function variationsFromJobs(jobs: JobView[], alt: string): InfluencerVariation[] {
  const variations: InfluencerVariation[] = [];
  for (const job of jobs) {
    if (job.status !== "completed") continue;
    for (const output of job.outputs) {
      if (!output.url) continue;
      variations.push({ id: `${job.jobId}-${output.index}`, url: output.url, alt });
    }
  }
  return variations;
}

/** The job input for a set of traits: portrait shape, up to VARIATION_COUNT images, and the prompt. */
export function influencerInput(
  model: PublicModel,
  traits: InfluencerTraits,
  uploadIds: string[],
): Record<string, unknown> {
  const values = defaultOptions(model);

  const size = model.input.image_size;
  if (size?.type === "string" && size.enum?.includes("portrait_4_3")) values.image_size = "portrait_4_3";

  const count = model.input.num_images;
  if (count?.type === "integer") values.num_images = Math.min(VARIATION_COUNT, count.maximum);

  const hasReference = uploadIds.length > 0 && imageFieldName(model) !== undefined;
  const prompt = composeInfluencerPrompt(traits, hasReference);
  return buildInput(model, { prompt, values, uploadIds });
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
