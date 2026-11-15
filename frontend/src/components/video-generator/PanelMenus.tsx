"use client";

import { AudioLines, Check, ChevronDown, ChevronRight, Clock, Gem, Images, ImageIcon, Minus, PersonStanding, Plus, Search, Sparkles, Type } from "lucide-react";
import { useState, type CSSProperties, type ReactNode } from "react";
import { videoCounts, videoModes } from "@/constants/video-generator";
import { durationLabel, modeName, modelsForMode, ratioValue, resolutionLabel } from "@/lib/video-generator/settings";
import type { VideoMode, VideoModel } from "@/types/video-generator";
import { Flyout } from "./Flyout";
import styles from "./PanelMenus.module.css";

const modeIcons: Record<VideoMode, typeof Type> = { image: ImageIcon, text: Type, motion: PersonStanding, reference: Images };

export function ModeMenu({ value, onChange }: { value: VideoMode; onChange: (mode: VideoMode) => void }) {
  const Icon = modeIcons[value];
  return <Flyout label={`Creation mode: ${modeName(value)}. Change`} placement="below" width="trigger" role="listbox" panelLabel="Creation mode"
    triggerClassName={styles.modeTrigger}
    trigger={<><Icon size={17} aria-hidden="true" /><span>{modeName(value)}</span><ChevronDown className={styles.chevron} size={16} aria-hidden="true" /></>}>
    {(close) => videoModes.map((mode) => {
      const ModeIcon = modeIcons[mode.id];
      const count = modelsForMode(mode.id).length;
      return <button type="button" role="option" key={mode.id} aria-selected={mode.id === value} className={styles.modeOption}
        onClick={() => { onChange(mode.id); close(); }}>
        <ModeIcon size={18} aria-hidden="true" />
        <span className={styles.optionCopy}><strong>{mode.name}</strong><small>{mode.description} · {count} {count === 1 ? "model" : "models"}</small></span>
        {mode.isNew && <span className={styles.newBadge}>New</span>}
      </button>;
    })}
  </Flyout>;
}

function ModelGlyph({ model, large = false }: { model: VideoModel; large?: boolean }) {
  return <span className={`${styles.glyph} ${large ? styles.glyphLarge : ""}`} aria-hidden="true">{model.symbol}</span>;
}

function ModelTag({ tag }: { tag?: VideoModel["tag"] }) {
  return tag ? <span className={styles.tag} data-tag={tag}>{tag}</span> : null;
}

export function ModelMenu({ mode, value, model, onChange }: { mode: VideoMode; value: string; model: VideoModel; onChange: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const models = modelsForMode(mode);
  const search = query.trim().toLowerCase();
  const visible = models.filter((item) => `${item.name} ${item.maker}`.toLowerCase().includes(search));
  const featured = visible.filter((item) => item.tag === "Top" || item.tag === "New");
  const others = visible.filter((item) => !featured.includes(item));

  function row(item: VideoModel, close: () => void) {
    return <button type="button" role="option" key={item.id} aria-selected={item.id === value} className={styles.modelOption}
      onClick={() => { onChange(item.id); setQuery(""); close(); }}>
      <ModelGlyph model={item} large />
      <span className={styles.optionCopy}>
        <span className={styles.modelName}><strong>{item.name}</strong><ModelTag tag={item.tag} /></span>
        <span className={styles.chips}>
          <span><Gem size={11} aria-hidden="true" />{resolutionLabel(item)}</span>
          <span><Clock size={11} aria-hidden="true" />{durationLabel(item)}</span>
          {item.audio && <span><AudioLines size={11} aria-hidden="true" />Sound</span>}
        </span>
      </span>
      {item.id === value && <Check className={styles.check} size={18} aria-hidden="true" />}
    </button>;
  }

  return <Flyout label={`Model: ${model.name}. Change`} placement="right" width={420} panelLabel={`Models for ${modeName(mode)}`}
    triggerClassName={styles.tile}
    trigger={<><span className={styles.tileCopy}><small>Model</small><strong><ModelGlyph model={model} />{model.name}<ModelTag tag={model.tag} /></strong></span><ChevronRight className={styles.tileChevron} size={16} aria-hidden="true" /></>}>
    {(close) => <div className={styles.modelPanel}>
      <label className={styles.search}>
        <Search size={17} aria-hidden="true" />
        <input type="search" value={query} placeholder="Search models…" aria-label="Search models" data-autofocus
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.preventDefault();
            if (event.key === "ArrowDown") { event.preventDefault(); (event.currentTarget.closest("[popover]")?.querySelector('[role="option"]') as HTMLElement | null)?.focus(); }
          }} />
      </label>
      <div role="listbox" aria-label="Models">
        {featured.length > 0 && <p className={styles.group}><Sparkles size={13} aria-hidden="true" />Featured models</p>}
        {featured.map((item) => row(item, close))}
        {others.length > 0 && <p className={styles.group}>{featured.length ? "More models" : "Models"}</p>}
        {others.map((item) => row(item, close))}
      </div>
      {visible.length === 0 && <p className={styles.empty} role="status">No models match “{query}”.</p>}
      <p className={styles.footnote}>Showing models that support {modeName(mode)}.</p>
    </div>}
  </Flyout>;
}

/** A Higgsfield-style track: the fill and lime marker show the length, dots show the stops. */
export function DurationTile({ model, value, onChange, lockedTo }: { model: VideoModel; value: number; onChange: (value: number) => void; lockedTo?: number }) {
  const stops = model.durations;
  const marks = stops.length <= 8 ? stops : model.durationMarks ?? [stops[0], stops.at(-1)!];
  const index = Math.max(0, stops.indexOf(value));
  const position = (stop: number) => stops.length > 1 ? stops.indexOf(stop) / (stops.length - 1) : 0;
  if (lockedTo !== undefined) {
    return <div className={styles.tile} data-locked="true" title="Motion control follows the length of your clip">
      <span className={styles.tileCopy}><small>Duration</small><strong>{lockedTo}s</strong></span>
      <span className={styles.lockNote}>Matches clip</span>
    </div>;
  }
  return <Flyout label={`Duration: ${value} seconds. Change`} placement="right" width={420} panelLabel="Duration" triggerClassName={styles.tile}
    trigger={<><span className={styles.tileCopy}><small>Duration</small><strong>{value}s</strong></span><ChevronRight className={styles.tileChevron} size={16} aria-hidden="true" /></>}>
    {() => <div className={styles.durationPanel}>
      <p className={styles.durationLabel}>Total duration</p>
      <p className={styles.durationValue} aria-hidden="true">{value}s</p>
      <div className={styles.track} style={{ "--p": position(value) } as CSSProperties}>
        <span className={styles.trackFill} aria-hidden="true" />
        {marks.map((mark) => <span key={mark} className={styles.trackDot} style={{ "--p": position(mark) } as CSSProperties} data-past={mark <= value} aria-hidden="true" />)}
        <span className={styles.trackThumb} aria-hidden="true" />
        <input type="range" min={0} max={stops.length - 1} step={1} value={index} aria-label="Total duration" aria-valuetext={`${value} seconds`} data-autofocus
          onChange={(event) => onChange(stops[Number(event.target.value)])} />
      </div>
      <div className={styles.trackLabels} aria-hidden="true">
        {marks.map((mark) => <button type="button" tabIndex={-1} key={mark} style={{ left: `${position(mark) * 100}%` }} onClick={() => onChange(mark)}>{mark}</button>)}
      </div>
      <p className={styles.durationHint}>{model.name} renders {durationLabel(model)} clips. Longer clips cost more.</p>
    </div>}
  </Flyout>;
}

export function RatioShape({ ratio, size = 16 }: { ratio: string; size?: number }) {
  const value = ratioValue(ratio);
  const width = value >= 1 ? size : Math.round(size * value);
  const height = value >= 1 ? Math.round(size / value) : size;
  return <span className={styles.ratioShape} style={{ width, height }} aria-hidden="true" />;
}

export function ChoiceTile<T extends string>({ label, value, options, onChange, render, hint }: {
  label: string; value: T; options: readonly T[]; onChange: (value: T) => void; render?: (option: T) => ReactNode; hint?: (option: T) => string | undefined;
}) {
  return <Flyout label={`${label}: ${value}. Change`} placement="below" width={220} role="listbox" panelLabel={label} triggerClassName={styles.tile}
    trigger={<><span className={styles.tileCopy}><small>{label}</small><strong>{render ? render(value) : value}</strong></span><ChevronDown className={styles.tileChevron} size={16} aria-hidden="true" /></>}>
    {(close) => options.map((option) => <button type="button" role="option" key={option} aria-selected={option === value} className={styles.choice}
      onClick={() => { onChange(option); close(); }}>
      <span className={styles.choiceValue}>{render ? render(option) : option}</span>
      {hint?.(option) && <small>{hint(option)}</small>}
      {option === value && <Check size={15} aria-hidden="true" />}
    </button>)}
  </Flyout>;
}

export function CountTile({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const minimum = videoCounts[0];
  const maximum = videoCounts[videoCounts.length - 1];
  return <div className={`${styles.tile} ${styles.countTile}`} role="group" aria-label="Number of videos">
    <span className={styles.tileCopy}><small>Videos</small><strong aria-live="polite">{value}<span className={styles.of}>/{maximum}</span></strong></span>
    <span className={styles.stepper}>
      <button type="button" onClick={() => onChange(Math.max(minimum, value - 1))} disabled={value <= minimum} aria-label="One fewer video"><Minus size={14} aria-hidden="true" /></button>
      <button type="button" onClick={() => onChange(Math.min(maximum, value + 1))} disabled={value >= maximum} aria-label="One more video"><Plus size={14} aria-hidden="true" /></button>
    </span>
  </div>;
}
