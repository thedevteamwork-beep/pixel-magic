"use client";

import { Media } from "@/ui/Media";
import {
  ArrowDownToLine,
  ArrowUpRight,
  Check,
  CheckCheck,
  CircleHelp,
  Heart,
  ImagePlus,
  LayoutGrid,
  List,
  LoaderCircle,
  Maximize2,
  Search,
  SearchX,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { imageInspirations, imageModels } from "@/constants/image-generator";
import { imageTemplateArtwork } from "@/components/image-generator/constants";
import { landingAssets } from "@/constants/landing-media";
import type { ImageResult, InspirationItem } from "@/types/image-generator";
import { Modal } from "@/components/landing/Modal";
import { ImageWelcome } from "./ImageWelcome";
import styles from "./main.module.css";

export type ImageResultsProps = {
  items: readonly ImageResult[];
  pending: boolean;
  pendingCount: number;
  generationKey?: number;
  variant?: "library" | "canvas";
  modelName?: string;
  workspaceView?: "canvas" | "history";
  onViewChange?: (view: "canvas" | "history") => void;
  onOpenCreative?: () => void;
  onHelp?: () => void;
  creativeOpen?: boolean;
  creativeCount?: number;
  onReuse: (item: ImageResult) => void;
  onReference: (item: ImageResult) => void;
  onFavorite: (id: string) => void;
  onDelete: (ids: readonly string[]) => void;
  onSelectInspiration: (id: string) => void;
  error?: string | null;
  onRetry?: () => void;
};

type LibraryTab = "all" | "favorites";
type Layout = "grid" | "list";

function modelName(value: string) {
  return imageModels.find((model) => model.id === value)?.name ?? value;
}

function imageRatio(value: string) {
  return /^\d+(?:\.\d+)?:\d+(?:\.\d+)?$/.test(value) ? value.replace(":", " / ") : "1 / 1";
}

function downloadName(item: ImageResult) {
  const extension = item.url.match(/\.(jpe?g|png|webp|avif)(?:[?#]|$)/i)?.[1] ?? "jpg";
  return `pixel-magic-sample-${item.id.replace(/[^a-zA-Z0-9_-]/g, "-")}.${extension}`;
}

function matchesQuery(text: string, query: string) {
  return !query || text.toLocaleLowerCase().includes(query);
}

function InspirationCard({ item, onSelect }: { item: InspirationItem; onSelect: (id: string) => void }) {
  const asset = imageTemplateArtwork[item.id] ?? landingAssets[item.asset];
  return (
    <button
      type="button"
      className={styles.inspirationCard}
      style={{ aspectRatio: imageRatio(item.aspectRatio) }}
      onClick={() => onSelect(item.id)}
      aria-label={`Use ${item.title} inspiration`}
    >
      <Media
        media={{ kind: "image", src: asset.image, alt: asset.alt }}
        fill
        sizes="(max-width: 600px) 90vw, (max-width: 1100px) 40vw, 26vw"
        className={styles.coverImage}
      />
      <span className={styles.inspirationShade} aria-hidden="true" />
      <span className={styles.inspirationCategory}>{item.category}</span>
      <span className={styles.inspirationCopy}>
        <span>{item.title}</span>
        <small>
          Use this look <ArrowUpRight size={12} aria-hidden="true" />
        </small>
      </span>
      <span className={styles.inspirationArrow} aria-hidden="true">
        <ArrowUpRight size={17} />
      </span>
    </button>
  );
}

function ResultCard({
  item,
  selecting,
  selected,
  onSelect,
  onPreview,
  onFavorite,
  onReuse,
}: {
  item: ImageResult;
  selecting: boolean;
  selected: boolean;
  onSelect: () => void;
  onPreview: () => void;
  onFavorite: () => void;
  onReuse: () => void;
}) {
  return (
    <article className={`${styles.resultCard} ${selected ? styles.selectedCard : ""}`}>
      <div className={styles.resultVisual} style={{ aspectRatio: imageRatio(item.aspectRatio) }}>
        <button
          type="button"
          className={styles.openPreview}
          onClick={selecting ? onSelect : onPreview}
          aria-label={
            selecting ? `${selected ? "Deselect" : "Select"} sample: ${item.alt}` : `Preview sample: ${item.alt}`
          }
          aria-haspopup={selecting ? undefined : "dialog"}
        >
          <Media
            media={{ kind: "image", src: item.url, alt: item.alt }}
            fill
            sizes="(max-width: 600px) 90vw, (max-width: 1100px) 40vw, 26vw"
            className={styles.coverImage}
          />
        </button>
        {selecting ? (
          <label className={styles.imageResultsSelectControl}>
            <input type="checkbox" checked={selected} onChange={onSelect} aria-label={`Select sample: ${item.alt}`} />
            <span aria-hidden="true">{selected && <Check size={14} />}</span>
          </label>
        ) : (
          <span className={styles.sampleBadge}>Sample preview</span>
        )}
        <button
          type="button"
          className={`${styles.favorite} ${item.favorite ? styles.isFavorite : ""}`}
          onClick={onFavorite}
          aria-pressed={item.favorite}
          aria-label={`${item.favorite ? "Remove sample from" : "Add sample to"} favorites`}
        >
          <Heart size={16} fill={item.favorite ? "currentColor" : "none"} aria-hidden="true" />
        </button>
        {!selecting && (
          <div className={styles.quickActions}>
            <button type="button" onClick={onReuse}>
              <Undo2 size={14} aria-hidden="true" /> Reuse prompt
            </button>
            <a href={item.url} download={downloadName(item)} aria-label="Download sample">
              <ArrowDownToLine size={15} aria-hidden="true" />
            </a>
          </div>
        )}
      </div>
      <div className={styles.resultCopy}>
        <button
          type="button"
          className={styles.promptButton}
          onClick={onPreview}
          aria-label={`View sample details: ${item.prompt}`}
        >
          {item.prompt}
        </button>
        <p>
          <span>{modelName(item.model)}</span>
          <span aria-hidden="true">·</span>
          <span>{item.aspectRatio}</span>
        </p>
      </div>
    </article>
  );
}

function CanvasPending({ count }: { count: number }) {
  const samples = Math.min(4, Math.max(1, count));
  return (
    <div className={styles.canvasPending}>
      <div className={styles.canvasPendingArt} aria-hidden="true">
        <span />
        <span />
        <Sparkles size={28} strokeWidth={1.3} />
      </div>
      <h3>A new direction is taking shape.</h3>
      <p>
        <LoaderCircle size={13} className={styles.imageResultsSpinner} aria-hidden="true" />
        Preparing {samples === 1 ? "a local sample preview" : `${samples} local sample previews`}.
      </p>
      <span>Your prompt and settings will be attached to each sample.</span>
    </div>
  );
}

function CanvasPreview({
  active,
  items,
  onSelect,
  onFavorite,
  onExpand,
  onReuse,
  onReference,
}: {
  active: ImageResult;
  items: readonly ImageResult[];
  onSelect: (id: string) => void;
  onFavorite: (id: string) => void;
  onExpand: () => void;
  onReuse: (item: ImageResult) => void;
  onReference: (item: ImageResult) => void;
}) {
  const canvasId = useId();
  const variationRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeIndex = items.findIndex((item) => item.id === active.id);

  function selectVariation(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    if (event.key === "ArrowRight") next = (index + 1) % items.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + items.length) % items.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = items.length - 1;
    else return;
    event.preventDefault();
    onSelect(items[next].id);
    variationRefs.current[next]?.focus();
    variationRefs.current[next]?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  return (
    <div className={styles.canvasPreview}>
      <div role="tabpanel" id={`${canvasId}-image`} aria-labelledby={`${canvasId}-${active.id}`}>
        <div className={styles.activeImage}>
          <Media
            media={{ kind: "image", src: active.url, alt: active.alt }}
            fill
            sizes="(max-width: 750px) 90vw, (max-width: 1200px) 75vw, 1050px"
          />
          <span className={styles.canvasSample}>Sample preview</span>
          <div className={styles.canvasImageActions}>
            <button
              type="button"
              className={active.favorite ? styles.isFavorite : ""}
              onClick={() => onFavorite(active.id)}
              aria-label={`${active.favorite ? "Remove sample from" : "Add sample to"} favorites`}
              aria-pressed={active.favorite}
            >
              <Heart size={17} fill={active.favorite ? "currentColor" : "none"} aria-hidden="true" />
            </button>
            <button type="button" onClick={onExpand} aria-label="Expand sample and view details" aria-haspopup="dialog">
              <Maximize2 size={17} aria-hidden="true" />
            </button>
            <a href={active.url} download={downloadName(active)} aria-label="Download sample">
              <ArrowDownToLine size={17} aria-hidden="true" />
            </a>
          </div>
        </div>
        <div className={styles.canvasImageInfo}>
          <div className={styles.canvasImageCopy}>
            <p>{modelName(active.model)}</p>
            <button
              type="button"
              onClick={onExpand}
              className={styles.canvasPrompt}
              aria-label={`View sample details and prompt: ${active.prompt}`}
            >
              {active.prompt}
            </button>
          </div>
          <div className={styles.canvasReuseActions}>
            <button type="button" onClick={() => onReuse(active)}>
              <Undo2 size={14} aria-hidden="true" />
              Reuse prompt
            </button>
            <button type="button" onClick={() => onReference(active)}>
              <ImagePlus size={14} aria-hidden="true" />
              Use as reference
            </button>
          </div>
        </div>
      </div>
      <div className={styles.variationHeader}>
        <h3>Your variations</h3>
        <span>
          {activeIndex + 1} / {items.length}
        </span>
      </div>
      <div className={styles.variationStrip} role="tablist" aria-label="Sample variations">
        {items.map((item, index) => (
          <button
            type="button"
            key={item.id}
            role="tab"
            id={`${canvasId}-${item.id}`}
            ref={(element) => {
              variationRefs.current[index] = element;
            }}
            aria-controls={`${canvasId}-image`}
            aria-selected={item.id === active.id}
            tabIndex={item.id === active.id ? 0 : -1}
            onClick={() => onSelect(item.id)}
            onKeyDown={(event) => selectVariation(event, index)}
            aria-label={`View sample variation ${index + 1} of ${items.length}: ${item.alt}`}
          >
            <Media media={{ kind: "image", src: item.url, alt: "" }} fill sizes="68px" />
            {item.favorite && (
              <span className={styles.variationFavorite} aria-hidden="true">
                <Heart size={9} fill="currentColor" />
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ImageResults({
  items,
  pending,
  pendingCount,
  generationKey = 0,
  variant = "library",
  modelName: selectedModelName = "GPT Image 2",
  workspaceView,
  onViewChange,
  onOpenCreative,
  onHelp,
  creativeOpen = false,
  creativeCount = 0,
  onReuse,
  onReference,
  onFavorite,
  onDelete,
  onSelectInspiration,
  error,
  onRetry,
}: ImageResultsProps) {
  const [localView, setLocalView] = useState<"canvas" | "history">("canvas");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tab, setTab] = useState<LibraryTab>("all");
  const [query, setQuery] = useState("");
  const [layout, setLayout] = useState<Layout>("grid");
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [downloadsOpen, setDownloadsOpen] = useState(false);
  const [inspirationOpen, setInspirationOpen] = useState(false);
  const tabId = useId();
  const panelId = useId();
  const searchId = useId();
  const allTabRef = useRef<HTMLButtonElement>(null);
  const favoritesTabRef = useRef<HTMLButtonElement>(null);
  const resultsRef = useRef<HTMLElement>(null);
  const previousGenerationKey = useRef(generationKey);
  const searchQuery = query.trim().toLocaleLowerCase();
  const favorites = items.filter((item) => item.favorite).length;
  const preview = items.find((item) => item.id === previewId) ?? null;
  const active = items.find((item) => item.id === activeId) ?? items[0] ?? null;
  const variations = active ? items.filter((item) => item.createdAt === active.createdAt) : [];
  const selected = items.filter((item) => selectedIds.has(item.id));
  const filtered = useMemo(
    () =>
      items.filter(
        (item) =>
          (tab === "all" || item.favorite) &&
          matchesQuery(`${item.prompt} ${modelName(item.model)} ${item.style} ${item.aspectRatio}`, searchQuery),
      ),
    [items, tab, searchQuery],
  );
  const inspirations = imageInspirations.filter((item) =>
    matchesQuery(`${item.title} ${item.category} ${item.prompt}`, searchQuery),
  );
  const showInspiration = items.length === 0 && !pending && tab === "all";
  const currentView = workspaceView ?? localView;
  const showCreativeCanvas = variant === "canvas" && currentView === "canvas";
  const emptyCanvasHistory = variant === "canvas" && currentView === "history" && items.length === 0 && !pending;
  const showLibraryControls = !showCreativeCanvas && !emptyCanvasHistory;
  const allVisibleSelected = filtered.length > 0 && filtered.every((item) => selectedIds.has(item.id));

  // A request started elsewhere in the workspace should reveal its new results.
  // Keep the user's preferred grid/list layout when clearing library filters.
  useEffect(() => {
    if (generationKey === previousGenerationKey.current) return;
    previousGenerationKey.current = generationKey;
    if (generationKey <= 0) return;
    // Resetting the library view is a response to a new request from outside this component, so it has to happen in an effect.
    /* eslint-disable react-hooks/set-state-in-effect */
    setTab("all");
    setQuery("");
    setSelecting(false);
    setSelectedIds(new Set());
    setPreviewId(null);
    setDownloadsOpen(false);
    setInspirationOpen(false);
    setActiveId(null);
    setLocalView("canvas");
    onViewChange?.("canvas");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [generationKey, onViewChange]);

  function focusTab(nextTab: LibraryTab) {
    setTab(nextTab);
    (nextTab === "all" ? allTabRef : favoritesTabRef).current?.focus();
  }

  function handleTabKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    focusTab(event.key === "Home" ? "all" : event.key === "End" ? "favorites" : tab === "all" ? "favorites" : "all");
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleVisible() {
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const item of filtered) {
        if (allVisibleSelected) next.delete(item.id);
        else next.add(item.id);
      }
      return next;
    });
  }

  function deleteItems(ids: readonly string[]) {
    if (!ids.length) return;
    setPreviewId(null);
    setDownloadsOpen(false);
    setSelectedIds(new Set());
    setSelecting(false);
    onDelete(ids);
    requestAnimationFrame(() => resultsRef.current?.focus());
  }

  function resetFilters() {
    setQuery("");
    setTab("all");
  }

  function selectInspiration(id: string) {
    setInspirationOpen(false);
    changeWorkspaceView("canvas");
    onSelectInspiration(id);
  }

  function changeWorkspaceView(view: "canvas" | "history") {
    setLocalView(view);
    onViewChange?.(view);
  }

  return (
    <section
      className={`${styles.imageResultsResults} ${variant === "canvas" ? styles.creativeWorkspace : ""}`}
      aria-label="Image results and inspiration"
      ref={resultsRef}
      tabIndex={-1}
    >
      {variant === "canvas" && (
        <div className={styles.workspaceToolbar}>
          <div className={styles.workspaceActions}>
            <div className={styles.workspaceViews} role="group" aria-label="Workspace view">
              <button
                type="button"
                aria-pressed={currentView === "canvas"}
                onClick={() => changeWorkspaceView("canvas")}
              >
                Create
              </button>
              <button
                type="button"
                aria-pressed={currentView === "history"}
                onClick={() => changeWorkspaceView("history")}
              >
                History{items.length > 0 && <span>{items.length}</span>}
              </button>
            </div>
            {onOpenCreative && (
              <button
                type="button"
                className={`${styles.creativeToggle} ${creativeOpen ? styles.creativeToggleOpen : ""}`}
                onClick={onOpenCreative}
                aria-label="Creative options"
                aria-expanded={creativeOpen}
              >
                <SlidersHorizontal size={14} aria-hidden="true" />
                <span className={styles.creativeLabel}>Creative options</span>
                {creativeCount > 0 && <span className={styles.creativeCount}>{creativeCount}</span>}
              </button>
            )}
            {onHelp && (
              <button
                type="button"
                className={styles.helpButton}
                onClick={onHelp}
                aria-label="About this preview"
                title="Sample previews · no credits used"
              >
                <CircleHelp size={17} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      )}
      {showLibraryControls && (
        <>
          <div className={styles.toolbar}>
            <div className={styles.tabs} role="tablist" aria-label="Image library">
              <button
                type="button"
                role="tab"
                id={`${tabId}-all`}
                ref={allTabRef}
                aria-selected={tab === "all"}
                aria-controls={panelId}
                tabIndex={tab === "all" ? 0 : -1}
                onKeyDown={handleTabKey}
                onClick={() => setTab("all")}
              >
                My creations <span>{items.length}</span>
              </button>
              <button
                type="button"
                role="tab"
                id={`${tabId}-favorites`}
                ref={favoritesTabRef}
                aria-selected={tab === "favorites"}
                aria-controls={panelId}
                tabIndex={tab === "favorites" ? 0 : -1}
                onKeyDown={handleTabKey}
                onClick={() => setTab("favorites")}
              >
                <Heart size={13} aria-hidden="true" /> Favorites <span>{favorites}</span>
              </button>
            </div>
          </div>

          <div className={styles.imageResultsControls}>
            <div className={styles.imageResultsSearch}>
              <Search size={15} aria-hidden="true" />
              <label className={styles.imageResultsSrOnly} htmlFor={searchId}>
                {items.length ? "Search your creations" : "Search inspiration"}
              </label>
              <input
                id={searchId}
                type="search"
                placeholder={items.length ? "Search your creations…" : "Find a little inspiration…"}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              {query && (
                <button type="button" onClick={() => setQuery("")} aria-label="Clear search">
                  <X size={13} aria-hidden="true" />
                </button>
              )}
            </div>
            <div className={styles.viewControls}>
              {items.length > 0 && (
                <button
                  type="button"
                  className={`${styles.selectButton} ${selecting ? styles.activeControl : ""}`}
                  aria-pressed={selecting}
                  onClick={() => {
                    setSelecting((current) => !current);
                    setSelectedIds(new Set());
                  }}
                >
                  <CheckCheck size={15} aria-hidden="true" />
                  {selecting ? "Cancel" : "Select"}
                </button>
              )}
              <div className={styles.layoutToggle} role="group" aria-label="Results layout">
                <button
                  type="button"
                  aria-label="Grid view"
                  aria-pressed={layout === "grid"}
                  onClick={() => setLayout("grid")}
                >
                  <LayoutGrid size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label="List view"
                  aria-pressed={layout === "list"}
                  onClick={() => setLayout("list")}
                >
                  <List size={17} aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {error && (
        <div className={styles.imageResultsError} role="alert">
          <div>
            <strong>That preview didn’t come through.</strong>
            <p>{error}</p>
          </div>
          {onRetry && (
            <button type="button" onClick={onRetry} disabled={pending}>
              Try again <Undo2 size={13} aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      {showLibraryControls && selecting && (
        <div className={styles.selectionBar}>
          <button type="button" className={styles.selectAll} onClick={toggleVisible} disabled={!filtered.length}>
            <span aria-hidden="true">{allVisibleSelected && <Check size={11} />}</span>
            {allVisibleSelected ? "Deselect visible" : "Select visible"}
          </button>
          <span className={styles.selectedCount} role="status">
            {selected.length} selected
          </span>
          <div className={styles.selectionActions}>
            <button type="button" onClick={() => setDownloadsOpen(true)} disabled={!selected.length}>
              <ArrowDownToLine size={14} aria-hidden="true" /> Downloads
            </button>
            <button
              type="button"
              className={styles.deleteAction}
              onClick={() => deleteItems(selected.map((item) => item.id))}
              disabled={!selected.length}
            >
              <Trash2 size={14} aria-hidden="true" /> Delete
            </button>
          </div>
        </div>
      )}

      <div
        className={styles.library}
        role={showLibraryControls ? "tabpanel" : undefined}
        id={panelId}
        aria-labelledby={showLibraryControls ? `${tabId}-${tab}` : undefined}
        aria-busy={pending && (showCreativeCanvas || tab === "all")}
      >
        {showCreativeCanvas ? (
          <div className={styles.creativeCanvas}>
            {pending ? (
              <CanvasPending count={pendingCount} />
            ) : active ? (
              <CanvasPreview
                active={active}
                items={variations}
                onSelect={setActiveId}
                onFavorite={onFavorite}
                onExpand={() => setPreviewId(active.id)}
                onReuse={onReuse}
                onReference={onReference}
              />
            ) : (
              <ImageWelcome
                modelName={selectedModelName}
                onSelectInspiration={selectInspiration}
                onExplore={() => setInspirationOpen(true)}
              />
            )}
          </div>
        ) : emptyCanvasHistory ? (
          <div className={styles.emptyHistory}>
            <ImagePlus size={30} strokeWidth={1.3} aria-hidden="true" />
            <h2>No images yet</h2>
            <p>Create your first sample preview to start your collection.</p>
            <button type="button" onClick={() => changeWorkspaceView("canvas")}>
              Create an image <ArrowUpRight size={15} aria-hidden="true" />
            </button>
          </div>
        ) : showInspiration ? (
          <>
            <div className={styles.inspirationHeading}>
              <p>
                <Sparkles size={13} aria-hidden="true" /> A LITTLE INSPIRATION
              </p>
              <h2>
                Your next idea, <em>in view.</em>
              </h2>
              <span>Start with a look you love. Add a little of you.</span>
            </div>
            {inspirations.length ? (
              <div className={`${styles.inspirationGrid} ${layout === "list" ? styles.inspirationList : ""}`}>
                {inspirations.map((item) => (
                  <InspirationCard key={item.id} item={item} onSelect={selectInspiration} />
                ))}
              </div>
            ) : (
              <EmptyResults query={query} onReset={resetFilters} />
            )}
            <p className={styles.inspirationNote}>
              Curated sample imagery. Choose a look to load its prompt and settings.
            </p>
          </>
        ) : (
          <>
            {(pending || filtered.length > 0) && (
              <div className={`${styles.resultGrid} ${layout === "list" ? styles.resultList : ""}`}>
                {pending &&
                  tab === "all" &&
                  Array.from({ length: Math.min(4, Math.max(1, pendingCount)) }, (_, index) => (
                    <div className={styles.pendingCard} key={`pending-${index}`}>
                      <span className={styles.pendingArt}>
                        <Sparkles size={26} aria-hidden="true" />
                        <span className={styles.pendingOrbit} />
                      </span>
                      <span>
                        <LoaderCircle size={13} className={styles.imageResultsSpinner} aria-hidden="true" />
                        Preparing sample {index + 1}
                      </span>
                      <small>Your selected settings, in a local preview.</small>
                    </div>
                  ))}
                {filtered.map((item) => (
                  <ResultCard
                    key={item.id}
                    item={item}
                    selecting={selecting}
                    selected={selectedIds.has(item.id)}
                    onSelect={() => toggleSelected(item.id)}
                    onPreview={() => {
                      setActiveId(item.id);
                      setPreviewId(item.id);
                    }}
                    onFavorite={() => onFavorite(item.id)}
                    onReuse={() => onReuse(item)}
                  />
                ))}
              </div>
            )}
            {(!pending || tab === "favorites") && !filtered.length && (
              <EmptyResults query={query} favorites={tab === "favorites"} onReset={resetFilters} />
            )}
            {filtered.length > 0 && (
              <p className={styles.resultsNote}>
                {filtered.length} {filtered.length === 1 ? "sample" : "samples"}
                {tab === "favorites" ? " in favorites" : " in this view"} <span aria-hidden="true">·</span> Preview an
                image to see its prompt and settings.
              </p>
            )}
          </>
        )}
      </div>

      <Modal
        open={inspirationOpen}
        onClose={() => setInspirationOpen(false)}
        title="Find a little inspiration"
        className={styles.inspirationModal}
      >
        <div className={styles.inspirationModalContent}>
          <p>Pick a look to load its prompt and settings. Add a little of you.</p>
          <div className={styles.inspirationGrid}>
            {imageInspirations.map((item) => (
              <InspirationCard key={item.id} item={item} onSelect={selectInspiration} />
            ))}
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(preview)}
        onClose={() => setPreviewId(null)}
        title="Sample preview"
        className={styles.previewModal}
      >
        {preview && (
          <div className={styles.previewLayout}>
            <div className={styles.previewImage}>
              <Media
                media={{ kind: "image", src: preview.url, alt: preview.alt }}
                fill
                sizes="(max-width: 750px) 90vw, 650px"
              />
            </div>
            <div className={styles.previewDetails}>
              <div className={styles.previewTitle}>
                <span>
                  <Sparkles size={12} aria-hidden="true" /> SAMPLE PREVIEW
                </span>
                <button
                  type="button"
                  className={preview.favorite ? styles.isFavorite : ""}
                  onClick={() => onFavorite(preview.id)}
                  aria-label={`${preview.favorite ? "Remove sample from" : "Add sample to"} favorites`}
                  aria-pressed={preview.favorite}
                >
                  <Heart size={17} fill={preview.favorite ? "currentColor" : "none"} aria-hidden="true" />
                </button>
              </div>
              <h3>Your creative direction</h3>
              <p className={styles.previewPrompt} tabIndex={0} aria-label="Sample prompt">
                {preview.prompt}
              </p>
              <dl className={styles.metadata}>
                <div>
                  <dt>Model</dt>
                  <dd>{modelName(preview.model)}</dd>
                </div>
                <div>
                  <dt>Aspect ratio</dt>
                  <dd>{preview.aspectRatio}</dd>
                </div>
                <div>
                  <dt>Resolution setting</dt>
                  <dd>{preview.resolution}</dd>
                </div>
                <div>
                  <dt>Quality setting</dt>
                  <dd>{preview.quality}</dd>
                </div>
                <div>
                  <dt>Style</dt>
                  <dd>{preview.style}</dd>
                </div>
                <div>
                  <dt>Sample file</dt>
                  <dd>{preview.format.toUpperCase()}</dd>
                </div>
              </dl>
              <p className={styles.imageResultsSampleNote}>
                Local sample artwork with your prompt and selected settings. This preview is not AI generated.
              </p>
              <div className={styles.previewActions}>
                <button
                  type="button"
                  className={styles.primaryAction}
                  onClick={() => {
                    onReuse(preview);
                    setPreviewId(null);
                  }}
                >
                  <Undo2 size={15} aria-hidden="true" /> Reuse prompt
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onReference(preview);
                    setPreviewId(null);
                  }}
                >
                  <ImagePlus size={15} aria-hidden="true" /> Use as reference
                </button>
                <a href={preview.url} download={downloadName(preview)}>
                  <ArrowDownToLine size={15} aria-hidden="true" /> Download sample
                </a>
                <button type="button" className={styles.deleteAction} onClick={() => deleteItems([preview.id])}>
                  <Trash2 size={15} aria-hidden="true" /> Delete sample
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={downloadsOpen && selected.length > 0}
        onClose={() => setDownloadsOpen(false)}
        title="Download selected samples"
        className={styles.downloadModal}
      >
        <div className={styles.downloadContents}>
          <p>Download each local sample in its original file format.</p>
          <ul>
            {selected.map((item) => (
              <li key={item.id}>
                <span className={styles.downloadThumb}>
                  <Media media={{ kind: "image", src: item.url, alt: "" }} fill sizes="48px" />
                </span>
                <div>
                  <strong>{modelName(item.model)}</strong>
                  <span>{item.prompt}</span>
                </div>
                <a href={item.url} download={downloadName(item)} aria-label={`Download sample: ${item.alt}`}>
                  <ArrowDownToLine size={16} aria-hidden="true" />
                  <span>Download</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </Modal>
    </section>
  );
}

function EmptyResults({
  query,
  favorites = false,
  onReset,
}: {
  query: string;
  favorites?: boolean;
  onReset: () => void;
}) {
  return (
    <div className={styles.imageResultsEmpty}>
      <span className={styles.emptyIcon}>
        {query ? (
          <SearchX size={25} aria-hidden="true" />
        ) : favorites ? (
          <Heart size={25} aria-hidden="true" />
        ) : (
          <SlidersHorizontal size={25} aria-hidden="true" />
        )}
      </span>
      <h2>{query ? "A different search?" : favorites ? "Keep the looks you love." : "Your next idea starts here."}</h2>
      <p>
        {query
          ? "No samples match this search. Try a model, a subject, or a different word."
          : favorites
            ? "Tap the heart on a sample to find it here whenever inspiration calls."
            : "Explore the inspiration collection to find a starting point."}
      </p>
      <button type="button" onClick={onReset}>
        {query ? "Clear search and filters" : "Browse my creations"}
        <ArrowUpRight size={14} aria-hidden="true" />
      </button>
    </div>
  );
}
