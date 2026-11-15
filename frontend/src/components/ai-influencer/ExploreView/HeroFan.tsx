import { Media } from "@/ui/Media";
import { heroFan } from "@/components/ai-influencer/constants";
import styles from "./main.module.css";

/** Five overlapping cards, tallest in the middle. Decorative only. */
export function HeroFan() {
  const middle = Math.floor(heroFan.length / 2);
  return (
    <ul className={styles.fan} aria-hidden="true">
      {heroFan.map((image, index) => (
        <li key={image.src} data-distance={Math.abs(index - middle)}>
          <Media
            media={{ kind: "image", src: image.src, alt: "" }}
            fill
            sizes="240px"
            imageProps={{ preload: index === middle }}
          />
        </li>
      ))}
    </ul>
  );
}
