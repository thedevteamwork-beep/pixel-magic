import { Badge } from "@/ui/Badge";
import { ButtonWithLink, type ActionLink } from "@/ui/Button";
import { cn } from "@/lib/cn";
import { Media, type MediaAsset } from "@/ui/Media";

export type PromoBannerProps = {
  /** `spotlight`: centered, lime-glow frame. `split`: copy on one side, media on the other. */
  variant: "spotlight" | "split";
  eyebrow?: string;
  title: string;
  description: string;
  action: ActionLink;
  media: MediaAsset;
  /** For `split`: put the media on the left. */
  reverse?: boolean;
};

export function PromoBanner(props: PromoBannerProps) {
  return props.variant === "spotlight" ? <SpotlightBanner {...props} /> : <SplitBanner {...props} />;
}

function SpotlightBanner({ eyebrow, title, description, action, media }: PromoBannerProps) {
  return (
    <section className="relative flex min-h-96 items-center justify-center overflow-hidden rounded-2xl border-2 border-primary bg-background px-6 py-16 text-center">
      {/* Decorative backdrop: desaturated so the brand-coloured frame sets the colour. */}
      <Media media={media} fill sizes="100vw" className="opacity-40 grayscale" />
      <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_6rem_color-mix(in_srgb,var(--primary)_45%,transparent)]" />

      <div className="relative flex max-w-2xl flex-col items-center">
        {eyebrow && <p className="text-xs font-bold uppercase tracking-widest text-primary">{eyebrow}</p>}
        <h2 className="font-display text-5xl font-bold uppercase leading-none tracking-tight text-primary md:text-7xl">
          {title}
        </h2>
        <p className="mt-4 text-sm text-foreground">{description}</p>
        <ButtonWithLink href={action.href} variant={action.variant ?? "secondary"} className="mt-6">
          {action.label}
        </ButtonWithLink>
      </div>
    </section>
  );
}

function SplitBanner({ eyebrow, title, description, action, media, reverse }: PromoBannerProps) {
  return (
    // The gradient runs from the copy outwards, so the text always sits on its darkest end.
    <section
      className={cn(
        "grid overflow-hidden rounded-2xl from-promo-from to-promo-to md:grid-cols-2",
        reverse ? "bg-linear-to-l" : "bg-linear-to-r",
      )}
    >
      <div className="flex flex-col justify-center gap-4 p-8 md:p-10">
        {/* A badge, not tinted text: it stays readable however strong the gradient is. */}
        {eyebrow && <Badge className="self-start">{eyebrow}</Badge>}
        <h2 className="font-display text-4xl font-bold uppercase leading-none tracking-tight md:text-5xl">{title}</h2>
        <p className="max-w-sm text-sm text-subtle">{description}</p>
        <ButtonWithLink href={action.href} variant={action.variant ?? "secondary"} size="sm" className="self-start">
          {action.label}
        </ButtonWithLink>
      </div>
      <div className={cn("relative min-h-56", reverse && "md:order-first")}>
        <Media media={media} fill sizes="(min-width: 768px) 50vw, 100vw" />
      </div>
    </section>
  );
}
