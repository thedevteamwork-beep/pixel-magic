import { ButtonWithLink, type ActionLink } from "@/ui/Button";
import { Media, type MediaAsset } from "@/ui/Media";

export type HeroBannerProps = {
  eyebrow?: string;
  title: string;
  description: string;
  action: ActionLink;
  media: MediaAsset;
};

/** Full-width banner with centered copy over a background image. */
export function HeroBanner({ eyebrow, title, description, action, media }: HeroBannerProps) {
  return (
    <section className="relative flex min-h-88 items-center justify-center overflow-hidden rounded-2xl px-6 py-16 text-center md:min-h-104">
      <Media media={media} fill sizes="100vw" />
      <div className="absolute inset-0 bg-linear-to-t from-background via-background/60 to-background/20" />

      <div className="relative flex max-w-2xl flex-col items-center">
        {eyebrow && <p className="font-display text-lg font-bold uppercase italic tracking-wide">{eyebrow}</p>}
        <h2 className="font-display text-5xl font-bold uppercase italic leading-none tracking-tight md:text-7xl">
          {title}
        </h2>
        <p className="mt-4 max-w-md text-sm text-subtle">{description}</p>
        <ButtonWithLink href={action.href} variant={action.variant ?? "secondary"} className="mt-6">
          {action.label}
        </ButtonWithLink>
      </div>
    </section>
  );
}
