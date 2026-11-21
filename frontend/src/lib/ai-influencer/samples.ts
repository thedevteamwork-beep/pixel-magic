import {
  ANIMAL_SPECIES,
  archetypes,
  characterImages,
  DEFAULT_ASPECT_RATIO,
  PROJECT_TYPE,
} from "@/components/ai-influencer/constants";
import type { ProjectView } from "@/lib/api/types";
import type { InfluencerTraits, InfluencerVariation } from "@/types/ai-influencer";
import { projectData } from "./projects";
import { displayName, seedFrom } from "./prompt";

/** The templates with a human influencer, for sample portraits of human characters. */
const HUMAN_TEMPLATE_IDS = ["fashion", "fitness", "travel", "beauty", "streetwear", "luxury"];
const humanTemplates = archetypes.filter((archetype) => HUMAN_TEMPLATE_IDS.includes(archetype.id));

/**
 * A stand-in portrait for USE_SAMPLE_PORTRAITS, from the app's own pictures: the template's when the influencer came
 * from one, else the animal character's, else a human template picked from the traits (the same traits, the same
 * picture).
 */
export function samplePortrait(
  traits: InfluencerTraits,
  archetypeId: string | null,
  aspectRatio: string,
): InfluencerVariation {
  const template = archetypes.find((archetype) => archetype.id === archetypeId);
  const animal = ANIMAL_SPECIES[traits.character] !== undefined ? characterImages[traits.character] : undefined;
  const human = humanTemplates[seedFrom(JSON.stringify(traits)) % humanTemplates.length];
  const picture = template?.asset ?? animal ?? human.asset;
  return {
    id: `sample-${Date.now()}`,
    url: picture.src,
    alt: `${displayName(traits)} sample portrait`,
    aspectRatio,
    sample: true,
  };
}

const SAMPLE_ID_PREFIX = "sample-";
/** When the sample History's newest influencer was "saved"; each older one an hour before the last. */
const SAMPLE_SAVED_AT = Date.parse("2026-11-21T12:00:00.000Z");
const HOUR_MS = 3_600_000;

/** A sample influencer (shown while USE_SAMPLE_PORTRAITS is on), not a saved one: it has no backend project. */
export function isSampleProject(projectId: string): boolean {
  return projectId.startsWith(SAMPLE_ID_PREFIX);
}

/** The sample History: one influencer per template, its picture as the cover, newest first. */
export function sampleProjects(): ProjectView[] {
  return archetypes.map((archetype, index) => {
    const savedAt = new Date(SAMPLE_SAVED_AT - index * HOUR_MS).toISOString();
    return {
      projectId: `${SAMPLE_ID_PREFIX}${archetype.id}`,
      type: PROJECT_TYPE,
      title: archetype.title,
      data: { traits: archetype.traits, archetypeId: archetype.id, aspectRatio: DEFAULT_ASPECT_RATIO },
      cover: { mimeType: "image/jpeg", url: archetype.asset.src, expiresAt: "" },
      upload: null,
      createdAt: savedAt,
      updatedAt: savedAt,
    };
  });
}

/** A sample Generate "saved" as an influencer, its portrait as the cover, like the backend would save a real one. */
export function sampleProject(
  projectId: string,
  traits: InfluencerTraits,
  archetypeId: string | null,
  portrait: InfluencerVariation,
): ProjectView {
  const now = new Date().toISOString();
  return {
    projectId,
    type: PROJECT_TYPE,
    title: displayName(traits),
    data: { ...projectData(traits, archetypeId, { aspectRatio: portrait.aspectRatio }) },
    cover: { mimeType: "image/jpeg", url: portrait.url, expiresAt: "" },
    upload: null,
    createdAt: now,
    updatedAt: now,
  };
}

/** A new id for a sample influencer. */
export function newSampleProjectId(): string {
  return `${SAMPLE_ID_PREFIX}${Date.now()}`;
}
