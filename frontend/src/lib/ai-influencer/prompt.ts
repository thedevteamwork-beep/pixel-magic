import { ANIMAL_SPECIES, traitGroups } from "@/components/ai-influencer/constants";
import type { InfluencerTraits, TraitKey } from "@/types/ai-influencer";

const fields = traitGroups.flatMap((group) => group.fields);

/** Extra look for the human character types; "natural" adds nothing. */
const characterLook: Readonly<Record<string, string>> = {
  expressive: "bold, expressive features",
  wild: "extreme, exaggerated, eccentric look",
};

/** How an animal character's gender reads in the prompt. */
const animalGender: Readonly<Record<string, string>> = { woman: "female", man: "male" };

/** Turns a stored option value back into its readable label. */
export function traitLabel(key: TraitKey, value: string): string {
  return fields.find((field) => field.key === key)?.options.find((option) => option.value === value)?.label ?? value;
}

/** Which reference images the model receives: the face photo first, then the style image. */
export type ReferencesUsed = { photo?: boolean; style?: boolean };

/** What the prompt says about the reference images, in the order the model receives them. */
function referenceDirections({ photo, style }: ReferencesUsed): string[] {
  if (photo && style) {
    return [
      "keep the face and likeness of the first reference image",
      "match the outfit, styling and mood of the second reference image",
    ];
  }
  if (photo) return ["keep the face and likeness of the uploaded reference photo"];
  if (style) return ["match the outfit, styling and mood of the style reference image"];
  return [];
}

/** Builds the text prompt a real model would receive. Traits that were not chosen are simply left out. */
export function composeInfluencerPrompt(traits: InfluencerTraits, references: ReferencesUsed = {}): string {
  const label = (key: TraitKey) => (traits[key] ? traitLabel(key, traits[key]).toLowerCase() : "");
  const join = (items: string[], separator: string) => items.filter(Boolean).join(separator);

  const species = ANIMAL_SPECIES[traits.character];
  const animal = species !== undefined;
  const animalDetails = join([animalGender[traits.gender] ?? "", label("age")], ", ");
  const subject = animal
    ? `an anthropomorphic ${species} character${animalDetails ? `, ${animalDetails}` : ""}`
    : `a ${join([label("age"), label("ethnicity"), label("gender")], " ") || "person"}`;
  const hair = join([label("hairColor"), label("hairStyle")], " ");
  const looks = join(
    [
      characterLook[traits.character] ?? "",
      !animal && label("skinTone") ? `${label("skinTone")} skin` : "",
      hair && `${hair} hair`,
      label("eyeColor") && `${label("eyeColor")} eyes`,
      label("build") && `${label("build")} build`,
    ],
    ", ",
  );
  const styling = join([label("outfit") && `wearing ${label("outfit")}`, label("setting")], ", ");

  const parts = [
    `A photorealistic portrait of ${subject}`,
    looks,
    styling,
    animal
      ? "detailed realistic texture, social-media influencer look, consistent character identity"
      : "natural skin texture, social-media influencer look, consistent face identity",
    ...referenceDirections(references),
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
