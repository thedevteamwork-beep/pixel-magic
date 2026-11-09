import type { LandingModel, TemplateItem } from "@/types/landing";

/** Landing-page examples only; generation belongs to the separate product. */
export const templateModels: readonly LandingModel[] = [
  { name: "Kling", category: "video", symbol: "◉", description: "Motion and camera stories" },
  { name: "Veo", category: "video", symbol: "▱", description: "Scenes with a cinematic eye" },
  { name: "Seedance 2.5", category: "video", symbol: "✳", description: "Fresh perspectives in motion" },
  { name: "Wan", category: "video", symbol: "≈", description: "Playful moving worlds" },
  { name: "FLUX", category: "image", symbol: "ƒ", description: "A different way to picture it" },
  { name: "GPT Image 2", category: "image", symbol: "✺", description: "Everyday ideas, reimagined" },
  { name: "Seedance 2.0", category: "video", symbol: "✳", description: "A starting point for motion" },
  { name: "Kling 4.0", category: "video", symbol: "◉", description: "A new cinematic direction" },
];

export const discoveryTemplates: readonly TemplateItem[] = [
  { id: "neon", title: "Neon muse", asset: "portrait", mediaType: "video", model: "Kling", categories: ["video", "portraits"], description: "A close-up with a story to tell.", tag: "Portrait" },
  { id: "desert", title: "Desert drift", asset: "desert", mediaType: "video", model: "Veo", categories: ["video"], description: "Wide-open movie energy.", tag: "Cinematic" },
  { id: "product", title: "The soft launch", asset: "product", mediaType: "image", model: "FLUX", categories: ["image", "marketing"], description: "A product, beautifully reimagined.", tag: "Product" },
  { id: "ocean", title: "Out of office", asset: "ocean", mediaType: "video", model: "Seedance 2.5", categories: ["video"], description: "An instant escape.", tag: "Travel" },
  { id: "dream", title: "Otherworldly", asset: "ocean", mediaType: "video", model: "Wan", categories: ["video"], description: "A new shade of surreal.", tag: "Experimental", filter: "hue-rotate(65deg) saturate(1.3)" },
  { id: "editorial", title: "Cover story", asset: "portrait", mediaType: "image", model: "GPT Image 2", categories: ["image", "portraits"], description: "Find your main-character moment.", tag: "Editorial", filter: "grayscale(1) contrast(1.1)" },
  { id: "golden", title: "Golden hour cut", asset: "desert", mediaType: "video", model: "Kling", categories: ["video", "marketing"], description: "Your next campaign opener.", tag: "Campaign", filter: "sepia(.25) saturate(1.2)" },
  { id: "bloom", title: "Botanical dream", asset: "product", mediaType: "video", model: "Veo", categories: ["video", "marketing"], description: "A softer product story.", tag: "Beauty" },
  { id: "coastal", title: "Coastal state", asset: "ocean", mediaType: "video", model: "Seedance 2.5", categories: ["video"], description: "An easygoing little film.", tag: "Lifestyle", filter: "sepia(.2)" },
  { id: "after", title: "After hours", asset: "portrait", mediaType: "video", model: "Wan", categories: ["video", "portraits"], description: "Night lights, your way.", tag: "Nightlife", filter: "hue-rotate(25deg)" },
  { id: "object", title: "Object of desire", asset: "product", mediaType: "image", model: "FLUX", categories: ["image", "marketing"], description: "Elevate the everyday.", tag: "Still life", filter: "grayscale(.85)" },
  { id: "postcard", title: "A perfect nowhere", asset: "desert", mediaType: "image", model: "GPT Image 2", categories: ["image"], description: "Scenes worth getting lost in.", tag: "Landscape", filter: "sepia(.3)" },
  { id: "midnight-portrait", title: "Midnight portrait", asset: "portrait", mediaType: "video", model: "Kling", categories: ["video", "portraits"], description: "A little light. A whole new mood.", tag: "Portrait", filter: "hue-rotate(18deg)" },
  { id: "the-blue-cut", title: "The blue cut", asset: "ocean", mediaType: "video", model: "Seedance 2.5", categories: ["video"], description: "A little cinematic wanderlust.", tag: "Travel", filter: "saturate(.75)" },
  { id: "seedance-two", title: "The open road", asset: "desert", mediaType: "video", model: "Seedance 2.0", categories: ["video"], description: "Follow a moment somewhere new.", tag: "Adventure", filter: "sepia(.15)" },
  { id: "kling-four", title: "A closer feeling", asset: "portrait", mediaType: "video", model: "Kling 4.0", categories: ["video", "portraits"], description: "An intimate cinematic point of view.", tag: "Cinema", filter: "saturate(.8)" },
];

const imageCollection: readonly TemplateItem[] = [
  { id: "image-object", title: "Objects of affection", asset: "product", mediaType: "image", model: "GPT Image 2", categories: ["image"], description: "A product, beautifully reimagined.", tag: "Still life" },
  { id: "image-architecture", title: "Future in focus", asset: "architecture", mediaType: "image", model: "GPT Image 2", categories: ["image"], description: "Spaces you wish existed.", tag: "Architecture" },
  { id: "image-cover", title: "The cover edit", asset: "portrait", mediaType: "image", model: "GPT Image 2", categories: ["image", "portraits"], description: "Find your main-character moment.", tag: "Portrait" },
  { id: "image-petals", title: "Petal poetry", asset: "flowers", mediaType: "image", model: "GPT Image 2", categories: ["image"], description: "A softer kind of statement.", tag: "Botanical" },
  { id: "image-sneakers", title: "Fresh perspective", asset: "sneakers", mediaType: "image", model: "GPT Image 2", categories: ["image", "marketing"], description: "Your next product hero.", tag: "Product" },
  { id: "image-escape", title: "A perfect nowhere", asset: "desert", mediaType: "image", model: "GPT Image 2", categories: ["image"], description: "Get a little lost in the idea.", tag: "Landscape" },
  { id: "image-weekend", title: "The weekend state", asset: "ocean", mediaType: "image", model: "GPT Image 2", categories: ["image"], description: "Postcards from your imagination.", tag: "Lifestyle" },
  { id: "image-shapes", title: "Soft structures", asset: "architecture", mediaType: "image", model: "GPT Image 2", categories: ["image"], description: "A new angle on the everyday.", tag: "Design", filter: "sepia(.35)" },
];

const seedanceCollection: readonly TemplateItem[] = [
  { id: "seed-ocean", title: "Ocean reverie", asset: "ocean", mediaType: "video", model: "Seedance 2.5", categories: ["video"], description: "An escape with a point of view.", tag: "Travel" },
  { id: "seed-desert", title: "The scenic route", asset: "desert", mediaType: "video", model: "Seedance 2.5", categories: ["video"], description: "Make a moment feel like a movie.", tag: "Cinema" },
  { id: "seed-portrait", title: "Afterglow", asset: "portrait", mediaType: "video", model: "Seedance 2.5", categories: ["video", "portraits"], description: "A little movement. A new mood.", tag: "Portrait" },
  { id: "seed-product", title: "The slow reveal", asset: "product", mediaType: "video", model: "Seedance 2.5", categories: ["video", "marketing"], description: "Give your product the spotlight.", tag: "Product" },
  { id: "seed-blue", title: "Blue hour drift", asset: "ocean", mediaType: "video", model: "Seedance 2.5", categories: ["video"], description: "A world between waking and dreaming.", tag: "Atmosphere", filter: "hue-rotate(20deg) saturate(.8)" },
  { id: "seed-away", title: "A world away", asset: "desert", mediaType: "video", model: "Seedance 2.5", categories: ["video"], description: "Your next opening scene.", tag: "Adventure", filter: "sepia(.25)" },
];

const marketingCollection: readonly TemplateItem[] = [
  { id: "market-launch", title: "The product launch", asset: "product", mediaType: "image", model: "FLUX", categories: ["marketing", "image"], description: "A launch-day hero image.", tag: "Product ad" },
  { id: "market-drop", title: "The fresh drop", asset: "sneakers", mediaType: "image", model: "GPT Image 2", categories: ["marketing", "image"], description: "Built for your next collection.", tag: "Social" },
  { id: "market-beauty", title: "Beauty in motion", asset: "product", mediaType: "video", model: "Veo", categories: ["marketing", "video"], description: "A product film with a softer side.", tag: "Beauty ad" },
  { id: "market-bloom", title: "A brand in bloom", asset: "flowers", mediaType: "image", model: "GPT Image 2", categories: ["marketing", "image"], description: "A softer seasonal campaign.", tag: "Brand story" },
  { id: "market-travel", title: "Sell the feeling", asset: "ocean", mediaType: "video", model: "Seedance 2.5", categories: ["marketing", "video"], description: "A little wanderlust goes a long way.", tag: "Travel ad" },
  { id: "market-founder", title: "The face of the story", asset: "portrait", mediaType: "video", model: "Kling", categories: ["marketing", "video", "portraits"], description: "Put a person behind the brand.", tag: "Social reel" },
];

function variations(items: readonly TemplateItem[], names: readonly string[]): TemplateItem[] {
  return names.map((title, index) => ({
    ...items[index],
    id: `${items[index].id}-alternate`,
    title,
    filter: index % 3 === 0 ? "sepia(.2)" : items[index].filter,
  }));
}

export const imageTemplates: readonly TemplateItem[] = [
  ...imageCollection,
  ...variations(imageCollection, ["A quiet statement", "Window light", "In another light", "Sunday blooms", "The launch shot", "Desert notes", "Sea of possibility", "Concrete poetry"]),
];

export const seedanceTemplates: readonly TemplateItem[] = [
  ...seedanceCollection,
  ...variations(seedanceCollection, ["Postcard in motion", "The long way home", "A closer look", "Soft focus story"]),
];

export const marketingTemplates: readonly TemplateItem[] = [
  ...marketingCollection,
  ...variations(marketingCollection, ["The signature shot", "Collection launch", "A softer sell", "The seasonal edit"]),
];
