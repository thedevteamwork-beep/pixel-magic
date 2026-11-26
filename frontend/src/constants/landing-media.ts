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
import templateGtaViceCity from "@/assets/images/landing/template-gta-vice-city.jpg";
import templateLoudDrop from "@/assets/images/landing/template-loud-drop.jpg";
import templateOctopusPortrait from "@/assets/images/landing/template-octopus-portrait.jpg";
import templateCeramicsCampaign from "@/assets/images/landing/template-ceramics-campaign.jpg";
import templateCheesePullEditorial from "@/assets/images/landing/template-cheese-pull-editorial.jpg";
import templateCatReference from "@/assets/images/ai-influencer/templates/kitty-realistic.jpg";
import templatePetRoyal from "@/assets/images/landing/template-pet-royal.jpg";
import templateSneakerLaunch from "@/assets/images/landing/template-sneaker-launch.jpg";
import templateTokyoSnowglobe from "@/assets/images/landing/template-tokyo-snowglobe.jpg";
import templateBasketballManga from "@/assets/images/landing/template-basketball-manga.jpg";
import templateIcelandHighlands from "@/assets/images/landing/template-iceland-highlands.jpg";
import templateQuietPark from "@/assets/images/landing/template-quiet-park.jpg";
import templateKoreanMiniSuper from "@/assets/images/landing/template-korean-mini-super.jpg";
import templateTechCouture from "@/assets/images/landing/template-tech-couture.jpg";
import type { StaticImageData } from "next/image";
import type { LandingAsset, MediaId, TemplateMediaId, VideoOnlyAsset, VideoOnlyMediaId } from "@/types/landing";

/** Clips are served from `public/`; images are bundled from `src/assets/images/landing`. */
const base = "/media/landing";

/** A bundled image's link and its shape. */
const bundled = (file: StaticImageData) => ({ image: file.src, aspectRatio: file.width / file.height });

/** Local posters and compressed previews. Replace assets here. */
export const landingAssets: Record<MediaId, LandingAsset> = {
  desert: {
    ...bundled(desertPoster),
    video: `${base}/desert.mp4`,
    alt: "A car crossing a vast, cinematic desert landscape",
  },
  portrait: {
    ...bundled(portraitPoster),
    video: `${base}/portrait.mp4`,
    alt: "An expressive portrait illuminated by colorful neon light",
  },
  product: {
    ...bundled(productPoster),
    video: `${base}/product.mp4`,
    alt: "A sculptural perfume bottle on a textured stone pedestal",
  },
  ocean: {
    ...bundled(oceanPoster),
    video: `${base}/ocean.mp4`,
    alt: "An aerial view of turquoise ocean waves meeting the shore",
  },
  paperWorldFashionFilm: {
    ...bundled(architecturePoster),
    video: "/assets/templates/video/paper-world-fashion-film.mp4",
    alt: "A cinematic fashion chase through a rain-soaked European city",
  },
  paperWorldFashionReference: {
    image: "/assets/templates/video/paper-world-fashion-reference.png",
    aspectRatio: 1086 / 1448,
    alt: "Identity reference image for the Paper world fashion film protagonist",
  },
  manchesterDerbyFilm: {
    image: "https://cdn.pixelbin.io/v2/dummy-cloudname/original/input1/Templates/Videos/manchester-derby/ref3.png?updatedAt=1795531305851",
    aspectRatio: 3 / 2,
    video: "https://cdn.pixelbin.io/v2/dummy-cloudname/original/input1/Templates/Videos/manchester-derby/video.mp4?updatedAt=1795531258451",
    alt: "A cinematic Manchester derby volley beneath Old Trafford floodlights",
  },
  manchesterDerbyCharacter: {
    image: "https://cdn.pixelbin.io/v2/dummy-cloudname/original/input1/Templates/Videos/manchester-derby/ref1.png?updatedAt=1795531280817",
    aspectRatio: 3 / 2,
    alt: "Sultan, Manchester United number 10, character and kit reference sheet",
  },
  manchesterDerbyBall: {
    image: "https://cdn.pixelbin.io/v2/dummy-cloudname/original/input1/Templates/Videos/manchester-derby/ref2.png?updatedAt=1795531291860",
    aspectRatio: 3 / 2,
    alt: "Official match ball design reference",
  },
  manchesterDerbyStadium: {
    image: "https://cdn.pixelbin.io/v2/dummy-cloudname/original/input1/Templates/Videos/manchester-derby/ref3.png?updatedAt=1795531305851",
    aspectRatio: 3 / 2,
    alt: "Old Trafford stadium reference sheet",
  },
  aureliaEscapeFilm: {
    image: "https://cdn.pixelbin.io/v2/dummy-cloudname/original/input1/Templates/Videos/vintage-scene/ref1.png?updatedAt=1795534390287",
    aspectRatio: 3 / 2,
    video: "https://cdn.pixelbin.io/v2/dummy-cloudname/original/input1/Templates/Videos/vintage-scene/video.mp4?updatedAt=1795534338222",
    alt: "Aurelia senses danger in a candlelit medieval room and reaches for her sword",
  },
  aureliaEscapeReference: {
    image: "https://cdn.pixelbin.io/v2/dummy-cloudname/original/input1/Templates/Videos/vintage-scene/ref1.png?updatedAt=1795534390287",
    aspectRatio: 3 / 2,
    alt: "Aurelia character reference",
  },
  forestRescueFilm: {
    image: "https://cdn.pixelbin.io/v2/dummy-cloudname/original/input1/Templates/Videos/forest-view/ref1.png?updatedAt=1795535197063",
    aspectRatio: 3 / 2,
    video: "https://cdn.pixelbin.io/v2/dummy-cloudname/original/input1/Templates/Videos/forest-view/video.mp4?updatedAt=1795535126560",
    alt: "A monkey protects a baby in a lush tropical forest",
  },
  forestRescueReference: {
    image: "https://cdn.pixelbin.io/v2/dummy-cloudname/original/input1/Templates/Videos/forest-view/ref1.png?updatedAt=1795535197063",
    aspectRatio: 3 / 2,
    alt: "Tropical forest rescue scene reference",
  },
  julietteYoYoFilm: {
    image: "https://cdn.pixelbin.io/v2/dummy-cloudname/original/input1/Templates/Videos/anime-girl/ref1.png?updatedAt=1795536619184",
    aspectRatio: 3 / 2,
    video: "https://cdn.pixelbin.io/v2/dummy-cloudname/original/input1/Templates/Videos/anime-girl/video.mp4?updatedAt=1795536483166",
    alt: "Juliette performs high-speed yo-yo tricks in a crimson-lit industrial hall",
  },
  julietteCharacterReference: {
    image: "https://cdn.pixelbin.io/v2/dummy-cloudname/original/input1/Templates/Videos/anime-girl/ref1.png?updatedAt=1795536619184",
    aspectRatio: 3 / 2,
    alt: "Juliette character reference",
  },
  julietteKeyframes: {
    image: "https://cdn.pixelbin.io/v2/dummy-cloudname/original/input1/Templates/Videos/anime-girl/ref2.png?updatedAt=1795536683489",
    aspectRatio: 3 / 2,
    alt: "Sequential cinematic keyframe reference for Juliette's yo-yo performance",
  },
  fairyWorldFilm: {
    image: "https://cdn.pixelbin.io/v2/dummy-cloudname/original/input1/Templates/Videos/fairy-world/ref1.png?updatedAt=1795537704414",
    aspectRatio: 3 / 2,
    video: "https://cdn.pixelbin.io/v2/dummy-cloudname/original/input1/Templates/Videos/fairy-world/video.mp4?updatedAt=1795537646348",
    alt: "A fairy-like girl and a small fox share a quiet moment above an enchanted forest",
  },
  fairyWorldReference: {
    image: "https://cdn.pixelbin.io/v2/dummy-cloudname/original/input1/Templates/Videos/fairy-world/ref1.png?updatedAt=1795537704414",
    aspectRatio: 3 / 2,
    alt: "Fairy girl and fox character reference in an enchanted forest",
  },
  cityVlogFilm: {
    image: "https://cdn.pixelbin.io/v2/dummy-cloudname/original/input1/Templates/Videos/girl-riding-cycle/image.webp?updatedAt=1795534346216",
    aspectRatio: 16 / 9,
    video: "https://cdn.pixelbin.io/v2/dummy-cloudname/original/input1/Templates/Videos/girl-riding-cycle/video.mp4?updatedAt=1795534250403",
    alt: "A one-day city travel vlog: breakfast, metro, rain and a rooftop view at golden hour",
  },
  cityVlogCharacter: {
    image: "https://cdn.pixelbin.io/v2/dummy-cloudname/original/input1/Templates/Videos/girl-riding-cycle/image.webp?updatedAt=1795534346216",
    aspectRatio: 3 / 4,
    alt: "Full-body reference of a young woman in burgundy glasses, a navy graphic T-shirt, gray cargo pants and a plaid backpack",
  },
  sushiBiteFilm: {
    image: "https://cdn.pixelbin.io/v2/dummy-cloudname/original/input1/Templates/Videos/asian-women-eating/image.webp",
    aspectRatio: 16 / 9,
    video: "https://cdn.pixelbin.io/v2/dummy-cloudname/original/input1/Templates/Videos/asian-women-eating/video.mp4",
    alt: "A woman in a green mesh top goes from sour shock to delight over one bite of sushi at a sunlit counter",
  },
  sushiBiteCharacter: {
    image: "https://cdn.pixelbin.io/v2/dummy-cloudname/original/input1/Templates/Videos/asian-women-eating/image.webp",
    aspectRatio: 16 / 9,
    alt: "Close-up and full-body reference of a woman with a high black ponytail, silver collar necklace and green mesh top",
  },
  maskTiktokFilm: {
    image: "https://cdn.pixelbin.io/v2/dummy-cloudname/original/input1/Templates/Videos/tiktok-girl-with-mask/gpt-image-2-1.png",
    aspectRatio: 9 / 16,
    video: "https://cdn.pixelbin.io/v2/dummy-cloudname/original/input1/Templates/Videos/tiktok-girl-with-mask/02178155548441800000000000000000000ffffc0a8712ae47537.mp4",
    alt: "A woman in a white tank puts on a glowing red LED face mask in a warm bathroom and shows off her skin",
  },
  maskTiktokModelA: {
    image: "https://cdn.pixelbin.io/v2/dummy-cloudname/original/input1/Templates/Videos/tiktok-girl-with-mask/gpt-image-2-1.png",
    aspectRatio: 4 / 5,
    alt: "Model reference: a woman with a claw clip holding a glowing LED face mask",
  },
  maskTiktokModelB: {
    image: "https://cdn.pixelbin.io/v2/dummy-cloudname/original/input1/Templates/Videos/tiktok-girl-with-mask/gpt-image-2-1(1).png",
    aspectRatio: 4 / 5,
    alt: "Model reference: a woman with a claw clip tapping her cheek beside a glowing LED face mask",
  },
  maskTiktokMaskA: {
    image: "https://cdn.pixelbin.io/v2/dummy-cloudname/original/input1/Templates/Videos/tiktok-girl-with-mask/gpt-image-2-1(2).png",
    aspectRatio: 4 / 5,
    alt: "Product reference: a glowing red LED face mask on a marble vanity",
  },
  maskTiktokMaskB: {
    image: "https://cdn.pixelbin.io/v2/dummy-cloudname/original/input1/Templates/Videos/tiktok-girl-with-mask/0.png",
    aspectRatio: 4 / 5,
    alt: "Product reference: a glowing red LED face mask among skincare bottles and a candle",
  },
  stadiumCamFilm: {
    image: "https://cdn.pixelbin.io/v2/dummy-cloudname/original/input1/Templates/Videos/stadium-live-girl/0bd0dac4f73598b70f4b87a58e1b0345_1775665887837_b34d590f.jpg",
    aspectRatio: 16 / 9,
    video: "https://cdn.pixelbin.io/v2/dummy-cloudname/original/input1/Templates/Videos/stadium-live-girl/02177864445026500000000000000000000ffffc0a8b51c839c22.mp4",
    alt: "A fan spotted on the stadium big screen vaults the railing and scores a top-corner goal in heels",
  },
  stadiumCamCharacter: {
    image: "https://cdn.pixelbin.io/v2/dummy-cloudname/original/input1/Templates/Videos/stadium-live-girl/0bd0dac4f73598b70f4b87a58e1b0345_1775665887837_b34d590f.jpg",
    aspectRatio: 735 / 900,
    alt: "Identity reference: a dark-haired woman in a white ribbed tank top with arm tattoos",
  },
  mechaWarFilm: {
    image: "https://cdn.pixelbin.io/v2/dummy-cloudname/original/input1/Templates/Videos/dragons-war/0.png",
    aspectRatio: 1672 / 941,
    video: "https://cdn.pixelbin.io/v2/dummy-cloudname/original/input1/Templates/Videos/dragons-war/02177878124737000000000000000000000ffffc0a8845bacc0ad.mp4",
    alt: "A giant mech rises from a crater and opens fire on an alien swarm under a violet storm sky",
  },
  mechaWarBattlefield: {
    image: "https://cdn.pixelbin.io/v2/dummy-cloudname/original/input1/Templates/Videos/dragons-war/0.png",
    aspectRatio: 1672 / 941,
    alt: "Reference: a cracked alien battlefield with glowing green rivers under a violet storm sky",
  },
  mechaWarAlien: {
    image: "https://cdn.pixelbin.io/v2/dummy-cloudname/original/input1/Templates/Videos/dragons-war/1.png",
    aspectRatio: 1,
    alt: "Reference: a spiked green alien predator with glowing veins and an open jaw",
  },
  mechaWarPilot: {
    image: "https://cdn.pixelbin.io/v2/dummy-cloudname/original/input1/Templates/Videos/dragons-war/2.png",
    aspectRatio: 1856 / 2464,
    alt: "Reference: a hamster pilot in a worn armored flight suit and goggles",
  },
  mechaWarMech: {
    image: "https://cdn.pixelbin.io/v2/dummy-cloudname/original/input1/Templates/Videos/dragons-war/3.png",
    aspectRatio: 1,
    alt: "Reference: a black armored war mech with a rotary cannon and a railgun arm",
  },
  flowers: { ...bundled(flowersPoster), alt: "Soft pink roses photographed in close detail" },
  architecture: { ...bundled(architecturePoster), alt: "Sculptural concrete architecture with geometric lines" },
  sneakers: {
    ...bundled(sneakersPoster),
    alt: "A pair of orange and white sneakers in a textured product composition",
  },
  templateGhibli: { ...bundled(templateGhibli), alt: "Hand-painted fantasy animation portrait in a glowing forest" },
  templateGhibliDuo: { ...bundled(templateGhibliDuo), alt: "Two friends in a hand-painted fantasy forest" },
  templateGhibliSky: { ...bundled(templateGhibliSky), alt: "A dark-haired traveler flying above a magical seaside town" },
  templateManRef: { ...bundled(templateManRef), alt: "Male portrait reference for a personalized Jaipur travel photo" },
  templateWomanRef: { ...bundled(templateWomanRef), alt: "Portrait reference of a dark-haired woman for a fantasy adventure" },
  templateJaipur: { ...bundled(templateJaipur), alt: "Photorealistic portrait of a man in front of Jaipur's Hawa Mahal" },
  templateProductHero: { ...bundled(templateProductHero), alt: "Premium serum bottle in a luxury clean-beauty campaign" },
  templateProductRef: { ...bundled(templateProductRef), alt: "Neutral product reference photo of an amber serum bottle" },
  templateFashionAfterdark: { ...bundled(templateFashionAfterdark), alt: "Black satin evening fashion portrait on a city rooftop", objectPosition: "center 12%" },
  templateFashionResort: { ...bundled(templateFashionResort), alt: "Elegant teal resort fashion portrait at sunset", objectPosition: "center 12%" },
  templateFashionCrimson: { ...bundled(templateFashionCrimson), alt: "Crimson evening gown in a dramatic hotel corridor", objectPosition: "center 12%" },
  templateFashionChrome: { ...bundled(templateFashionChrome), alt: "Futuristic silver fashion editorial portrait" },
  templateMakeupSoftglam: { ...bundled(templateMakeupSoftglam), alt: "Soft glam makeup transformation with bronze eyes and rose gloss" },
  templateRooftopAfterglow: {
    ...bundled(templateRooftopAfterglow),
    alt: "South Asian fashion model in a coral silk blouse at sunset",
    objectPosition: "center 12%",
  },
  templateAfterdarkRef: { ...bundled(templateAfterdarkRef), alt: "Portrait reference of an adult Black woman with natural coils" },
  templateResortRef: { ...bundled(templateResortRef), alt: "Portrait reference of an adult East Asian woman with a black bob" },
  templateCrimsonRef: { ...bundled(templateCrimsonRef), alt: "Portrait reference of an adult South Asian woman with dark waves" },
  templateChromeRef: { ...bundled(templateChromeRef), alt: "Portrait reference of an adult red-haired woman with freckles" },
  templateMakeupBlackRef: { ...bundled(templateMakeupBlackRef), alt: "Bare-face portrait reference of an adult Black woman with braids" },
  templateChestupEditorial: {
    ...bundled(templateChestupEditorial),
    alt: "Chest-up rooftop fashion portrait in an emerald satin neckline",
    objectPosition: "center 30%",
  },
  templatePlusSize: {
    ...bundled(templatePlusSize),
    alt: "Plus-size East Asian woman in a cobalt satin fashion portrait at golden hour",
    objectPosition: "center 22%",
  },
  templateGhibliSaree: {
    ...bundled(templateGhibliSaree),
    alt: "Hand-painted fantasy portrait of an Indian woman in a silk saree",
    objectPosition: "center 18%",
  },
  templateCollectibleFigure: {
    ...bundled(templateCollectibleFigure),
    alt: "Personalized collectible figure in clear-front premium packaging with accessories",
  },
  templateBridalEditorial: {
    ...bundled(templateBridalEditorial),
    alt: "Indian bride in an embroidered ruby-red lehenga in a heritage courtyard",
    objectPosition: "center 20%",
  },
  templateSwimwearCampaign: {
    ...bundled(templateSwimwearCampaign),
    alt: "Adult model wearing a cobalt bikini in a polished resort swimwear campaign",
    objectPosition: "center 18%",
  },
  templateGtaViceCity: {
    ...bundled(templateGtaViceCity),
    alt: "Fan-made Vice City cover with a rear-view protagonist overlooking a neon coastal city and lowrider",
    objectPosition: "center 32%",
  },
  templateLoudDrop: {
    ...bundled(templateLoudDrop),
    alt: "Asymmetric cobalt and yellow streetwear poster with a full-body model and oversized drop lettering",
    objectPosition: "center 35%",
  },
  templateOctopusPortrait: {
    ...bundled(templateOctopusPortrait),
    alt: "Bird's-eye underwater scene of an octopus's tentacles spiraling around a tiny diver",
    objectPosition: "center 50%",
  },
  templateCeramicsCampaign: {
    ...bundled(templateCeramicsCampaign),
    alt: "Overhead flat lay of colorful handmade ceramic cups, serving bowl, and shell dish",
    objectPosition: "center 50%",
  },
  templateCheesePullEditorial: {
    ...bundled(templateCheesePullEditorial),
    alt: "Adult fashion model in black cat-eye sunglasses taking a bite of a cheese slice against emerald green",
    objectPosition: "center 32%",
  },
  templateCatReference: {
    ...bundled(templateCatReference),
    alt: "Reference portrait of a fluffy tabby cat wearing a purple patterned scarf",
  },
  templatePetRoyal: {
    ...bundled(templatePetRoyal),
    alt: "Fluffy tabby cat painted as an old-master royal portrait in burgundy velvet",
    objectPosition: "center 35%",
  },
  templateSneakerLaunch: {
    ...bundled(templateSneakerLaunch),
    alt: "White and orange sneaker suspended above wet ground in dramatic blue and orange campaign lighting",
    objectPosition: "center 45%",
  },
  templateTokyoSnowglobe: {
    ...bundled(templateTokyoSnowglobe),
    alt: "Glass snow globe containing a miniature snow-covered Tokyo at night",
    objectPosition: "center 48%",
  },
  templateBasketballManga: {
    ...bundled(templateBasketballManga),
    alt: "Dynamic black-and-white manga illustration of a basketball player dunking with orange accents",
    objectPosition: "center 35%",
  },
  templateIcelandHighlands: {
    ...bundled(templateIcelandHighlands),
    alt: "Wide Icelandic highlands with a winding glacial river, mossy lava hills, waterfall, and sunrise",
    objectPosition: "center 52%",
  },
  templateQuietPark: {
    ...bundled(templateQuietPark),
    alt: "A solitary person on a wooden bench beneath old trees, overlooking a quiet green park and distant hills",
    objectPosition: "center 50%",
  },
  templateKoreanMiniSuper: {
    ...bundled(templateKoreanMiniSuper),
    alt: "A young man with an ice cream outside a Korean neighborhood mini market, captured on 1990s film",
    objectPosition: "center 45%",
  },
  templateTechCouture: {
    ...bundled(templateTechCouture),
    alt: "Electric-pink futuristic couture with liquid-chrome panels inside a mirrored elevator",
    objectPosition: "center 38%",
  },
};

/** Text-to-video templates have a clip but no still image. */
export const videoOnlyAssets: Record<VideoOnlyMediaId, VideoOnlyAsset> = {
  frozenHuntFilm: {
    aspectRatio: 16 / 9,
    video: "https://cdn.pixelbin.io/v2/dummy-cloudname/original/input1/Templates/Videos/frozen-hunt/02177622029673200000000000000000000ffffc0a86cda2455bb.mp4",
    alt: "A rider in antler armor lassos a charging ice beast across a frozen plain at dawn",
  },
  canyonWrathFilm: {
    aspectRatio: 16 / 9,
    video: "https://cdn.pixelbin.io/v2/dummy-cloudname/original/input1/Templates/Videos/canyon-wrath/02177552546884900000000000000000000ffffc0a88f202cefea.mp4",
    alt: "A warrior draws her bow above a canyon where a herd of huge beasts stampedes in golden light",
  },
};

/** The media for a template card: an image asset, or a clip with no still. */
export function templateAsset(id: TemplateMediaId): LandingAsset | VideoOnlyAsset {
  return id in videoOnlyAssets ? videoOnlyAssets[id as VideoOnlyMediaId] : landingAssets[id as MediaId];
}
