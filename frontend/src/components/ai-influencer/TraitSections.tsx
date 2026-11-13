"use client";

import { useId } from "react";
import { MAX_EXTRA_LENGTH, MAX_NAME_LENGTH, traitGroups, type TextField } from "@/constants/ai-influencer";
import type { InfluencerTraits, TileKind, TraitKey, TraitOption } from "@/types/ai-influencer";
import { ArtTile } from "./ArtTile";
import { ControlSection } from "./ControlSection";
import { useInfluencer } from "./InfluencerContext";
import styles from "./TraitSections.module.css";

function OptionGroup({
  traitKey,
  label,
  options,
  value,
  disabled,
  tiles,
  traits,
  onChange,
}: {
  traitKey: TraitKey;
  label: string;
  options: readonly TraitOption[];
  value: string;
  disabled: boolean;
  tiles?: TileKind;
  traits: InfluencerTraits;
  onChange: (value: string) => void;
}) {
  const name = useId();
  if (tiles)
    return (
      <fieldset className={styles.field} disabled={disabled}>
        <legend>{label}</legend>
        <div className={styles.tiles}>
          {options.map((option) => (
            <label key={option.value} className={styles.tile} data-kind={tiles} data-selected={option.value === value}>
              <input
                type="radio"
                name={`${name}-${traitKey}`}
                value={option.value}
                checked={option.value === value}
                onChange={() => onChange(option.value)}
              />
              <span className={styles.art}>
                <ArtTile kind={tiles} option={option} traits={traits} />
              </span>
              <span className={styles.tileLabel}>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
    );
  return (
    <fieldset className={styles.field} disabled={disabled}>
      <legend>{label}</legend>
      <div className={styles.options}>
        {options.map((option) => (
          <label
            key={option.value}
            className={styles.option}
            data-selected={option.value === value}
            title={option.label}
          >
            <input
              type="radio"
              name={`${name}-${traitKey}`}
              value={option.value}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
            />
            {option.swatch && (
              <span className={styles.swatch} style={{ background: option.swatch }} aria-hidden="true" />
            )}
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Name and notes plus every trait group. The text fields register themselves so submit can focus the first invalid one. */
export function TraitSections({
  registerField,
}: {
  registerField: (key: TextField, node: HTMLInputElement | HTMLTextAreaElement | null) => void;
}) {
  const { state, dispatch } = useInfluencer();
  const { traits, fieldErrors } = state;
  const busy = state.status === "generating";
  const nameId = useId();
  const extraId = useId();

  return (
    <>
      <ControlSection title="Name & notes" defaultOpen>
        <div className={styles.textField}>
          <label htmlFor={nameId}>Name</label>
          <input
            id={nameId}
            ref={(node) => {
              registerField("name", node);
            }}
            type="text"
            value={traits.name}
            maxLength={MAX_NAME_LENGTH}
            placeholder="e.g. Mira Kapoor"
            disabled={busy}
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={fieldErrors.name ? `${nameId}-error` : undefined}
            onChange={(event) => dispatch({ type: "trait", key: "name", value: event.target.value })}
          />
          {fieldErrors.name && (
            <span id={`${nameId}-error`} className={styles.fieldError} role="alert">
              {fieldErrors.name}
            </span>
          )}
        </div>
        <div className={styles.textField}>
          <label htmlFor={extraId}>
            Extra details <small>optional</small>
          </label>
          <textarea
            id={extraId}
            ref={(node) => {
              registerField("extra", node);
            }}
            rows={3}
            value={traits.extra}
            maxLength={MAX_EXTRA_LENGTH}
            placeholder="Freckles, gold hoop earrings, warm smile…"
            disabled={busy}
            aria-invalid={Boolean(fieldErrors.extra)}
            aria-describedby={fieldErrors.extra ? `${extraId}-error` : undefined}
            onChange={(event) => dispatch({ type: "trait", key: "extra", value: event.target.value })}
          />
          {fieldErrors.extra && (
            <span id={`${extraId}-error`} className={styles.fieldError} role="alert">
              {fieldErrors.extra}
            </span>
          )}
          <span className={styles.count}>
            {traits.extra.length}/{MAX_EXTRA_LENGTH}
          </span>
        </div>
      </ControlSection>
      {traitGroups.map((group) => (
        <ControlSection key={group.id} title={group.title} defaultOpen={group.id === "identity"}>
          {group.fields.map((field) => (
            <OptionGroup
              key={field.key}
              traitKey={field.key}
              label={field.label}
              options={field.options}
              value={traits[field.key]}
              disabled={busy}
              tiles={field.tiles}
              traits={traits}
              onChange={(value) => dispatch({ type: "trait", key: field.key, value })}
            />
          ))}
        </ControlSection>
      ))}
    </>
  );
}
