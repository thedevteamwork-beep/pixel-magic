import { Accordion, AccordionItem } from "@/ui/Accordion";
import type { ReactNode } from "react";
import styles from "./main.module.css";

/**
 * Collapsible block used for every group in the left panel. Each block has its own Accordion, so opening or closing one
 * never changes the others.
 */
export function ControlSection({
  eventKey,
  title,
  description,
  count,
  defaultOpen = false,
  children,
}: {
  eventKey: string;
  title: string;
  description?: string;
  count?: number;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <Accordion defaultActiveEventKey={defaultOpen ? eventKey : null}>
      <AccordionItem
        eventKey={eventKey}
        title={title}
        description={description}
        count={count}
        className={styles.section}
      >
        {children}
      </AccordionItem>
    </Accordion>
  );
}
