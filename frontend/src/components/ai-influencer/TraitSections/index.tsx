"use client";

import { MAX_NAME_LENGTH, traitGroups } from "@/components/ai-influencer/constants";
import { ControlSection } from "../ControlSection";
import { useInfluencer } from "../InfluencerContext";
import { OptionChips } from "./OptionChips";
import { OptionGroup } from "./OptionGroup";
import { OptionTiles } from "./OptionTiles";
import { TextField } from "./TextField";

/** Name plus every trait group. Required traits always keep a value; the rest can be cleared by clicking them again. */
export function TraitSections() {
  const { state, dispatch, registerField } = useInfluencer();
  const { traits, fieldErrors } = state;
  const busy = state.status === "generating";

  return (
    <>
      <ControlSection title="Name" defaultOpen>
        <TextField
          label="Name"
          value={traits.name}
          maxLength={MAX_NAME_LENGTH}
          placeholder="e.g. Mira Kapoor"
          disabled={busy}
          error={fieldErrors.name}
          fieldRef={(node) => registerField("name", node)}
          onChange={(value) => dispatch({ type: "trait", key: "name", value })}
        />
      </ControlSection>

      {traitGroups.map((group) => (
        <ControlSection key={group.id} title={group.title} defaultOpen={group.id === "identity"}>
          {group.fields.map((field) => {
            const allowClear = !field.required;
            const onChange = (value: string) => dispatch({ type: "trait", key: field.key, value });
            return (
              <OptionGroup key={field.key} label={field.label} required={field.required} disabled={busy}>
                {field.tiles ? (
                  <OptionTiles
                    kind={field.tiles}
                    options={field.options}
                    value={traits[field.key]}
                    traits={traits}
                    allowClear={allowClear}
                    onChange={onChange}
                  />
                ) : (
                  <OptionChips
                    options={field.options}
                    value={traits[field.key]}
                    allowClear={allowClear}
                    onChange={onChange}
                  />
                )}
              </OptionGroup>
            );
          })}
        </ControlSection>
      ))}
    </>
  );
}
