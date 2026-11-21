"use client";

import { Check, CloudUpload } from "lucide-react";
import { useRef } from "react";
import { REFERENCE_MIME_TYPES } from "@/constants/image-generator";
import type { StyleReference } from "@/types/ai-influencer";
import { Button } from "@/ui/Button";
import { Media } from "@/ui/Media";
import { NewStyleForm } from "./NewStyleForm";
import type { LibraryStatus, StyleDraft } from "./useStyleReferences";
import styles from "./main.module.css";

type StyleLibraryProps = {
  styles: StyleReference[];
  status: LibraryStatus;
  loadError: string;
  pickedId: string | null;
  draft: StyleDraft | null;
  name: string;
  draftError: string;
  saving: boolean;
  onRetry: () => void;
  onPickFile: (file: File) => void;
  onNameChange: (name: string) => void;
  onSave: () => void;
  onDiscard: () => void;
  onChoose: (style: StyleReference) => void;
};

/** The modal body: an upload tile, the new style being named, and every saved style to pick from. */
export function StyleLibrary(props: StyleLibraryProps) {
  const { status, draft, saving, onPickFile } = props;
  const input = useRef<HTMLInputElement>(null);
  const canUpload = status !== "signed-out" && !saving;

  return (
    <div className={styles.library}>
      <input
        ref={input}
        className={styles.file}
        type="file"
        accept={REFERENCE_MIME_TYPES.join(",")}
        tabIndex={-1}
        aria-label="Upload a style image"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) onPickFile(file);
          event.currentTarget.value = "";
        }}
      />

      {draft && (
        <NewStyleForm
          draft={draft}
          name={props.name}
          error={props.draftError}
          saving={saving}
          onNameChange={props.onNameChange}
          onSave={props.onSave}
          onDiscard={props.onDiscard}
        />
      )}
      {!draft && props.draftError && (
        <p className={styles.error} role="alert">
          {props.draftError}
        </p>
      )}

      <div className={styles.grid}>
        <button
          type="button"
          className={styles.uploadTile}
          disabled={!canUpload}
          onClick={() => input.current?.click()}
        >
          <span className={styles.uploadIcon} aria-hidden="true">
            <CloudUpload size={20} />
          </span>
          <strong>Upload style</strong>
          <small>JPEG, PNG or WebP, up to 20 MB</small>
        </button>

        {props.styles.map((style) => (
          <button
            key={style.id}
            type="button"
            className={styles.styleTile}
            data-picked={style.id === props.pickedId}
            aria-pressed={style.id === props.pickedId}
            onClick={() => props.onChoose(style)}
          >
            <Media
              media={{ kind: "image", src: style.url, alt: "" }}
              fill
              sizes="(max-width: 600px) 45vw, 200px"
              className={styles.styleImage}
              // Signed storage URLs come from hosts next/image isn't configured for, so they load as they are.
              imageProps={{ unoptimized: true }}
            />
            <span className={styles.styleShade} aria-hidden="true" />
            <span className={styles.styleName}>{style.name}</span>
            {style.id === props.pickedId && (
              <span className={styles.pickedMark} aria-hidden="true">
                <Check size={14} />
              </span>
            )}
          </button>
        ))}
      </div>

      {status === "loading" && props.styles.length === 0 && <p className={styles.status}>Loading your styles…</p>}
      {status === "ready" && props.styles.length === 0 && !draft && (
        <p className={styles.status}>No saved styles yet. Upload an image to save your first one.</p>
      )}
      {status === "signed-out" && <p className={styles.status}>Sign in to save and reuse style references.</p>}
      {status === "error" && (
        <div className={styles.status} role="alert">
          <span>{props.loadError || "Couldn't load your styles."}</span>
          <Button variant="outline" size="sm" onClick={props.onRetry}>
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}
