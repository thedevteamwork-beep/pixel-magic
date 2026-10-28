import { ArrowRight, ImageIcon, Mic, Play, Plus, Sparkles, User, Video, Zap, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Icons that config can refer to by name (e.g. `icon: "image"` in constants).
 * Add a Lucide icon here to make it available; in components that don't
 * need a string name, import from "lucide-react" directly.
 */
const icons = {
  plus: Plus,
  "arrow-right": ArrowRight,
  sparkle: Sparkles,
  image: ImageIcon,
  video: Video,
  play: Play,
  mic: Mic,
  user: User,
  bolt: Zap,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof icons;

type IconProps = {
  name: IconName;
  className?: string;
};

/** Decorative icon, coloured by the text colour; pair it with visible text. */
export function Icon({ name, className }: IconProps) {
  const LucideIcon = icons[name];
  return <LucideIcon aria-hidden="true" strokeWidth={1.75} className={cn("size-5", className)} />;
}
