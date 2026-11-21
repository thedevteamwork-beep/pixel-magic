import { Minus, Plus } from "lucide-react";
import { optionLabel } from "@/lib/image-generator/models";
import type { ImageOptionValue, StudioModel } from "@/types/image-generator";
import { Icon } from "@/ui/Icon";
import { OptionMenu } from "@/ui/OptionMenu";
import { RatioIcon } from "@/ui/RatioIcon";
import { choicePresentation } from "./constants";
import { ModelPicker } from "./ModelPicker";
import styles from "./main.module.css";

type DockSettingsProps = {
  models: readonly StudioModel[];
  model: StudioModel;
  /** Resolved options: every control's current value for this model. */
  options: Record<string, ImageOptionValue>;
  onModelChange: (key: string) => void;
  onOptionChange: (field: string, value: ImageOptionValue) => void;
  disabled?: boolean;
};

/**
 * The model and only the options it declares, as chips: shape, then its other
 * choices (quality, resolution…), then how many images. Another model may show others.
 */
export function DockSettings({
  models,
  model,
  options,
  onModelChange,
  onOptionChange,
  disabled = false,
}: DockSettingsProps) {
  const { shape, count, choices } = model;
  const countValue = count ? Number(options[count.field]) : 1;
  const shapeValue = shape ? String(options[shape.field]) : "";
  const shapeRatio = shape?.options.find((option) => option.value === shapeValue)?.ratio ?? "1:1";
  // Quality, then resolution, then anything else, in the order `choicePresentation` lists them.
  const order = Object.keys(choicePresentation);
  const rank = (field: string) => (order.includes(field) ? order.indexOf(field) : order.length);
  const sortedChoices = [...choices].sort((a, b) => rank(a.field) - rank(b.field));

  return (
    <div className={styles.controls} role="group" aria-label="Image generation settings">
      <ModelPicker compact models={models} value={model.key} onChange={onModelChange} disabled={disabled} />
      {shape && (
        <OptionMenu
          label="Aspect ratio"
          icon={<RatioIcon ratio={shapeRatio} />}
          value={shapeValue}
          options={shape.options.map((option) => ({
            value: option.value,
            label: option.label,
            icon: <RatioIcon ratio={option.ratio} size={22} />,
          }))}
          columns={shape.options.length > 6 ? 4 : 3}
          onChange={(value) => onOptionChange(shape.field, value)}
          disabled={disabled}
        />
      )}
      {sortedChoices.map((choice) => {
        const presentation = choicePresentation[choice.field];
        return (
          <OptionMenu
            key={choice.field}
            label={presentation?.label ?? choice.label}
            icon={<Icon name={presentation?.icon ?? "sliders"} className="size-[15px]" />}
            value={String(options[choice.field] ?? "")}
            options={choice.options.map((option) => ({ value: option, label: optionLabel(choice.field, option) }))}
            onChange={(value) => onOptionChange(choice.field, value)}
            disabled={disabled}
          />
        );
      })}
      {count && count.max > count.min && (
        <div className={styles.count} role="group" aria-label="Number of images">
          <button
            type="button"
            aria-label="Generate one fewer image"
            disabled={disabled || countValue <= count.min}
            onClick={() => onOptionChange(count.field, countValue - 1)}
          >
            <Minus size={14} aria-hidden="true" />
          </button>
          <output aria-label="Image count" aria-live="polite">
            {countValue}
            <span>/{count.max}</span>
          </output>
          <button
            type="button"
            aria-label="Generate one more image"
            disabled={disabled || countValue >= count.max}
            onClick={() => onOptionChange(count.field, countValue + 1)}
          >
            <Plus size={14} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
