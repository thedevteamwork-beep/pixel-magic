import type { IconName } from "@/ui/Icon";

export type MediaId =
  | "desert"
  | "portrait"
  | "product"
  | "ocean"
  | "flowers"
  | "architecture"
  | "sneakers"
  | "paperWorldFashionFilm"
  | "paperWorldFashionReference"
  | "manchesterDerbyFilm"
  | "manchesterDerbyCharacter"
  | "manchesterDerbyBall"
  | "manchesterDerbyStadium"
  | "aureliaEscapeFilm"
  | "aureliaEscapeReference"
  | "forestRescueFilm"
  | "forestRescueReference"
  | "julietteYoYoFilm"
  | "julietteCharacterReference"
  | "julietteKeyframes"
  | "fairyWorldFilm"
  | "fairyWorldReference"
  | "templateGhibli"
  | "templateGhibliDuo"
  | "templateGhibliSky"
  | "templateManRef"
  | "templateWomanRef"
  | "templateJaipur"
  | "templateProductHero"
  | "templateProductRef"
  | "templateFashionAfterdark"
  | "templateFashionResort"
  | "templateFashionCrimson"
  | "templateFashionChrome"
  | "templateMakeupSoftglam"
  | "templateRooftopAfterglow"
  | "templateAfterdarkRef"
  | "templateResortRef"
  | "templateCrimsonRef"
  | "templateChromeRef"
  | "templateMakeupBlackRef"
  | "templateChestupEditorial"
  | "templatePlusSize"
  | "templateGhibliSaree"
  | "templateCollectibleFigure"
  | "templateBridalEditorial"
  | "templateSwimwearCampaign"
  | "templateGtaViceCity"
  | "templateLoudDrop"
  | "templateOctopusPortrait"
  | "templateCeramicsCampaign"
  | "templateCheesePullEditorial"
  | "templateCatReference"
  | "templatePetRoyal"
  | "templateSneakerLaunch"
  | "templateTokyoSnowglobe"
  | "templateBasketballManga"
  | "templateIcelandHighlands"
  | "templateQuietPark"
  | "templateKoreanMiniSuper"
  | "templateTechCouture"
  | "cityVlogFilm"
  | "cityVlogCharacter"
  | "sushiBiteFilm"
  | "sushiBiteCharacter"
  | "maskTiktokFilm"
  | "maskTiktokModelA"
  | "maskTiktokModelB"
  | "maskTiktokMaskA"
  | "maskTiktokMaskB"
  | "stadiumCamFilm"
  | "stadiumCamCharacter"
  | "mechaWarFilm"
  | "mechaWarBattlefield"
  | "mechaWarAlien"
  | "mechaWarPilot"
  | "mechaWarMech";

/** Text-to-video templates: a clip with no still image. */
/**
 * Clips with no still image: text-to-video templates, and films whose template still is a reference sheet rather
 * than a frame (the home page hero shows these dark until the first frame arrives).
 */
export type VideoOnlyMediaId = "frozenHuntFilm" | "canyonWrathFilm" | "candlelightFilm";

/** Any media a template card can show. */
export type TemplateMediaId = MediaId | VideoOnlyMediaId;

export type TemplateCategory = "all" | "video" | "image" | "marketing" | "portraits";

export type TemplateFilters = {
  category: TemplateCategory;
  model: string;
};

export type LandingAsset = {
  image: string;
  /** The image's width ÷ height. */
  aspectRatio: number;
  video?: string;
  alt: string;
  objectPosition?: string;
};

export type VideoOnlyAsset = {
  image?: undefined;
  aspectRatio: number;
  video: string;
  alt: string;
  objectPosition?: undefined;
};

export type TemplateItem = {
  id: string;
  title: string;
  asset: TemplateMediaId;
  referenceAssets?: readonly MediaId[];
  mediaType: "image" | "video";
  model: string;
  categories: readonly TemplateCategory[];
  description: string;
  tag: string;
  filter?: string;
  prompt?: string;
  aspectRatio?: number;
};

export type LandingModel = {
  name: string;
  description: string;
  symbol: string;
  category: "image" | "video";
};

/* ───────── Home page sections ───────── */

/** An asset, and which part of it stays in view when its box crops it (CSS `object-position`). */
export type FramedAsset = {
  asset: TemplateMediaId;
  objectPosition?: string;
};

/** A two-part headline: plain words, then the accent words set in the serif. */
export type AccentTitle = {
  title: string;
  accent: string;
};

/** What a studio card shows: a slideshow, a playing clip, or a before/after line. */
export type StudioCardArtwork =
  | { kind: "slides"; slides: readonly FramedAsset[]; intervalMs: number }
  | { kind: "clip"; asset: TemplateMediaId }
  | { kind: "compare"; asset: MediaId };

export type StudioCard = {
  id: string;
  /** The uppercase title under the card. */
  title: string;
  description: string;
  /** The words over the picture. */
  headline: AccentTitle;
  href: string;
  /** A small label on the picture, such as "New". */
  badge?: string;
  /** Highlights the title in the brand colour. */
  featured?: boolean;
  /** Template filters to apply when the card links to the template gallery. */
  filters?: TemplateFilters;
  artwork: StudioCardArtwork;
};

export type HeroChapter = {
  id: string;
  label: string;
  heading: AccentTitle;
  description: string;
  /** The templates "Explore the collection" opens. */
  filters: TemplateFilters;
  /**
   * `cover` fills the banner. `side` stands a portrait on the right at a natural size and fades its left edge into
   * the dark behind the headline, so a tall photo is not cut down to a face.
   */
  backdrop: FramedAsset & { layout: "cover" | "side" };
};

export type ShortcutTile = {
  title: string;
  description: string;
  href: string;
  icon: IconName;
  /** Shown behind the tile on hover. */
  reveal: TemplateMediaId;
  /** Template filters to apply when the tile links to the template gallery. */
  filters?: TemplateFilters;
};

export type BeforeAfterPair = {
  id: string;
  name: string;
  note: string;
  before: MediaId;
  after: MediaId;
  beforeLabel: string;
  afterLabel: string;
  /** Blur the "before" side, for an upscale where both sides are the same file. */
  softenBefore?: boolean;
  objectPosition?: string;
};

export type AdFormat = {
  id: string;
  label: string;
  asset: MediaId;
  /** `source` is the user's own photo, at the front of the stack. */
  shape: "banner" | "story" | "post" | "source";
  objectPosition?: string;
};

export type InfluencerPerson = {
  id: string;
  name: string;
  reference: MediaId;
  /** The first scene is the large picture. */
  scenes: readonly { asset: MediaId; label: string; objectPosition?: string }[];
};

export type ModelChip = {
  name: string;
  description: string;
  /** One or two letters in the round badge. */
  mark: string;
  href: string;
  isNew?: boolean;
};
