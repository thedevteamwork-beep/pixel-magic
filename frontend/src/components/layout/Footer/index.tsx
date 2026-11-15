import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { navigationLinks } from "@/components/layout/constants";
import { Accordion, AccordionItem } from "@/ui/Accordion";
import { Logo } from "../Logo";
import styles from "./main.module.css";

export function Footer() {
  return (
    <footer className={`page-container ${styles.footer}`}>
      <div className={styles.footerTop}>
        <div>
          <Logo />
          <p>Made for curious minds.</p>
        </div>
        <nav aria-label="Footer navigation">
          <ul>
            {navigationLinks.slice(1).map((link) => (
              <li key={link.href}>
                <a href={link.href}>
                  {link.label}
                  <ArrowUpRight size={13} aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className={styles.footerBottom}>
        <p>© 2026 Pixel Magic</p>
        <Accordion className={styles.creditsAccordion}>
          <AccordionItem
            eventKey="preview-credits"
            title="Preview imagery credits"
            variant="plain"
            className={styles.creditsItem}
          >
            <p>
              Curated sample photography and films from{" "}
              <a href="https://www.pexels.com" target="_blank" rel="noopener noreferrer">
                Pexels
              </a>{" "}
              by Kelly, cottonbro studio, Mikhail Nilov, Lucius Crick, Natalie Bond, Nenyasha Manzvera, and Wayne Lee.
            </p>
          </AccordionItem>
        </Accordion>
        <Link href="/#top">Back to top ↑</Link>
      </div>
    </footer>
  );
}
