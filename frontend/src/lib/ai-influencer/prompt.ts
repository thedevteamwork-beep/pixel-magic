import { traitGroups } from "@/components/ai-influencer/constants";
import type { InfluencerTraits, TraitKey } from "@/types/ai-influencer";

const fields = traitGroups.flatMap((group) => group.fields);

/** Turns a stored option value back into its readable label. */
export function traitLabel(key: TraitKey, value: string): string {
  return fields.find((field) => field.key === key)?.options.find((option) => option.value === value)?.label ?? value;
}

/** Builds the text prompt a real model would receive. Traits that were not chosen are simply left out. */
export function composeInfluencerPrompt(traits: InfluencerTraits, hasReference = false): string {
  const label = (key: TraitKey) => (traits[key] ? traitLabel(key, traits[key]).toLowerCase() : "");
  const join = (items: string[], separator: string) => items.filter(Boolean).join(separator);

  const subject = join([label("age"), label("ethnicity"), label("gender")], " ");
  const hair = join([label("hairColor"), label("hairStyle")], " ");
  const looks = join(
    [
      label("skinTone") && `${label("skinTone")} skin`,
      hair && `${hair} hair`,
      label("eyeColor") && `${label("eyeColor")} eyes`,
      label("build") && `${label("build")} build`,
    ],
    ", ",
  );
  const styling = join([label("outfit") && `wearing ${label("outfit")}`, label("setting")], ", ");

  const parts = [
    `A photorealistic portrait of a ${subject || "person"}`,
    looks,
    styling,
    "natural skin texture, social-media influencer look, consistent face identity",
    hasReference ? "keep the face and likeness of the uploaded reference photo" : "",
    traits.extra.trim(),
  ];
  return `${join(parts, ". ")}.`;
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
