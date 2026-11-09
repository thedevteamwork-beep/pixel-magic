import type { LandingAsset, MediaId } from "@/types/landing";

const base = "/media/landing";

/** Local posters and compressed previews. Replace asset paths here. */
export const landingAssets: Record<MediaId, LandingAsset> = {
  desert: { image: `${base}/desert.jpg`, video: `${base}/desert.mp4`, alt: "A car crossing a vast, cinematic desert landscape" },
  portrait: { image: `${base}/portrait.jpg`, video: `${base}/portrait.mp4`, alt: "An expressive portrait illuminated by colorful neon light" },
  product: { image: `${base}/product.jpg`, video: `${base}/product.mp4`, alt: "A sculptural perfume bottle on a textured stone pedestal" },
  ocean: { image: `${base}/ocean.jpg`, video: `${base}/ocean.mp4`, alt: "An aerial view of turquoise ocean waves meeting the shore" },
  flowers: { image: `${base}/flowers.jpg`, alt: "Soft pink roses photographed in close detail" },
  architecture: { image: `${base}/architecture.jpg`, alt: "Sculptural concrete architecture with geometric lines" },
  sneakers: { image: `${base}/sneakers.jpg`, alt: "A pair of orange and white sneakers in a textured product composition" },
};
