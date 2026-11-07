import type { JobView } from "@/lib/api/types";
import { messageForError } from "@/lib/generate/messages";
import { PollLostError } from "@/lib/generate/pollJob";
import { Button, ButtonWithLink } from "@/ui/Button";

type JobResultProps = {
  job: JobView | null;
  error: unknown;
  onCheckAgain: () => void;
};

/** The running status, the finished outputs, or the error. */
export function JobResult({ job, error, onCheckAgain }: JobResultProps) {
  return (
    <section className="mt-8 flex flex-col gap-4" aria-live="polite">
      {job && <p className="text-sm">Status: {job.status} · {job.creditCost} credits</p>}
      {error != null && <p role="alert" className="text-sm text-red-500">{messageForError(error)}</p>}
      {error instanceof PollLostError && <CheckAgain onClick={onCheckAgain} />}
      {job?.status === "completed" && <Outputs outputs={job.outputs} />}
    </section>
  );
}

function CheckAgain({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="outline" onClick={onClick} className="self-start">
      Check again
    </Button>
  );
}

function Outputs({ outputs }: { outputs: JobView["outputs"] }) {
  return (
    <ul className="flex flex-col gap-6">
      {outputs.map((output) => (
        <li key={output.index} className="flex flex-col gap-2">
          {output.url && <OutputMedia mimeType={output.mimeType} url={output.url} />}
          {output.url && (
            <ButtonWithLink href={output.url} variant="outline" size="sm" className="self-start" download>
              Download
            </ButtonWithLink>
          )}
        </li>
      ))}
    </ul>
  );
}

function OutputMedia({ mimeType, url }: { mimeType: string; url: string }) {
  if (mimeType.startsWith("video/")) {
    return <video src={url} controls className="max-h-[70vh] max-w-full rounded-lg" />;
  }
  // eslint-disable-next-line @next/next/no-img-element -- signed URL from the backend
  return <img src={url} alt="Generated output" className="max-h-[70vh] max-w-full rounded-lg" />;
}
