import { headerContent, signedInLinks } from "@/components/layout/constants";
import { HeaderAccount } from "./HeaderAccount";
import { MotionToggle } from "@/components/landing/MotionToggle";
import { Logo } from "../Logo";
import styles from "./main.module.css";

export function Header() {
  return (
    <header className={styles.header}>
      <div className={`page-container ${styles.headerInner}`}>
        <Logo />
        <HeaderAccount links={headerContent.links} signedInLinks={signedInLinks}>
          <div className={styles.motion}>
            <MotionToggle />
          </div>
        </HeaderAccount>
      </div>
    </header>
  );
}
