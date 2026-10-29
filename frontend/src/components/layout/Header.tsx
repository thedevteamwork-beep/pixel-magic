import { navigationLinks } from "@/constants/navigation";
import { Logo } from "./Logo";
import { MotionToggle } from "@/components/landing/MotionToggle";
import styles from "./Layout.module.css";

export function Header() {
  return (
    <header className={styles.header}>
      <div className={`page-container ${styles.headerInner}`}>
        <Logo />
        <nav className={styles.navigation} aria-label="Main navigation">
          <ul>{navigationLinks.map((link) => (
            <li key={link.href}><a href={link.href}>{link.label}</a></li>
          ))}</ul>
        </nav>
        <MotionToggle />
      </div>
    </header>
  );
}
