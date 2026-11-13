import Image from "next/image";
import { Briefcase, Circle, Dumbbell, Flower2, Shirt, Wine, type LucideIcon } from "lucide-react";
import { swatchFor } from "@/constants/ai-influencer";
import { landingAssets } from "@/constants/landing-media";
import type { InfluencerTraits, TileKind, TraitOption } from "@/types/ai-influencer";
import type { MediaId } from "@/types/landing";
import { BodyArt } from "./BodyArt";
import { HairArt } from "./HairArt";
import styles from "./ArtTile.module.css";

const icons: Record<string, LucideIcon> = { Shirt, Briefcase, Dumbbell, Flower2, Wine, Circle };

/** The picture for one option. Faces and bodies follow the skin, hair and eye choices made so far. */
export function ArtTile({ kind, option, traits }: { kind: TileKind; option: TraitOption; traits: InfluencerTraits }) {
  const skin = swatchFor("skinTone", traits.skinTone) ?? "#c99a6e";
  if (kind === "hair") {
    return (
      <HairArt
        style={option.art ?? option.value}
        skin={skin}
        hair={swatchFor("hairColor", traits.hairColor) ?? "#17120f"}
        eyes={swatchFor("eyeColor", traits.eyeColor) ?? "#5a3a22"}
      />
    );
  }
  if (kind === "body") return <BodyArt build={option.value} skin={skin} />;
  if (kind === "photo") {
    const asset = landingAssets[(option.art ?? "product") as MediaId];
    return <Image src={asset.image} alt="" fill sizes="110px" className={styles.photo} />;
  }
  const Icon = icons[option.art ?? "Circle"] ?? Circle;
  return <Icon size={30} strokeWidth={1.4} aria-hidden="true" />;
}
