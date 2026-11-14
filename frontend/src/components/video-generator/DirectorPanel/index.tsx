"use client";

import {
  AudioLines,
  ChevronDown,
  Coins,
  Dices,
  Film,
  Images,
  Info,
  Layers,
  LoaderCircle,
  Lock,
  Sparkles,
  Timer,
  Type,
  VolumeX,
  WandSparkles,
  X,
} from "lucide-react";
import { useId, type CSSProperties, type FormEvent, type ReactNode, type RefObject } from "react";
import {
  MAX_ACTIVE_RENDERS,
  MAX_NEGATIVE_PROMPT_LENGTH,
  MAX_VIDEO_PROMPT_LENGTH,
  motionPresets,
  videoCounts,
} from "@/components/video-generator/constants";
import {
  estimateCredits,
  estimateRenderSeconds,
  formatEta,
  getVideoModel,
  motionIntensity,
  ratioValue,
} from "@/lib/video-generator/settings";
import type { FrameImage, FrameSlot, VideoMode, VideoSettings } from "@/types/video-generator";
import { FrameSlots } from "@/components/video-generator/FrameSlots";
import { MotionPicker } from "@/components/video-generator/MotionPicker";
import { VideoModelPicker } from "@/components/video-generator/VideoModelPicker";
import styles from "./main.module.css";

type DirectorPanelProps = {
  settings: VideoSettings;
  frames: Record<FrameSlot, FrameImage | null>;
  frameBusy: FrameSlot | null;
  frameError: string;
  activeRenders: number;
  error: string | null;
  promptRef: RefObject<HTMLTextAreaElement | null>;
  onChange: (patch: Partial<VideoSettings>) => void;
  onModeChange: (mode: VideoMode) => void;
  onModelChange: (model: string) => void;
  onFrameFiles: (slot: FrameSlot, files: readonly File[]) => void;
  onRemoveFrame: (slot: FrameSlot) => void;
  onSwapFrames: () => void;
  onSurprise: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

const modes: readonly { id: VideoMode; label: string; icon: typeof Type }[] = [
  { id: "text", label: "Text", icon: Type },
  { id: "image", label: "Image", icon: Images },
  { id: "frames", label: "Frames", icon: Layers },
];

function RatioShape({ ratio }: { ratio: string }) {
  const value = ratioValue(ratio);
  const width = value >= 1 ? 18 : Math.round(18 * value);
  const height = value >= 1 ? Math.round(18 / value) : 18;
  return <span className={styles.ratioShape} style={{ width, height }} aria-hidden="true" />;
}

function Segmented<T extends string | number>({
  legend,
  name,
  options,
  value,
  onChange,
  render,
}: {
  legend: string;
  name: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  render?: (option: T) => ReactNode;
}) {
  return (
    <fieldset className={styles.field}>
      <legend className={styles.label}>{legend}</legend>
      <div className={styles.segmented} style={{ "--segments": options.length } as CSSProperties}>
        {options.map((option) => (
          <label key={option}>
            <input
              type="radio"
              name={name}
              value={option}
              checked={option === value}
              onChange={() => onChange(option)}
            />
            <span>{render ? render(option) : option}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function DirectorPanel(props: DirectorPanelProps) {
  const {
    settings,
    frames,
    frameBusy,
    frameError,
    activeRenders,
    error,
    promptRef,
    onChange,
    onModeChange,
    onModelChange,
  } = props;
  const id = useId();
  const model = getVideoModel(settings.model);
  const credits = estimateCredits(settings);
  const eta = formatEta(estimateRenderSeconds(settings));
  const motion = motionPresets.find((preset) => preset.id === settings.motion) ?? motionPresets[0];
  const queueFull = activeRenders >= MAX_ACTIVE_RENDERS;
  const promptRequired = settings.mode === "text";
  const strengthVisible = !["auto", "static"].includes(settings.motion);

  return (
    <form className={styles.panel} onSubmit={props.onSubmit} aria-label="Video direction" noValidate>
      <div className={styles.scroll}>
        <div className={styles.modes} role="group" aria-label="How do you want to start?">
          {modes.map(({ id: mode, label, icon: Icon }) => {
            const unsupported = mode === "frames" && !model.endFrame;
            return (
              <button
                type="button"
                key={mode}
                aria-pressed={settings.mode === mode}
                disabled={unsupported}
                title={unsupported ? `${model.name} doesn’t support end frames` : undefined}
                onClick={() => onModeChange(mode)}
              >
                <Icon size={14} aria-hidden="true" />
                {label}
              </button>
            );
          })}
          <span className={styles.modeIndicator} data-mode={settings.mode} aria-hidden="true" />
        </div>

        {settings.mode !== "text" && (
          <section className={styles.section} aria-label="Frames">
            <FrameSlots
              mode={settings.mode}
              frames={frames}
              busy={frameBusy}
              aspectRatio={settings.aspectRatio}
              supportedRatios={model.aspectRatios}
              onFiles={props.onFrameFiles}
              onRemove={props.onRemoveFrame}
              onSwap={props.onSwapFrames}
              onMatchRatio={(aspectRatio) => onChange({ aspectRatio })}
              error={frameError}
            />
          </section>
        )}

        <section className={styles.section}>
          <div className={styles.labelRow}>
            <label className={styles.label} htmlFor={`${id}-prompt`}>
              Prompt{!promptRequired && <span className={styles.optional}>optional</span>}
            </label>
            <button type="button" className={styles.ghost} onClick={props.onSurprise} title="Load a random idea">
              <Dices size={13} aria-hidden="true" />
              Surprise me
            </button>
          </div>
          <div className={styles.promptBox} data-invalid={Boolean(error)}>
            <textarea
              ref={promptRef}
              id={`${id}-prompt`}
              value={settings.prompt}
              maxLength={MAX_VIDEO_PROMPT_LENGTH}
              rows={4}
              placeholder={
                settings.mode === "text"
                  ? "Describe the scene, the subject, and what happens…"
                  : "Describe how the scene should move…"
              }
              aria-invalid={Boolean(error)}
              aria-describedby={`${id}-prompt-help${error ? ` ${id}-error` : ""}`}
              onChange={(event) => onChange({ prompt: event.target.value })}
            />
            <div className={styles.promptFooter}>
              <button
                type="button"
                className={styles.enhance}
                aria-pressed={settings.enhancePrompt}
                onClick={() => onChange({ enhancePrompt: !settings.enhancePrompt })}
                title="Let the model expand your prompt with cinematic detail"
              >
                <WandSparkles size={13} aria-hidden="true" />
                Enhance
              </button>
              {settings.motion !== "auto" && (
                <span className={styles.cameraChip} title="Camera direction added to your prompt">
                  <Film size={11} aria-hidden="true" />
                  {motion.name}
                </span>
              )}
              <span className={styles.count} id={`${id}-prompt-help`} aria-live="off">
                {settings.prompt.length}
                <span>/{MAX_VIDEO_PROMPT_LENGTH}</span>
              </span>
              {settings.prompt && (
                <button
                  type="button"
                  className={styles.clear}
                  onClick={() => {
                    onChange({ prompt: "" });
                    promptRef.current?.focus();
                  }}
                  aria-label="Clear prompt"
                >
                  <X size={13} aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
          {error && (
            <p className={styles.error} id={`${id}-error`} role="alert">
              <Info size={13} aria-hidden="true" />
              {error}
            </p>
          )}
        </section>

        <section className={styles.section}>
          <span className={styles.label} id={`${id}-motion`}>
            Camera motion
          </span>
          <MotionPicker value={settings.motion} onChange={(value) => onChange({ motion: value })} />
          {strengthVisible && (
            <label className={styles.strength}>
              <span>
                Intensity <strong>{motionIntensity(settings.motionStrength)}</strong>
              </span>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={settings.motionStrength}
                onChange={(event) => onChange({ motionStrength: Number(event.target.value) })}
                style={{ "--fill": `${settings.motionStrength}%` } as CSSProperties}
                aria-valuetext={motionIntensity(settings.motionStrength)}
              />
            </label>
          )}
        </section>

        <section className={styles.section}>
          <span className={styles.label}>Model</span>
          <VideoModelPicker settings={settings} onChange={onModelChange} />
        </section>

        <div className={styles.grid}>
          <Segmented
            legend="Duration"
            name={`${id}-duration`}
            options={model.durations}
            value={settings.duration}
            onChange={(duration) => onChange({ duration })}
            render={(value) => `${value}s`}
          />
          <Segmented
            legend="Resolution"
            name={`${id}-resolution`}
            options={model.resolutions}
            value={settings.resolution}
            onChange={(resolution) => onChange({ resolution })}
          />
        </div>

        <fieldset className={styles.field}>
          <legend className={styles.label}>Aspect ratio</legend>
          <div className={styles.ratios}>
            {model.aspectRatios.map((ratio) => (
              <label key={ratio}>
                <input
                  type="radio"
                  name={`${id}-ratio`}
                  value={ratio}
                  checked={settings.aspectRatio === ratio}
                  onChange={() => onChange({ aspectRatio: ratio })}
                />
                <span>
                  <RatioShape ratio={ratio} />
                  {ratio}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className={styles.grid}>
          <Segmented
            legend="Videos"
            name={`${id}-count`}
            options={videoCounts}
            value={settings.count as (typeof videoCounts)[number]}
            onChange={(count) => onChange({ count })}
          />
          <div className={styles.field}>
            <span className={styles.label} id={`${id}-sound`}>
              Sound
            </span>
            <button
              type="button"
              role="switch"
              className={styles.switch}
              aria-checked={settings.audio && model.audio}
              aria-labelledby={`${id}-sound`}
              disabled={!model.audio}
              onClick={() => onChange({ audio: !settings.audio })}
              title={model.audio ? "Generate synced sound and ambience" : `${model.name} renders silent clips`}
            >
              {settings.audio && model.audio ? (
                <AudioLines size={14} aria-hidden="true" />
              ) : (
                <VolumeX size={14} aria-hidden="true" />
              )}
              <span>{!model.audio ? "Not available" : settings.audio ? "On" : "Off"}</span>
              <span className={styles.knob} aria-hidden="true" />
            </button>
          </div>
        </div>

        <details className={styles.advanced}>
          <summary>
            <span>Advanced</span>
            {(settings.seed !== null || settings.negativePrompt) && (
              <span className={styles.dot} aria-label="Advanced settings in use" />
            )}
            <ChevronDown size={14} aria-hidden="true" />
          </summary>
          <div className={styles.advancedBody}>
            <label className={styles.field}>
              <span className={styles.label}>Seed</span>
              <span className={styles.seed}>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={4294967295}
                  placeholder="Random each time"
                  value={settings.seed ?? ""}
                  onChange={(event) => {
                    const value = event.target.value;
                    onChange({
                      seed: value === "" ? null : Math.max(0, Math.min(4294967295, Math.floor(Number(value)) || 0)),
                    });
                  }}
                />
                <button
                  type="button"
                  onClick={() => onChange({ seed: crypto.getRandomValues(new Uint32Array(1))[0] })}
                  aria-label="Pick a random seed"
                  title="Pick and lock a random seed"
                >
                  <Dices size={14} aria-hidden="true" />
                </button>
                {settings.seed !== null && (
                  <button
                    type="button"
                    onClick={() => onChange({ seed: null })}
                    aria-label="Unlock seed"
                    title="Use a new random seed each time"
                  >
                    <Lock size={13} aria-hidden="true" />
                  </button>
                )}
              </span>
              <small>Lock a seed to explore small prompt changes with a similar result.</small>
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Avoid</span>
              <textarea
                rows={2}
                maxLength={MAX_NEGATIVE_PROMPT_LENGTH}
                value={settings.negativePrompt}
                placeholder="Blur, distortion, extra limbs, text…"
                onChange={(event) => onChange({ negativePrompt: event.target.value })}
              />
            </label>
          </div>
        </details>
      </div>

      <div className={styles.footer}>
        <div className={styles.summary} aria-live="polite">
          <span>
            <Coins size={12} aria-hidden="true" />
            <span className={styles.strike}>{credits}</span>
            <strong>Free preview</strong>
          </span>
          <span>
            <Timer size={12} aria-hidden="true" />
            {eta}
          </span>
          {activeRenders > 0 && (
            <span className={styles.rendering}>
              <LoaderCircle size={12} className={styles.directorPanelSpinner} aria-hidden="true" />
              {activeRenders} rendering
            </span>
          )}
        </div>
        <button type="submit" className={styles.generate} disabled={queueFull} aria-describedby={`${id}-generate-note`}>
          <Sparkles size={16} aria-hidden="true" />
          <span>{queueFull ? "Queue full" : activeRenders ? "Generate another" : "Generate"}</span>
          <kbd aria-hidden="true">⌘ ↵</kbd>
        </button>
        <p className={styles.directorPanelSrOnly} id={`${id}-generate-note`}>
          {queueFull
            ? `Up to ${MAX_ACTIVE_RENDERS} videos can render at once. Wait for one to finish.`
            : `Indicative cost ${credits} credits; this preview is free and uses sample footage. Press Command or Control and Enter to generate.`}
        </p>
      </div>
    </form>
  );
}
