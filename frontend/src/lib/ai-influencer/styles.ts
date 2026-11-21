import { STYLE_PROJECT_TYPE, STYLES_PAGE_SIZE } from "@/components/ai-influencer/constants";
import type { ApiClient } from "@/lib/api/client";
import type { ProjectList, ProjectView } from "@/lib/api/types";
import type { StyleReference } from "@/types/ai-influencer";

/** A saved style from its project; null when the project came back without its image. */
export function styleFromProject(view: ProjectView): StyleReference | null {
  if (!view.upload) return null;
  return { id: view.projectId, name: view.title, uploadId: view.upload.uploadId, url: view.upload.url };
}

/** One saved style by its project id (the one an influencer saved), or null when its image is gone. */
export async function getStyleReference(api: ApiClient, id: string): Promise<StyleReference | null> {
  return styleFromProject(await api.get<ProjectView>(`/v1/projects/${encodeURIComponent(id)}`));
}

/** The user's saved styles, most recently saved first. Each image link is fresh for a day. */
export async function listStyleReferences(api: ApiClient): Promise<StyleReference[]> {
  const page = await api.get<ProjectList>(`/v1/projects?type=${STYLE_PROJECT_TYPE}&limit=${STYLES_PAGE_SIZE}`);
  return page.projects.map(styleFromProject).filter((style): style is StyleReference => style !== null);
}

/** Saves an uploaded image as a named style. The server checks the upload is the user's own and in storage. */
export async function saveStyleReference(api: ApiClient, name: string, uploadId: string): Promise<StyleReference> {
  const view = await api.post<ProjectView>("/v1/projects", {
    type: STYLE_PROJECT_TYPE,
    title: name,
    data: { uploadId },
  });
  const style = styleFromProject(view);
  if (!style) throw new Error("The style was saved without its image. Try again.");
  return style;
}
