"use client";

import { AudioLines, Dices, Info, LoaderCircle, Sparkles, Timer, VolumeX, WandSparkles, X } from "lucide-react";
import { useId, type FormEvent, type RefObject } from "react";
import { MAX_ACTIVE_RENDERS, MAX_VIDEO_PROMPT_LENGTH } from "@/components/video-generator/constants";
import {
  effectiveDuration,
  estimateCredits,
  estimateRenderSeconds,
  formatEta,
  getVideoModel,
} from "@/lib/video-generator/settings";
import type { VideoInputs, VideoMode, VideoResolution, VideoSettings } from "@/types/video-generator";
import { InputsSection, type InputTarget } from "../InputsSection";
import { ChoiceTile, CountTile, DurationTile, ModelMenu, ModeMenu, RatioShape } from "../PanelMenus";
import styles from "./main.module.css";

const resolutionHints: Record<VideoResolution, string> = { "480p": "Draft", "720p": "HD", "1080p": "Full HD" };
const placeholders: Record<VideoMode, string> = {
  text: "Describe your video: the scene, the subject, what happens and how the camera moves…",
  image: "Describe how the scene should move…",
  reference: "Describe the scene, e.g. the person in image 1 walks through the place in image 2…",
  motion: "Optional: describe the setting, outfit or mood…",
};

type DirectorPanelProps = {
  settings: VideoSettings;
  inputs: VideoInputs;
  inputBusy: InputTarget | null;
  inputError: string;
  activeRenders: number;
  error: string | null;
  promptRef: RefObject<HTMLTextAreaElement | null>;
  onChange: (patch: Partial<VideoSettings>) => void;
  onModeChange: (mode: VideoMode) => void;
  onModelChange: (model: string) => void;
  onFiles: (target: InputTarget, files: readonly File[]) => void;
  onRemove: (target: InputTarget, id?: string) => void;
  onSwap: () => void;
  onClearInputs: () => void;
  onSurprise: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function DirectorPanel(props: DirectorPanelProps) {
  const { settings, inputs, activeRenders, error, promptRef, onChange } = props;
  const id = useId();
  const model = getVideoModel(settings.model);
  const duration = effectiveDuration(settings, inputs.clip);
  const credits = estimateCredits({ ...settings, duration });
  const eta = formatEta(estimateRenderSeconds({ ...settings, duration }));
  const queueFull = activeRenders >= MAX_ACTIVE_RENDERS;
  const promptOptional = settings.mode === "image" || settings.mode === "motion";
  const sound = settings.audio && model.audio;

  return (
    <form className={styles.panel} onSubmit={props.onSubmit} aria-label="Video direction" noValidate>
      <div className={styles.scroll}>
        <div className={styles.stack}>
          <ModeMenu value={settings.mode} onChange={props.onModeChange} />
          <ModelMenu mode={settings.mode} value={settings.model} model={model} onChange={props.onModelChange} />
        </div>

        {settings.mode !== "text" && (
          <InputsSection
            mode={settings.mode}
            model={model}
            inputs={inputs}
            busy={props.inputBusy}
            aspectRatio={settings.aspectRatio}
            error={props.inputError}
            onFiles={props.onFiles}
            onRemove={props.onRemove}
            onSwap={props.onSwap}
            onClear={props.onClearInputs}
            onMatchRatio={(aspectRatio) => onChange({ aspectRatio })}
          />
        )}

        <section className={styles.section}>
          <div className={styles.labelRow}>
            <label className={styles.label} htmlFor={`${id}-prompt`}>
              Prompt{promptOptional && <span className={styles.optional}>(optional)</span>}
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
              placeholder={placeholders[settings.mode]}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? `${id}-error` : undefined}
              onChange={(event) => onChange({ prompt: event.target.value })}
            />
            <div className={styles.promptFooter}>
              <button
                type="button"
                className={styles.chip}
                aria-pressed={settings.enhancePrompt}
                onClick={() => onChange({ enhancePrompt: !settings.enhancePrompt })}
                title="Let the model expand your prompt with cinematic detail"
              >
                <WandSparkles size={13} aria-hidden="true" />
                Enhance
              </button>
              <button
                type="button"
                className={styles.chip}
                aria-pressed={sound}
                disabled={!model.audio}
                onClick={() => onChange({ audio: !settings.audio })}
                title={model.audio ? "Generate synced sound and ambience" : `${model.name} renders silent clips`}
              >
                {sound ? <AudioLines size={13} aria-hidden="true" /> : <VolumeX size={13} aria-hidden="true" />}
                {model.audio ? (sound ? "Sound on" : "Sound off") : "No sound"}
              </button>
              <span className={styles.count}>
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

        <div className={styles.tiles}>
          <DurationTile
            model={model}
            value={settings.duration}
            onChange={(value) => onChange({ duration: value })}
            lockedTo={settings.mode === "motion" && inputs.clip ? duration : undefined}
          />
          <ChoiceTile
            label="Aspect ratio"
            value={settings.aspectRatio}
            options={model.aspectRatios}
            onChange={(aspectRatio) => onChange({ aspectRatio })}
            render={(ratio) => (
              <>
                <RatioShape ratio={ratio} />
                {ratio}
              </>
            )}
          />
          <ChoiceTile
            label="Resolution"
            value={settings.resolution}
            options={model.resolutions}
            onChange={(resolution) => onChange({ resolution })}
            hint={(resolution) => resolutionHints[resolution]}
          />
          <CountTile value={settings.count} onChange={(count) => onChange({ count })} />
        </div>
      </div>

      <div className={styles.footer}>
        <button type="submit" className={styles.generate} disabled={queueFull} aria-describedby={`${id}-generate-note`}>
          <span>{queueFull ? "Queue full" : activeRenders ? "Generate another" : "Generate"}</span>
          {!queueFull && (
            <span className={styles.price}>
              <Sparkles size={15} fill="currentColor" aria-hidden="true" />
              {credits}
            </span>
          )}
        </button>
        <p className={styles.summary} id={`${id}-generate-note`}>
          {queueFull ? (
            <span>Up to {MAX_ACTIVE_RENDERS} videos can render at once.</span>
          ) : (
            <>
              <span>
                <strong>Free in preview</strong>
              </span>
              <span>
                <Timer size={12} aria-hidden="true" />
                {eta}
              </span>
              <span className={styles.keys} aria-label="Shortcut: Command or Control plus Enter">
                <kbd>⌘</kbd>
                <kbd>↵</kbd>
              </span>
            </>
          )}
          {activeRenders > 0 && (
            <span className={styles.rendering}>
              <LoaderCircle size={12} className={styles.spinner} aria-hidden="true" />
              {activeRenders} rendering
            </span>
          )}
        </p>
      </div>
    </form>
  );
}
