import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/client";
import { jobView } from "@/lib/generate/fixtures";
import { messageForError } from "@/lib/generate/messages";
import { JobFailedError, PollLostError } from "@/lib/generate/pollJob";

describe("messageForError", () => {
  it("maps the job creation codes", () => {
    expect(messageForError(new ApiError(402, "INSUFFICIENT_CREDITS", "x"))).toBe("Not enough credits for this job");
    expect(messageForError(new ApiError(429, "TOO_MANY_ACTIVE_JOBS", "x"))).toBe(
      "You have too many jobs running; wait for one to finish",
    );
    expect(messageForError(new ApiError(409, "UPLOAD_NOT_READY", "x"))).toBe(
      "The image didn't finish uploading; try again",
    );
  });

  it("shows the validation message with the field from meta", () => {
    const withKey = new ApiError(422, "VALIDATION_FAILED", "Bad options", { unrecognized_keys: ["durations"] });
    expect(messageForError(withKey)).toBe("Bad options (durations)");
    const withPath = new ApiError(422, "VALIDATION_FAILED", "Bad input", [{ path: ["options", "duration"] }]);
    expect(messageForError(withPath)).toBe("Bad input (options.duration)");
    expect(messageForError(new ApiError(422, "VALIDATION_FAILED", "Bad input"))).toBe("Bad input");
  });

  it("maps session and network errors", () => {
    expect(messageForError(new ApiError(401, "UNAUTHENTICATED", "x"))).toBe("Your session ended — sign in again");
    expect(messageForError(new ApiError(0, "NETWORK_ERROR", "x"))).toBe(
      "Can't reach the server. Check your connection and try again",
    );
  });

  it("maps polling errors", () => {
    expect(messageForError(new PollLostError())).toBe("Lost connection — retrying stopped");
    const failed = jobView("failed", { error: { code: "FAL_ERROR", message: "Content rejected" } });
    expect(messageForError(new JobFailedError(failed))).toBe("Content rejected. Your credits were returned");
  });

  it("falls back to a plain message", () => {
    expect(messageForError(new Error("boom"))).toBe("Something went wrong");
    expect(messageForError("nope")).toBe("Something went wrong");
  });
});
