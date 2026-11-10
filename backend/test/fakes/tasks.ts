import {
  taskName,
  type TaskKind,
  type TaskQueue,
} from "../../src/clients/tasks.js";

export class FakeQueue implements TaskQueue {
  tasks: Array<{
    kind: TaskKind;
    jobId: string;
    suffix: string;
    name: string;
  }> = [];
  private failures = 0;

  failNext(times = 1): void {
    this.failures = times;
  }

  async enqueue(kind: TaskKind, jobId: string, suffix: string): Promise<void> {
    if (this.failures > 0) {
      this.failures -= 1;
      throw new Error("FakeQueue: enqueue failed");
    }
    const name = taskName(kind, jobId, suffix);
    if (this.tasks.some((t) => t.name === name)) return;
    this.tasks.push({ kind, jobId, suffix, name });
  }
}
