import { Media } from "@/ui/Media";
import { Briefcase, Circle, Dumbbell, Flower2, Shirt, Wine, type LucideIcon } from "lucide-react";
import { buildImages, characterImages, hairImages } from "@/components/ai-influencer/constants";
import { landingAssets } from "@/constants/landing-media";
import type { TileKind, TraitOption } from "@/types/ai-influencer";
import type { MediaId } from "@/types/landing";
import outfitStreetwear from "@/assets/images/ai-influencer/outfit/streetwear.jpg";
import outfitTailored from "@/assets/images/ai-influencer/outfit/tailored.jpg";
import outfitAthleisure from "@/assets/images/ai-influencer/outfit/athleisure.jpg";
import outfitBoho from "@/assets/images/ai-influencer/outfit/boho.jpg";
import outfitEveningWear from "@/assets/images/ai-influencer/outfit/evening-wear.jpg";
import outfitMinimalBasics from "@/assets/images/ai-influencer/outfit/minimal-basics.jpg";
import settingStudio from "@/assets/images/ai-influencer/setting/studio.jpg";
import settingCityStreet from "@/assets/images/ai-influencer/setting/city-street.jpg";
import settingBeach from "@/assets/images/ai-influencer/setting/beach.jpg";
import settingCafe from "@/assets/images/ai-influencer/setting/cafe.jpg";
import settingGym from "@/assets/images/ai-influencer/setting/gym.jpg";
import settingRooftop from "@/assets/images/ai-influencer/setting/rooftop.jpg";

const icons: Record<string, LucideIcon> = { Shirt, Briefcase, Dumbbell, Flower2, Wine, Circle };
const traitPhotos = {
  "outfit-streetwear": outfitStreetwear,
  "outfit-tailored": outfitTailored,
  "outfit-athleisure": outfitAthleisure,
  "outfit-boho": outfitBoho,
  "outfit-evening-wear": outfitEveningWear,
  "outfit-minimal-basics": outfitMinimalBasics,
  "setting-studio": settingStudio,
  "setting-city-street": settingCityStreet,
  "setting-beach": settingBeach,
  "setting-cafe": settingCafe,
  "setting-gym": settingGym,
  "setting-rooftop": settingRooftop,
} as const;

/** The picture for one option: an illustration from `assets/images/ai-influencer`, a sample photo, or an icon. */
export function ArtTile({ kind, option }: { kind: TileKind; option: TraitOption }) {
  if (kind === "character" || kind === "hair" || kind === "body") {
    const images = { character: characterImages, hair: hairImages, body: buildImages }[kind];
    const image = images[kind === "hair" ? (option.art ?? option.value) : option.value];
    if (!image) return null;
    return <Media media={{ kind: "image", src: image.src, alt: "" }} fill sizes="110px" plain />;
  }
  if (kind === "photo") {
    const traitPhoto = traitPhotos[option.art as keyof typeof traitPhotos];
    if (traitPhoto) return <Media media={{ kind: "image", src: traitPhoto.src, alt: "" }} fill sizes="110px" />;
    const asset = landingAssets[(option.art ?? "product") as MediaId];
    return <Media media={{ kind: "image", src: asset.image, alt: "" }} fill sizes="110px" />;
  }
  const Icon = icons[option.art ?? "Circle"] ?? Circle;
  return <Icon size={30} strokeWidth={1.4} aria-hidden="true" />;
}
