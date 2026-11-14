"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type Dispatch,
  type ReactNode,
} from "react";
import {
  archetypes,
  defaultTraits,
  POLL_INTERVAL_MS,
  textFieldRules,
  traitGroups,
  type TextField,
  type TextValues,
} from "@/components/ai-influencer/constants";
import { MAX_REFERENCE_BYTES, REFERENCE_MIME_TYPES } from "@/constants/image-generator";
import {
  archetypeFromProject,
  catchDeletedProject,
  createInfluencerJob,
  createInfluencerProject,
  deleteInfluencerProject,
  getInfluencerProject,
  influencerImageModels,
  influencerInput,
  listInfluencerProjects,
  listProjectJobs,
  ProjectDeletedError,
  projectData,
  traitsFromProject,
  updateInfluencerProject,
  variationsFromJobs,
} from "@/lib/ai-influencer/projects";
import { api, ApiError, newIdempotencyKey } from "@/lib/api/client";
import type { JobView, ProjectView, PublicModel, UploadResponse } from "@/lib/api/types";
import { notifyCreditsChanged } from "@/lib/balance";
import { imageFieldName } from "@/lib/generate/formFromSchema";
import { messageForError } from "@/lib/generate/messages";
import { pollJob } from "@/lib/generate/pollJob";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  isInRange,
  isOneOf,
  runValidators,
  trimContent,
  validateFields,
  type FieldErrors,
  type FieldRules,
} from "@/lib/validation/validators";
import type { InfluencerTraits, InfluencerVariation, ReferencePhoto, StageView, TraitKey } from "@/types/ai-influencer";

type Status = "idle" | "generating";

type ProjectsStatus = "idle" | "loading" | "signed-out" | "error";

type State = {
  traits: InfluencerTraits;
  archetypeId: string | null;
  reference: ReferencePhoto | null;
  view: StageView;
  variations: InfluencerVariation[];
  selectedId: string | null;
  status: Status;
  error: string;
  fieldErrors: FieldErrors<TextValues>;
  /** The open influencer. Null until the first Generate creates its project. */
  projectId: string | null;
  /** The History list, most recently used first. */
  projects: ProjectView[];
  /** Where the next History page starts; null when there are no more. */
  projectsCursor: string | null;
  projectsStatus: ProjectsStatus;
  /** The image models the picker offers. */
  models: PublicModel[];
  modelKey: string;
};

type Action =
  | { type: "trait"; key: TraitKey | TextField; value: string }
  | { type: "invalid"; errors: FieldErrors<TextValues> }
  | { type: "sanitize"; values: TextValues }
  | { type: "archetype"; id: string; name?: string }
  | { type: "reference"; reference: ReferencePhoto | null }
  | { type: "view"; view: StageView }
  | { type: "reset" }
  | { type: "randomize"; picks: Partial<InfluencerTraits> }
  | { type: "start" }
  | { type: "done"; variations: InfluencerVariation[] }
  | { type: "fail"; message: string }
  | { type: "cancel" }
  | { type: "select"; id: string }
  | { type: "dismissError" }
  | { type: "models"; models: PublicModel[] }
  | { type: "model"; key: string }
  | { type: "projects"; projects: ProjectView[]; cursor: string | null; append?: boolean }
  | { type: "projectsStatus"; status: ProjectsStatus }
  | { type: "project"; view: ProjectView }
  | { type: "variations"; variations: InfluencerVariation[] }
  | { type: "removed"; id: string };

const initial: State = {
  traits: { ...defaultTraits },
  archetypeId: null,
  reference: null,
  view: "explore",
  variations: [],
  selectedId: null,
  status: "idle",
  error: "",
  fieldErrors: {},
  projectId: null,
  projects: [],
  projectsCursor: null,
  // The first page is requested on mount, so History starts out loading.
  projectsStatus: "loading",
  models: [],
  modelKey: "",
};

/** Keeps the first copy of each project. The list is ordered by `updated_at`, so one can show up on two pages. */
function withoutDuplicates(projects: ProjectView[]): ProjectView[] {
  const seen = new Set<string>();
  return projects.filter((project) => {
    if (seen.has(project.projectId)) return false;
    seen.add(project.projectId);
    return true;
  });
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "trait": {
      const fieldErrors = { ...state.fieldErrors };
      delete fieldErrors[action.key as TextField];
      return { ...state, traits: { ...state.traits, [action.key]: action.value }, fieldErrors };
    }
    case "invalid":
      return { ...state, fieldErrors: action.errors };
    case "sanitize":
      return { ...state, traits: { ...state.traits, ...action.values }, fieldErrors: {} };
    case "archetype": {
      const archetype = archetypes.find((item) => item.id === action.id);
      if (!archetype) return state;
      const name = action.name ?? state.traits.name;
      return {
        ...state,
        archetypeId: archetype.id,
        traits: { ...defaultTraits, name, extra: state.traits.extra, ...archetype.traits },
        fieldErrors: {},
      };
    }
    case "reference":
      return { ...state, reference: action.reference };
    case "view":
      return { ...state, view: action.view };
    case "reset":
      // A new influencer: no project yet, so nothing to show on the Result tab.
      return {
        ...state,
        traits: { ...defaultTraits },
        archetypeId: null,
        error: "",
        fieldErrors: {},
        projectId: null,
        variations: [],
        selectedId: null,
        view: state.view === "result" ? "explore" : state.view,
      };
    case "randomize":
      return { ...state, traits: { ...state.traits, ...action.picks }, archetypeId: null };
    case "start":
      return { ...state, status: "generating", error: "", view: "result" };
    case "done":
      return { ...state, status: "idle", variations: action.variations, selectedId: action.variations[0]?.id ?? null };
    case "fail":
      return { ...state, status: "idle", error: action.message };
    case "cancel":
      return { ...state, status: "idle" };
    case "select":
      return { ...state, selectedId: action.id };
    case "dismissError":
      return { ...state, error: "" };
    case "models":
      return { ...state, models: action.models, modelKey: action.models[0]?.key ?? "" };
    case "model":
      return { ...state, modelKey: action.key };
    case "projects": {
      const projects = action.append ? withoutDuplicates([...state.projects, ...action.projects]) : action.projects;
      return { ...state, projects, projectsCursor: action.cursor, projectsStatus: "idle" };
    }
    case "projectsStatus":
      return { ...state, projectsStatus: action.status };
    // Opening or saving a project replaces what was on screen, so an older error goes too.
    case "project":
      return {
        ...state,
        projectId: action.view.projectId,
        traits: traitsFromProject(action.view),
        archetypeId: archetypeFromProject(action.view),
        error: "",
        fieldErrors: {},
      };
    case "variations":
      return { ...state, variations: action.variations, selectedId: action.variations[0]?.id ?? null, error: "" };
    case "removed": {
      const projects = state.projects.filter((project) => project.projectId !== action.id);
      if (action.id !== state.projectId) return { ...state, projects };
      return { ...state, projects, projectId: null, variations: [], selectedId: null };
    }
  }
}

/** Photo checks use the same generic validators as the text fields. */
const photoRules = {
  type: [isOneOf<string>(REFERENCE_MIME_TYPES, "Use a JPEG, PNG or WebP photo.")],
  size: [isInRange({ min: 1, max: MAX_REFERENCE_BYTES }, "Use a photo under 20 MB.")],
};

async function uploadFile(upload: UploadResponse, file: File): Promise<void> {
  const storage = createSupabaseBrowserClient().storage;
  const { error } = await storage.from(upload.bucket).uploadToSignedUrl(upload.path, upload.token, file);
  if (error) throw error;
}

/** Puts the reference photo in storage and returns its upload id for the job input. */
async function uploadReference(file: File): Promise<string> {
  const upload = await api.post<UploadResponse>("/v1/uploads", {
    filename: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
  });
  await uploadFile(upload, file);
  return upload.uploadId;
}

function isSessionEnded(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 401 || error.code === "UNAUTHENTICATED");
}

// A 4xx means the server refused the request, so nothing was created and the key can go.
// Anything else (network, 5xx) may have created the job, so a retry must reuse the key.
function isClientError(error: unknown): boolean {
  return error instanceof ApiError && error.status >= 400 && error.status < 500;
}

/** The title and data a project is saved with, as text. A Generate patches the project only when this changes. */
function savedForm(traits: InfluencerTraits, archetypeId: string | null): string {
  return JSON.stringify({ title: traits.name, data: projectData(traits, archetypeId) });
}

function showProjectInUrl(projectId: string | null) {
  const path = projectId ? `/influencer?project=${encodeURIComponent(projectId)}` : "/influencer";
  window.history.replaceState(null, "", path);
}

// What one Generate remembers for a retry: its key, the photo it already uploaded, and what it asked for.
// A retry of the same request reuses the key, so it cannot create a second job; any change gets a new key.
type Attempt = { key: string; uploadId?: string; request: string };

type InfluencerContextValue = {
  state: State;
  dispatch: Dispatch<Action>;
  /** Validates the text fields first and focuses the first invalid one. Resolves to that field, or null when generation started. */
  generate: () => Promise<TextField | null>;
  /** Text fields register themselves here so generate() can focus the first invalid one. */
  registerField: (key: TextField, node: HTMLInputElement | HTMLTextAreaElement | null) => void;
  /** Stops waiting for the job. The job itself keeps running on the server. */
  cancel: () => void;
  randomize: () => void;
  /** Returns an error message, or null when the photo was accepted. */
  attachReference: (file: File) => string | null;
  removeReference: () => void;
  /** Starts a new influencer, from a featured look when given. The next Generate creates a project instead of changing the open one. */
  newInfluencer: (look?: { archetypeId: string; name: string }) => void;
  /** Loads a saved influencer: its traits, and the outputs of its completed jobs as the variations. */
  openProject: (id: string) => Promise<void>;
  removeProject: (id: string) => Promise<void>;
  /** Loads the next History page. With nothing shown yet (a failed first load), loads the first page. */
  loadMoreProjects: () => Promise<void>;
  selectedModel: PublicModel | undefined;
  /** True when the selected model takes the reference photo as input. */
  modelTakesReference: boolean;
};

const InfluencerContext = createContext<InfluencerContextValue | null>(null);

export function InfluencerProvider({
  children,
  initialProjectId = null,
  rules = textFieldRules,
}: {
  children: ReactNode;
  /** From `?project=`: the influencer to open on load. */
  initialProjectId?: string | null;
  rules?: FieldRules<TextValues>;
}) {
  const router = useRouter();
  const [state, dispatch] = useReducer(reducer, initial);
  const controller = useRef<AbortController | null>(null);
  const running = useRef(false);
  const attempt = useRef<Attempt | null>(null);
  // Bumped by every open, Generate, New influencer and removal of the open project.
  // A result that arrives later applies only while its number is still the latest, so an older request can't win.
  const latest = useRef(0);
  /** savedForm() of what the server holds for the open project. */
  const saved = useRef<string | null>(null);
  const modelsError = useRef<unknown>(null);
  const photoUrl = useRef<string | null>(null);
  const photoFile = useRef<File | null>(null);
  const fields = useRef<Record<TextField, HTMLInputElement | HTMLTextAreaElement | null>>({ name: null, extra: null });

  const registerField = useCallback((key: TextField, node: HTMLInputElement | HTMLTextAreaElement | null) => {
    fields.current[key] = node;
  }, []);

  /** Sends the user to sign in, then back to this page (with `?project=` when set). */
  const signIn = useCallback(() => {
    router.push(`/sign-in?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
  }, [router]);

  /** Makes `view` the open project, as the server has it. */
  const keepProject = useCallback((view: ProjectView) => {
    saved.current = savedForm(traitsFromProject(view), archetypeFromProject(view));
    dispatch({ type: "project", view });
    showProjectInUrl(view.projectId);
  }, []);

  const loadProjects = useCallback(async (cursor?: string) => {
    dispatch({ type: "projectsStatus", status: "loading" });
    try {
      const page = await listInfluencerProjects(api, cursor);
      dispatch({ type: "projects", projects: page.projects, cursor: page.nextCursor, append: cursor !== undefined });
    } catch (error) {
      dispatch({ type: "projectsStatus", status: isSessionEnded(error) ? "signed-out" : "error" });
    }
  }, []);

  /** Opens project `id`, unless something newer started after `token`. */
  const loadProject = useCallback(
    async (id: string, token: number) => {
      if (token !== latest.current) return;
      try {
        const [view, page] = await Promise.all([getInfluencerProject(api, id), listProjectJobs(api, id)]);
        if (token !== latest.current) return;
        keepProject(view);
        dispatch({ type: "variations", variations: variationsFromJobs(page.jobs, `${view.title} portrait`) });
        dispatch({ type: "view", view: "result" });
      } catch (error) {
        if (token !== latest.current) return;
        if (isSessionEnded(error)) signIn();
        dispatch({ type: "fail", message: messageForError(error) });
        dispatch({ type: "view", view: "result" });
      }
    },
    [keepProject, signIn],
  );

  const openProject = useCallback((id: string) => loadProject(id, ++latest.current), [loadProject]);

  /** Lets go of the open project: the next Generate creates a new one, and results still loading for it are dropped. */
  const forgetProject = useCallback(() => {
    latest.current += 1;
    saved.current = null;
    attempt.current = null;
    showProjectInUrl(null);
  }, []);

  // Models first (public), then the signed-in user's projects, then the project from the URL.
  useEffect(() => {
    // Taken now, so a Generate pressed while the page is still loading wins over the project in the URL.
    const token = ++latest.current;
    async function load() {
      try {
        dispatch({ type: "models", models: influencerImageModels(await api.get<PublicModel[]>("/v1/models")) });
      } catch (error) {
        modelsError.current = error;
        dispatch({ type: "fail", message: messageForError(error) });
      }
      await loadProjects();
      if (initialProjectId) await loadProject(initialProjectId, token);
    }
    void load();
  }, [initialProjectId, loadProjects, loadProject]);

  useEffect(() => {
    return () => {
      controller.current?.abort();
      if (photoUrl.current) URL.revokeObjectURL(photoUrl.current);
    };
  }, []);

  const { traits, archetypeId, reference, projectId, projectsStatus, projectsCursor } = state;
  const selectedModel = state.models.find((model) => model.key === state.modelKey);
  const modelTakesReference = selectedModel !== undefined && imageFieldName(selectedModel) !== undefined;

  const generate = useCallback(async (): Promise<TextField | null> => {
    const checked = validateFields<TextValues>({ name: traits.name, extra: traits.extra }, rules);
    if (!checked.ok) {
      dispatch({ type: "invalid", errors: checked.errors });
      const invalid = (Object.keys(checked.errors) as TextField[])[0];
      fields.current[invalid]?.focus();
      return invalid;
    }
    if (running.current) return null;
    // Generating needs an account. A visitor already known to be signed out goes to sign in before any request.
    if (projectsStatus === "signed-out") {
      signIn();
      return null;
    }

    const clean: TextValues = { name: trimContent(traits.name), extra: trimContent(traits.extra) };
    const submitted = { ...traits, ...clean };
    dispatch({ type: "sanitize", values: clean });
    const next = new AbortController();
    controller.current = next;
    running.current = true;
    const token = ++latest.current;
    // False once another project was opened or New influencer pressed: this run's results no longer apply.
    const isLatest = () => token === latest.current;
    dispatch({ type: "start" });
    let savedProject = false;

    try {
      const model = selectedModel;
      if (!model) throw modelsError.current ?? new Error("No image model is available.");

      // 1. Save the influencer: a project on the first Generate, then a patch only when the name or traits changed.
      const data = projectData(submitted, archetypeId);
      let id = projectId;
      if (!id) {
        const view = await createInfluencerProject(api, submitted.name, data);
        savedProject = true;
        if (!isLatest()) return null;
        keepProject(view);
        id = view.projectId;
      } else if (savedForm(submitted, archetypeId) !== saved.current) {
        const view = await catchDeletedProject(id, updateInfluencerProject(api, id, { title: submitted.name, data }));
        savedProject = true;
        if (!isLatest()) return null;
        // Still the open project, and the form already shows what was sent: only the snapshot changes.
        saved.current = savedForm(traitsFromProject(view), archetypeFromProject(view));
      }
      savedProject = true;
      // Cancelled before the job was sent: nothing is charged.
      if (next.signal.aborted || !isLatest()) return null;

      // 2. Send the reference photo, only to a model that uses it.
      const request = JSON.stringify({ model: model.key, projectId: id, traits: submitted, photo: reference?.url });
      if (attempt.current?.request !== request) attempt.current = { key: newIdempotencyKey(), request };
      const current = attempt.current;
      const photo = modelTakesReference ? photoFile.current : null;
      if (photo && !current.uploadId) current.uploadId = await uploadReference(photo);
      if (next.signal.aborted || !isLatest()) return null;

      // 3. Create the job in the project.
      const input = influencerInput(model, submitted, current.uploadId ? [current.uploadId] : []);
      let job: JobView;
      try {
        job = await catchDeletedProject(
          id,
          createInfluencerJob(api, { model, projectId: id, input, idempotencyKey: current.key }),
        );
      } catch (error) {
        // A refused request (a 4xx, which includes a deleted project) created nothing.
        if (isClientError(error) || error instanceof ProjectDeletedError) attempt.current = null;
        throw error;
      }
      attempt.current = null;
      notifyCreditsChanged();

      // 4. Wait for it. Its outputs become the variations.
      const finished = await pollJob(job.jobId, {
        get: api.get,
        intervalMs: POLL_INTERVAL_MS,
        signal: next.signal,
      }).finally(() => {
        if (!next.signal.aborted) notifyCreditsChanged();
      });
      if (isLatest())
        dispatch({ type: "done", variations: variationsFromJobs([finished], `${submitted.name} portrait`) });
    } catch (error) {
      // Cancelled, or something newer owns the screen: this run shows nothing.
      if (next.signal.aborted || !isLatest()) return null;
      if (error instanceof ProjectDeletedError) {
        // Deleted on another device. Let go of it, so the next Generate creates a new project from this form.
        forgetProject();
        dispatch({ type: "removed", id: error.projectId });
        dispatch({ type: "fail", message: error.message });
        return null;
      }
      if (isSessionEnded(error)) signIn();
      dispatch({ type: "fail", message: messageForError(error) });
    } finally {
      running.current = false;
      // A superseded run skips done and fail, so it turns the spinner off here.
      if (!isLatest()) dispatch({ type: "cancel" });
      // The project moved to the top of History, and may have a new cover.
      if (savedProject) void loadProjects();
    }
    return null;
  }, [
    traits,
    rules,
    projectsStatus,
    signIn,
    selectedModel,
    archetypeId,
    projectId,
    keepProject,
    forgetProject,
    reference,
    modelTakesReference,
    loadProjects,
  ]);

  const cancel = useCallback(() => {
    controller.current?.abort();
    dispatch({ type: "cancel" });
  }, []);

  const randomize = useCallback(() => {
    const picks: Partial<InfluencerTraits> = {};
    for (const group of traitGroups)
      for (const field of group.fields)
        picks[field.key] = field.options[Math.floor(Math.random() * field.options.length)].value;
    dispatch({ type: "randomize", picks });
  }, []);

  const attachReference = useCallback((file: File): string | null => {
    const error = runValidators(file.type, photoRules.type) ?? runValidators(file.size, photoRules.size);
    if (error) return error;
    if (photoUrl.current) URL.revokeObjectURL(photoUrl.current);
    photoUrl.current = URL.createObjectURL(file);
    photoFile.current = file;
    dispatch({ type: "reference", reference: { url: photoUrl.current, name: file.name } });
    return null;
  }, []);

  const removeReference = useCallback(() => {
    if (photoUrl.current) URL.revokeObjectURL(photoUrl.current);
    photoUrl.current = null;
    photoFile.current = null;
    dispatch({ type: "reference", reference: null });
  }, []);

  // The photo goes too, so the next influencer doesn't quietly reuse the last one's face.
  const newInfluencer = useCallback(
    (look?: { archetypeId: string; name: string }) => {
      forgetProject();
      removeReference();
      dispatch({ type: "reset" });
      if (look) dispatch({ type: "archetype", id: look.archetypeId, name: look.name });
    },
    [forgetProject, removeReference],
  );

  const removeProject = useCallback(
    async (id: string) => {
      try {
        await deleteInfluencerProject(api, id);
      } catch (error) {
        if (isSessionEnded(error)) signIn();
        dispatch({ type: "fail", message: messageForError(error) });
        return;
      }
      dispatch({ type: "removed", id });
      // The URL names the open project, including one still loading from `?project=`.
      if (new URLSearchParams(window.location.search).get("project") === id) forgetProject();
    },
    [signIn, forgetProject],
  );

  const loadMoreProjects = useCallback(async () => {
    if (projectsStatus === "loading") return;
    await loadProjects(projectsCursor ?? undefined);
  }, [projectsStatus, projectsCursor, loadProjects]);

  const value = useMemo(
    () => ({
      state,
      dispatch,
      generate,
      registerField,
      cancel,
      randomize,
      attachReference,
      removeReference,
      newInfluencer,
      openProject,
      removeProject,
      loadMoreProjects,
      selectedModel,
      modelTakesReference,
    }),
    [
      state,
      generate,
      registerField,
      cancel,
      randomize,
      attachReference,
      removeReference,
      newInfluencer,
      openProject,
      removeProject,
      loadMoreProjects,
      selectedModel,
      modelTakesReference,
    ],
  );
  return <InfluencerContext.Provider value={value}>{children}</InfluencerContext.Provider>;
}

export function useInfluencer() {
  const value = useContext(InfluencerContext);
  if (!value) throw new Error("useInfluencer must be used inside <InfluencerProvider>.");
  return value;
}
