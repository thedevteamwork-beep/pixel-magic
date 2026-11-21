"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MAX_STYLE_NAME_LENGTH, styleNameRules } from "@/components/ai-influencer/constants";
import { listStyleReferences, saveStyleReference } from "@/lib/ai-influencer/styles";
import { imageFileError, uploadImage } from "@/lib/ai-influencer/upload";
import { api } from "@/lib/api/client";
import { isSessionEnded, messageForError } from "@/lib/generate/messages";
import { runValidators, trimContent } from "@/lib/validation/validators";
import type { StyleReference } from "@/types/ai-influencer";

export type LibraryStatus = "loading" | "ready" | "signed-out" | "error";

/** An image picked for a new style, before it is saved. The preview is a browser-local object URL. */
export type StyleDraft = { file: File; previewUrl: string };

/** The file name without its extension, as a starting name for the style. */
function nameFromFile(file: File): string {
  return file.name.replace(/\.[^.]+$/, "").slice(0, MAX_STYLE_NAME_LENGTH);
}

/** The user's saved styles, and a new one being added: pick an image, name it, save. */
export function useStyleReferences() {
  const [styles, setStyles] = useState<StyleReference[]>([]);
  const [status, setStatus] = useState<LibraryStatus>("loading");
  const [loadError, setLoadError] = useState("");
  const [draft, setDraft] = useState<StyleDraft | null>(null);
  const [name, setName] = useState("");
  const [draftError, setDraftError] = useState("");
  const [saving, setSaving] = useState(false);
  const previewUrl = useRef<string | null>(null);

  const releasePreview = useCallback(() => {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = null;
  }, []);

  useEffect(() => releasePreview, [releasePreview]);

  /** Loads the list again, so every image link is fresh. */
  const load = useCallback(async () => {
    setStatus("loading");
    try {
      setStyles(await listStyleReferences(api));
      setStatus("ready");
    } catch (error) {
      setStatus(isSessionEnded(error) ? "signed-out" : "error");
      setLoadError(messageForError(error));
    }
  }, []);

  const pickFile = useCallback(
    (file: File) => {
      const error = imageFileError(file);
      if (error) {
        setDraftError(error);
        return;
      }
      releasePreview();
      previewUrl.current = URL.createObjectURL(file);
      setDraft({ file, previewUrl: previewUrl.current });
      setName(nameFromFile(file));
      setDraftError("");
    },
    [releasePreview],
  );

  /** A new name clears the last error, which was about the old one. */
  const changeName = useCallback((value: string) => {
    setName(value);
    setDraftError("");
  }, []);

  const discardDraft = useCallback(() => {
    releasePreview();
    setDraft(null);
    setName("");
    setDraftError("");
  }, [releasePreview]);

  /** Uploads the picked image and saves it as a named style. Resolves to the new style, or null when it failed. */
  const save = useCallback(async (): Promise<StyleReference | null> => {
    if (!draft || saving) return null;
    const nameError = runValidators(name, styleNameRules);
    if (nameError) {
      setDraftError(nameError);
      return null;
    }
    setSaving(true);
    setDraftError("");
    try {
      const uploadId = await uploadImage(draft.file);
      const style = await saveStyleReference(api, trimContent(name), uploadId);
      setStyles((current) => [style, ...current]);
      discardDraft();
      return style;
    } catch (error) {
      setDraftError(messageForError(error));
      return null;
    } finally {
      setSaving(false);
    }
  }, [draft, saving, name, discardDraft]);

  return { styles, status, loadError, draft, name, changeName, draftError, saving, load, pickFile, discardDraft, save };
}
