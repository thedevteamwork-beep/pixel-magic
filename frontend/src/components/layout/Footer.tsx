import { ArrowUpRight } from "lucide-react";
import { navigationLinks } from "@/constants/navigation";
import { Logo } from "./Logo";
import styles from "./Layout.module.css";

export function Footer() {
  return (
    <footer className={`page-container ${styles.footer}`}>
      <div className={styles.footerTop}>
        <div><Logo /><p>Made for curious minds.</p></div>
        <nav aria-label="Footer navigation"><ul>{navigationLinks.slice(1).map((link) => (
          <li key={link.href}><a href={link.href}>{link.label}<ArrowUpRight size={13} aria-hidden="true" /></a></li>
        ))}</ul></nav>
      </div>
      <div className={styles.footerBottom}>
        <p>© 2026 Pixel Magic</p>
        <details>
          <summary>Preview imagery credits</summary>
          <p>Curated sample photography and films from <a href="https://www.pexels.com" target="_blank" rel="noopener noreferrer">Pexels</a> by Kelly, cottonbro studio, Mikhail Nilov, Lucius Crick, Natalie Bond, Nenyasha Manzvera, and Wayne Lee.</p>
        </details>
        <a href="#top">Back to top ↑</a>
      </div>
    </footer>
  );
}
