"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { studioLibrary, studioTools, type StudioLink } from "@/components/layout/constants";
import { Icon } from "@/ui/Icon";
import styles from "./main.module.css";

function RailLink({ link, active }: { link: StudioLink; active: boolean }) {
  return (
    <li>
      <Link href={link.href} className={styles.railLink} aria-current={active ? "page" : undefined}>
        <span className={styles.railIcon}>
          <Icon name={link.icon} className="size-[19px]" />
        </span>
        <span className={styles.railLabel}>{link.label}</span>
      </Link>
    </li>
  );
}

/** Every studio one click away, the current one marked. Hidden on phones, where the header has them. */
export function StudioRail() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  return (
    <nav className={styles.rail} aria-label="Studios">
      <ul className={styles.railList}>
        {studioTools.map((link) => (
          <RailLink key={link.href} link={link} active={isActive(link.href)} />
        ))}
      </ul>
      <ul className={`${styles.railList} ${styles.railLibrary}`}>
        {studioLibrary.map((link) => (
          <RailLink key={link.href} link={link} active={isActive(link.href)} />
        ))}
      </ul>
    </nav>
  );
}
