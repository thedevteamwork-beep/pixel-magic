"use client";

import { ImagePlus } from "lucide-react";
import { useState } from "react";
import { Modal } from "@/ui/Modal";
import type { StyleReference as SavedStyle } from "@/types/ai-influencer";
import { useInfluencer } from "../InfluencerContext";
import { PickedStyle } from "./PickedStyle";
import { StyleLibrary } from "./StyleLibrary";
import { useStyleReferences } from "./useStyleReferences";
import styles from "./main.module.css";

/**
 * The style reference in the Style section. Opens a library of the user's saved styles, where they can pick one or
 * upload a new image and name it. The picked style's image is sent with each Generate, after the face photo.
 */
export function StyleReference() {
  const { state, selectStyle, selectedModel, referencesUsed } = useInfluencer();
  const library = useStyleReferences();
  const [open, setOpen] = useState(false);
  const busy = state.status === "generating";
  const picked = state.style;

  function openLibrary() {
    setOpen(true);
    void library.load();
  }

  function close() {
    setOpen(false);
    library.discardDraft();
  }

  function choose(style: SavedStyle) {
    selectStyle(style);
    close();
  }

  async function saveAndChoose() {
    const saved = await library.save();
    if (saved) choose(saved);
  }

  return (
    <div className={styles.reference}>
      {picked ? (
        <PickedStyle style={picked} disabled={busy} onChange={openLibrary} onRemove={() => selectStyle(null)} />
      ) : (
        <button type="button" className={styles.add} disabled={busy} onClick={openLibrary}>
          <span className={styles.addIcon} aria-hidden="true">
            <ImagePlus size={18} />
          </span>
          <strong>Add style reference</strong>
        </button>
      )}
      {picked && selectedModel && !referencesUsed.style && (
        <p className={styles.note}>
          {referencesUsed.photo
            ? "The current model takes one reference image, so it uses your photo instead of this style."
            : "Style references aren't used by the current model."}
        </p>
      )}
      <Modal open={open} onClose={close} title="Style references" className={styles.modal}>
        <StyleLibrary
          styles={library.styles}
          status={library.status}
          loadError={library.loadError}
          pickedId={picked?.id ?? null}
          draft={library.draft}
          name={library.name}
          draftError={library.draftError}
          saving={library.saving}
          onRetry={() => void library.load()}
          onPickFile={library.pickFile}
          onNameChange={library.changeName}
          onSave={() => void saveAndChoose()}
          onDiscard={library.discardDraft}
          onChoose={choose}
        />
      </Modal>
    </div>
  );
}
