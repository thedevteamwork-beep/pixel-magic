import { headerContent, signedInLinks } from "@/constants/navigation";
import { HeaderAccount } from "@/components/layout/HeaderAccount";
import { MotionToggle } from "@/components/landing/MotionToggle";
import { Logo } from "./Logo";
import styles from "./Layout.module.css";

export function Header() {
  return (
    <header className={styles.header}>
      <div className={`page-container ${styles.headerInner}`}>
        <Logo />
        <HeaderAccount links={headerContent.links} signedInLinks={signedInLinks} />
        <MotionToggle />
      </div>
    </header>
  );
}
