"use client";

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
  MAX_ROSTER,
  textFieldRules,
  traitGroups,
  type TextField,
  type TextValues,
} from "@/components/ai-influencer/constants";
import { MAX_REFERENCE_BYTES, REFERENCE_MIME_TYPES } from "@/constants/image-generator";
import { generateInfluencerPreview } from "@/lib/ai-influencer/generate";
import {
  isInRange,
  isOneOf,
  runValidators,
  trimContent,
  validateFields,
  type FieldErrors,
  type FieldRules,
} from "@/lib/validation/validators";
import type {
  InfluencerTraits,
  InfluencerVariation,
  ReferencePhoto,
  SavedInfluencer,
  StageView,
  TraitKey,
} from "@/types/ai-influencer";

const STORAGE_KEY = "pixel-magic:influencers";

type Status = "idle" | "generating";

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
  roster: SavedInfluencer[];
  /** True once the saved roster has been read from this browser. Nothing is written back before that. */
  hydrated: boolean;
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
  | { type: "hydrate"; roster: SavedInfluencer[] }
  | { type: "save" }
  | { type: "open"; id: string }
  | { type: "remove"; id: string };

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
  roster: [],
  hydrated: false,
};

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
      return { ...state, traits: { ...defaultTraits }, archetypeId: null, error: "", fieldErrors: {} };
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
    case "hydrate":
      return { ...state, roster: action.roster, hydrated: true };
    case "save": {
      const cover = state.variations.find((item) => item.id === state.selectedId);
      if (!cover) return state;
      const saved: SavedInfluencer = {
        id: `${cover.id}-${state.roster.length}`,
        traits: state.traits,
        cover,
        savedAt: new Date().toISOString(),
      };
      return { ...state, roster: [saved, ...state.roster].slice(0, MAX_ROSTER) };
    }
    case "open": {
      const found = state.roster.find((item) => item.id === action.id);
      if (!found) return state;
      return {
        ...state,
        traits: found.traits,
        archetypeId: null,
        variations: [found.cover],
        selectedId: found.cover.id,
        fieldErrors: {},
        view: "result",
      };
    }
    case "remove":
      return { ...state, roster: state.roster.filter((item) => item.id !== action.id) };
  }
}

function readRoster(): SavedInfluencer[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed)
      ? (parsed as SavedInfluencer[])
          .filter((item) => item && typeof item.id === "string" && item.traits && item.cover)
          .slice(0, MAX_ROSTER)
      : [];
  } catch {
    return [];
  }
}

/** Photo checks use the same generic validators as the text fields. */
const photoRules = {
  type: [isOneOf<string>(REFERENCE_MIME_TYPES, "Use a JPEG, PNG or WebP photo.")],
  size: [isInRange({ min: 1, max: MAX_REFERENCE_BYTES }, "Use a photo under 20 MB.")],
};

type InfluencerContextValue = {
  state: State;
  dispatch: Dispatch<Action>;
  /** Validates the text fields first and focuses the first invalid one. Resolves to that field, or null when generation started. */
  generate: () => Promise<TextField | null>;
  /** Text fields register themselves here so generate() can focus the first invalid one. */
  registerField: (key: TextField, node: HTMLInputElement | HTMLTextAreaElement | null) => void;
  cancel: () => void;
  randomize: () => void;
  /** Returns an error message, or null when the photo was accepted. */
  attachReference: (file: File) => string | null;
  removeReference: () => void;
};

const InfluencerContext = createContext<InfluencerContextValue | null>(null);

export function InfluencerProvider({
  children,
  rules = textFieldRules,
}: {
  children: ReactNode;
  rules?: FieldRules<TextValues>;
}) {
  const [state, dispatch] = useReducer(reducer, initial);
  const controller = useRef<AbortController | null>(null);
  const photoUrl = useRef<string | null>(null);
  const fields = useRef<Record<TextField, HTMLInputElement | HTMLTextAreaElement | null>>({ name: null, extra: null });

  const registerField = useCallback((key: TextField, node: HTMLInputElement | HTMLTextAreaElement | null) => {
    fields.current[key] = node;
  }, []);

  useEffect(() => {
    dispatch({ type: "hydrate", roster: readRoster() });
    return () => {
      controller.current?.abort();
      if (photoUrl.current) URL.revokeObjectURL(photoUrl.current);
    };
  }, []);

  useEffect(() => {
    // Strict Mode runs effects twice in development; writing before the first read finishes would erase the saved list.
    if (!state.hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.roster));
    } catch {
      /* Storage can be full or blocked; the roster just won't persist. */
    }
  }, [state.roster, state.hydrated]);

  const traits = state.traits;
  const hasReference = Boolean(state.reference);
  const generate = useCallback(async (): Promise<TextField | null> => {
    const checked = validateFields<TextValues>({ name: traits.name, extra: traits.extra }, rules);
    if (!checked.ok) {
      dispatch({ type: "invalid", errors: checked.errors });
      const invalid = (Object.keys(checked.errors) as TextField[])[0];
      fields.current[invalid]?.focus();
      return invalid;
    }
    const clean: TextValues = { name: trimContent(traits.name), extra: trimContent(traits.extra) };
    const submitted = { ...traits, ...clean };
    dispatch({ type: "sanitize", values: clean });
    controller.current?.abort();
    const next = new AbortController();
    controller.current = next;
    dispatch({ type: "start" });
    try {
      const variations = await generateInfluencerPreview(submitted, next.signal, hasReference);
      if (!next.signal.aborted) dispatch({ type: "done", variations });
    } catch (cause) {
      if (!next.signal.aborted)
        dispatch({
          type: "fail",
          message: cause instanceof Error ? cause.message : "We couldn’t create your influencer. Please try again.",
        });
    }
    return null;
  }, [traits, rules, hasReference]);

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
    dispatch({ type: "reference", reference: { url: photoUrl.current, name: file.name } });
    return null;
  }, []);

  const removeReference = useCallback(() => {
    if (photoUrl.current) URL.revokeObjectURL(photoUrl.current);
    photoUrl.current = null;
    dispatch({ type: "reference", reference: null });
  }, []);

  const value = useMemo(
    () => ({ state, dispatch, generate, registerField, cancel, randomize, attachReference, removeReference }),
    [state, generate, registerField, cancel, randomize, attachReference, removeReference],
  );
  return <InfluencerContext.Provider value={value}>{children}</InfluencerContext.Provider>;
}

export function useInfluencer() {
  const value = useContext(InfluencerContext);
  if (!value) throw new Error("useInfluencer must be used inside <InfluencerProvider>.");
  return value;
}
