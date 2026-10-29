import type { MediaId, TemplateFilters } from "@/types/landing";

export type CreativeTool = {
  id: string;
  name: string;
  description: string;
  label: string;
  headline: readonly [string, string];
  artwork: "collage" | "motion" | "product" | "character";
  tone: "paper" | "forest" | "dark" | "plum" | "peach" | "sage";
  assets: readonly MediaId[];
  href: "#templates" | "#gpt-image-2" | "#marketing";
  filters?: TemplateFilters;
};

export const creativeTools = [
  {
    id: "image",
    name: "Image generator",
    description: "A thought, a reference, a whole new visual.",
    label: "Your image studio",
    headline: ["Dream it.", "See it."],
    artwork: "collage",
    tone: "paper",
    assets: ["architecture", "flowers", "product"],
    href: "#gpt-image-2",
  },
  {
    id: "video",
    name: "Video generator",
    description: "Give your next idea its first frame.",
    label: "The motion edit",
    headline: ["Make it", "move."],
    artwork: "motion",
    tone: "forest",
    assets: ["desert"],
    href: "#templates",
    filters: { category: "video", model: "all" },
  },
  {
    id: "seedance",
    name: "Seedance 2.0",
    description: "Take a still. Tell a different story.",
    label: "Seedance 2.0",
    headline: ["One frame.", "A whole story."],
    artwork: "motion",
    tone: "forest",
    assets: ["ocean"],
    href: "#templates",
    filters: { category: "video", model: "Seedance 2.0" },
  },
  {
    id: "kling",
    name: "Kling 4.0",
    description: "Start directing your next cinematic idea.",
    label: "Kling 4.0",
    headline: ["Direct the", "unexpected."],
    artwork: "motion",
    tone: "dark",
    assets: ["portrait"],
    href: "#templates",
    filters: { category: "video", model: "Kling 4.0" },
  },
  {
    id: "marketing",
    name: "Marketing Studio",
    description: "From product photo to campaign direction.",
    label: "Marketing Studio",
    headline: ["From product", "to obsession."],
    artwork: "product",
    tone: "plum",
    assets: ["product"],
    href: "#marketing",
  },
  {
    id: "character",
    name: "Character lab",
    description: "Same person. A whole new point of view.",
    label: "The character edit",
    headline: ["Meet your", "next self."],
    artwork: "character",
    tone: "peach",
    assets: ["portrait", "portrait"],
    href: "#templates",
    filters: { category: "portraits", model: "all" },
  },
  {
    id: "gpt",
    name: "GPT Image 2",
    description: "Find a look that could only be yours.",
    label: "GPT Image 2",
    headline: ["Every pixel.", "Your vision."],
    artwork: "collage",
    tone: "sage",
    assets: ["sneakers", "architecture", "flowers"],
    href: "#gpt-image-2",
  },
] as const satisfies readonly CreativeTool[];
