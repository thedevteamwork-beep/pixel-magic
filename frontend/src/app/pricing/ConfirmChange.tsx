import type { PlanChangePreview } from "@/lib/api/billingTypes";
import { Button } from "@/ui/Button";

type ConfirmChangeProps = {
  preview: PlanChangePreview;
  pending: boolean;
  error: string | null;
  onConfirm: () => void;
  onBack: () => void;
};

export function ConfirmChange({ preview, pending, error, onConfirm, onBack }: ConfirmChangeProps) {
  const starts = new Date(preview.effectiveAt).toLocaleDateString("en-US", { dateStyle: "medium" });

  return (
    <div className="mt-4 rounded-lg border border-border bg-surface-raised p-4 text-sm">
      <p>{preview.description}</p>
      <p className="mt-1 text-subtle">Starts {starts}</p>
      <div className="mt-4 flex gap-2">
        <Button size="sm" onClick={onConfirm} disabled={pending}>
          Confirm
        </Button>
        <Button size="sm" variant="outline" onClick={onBack} disabled={pending}>
          Back
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-xs text-subtle">
          {error}
        </p>
      )}
    </div>
  );
}
