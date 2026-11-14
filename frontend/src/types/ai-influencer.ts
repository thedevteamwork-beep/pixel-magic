import type { MediaId } from "./landing";

export type TraitKey =
  "gender" | "age" | "ethnicity" | "skinTone" | "hairStyle" | "hairColor" | "eyeColor" | "build" | "outfit" | "setting";

export type InfluencerTraits = Record<TraitKey, string> & {
  name: string;
  /** Free-text extra direction, e.g. "freckles, gold hoop earrings". */
  extra: string;
};

export type TraitOption = {
  value: string;
  label: string;
  /** Colour chip for skin, hair and eye options. */
  swatch?: string;
  /** Photo id or icon name for tile options. */
  art?: string;
};

/** How a trait is drawn: plain chips, or picture tiles showing what each option means. */
export type TileKind = "hair" | "body" | "photo" | "icon";

export type Archetype = {
  id: string;
  title: string;
  tagline: string;
  asset: MediaId;
  /** Which sample crop and tone this card uses. */
  tone: "peach" | "sage" | "plum" | "forest" | "paper";
  traits: Partial<InfluencerTraits>;
};

export type InfluencerVariation = {
  id: string;
  url: string;
  alt: string;
  seed?: number;
  /** Visual variety for the sample portraits. Real renders leave these out. */
  hue?: number;
  position?: string;
};

export type StageView = "explore" | "result" | "history";

/** A ready-made persona shown on the Explore tab. Sample art only. */
export type FeaturedInfluencer = {
  id: string;
  name: string;
  niche: string;
  asset: MediaId;
  position: string;
  hue: number;
  /** Starting look applied when the card is picked. */
  archetypeId: string;
};

export type ReferencePhoto = { url: string; name: string };
