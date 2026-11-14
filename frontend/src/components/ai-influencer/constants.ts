import { isNotEmpty, isTextLength, trimmed, type FieldRules } from "@/lib/validation/validators";
import type {
  Archetype,
  FeaturedInfluencer,
  TileKind,
  InfluencerTraits,
  TraitKey,
  TraitOption,
} from "@/types/ai-influencer";

export const VARIATION_COUNT = 4;
export const MAX_EXTRA_LENGTH = 500;
export const MAX_NAME_LENGTH = 40;
export const PROJECT_TYPE = "ai-influencer";
export const PROJECTS_PAGE_SIZE = 50;
export const PROJECT_JOBS_PAGE_SIZE = 20;
export const POLL_INTERVAL_MS = 4000;

/** Text fields checked on submit. Add a validator here to change what a field accepts. */
export type TextField = "name" | "extra";
export type TextValues = Record<TextField, string>;
export const textFieldRules: FieldRules<TextValues> = {
  name: [trimmed(isNotEmpty("Give your influencer a name."), isTextLength({ min: 2, max: MAX_NAME_LENGTH }))],
  extra: [trimmed(isTextLength({ max: MAX_EXTRA_LENGTH }))],
};

const options = (...values: string[]): TraitOption[] =>
  values.map((value) => ({ value: value.toLowerCase().replace(/\s+/g, "-"), label: value }));
const withArt = (list: TraitOption[], art: Record<string, string>): TraitOption[] =>
  list.map((option) => ({ ...option, art: art[option.value] }));
const swatches = (entries: Record<string, string>): TraitOption[] =>
  Object.entries(entries).map(([label, swatch]) => ({
    value: label.toLowerCase().replace(/\s+/g, "-"),
    label,
    swatch,
  }));

export const traitGroups: readonly {
  id: string;
  title: string;
  fields: readonly { key: TraitKey; label: string; options: TraitOption[]; tiles?: TileKind; required?: boolean }[];
}[] = [
  {
    id: "identity",
    title: "Identity",
    fields: [
      {
        key: "gender",
        label: "Gender",
        required: true,
        tiles: "hair",
        options: withArt(options("Woman", "Man", "Non-binary"), {
          woman: "long-waves",
          man: "buzz-cut",
          "non-binary": "bob",
        }),
      },
      { key: "age", label: "Age", required: true, options: options("Early 20s", "Late 20s", "30s", "40s", "50s+") },
      {
        key: "ethnicity",
        label: "Heritage",
        options: options(
          "South Asian",
          "East Asian",
          "Southeast Asian",
          "Black",
          "Latina",
          "Middle Eastern",
          "White",
          "Mixed",
        ),
      },
    ],
  },
  {
    id: "look",
    title: "Look",
    fields: [
      {
        key: "skinTone",
        label: "Skin tone",
        options: swatches({
          Porcelain: "#f4d9c6",
          Fair: "#e8bf9f",
          Olive: "#c99a6e",
          Tan: "#a8754b",
          Brown: "#7a4e30",
          Deep: "#4b2d1d",
        }),
      },
      {
        key: "hairStyle",
        label: "Hair style",
        tiles: "hair",
        options: withArt(
          options("Long waves", "Sleek straight", "Curly", "Bob", "Pixie", "Braids", "Buzz cut", "Top knot"),
          {},
        ),
      },
      {
        key: "hairColor",
        label: "Hair colour",
        options: swatches({
          Black: "#17120f",
          Brunette: "#5a3825",
          Auburn: "#8a3b22",
          Blonde: "#d7b46a",
          Silver: "#c9cbc8",
          Pastel: "#c7a7f0",
        }),
      },
      {
        key: "eyeColor",
        label: "Eyes",
        options: swatches({ Brown: "#5a3a22", Hazel: "#8a6a35", Green: "#4f7a4a", Blue: "#4f7ea8", Grey: "#8a9296" }),
      },
      { key: "build", label: "Build", tiles: "body", options: options("Slim", "Athletic", "Curvy", "Broad") },
    ],
  },
  {
    id: "style",
    title: "Style",
    fields: [
      {
        key: "outfit",
        label: "Outfit",
        tiles: "icon",
        options: withArt(options("Streetwear", "Tailored", "Athleisure", "Boho", "Evening wear", "Minimal basics"), {
          streetwear: "Shirt",
          tailored: "Briefcase",
          athleisure: "Dumbbell",
          boho: "Flower2",
          "evening-wear": "Wine",
          "minimal-basics": "Circle",
        }),
      },
      {
        key: "setting",
        label: "Setting",
        tiles: "photo",
        options: withArt(options("Studio", "City street", "Beach", "Café", "Gym", "Rooftop at golden hour"), {
          studio: "product",
          "city-street": "architecture",
          beach: "ocean",
          café: "flowers",
          gym: "sneakers",
          "rooftop-at-golden-hour": "desert",
        }),
      },
    ],
  },
];

/** Gender and age are always set. Every other trait starts empty and is left out of the prompt until chosen. */
export const defaultTraits: Readonly<InfluencerTraits> = {
  name: "",
  extra: "",
  gender: "woman",
  age: "late-20s",
  ethnicity: "",
  skinTone: "",
  hairStyle: "",
  hairColor: "",
  eyeColor: "",
  build: "",
  outfit: "",
  setting: "",
};

/** Starting looks. Sample art only; swap `asset` when real renders exist. */
export const archetypes: readonly Archetype[] = [
  {
    id: "fashion",
    title: "Fashion muse",
    tagline: "Runway-ready and effortless",
    asset: "portrait",
    tone: "plum",
    traits: { outfit: "tailored", setting: "studio", hairStyle: "sleek-straight", build: "slim" },
  },
  {
    id: "fitness",
    title: "Fitness coach",
    tagline: "Strong, warm, camera-ready",
    asset: "portrait",
    tone: "forest",
    traits: { outfit: "athleisure", setting: "gym", hairStyle: "top-knot", build: "athletic" },
  },
  {
    id: "travel",
    title: "Travel diarist",
    tagline: "Sun, sea and golden hours",
    asset: "ocean",
    tone: "sage",
    traits: { outfit: "boho", setting: "beach", hairStyle: "long-waves", hairColor: "brunette" },
  },
  {
    id: "beauty",
    title: "Beauty creator",
    tagline: "Glow-first close-ups",
    asset: "flowers",
    tone: "peach",
    traits: { outfit: "minimal-basics", setting: "studio", hairStyle: "curly", skinTone: "tan" },
  },
  {
    id: "streetwear",
    title: "Street stylist",
    tagline: "Sneakers, city, attitude",
    asset: "sneakers",
    tone: "paper",
    traits: { outfit: "streetwear", setting: "city-street", hairStyle: "braids", gender: "man" },
  },
  {
    id: "luxury",
    title: "Lifestyle luxe",
    tagline: "Rooftops and quiet luxury",
    asset: "architecture",
    tone: "plum",
    traits: { outfit: "evening-wear", setting: "rooftop-at-golden-hour", hairStyle: "bob", hairColor: "auburn" },
  },
];

export const featuredInfluencers: readonly FeaturedInfluencer[] = [
  {
    id: "mira",
    name: "Mira Kapoor",
    niche: "Fashion · Mumbai",
    asset: "portrait",
    position: "50% 30%",
    hue: 0,
    archetypeId: "fashion",
  },
  {
    id: "zoe",
    name: "Zoe Marlowe",
    niche: "Travel · Lisbon",
    asset: "ocean",
    position: "50% 50%",
    hue: 0,
    archetypeId: "travel",
  },
  {
    id: "ines",
    name: "Inès Laurent",
    niche: "Beauty · Paris",
    asset: "flowers",
    position: "50% 50%",
    hue: 0,
    archetypeId: "beauty",
  },
  {
    id: "kai",
    name: "Kai Anders",
    niche: "Streetwear · Berlin",
    asset: "sneakers",
    position: "50% 50%",
    hue: 0,
    archetypeId: "streetwear",
  },
  {
    id: "noor",
    name: "Noor Rahman",
    niche: "Lifestyle · Dubai",
    asset: "architecture",
    position: "50% 50%",
    hue: 0,
    archetypeId: "luxury",
  },
  {
    id: "aria",
    name: "Aria Voss",
    niche: "Fitness · Austin",
    asset: "portrait",
    position: "30% 35%",
    hue: 28,
    archetypeId: "fitness",
  },
  {
    id: "sana",
    name: "Sana Iyer",
    niche: "Fashion · Bengaluru",
    asset: "portrait",
    position: "70% 30%",
    hue: -14,
    archetypeId: "fashion",
  },
  {
    id: "leo",
    name: "Leo Park",
    niche: "Campaigns · Seoul",
    asset: "product",
    position: "50% 50%",
    hue: 0,
    archetypeId: "luxury",
  },
];

/** The five cards fanned out behind the Explore headline. */
export const heroFan = ["ocean", "flowers", "portrait", "sneakers", "architecture"] as const;

/** Colour behind a skin, hair or eye option, used to tint the picture tiles. */
export function swatchFor(key: TraitKey, value: string): string | undefined {
  return traitGroups
    .flatMap((group) => group.fields)
    .find((field) => field.key === key)
    ?.options.find((option) => option.value === value)?.swatch;
}
