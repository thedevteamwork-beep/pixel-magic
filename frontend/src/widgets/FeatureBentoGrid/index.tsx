import Link from "next/link";
import { Badge } from "@/ui/Badge";
import { ButtonWithLink, type ActionLink } from "@/ui/Button";
import { Icon, type IconName } from "@/ui/Icon";
import { Media, type MediaAsset } from "@/ui/Media";

export type BentoTile = {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: IconName;
  badge?: string;
  /** Optional background, for a highlighted tile. */
  media?: MediaAsset;
};

export type FeatureBentoGridProps = {
  promo: {
    title: string;
    description: string;
    action: ActionLink;
    media: MediaAsset;
    /** Set when the grid sits above the fold, so its image is the early paint. */
    eager?: boolean;
  };
  tiles: BentoTile[];
};

/** Large promo card on the left, grid of tool tiles on the right. */
export function FeatureBentoGrid({ promo, tiles }: FeatureBentoGridProps) {
  return (
    <section className="grid gap-3 lg:grid-cols-3">
      <div className="flex flex-col gap-4 rounded-xl bg-surface p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold uppercase">{promo.title}</h2>
            <p className="mt-1 text-sm text-muted">{promo.description}</p>
          </div>
          <ButtonWithLink href={promo.action.href} variant={promo.action.variant ?? "primary"} size="sm">
            <Icon name="plus" className="size-4" />
            {promo.action.label}
          </ButtonWithLink>
        </div>
        <Media
          media={promo.media}
          eager={promo.eager}
          sizes="(min-width: 1024px) 33vw, 100vw"
          className="min-h-48 flex-1 rounded-lg"
        />
      </div>

      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:col-span-2">
        {tiles.map((tile) => (
          <li key={tile.id}>
            <Link
              href={tile.href}
              className="relative flex h-full min-h-34 flex-col justify-between gap-6 overflow-hidden rounded-xl bg-surface p-4 transition-colors hover:bg-surface-raised"
            >
              {tile.media && (
                <>
                  <Media media={tile.media} fill sizes="(min-width: 768px) 22vw, 50vw" className="opacity-60" />
                  <div className="absolute inset-0 bg-linear-to-t from-background/90 to-transparent" />
                </>
              )}
              <Icon name={tile.icon} className="relative" />
              <div className="relative">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold">{tile.title}</h3>
                  {tile.badge && <Badge>{tile.badge}</Badge>}
                </div>
                <p className="mt-1 text-xs text-muted">{tile.description}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
