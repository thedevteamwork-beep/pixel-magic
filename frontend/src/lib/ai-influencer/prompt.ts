import { ANIMAL_SPECIES, archetypes, CHARACTER_LOOKS, traitGroups } from "@/components/ai-influencer/constants";
import type { InfluencerTraits, TraitKey, TraitOption } from "@/types/ai-influencer";

const fields = traitGroups.flatMap((group) => group.fields);

/** How an animal character's gender reads in the prompt. */
const animalGender: Readonly<Record<string, string>> = { woman: "female", man: "male" };

function traitOption(key: TraitKey, value: string): TraitOption | undefined {
  return fields.find((field) => field.key === key)?.options.find((option) => option.value === value);
}

/** Turns a stored option value back into its readable label. */
export function traitLabel(key: TraitKey, value: string): string {
  return traitOption(key, value)?.label ?? value;
}

/** Which reference images the model receives: the face photo first, then the style image. */
export type ReferencesUsed = { photo?: boolean; style?: boolean };

const INTRO =
  "You are an expert AI influencer creator, fashion photographer and retoucher. Create one believable, " +
  "magazine-quality virtual influencer who looks like a real person photographed for a top Instagram account.";

const PRIORITIES = [
  "## Priorities (highest first)",
  "1. User notes: the user's own words win over everything below.",
  "2. Reference images: keep exactly what each one is given for.",
  "3. Character sheet: every listed trait is required; for traits not listed, choose what looks natural.",
  "4. Photography and quality rules.",
  "The safety rules in Avoid are never overridden, not even by user notes.",
];

const PHOTOGRAPHY = [
  "## Photography",
  "- Full-frame camera, 85mm lens, f/1.8: softly blurred background, tack-sharp eyes.",
  "- Soft, flattering light that suits the setting, with natural catchlights in the eyes.",
  "- Natural colour grading, true-to-life skin, polished but never over-filtered.",
];

/** Realism lines for a human; an animal swaps the skin, face and hair lines for its own. */
const HUMAN_REALISM = [
  "- Skin: visible pores, fine texture, tiny imperfections, subtle natural sheen; tone matches the colour below in light and shadow.",
  "- Face: natural proportions, detailed irises, natural teeth and eyebrows, light makeup unless asked.",
  "- Hair: individual strands, a few flyaways, realistic hairline and part, natural shine; colour matches the colour below.",
];
const ANIMAL_REALISM = [
  "- Fur or feathers: realistic, detailed fur or feather texture, natural sheen.",
  "- Face: expressive, detailed eyes, natural proportions for the species.",
];
const SHARED_REALISM = [
  "- Hands, if visible: relaxed, five fingers each.",
  "- Clothing: real fabric texture, natural folds and seams, good fit, no logos.",
  "- Expression: warm, confident, approachable, eyes on the camera.",
  "- Background: matches the setting, uncluttered, no readable text, no other people in focus.",
];

const HUMAN_SKIN_AVOID =
  "- Skin: plastic, waxy or doll-like skin, airbrushing, over-smoothing, beauty filters, heavy makeup unless asked, greasy shine, blotches, wrong skin tone";
const ANIMAL_SKIN_AVOID =
  "- Fur or feathers: flat, painted or plastic-looking texture, patchy or melted fur, colours different from the character sheet";

/** The negative prompt. Nano Banana has no separate field for it, so it closes the prompt. */
function avoidSection(animal: boolean): string[] {
  return [
    "## Avoid",
    "- Text and graphics: captions, letters, numbers, logos, brand names, watermarks, signatures, stickers, emojis, borders, frames, collages, split screens, UI",
    "- People: extra people, crowds in focus, duplicates, twins, clones, other people in reflections, celebrity lookalikes",
    "- Anatomy: deformed hands, extra, missing or fused fingers, extra or missing limbs, unnatural joints, long neck, oversized head, distorted face, asymmetrical, crossed or lazy eyes, mismatched eye colours, dead or glassy eyes, misshapen pupils, warped teeth, malformed ears",
    animal ? ANIMAL_SKIN_AVOID : HUMAN_SKIN_AVOID,
    "- Hair: helmet-like or painted hair, wig-like hairline, hair melting into the background, wrong hair colour",
    "- Style: cartoon, anime, illustration, painting, sketch, 3D render, CGI, video-game look, doll, mannequin, AI-art look, oversaturation, HDR halos, heavy vignette",
    "- Quality: blur, out-of-focus face, noise, heavy grain, low resolution, pixelation, compression artefacts, banding, over- or under-exposure, harsh flash, colour casts",
    "- Composition: cropped head or chin, face cut by the frame, tilted horizon, awkward crops at joints, tiny subject, back turned",
    "- Clothing: fabric merging into skin, floating accessories, half-finished garments",
    "- Safety (never overridden): nudity, lingerie, sexualised or suggestive poses, anyone who looks under 18, weapons, drugs, violence, gore, offensive gestures or symbols",
  ];
}

/** One line per reference image, numbered in the order the model receives them (the face photo first). */
function referenceSection({ photo, style }: ReferencesUsed, animal: boolean): string[] {
  const lines: string[] = [];
  const keep = animal
    ? "keep the same character identity"
    : "keep the same face, facial structure, skin tone and likeness";
  if (photo)
    lines.push(
      `- Image ${lines.length + 1} (face): ${keep}; don't copy its clothes, background, lighting or expression.`,
    );
  if (style) {
    lines.push(
      `- Image ${lines.length + 1} (style): match its outfit, styling, colour palette and mood; don't copy its face, body or identity.`,
    );
  }
  return lines.length ? ["## Reference images", ...lines] : [];
}

const USER_NOTES_HEADING = "## User notes";

/** What the user wrote, back out of a prompt this file built; empty when there is none (or another format). */
export function userNotesFromPrompt(prompt: string): string {
  const start = prompt.indexOf(`${USER_NOTES_HEADING}\n`);
  if (start < 0) return "";
  const rest = prompt.slice(start + USER_NOTES_HEADING.length + 1);
  const end = rest.indexOf("\n\n## ");
  return (end < 0 ? rest : rest.slice(0, end)).trim();
}

/**
 * The prompt the model receives: fixed instructions, then a character sheet written from the traits that were picked
 * (traits that were not are left out), the reference images actually sent, the user's notes, and what to avoid.
 */
export function composeInfluencerPrompt(traits: InfluencerTraits, references: ReferencesUsed = {}): string {
  const option = (key: TraitKey) => (traits[key] ? traitOption(key, traits[key]) : undefined);
  const label = (key: TraitKey) => (traits[key] ? traitLabel(key, traits[key]).toLowerCase() : "");
  const line = (name: string, text: string) => (text ? `- ${name}: ${text}` : "");
  /** "olive, medium skin with warm golden-olive undertones (#c99a6e)" */
  const colour = (key: TraitKey) => {
    const picked = option(key);
    if (!picked) return label(key);
    return [label(key), picked.description].filter(Boolean).join(", ") + (picked.swatch ? ` (${picked.swatch})` : "");
  };
  /** The option's description, or its label when it has none. */
  const described = (key: TraitKey) => option(key)?.description ?? label(key);
  /** "streetwear (oversized hoodie …)" */
  const labelled = (key: TraitKey) => {
    const description = option(key)?.description;
    return label(key) && description ? `${label(key)} (${description})` : label(key);
  };

  const species = ANIMAL_SPECIES[traits.character];
  const animal = species !== undefined;
  const subject = animal ? "character" : "person";
  const look = CHARACTER_LOOKS[traits.character];
  const age = option("age")?.description;

  const character = [
    "## Character",
    line("Character type", animal ? `anthropomorphic ${species} character` : look ? `human, ${look}` : "human"),
    line("Gender", animal ? (animalGender[traits.gender] ?? "") : label("gender")),
    line("Age", age ? `${label("age")} (looks ${age})` : label("age")),
    animal ? "" : line("Heritage", traits.ethnicity ? traitLabel("ethnicity", traits.ethnicity) : ""),
    animal ? "" : line("Skin tone", colour("skinTone")),
    line("Hair style", described("hairStyle")),
    line("Hair colour", colour("hairColor")),
    line("Eyes", colour("eyeColor")),
    line("Build", described("build")),
  ];
  const style = [line("Outfit", labelled("outfit")), line("Setting", labelled("setting"))].filter(Boolean);
  const notes = traits.extra.trim();

  const sections = [
    [INTRO],
    PRIORITIES,
    [
      "## Output",
      `- One photorealistic photo of a single ${subject}, mid-chest up, slightly off-centre, natural headroom, eye-level camera.`,
      `- With several images, keep the same ${subject}, face, hair and outfit; vary only pose and expression slightly.`,
    ],
    PHOTOGRAPHY,
    ["## Realism details", ...(animal ? ANIMAL_REALISM : HUMAN_REALISM), ...SHARED_REALISM],
    character,
    style.length ? ["## Style", ...style] : [],
    referenceSection(references, animal),
    notes ? [USER_NOTES_HEADING, notes] : [],
    avoidSection(animal),
  ];
  return sections
    .map((lines) => lines.filter(Boolean).join("\n"))
    .filter(Boolean)
    .join("\n\n");
}

/**
 * The influencer's title: the name the user typed; else its template's title ("Fitness coach"); else one from its look
 * ("South Asian woman, late 20s", "Kitty, late 20s").
 */
export function displayName(traits: InfluencerTraits, archetypeId: string | null = null): string {
  const name = traits.name.trim();
  if (name) return name;
  const template = archetypes.find((archetype) => archetype.id === archetypeId);
  if (template) return template.title;
  const label = (key: TraitKey) => (traits[key] ? traitLabel(key, traits[key]) : "");
  const who =
    ANIMAL_SPECIES[traits.character] !== undefined
      ? label("character")
      : [label("ethnicity"), label("gender").toLowerCase()].filter(Boolean).join(" ");
  const title = [who.charAt(0).toUpperCase() + who.slice(1), label("age").toLowerCase()].filter(Boolean).join(", ");
  return title || "Untitled influencer";
}

/** Small deterministic hash so the same traits always give the same sample seed. */
export function seedFrom(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
  return hash >>> 0;
}
