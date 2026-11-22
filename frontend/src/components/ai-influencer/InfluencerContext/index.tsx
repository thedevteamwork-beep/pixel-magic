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
  DEFAULT_ASPECT_RATIO,
  RESUME_JOBS_LOOKUP,
  defaultTraits,
  POLL_INTERVAL_MS,
  SAMPLE_RENDER_MS,
  textFieldRules,
  traitGroups,
  USE_SAMPLE_PORTRAITS,
  type TextField,
  type TextValues,
} from "@/components/ai-influencer/constants";
import {
  archetypeFromProject,
  aspectRatioFromProject,
  catchDeletedProject,
  createInfluencerJob,
  createInfluencerProject,
  deleteInfluencerProject,
  getInfluencerProject,
  influencerImageModels,
  influencerInput,
  influencerModel,
  photoFromProject,
  pickAspectRatio,
  listInfluencerProjects,
  listProjectJobs,
  ProjectDeletedError,
  projectData,
  styleIdFromProject,
  type SavedSettings,
  traitsFromProject,
  updateInfluencerProject,
  usedReferences,
  variationsFromJobs,
} from "@/lib/ai-influencer/projects";
import type { ReferencesUsed } from "@/lib/ai-influencer/prompt";
import {
  isSampleProject,
  newSampleProjectId,
  samplePortrait,
  sampleProject,
  sampleProjects,
} from "@/lib/ai-influencer/samples";
import {
  clearPendingSample,
  pendingInfluencerJob,
  readPendingSample,
  savePendingSample,
  type PendingSample,
} from "@/lib/ai-influencer/resume";
import { displayName } from "@/lib/ai-influencer/prompt";
import { restoreStyle, styleForGenerate, type RestoredStyle } from "@/lib/ai-influencer/styles";
import { imageFileError, uploadImage } from "@/lib/ai-influencer/upload";
import { api, ApiError, newIdempotencyKey } from "@/lib/api/client";
import type { JobList, JobView, ProjectView, PublicModel } from "@/lib/api/types";
import { notifyCreditsChanged } from "@/lib/balance";
import { imageFieldName } from "@/lib/generate/formFromSchema";
import { messageForError } from "@/lib/generate/messages";
import { pollJob } from "@/lib/generate/pollJob";
import { trimContent, validateFields, type FieldErrors, type FieldRules } from "@/lib/validation/validators";
import type {
  InfluencerTraits,
  InfluencerVariation,
  ReferencePhoto,
  StageView,
  StyleReference,
  TraitKey,
} from "@/types/ai-influencer";

type Status = "idle" | "generating";

type ProjectsStatus = "idle" | "loading" | "signed-out" | "error";

type State = {
  traits: InfluencerTraits;
  archetypeId: string | null;
  reference: ReferencePhoto | null;
  /** The saved style picked for this influencer, sent with each Generate. */
  style: StyleReference | null;
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
  /** The image models the backend lists. */
  models: PublicModel[];
  /** The model every Generate uses: Nano Banana 2 when listed (see influencerModel). */
  modelKey: string;
  /** The image shape picked under the prompt, e.g. "4:5"; checked against the model when used. */
  aspectRatio: string;
};

type Action =
  | { type: "trait"; key: TraitKey | TextField; value: string }
  | { type: "invalid"; errors: FieldErrors<TextValues> }
  | { type: "sanitize"; values: TextValues }
  | { type: "archetype"; id: string; name?: string }
  | { type: "reference"; reference: ReferencePhoto | null }
  | { type: "style"; style: StyleReference | null }
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
  | { type: "aspectRatio"; value: string }
  | { type: "projects"; projects: ProjectView[]; cursor: string | null; append?: boolean }
  | { type: "projectsStatus"; status: ProjectsStatus }
  | { type: "project"; view: ProjectView }
  | { type: "variations"; variations: InfluencerVariation[] }
  | { type: "removed"; id: string }
  | { type: "upsertProject"; view: ProjectView }
  | { type: "resume"; traits: InfluencerTraits; archetypeId: string | null; aspectRatio: string };

const initial: State = {
  traits: { ...defaultTraits },
  archetypeId: null,
  reference: null,
  style: null,
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
  aspectRatio: DEFAULT_ASPECT_RATIO,
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
    case "style":
      return { ...state, style: action.style };
    case "view":
      return { ...state, view: action.view };
    case "reset":
      // A new influencer: no project yet, so nothing to show on the Result tab. The style stays saved but unpicked.
      return {
        ...state,
        traits: { ...defaultTraits },
        archetypeId: null,
        style: null,
        aspectRatio: DEFAULT_ASPECT_RATIO,
        error: "",
        fieldErrors: {},
        projectId: null,
        variations: [],
        selectedId: null,
      };
    case "randomize":
      return { ...state, traits: { ...state.traits, ...action.picks }, archetypeId: null };
    case "start":
      return { ...state, status: "generating", error: "", view: "history" };
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
      return { ...state, models: action.models, modelKey: influencerModel(action.models)?.key ?? "" };
    case "aspectRatio":
      return { ...state, aspectRatio: action.value };
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
        // Projects saved before the picker existed open with the default shape.
        aspectRatio: aspectRatioFromProject(action.view) ?? DEFAULT_ASPECT_RATIO,
        error: "",
        fieldErrors: {},
      };
    case "variations":
      return { ...state, variations: action.variations, selectedId: action.variations[0]?.id ?? null, error: "" };
    // A Generate still running when the page came back: its influencer, in History, with the loader.
    case "resume":
      return {
        ...state,
        traits: action.traits,
        archetypeId: action.archetypeId,
        aspectRatio: action.aspectRatio,
        status: "generating",
        error: "",
        view: "history",
      };
    // A project saved here (a sample Generate): it replaces its old copy, or joins History at the top.
    case "upsertProject": {
      const rest = state.projects.filter((project) => project.projectId !== action.view.projectId);
      return { ...state, projects: [action.view, ...rest] };
    }
    case "removed": {
      const projects = state.projects.filter((project) => project.projectId !== action.id);
      if (action.id !== state.projectId) return { ...state, projects };
      return { ...state, projects, projectId: null, variations: [], selectedId: null };
    }
  }
}

/** Resolves after `ms`, or as soon as `signal` aborts. */
function waitFor(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      resolve();
    });
  });
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
function savedForm(traits: InfluencerTraits, archetypeId: string | null, settings: SavedSettings): string {
  return JSON.stringify({ title: displayName(traits, archetypeId), data: projectData(traits, archetypeId, settings) });
}

/** What the server holds for a project besides its traits. */
function settingsFromProject(view: ProjectView): SavedSettings {
  const photoUploadId = view.data.photoUploadId;
  return {
    aspectRatio: aspectRatioFromProject(view) ?? undefined,
    photoUploadId: typeof photoUploadId === "string" ? photoUploadId : undefined,
    styleId: styleIdFromProject(view) ?? undefined,
  };
}

// What one Generate remembers for a retry: its key, the photo it already uploaded, and what it asked for.
// A retry of the same request reuses the key, so it cannot create a second job; any change gets a new key.
type Attempt = { key: string; request: string };

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
  /** Picks a saved style for the next Generate, or clears it with null. */
  selectStyle: (style: StyleReference | null) => void;
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
  /** Which of the attached photo and picked style the selected model receives (it may take only one image). */
  referencesUsed: ReferencesUsed;
  /** Puts the shown influencer's inputs back in the left panel. */
  reuseInputs: () => void;
  /** The aspect ratio the next Generate sends: the picked one when the model offers it. */
  aspectRatio: string;
  setAspectRatio: (value: string) => void;
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
  /** History as last rendered, so opening a sample influencer can find it without asking the backend. */
  const projectsRef = useRef<ProjectView[]>([]);
  useEffect(() => {
    projectsRef.current = state.projects;
  });
  /** The project on show or being opened, so removing it from History lets it go. */
  const shownProjectId = useRef<string | null>(null);
  /** savedForm() of what the server holds for the open project. */
  const saved = useRef<string | null>(null);
  const modelsError = useRef<unknown>(null);
  const photoUrl = useRef<string | null>(null);
  const photoFile = useRef<File | null>(null);
  /** The attached photo's upload, so a retry or the next Generate doesn't send the same file again. */
  const photoUpload = useRef<{ url: string; uploadId: string } | null>(null);
  /** A reopened influencer's saved style while it loads. Cleared when the user picks or clears a style themselves. */
  const pendingStyle = useRef<{ id: string; promise: Promise<RestoredStyle> } | null>(null);
  const fields = useRef<Record<TextField, HTMLInputElement | HTMLTextAreaElement | null>>({ name: null, extra: null });

  const registerField = useCallback((key: TextField, node: HTMLInputElement | HTMLTextAreaElement | null) => {
    fields.current[key] = node;
  }, []);

  /** Sends the user to sign in, then back to this page. */
  const signIn = useCallback(() => {
    router.push(`/sign-in?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
  }, [router]);

  /** Makes `view` the open project, as the server has it. */
  const keepProject = useCallback((view: ProjectView) => {
    shownProjectId.current = view.projectId;
    saved.current = savedForm(traitsFromProject(view), archetypeFromProject(view), settingsFromProject(view));
    dispatch({ type: "project", view });
  }, []);

  /** Loads a History page. Resolves to its influencers, or null when it failed. */
  const loadProjects = useCallback(async (cursor?: string): Promise<ProjectView[] | null> => {
    dispatch({ type: "projectsStatus", status: "loading" });
    try {
      const page = await listInfluencerProjects(api, cursor);
      dispatch({ type: "projects", projects: page.projects, cursor: page.nextCursor, append: cursor !== undefined });
      return page.projects;
    } catch (error) {
      dispatch({ type: "projectsStatus", status: isSessionEnded(error) ? "signed-out" : "error" });
      return null;
    }
  }, []);

  /**
   * Fills the left panel from a saved influencer: its options, name, notes and ratio, the face photo it saved (any
   * photo attached before is let go) and its style, fetched by id.
   */
  const applyProjectInputs = useCallback(
    (view: ProjectView) => {
      keepProject(view);
      if (photoUrl.current) URL.revokeObjectURL(photoUrl.current);
      photoUrl.current = null;
      photoFile.current = null;
      dispatch({ type: "reference", reference: photoFromProject(view) });
      dispatch({ type: "style", style: null });
      pendingStyle.current = null;
      const styleId = styleIdFromProject(view);
      if (styleId) {
        const restoring = { id: styleId, promise: restoreStyle(api, styleId) };
        pendingStyle.current = restoring;
        void restoring.promise.then(({ style: saved }) => {
          // Not when the user picked or cleared a style since, or opened another influencer.
          if (saved && pendingStyle.current === restoring) dispatch({ type: "style", style: saved });
        });
      }
    },
    [keepProject],
  );

  /** Opens project `id`, unless something newer started after `token`. */
  const loadProject = useCallback(
    async (id: string, token: number) => {
      if (token !== latest.current) return;
      if (isSampleProject(id)) {
        // A sample influencer has no backend project: its cover is its portrait.
        const view = projectsRef.current.find((project) => project.projectId === id);
        if (!view) return;
        applyProjectInputs(view);
        const ratio = aspectRatioFromProject(view) ?? undefined;
        const portrait = view.cover && { id: `${id}-cover`, url: view.cover.url, alt: `${view.title} portrait` };
        dispatch({
          type: "variations",
          variations: portrait ? [{ ...portrait, aspectRatio: ratio, sample: true }] : [],
        });
        dispatch({ type: "view", view: "history" });
        return;
      }
      shownProjectId.current = id;
      try {
        const [view, page] = await Promise.all([getInfluencerProject(api, id), listProjectJobs(api, id)]);
        if (token !== latest.current) return;
        applyProjectInputs(view);
        dispatch({ type: "variations", variations: variationsFromJobs(page.jobs, `${view.title} portrait`) });
        dispatch({ type: "view", view: "history" });
      } catch (error) {
        if (token !== latest.current) return;
        if (isSessionEnded(error)) signIn();
        dispatch({ type: "fail", message: messageForError(error) });
        dispatch({ type: "view", view: "history" });
      }
    },
    [applyProjectInputs, signIn],
  );

  /** Puts the shown influencer's inputs back in the left panel, undoing edits made since it was made or opened. */
  const reuseInputs = useCallback(() => {
    const view = projectsRef.current.find((project) => project.projectId === shownProjectId.current);
    if (view) applyProjectInputs(view);
  }, [applyProjectInputs]);

  const openProject = useCallback((id: string) => loadProject(id, ++latest.current), [loadProject]);

  /** Lets go of the open project: the next Generate creates a new one, and results still loading for it are dropped. */
  const forgetProject = useCallback(() => {
    latest.current += 1;
    shownProjectId.current = null;
    saved.current = null;
    attempt.current = null;
  }, []);

  /** Shows a finished sample Generate and keeps it in History, like the backend keeps a real one. */
  const finishSample = useCallback(
    (sample: Omit<PendingSample, "startedAt">) => {
      const portrait = {
        ...samplePortrait(sample.traits, sample.archetypeId, sample.aspectRatio),
        userPrompt: sample.traits.extra.trim(),
      };
      // The same influencer again updates its card.
      const sampleId = sample.projectId && isSampleProject(sample.projectId) ? sample.projectId : newSampleProjectId();
      const view = sampleProject(sampleId, sample.traits, sample.archetypeId, portrait);
      keepProject(view);
      dispatch({ type: "upsertProject", view });
      dispatch({ type: "done", variations: [portrait] });
    },
    [keepProject],
  );

  /** A sample Generate left running when the page went away: its loader for the time left, then its portrait. */
  const resumeSample = useCallback(
    async (left: { pending: PendingSample; remainingMs: number }, token: number) => {
      if (token !== latest.current || running.current) return;
      const next = new AbortController();
      controller.current = next;
      running.current = true;
      const { pending } = left;
      dispatch({
        type: "resume",
        traits: pending.traits,
        archetypeId: pending.archetypeId,
        aspectRatio: pending.aspectRatio,
      });
      try {
        await waitFor(left.remainingMs, next.signal);
        if (next.signal.aborted || token !== latest.current) return;
        clearPendingSample(window.sessionStorage);
        finishSample(pending);
      } finally {
        running.current = false;
        if (token !== latest.current) dispatch({ type: "cancel" });
      }
    },
    [finishSample],
  );

  /** A real Generate still running when the page came back: its influencer, in History, with the loader until done. */
  const resumeJob = useCallback(
    async (projects: ProjectView[], token: number) => {
      let jobs: JobView[];
      try {
        jobs = (await api.get<JobList>(`/v1/jobs?kind=image&limit=${RESUME_JOBS_LOOKUP}`)).jobs;
      } catch {
        return; // Nothing to pick up; the job still finishes and shows in History.
      }
      const job = pendingInfluencerJob(jobs, new Set(projects.map((project) => project.projectId)));
      const view = job && projects.find((project) => project.projectId === job.projectId);
      if (!job || !view || token !== latest.current || running.current) return;
      const next = new AbortController();
      controller.current = next;
      running.current = true;
      applyProjectInputs(view);
      const ratio = job.input.aspect_ratio;
      dispatch({
        type: "resume",
        traits: traitsFromProject(view),
        archetypeId: archetypeFromProject(view),
        aspectRatio: typeof ratio === "string" ? ratio : (aspectRatioFromProject(view) ?? DEFAULT_ASPECT_RATIO),
      });
      try {
        const finished = await pollJob(job.jobId, {
          get: api.get,
          intervalMs: POLL_INTERVAL_MS,
          signal: next.signal,
        }).finally(() => {
          if (!next.signal.aborted) notifyCreditsChanged();
        });
        if (token === latest.current) {
          dispatch({ type: "done", variations: variationsFromJobs([finished], `${view.title} portrait`) });
        }
      } catch (error) {
        if (next.signal.aborted || token !== latest.current) return;
        dispatch({ type: "fail", message: messageForError(error) });
      } finally {
        running.current = false;
        if (token !== latest.current) dispatch({ type: "cancel" });
        // Its card may have a new cover.
        void loadProjects();
      }
    },
    [applyProjectInputs, loadProjects],
  );

  // Models first (public), then the signed-in user's projects, then the project from the URL.
  useEffect(() => {
    // Taken now, so a Generate pressed while the page is still loading wins over the project in the URL.
    const token = ++latest.current;
    // The link has done its job: a refresh opens the main page, and the address can't name another influencer.
    if (initialProjectId) window.history.replaceState(null, "", "/influencer");
    async function load() {
      try {
        dispatch({ type: "models", models: influencerImageModels(await api.get<PublicModel[]>("/v1/models")) });
      } catch (error) {
        modelsError.current = error;
        dispatch({ type: "fail", message: messageForError(error) });
      }
      // Sample mode shows a sample History, so the page can be seen without saved influencers.
      // A Generate still running when the page went away comes back with its loader (in History, not Explore).
      if (USE_SAMPLE_PORTRAITS) {
        dispatch({ type: "projects", projects: sampleProjects(), cursor: null });
        const left = readPendingSample(window.sessionStorage, Date.now());
        if (left && !initialProjectId) void resumeSample(left, token);
      } else {
        const projects = await loadProjects();
        if (projects && !initialProjectId) await resumeJob(projects, token);
      }
      if (initialProjectId) await loadProject(initialProjectId, token);
    }
    void load();
  }, [initialProjectId, loadProjects, loadProject, resumeSample, resumeJob]);

  useEffect(() => {
    return () => {
      controller.current?.abort();
      if (photoUrl.current) URL.revokeObjectURL(photoUrl.current);
    };
  }, []);

  const { traits, archetypeId, reference, style, projectId, projectsStatus, projectsCursor } = state;
  const selectedModel = state.models.find((model) => model.key === state.modelKey);
  const modelTakesReference = selectedModel !== undefined && imageFieldName(selectedModel) !== undefined;
  // The picked shape when the model offers it, otherwise the default (or the model's own).
  const aspectRatio = pickAspectRatio(selectedModel, state.aspectRatio);
  const referencesUsed = useMemo((): ReferencesUsed => {
    if (!selectedModel) return {};
    const used = usedReferences(selectedModel, { photo: reference ?? undefined, style: style ?? undefined });
    return { photo: used.photo !== undefined, style: used.style !== undefined };
  }, [selectedModel, reference, style]);

  const generate = useCallback(async (): Promise<TextField | null> => {
    const checked = validateFields<TextValues>({ name: traits.name, extra: traits.extra }, rules);
    if (!checked.ok) {
      dispatch({ type: "invalid", errors: checked.errors });
      const invalid = (Object.keys(checked.errors) as TextField[])[0];
      const field = fields.current[invalid];
      // The field may sit in a closed section, where its error can't be seen: open it, then focus the field once the
      // section is shown (a closed section's content can't take focus).
      const section = field?.closest("details");
      if (section && !section.open) section.open = true;
      setTimeout(() => field?.focus(), 0);
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
      if (USE_SAMPLE_PORTRAITS) {
        // A preview while the backend isn't deployed: the loader for a moment, then a sample portrait.
        // Nothing is saved and no credits are spent. It is remembered in the tab until it finishes, so leaving or
        // refreshing the page picks it up again.
        const sample = { traits: submitted, archetypeId, aspectRatio, projectId };
        savePendingSample(window.sessionStorage, { ...sample, startedAt: Date.now() });
        await waitFor(SAMPLE_RENDER_MS, next.signal);
        // Aborted when the page went away: it stays remembered for when the page comes back.
        if (next.signal.aborted || !isLatest()) return null;
        clearPendingSample(window.sessionStorage);
        finishSample(sample);
        return null;
      }

      const model = selectedModel;
      if (!model) throw modelsError.current ?? new Error("No image model is available.");

      // A reopened influencer's style may still be loading: wait for it, so this Generate sends it and the save
      // keeps it. A style that only failed to load stays saved (styleForGenerate).
      const restoring = style ? null : pendingStyle.current;
      const chosen = styleForGenerate(style, restoring && { id: restoring.id, result: await restoring.promise });
      if (next.signal.aborted || !isLatest()) return null;

      // 1. The face photo, uploaded once, so the save below can keep it. A saved influencer's photo is already stored.
      let photoUploadId = reference?.uploadId;
      if (!photoUploadId && reference && referencesUsed.photo && photoFile.current) {
        if (photoUpload.current?.url !== reference.url) {
          photoUpload.current = { url: reference.url, uploadId: await uploadImage(photoFile.current) };
        }
        photoUploadId = photoUpload.current.uploadId;
      }
      if (next.signal.aborted || !isLatest()) return null;

      // 2. Save the influencer: a project on the first Generate, then a patch only when something saved changed.
      const settings: SavedSettings = { aspectRatio, photoUploadId, styleId: chosen.styleId };
      const data = projectData(submitted, archetypeId, settings);
      let id = projectId;
      if (!id) {
        const view = await createInfluencerProject(api, displayName(submitted, archetypeId), data);
        savedProject = true;
        if (!isLatest()) return null;
        keepProject(view);
        id = view.projectId;
      } else if (savedForm(submitted, archetypeId, settings) !== saved.current) {
        const view = await catchDeletedProject(
          id,
          updateInfluencerProject(api, id, { title: displayName(submitted, archetypeId), data }),
        );
        savedProject = true;
        if (!isLatest()) return null;
        // Still the open project, and the form already shows what was sent: only the snapshot changes.
        saved.current = savedForm(traitsFromProject(view), archetypeFromProject(view), settingsFromProject(view));
      }
      savedProject = true;
      // Cancelled before the job was sent: nothing is charged.
      if (next.signal.aborted || !isLatest()) return null;

      // 3. Create the job in the project with the photo and the style, as many as the model takes (the photo first).
      // The same request keeps its idempotency key, so a retry can't create a second job.
      const request = JSON.stringify({
        model: model.key,
        projectId: id,
        traits: submitted,
        photo: photoUploadId,
        style: chosen.style?.uploadId,
        aspectRatio,
      });
      if (attempt.current?.request !== request) attempt.current = { key: newIdempotencyKey(), request };
      const current = attempt.current;
      const input = influencerInput(
        model,
        submitted,
        { photo: photoUploadId, style: chosen.style?.uploadId },
        aspectRatio,
      );
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
        dispatch({
          type: "done",
          variations: variationsFromJobs([finished], `${displayName(submitted, archetypeId)} portrait`),
        });
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
    style,
    referencesUsed,
    aspectRatio,
    loadProjects,
    finishSample,
  ]);

  const cancel = useCallback(() => {
    controller.current?.abort();
    clearPendingSample(window.sessionStorage);
    dispatch({ type: "cancel" });
  }, []);

  const randomize = useCallback(() => {
    const picks: Partial<InfluencerTraits> = {};
    // The character type stays as chosen: "Surprise me" shuffles the look, not the species.
    for (const group of traitGroups)
      for (const field of group.fields)
        if (field.key !== "character")
          picks[field.key] = field.options[Math.floor(Math.random() * field.options.length)].value;
    dispatch({ type: "randomize", picks });
  }, []);

  const attachReference = useCallback((file: File): string | null => {
    const error = imageFileError(file);
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

  const selectStyle = useCallback((picked: StyleReference | null) => {
    // The user's own choice wins over a saved style still loading.
    pendingStyle.current = null;
    dispatch({ type: "style", style: picked });
  }, []);

  // The photo goes too, so the next influencer doesn't quietly reuse the last one's face.
  const newInfluencer = useCallback(
    (look?: { archetypeId: string; name: string }) => {
      forgetProject();
      removeReference();
      pendingStyle.current = null;
      clearPendingSample(window.sessionStorage);
      dispatch({ type: "reset" });
      if (look) dispatch({ type: "archetype", id: look.archetypeId, name: look.name });
    },
    [forgetProject, removeReference],
  );

  const removeProject = useCallback(
    async (id: string) => {
      try {
        if (!isSampleProject(id)) await deleteInfluencerProject(api, id);
      } catch (error) {
        if (isSessionEnded(error)) signIn();
        dispatch({ type: "fail", message: messageForError(error) });
        return;
      }
      dispatch({ type: "removed", id });
      // The open project, including one still loading.
      if (shownProjectId.current === id) forgetProject();
    },
    [signIn, forgetProject],
  );

  const loadMoreProjects = useCallback(async () => {
    if (projectsStatus === "loading") return;
    await loadProjects(projectsCursor ?? undefined);
  }, [projectsStatus, projectsCursor, loadProjects]);

  const setAspectRatio = useCallback((value: string) => dispatch({ type: "aspectRatio", value }), []);

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
      selectStyle,
      newInfluencer,
      openProject,
      removeProject,
      loadMoreProjects,
      selectedModel,
      modelTakesReference,
      referencesUsed,
      aspectRatio,
      setAspectRatio,
      reuseInputs,
    }),
    [
      state,
      generate,
      registerField,
      cancel,
      randomize,
      attachReference,
      removeReference,
      selectStyle,
      newInfluencer,
      openProject,
      removeProject,
      loadMoreProjects,
      selectedModel,
      modelTakesReference,
      referencesUsed,
      aspectRatio,
      setAspectRatio,
      reuseInputs,
    ],
  );
  return <InfluencerContext.Provider value={value}>{children}</InfluencerContext.Provider>;
}

export function useInfluencer() {
  const value = useContext(InfluencerContext);
  if (!value) throw new Error("useInfluencer must be used inside <InfluencerProvider>.");
  return value;
}
