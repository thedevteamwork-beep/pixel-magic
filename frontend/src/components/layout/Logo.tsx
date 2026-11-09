import Link from "next/link";
import { Zap } from "lucide-react";
import styles from "./Layout.module.css";

export function Logo() {
  return (
    <Link href="/" className={styles.logo} aria-label="Pixel Magic home">
      <span className={styles.logoMark}><Zap size={20} fill="currentColor" strokeWidth={1.5} aria-hidden="true" /></span>
      <span>pixel magic</span>
    </Link>
  );
}
