import type { MediaId } from "@/types/landing";
import type { MotionPreset, VideoInspiration, VideoModel, VideoResolution, VideoSettings } from "@/types/video-generator";

/**
 * Preview capabilities, centralized for the later provider integration.
 * Credit rates are indicative only; the preview never charges.
 */
export const videoModels: readonly VideoModel[] = [
  {
    id: "seedance_2_5", name: "Seedance 2.5", maker: "ByteDance", symbol: "❋", tag: "Featured",
    description: "Multi-shot storytelling with steady subjects and fluid camera work.",
    durations: [5, 10, 15], resolutions: ["480p", "720p", "1080p"], aspectRatios: ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"],
    endFrame: true, audio: true, creditsPerSecond: { "480p": 4, "720p": 8, "1080p": 16 }, speed: 6,
  },
  {
    id: "kling_2_1", name: "Kling 2.1", maker: "Kuaishou", symbol: "◆",
    description: "Expressive human motion and physically grounded action.",
    durations: [5, 10], resolutions: ["720p", "1080p"], aspectRatios: ["16:9", "9:16", "1:1"],
    endFrame: true, audio: false, creditsPerSecond: { "480p": 6, "720p": 10, "1080p": 20 }, speed: 9,
  },
  {
    id: "veo_3_1", name: "Veo 3.1", maker: "Google", symbol: "✦", tag: "Audio",
    description: "Cinematic realism with native dialogue, ambience and sound effects.",
    durations: [4, 6, 8], resolutions: ["720p", "1080p"], aspectRatios: ["16:9", "9:16"],
    endFrame: false, audio: true, creditsPerSecond: { "480p": 20, "720p": 25, "1080p": 40 }, speed: 8,
  },
  {
    id: "hailuo_02", name: "Hailuo 02", maker: "MiniMax", symbol: "◎",
    description: "Dynamic physics, fast action and dramatic camera moves.",
    durations: [6, 10], resolutions: ["480p", "720p", "1080p"], aspectRatios: ["16:9", "9:16", "1:1"],
    endFrame: false, audio: false, creditsPerSecond: { "480p": 3, "720p": 6, "1080p": 12 }, speed: 5,
  },
  {
    id: "wan_2_5", name: "Wan 2.5", maker: "Alibaba", symbol: "≋", tag: "Fast",
    description: "Quick, affordable drafts for exploring ideas before a final render.",
    durations: [5, 10], resolutions: ["480p", "720p", "1080p"], aspectRatios: ["16:9", "9:16", "1:1", "4:3", "3:4"],
    endFrame: true, audio: true, creditsPerSecond: { "480p": 2, "720p": 4, "1080p": 8 }, speed: 3,
  },
];

export const allVideoAspectRatios = ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"] as const;
export const allVideoResolutions: readonly VideoResolution[] = ["480p", "720p", "1080p"];
export const allVideoDurations = [4, 5, 6, 8, 10, 15] as const;
export const videoCounts = [1, 2, 3, 4] as const;
export const MAX_VIDEO_PROMPT_LENGTH = 2500;
export const MAX_NEGATIVE_PROMPT_LENGTH = 500;
export const MAX_FRAME_BYTES = 20 * 1024 * 1024;
export const FRAME_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const defaultVideoSettings: Readonly<VideoSettings> = {
  model: "seedance_2_5", prompt: "", mode: "text", aspectRatio: "16:9", resolution: "720p", duration: 5, count: 1,
  motion: "auto", motionStrength: 50, audio: false, enhancePrompt: true, seed: null, negativePrompt: "",
};

/** Camera direction appended to the prompt as plain language, so it works across every model. */
export const motionPresets: readonly MotionPreset[] = [
  { id: "auto", name: "Auto", group: "Subtle", asset: "ocean", description: "Let the model choose the camera.", instruction: "" },
  { id: "static", name: "Locked off", group: "Subtle", asset: "product", description: "A still tripod frame; only the subject moves.", instruction: "Static locked-off camera on a tripod; only the subject moves." },
  { id: "handheld", name: "Handheld", group: "Subtle", asset: "portrait", description: "Gentle, documentary-style breathing.", instruction: "Subtle handheld camera with natural, documentary-style micro movement." },
  { id: "dutch", name: "Dutch angle", group: "Subtle", asset: "portrait", description: "A tilted horizon with a little unease.", instruction: "Dutch angle with a tilted horizon, slowly settling." },
  { id: "dolly-in", name: "Dolly in", group: "Camera", asset: "portrait", description: "Glide slowly toward the subject.", instruction: "Slow, smooth dolly-in toward the subject." },
  { id: "dolly-out", name: "Dolly out", group: "Camera", asset: "desert", description: "Pull back to reveal the world.", instruction: "Smooth dolly-out pulling back to reveal the surroundings." },
  { id: "super-dolly", name: "Super dolly", group: "Camera", asset: "product", description: "A fast, dramatic push for emphasis.", instruction: "Fast, dramatic super dolly-in toward the subject.", needsSubject: true },
  { id: "truck-left", name: "Truck left", group: "Camera", asset: "desert", description: "Slide sideways, parallel to the scene.", instruction: "Camera trucks smoothly to the left, parallel to the subject." },
  { id: "truck-right", name: "Truck right", group: "Camera", asset: "ocean", description: "Slide sideways the other way.", instruction: "Camera trucks smoothly to the right, parallel to the subject." },
  { id: "pan-left", name: "Pan left", group: "Camera", asset: "desert", description: "Turn the camera to sweep left.", instruction: "Steady horizontal pan to the left from a fixed point." },
  { id: "pan-right", name: "Pan right", group: "Camera", asset: "ocean", description: "Turn the camera to sweep right.", instruction: "Steady horizontal pan to the right from a fixed point." },
  { id: "tilt-up", name: "Tilt up", group: "Camera", asset: "product", description: "Rise from detail to the full picture.", instruction: "Slow camera tilt upward from a fixed point." },
  { id: "tilt-down", name: "Tilt down", group: "Camera", asset: "desert", description: "Settle from the sky to the subject.", instruction: "Slow camera tilt downward from a fixed point." },
  { id: "crane-up", name: "Crane up", group: "Camera", asset: "desert", description: "Lift high above for a grand reveal.", instruction: "Rising crane shot lifting high above the scene for a grand reveal." },
  { id: "crane-down", name: "Crane down", group: "Camera", asset: "ocean", description: "Descend into the scene.", instruction: "Crane shot descending gracefully into the scene." },
  { id: "orbit", name: "360° orbit", group: "Orbit", asset: "product", description: "Circle all the way around the subject.", instruction: "Smooth 360-degree orbit around the subject, keeping it centered.", needsSubject: true },
  { id: "arc", name: "Arc", group: "Orbit", asset: "portrait", description: "A partial curve around the subject.", instruction: "Gentle arc shot curving partway around the subject.", needsSubject: true },
  { id: "bullet-time", name: "Bullet time", group: "Orbit", asset: "portrait", description: "Time freezes as the camera sweeps around.", instruction: "Bullet-time effect: the moment freezes while the camera sweeps around the subject.", needsSubject: true },
  { id: "crash-zoom", name: "Crash zoom", group: "Dynamic", asset: "portrait", description: "A sudden, punchy push in.", instruction: "Sudden, fast crash zoom into the subject.", needsSubject: true },
  { id: "dolly-zoom", name: "Dolly zoom", group: "Dynamic", asset: "desert", description: "The vertigo effect: background warps, subject holds.", instruction: "Dolly zoom (vertigo effect): the subject stays the same size while the background stretches." },
  { id: "fpv", name: "FPV drone", group: "Dynamic", asset: "ocean", description: "Fast, low, swooping flight.", instruction: "Fast FPV drone flight, swooping low and banking through the scene." },
  { id: "whip-pan", name: "Whip pan", group: "Dynamic", asset: "ocean", description: "A blurred, energetic snap sideways.", instruction: "Quick whip pan with motion blur." },
];

export const motionGroups = ["Subtle", "Camera", "Orbit", "Dynamic"] as const;

export const videoInspirations: readonly VideoInspiration[] = [
  { id: "desert-drive", title: "Somewhere in between", category: "Cinematic", asset: "desert", aspectRatio: "21:9", motion: "crane-up", duration: 10, prompt: "A vintage car crossing terracotta-orange desert dunes at golden hour, a long trail of dust catching the low sun, violet mountains on the horizon, cinematic and quiet." },
  { id: "ocean-aerial", title: "A little out of office", category: "Travel", asset: "ocean", aspectRatio: "16:9", motion: "fpv", duration: 5, prompt: "An aerial flight over turquoise waves rolling onto a sunlit shoreline, white foam patterns, crystal-clear water, bright natural light." },
  { id: "neon-portrait", title: "After the last light", category: "Portrait", asset: "portrait", aspectRatio: "9:16", motion: "dolly-in", duration: 5, prompt: "An adult woman with curly dark hair slowly turns toward the camera and smiles, magenta and cyan neon light washing across her face, deep purple background." },
  { id: "perfume-turn", title: "Objects of affection", category: "Product", asset: "product", aspectRatio: "1:1", motion: "orbit", duration: 5, prompt: "A sculptural glass perfume bottle with amber fragrance on a travertine pedestal, soft olive-leaf shadows drifting across a beige plaster wall, light catching the glass." },
  { id: "tide-loop", title: "The slow hours", category: "Ambient", asset: "ocean", aspectRatio: "9:16", motion: "static", duration: 10, prompt: "Gentle waves washing over smooth sand in a seamless calm loop, soft afternoon light, peaceful and meditative." },
  { id: "dune-reveal", title: "Edge of the map", category: "Landscape", asset: "desert", aspectRatio: "16:9", motion: "dolly-out", duration: 10, prompt: "A lone figure standing on a dune ridge at sunset, the camera pulls back to reveal an endless sea of sand under a peach sky." },
];

/** Sample clips available to the preview; keyed by media id so posters stay in sync. */
export const videoSampleAssets: readonly MediaId[] = ["desert", "ocean", "portrait", "product"];

/** Stage labels shown during a render, by fraction of progress reached. */
export const renderStages: readonly { at: number; label: string }[] = [
  { at: 0, label: "In queue" },
  { at: 0.08, label: "Reading your direction" },
  { at: 0.3, label: "Composing keyframes" },
  { at: 0.62, label: "Rendering motion" },
  { at: 0.88, label: "Final polish" },
];
