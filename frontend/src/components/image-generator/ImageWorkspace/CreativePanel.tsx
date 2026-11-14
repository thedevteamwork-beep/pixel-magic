"use client";

import {
  Check,
  ChevronDown,
  ImagePlus,
  Info,
  Palette,
  Plus,
  SlidersHorizontal,
  Sparkles,
  SunMedium,
  X,
} from "lucide-react";
import { Media } from "@/ui/Media";
import { useId } from "react";
import { MAX_REFERENCE_IMAGES } from "@/constants/image-generator";
import { lightingOptions, paletteOptions, stylePresets } from "@/components/image-generator/constants";
import { landingAssets } from "@/constants/landing-media";
import type { ReferenceImage } from "@/types/image-generator";
import styles from "./main.module.css";

type ReferenceRole = "subject" | "style";

export type CreativePanelProps = {
  references: readonly ReferenceImage[];
  style: string;
  lighting: string;
  palette: string;
  guidancePrompt: string;
  onStyleChange: (value: string) => void;
  onLightingChange: (value: string) => void;
  onPaletteChange: (value: string) => void;
  onRoleChange: (id: string, role: ReferenceRole) => void;
  onUpload: (role: ReferenceRole) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
  maxReferences?: number;
  inDialog?: boolean;
  uploadError?: string;
};

function ReferenceSlot({
  role,
  reference,
  canAdd,
  onUpload,
  onRemove,
  onRoleChange,
}: {
  role: ReferenceRole;
  reference?: ReferenceImage;
  canAdd: boolean;
  onUpload: (role: ReferenceRole) => void;
  onRemove: (id: string) => void;
  onRoleChange: (id: string, role: ReferenceRole) => void;
}) {
  const title = role === "subject" ? "Subject reference" : "Style reference";
  return (
    <div className={styles.referenceSlot}>
      <h3>{title}</h3>
      {reference ? (
        <>
          <div className={styles.referenceImage}>
            {/* Local blob previews must bypass the image optimizer. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={reference.url} alt={`${title}: ${reference.name}`} />
            <button
              type="button"
              className={styles.removeReference}
              onClick={() => onRemove(reference.id)}
              aria-label={`Remove ${role} reference: ${reference.name}`}
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
          <span className={styles.referenceName} title={reference.name}>
            {reference.name}
          </span>
          <span className={styles.roleSelect}>
            <select
              aria-label={`Reference role for ${reference.name}`}
              value={reference.role ?? "subject"}
              onChange={(event) => onRoleChange(reference.id, event.target.value as ReferenceRole)}
            >
              <option value="subject">Subject</option>
              <option value="style">Style</option>
            </select>
            <ChevronDown size={12} aria-hidden="true" />
          </span>
          <button
            type="button"
            className={styles.addAnother}
            disabled={!canAdd}
            onClick={() => onUpload(role)}
            aria-label={`Add another ${role} reference`}
          >
            <Plus size={12} aria-hidden="true" />
            Add another
          </button>
        </>
      ) : (
        <button
          type="button"
          className={styles.emptySlot}
          disabled={!canAdd}
          onClick={() => onUpload(role)}
          aria-label={`Add ${role} reference`}
        >
          <ImagePlus size={21} aria-hidden="true" />
          <strong>Add image</strong>
          <span>{role === "subject" ? "Guide what appears" : "Guide the look"}</span>
        </button>
      )}
    </div>
  );
}

export function CreativePanel({
  references,
  style,
  lighting,
  palette,
  guidancePrompt,
  onStyleChange,
  onLightingChange,
  onPaletteChange,
  onRoleChange,
  onUpload,
  onRemove,
  onClose,
  maxReferences = MAX_REFERENCE_IMAGES,
  inDialog = false,
  uploadError = "",
}: CreativePanelProps) {
  const id = useId();
  const subjectReference = references.find((reference) => (reference.role ?? "subject") === "subject");
  const styleReference = references.find((reference) => reference.role === "style");
  const featuredIds = new Set([subjectReference?.id, styleReference?.id]);
  const additionalReferences = references.filter((reference) => !featuredIds.has(reference.id));
  const canAdd = references.length < maxReferences;
  const selectedStyle = stylePresets.find((preset) => preset.value === style);
  const selectedLighting = lightingOptions.find((option) => option.value === lighting);
  const selectedPalette = paletteOptions.find((option) => option.value === palette);

  return (
    <section
      className={styles.creativePanelPanel}
      aria-label={inDialog ? "Creative guidance controls" : undefined}
      aria-labelledby={inDialog ? undefined : `${id}-title`}
    >
      {!inDialog && (
        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>
              <Sparkles size={11} aria-hidden="true" />A little direction
            </span>
            <h2 id={`${id}-title`}>Creative options</h2>
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close creative options">
            <X size={17} aria-hidden="true" />
          </button>
        </header>
      )}
      <p className={styles.introduction}>Shape the subject, mood, and visual direction. Every choice is optional.</p>

      <section className={styles.referenceSection} aria-labelledby={`${id}-references`}>
        <div className={styles.sectionHeading}>
          <h3 id={`${id}-references`}>Your references</h3>
          <span>
            {references.length}/{maxReferences}
          </span>
        </div>
        <div className={styles.referenceSlots}>
          <ReferenceSlot
            role="subject"
            reference={subjectReference}
            canAdd={canAdd}
            onUpload={onUpload}
            onRemove={onRemove}
            onRoleChange={onRoleChange}
          />
          <ReferenceSlot
            role="style"
            reference={styleReference}
            canAdd={canAdd}
            onUpload={onUpload}
            onRemove={onRemove}
            onRoleChange={onRoleChange}
          />
        </div>
        {additionalReferences.length > 0 && (
          <ul className={styles.additionalReferences} aria-label="Additional references">
            {additionalReferences.map((reference) => (
              <li key={reference.id}>
                <span className={styles.additionalImage}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={reference.url} alt="" />
                </span>
                <div className={styles.additionalIdentity}>
                  <span title={reference.name}>{reference.name}</span>
                  <span className={styles.roleSelect}>
                    <select
                      aria-label={`Reference role for ${reference.name}`}
                      value={reference.role ?? "subject"}
                      onChange={(event) => onRoleChange(reference.id, event.target.value as ReferenceRole)}
                    >
                      <option value="subject">Subject</option>
                      <option value="style">Style</option>
                    </select>
                    <ChevronDown size={12} aria-hidden="true" />
                  </span>
                </div>
                <button
                  type="button"
                  className={styles.removeAdditional}
                  onClick={() => onRemove(reference.id)}
                  aria-label={`Remove reference: ${reference.name}`}
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className={styles.note}>
          {canAdd
            ? "Reference files stay in this browser."
            : "Your reference set is full. Remove an image to add another."}
        </p>
        {uploadError && (
          <p className={styles.uploadError} role="alert">
            {uploadError}
          </p>
        )}
      </section>

      <section className={styles.styleSection} aria-labelledby={`${id}-style`}>
        <div className={styles.sectionHeading}>
          <h3 id={`${id}-style`}>Style direction</h3>
          <button
            type="button"
            className={styles.clearStyle}
            aria-pressed={style === "None"}
            onClick={() => onStyleChange("None")}
          >
            None
          </button>
        </div>
        <div className={styles.styleGrid} role="group" aria-labelledby={`${id}-style`}>
          {stylePresets.map((preset) => (
            <button
              type="button"
              key={preset.value}
              className={styles.styleCard}
              aria-pressed={style === preset.value}
              onClick={() => onStyleChange(preset.value)}
              aria-label={`${preset.name}: ${preset.description}`}
            >
              <span className={styles.styleImage}>
                <Media
                  media={{ kind: "image", src: landingAssets[preset.asset].image, alt: "" }}
                  fill
                  sizes="(max-width: 600px) 42vw, 140px"
                />
                {style === preset.value && (
                  <span className={styles.styleCheck}>
                    <Check size={12} aria-hidden="true" />
                  </span>
                )}
              </span>
              <span className={styles.styleName}>{preset.name}</span>
            </button>
          ))}
        </div>
        <div className={styles.styleDescription} role="status">
          <p>{selectedStyle?.description ?? "Let your prompt set the direction."}</p>
          {selectedStyle && <span>Guides your next preview</span>}
        </div>
      </section>

      <details className={styles.details}>
        <summary>
          <SunMedium size={15} aria-hidden="true" />
          <span>Lighting &amp; colors</span>
          <ChevronDown className={styles.detailsChevron} size={14} aria-hidden="true" />
        </summary>
        <div className={styles.detailsBody}>
          <label className={styles.field}>
            <span>
              <SunMedium size={12} aria-hidden="true" />
              Lighting
            </span>
            <span className={styles.selectWrap}>
              <select value={lighting} onChange={(event) => onLightingChange(event.target.value)}>
                {lightingOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={13} aria-hidden="true" />
            </span>
          </label>
          {selectedLighting?.instruction && <p className={styles.optionDescription}>{selectedLighting.instruction}</p>}
          <label className={styles.field}>
            <span>
              <Palette size={12} aria-hidden="true" />
              Color palette
            </span>
            <span className={styles.selectWrap}>
              <select value={palette} onChange={(event) => onPaletteChange(event.target.value)}>
                {paletteOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={13} aria-hidden="true" />
            </span>
          </label>
          {selectedPalette?.swatches && (
            <div className={styles.swatches} aria-hidden="true">
              {selectedPalette.swatches.map((color, index) => (
                <span key={`${color}-${index}`} style={{ background: color }} />
              ))}
            </div>
          )}
          {selectedPalette?.instruction && <p className={styles.optionDescription}>{selectedPalette.instruction}</p>}
        </div>
      </details>

      <details className={styles.details}>
        <summary>
          <SlidersHorizontal size={15} aria-hidden="true" />
          <span>Prompt additions</span>
          <ChevronDown className={styles.detailsChevron} size={14} aria-hidden="true" />
        </summary>
        <div className={styles.detailsBody}>
          <p className={styles.optionDescription}>The direction added by your creative choices.</p>
          <textarea
            aria-label="Prompt additions"
            aria-describedby={`${id}-sample-note`}
            readOnly
            rows={5}
            value={guidancePrompt}
            placeholder="Choose a style, lighting, or palette to add direction. Your own prompt stays in the canvas."
          />
        </div>
      </details>

      <p className={styles.sampleNote} id={`${id}-sample-note`}>
        <Info size={14} aria-hidden="true" />
        <span>This preview uses existing sample photos. They aren’t generated from your prompt or references.</span>
      </p>
    </section>
  );
}
