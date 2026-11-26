export type MediaId = "desert" | "portrait" | "product" | "ocean" | "flowers" | "architecture" | "sneakers" | "paperWorldFashionFilm" | "paperWorldFashionReference" | "manchesterDerbyFilm" | "manchesterDerbyCharacter" | "manchesterDerbyBall" | "manchesterDerbyStadium" | "aureliaEscapeFilm" | "aureliaEscapeReference" | "forestRescueFilm" | "forestRescueReference" | "julietteYoYoFilm" | "julietteCharacterReference" | "julietteKeyframes" | "fairyWorldFilm" | "fairyWorldReference" | "templateGhibli" | "templateGhibliDuo" | "templateGhibliSky" | "templateManRef" | "templateWomanRef" | "templateJaipur" | "templateProductHero" | "templateProductRef" | "templateFashionAfterdark" | "templateFashionResort" | "templateFashionCrimson" | "templateFashionChrome" | "templateMakeupSoftglam" | "templateRooftopAfterglow" | "templateAfterdarkRef" | "templateResortRef" | "templateCrimsonRef" | "templateChromeRef" | "templateMakeupBlackRef" | "templateChestupEditorial" | "templatePlusSize" | "templateGhibliSaree" | "templateCollectibleFigure" | "templateBridalEditorial" | "templateSwimwearCampaign" | "templateGtaViceCity" | "templateLoudDrop" | "templateOctopusPortrait" | "templateCeramicsCampaign" | "templateCheesePullEditorial" | "templateCatReference" | "templatePetRoyal" | "templateSneakerLaunch" | "templateTokyoSnowglobe" | "templateBasketballManga" | "templateIcelandHighlands" | "templateQuietPark" | "templateKoreanMiniSuper" | "templateTechCouture" | "cityVlogFilm" | "cityVlogCharacter" | "sushiBiteFilm" | "sushiBiteCharacter" | "maskTiktokFilm" | "maskTiktokModelA" | "maskTiktokModelB" | "maskTiktokMaskA" | "maskTiktokMaskB" | "stadiumCamFilm" | "stadiumCamCharacter" | "mechaWarFilm" | "mechaWarBattlefield" | "mechaWarAlien" | "mechaWarPilot" | "mechaWarMech";

/** Text-to-video templates: a clip with no still image. */
export type VideoOnlyMediaId = "frozenHuntFilm" | "canyonWrathFilm";

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
