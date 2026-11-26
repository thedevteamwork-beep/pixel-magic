"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { shortcutTiles } from "@/components/landing/constants";
import { Icon } from "@/ui/Icon";
import { LandingMedia } from "../LandingMedia";
import { useTemplateFilters } from "../LandingProvider";
import styles from "./main.module.css";

/** Four shortcuts under the hero. Pointing at one reveals its picture or plays its clip behind it. */
export function CollectionShortcuts() {
  const [hovered, setHovered] = useState<number | null>(null);
  const { setFilters } = useTemplateFilters();

  return (
    <nav className={styles.tiles} aria-label="Shortcuts">
      {shortcutTiles.map((tile, index) => (
        <Link
          href={tile.href}
          key={tile.title}
          className={styles.tile}
          onClick={() => tile.filters && setFilters(tile.filters)}
          onPointerEnter={() => setHovered(index)}
          onPointerLeave={() => setHovered(null)}
          onFocus={() => setHovered(index)}
          onBlur={() => setHovered(null)}
        >
          <span className={styles.reveal} aria-hidden="true">
            <LandingMedia asset={tile.reveal} alt="" behavior="hover" active={hovered === index} sizes="25vw" />
          </span>
          <span className={styles.icon}>
            <Icon name={tile.icon} className="size-[19px]" />
          </span>
          <span className={styles.text}>
            <b>{tile.title}</b>
            <small>{tile.description}</small>
          </span>
          <ArrowUpRight className={styles.go} size={16} aria-hidden="true" />
        </Link>
      ))}
    </nav>
  );
}
