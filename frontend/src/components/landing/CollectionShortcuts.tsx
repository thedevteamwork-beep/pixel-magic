import { ArrowUpRight, Clapperboard, Megaphone, Sparkles, Waves } from "lucide-react";
import styles from "./LandingSections.module.css";

const shortcuts = [
  { title: "Video templates", description: "A scene worth imagining", href: "#templates", icon: Clapperboard },
  { title: "Marketing Studio", description: "Made to stop the scroll", href: "#marketing", icon: Megaphone },
  { title: "Seedance 2.5", description: "Find a little more motion", href: "#seedance", icon: Waves },
  { title: "GPT Image 2", description: "From thought to frame", href: "#gpt-image-2", icon: Sparkles },
] as const;

export function CollectionShortcuts() {
  return <nav className={styles.shortcuts} aria-label="Template collections">
    {shortcuts.map(({ title, description, href, icon: Icon }, index) => (
      <a href={href} key={href}>
        <Icon size={20} className={styles.shortcutIcon} aria-hidden="true" />
        <span><strong>{title}</strong><small>{description}</small></span>
        <span className={styles.shortcutNumber} aria-hidden="true">0{index + 1}</span>
        <ArrowUpRight className={styles.shortcutArrow} size={16} aria-hidden="true" />
      </a>
    ))}
  </nav>;
}
