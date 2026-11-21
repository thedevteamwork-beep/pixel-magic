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

/** One portrait per Generate: only one is shown at a time, and each image costs credits. */
export const VARIATION_COUNT = 1;
/**
 * While on, Generate shows the loader and then a sample portrait from the app's own images: nothing is saved and no
 * credits are spent. Turn off once the backend is deployed.
 */
export const USE_SAMPLE_PORTRAITS = true;
/** How long a sample Generate shows the loader: long enough to refresh or leave the page and see it pick up again. */
export const SAMPLE_RENDER_MS = 6000;
/** How many of the user's newest image jobs are checked for an influencer Generate still running. */
export const RESUME_JOBS_LOOKUP = 20;
export const MAX_EXTRA_LENGTH = 500;
export const MAX_NAME_LENGTH = 40;
export const PROJECT_TYPE = "ai-influencer";
export const PROJECTS_PAGE_SIZE = 50;
/** Saved style references are projects of this type. */
export const STYLE_PROJECT_TYPE = "influencer-style";
export const STYLES_PAGE_SIZE = 50;
export const MAX_STYLE_NAME_LENGTH = 40;
export const PROJECT_JOBS_PAGE_SIZE = 20;
/** Every influencer is made with this model when the backend lists it; otherwise the first image model. */
export const INFLUENCER_MODEL_KEY = "nanoBanana2_generate";
/** Instagram's portrait shape. Nano Banana's own default is 16:9, so the influencer always sends a ratio. */
export const DEFAULT_ASPECT_RATIO = "4:5";
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

/** Colour options: each label with its hex code and a plain description of the colour for the prompt. */
const swatches = (entries: Record<string, [hex: string, description: string]>): TraitOption[] =>
  Object.entries(entries).map(([label, [swatch, description]]) => ({
    value: label.toLowerCase().replace(/\s+/g, "-"),
    label,
    swatch,
    description,
  }));

/** Adds the prompt's description to each option, by option value. */
const described = (list: TraitOption[], descriptions: Record<string, string>): TraitOption[] =>
  list.map((option) => ({ ...option, description: descriptions[option.value] }));

/**
 * Character types that are animals, with the species the model is asked for. The prompt drops human-only traits
 * (heritage, skin tone) for these.
 */
/** How each human character type reads in the prompt's character line. */
export const CHARACTER_LOOKS: Readonly<Record<string, string>> = {
  natural: "natural look",
  expressive: "bold, expressive features",
  wild: "extreme, exaggerated, eccentric look",
};

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
      {
        key: "age",
        label: "Age",
        required: true,
        options: described(options("Early 20s", "Late 20s", "30s", "40s", "50s+"), {
          "early-20s": "about 20–23",
          "late-20s": "about 26–29",
          "30s": "about 31–38",
          "40s": "about 41–48",
          "50s+": "about 52–60",
        }),
      },
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
          Porcelain: ["#f4d9c6", "very fair, pale skin with cool pink undertones"],
          Fair: ["#e8bf9f", "light skin with warm peach undertones"],
          Olive: ["#c99a6e", "medium skin with warm golden-olive undertones"],
          Tan: ["#a8754b", "sun-kissed tan skin with warm undertones"],
          Brown: ["#7a4e30", "rich brown skin with warm undertones"],
          Deep: ["#4b2d1d", "deep dark brown skin with rich warm undertones"],
        }),
      },
      {
        key: "hairStyle",
        label: "Hair style",
        tiles: "hair",
        options: described(
          withArt(
            options("Long waves", "Sleek straight", "Curly", "Bob", "Pixie", "Braids", "Buzz cut", "Top knot"),
            {},
          ),
          {
            "long-waves": "long, soft, loose waves falling past the shoulders",
            "sleek-straight": "long, glossy, poker-straight hair, smooth and frizz-free",
            curly: "voluminous, well-defined natural curls",
            bob: "chin-length bob with a clean, even cut",
            pixie: "short pixie cut, close at the sides and back, soft texture on top",
            braids: "neat, defined braids",
            "buzz-cut": "very short, even buzz cut close to the scalp",
            "top-knot": "hair pulled up into a neat top-knot bun",
          },
        ),
      },
      {
        key: "hairColor",
        label: "Hair colour",
        options: swatches({
          Black: ["#17120f", "natural jet black"],
          Brunette: ["#5a3825", "medium chocolate brown"],
          Auburn: ["#8a3b22", "reddish copper-brown"],
          Blonde: ["#d7b46a", "warm golden blonde"],
          Silver: ["#c9cbc8", "silver-grey with a platinum sheen"],
          Pastel: ["#c7a7f0", "dyed pastel lavender"],
        }),
      },
      {
        key: "eyeColor",
        label: "Eyes",
        options: swatches({
          Brown: ["#5a3a22", "deep warm brown"],
          Hazel: ["#8a6a35", "golden brown with green flecks"],
          Green: ["#4f7a4a", "natural moss green"],
          Blue: ["#4f7ea8", "medium clear blue"],
          Grey: ["#8a9296", "cool steel grey"],
        }),
      },
      {
        key: "build",
        label: "Build",
        tiles: "body",
        options: described(options("Slim", "Athletic", "Curvy", "Broad"), {
          slim: "slim, slender frame",
          athletic: "toned, athletic build with visible muscle definition",
          curvy: "curvy, full figure",
          broad: "broad shoulders, sturdy, strong frame",
        }),
      },
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
        options: described(
          withArt(options("Streetwear", "Tailored", "Athleisure", "Boho", "Evening wear", "Minimal basics"), {
            streetwear: "outfit-streetwear",
            tailored: "outfit-tailored",
            athleisure: "outfit-athleisure",
            boho: "outfit-boho",
            "evening-wear": "outfit-evening-wear",
            "minimal-basics": "outfit-minimal-basics",
          }),
          {
            streetwear:
              "oversized hoodie or graphic tee, wide-leg jeans or cargo pants, chunky sneakers, layered accessories",
            tailored: "well-fitted blazer and trousers, crisp shirt, polished shoes, clean lines",
            athleisure: "fitted sports top, leggings or joggers, technical fabrics, clean sneakers",
            boho: "flowing linen or crochet pieces, earthy tones, layered jewellery, sandals",
            "evening-wear": "elegant gown or sharp suit, satin or silk, refined jewellery",
            "minimal-basics": "plain neutral tee or knit, simple straight trousers, muted palette, no logos",
          },
        ),
      },
      {
        key: "setting",
        label: "Setting",
        tiles: "photo",
        options: described(
          withArt(options("Studio", "City street", "Beach", "Café", "Gym", "Rooftop at golden hour"), {
            studio: "setting-studio",
            "city-street": "setting-city-street",
            beach: "setting-beach",
            café: "setting-cafe",
            gym: "setting-gym",
            "rooftop-at-golden-hour": "setting-rooftop",
          }),
          {
            studio: "seamless studio backdrop, soft key and fill light",
            "city-street": "city street with shopfronts, natural daylight",
            beach: "sandy beach with the sea behind, bright natural sunlight",
            café: "cosy café interior, wooden table, warm ambient light",
            gym: "modern gym, equipment softly blurred, bright clean light",
            "rooftop-at-golden-hour": "rooftop with a city skyline, warm low sun, golden rim light",
          },
        ),
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
