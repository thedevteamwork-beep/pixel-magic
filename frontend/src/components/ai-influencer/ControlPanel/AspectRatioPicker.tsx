"use client";

import { aspectRatios } from "@/lib/ai-influencer/projects";
import type { PublicModel } from "@/lib/api/types";
import { OptionMenu } from "@/ui/OptionMenu";
import { RatioIcon } from "@/ui/RatioIcon";

type AspectRatioPickerProps = {
  model: PublicModel | undefined;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
};

/** The image shape for the next Generate, from the ratios the model offers. Hidden for a model without any. */
export function AspectRatioPicker({ model, value, disabled, onChange }: AspectRatioPickerProps) {
  const ratios = aspectRatios(model);
  if (ratios.length === 0) return null;
  return (
    <OptionMenu
      label="Aspect ratio"
      icon={<RatioIcon ratio={value} />}
      value={value}
      options={ratios.map((ratio) => ({ value: ratio, label: ratio, icon: <RatioIcon ratio={ratio} size={22} /> }))}
      columns={ratios.length > 6 ? 4 : 3}
      disabled={disabled}
      onChange={onChange}
    />
  );
}
