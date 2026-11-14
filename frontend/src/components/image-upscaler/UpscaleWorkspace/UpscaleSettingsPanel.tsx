"use client";

import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Info,
  LoaderCircle,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState, type CSSProperties, type RefObject } from "react";
import { calculateUpscaleOutput } from "@/lib/image-upscaler/limits";
import {
  createUpscaleSettings,
  getUpscaleModel,
  normalizeUpscaleSettings,
  supportsFaceEnhancement,
  supportsUpscaleTuning,
  upscaleModels,
} from "@/lib/image-upscaler/models";
import type { UpscaleFactor, UpscaleModelId, UpscaleSettings, UpscaleSource } from "@/lib/image-upscaler/types";
import styles from "./main.module.css";

export type UpscaleSettingsPanelProps = {
  settings: UpscaleSettings;
  onChange: (next: UpscaleSettings) => void;
  onReset: () => void;
  busy: boolean;
  source: UpscaleSource | null;
  onSubmit: () => void;
  submitRef: RefObject<HTMLButtonElement | null>;
  resultIsCurrent: boolean;
};

type PickerOption = { value: string; label: string; description: string; premium?: boolean };

function ModelIcon({ model }: { model: string }) {
  return (
    <span className={`${styles.modelIcon} ${model === "bytedance" ? styles.byteDanceIcon : ""}`} aria-hidden="true">
      {model === "bytedance" ? (
        <span className={styles.bars}>
          <i />
          <i />
          <i />
          <i />
        </span>
      ) : (
        <>
          <span className={styles.pixelStep} />
          {model === "topaz-generative" && <Sparkles size={10} className={styles.generativeSpark} />}
        </>
      )}
    </span>
  );
}

function SettingsPicker({
  label,
  value,
  options,
  onChange,
  disabled,
  model = false,
}: {
  label: string;
  value: string;
  options: readonly PickerOption[];
  onChange: (value: string) => void;
  disabled: boolean;
  model?: boolean;
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
          {model ? (
            <ModelIcon model={selected.value} />
          ) : (
            <SlidersHorizontal size={15} className={styles.presetIcon} aria-hidden="true" />
          )}
          <span className={styles.selectedName}>{selected.label}</span>
          {selected.premium && <span className={styles.premium}>Premium</span>}
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
              {model ? (
                <ModelIcon model={option.value} />
              ) : (
                <span className={styles.presetOptionIcon} aria-hidden="true">
                  <SlidersHorizontal size={14} />
                </span>
              )}
              <span className={styles.optionCopy}>
                <span className={styles.optionName}>
                  {option.label}
                  {option.premium && <span className={styles.premium}>Premium</span>}
                </span>
                <span className={styles.optionDescription}>{option.description}</span>
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

function TuningSlider({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  const sliderId = useId();
  function update(raw: string) {
    const next = Number(raw);
    if (Number.isFinite(next)) onChange(Math.min(100, Math.max(0, Math.round(next))));
  }
  return (
    <div className={styles.tuningField}>
      <div className={styles.tuningLabel}>
        <label htmlFor={sliderId}>{label}</label>
        <input
          type="number"
          min={0}
          max={100}
          step={1}
          value={value}
          onChange={(event) => update(event.target.value)}
          aria-label={`${label} value, 0 to 100`}
        />
      </div>
      <input
        id={sliderId}
        className={styles.upscaleSettingsPanelRange}
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        onChange={(event) => update(event.target.value)}
        style={{ "--slider-progress": `${value}%` } as CSSProperties}
      />
    </div>
  );
}

const scales: readonly UpscaleFactor[] = [1, 2, 4, 8, 16];
const modelOptions: readonly PickerOption[] = upscaleModels.map((model) => ({
  value: model.id,
  label: model.name,
  description: model.description,
  premium: model.premium,
}));
const dimensions = (width: number, height: number) => `${width.toLocaleString()} × ${height.toLocaleString()}`;

export function UpscaleSettingsPanel({
  settings,
  onChange,
  onReset,
  busy,
  source,
  onSubmit,
  submitRef,
  resultIsCurrent,
}: UpscaleSettingsPanelProps) {
  const model = getUpscaleModel(settings.model) ?? upscaleModels[0];
  const scaleHint = useId();
  const tuning = supportsUpscaleTuning(model.id, settings.preset);
  const faceEnhancement = supportsFaceEnhancement(model.id, settings.preset);
  let output = null;
  try {
    if (source && model.factors.includes(settings.upscale_factor))
      output = calculateUpscaleOutput(source, settings.upscale_factor, "png");
  } catch {
    /* The parent also presents the upload/output error. */
  }

  function update(patch: Partial<UpscaleSettings>) {
    onChange(normalizeUpscaleSettings({ ...settings, ...patch }));
  }

  function scaleError(factor: UpscaleFactor) {
    if (!model.factors.includes(factor))
      return factor === 16 ? "16× is not available in this preview." : `${model.name} does not support ${factor}×.`;
    if (source) {
      try {
        calculateUpscaleOutput(source, factor, "png");
      } catch (cause) {
        return cause instanceof Error ? cause.message : "This scale is too large for this image.";
      }
    }
    return "";
  }

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
          if (!busy && source && output) onSubmit();
        }}
      >
        <div className={styles.settingsScroll}>
          <fieldset className={styles.settingsFields} disabled={busy}>
            <legend className={styles.upscaleSettingsPanelSrOnly}>Image upscale settings</legend>
            <SettingsPicker
              label="Model"
              value={settings.model}
              options={modelOptions}
              onChange={(value) => onChange(createUpscaleSettings(value as UpscaleModelId))}
              disabled={busy}
              model
            />

            <fieldset className={styles.scaleField} aria-describedby={scaleHint}>
              <legend>Scale factor</legend>
              <span className={styles.upscaleSettingsPanelSrOnly} id={scaleHint}>
                Available scales for {model.name}: {model.factors.map((factor) => `${factor} times`).join(", ")}.
              </span>
              <div className={styles.scales}>
                {scales.map((factor) => {
                  const unavailable = scaleError(factor);
                  return (
                    <label
                      key={factor}
                      className={styles.scale}
                      data-selected={settings.upscale_factor === factor}
                      data-disabled={Boolean(unavailable)}
                      title={unavailable || `${factor} times original dimensions`}
                    >
                      <input
                        type="radio"
                        name="upscale-factor"
                        checked={settings.upscale_factor === factor}
                        onChange={() => update({ upscale_factor: factor })}
                        disabled={Boolean(unavailable)}
                        value={factor}
                        aria-label={`${factor} times${unavailable ? ", unavailable" : ""}`}
                      />
                      <span aria-hidden="true">×{factor}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div className={styles.dimensions}>
              <div>
                <span>Original</span>
                <strong>{source ? dimensions(source.width, source.height) : "—"}</strong>
              </div>
              <ArrowRight size={14} aria-hidden="true" />
              <div>
                <span>
                  Output <small>px</small>
                </span>
                <strong>{output ? dimensions(output.width, output.height) : "—"}</strong>
              </div>
            </div>
            {source && !output && (
              <p className={styles.limitNote}>Try a smaller image or a lower scale for this preview.</p>
            )}

            {model.presets.length > 0 && (
              <details className={styles.advanced}>
                <summary
                  aria-disabled={busy}
                  tabIndex={busy ? -1 : 0}
                  onClick={(event) => {
                    if (busy) event.preventDefault();
                  }}
                  onKeyDown={(event) => {
                    if (busy && (event.key === "Enter" || event.key === " ")) event.preventDefault();
                  }}
                >
                  <SlidersHorizontal size={13} aria-hidden="true" />
                  <span>Advanced settings</span>
                  <ChevronDown size={13} className={styles.advancedChevron} aria-hidden="true" />
                </summary>
                <div className={styles.advancedContent}>
                  <SettingsPicker
                    label="Preset"
                    value={settings.preset ?? model.presets[0].value}
                    options={model.presets}
                    onChange={(preset) => update({ preset })}
                    disabled={busy}
                  />
                  {tuning && (
                    <div className={styles.tuning}>
                      <TuningSlider
                        label="Sharpness"
                        value={settings.sharpness ?? 50}
                        onChange={(sharpness) => update({ sharpness })}
                      />
                      <TuningSlider
                        label="Denoise"
                        value={settings.denoise ?? 20}
                        onChange={(denoise) => update({ denoise })}
                      />
                    </div>
                  )}
                  {faceEnhancement && (
                    <label className={styles.faceEnhancement}>
                      <span>Face enhancement</span>
                      <span className={styles.switch}>
                        <input
                          type="checkbox"
                          role="switch"
                          checked={settings.face_enhancement ?? false}
                          onChange={(event) => update({ face_enhancement: event.target.checked })}
                        />
                        <span className={styles.switchTrack} aria-hidden="true" />
                      </span>
                    </label>
                  )}
                </div>
              </details>
            )}
          </fieldset>
        </div>

        <button type="submit" className={styles.submit} ref={submitRef} disabled={busy || !source || !output}>
          {busy ? (
            <LoaderCircle size={16} className={styles.upscaleSettingsPanelSpinner} aria-hidden="true" />
          ) : (
            <Sparkles size={16} aria-hidden="true" />
          )}
          <span>{busy ? "Preparing preview…" : resultIsCurrent ? "Create preview again" : "Upscale image"}</span>
          <ArrowUpRight size={15} aria-hidden="true" />
        </button>
        {!source && <p className={styles.startHint}>Upload an image to get started.</p>}
      </form>

      <details className={styles.previewInfo}>
        <summary>
          <Info size={13} aria-hidden="true" />
          <span>Preview · resizing only · no credits</span>
          <ChevronDown size={12} aria-hidden="true" />
        </summary>
        <p>
          Images are resized locally in your browser. AI model, preset, sharpness, denoise, and face enhancement
          settings aren’t applied in this preview.
        </p>
      </details>
    </aside>
  );
}
