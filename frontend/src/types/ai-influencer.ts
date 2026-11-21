import type { StaticImageData } from "next/image";
import type { MediaId } from "./landing";

export type TraitKey =
  | "character"
  | "gender"
  | "age"
  | "ethnicity"
  | "skinTone"
  | "hairStyle"
  | "hairColor"
  | "eyeColor"
  | "build"
  | "outfit"
  | "setting";

export type InfluencerTraits = Record<TraitKey, string> & {
  name: string;
  /** Free-text extra direction, e.g. "freckles, gold hoop earrings". */
  extra: string;
};

export type TraitOption = {
  value: string;
  label: string;
  /** Colour chip for skin, hair and eye options; also sent in the prompt as its hex code. */
  swatch?: string;
  /** What the option means in plain words, written into the prompt (e.g. "medium skin with warm golden-olive undertones"). */
  description?: string;
  /** Photo id or icon name for tile options. */
  art?: string;
};

/** How a trait is drawn: plain chips, or picture tiles showing what each option means. */
export type TileKind = "character" | "hair" | "body" | "photo" | "icon";

export type Archetype = {
  id: string;
  title: string;
  tagline: string;
  asset: StaticImageData;
  /** Accent tint behind the image in the card. */
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

export type StageView = "explore" | "result" | "templates" | "history";

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

/** The face photo. `uploadId` is set when it is already in storage (a saved influencer's photo), so it isn't sent again. */
export type ReferencePhoto = { url: string; name: string; uploadId?: string };

/** A saved style reference: an `influencer-style` project and its image, signed for a day. */
export type StyleReference = { id: string; name: string; uploadId: string; url: string };
