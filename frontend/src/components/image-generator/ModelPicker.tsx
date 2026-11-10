"use client";

import { Check, ChevronDown, Search } from "lucide-react";
import { useState } from "react";
import { imageModels } from "@/constants/image-generator";
import { Modal } from "../landing/Modal";
import styles from "./ModelPicker.module.css";

type ModelPickerProps = { value: string; onChange: (model: string) => void; disabled?: boolean; compact?: boolean };
const modelMakers = ["All models", ...new Set(imageModels.map((model) => model.maker))];

export function ModelPicker({ value, onChange, disabled = false, compact = false }: ModelPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [maker, setMaker] = useState("All models");
  const selected = imageModels.find((model) => model.id === value) ?? imageModels[0];
  const query = search.trim().toLowerCase();
  const filtered = imageModels.filter((model) => (maker === "All models" || model.maker === maker)
    && `${model.name} ${model.maker} ${model.description}`.toLowerCase().includes(query));

  return <>
    <button type="button" className={`${styles.modelTrigger} ${compact ? styles.compactModel : ""}`} disabled={disabled} onClick={() => setOpen(true)} aria-haspopup="dialog" aria-label={`Change image model, ${selected.name}`}>
      <span className={styles.modelSymbol} aria-hidden="true">{selected.symbol}</span>
      <span className={styles.modelIdentity}><strong>{selected.name}</strong><small>{selected.maker}</small></span>
      <ChevronDown size={15} aria-hidden="true" />
    </button>
    <Modal open={open} onClose={() => setOpen(false)} title="Choose your image model" className={styles.modelDialog}>
      <div className={styles.modelDialogBody}>
        <label className={styles.search}>
          <Search size={16} aria-hidden="true" />
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a model or creator" aria-label="Search image models" onKeyDown={(event) => { if (event.key === "Enter") event.preventDefault(); }} />
        </label>
        <div className={styles.makers} role="group" aria-label="Filter models by creator">
          {modelMakers.map((name) => <button type="button" key={name} aria-pressed={maker === name} onClick={() => setMaker(name)}>{name}</button>)}
        </div>
        <div className={styles.modelGrid}>
          {filtered.map((model) => <button type="button" className={styles.modelCard} key={model.id} aria-pressed={value === model.id} disabled={disabled} onClick={() => { onChange(model.id); setOpen(false); }}>
            <span className={styles.modelCardTop}><span className={styles.modelSymbol} aria-hidden="true">{model.symbol}</span>{model.tag && <span className={styles.modelTag}>{model.tag}</span>}{value === model.id && <Check className={styles.selectedCheck} size={17} aria-hidden="true" />}</span>
            <strong>{model.name}</strong><span className={styles.makerName}>{model.maker}</span><p>{model.description}</p>
          </button>)}
        </div>
        {filtered.length === 0 && <p className={styles.empty} role="status">No models match that search. Try a different name.</p>}
        <p className={styles.dialogNote}>Explore a creative direction. All models use sample results in this preview.</p>
      </div>
    </Modal>
  </>;
}

