import { ArrowUpRight, Play } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./main.module.css";

type ActionPillProps = {
  children: ReactNode;
  /** `primary`: the lime call to action with an arrow. `glass`: a frosted pill with a play button, for use over media. */
  variant?: "primary" | "glass";
  className?: string;
  onClick?: () => void;
} & ({ href: string } | { href?: undefined; onClick: () => void });

/** The home page's call-to-action pill. Renders a link when given `href`, otherwise a button. */
export function ActionPill({ children, variant = "primary", className = "", href, onClick }: ActionPillProps) {
  const classes = `${styles.pill} ${styles[variant]} ${className}`;
  const content =
    variant === "glass" ? (
      <>
        <span className={styles.play} aria-hidden="true">
          <Play size={13} fill="currentColor" />
        </span>
        {children}
      </>
    ) : (
      <>
        {children}
        <span className={styles.disc} aria-hidden="true">
          <ArrowUpRight size={16} />
        </span>
      </>
    );

  if (href) {
    return (
      <Link href={href} className={classes} onClick={onClick}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" className={classes} onClick={onClick}>
      {content}
    </button>
  );
}
