import { cn } from "@/lib/cn";
import { Icon, type IconName } from "@/ui/Icon";

export type ActionTile<T extends string = string> = { id: T; label: string; description: string; icon: IconName };

type ActionTilesProps<T extends string> = {
  /** Visible heading, e.g. "Continue with". */
  title: string;
  tiles: readonly ActionTile<T>[];
  onSelect: (id: T) => void;
  className?: string;
};

/** A row of icon tiles for what to do next with a result (Animate, Upscale, Edit…). */
export function ActionTiles<T extends string>({ title, tiles, onSelect, className }: ActionTilesProps<T>) {
  if (!tiles.length) return null;
  return (
    <section className={cn("grid gap-2", className)} aria-label={title}>
      <h3 className="m-0 text-[length:var(--fs-2xs)] font-semibold tracking-[0.14em] text-muted uppercase">{title}</h3>
      <ul className="m-0 grid list-none auto-cols-fr grid-flow-col gap-1.5 p-0">
        {tiles.map((tile) => (
          <li key={tile.id}>
            <button
              type="button"
              onClick={() => onSelect(tile.id)}
              title={tile.description}
              aria-label={`${tile.label}: ${tile.description}`}
              className={cn(
                "grid w-full justify-items-center gap-1.5 rounded-xl border border-border bg-surface-raised px-1 pt-2.5 pb-2",
                "text-[length:var(--fs-xs)] font-medium text-subtle transition-[border-color,color,transform] duration-150",
                "hover:-translate-y-px hover:border-[color-mix(in_srgb,var(--primary)_45%,transparent)] hover:text-foreground",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
              )}
            >
              <span className="grid size-8 place-items-center rounded-[10px] bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-primary">
                <Icon name={tile.icon} className="size-[18px]" />
              </span>
              {tile.label}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
