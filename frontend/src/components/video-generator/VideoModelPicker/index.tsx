"use client";

import { AudioLines, Check, ChevronDown, Clock, Coins, MonitorPlay, Timer, Video } from "lucide-react";
import { useState } from "react";
import { videoModels } from "@/components/video-generator/constants";
import { Modal } from "@/ui/Modal";
import { estimateCredits, estimateRenderSeconds, fitSettingsToModel, formatEta } from "@/lib/video-generator/settings";
import type { VideoSettings } from "@/types/video-generator";
import styles from "./main.module.css";

export function VideoModelPicker({
  settings,
  onChange,
}: {
  settings: VideoSettings;
  onChange: (model: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = videoModels.find((model) => model.id === settings.model) ?? videoModels[0];

  return (
    <>
      <button
        type="button"
        className={styles.videoModelPickerTrigger}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={`Video model: ${selected.name} by ${selected.maker}. Change`}
      >
        <span className={styles.symbol} aria-hidden="true">
          {selected.symbol}
        </span>
        <span className={styles.identity}>
          <strong>{selected.name}</strong>
          <small>
            {selected.maker} · up to {Math.max(...selected.durations)}s · {selected.resolutions.at(-1)}
          </small>
        </span>
        <ChevronDown size={15} aria-hidden="true" />
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Choose your video model"
        className={styles.videoModelPickerDialog}
      >
        <div className={styles.videoModelPickerBody}>
          <p className={styles.lead}>
            Each model has its own strengths. Your settings adapt to whatever the model supports.
          </p>
          <div className={styles.videoModelPickerGrid}>
            {videoModels.map((model) => {
              const fitted = fitSettingsToModel(settings, model).settings;
              return (
                <button
                  type="button"
                  key={model.id}
                  className={styles.videoModelPickerCard}
                  aria-pressed={model.id === settings.model}
                  onClick={() => {
                    onChange(model.id);
                    setOpen(false);
                  }}
                >
                  <span className={styles.cardTop}>
                    <span className={styles.symbol} aria-hidden="true">
                      {model.symbol}
                    </span>
                    <span className={styles.cardName}>
                      <strong>{model.name}</strong>
                      <small>{model.maker}</small>
                    </span>
                    {model.tag && <span className={styles.tag}>{model.tag}</span>}
                    {model.id === settings.model && (
                      <Check className={styles.videoModelPickerCheck} size={17} aria-hidden="true" />
                    )}
                  </span>
                  <p>{model.description}</p>
                  <span className={styles.caps}>
                    <span>
                      <Clock size={11} aria-hidden="true" />
                      {model.durations.join(" · ")}s
                    </span>
                    <span>
                      <MonitorPlay size={11} aria-hidden="true" />
                      {model.resolutions.at(-1)}
                    </span>
                    {model.audio && (
                      <span>
                        <AudioLines size={11} aria-hidden="true" />
                        Sound
                      </span>
                    )}
                    {model.endFrame && (
                      <span>
                        <Video size={11} aria-hidden="true" />
                        End frame
                      </span>
                    )}
                  </span>
                  <span className={styles.estimate}>
                    <span>
                      <Coins size={12} aria-hidden="true" />≈ {estimateCredits(fitted)} credits
                    </span>
                    <span>
                      <Timer size={12} aria-hidden="true" />
                      {formatEta(estimateRenderSeconds(fitted))}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          <p className={styles.videoModelPickerNote}>
            Estimates are for your current shot. In this preview every render is free and uses sample footage.
          </p>
        </div>
      </Modal>
    </>
  );
}
