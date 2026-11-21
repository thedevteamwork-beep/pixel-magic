import { describe, expect, it } from "vitest";
import { ApiError, type ApiClient } from "@/lib/api/client";
import type { ProjectView } from "@/lib/api/types";
import {
  getStyleReference,
  listStyleReferences,
  restoreStyle,
  saveStyleReference,
  styleForGenerate,
  styleFromProject,
} from "./styles";

function styleProject(id: string, title: string, upload: ProjectView["upload"]): ProjectView {
  return {
    projectId: id,
    type: "influencer-style",
    title,
    data: upload ? { uploadId: upload.uploadId } : {},
    cover: null,
    upload,
    createdAt: "2026-11-20T00:00:00.000Z",
    updatedAt: "2026-11-20T00:00:00.000Z",
  };
}

const image = (uploadId: string) => ({
  uploadId,
  mimeType: "image/png",
  url: `https://storage.test/inputs/${uploadId}?mode=read`,
  expiresAt: "2026-11-21T00:00:00.000Z",
});

/** Answers every request with `reply` and records what was asked. */
function fakeApi(reply: unknown): { api: ApiClient; calls: { method: string; path: string; body?: unknown }[] } {
  const calls: { method: string; path: string; body?: unknown }[] = [];
  const answer = (method: string) => async (path: string, body?: unknown) => {
    calls.push({ method, path, body });
    return reply as never;
  };
  const api: ApiClient = {
    get: (path) => answer("GET")(path),
    post: (path, body) => answer("POST")(path, body),
    patch: (path, body) => answer("PATCH")(path, body),
    delete: (path) => answer("DELETE")(path),
  };
  return { api, calls };
}

describe("styleFromProject", () => {
  it("names the style after the project and uses its signed image", () => {
    expect(styleFromProject(styleProject("p1", "Pink street", image("u1")))).toEqual({
      id: "p1",
      name: "Pink street",
      uploadId: "u1",
      url: "https://storage.test/inputs/u1?mode=read",
    });
  });

  it("is null when the project has no image", () => {
    expect(styleFromProject(styleProject("p1", "Gone", null))).toBeNull();
  });
});

describe("listStyleReferences", () => {
  it("asks for the style projects and skips any without an image", async () => {
    const { api, calls } = fakeApi({
      projects: [styleProject("p2", "Black tie", image("u2")), styleProject("p1", "Gone", null)],
      nextCursor: null,
    });
    const styles = await listStyleReferences(api);
    expect(calls).toEqual([{ method: "GET", path: "/v1/projects?type=influencer-style&limit=50" }]);
    expect(styles.map((style) => style.name)).toEqual(["Black tie"]);
  });
});

describe("saveStyleReference", () => {
  it("creates a style project named after the style, holding the upload", async () => {
    const { api, calls } = fakeApi(styleProject("p3", "Boho", image("u3")));
    const style = await saveStyleReference(api, "Boho", "u3");
    expect(calls).toEqual([
      {
        method: "POST",
        path: "/v1/projects",
        body: { type: "influencer-style", title: "Boho", data: { uploadId: "u3" } },
      },
    ]);
    expect(style.id).toBe("p3");
    expect(style.url).toContain("u3");
  });
});

describe("getStyleReference", () => {
  it("loads one saved style by its encoded id", async () => {
    const { api, calls } = fakeApi(styleProject("st/1", "Pink street", image("up1")));
    const style = await getStyleReference(api, "st/1");
    expect(calls).toEqual([{ method: "GET", path: "/v1/projects/st%2F1", body: undefined }]);
    expect(style).toEqual({ id: "st/1", name: "Pink street", uploadId: "up1", url: image("up1").url });
  });

  it("gives null for a style whose image is gone", async () => {
    const { api } = fakeApi(styleProject("st1", "Old", null));
    expect(await getStyleReference(api, "st1")).toBeNull();
  });
});

/** An API whose GET fails with `error`. */
function failingApi(error: unknown): ApiClient {
  const fail = async (): Promise<never> => {
    throw error;
  };
  return { get: fail, post: fail, patch: fail, delete: fail };
}

describe("restoreStyle", () => {
  it("restores a saved style that still exists", async () => {
    const { api } = fakeApi(styleProject("st1", "Pink street", image("up1")));
    expect(await restoreStyle(api, "st1")).toEqual({
      style: { id: "st1", name: "Pink street", uploadId: "up1", url: image("up1").url },
      gone: false,
    });
  });

  it("calls a deleted style, or one without its image, gone", async () => {
    expect(await restoreStyle(failingApi(new ApiError(404, "NOT_FOUND", "Project not found")), "st1")).toEqual({
      style: null,
      gone: true,
    });
    expect(await restoreStyle(fakeApi(styleProject("st1", "Old", null)).api, "st1")).toEqual({
      style: null,
      gone: true,
    });
  });

  it("keeps a style that only failed to load", async () => {
    expect(await restoreStyle(failingApi(new ApiError(503, "UNAVAILABLE", "Try again")), "st1")).toEqual({
      style: null,
      gone: false,
    });
    expect(await restoreStyle(failingApi(new TypeError("Failed to fetch")), "st1")).toEqual({
      style: null,
      gone: false,
    });
  });
});

describe("styleForGenerate", () => {
  const picked = { id: "st2", name: "Beach", uploadId: "up2", url: "https://x/up2" };
  const restored = { id: "st1", name: "Pink street", uploadId: "up1", url: "https://x/up1" };

  it("uses the style the user picked", () => {
    expect(styleForGenerate(picked, null)).toEqual({ style: picked, styleId: "st2" });
  });

  it("uses no style when none is picked or loading", () => {
    expect(styleForGenerate(null, null)).toEqual({ style: null, styleId: undefined });
  });

  it("uses the saved style once it has loaded", () => {
    expect(styleForGenerate(null, { id: "st1", result: { style: restored, gone: false } })).toEqual({
      style: restored,
      styleId: "st1",
    });
  });

  it("drops a saved style only when it is gone", () => {
    expect(styleForGenerate(null, { id: "st1", result: { style: null, gone: true } })).toEqual({
      style: null,
      styleId: undefined,
    });
  });

  it("keeps saving a style that failed to load, without sending its image", () => {
    expect(styleForGenerate(null, { id: "st1", result: { style: null, gone: false } })).toEqual({
      style: null,
      styleId: "st1",
    });
  });
});
