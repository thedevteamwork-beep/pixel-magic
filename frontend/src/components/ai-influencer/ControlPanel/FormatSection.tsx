"use client";

import { aspectRatios } from "@/lib/ai-influencer/projects";
import type { PublicModel } from "@/lib/api/types";
import { RatioIcon } from "@/ui/RatioIcon";
import { ControlSection } from "../ControlSection";
import { OptionChips } from "../TraitSections/OptionChips";
import { OptionGroup } from "../TraitSections/OptionGroup";

type FormatSectionProps = {
  model: PublicModel | undefined;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
};

/** The image shape for the next Generate, from the ratios the model offers. Hidden for a model without any. */
export function FormatSection({ model, value, disabled, onChange }: FormatSectionProps) {
  const ratios = aspectRatios(model);
  if (ratios.length === 0) return null;
  return (
    <ControlSection eventKey="format" title="Format" description={`Aspect ratio ${value}`}>
      <OptionGroup label="Aspect ratio" required disabled={disabled}>
        <OptionChips
          options={ratios.map((ratio) => ({ value: ratio, label: ratio }))}
          value={value}
          icon={(ratio) => <RatioIcon ratio={ratio} />}
          onChange={onChange}
        />
      </OptionGroup>
    </ControlSection>
  );
}
