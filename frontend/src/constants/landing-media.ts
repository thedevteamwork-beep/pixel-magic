import desertPoster from "@/assets/images/landing/desert.jpg";
import portraitPoster from "@/assets/images/landing/portrait.jpg";
import productPoster from "@/assets/images/landing/product.jpg";
import oceanPoster from "@/assets/images/landing/ocean.jpg";
import flowersPoster from "@/assets/images/landing/flowers.jpg";
import architecturePoster from "@/assets/images/landing/architecture.jpg";
import sneakersPoster from "@/assets/images/landing/sneakers.jpg";
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
};
