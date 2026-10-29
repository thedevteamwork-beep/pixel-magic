export type MediaId = "desert" | "portrait" | "product" | "ocean" | "flowers" | "architecture" | "sneakers";

export type TemplateCategory = "all" | "video" | "image" | "marketing" | "portraits";

export type TemplateFilters = {
  category: TemplateCategory;
  model: string;
};

export type LandingAsset = {
  image: string;
  video?: string;
  alt: string;
};

export type TemplateItem = {
  id: string;
  title: string;
  asset: MediaId;
  mediaType: "image" | "video";
  model: string;
  categories: readonly TemplateCategory[];
  description: string;
  tag: string;
  filter?: string;
};

export type LandingModel = {
  name: string;
  description: string;
  symbol: string;
  category: "image" | "video";
};
