import { AccordionItem } from "@/ui/Accordion";
import type { ReactNode } from "react";

/** Collapsible block used for every group in the left panel. */
export function ControlSection({
  eventKey,
  title,
  description,
  count,
  children,
}: {
  eventKey: string;
  title: string;
  description?: string;
  count?: number;
  children: ReactNode;
}) {
  return (
    <AccordionItem eventKey={eventKey} title={title} description={description} count={count}>
      {children}
    </AccordionItem>
  );
}
