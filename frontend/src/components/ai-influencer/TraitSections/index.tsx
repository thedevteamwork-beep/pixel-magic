"use client";

import { MAX_NAME_LENGTH, traitGroups } from "@/components/ai-influencer/constants";
import { ControlSection } from "../ControlSection";
import { useInfluencer } from "../InfluencerContext";
import { OptionChips } from "./OptionChips";
import { OptionGroup } from "./OptionGroup";
import { OptionTiles } from "./OptionTiles";
import { TextField } from "./TextField";

/**
 * Trait groups. `part="lead"` shows the groups that open the panel (character type); `part="main"` shows the name
 * and every other group. Required traits always keep a value; the rest can be cleared by clicking them again.
 */
export function TraitSections({ part }: { part: "lead" | "main" }) {
  const { state, dispatch, registerField } = useInfluencer();
  const { traits, fieldErrors } = state;
  const busy = state.status === "generating";

  const groups = traitGroups.filter((group) => Boolean(group.lead) === (part === "lead"));

  return (
    <>
      {part === "main" && (
        <ControlSection eventKey="name" title="Name">
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
      )}

      {groups.map((group) => (
        <ControlSection eventKey={group.id} key={group.id} title={group.title} description={group.description}>
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
