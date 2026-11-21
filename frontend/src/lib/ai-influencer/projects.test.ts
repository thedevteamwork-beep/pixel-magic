import { describe, expect, it } from "vitest";
import { defaultTraits } from "@/components/ai-influencer/constants";
import { ApiError, type ApiClient } from "@/lib/api/client";
import type { PublicModel, ProjectView } from "@/lib/api/types";
import { fluxSchnell, jobView, kling21 } from "@/lib/generate/fixtures";
import { portraitStyle } from "./portrait";
import {
  archetypeFromProject,
  aspectRatioFromProject,
  aspectRatios,
  catchDeletedProject,
  createInfluencerJob,
  createInfluencerProject,
  deleteInfluencerProject,
  getInfluencerProject,
  influencerImageModels,
  influencerInput,
  influencerModel,
  listInfluencerProjects,
  listProjectJobs,
  photoFromProject,
  pickAspectRatio,
  ProjectDeletedError,
  projectData,
  styleIdFromProject,
  traitsFromProject,
  updateInfluencerProject,
  usedReferences,
  variationsFromJobs,
} from "./projects";
import { composeInfluencerPrompt } from "./prompt";

type Call = { method: string; path: string; body?: unknown; opts?: unknown };

function fakeApi(): { api: ApiClient; calls: Call[] } {
  const calls: Call[] = [];
  const record =
    (method: string) =>
    async (path: string, body?: unknown, opts?: unknown): Promise<never> => {
      calls.push({ method, path, body, opts });
      return undefined as never;
    };
  const api: ApiClient = {
    get: (path) => record("GET")(path),
    post: (path, body, opts) => record("POST")(path, body, opts),
    patch: (path, body) => record("PATCH")(path, body),
    delete: (path) => record("DELETE")(path),
  };
  return { api, calls };
}

const view = (title: string, data: Record<string, unknown>): ProjectView => ({
  projectId: "p1",
  type: "ai-influencer",
  title,
  data,
  cover: null,
  upload: null,
  createdAt: "",
  updatedAt: "",
});

describe("projectData", () => {
  it("keeps only non-empty traits and a non-blank extra", () => {
    const data = projectData({ ...defaultTraits, name: "Mira", hairColor: "", extra: " " }, null);
    expect(data).toEqual({ traits: { gender: "woman", age: "late-20s" } });
  });

  it("includes extra and archetypeId when set", () => {
    const data = projectData({ ...defaultTraits, extra: "freckles" }, "fashion");
    expect(data).toEqual({ traits: { gender: "woman", age: "late-20s" }, extra: "freckles", archetypeId: "fashion" });
  });
});

describe("traitsFromProject", () => {
  it("starts every trait empty and fills from the saved data", () => {
    const traits = traitsFromProject(view("Mira", { traits: { hairColor: "black" }, extra: "x" }));
    expect(traits.name).toBe("Mira");
    expect(traits.hairColor).toBe("black");
    expect(traits.extra).toBe("x");
    expect(traits.gender).toBe("");
  });

  it("ignores unknown keys and non-string values", () => {
    const traits = traitsFromProject(view("Mira", { traits: { hairColor: 5, bogus: "y", age: "30s" }, extra: 3 }));
    expect(traits.hairColor).toBe("");
    expect(traits.age).toBe("30s");
    expect(traits).not.toHaveProperty("bogus");
    expect(traits.extra).toBe("");
  });

  it("copes with missing or malformed data", () => {
    expect(traitsFromProject(view("A", { traits: "nope" })).gender).toBe("");
    expect(traitsFromProject(view("A", {})).gender).toBe("");
  });
});

describe("archetypeFromProject", () => {
  it("returns the saved archetype id", () => {
    expect(archetypeFromProject(view("A", { archetypeId: "fashion" }))).toBe("fashion");
  });

  it("returns null when it is missing or not a string", () => {
    expect(archetypeFromProject(view("A", {}))).toBeNull();
    expect(archetypeFromProject(view("A", { archetypeId: 7 }))).toBeNull();
  });
});

describe("variationsFromJobs", () => {
  it("keeps completed outputs with a url, in order", () => {
    const jobs = [
      jobView("completed", {
        jobId: "a",
        outputs: [
          { index: 0, mimeType: "image/png", url: "u0" },
          { index: 1, mimeType: "image/png" },
          { index: 2, mimeType: "image/png", url: "u2" },
        ],
      }),
      jobView("failed", { jobId: "f", outputs: [{ index: 0, mimeType: "image/png", url: "x" }] }),
      jobView("queued", { jobId: "q" }),
      jobView("completed", { jobId: "b", outputs: [{ index: 0, mimeType: "image/png", url: "b0" }] }),
    ];
    expect(variationsFromJobs(jobs, "Portrait")).toEqual([
      { id: "a-0", url: "u0", alt: "Portrait" },
      { id: "a-2", url: "u2", alt: "Portrait" },
      { id: "b-0", url: "b0", alt: "Portrait" },
    ]);
  });
});

/** Like kling21, but its image field takes up to four images. */
const multiImage: PublicModel = {
  ...kling21,
  input: { ...kling21.input, image: { ...kling21.input.image, maxItems: 4 } } as PublicModel["input"],
};

const NANO_RATIOS = [
  "1:1",
  "2:3",
  "3:2",
  "3:4",
  "4:3",
  "4:5",
  "5:4",
  "9:16",
  "16:9",
  "21:9",
  "4:1",
  "1:4",
  "1:8",
  "8:1",
];

/** Nano Banana 2 as GET /v1/models lists it: up to 14 reference images, an aspect ratio defaulting to 16:9. */
const nanoBanana: PublicModel = {
  ...fluxSchnell,
  key: "nanoBanana2_generate",
  plugin: "nanoBanana2",
  name: "Nano Banana 2",
  input: {
    prompt: { type: "string", description: "", required: true, maxLength: 5000 },
    image: { ...kling21.input.image, maxItems: 14 },
    aspect_ratio: { type: "string", description: "", enum: NANO_RATIOS, default: "16:9" },
    num_images: { type: "integer", description: "", minimum: 1, maximum: 4, default: 1 },
  } as PublicModel["input"],
};

describe("influencerModel", () => {
  it("uses Nano Banana 2 when the backend lists it", () => {
    expect(influencerModel([fluxSchnell, nanoBanana])).toBe(nanoBanana);
  });
  it("falls back to the first image model", () => {
    expect(influencerModel([fluxSchnell])).toBe(fluxSchnell);
    expect(influencerModel([])).toBeUndefined();
  });
});

describe("aspect ratio", () => {
  it("offers the model's own ratios, or none", () => {
    expect(aspectRatios(nanoBanana)).toEqual(NANO_RATIOS);
    expect(aspectRatios(fluxSchnell)).toEqual([]);
    expect(aspectRatios(undefined)).toEqual([]);
  });

  it("keeps an offered ratio and falls back to 4:5 otherwise", () => {
    expect(pickAspectRatio(nanoBanana, "9:16")).toBe("9:16");
    expect(pickAspectRatio(nanoBanana, "7:3")).toBe("4:5");
    expect(pickAspectRatio(nanoBanana, null)).toBe("4:5");
    expect(pickAspectRatio(fluxSchnell, "9:16")).toBe("4:5");
  });

  it("uses the model's default when it doesn't offer 4:5", () => {
    const wide: PublicModel = {
      ...nanoBanana,
      input: {
        ...nanoBanana.input,
        aspect_ratio: { type: "string", description: "", enum: ["1:1", "16:9"], default: "16:9" },
      },
    };
    expect(pickAspectRatio(wide, null)).toBe("16:9");
  });

  it("sends the picked ratio to Nano Banana with four images and both references", () => {
    const traits = { ...defaultTraits, name: "Mira" };
    const input = influencerInput(nanoBanana, traits, { photo: "u1", style: "s1" }, "4:5");
    expect(input.aspect_ratio).toBe("4:5");
    expect(input.num_images).toBe(4);
    expect(input.image).toEqual(["u1", "s1"]);
    expect(influencerInput(nanoBanana, traits, {}, "9:16").aspect_ratio).toBe("9:16");
    expect(influencerInput(nanoBanana, traits, {}, "7:3").aspect_ratio).toBe("4:5");
  });

  it("sends no aspect ratio to a model without one", () => {
    const input = influencerInput(fluxSchnell, { ...defaultTraits, name: "Mira" }, {}, "9:16");
    expect(input).not.toHaveProperty("aspect_ratio");
    expect(input.image_size).toBe("portrait_4_3");
  });

  it("is saved with the project and read back", () => {
    expect(projectData(defaultTraits, null, { aspectRatio: "4:5" }).aspectRatio).toBe("4:5");
    expect(projectData(defaultTraits, null)).not.toHaveProperty("aspectRatio");
    expect(aspectRatioFromProject(view("Mira", { aspectRatio: "9:16" }))).toBe("9:16");
    expect(aspectRatioFromProject(view("Mira", {}))).toBeNull();
    expect(aspectRatioFromProject(view("Mira", { aspectRatio: 3 }))).toBeNull();
  });
});

describe("saved references", () => {
  it("saves the face photo's upload and the picked style with the influencer", () => {
    expect(projectData(defaultTraits, null, { photoUploadId: "up1", styleId: "st1" })).toEqual({
      traits: { gender: "woman", age: "late-20s" },
      photoUploadId: "up1",
      styleId: "st1",
    });
  });

  it("restores the face photo from the project's signed upload", () => {
    const saved = {
      ...view("Mira", { photoUploadId: "up1" }),
      upload: { uploadId: "up1", mimeType: "image/jpeg", url: "https://x/up1", expiresAt: "" },
    };
    expect(photoFromProject(saved)).toEqual({ url: "https://x/up1", name: "Saved photo", uploadId: "up1" });
    expect(photoFromProject(view("Mira", {}))).toBeNull();
  });

  it("reads the picked style's id back", () => {
    expect(styleIdFromProject(view("Mira", { styleId: "st1" }))).toBe("st1");
    expect(styleIdFromProject(view("Mira", {}))).toBeNull();
    expect(styleIdFromProject(view("Mira", { styleId: 4 }))).toBeNull();
  });
});

describe("usedReferences", () => {
  it("sends the photo first, then the style, while the image field has room", () => {
    expect(usedReferences(multiImage, { photo: "u1", style: "s1" })).toEqual({ photo: "u1", style: "s1" });
    expect(usedReferences(kling21, { photo: "u1", style: "s1" })).toEqual({ photo: "u1" });
    expect(usedReferences(kling21, { style: "s1" })).toEqual({ style: "s1" });
  });

  it("sends nothing to a model without an image field", () => {
    expect(usedReferences(fluxSchnell, { photo: "u1", style: "s1" })).toEqual({});
  });
});

describe("influencerInput", () => {
  const traits = { ...defaultTraits, name: "Mira", hairColor: "black" };

  it("asks flux for four portrait images", () => {
    const input = influencerInput(fluxSchnell, traits, {}, "4:5");
    expect(input.image_size).toBe("portrait_4_3");
    expect(input.num_images).toBe(4);
    expect(input.prompt).toBe(composeInfluencerPrompt(traits));
  });

  it("caps num_images at the model maximum and skips an image_size without portrait_4_3", () => {
    const model: PublicModel = {
      ...fluxSchnell,
      input: {
        ...fluxSchnell.input,
        image_size: { type: "string", description: "", enum: ["square"], default: "square" },
        num_images: { type: "integer", description: "", minimum: 1, maximum: 2, default: 1 },
      },
    };
    const input = influencerInput(model, traits, {}, "4:5");
    expect(input.num_images).toBe(2);
    expect(input.image_size).toBe("square");
  });

  it("puts the photo in the image field and prompts with it", () => {
    const input = influencerInput(kling21, traits, { photo: "u1" }, "4:5");
    expect(input.image).toEqual(["u1"]);
    expect(input.prompt).toBe(composeInfluencerPrompt(traits, { photo: true }));
  });

  it("sends the photo and the style together when the model takes both", () => {
    const input = influencerInput(multiImage, traits, { photo: "u1", style: "s1" }, "4:5");
    expect(input.image).toEqual(["u1", "s1"]);
    expect(input.prompt).toBe(composeInfluencerPrompt(traits, { photo: true, style: true }));
  });

  it("keeps only the photo, and prompts for it alone, when the model takes one image", () => {
    const input = influencerInput(kling21, traits, { photo: "u1", style: "s1" }, "4:5");
    expect(input.image).toEqual(["u1"]);
    expect(input.prompt).toBe(composeInfluencerPrompt(traits, { photo: true }));
  });

  it("prompts without a reference when the model has no image field", () => {
    const input = influencerInput(fluxSchnell, traits, { photo: "u1", style: "s1" }, "4:5");
    expect(input.prompt).toBe(composeInfluencerPrompt(traits));
    expect(input.image).toBeUndefined();
  });
});

describe("influencerImageModels", () => {
  it("keeps image models only", () => {
    expect(influencerImageModels([fluxSchnell, kling21])).toEqual([fluxSchnell]);
  });
});

describe("api calls", () => {
  it("creates a project", async () => {
    const { api, calls } = fakeApi();
    await createInfluencerProject(api, "Mira", { traits: { gender: "woman" } });
    expect(calls).toEqual([
      {
        method: "POST",
        path: "/v1/projects",
        body: { type: "ai-influencer", title: "Mira", data: { traits: { gender: "woman" } } },
      },
    ]);
  });

  it("updates, gets and deletes by encoded id", async () => {
    const { api, calls } = fakeApi();
    await updateInfluencerProject(api, "p 1", { title: "New" });
    await getInfluencerProject(api, "p 1");
    await deleteInfluencerProject(api, "p 1");
    expect(calls).toEqual([
      { method: "PATCH", path: "/v1/projects/p%201", body: { title: "New" } },
      { method: "GET", path: "/v1/projects/p%201", body: undefined },
      { method: "DELETE", path: "/v1/projects/p%201", body: undefined },
    ]);
  });

  it("lists projects, with a cursor when given", async () => {
    const { api, calls } = fakeApi();
    await listInfluencerProjects(api);
    await listInfluencerProjects(api, "c1");
    expect(calls.map((call) => call.path)).toEqual([
      "/v1/projects?type=ai-influencer&limit=50",
      "/v1/projects?type=ai-influencer&limit=50&cursor=c1",
    ]);
  });

  it("lists a project's jobs with the id URL-encoded", async () => {
    const { api, calls } = fakeApi();
    await listProjectJobs(api, "p 1");
    expect(calls[0].path).toBe("/v1/jobs?projectId=p%201&limit=20");
  });

  it("creates a job in the project with the idempotency key", async () => {
    const { api, calls } = fakeApi();
    await createInfluencerJob(api, {
      model: fluxSchnell,
      projectId: "p1",
      input: { prompt: "x" },
      idempotencyKey: "k1",
    });
    expect(calls).toEqual([
      {
        method: "POST",
        path: "/v1/jobs/fluxSchnell/generate",
        body: { input: { prompt: "x" }, projectId: "p1" },
        opts: { idempotencyKey: "k1" },
      },
    ]);
  });
});

describe("catchDeletedProject", () => {
  it("passes the result through", async () => {
    await expect(catchDeletedProject("p1", Promise.resolve("ok"))).resolves.toBe("ok");
  });

  it("turns a 404 into ProjectDeletedError for that project", async () => {
    const notFound = new ApiError(404, "NOT_FOUND", "Project not found");
    const error = await catchDeletedProject("p1", Promise.reject(notFound)).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ProjectDeletedError);
    expect(error).toMatchObject({ projectId: "p1", message: "This influencer was deleted. Start a new one." });
  });

  it.each([
    ["a 401", new ApiError(401, "UNAUTHENTICATED", "x")],
    ["a 500", new ApiError(500, "INTERNAL", "x")],
    ["a network error", new ApiError(0, "NETWORK_ERROR", "x")],
    ["a non-API error", new Error("x")],
  ])("rethrows %s unchanged", async (_name, original) => {
    await expect(catchDeletedProject("p1", Promise.reject(original))).rejects.toBe(original);
  });
});

describe("portraitStyle", () => {
  it("returns no style without hue and position", () => {
    expect(portraitStyle({})).toEqual({});
  });
});
