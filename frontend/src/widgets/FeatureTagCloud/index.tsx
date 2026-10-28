import { Chip } from "@/ui/Chip";
import { SectionHeading } from "@/ui/SectionHeading";

export type FeatureTag = {
  label: string;
  href: string;
};

export type FeatureTagCloudProps = {
  title: string;
  tags: FeatureTag[];
};

/** Centered heading over a wrap of feature links. */
export function FeatureTagCloud({ title, tags }: FeatureTagCloudProps) {
  return (
    <section className="flex flex-col items-center gap-6 py-12">
      <SectionHeading title={title} tone="default" align="center" />
      <ul className="flex max-w-5xl flex-wrap justify-center gap-2">
        {tags.map((tag) => (
          <li key={tag.label}>
            <Chip href={tag.href}>{tag.label}</Chip>
          </li>
        ))}
      </ul>
    </section>
  );
}
