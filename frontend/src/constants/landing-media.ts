import desertPoster from "@/assets/images/landing/desert.jpg";
import portraitPoster from "@/assets/images/landing/portrait.jpg";
import productPoster from "@/assets/images/landing/product.jpg";
import oceanPoster from "@/assets/images/landing/ocean.jpg";
import flowersPoster from "@/assets/images/landing/flowers.jpg";
import architecturePoster from "@/assets/images/landing/architecture.jpg";
import sneakersPoster from "@/assets/images/landing/sneakers.jpg";
import templateGhibli from "@/assets/images/landing/template-ghibli-v2.jpg";
import templateGhibliDuo from "@/assets/images/landing/template-ghibli-duo.jpg";
import templateGhibliSky from "@/assets/images/landing/template-ghibli-sky-v2.jpg";
import templateManRef from "@/assets/images/landing/template-man-reference.jpg";
import templateWomanRef from "@/assets/images/landing/template-woman-reference.jpg";
import templateJaipur from "@/assets/images/landing/template-jaipur-v2.jpg";
import templateProductHero from "@/assets/images/landing/template-product-campaign.jpg";
import templateProductRef from "@/assets/images/landing/template-product-reference.jpg";
import templateFashionAfterdark from "@/assets/images/landing/template-fashion-afterdark-v2.jpg";
import templateFashionResort from "@/assets/images/landing/template-fashion-resort-v2.jpg";
import templateFashionCrimson from "@/assets/images/landing/template-fashion-crimson-v2.jpg";
import templateFashionChrome from "@/assets/images/landing/template-fashion-chrome-v2.jpg";
import templateMakeupSoftglam from "@/assets/images/landing/template-makeup-softglam-v2.jpg";
import templateRooftopAfterglow from "@/assets/images/landing/template-rooftop-afterglow.jpg";
import templateAfterdarkRef from "@/assets/images/landing/template-afterdark-reference.jpg";
import templateResortRef from "@/assets/images/landing/template-resort-reference.jpg";
import templateCrimsonRef from "@/assets/images/landing/template-crimson-reference.jpg";
import templateChromeRef from "@/assets/images/landing/template-chrome-reference.jpg";
import templateMakeupBlackRef from "@/assets/images/landing/template-makeup-reference-black.jpg";
import templateChestupEditorial from "@/assets/images/landing/template-chestup-editorial.jpg";
import templatePlusSize from "@/assets/images/landing/template-plus-size.jpg";
import templateGhibliSaree from "@/assets/images/landing/template-ghibli-saree.jpg";
import templateCollectibleFigure from "@/assets/images/landing/template-collectible-figure.jpg";
import templateBridalEditorial from "@/assets/images/landing/template-bridal-editorial.jpg";
import templateSwimwearCampaign from "@/assets/images/landing/template-swimwear-campaign.jpg";
import type { LandingAsset, MediaId } from "@/types/landing";

/** Clips are served from `public/`; images are bundled from `src/assets/images/landing`. */
const base = "/media/landing";

/** Local posters and compressed previews. Replace assets here. */
export const landingAssets: Record<MediaId, LandingAsset> = {
  desert: {
    image: desertPoster.src,
    video: `${base}/desert.mp4`,
    alt: "A car crossing a vast, cinematic desert landscape",
  },
  portrait: {
    image: portraitPoster.src,
    video: `${base}/portrait.mp4`,
    alt: "An expressive portrait illuminated by colorful neon light",
  },
  product: {
    image: productPoster.src,
    video: `${base}/product.mp4`,
    alt: "A sculptural perfume bottle on a textured stone pedestal",
  },
  ocean: {
    image: oceanPoster.src,
    video: `${base}/ocean.mp4`,
    alt: "An aerial view of turquoise ocean waves meeting the shore",
  },
  flowers: { image: flowersPoster.src, alt: "Soft pink roses photographed in close detail" },
  architecture: { image: architecturePoster.src, alt: "Sculptural concrete architecture with geometric lines" },
  sneakers: {
    image: sneakersPoster.src,
    alt: "A pair of orange and white sneakers in a textured product composition",
  },
  templateGhibli: { image: templateGhibli.src, alt: "Hand-painted fantasy animation portrait in a glowing forest" },
  templateGhibliDuo: { image: templateGhibliDuo.src, alt: "Two friends in a hand-painted fantasy forest" },
  templateGhibliSky: { image: templateGhibliSky.src, alt: "A dark-haired traveler flying above a magical seaside town" },
  templateManRef: { image: templateManRef.src, alt: "Male portrait reference for a personalized Jaipur travel photo" },
  templateWomanRef: { image: templateWomanRef.src, alt: "Portrait reference of a dark-haired woman for a fantasy adventure" },
  templateJaipur: { image: templateJaipur.src, alt: "Photorealistic portrait of a man in front of Jaipur's Hawa Mahal" },
  templateProductHero: { image: templateProductHero.src, alt: "Premium serum bottle in a luxury clean-beauty campaign" },
  templateProductRef: { image: templateProductRef.src, alt: "Neutral product reference photo of an amber serum bottle" },
  templateFashionAfterdark: { image: templateFashionAfterdark.src, alt: "Black satin evening fashion portrait on a city rooftop", objectPosition: "center 12%" },
  templateFashionResort: { image: templateFashionResort.src, alt: "Elegant teal resort fashion portrait at sunset", objectPosition: "center 12%" },
  templateFashionCrimson: { image: templateFashionCrimson.src, alt: "Crimson evening gown in a dramatic hotel corridor", objectPosition: "center 12%" },
  templateFashionChrome: { image: templateFashionChrome.src, alt: "Futuristic silver fashion editorial portrait" },
  templateMakeupSoftglam: { image: templateMakeupSoftglam.src, alt: "Soft glam makeup transformation with bronze eyes and rose gloss" },
  templateRooftopAfterglow: {
    image: templateRooftopAfterglow.src,
    alt: "South Asian fashion model in a coral silk blouse at sunset",
    objectPosition: "center 12%",
  },
  templateAfterdarkRef: { image: templateAfterdarkRef.src, alt: "Portrait reference of an adult Black woman with natural coils" },
  templateResortRef: { image: templateResortRef.src, alt: "Portrait reference of an adult East Asian woman with a black bob" },
  templateCrimsonRef: { image: templateCrimsonRef.src, alt: "Portrait reference of an adult South Asian woman with dark waves" },
  templateChromeRef: { image: templateChromeRef.src, alt: "Portrait reference of an adult red-haired woman with freckles" },
  templateMakeupBlackRef: { image: templateMakeupBlackRef.src, alt: "Bare-face portrait reference of an adult Black woman with braids" },
  templateChestupEditorial: {
    image: templateChestupEditorial.src,
    alt: "Chest-up rooftop fashion portrait in an emerald satin neckline",
    objectPosition: "center 30%",
  },
  templatePlusSize: {
    image: templatePlusSize.src,
    alt: "Plus-size East Asian woman in a cobalt satin fashion portrait at golden hour",
    objectPosition: "center 22%",
  },
  templateGhibliSaree: {
    image: templateGhibliSaree.src,
    alt: "Hand-painted fantasy portrait of an Indian woman in a silk saree",
    objectPosition: "center 18%",
  },
  templateCollectibleFigure: {
    image: templateCollectibleFigure.src,
    alt: "Personalized collectible figure in clear-front premium packaging with accessories",
  },
  templateBridalEditorial: {
    image: templateBridalEditorial.src,
    alt: "Indian bride in an embroidered ruby-red lehenga in a heritage courtyard",
    objectPosition: "center 20%",
  },
  templateSwimwearCampaign: {
    image: templateSwimwearCampaign.src,
    alt: "Adult model wearing a cobalt bikini in a polished resort swimwear campaign",
    objectPosition: "center 18%",
  },
};
