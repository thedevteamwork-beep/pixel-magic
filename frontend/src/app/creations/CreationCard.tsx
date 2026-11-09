import type { JobView } from "@/lib/api/types";
import { LazyVideo } from "@/ui/LazyVideo";

type CreationCardProps = {
  job: JobView;
  /** The model's display name, or its key when the name is unknown. */
  modelName: string;
};

function Preview({ job, modelName }: CreationCardProps) {
  const output = job.outputs[0];
  const frame = "relative aspect-square overflow-hidden rounded-lg bg-surface";

  if (job.status === "failed") {
    return (
      <div className={`${frame} flex flex-col items-center justify-center gap-1 p-4 text-center text-sm`}>
        <p className="text-muted">{job.error?.message ?? "The job failed."}</p>
        <p>Credits returned</p>
      </div>
    );
  }
  if (job.status !== "completed" || !output?.url) {
    return (
      <div className={`${frame} flex items-center justify-center text-sm text-subtle`}>
        <p role="status">Working…</p>
      </div>
    );
  }
  if (output.mimeType.startsWith("video/")) {
    return (
      <div className={frame}>
        <LazyVideo src={output.url} label={`${modelName} video`} className="absolute inset-0 size-full object-cover" />
      </div>
    );
  }
  return (
    <div className={frame}>
      {/* Signed storage URLs come from hosts next/image isn't configured for, so a plain img is used. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={output.url}
        alt={`${modelName} creation`}
        loading="lazy"
        className="absolute inset-0 size-full object-cover"
      />
    </div>
  );
}

export function CreationCard({ job, modelName }: CreationCardProps) {
  const url = job.status === "completed" ? job.outputs[0]?.url : undefined;
  return (
    <li className="space-y-2">
      <Preview job={job} modelName={modelName} />
      <div className="flex items-start justify-between gap-2 text-sm">
        <div className="min-w-0">
          <p className="truncate font-medium">{modelName}</p>
          <p className="text-xs text-subtle">
            {new Date(job.createdAt).toLocaleDateString("en-US", { dateStyle: "medium" })} · {job.creditCost} credits
          </p>
        </div>
        {url && (
          <a href={url} download className="shrink-0 text-xs text-muted underline hover:text-foreground">
            Download
          </a>
        )}
      </div>
    </li>
  );
}
