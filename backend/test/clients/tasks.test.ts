import type { CloudTasksClient, protos } from "@google-cloud/tasks";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createCloudTasksQueue,
  createHttpQueue,
  taskName,
} from "../../src/clients/tasks.js";
import { FakeQueue } from "../fakes/tasks.js";
import { makeDeps } from "../helpers/app.js";

const J = "11111111-1111-1111-1111-111111111111";

type Req = protos.google.cloud.tasks.v2.ICreateTaskRequest;
type Stub = Pick<CloudTasksClient, "queuePath" | "taskPath" | "createTask">;

function makeStub(impl: (req: Req) => Promise<unknown> = async () => [{}]) {
  const calls: Req[] = [];
  const stub = {
    queuePath: (p: string, l: string, q: string) =>
      `projects/${p}/locations/${l}/queues/${q}`,
    taskPath: (p: string, l: string, q: string, t: string) =>
      `projects/${p}/locations/${l}/queues/${q}/tasks/${t}`,
    createTask: async (req: Req) => {
      calls.push(req);
      return impl(req);
    },
  } as unknown as Stub;
  return { stub, calls };
}

const cloudConfig = () => ({
  ...makeDeps().deps.config,
  TASKS_MODE: "cloud" as const,
  GCP_PROJECT_ID: "p",
  GCP_REGION: "r",
  TASKS_SERVICE_ACCOUNT: "tasks@p.iam.gserviceaccount.com",
});

describe("taskName", () => {
  it("is stable and differs by suffix", () => {
    expect(taskName("generate", J, "0")).toBe(taskName("generate", J, "0"));
    expect(taskName("generate", J, "0")).not.toBe(
      taskName("generate", J, "r1-5"),
    );
    expect(taskName("generate", J, "0")).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("createCloudTasksQueue", () => {
  it("builds the Cloud Tasks request", async () => {
    const { stub, calls } = makeStub();
    const queue = createCloudTasksQueue(
      cloudConfig(),
      stub as CloudTasksClient,
    );
    await queue.enqueue("finalize", J, "0");
    const args = calls[0]!;
    expect(args.parent).toBe(stub.queuePath("p", "r", "finalization"));
    expect(args.task?.name).toBe(
      stub.taskPath("p", "r", "finalization", taskName("finalize", J, "0")),
    );
    expect(args.task?.httpRequest).toMatchObject({
      httpMethod: "POST",
      url: "https://worker.test/tasks/finalize",
      headers: { "Content-Type": "application/json" },
      oidcToken: {
        serviceAccountEmail: "tasks@p.iam.gserviceaccount.com",
        audience: "https://worker.test",
      },
    });
    const body = args.task?.httpRequest?.body as string;
    expect(JSON.parse(Buffer.from(body, "base64").toString())).toEqual({
      jobId: J,
    });
    expect(args.task?.dispatchDeadline).toEqual({ seconds: 900 });
  });

  it("uses the generation queue and a 60 s deadline for generate", async () => {
    const { stub, calls } = makeStub();
    await createCloudTasksQueue(
      cloudConfig(),
      stub as CloudTasksClient,
    ).enqueue("generate", J, "0");
    expect(calls[0]!.parent).toBe(stub.queuePath("p", "r", "generation"));
    expect(calls[0]!.task?.dispatchDeadline).toEqual({ seconds: 60 });
  });

  it("treats ALREADY_EXISTS as success and rethrows other errors", async () => {
    const dup = makeStub(async () => {
      throw Object.assign(new Error("exists"), { code: 6 });
    });
    await expect(
      createCloudTasksQueue(
        cloudConfig(),
        dup.stub as CloudTasksClient,
      ).enqueue("generate", J, "0"),
    ).resolves.toBeUndefined();

    const bad = makeStub(async () => {
      throw Object.assign(new Error("unavailable"), { code: 14 });
    });
    await expect(
      createCloudTasksQueue(
        cloudConfig(),
        bad.stub as CloudTasksClient,
      ).enqueue("generate", J, "0"),
    ).rejects.toThrow("unavailable");
  });
});

describe("createHttpQueue", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("POSTs to the worker once per name without awaiting", async () => {
    const { deps } = makeDeps();
    const fetchMock = vi.fn(async () => new Response("ok"));
    vi.stubGlobal("fetch", fetchMock);
    const queue = createHttpQueue(deps.config, deps.logger);
    await queue.enqueue("generate", J, "0");
    await queue.enqueue("generate", J, "0");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://worker.test/tasks/generate");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ jobId: J });
  });

  it("logs a warning when the POST fails", async () => {
    const { deps, logs } = makeDeps();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("down");
      }),
    );
    await createHttpQueue(deps.config, deps.logger).enqueue("finalize", J, "0");
    await vi.waitFor(() =>
      expect(logs.some((l) => l.level === "warn")).toBe(true),
    );
  });
});

describe("FakeQueue", () => {
  it("drops a duplicate name", async () => {
    const q = new FakeQueue();
    await q.enqueue("generate", J, "0");
    await q.enqueue("generate", J, "0");
    await q.enqueue("generate", J, "1");
    expect(q.tasks).toHaveLength(2);
  });

  it("fails the next enqueue", async () => {
    const q = new FakeQueue();
    q.failNext();
    await expect(q.enqueue("generate", J, "0")).rejects.toThrow();
    await q.enqueue("generate", J, "0");
    expect(q.tasks).toHaveLength(1);
  });
});
