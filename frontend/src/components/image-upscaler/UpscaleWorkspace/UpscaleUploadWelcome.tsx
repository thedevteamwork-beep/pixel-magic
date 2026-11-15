"use client";

import portraitExample from "@/assets/images/image-studio/portrait.png";
import { Media } from "@/ui/Media";
import { ArrowLeftRight, LoaderCircle, Upload } from "lucide-react";
import { useId, useState, type RefObject } from "react";
import styles from "./main.module.css";

type UpscaleUploadWelcomeProps = {
  onUpload: () => void;
  busy: boolean;
  uploadRef: RefObject<HTMLButtonElement | null>;
};

export function UpscaleUploadWelcome({ onUpload, busy, uploadRef }: UpscaleUploadWelcomeProps) {
  const [comparison, setComparison] = useState(50);
  const id = useId();

  return (
    <section className={styles.welcome} aria-labelledby={`${id}-title`}>
      <figure className={styles.example}>
        <figcaption className={styles.exampleLabel}>Example comparison</figcaption>
        <div className={styles.upscaleUploadWelcomeComparison}>
          <Media
            media={{
              kind: "image",
              src: portraitExample.src,
              alt: "Portrait used to illustrate the comparison control",
            }}
            fill
            sizes="(max-width: 480px) 85vw, 360px"
            plain
            className={styles.photo}
            imageProps={{ preload: true, className: styles.photo }}
          />
          <div className={styles.softened} style={{ clipPath: `inset(0 ${100 - comparison}% 0 0)` }} aria-hidden="true">
            <Media
              media={{ kind: "image", src: portraitExample.src, alt: "" }}
              fill
              sizes="(max-width: 480px) 85vw, 360px"
              plain
              className={`${styles.photo} ${styles.softPhoto}`}
              imageProps={{ className: `${styles.photo} ${styles.softPhoto}` }}
            />
          </div>
          <span className={`${styles.sideLabel} ${styles.before}`} aria-hidden="true">
            Before
          </span>
          <span className={`${styles.sideLabel} ${styles.after}`} aria-hidden="true">
            After
          </span>
          <span className={styles.upscaleUploadWelcomeDivider} style={{ left: `${comparison}%` }} aria-hidden="true">
            <span>
              <ArrowLeftRight size={17} strokeWidth={1.8} />
            </span>
          </span>
          <input
            className={styles.slider}
            type="range"
            min={0}
            max={100}
            step={1}
            value={comparison}
            onChange={(event) => setComparison(Number(event.target.value))}
            aria-label="Adjust example comparison"
            aria-valuetext={`${comparison}% softened example, ${100 - comparison}% clear example`}
            aria-describedby={`${id}-example-note`}
          />
        </div>
        <p className={styles.upscaleUploadWelcomeSrOnly} id={`${id}-example-note`}>
          An illustrative comparison of a softened and clear copy of the same photo. This is not an actual upscaling
          result. Use the arrow keys or drag to compare.
        </p>
      </figure>

      <div className={styles.copy}>
        <h1 id={`${id}-title`}>Upscale your image</h1>
        <p>Drop an image here or choose a file.</p>
        <button ref={uploadRef} type="button" className={styles.upload} onClick={onUpload} disabled={busy}>
          {busy ? (
            <LoaderCircle className={styles.upscaleUploadWelcomeSpinner} size={17} aria-hidden="true" />
          ) : (
            <Upload size={17} aria-hidden="true" />
          )}
          {busy ? "Opening image…" : "Upload image"}
        </button>
        <span className={styles.upscaleUploadWelcomeHint}>Up to 20 MB · drag, drop or paste</span>
      </div>
    </section>
  );
}
