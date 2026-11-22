export type MediaId = "desert" | "portrait" | "product" | "ocean" | "flowers" | "architecture" | "sneakers" | "templateGhibli" | "templateGhibliDuo" | "templateGhibliSky" | "templateManRef" | "templateWomanRef" | "templateJaipur" | "templateProductHero" | "templateProductRef" | "templateFashionAfterdark" | "templateFashionResort" | "templateFashionCrimson" | "templateFashionChrome" | "templateMakeupSoftglam" | "templateRooftopAfterglow" | "templateAfterdarkRef" | "templateResortRef" | "templateCrimsonRef" | "templateChromeRef" | "templateMakeupBlackRef" | "templateChestupEditorial" | "templatePlusSize" | "templateGhibliSaree" | "templateCollectibleFigure" | "templateBridalEditorial" | "templateSwimwearCampaign";

export type TemplateCategory = "all" | "video" | "image" | "marketing" | "portraits";

export type TemplateFilters = {
  category: TemplateCategory;
  model: string;
};

export type LandingAsset = {
  image: string;
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
};

export type LandingModel = {
  name: string;
  description: string;
  symbol: string;
  category: "image" | "video";
};
