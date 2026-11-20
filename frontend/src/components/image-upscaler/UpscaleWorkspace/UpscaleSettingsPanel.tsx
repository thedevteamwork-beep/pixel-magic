"use client";

import { ArrowRight, Check, ChevronDown, LoaderCircle, RotateCcw, SlidersHorizontal, Sparkles } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState, type CSSProperties, type RefObject } from "react";
import { factorChoices, formatMegapixels, formatSize, outputSize, usesTarget } from "@/lib/image-upscaler/models";
import type { ImageSize, UpscaleControl, UpscaleModel, UpscaleValue, UpscaleValues } from "@/lib/image-upscaler/types";
import { Accordion, AccordionItem } from "@/ui/Accordion";
import styles from "./main.module.css";

type PickerOption = { value: string; label: string; description?: string; symbol?: string; tag?: string };

function ModelGlyph({ symbol }: { symbol: string }) {
  return (
    <span className={styles.modelIcon} aria-hidden="true">
      {symbol}
    </span>
  );
}

/** A labelled dropdown of options, each with a line of description. */
function SettingsPicker({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  options: readonly PickerOption[];
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  const pickerRef = useRef<HTMLDetailsElement>(null);
  const [open, setOpen] = useState(false);
  const radioName = useId();
  const selected = options.find((option) => option.value === value) ?? options[0];

  const close = useCallback((restoreFocus: boolean) => {
    if (!pickerRef.current) return;
    pickerRef.current.open = false;
    if (restoreFocus) pickerRef.current.querySelector("summary")?.focus();
  }, []);

  useEffect(() => {
    if (disabled) close(false);
  }, [disabled, close]);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !pickerRef.current?.contains(event.target)) close(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      close(true);
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open, close]);

  if (!selected) return null;
  const icon = (option: PickerOption) =>
    option.symbol ? (
      <ModelGlyph symbol={option.symbol} />
    ) : (
      <span className={styles.presetOptionIcon} aria-hidden="true">
        <SlidersHorizontal size={14} />
      </span>
    );

  return (
    <div className={styles.pickerField}>
      <span className={styles.fieldLabel}>{label}</span>
      <details className={styles.picker} ref={pickerRef} onToggle={(event) => setOpen(event.currentTarget.open)}>
        <summary
          aria-label={`${label}: ${selected.label}`}
          aria-disabled={disabled}
          tabIndex={disabled ? -1 : 0}
          onClick={(event) => {
            if (disabled) event.preventDefault();
          }}
          onKeyDown={(event) => {
            if (disabled && (event.key === "Enter" || event.key === " ")) event.preventDefault();
          }}
        >
          {selected.symbol ? (
            <ModelGlyph symbol={selected.symbol} />
          ) : (
            <SlidersHorizontal size={15} className={styles.presetIcon} aria-hidden="true" />
          )}
          <span className={styles.selectedName}>{selected.label}</span>
          {selected.tag && <span className={styles.premium}>{selected.tag}</span>}
          <ChevronDown size={14} className={styles.chevron} aria-hidden="true" />
        </summary>
        <fieldset className={styles.pickerOptions} disabled={disabled}>
          <legend className={styles.upscaleSettingsPanelSrOnly}>{label} options</legend>
          {options.map((option) => (
            <label className={styles.pickerOption} key={option.value} data-selected={option.value === value}>
              <input
                type="radio"
                name={radioName}
                value={option.value}
                checked={option.value === value}
                onChange={() => {
                  onChange(option.value);
                  close(true);
                }}
                onClick={() => {
                  if (option.value === value) close(true);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    if (option.value !== value) onChange(option.value);
                    close(true);
                  }
                }}
              />
              {icon(option)}
              <span className={styles.optionCopy}>
                <span className={styles.optionName}>
                  {option.label}
                  {option.tag && <span className={styles.premium}>{option.tag}</span>}
                </span>
                {option.description && <span className={styles.optionDescription}>{option.description}</span>}
              </span>
              <span className={styles.optionCheck} aria-hidden="true">
                {option.value === value && <Check size={14} />}
              </span>
            </label>
          ))}
        </fieldset>
      </details>
    </div>
  );
}

/** Radio buttons laid out as a row of chips. */
function ChipChoice<T extends string | number>({
  legend,
  options,
  value,
  label,
  onChange,
  columns,
}: {
  legend: string;
  options: readonly T[];
  value: T;
  label: (option: T) => string;
  onChange: (value: T) => void;
  columns?: number;
}) {
  const name = useId();
  return (
    <fieldset className={styles.scaleField}>
      <legend>{legend}</legend>
      <div className={styles.scales} style={{ "--scale-columns": columns ?? options.length } as CSSProperties}>
        {options.map((option) => (
          <label key={option} className={styles.scale} data-selected={option === value}>
            <input
              type="radio"
              name={name}
              checked={option === value}
              onChange={() => onChange(option)}
              value={option}
            />
            <span>{label(option)}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function RangeSlider({
  control,
  value,
  onChange,
}: {
  control: Extract<UpscaleControl, { kind: "slider" }>;
  value: number;
  onChange: (value: number) => void;
}) {
  const sliderId = useId();
  const { min, max } = control;
  const progress = ((value - min) / (max - min || 1)) * 100;
  function update(raw: string) {
    const next = Number(raw);
    if (Number.isFinite(next)) onChange(Math.min(max, Math.max(min, Math.round(next))));
  }
  return (
    <div className={styles.tuningField}>
      <div className={styles.tuningLabel}>
        <label htmlFor={sliderId}>{control.label}</label>
        <input
          type="number"
          min={min}
          max={max}
          step={1}
          value={value}
          onChange={(event) => update(event.target.value)}
          aria-label={`${control.label} value, ${min} to ${max}`}
        />
      </div>
      <input
        id={sliderId}
        className={styles.upscaleSettingsPanelRange}
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(event) => update(event.target.value)}
        style={{ "--slider-progress": `${progress}%` } as CSSProperties}
      />
    </div>
  );
}

/** One of the model's other settings, drawn by its kind. */
function ControlField({
  control,
  value,
  onChange,
  disabled,
}: {
  control: UpscaleControl;
  value: UpscaleValue | undefined;
  onChange: (value: UpscaleValue) => void;
  disabled: boolean;
}) {
  const textId = useId();
  switch (control.kind) {
    case "choice":
      return control.options.length <= 3 ? (
        <ChipChoice
          legend={control.label}
          options={control.options}
          value={String(value ?? control.default)}
          label={(option) => (option.length <= 4 ? option.toUpperCase() : option)}
          onChange={onChange}
        />
      ) : (
        <SettingsPicker
          label={control.label}
          value={String(value ?? control.default)}
          options={control.options.map((option) => ({ value: option, label: option }))}
          onChange={onChange}
          disabled={disabled}
        />
      );
    case "toggle":
      return (
        <label className={styles.faceEnhancement}>
          <span>{control.label}</span>
          <span className={styles.switch}>
            <input
              type="checkbox"
              role="switch"
              checked={Boolean(value ?? control.default)}
              onChange={(event) => onChange(event.target.checked)}
            />
            <span className={styles.switchTrack} aria-hidden="true" />
          </span>
        </label>
      );
    case "slider":
      return <RangeSlider control={control} value={Number(value ?? control.default)} onChange={onChange} />;
    case "text":
      return (
        <div className={styles.textControl}>
          <label htmlFor={textId}>{control.label}</label>
          <textarea
            id={textId}
            rows={2}
            maxLength={control.maxLength}
            value={String(value ?? control.default)}
            placeholder={control.description}
            onChange={(event) => onChange(event.target.value)}
          />
        </div>
      );
  }
}

export type UpscaleSettingsPanelProps = {
  models: readonly UpscaleModel[];
  model: UpscaleModel;
  values: UpscaleValues;
  onModelChange: (key: string) => void;
  onValueChange: (field: string, value: UpscaleValue) => void;
  onReset: () => void;
  source: ImageSize | null;
  /** The price of these settings; null while it loads. */
  credits: number | null;
  busy: boolean;
  busyLabel: string;
  onSubmit: () => void;
  submitRef: RefObject<HTMLButtonElement | null>;
  /** A result exists: the button upscales again. */
  hasResult: boolean;
  /** The settings differ from the result's, so upscaling again is the main action. */
  changed: boolean;
};

export function UpscaleSettingsPanel({
  models,
  model,
  values,
  onModelChange,
  onValueChange,
  onReset,
  source,
  credits,
  busy,
  busyLabel,
  onSubmit,
  submitRef,
  hasResult,
  changed,
}: UpscaleSettingsPanelProps) {
  const output = outputSize(model, values, source);
  const target = usesTarget(model, values);
  const price = credits === null ? "…" : `${credits} ${credits === 1 ? "credit" : "credits"}`;

  return (
    <aside className={styles.panel} aria-label="Upscale settings">
      <header className={styles.header}>
        <h2>Upscale</h2>
        <button type="button" onClick={onReset} disabled={busy}>
          <RotateCcw size={12} aria-hidden="true" />
          Reset
        </button>
      </header>
      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          if (!busy && source) onSubmit();
        }}
      >
        <div className={styles.settingsScroll}>
          <fieldset className={styles.settingsFields} disabled={busy}>
            <legend className={styles.upscaleSettingsPanelSrOnly}>Upscale settings</legend>
            <SettingsPicker
              label="Model"
              value={model.key}
              options={models.map((option) => ({
                value: option.key,
                label: option.name,
                description: option.bestFor,
                symbol: option.symbol,
                tag: option.tag,
              }))}
              onChange={onModelChange}
              disabled={busy}
            />

            {model.target && (
              <ChipChoice
                legend="Scale by"
                options={["factor", "target"]}
                value={target ? "target" : "factor"}
                label={(mode) => (mode === "target" ? "Resolution" : "Factor")}
                onChange={(mode) => onValueChange(model.target!.modeField, mode)}
              />
            )}
            {target && model.target ? (
              <ChipChoice
                legend="Resolution"
                options={model.target.options}
                value={String(values[model.target.field])}
                label={(option) => option}
                onChange={(option) => onValueChange(model.target!.field, option)}
              />
            ) : (
              model.factor && (
                <ChipChoice
                  legend="Scale factor"
                  options={factorChoices(model)}
                  value={Number(values[model.factor.field])}
                  label={(factor) => `×${factor}`}
                  onChange={(factor) => onValueChange(model.factor!.field, factor)}
                />
              )
            )}

            <div className={styles.dimensions}>
              <div>
                <span>Original</span>
                <strong>{source ? formatSize(source) : "—"}</strong>
                {source && <small>{formatMegapixels(source)}</small>}
              </div>
              <ArrowRight size={14} aria-hidden="true" />
              <div>
                <span>Output</span>
                <strong>{output ? formatSize(output) : source ? "Set by model" : "—"}</strong>
                {output && <small>{formatMegapixels(output)}</small>}
              </div>
            </div>

            {model.controls.length > 0 && (
              <Accordion>
                <AccordionItem
                  eventKey={`more-${model.key}`}
                  title="More settings"
                  variant="plain"
                  className={styles.advanced}
                  leadingIcon={<SlidersHorizontal size={13} aria-hidden="true" />}
                  showChevron={false}
                  trailingContent={<ChevronDown size={13} className={styles.advancedChevron} aria-hidden="true" />}
                >
                  <div className={styles.advancedContent}>
                    {model.controls.map((control) => (
                      <ControlField
                        key={control.field}
                        control={control}
                        value={values[control.field]}
                        onChange={(value) => onValueChange(control.field, value)}
                        disabled={busy}
                      />
                    ))}
                  </div>
                </AccordionItem>
              </Accordion>
            )}
          </fieldset>
        </div>

        <button
          type="submit"
          className={`${styles.submit} ${hasResult && !changed ? styles.submitAgain : ""}`}
          ref={submitRef}
          disabled={busy || !source}
        >
          {busy ? (
            <LoaderCircle size={16} className={styles.upscaleSettingsPanelSpinner} aria-hidden="true" />
          ) : (
            <Sparkles size={16} aria-hidden="true" />
          )}
          <span>{busy ? busyLabel : hasResult ? "Upscale again" : "Upscale image"}</span>
          {!busy && source && <span className={styles.submitPrice}>{price}</span>}
        </button>
        {!source && <p className={styles.startHint}>Upload an image to get started.</p>}
        {hasResult && changed && !busy && (
          <p className={styles.startHint}>Settings changed. Upscale again to apply them.</p>
        )}
      </form>
    </aside>
  );
}
