import { landingAssets } from "@/constants/landing-media";
import { Media } from "@/ui/Media";
import Link from "next/link";
import { ArrowLeft, Sparkle } from "lucide-react";
import type { ReactNode } from "react";
import { Logo } from "@/components/layout/Logo";
import type { AuthMode } from "@/lib/auth/paths";
import styles from "./main.module.css";

type AuthShellProps = {
  mode: AuthMode;
  children: ReactNode;
};

const artworkCopy = {
  "sign-in": {
    eyebrow: "Follow that little spark",
    heading: "Your next idea.",
    accent: "A world of possibility.",
    description: "Find a look. Follow a feeling. Pick up wherever curiosity takes you.",
  },
  "sign-up": {
    eyebrow: "For the beautifully curious",
    heading: "A little idea.",
    accent: "A whole new world.",
    description: "Find a look. Follow a feeling. Make something unmistakably yours.",
  },
  "forgot-password": {
    eyebrow: "A little pause. A fresh start.",
    heading: "Good ideas.",
    accent: "Worth coming back to.",
    description: "Your next creative chapter is waiting right where you left it.",
  },
  "reset-password": {
    eyebrow: "A little pause. A fresh start.",
    heading: "Good ideas.",
    accent: "Worth coming back to.",
    description: "Your next creative chapter is waiting right where you left it.",
  },
} satisfies Record<AuthMode, { eyebrow: string; heading: string; accent: string; description: string }>;

const artwork = [
  { asset: "architecture", label: "A DIFFERENT ANGLE", className: styles.architecture },
  { asset: "flowers", label: "IN FULL BLOOM", className: styles.flowers },
  { asset: "portrait", label: "THE CHARACTER EDIT", className: styles.portrait },
  { asset: "sneakers", label: "OBJECTS OF DESIRE", className: styles.sneakers },
  { asset: "product", label: "THE SOFT LAUNCH", className: styles.product },
] as const;

/** Shared presentation for account pages; form behavior stays in the caller. */
export function AuthShell({ mode, children }: AuthShellProps) {
  const copy = artworkCopy[mode];

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Logo />
        <Link className={styles.backLink} href="/">
          <ArrowLeft size={15} aria-hidden="true" />
          Back to explore
        </Link>
      </header>

      <main className={styles.main} id="main-content" tabIndex={-1}>
        <div className={styles.formColumn}>
          <div className={styles.formContent}>{children}</div>
        </div>

        <aside className={styles.artPanel} aria-labelledby="auth-artwork-heading">
          <div className={styles.artCopy}>
            <p className={styles.authShellEyebrow}>
              <span aria-hidden="true" />
              {copy.eyebrow}
            </p>
            <h2 id="auth-artwork-heading">
              {copy.heading}
              <br />
              <em>{copy.accent}</em>
            </h2>
            <p className={styles.description}>{copy.description}</p>
          </div>

          <div className={styles.collage} aria-hidden="true">
            <span className={styles.orbit} />
            <span className={styles.orbitInner} />
            <span className={styles.crossTop}>+</span>
            <span className={styles.crossBottom}>+</span>
            {artwork.map(({ asset, label, className }, index) => (
              <div className={`${styles.photo} ${className}`} key={asset}>
                <div className={styles.photoImage}>
                  <Media
                    media={{ kind: "image", src: landingAssets[asset].image, alt: "" }}
                    fill
                    sizes={
                      asset === "portrait"
                        ? "(min-width: 1600px) 225px, (min-width: 901px) 17vw, 1px"
                        : "(min-width: 1600px) 250px, (min-width: 901px) 20vw, 1px"
                    }
                    plain
                  />
                </div>
                <span className={styles.photoLabel}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  {label}
                </span>
              </div>
            ))}
            <div className={styles.sparkle}>
              <Sparkle size={30} strokeWidth={1.2} />
            </div>
            <span className={styles.marginNote}>A NEW POINT OF VIEW</span>
          </div>

          <div className={styles.artFooter}>
            <span className={styles.footerMark} aria-hidden="true">
              ✳
            </span>
            <p>
              Images. Films.
              <br />
              Everything in between.
            </p>
            <span className={styles.edition}>
              THE PIXEL MAGIC EDIT
              <br />
              <span>Made for your imagination.</span>
            </span>
          </div>
        </aside>
      </main>

      <footer className={styles.footer}>
        <span>A little idea. A whole lot of possibility.</span>
        <span>Pixel Magic · For curious minds.</span>
      </footer>
    </div>
  );
}
