import type { StaticImageData } from "next/image";
import naturalCharacter from "@/assets/images/ai-influencer/character/generated/natural.jpg";
import expressiveCharacter from "@/assets/images/ai-influencer/character/generated/expressive.jpg";
import wildCharacter from "@/assets/images/ai-influencer/character/generated/wild.jpg";
import kittyCharacter from "@/assets/images/ai-influencer/character/generated/kitty.jpg";
import puppyCharacter from "@/assets/images/ai-influencer/character/generated/puppy.jpg";
import froggyCharacter from "@/assets/images/ai-influencer/character/generated/froggy.jpg";
import hamsterCharacter from "@/assets/images/ai-influencer/character/generated/hamster.jpg";
import birdieCharacter from "@/assets/images/ai-influencer/character/generated/birdie.jpg";
import bugCharacter from "@/assets/images/ai-influencer/character/generated/bug.jpg";
import bobHair from "@/assets/images/ai-influencer/hair/bob.webp";
import braidsHair from "@/assets/images/ai-influencer/hair/braids.webp";
import buzzCutHair from "@/assets/images/ai-influencer/hair/buzz-cut.webp";
import curlyHair from "@/assets/images/ai-influencer/hair/curly.webp";
import longWavesHair from "@/assets/images/ai-influencer/hair/long-waves.webp";
import pixieHair from "@/assets/images/ai-influencer/hair/pixie.webp";
import sleekStraightHair from "@/assets/images/ai-influencer/hair/sleek-straight.webp";
import topKnotHair from "@/assets/images/ai-influencer/hair/top-knot.webp";
import athleticBuild from "@/assets/images/ai-influencer/build/athletic.webp";
import broadBuild from "@/assets/images/ai-influencer/build/broad.webp";
import curvyBuild from "@/assets/images/ai-influencer/build/curvy.webp";
import slimBuild from "@/assets/images/ai-influencer/build/slim.webp";
import fashionTemplate from "@/assets/images/ai-influencer/templates/fashion.jpg";
import fitnessTemplate from "@/assets/images/ai-influencer/templates/fitness.jpg";
import travelTemplate from "@/assets/images/ai-influencer/templates/travel.jpg";
import beautyTemplate from "@/assets/images/ai-influencer/templates/beauty.jpg";
import streetwearTemplate from "@/assets/images/ai-influencer/templates/streetwear.jpg";
import luxuryTemplate from "@/assets/images/ai-influencer/templates/luxury.jpg";
import kittyTemplate from "@/assets/images/ai-influencer/templates/kitty.jpg";
import puppyTemplate from "@/assets/images/ai-influencer/templates/puppy.jpg";
import froggyTemplate from "@/assets/images/ai-influencer/templates/froggy.jpg";
import hamsterTemplate from "@/assets/images/ai-influencer/templates/hamster.jpg";
import birdieTemplate from "@/assets/images/ai-influencer/templates/birdie.jpg";
import bugTemplate from "@/assets/images/ai-influencer/templates/bug.jpg";
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
/** Saved style references are projects of this type. */
export const STYLE_PROJECT_TYPE = "influencer-style";
export const STYLES_PAGE_SIZE = 50;
export const MAX_STYLE_NAME_LENGTH = 40;
export const PROJECT_JOBS_PAGE_SIZE = 20;
export const POLL_INTERVAL_MS = 4000;

/** Text fields checked on submit. Add a validator here to change what a field accepts. */
export type TextField = "name" | "extra";
export type TextValues = Record<TextField, string>;
export const textFieldRules: FieldRules<TextValues> = {
  name: [trimmed(isNotEmpty("Give your influencer a name."), isTextLength({ min: 2, max: MAX_NAME_LENGTH }))],
  extra: [trimmed(isTextLength({ max: MAX_EXTRA_LENGTH }))],
};

/** The name a style reference is saved under, checked when it is saved. */
export const styleNameRules = [
  trimmed(isNotEmpty("Give your style a name."), isTextLength({ min: 2, max: MAX_STYLE_NAME_LENGTH })),
];

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

/**
 * Character types that are animals, with the species the model is asked for. The prompt drops human-only traits
 * (heritage, skin tone) for these.
 */
export const ANIMAL_SPECIES: Readonly<Record<string, string>> = {
  kitty: "cat",
  puppy: "dog",
  froggy: "frog",
  hamster: "hamster",
  birdie: "bird",
  bug: "insect",
};

export const traitGroups: readonly {
  id: string;
  title: string;
  /** Shown at the top of the panel, before the persona and name sections. */
  lead?: boolean;
  description?: string;
  fields: readonly { key: TraitKey; label: string; options: TraitOption[]; tiles?: TileKind; required?: boolean }[];
}[] = [
  {
    id: "character",
    title: "Character",
    description: "Choose a human look or an animal character.",
    lead: true,
    fields: [
      {
        key: "character",
        label: "Choose a character",
        tiles: "character",
        options: options("Natural", "Expressive", "Wild", "Kitty", "Puppy", "Froggy", "Hamster", "Birdie", "Bug"),
      },
    ],
  },
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
        tiles: "photo",
        options: withArt(options("Streetwear", "Tailored", "Athleisure", "Boho", "Evening wear", "Minimal basics"), {
          streetwear: "outfit-streetwear",
          tailored: "outfit-tailored",
          athleisure: "outfit-athleisure",
          boho: "outfit-boho",
          "evening-wear": "outfit-evening-wear",
          "minimal-basics": "outfit-minimal-basics",
        }),
      },
      {
        key: "setting",
        label: "Setting",
        tiles: "photo",
        options: withArt(options("Studio", "City street", "Beach", "Café", "Gym", "Rooftop at golden hour"), {
          studio: "setting-studio",
          "city-street": "setting-city-street",
          beach: "setting-beach",
          café: "setting-cafe",
          gym: "setting-gym",
          "rooftop-at-golden-hour": "setting-rooftop",
        }),
      },
    ],
  },
];

/** Gender and age are always set. Every other trait starts empty and is left out of the prompt until chosen. */
export const defaultTraits: Readonly<InfluencerTraits> = {
  name: "",
  extra: "",
  character: "",
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

/** Ready-made trait combinations shown in the Templates tab. */
export const archetypes: readonly Archetype[] = [
  {
    id: "fashion",
    title: "Fashion muse",
    tagline: "Runway-ready and effortless",
    asset: fashionTemplate,
    tone: "plum",
    traits: { outfit: "tailored", setting: "studio", hairStyle: "sleek-straight", build: "slim" },
  },
  {
    id: "fitness",
    title: "Fitness coach",
    tagline: "Strong, warm, camera-ready",
    asset: fitnessTemplate,
    tone: "forest",
    traits: { outfit: "athleisure", setting: "gym", hairStyle: "top-knot", build: "athletic" },
  },
  {
    id: "travel",
    title: "Travel diarist",
    tagline: "Sun, sea and golden hours",
    asset: travelTemplate,
    tone: "sage",
    traits: { outfit: "boho", setting: "beach", hairStyle: "long-waves", hairColor: "brunette" },
  },
  {
    id: "beauty",
    title: "Beauty creator",
    tagline: "Glow-first close-ups",
    asset: beautyTemplate,
    tone: "peach",
    traits: { outfit: "minimal-basics", setting: "studio", hairStyle: "curly", skinTone: "tan" },
  },
  {
    id: "streetwear",
    title: "Street stylist",
    tagline: "Sneakers, city, attitude",
    asset: streetwearTemplate,
    tone: "paper",
    traits: { outfit: "streetwear", setting: "city-street", hairStyle: "braids", gender: "man" },
  },
  {
    id: "luxury",
    title: "Lifestyle luxe",
    tagline: "Rooftops and quiet luxury",
    asset: luxuryTemplate,
    tone: "plum",
    traits: { outfit: "evening-wear", setting: "rooftop-at-golden-hour", hairStyle: "bob", hairColor: "auburn" },
  },
  {
    id: "kitty-creator",
    title: "Cat creator",
    tagline: "Curious, polished, camera-ready",
    asset: kittyTemplate,
    tone: "plum",
    traits: { character: "kitty", outfit: "minimal-basics", setting: "studio" },
  },
  {
    id: "puppy-coach",
    title: "Puppy coach",
    tagline: "Playful energy, every day",
    asset: puppyTemplate,
    tone: "forest",
    traits: { character: "puppy", outfit: "athleisure", setting: "gym" },
  },
  {
    id: "frog-explorer",
    title: "Frog explorer",
    tagline: "Small adventures, big charm",
    asset: froggyTemplate,
    tone: "sage",
    traits: { character: "froggy", outfit: "boho", setting: "beach" },
  },
  {
    id: "hamster-beauty",
    title: "Hamster beauty",
    tagline: "A little glow goes a long way",
    asset: hamsterTemplate,
    tone: "peach",
    traits: { character: "hamster", outfit: "minimal-basics", setting: "studio" },
  },
  {
    id: "songbird-stylist",
    title: "Songbird stylist",
    tagline: "Bright looks with city flair",
    asset: birdieTemplate,
    tone: "paper",
    traits: { character: "birdie", outfit: "streetwear", setting: "city-street" },
  },
  {
    id: "beetle-luxe",
    title: "Beetle after dark",
    tagline: "Tiny icon, rooftop glamour",
    asset: bugTemplate,
    tone: "plum",
    traits: { character: "bug", outfit: "tailored", setting: "rooftop-at-golden-hour" },
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

/** Five template portraits fanned out behind the Explore headline, including a male and animal character. */
export const heroFan = [travelTemplate, beautyTemplate, fashionTemplate, streetwearTemplate, kittyTemplate] as const;

/** Pictures for the hair style tiles (and the gender tiles, which reuse them), by hair style value. */
export const hairImages: Readonly<Record<string, StaticImageData>> = {
  bob: bobHair,
  braids: braidsHair,
  "buzz-cut": buzzCutHair,
  curly: curlyHair,
  "long-waves": longWavesHair,
  pixie: pixieHair,
  "sleek-straight": sleekStraightHair,
  "top-knot": topKnotHair,
};

/** Pictures for the character type tiles, by character value. */
export const characterImages: Readonly<Record<string, StaticImageData>> = {
  natural: naturalCharacter,
  expressive: expressiveCharacter,
  wild: wildCharacter,
  kitty: kittyCharacter,
  puppy: puppyCharacter,
  froggy: froggyCharacter,
  hamster: hamsterCharacter,
  birdie: birdieCharacter,
  bug: bugCharacter,
};

/** Pictures for the build tiles, by build value. */
export const buildImages: Readonly<Record<string, StaticImageData>> = {
  athletic: athleticBuild,
  broad: broadBuild,
  curvy: curvyBuild,
  slim: slimBuild,
};
