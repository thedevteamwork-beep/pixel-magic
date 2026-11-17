"use client";

import { Check, ChevronDown, ImagePlus, Search, Sparkles } from "lucide-react";
import { useState } from "react";
import type { StudioModel } from "@/types/image-generator";
import { Modal } from "@/ui/Modal";
import styles from "./main.module.css";

type ModelPickerProps = {
  models: readonly StudioModel[];
  value: string;
  onChange: (model: string) => void;
  disabled?: boolean;
  compact?: boolean;
};

function creditLabel({ credits }: StudioModel) {
  return credits.min === credits.max ? `${credits.min} credits` : `${credits.min}–${credits.max} credits`;
}

export function ModelPicker({ models, value, onChange, disabled = false, compact = false }: ModelPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [maker, setMaker] = useState("All models");
  const modelMakers = ["All models", ...new Set(models.map((model) => model.maker))];
  const selected = models.find((model) => model.key === value) ?? models[0];
  const query = search.trim().toLowerCase();
  const filtered = models.filter(
    (model) =>
      (maker === "All models" || model.maker === maker) &&
      `${model.name} ${model.maker} ${model.description}`.toLowerCase().includes(query),
  );

  return (
    <>
      <button
        type="button"
        className={`${styles.modelTrigger} ${compact ? styles.compactModel : ""}`}
        disabled={disabled}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={`Change image model, ${selected.name}`}
      >
        <span className={styles.modelSymbol} aria-hidden="true">
          {selected.symbol}
        </span>
        <span className={styles.modelIdentity}>
          <strong>{selected.name}</strong>
          <small>{selected.maker}</small>
        </span>
        <ChevronDown size={15} aria-hidden="true" />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Choose your image model" className={styles.modelDialog}>
        <div className={styles.modelDialogBody}>
          <label className={styles.search}>
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Find a model or creator"
              aria-label="Search image models"
              onKeyDown={(event) => {
                if (event.key === "Enter") event.preventDefault();
              }}
            />
          </label>
          <div className={styles.makers} role="group" aria-label="Filter models by creator">
            {modelMakers.map((name) => (
              <button type="button" key={name} aria-pressed={maker === name} onClick={() => setMaker(name)}>
                {name}
              </button>
            ))}
          </div>
          <div className={styles.modelGrid}>
            {filtered.map((model) => (
              <button
                type="button"
                className={styles.modelCard}
                key={model.key}
                aria-pressed={value === model.key}
                disabled={disabled}
                onClick={() => {
                  onChange(model.key);
                  setOpen(false);
                }}
              >
                <span className={styles.modelCardTop}>
                  <span className={styles.modelSymbol} aria-hidden="true">
                    {model.symbol}
                  </span>
                  {model.tag && <span className={styles.modelTag}>{model.tag}</span>}
                  {value === model.key && <Check className={styles.selectedCheck} size={17} aria-hidden="true" />}
                </span>
                <strong>{model.name}</strong>
                <span className={styles.makerName}>{model.maker}</span>
                <p>{model.description}</p>
                <span className={styles.modelMeta}>
                  <Sparkles size={11} aria-hidden="true" /> {creditLabel(model)}
                  {model.references && (
                    <>
                      {" · "}
                      <ImagePlus size={11} aria-hidden="true" /> Up to {model.references.max}{" "}
                      {model.references.max === 1 ? "reference" : "references"}
                    </>
                  )}
                </span>
              </button>
            ))}
          </div>
          {filtered.length === 0 && (
            <p className={styles.empty} role="status">
              No models match that search. Try a different name.
            </p>
          )}
          <p className={styles.dialogNote}>
            Prices are per generation and shown on the Generate button before you create.
          </p>
        </div>
      </Modal>
    </>
  );
}
