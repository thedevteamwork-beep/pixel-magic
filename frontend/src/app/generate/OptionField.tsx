import type { FieldSchema } from "@/lib/api/types";
import { fieldClasses } from "@/app/generate/fieldClasses";

type OptionFieldProps = {
  name: string;
  field: FieldSchema;
  value: unknown;
  disabled: boolean;
  onChange: (value: unknown) => void;
};

/** One option input, chosen by the field's type: select, number, checkbox or text. */
export function OptionField({ name, field, value, disabled, onChange }: OptionFieldProps) {
  if (field.type === "boolean") {
    return (
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={Boolean(value)}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
        />
        {field.description}
      </label>
    );
  }

  return (
    <label className="flex flex-col gap-1 text-sm">
      <span>
        {name} <span className="text-subtle">— {field.description}</span>
      </span>
      <FieldInput field={field} value={value} disabled={disabled} onChange={onChange} />
    </label>
  );
}

type FieldInputProps = Omit<OptionFieldProps, "name">;

function FieldInput({ field, value, disabled, onChange }: FieldInputProps) {
  if (field.type === "string" && field.enum) {
    return (
      <select
        className={fieldClasses}
        value={String(value ?? "")}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        {field.enum.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === "integer") {
    return (
      <input
        type="number"
        className={fieldClasses}
        min={field.minimum}
        max={field.maximum}
        step={1}
        value={String(value ?? "")}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  return (
    <input
      type="text"
      className={fieldClasses}
      value={String(value ?? "")}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
