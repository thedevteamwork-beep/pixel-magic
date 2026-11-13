"use client";

import { AudioLines, Copy, Film, MonitorUp, MoreHorizontal, Trash2, Undo2 } from "lucide-react";
import { useEffect, useState } from "react";
import { motionPresets } from "@/constants/video-generator";
import { getVideoModel } from "@/lib/video-generator/settings";
import type { RenderJob, VideoResult } from "@/types/video-generator";
import { FailedCard, RenderCard, VideoCard } from "./FeedCards";
import styles from "./VideoFeed.module.css";

type VideoFeedProps = {
  items: readonly VideoResult[];
  jobs: readonly RenderJob[];
  motionEnabled: boolean;
  onOpen: (id: string) => void;
  onFavorite: (id: string) => void;
  onUseFrame: (item: VideoResult) => void;
  onReuse: (item: VideoResult) => void;
  onUpscale: (item: VideoResult) => void;
  onCopyPrompt: (prompt: string) => void;
  onDeleteBatch: (batchId: string) => void;
  onCancel: (jobId: string) => void;
  onRetry: (jobId: string) => void;
  onDismiss: (jobId: string) => void;
};

function Meta({ model, duration, aspectRatio, resolution, motion, audio }: { model: string; duration: number; aspectRatio: string; resolution: string; motion: string; audio: boolean }) {
  const preset = motionPresets.find((item) => item.id === motion);
  return <span className={styles.meta}>
    <span className={styles.metaModel}>{getVideoModel(model).name}</span>
    <span>{duration}s</span><span>{aspectRatio}</span><span>{resolution}</span>
    {preset && preset.id !== "auto" && <span><Film size={10} aria-hidden="true" />{preset.name}</span>}
    {audio && <span><AudioLines size={10} aria-hidden="true" />Sound</span>}
  </span>;
}

function relativeTime(iso: string) {
  const seconds = Math.round((Date.now() - Date.parse(iso)) / 1000);
  if (seconds < 45) return "Just now";
  if (seconds < 3600) return `${Math.round(seconds / 60)} min ago`;
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function VideoFeed(props: VideoFeedProps) {
  const { items, jobs, motionEnabled } = props;
  const [menu, setMenu] = useState<string | null>(null);
  useEffect(() => {
    if (!menu) return;
    const close = (event: PointerEvent) => { if (!(event.target instanceof Element && event.target.closest("[data-feed-menu]"))) setMenu(null); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [menu]);
  const batches: { id: string; videos: VideoResult[] }[] = [];
  for (const item of items) {
    const batch = batches.find((entry) => entry.id === item.batchId);
    if (batch) batch.videos.push(item);
    else batches.push({ id: item.batchId, videos: [item] });
  }

  return <div className={styles.feed}>
    {jobs.map((job) => <section key={job.id} className={styles.group} aria-label={job.status === "failed" ? "Render failed" : "Rendering"}>
      <header className={styles.groupHeader}>
        <div className={styles.groupCopy}>
          <p className={styles.prompt}>{job.prompt || "Animated from your start frame"}</p>
          <Meta model={job.model} duration={job.duration} aspectRatio={job.aspectRatio} resolution={job.resolution} motion={job.motion} audio={false} />
        </div>
      </header>
      <div className={styles.row}>
        {job.status === "failed"
          ? <FailedCard job={job} onRetry={() => props.onRetry(job.id)} onDismiss={() => props.onDismiss(job.id)} />
          : Array.from({ length: job.count }, (_, index) => <RenderCard key={index} job={job} index={index} frame={job.frameUrl} motionEnabled={motionEnabled}
            onCancel={index === 0 ? () => props.onCancel(job.id) : undefined} />)}
      </div>
    </section>)}

    {batches.map(({ id, videos }) => {
      const first = videos[0];
      const canUpscale = first.resolution !== "1080p" && getVideoModel(first.model).resolutions.includes("1080p");
      return <section key={id} className={styles.group} aria-label={`Videos: ${first.prompt || "animated frame"}`}>
        <header className={styles.groupHeader}>
          <div className={styles.groupCopy}>
            <p className={styles.prompt} title={first.prompt}>{first.prompt || "Animated from your start frame"}</p>
            <Meta {...first} />
          </div>
          <div className={styles.groupActions}>
            <span className={styles.time}>{relativeTime(first.createdAt)}</span>
            <button type="button" onClick={() => props.onReuse(first)} title="Load this prompt and its settings"><Undo2 size={13} aria-hidden="true" /><span>Reuse</span></button>
            {canUpscale && <button type="button" onClick={() => props.onUpscale(first)} title="Render this shot again at 1080p"><MonitorUp size={13} aria-hidden="true" /><span>1080p</span></button>}
            <div className={styles.menuWrap} data-feed-menu>
              <button type="button" className={styles.iconButton} aria-label="More actions" aria-expanded={menu === id} onClick={() => setMenu(menu === id ? null : id)}><MoreHorizontal size={15} aria-hidden="true" /></button>
              {menu === id && <div className={styles.menu} role="menu" onKeyDown={(event) => { if (event.key === "Escape") setMenu(null); }}>
                <button type="button" role="menuitem" autoFocus onClick={() => { props.onCopyPrompt(first.prompt); setMenu(null); }} disabled={!first.prompt}><Copy size={13} aria-hidden="true" />Copy prompt</button>
                <button type="button" role="menuitem" className={styles.danger} onClick={() => { props.onDeleteBatch(id); setMenu(null); }}><Trash2 size={13} aria-hidden="true" />Delete {videos.length > 1 ? `all ${videos.length}` : "video"}</button>
              </div>}
            </div>
          </div>
        </header>
        <div className={styles.row}>
          {videos.map((item, index) => <VideoCard key={item.id} item={item} index={index} autoplay={motionEnabled}
            onOpen={() => props.onOpen(item.id)} onFavorite={() => props.onFavorite(item.id)} onUseFrame={() => props.onUseFrame(item)} />)}
        </div>
      </section>;
    })}
  </div>;
}
