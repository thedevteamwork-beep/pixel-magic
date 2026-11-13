import { traitGroups } from "@/constants/ai-influencer";
import type { InfluencerTraits, TraitKey } from "@/types/ai-influencer";

const fields = traitGroups.flatMap((group) => group.fields);

/** Turns a stored option value back into its readable label. */
export function traitLabel(key: TraitKey, value: string): string {
  return fields.find((field) => field.key === key)?.options.find((option) => option.value === value)?.label ?? value;
}

/** Builds the text prompt a real model would receive for this influencer. */
export function composeInfluencerPrompt(traits: InfluencerTraits, hasReference = false): string {
  const label = (key: TraitKey) => traitLabel(key, traits[key]).toLowerCase();
  const parts = [
    `A photorealistic portrait of a ${label("age")} ${label("ethnicity")} ${label("gender")}`,
    `${label("skinTone")} skin, ${label("hairColor")} ${label("hairStyle")} hair, ${label("eyeColor")} eyes, ${label("build")} build`,
    `wearing ${label("outfit")}, ${label("setting")}`,
    "natural skin texture, social-media influencer look, consistent face identity",
  ];
  if (hasReference) parts.push("keep the face and likeness of the uploaded reference photo");
  const extra = traits.extra.trim();
  if (extra) parts.push(extra);
  return `${parts.join(". ")}.`;
}

export function displayName(traits: InfluencerTraits): string {
  return traits.name.trim() || "Untitled influencer";
}

/** Small deterministic hash so the same traits always give the same sample seed. */
export function seedFrom(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
  return hash >>> 0;
}
