import { modelRails, modelSection } from "@/components/landing/constants";
import { SectionIntro } from "../SectionIntro";
import { ModelChip } from "./ModelChip";
import styles from "./main.module.css";

/** The models, on two rows that drift in opposite directions and stop while the pointer is over them. */
export function ModelMarquee() {
  return (
    <section className="landing-section" id="models" aria-labelledby="models-heading">
      <SectionIntro
        eyebrow={modelSection.eyebrow}
        heading={modelSection.heading}
        description={modelSection.description}
        headingId="models-heading"
      />
      <div className={styles.marquee}>
        {modelRails.map((rail, railIndex) => (
          <div
            className={styles.track}
            data-reverse={railIndex % 2 === 1}
            key={rail.id}
            role="list"
            aria-label={rail.label}
          >
            {[false, true].map((copy) =>
              rail.models.map((model) => (
                <span role={copy ? undefined : "listitem"} key={`${copy}-${model.name}`}>
                  <ModelChip model={model} copy={copy} />
                </span>
              )),
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
