export type MediaId = "desert" | "portrait" | "product" | "ocean" | "flowers" | "architecture" | "sneakers" | "templateGhibli" | "templateGhibliDuo" | "templateGhibliSky" | "templateManRef" | "templateWomanRef" | "templateJaipur" | "templateProductHero" | "templateProductRef" | "templateFashionAfterdark" | "templateFashionResort" | "templateFashionCrimson" | "templateFashionChrome" | "templateMakeupSoftglam" | "templateRooftopAfterglow" | "templateAfterdarkRef" | "templateResortRef" | "templateCrimsonRef" | "templateChromeRef" | "templateMakeupBlackRef" | "templateChestupEditorial" | "templatePlusSize" | "templateGhibliSaree" | "templateCollectibleFigure" | "templateBridalEditorial" | "templateSwimwearCampaign" | "templateGtaViceCity" | "templateLoudDrop" | "templateOctopusPortrait" | "templateCeramicsCampaign" | "templateCheesePullEditorial" | "templateCatReference" | "templatePetRoyal" | "templateSneakerLaunch" | "templateTokyoSnowglobe" | "templateBasketballManga" | "templateIcelandHighlands" | "templateQuietPark" | "templateKoreanMiniSuper" | "templateTechCouture";

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

export type TemplateItem = {
  id: string;
  title: string;
  asset: MediaId;
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
