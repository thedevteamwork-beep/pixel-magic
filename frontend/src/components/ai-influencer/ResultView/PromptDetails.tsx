import { Accordion, AccordionItem } from "@/ui/Accordion";
import styles from "./main.module.css";

export function PromptDetails({ prompt }: { prompt: string }) {
  return (
    <Accordion className={styles.promptAccordion}>
      <AccordionItem
        eventKey="prompt-used"
        title="Prompt used"
        variant="plain"
        className={styles.prompt}
        showChevron={false}
      >
        <p>{prompt}</p>
      </AccordionItem>
    </Accordion>
  );
}
