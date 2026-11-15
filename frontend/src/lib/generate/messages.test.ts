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
    const withKey = new ApiError(422, "VALIDATION_FAILED", "Bad options", [
      { code: "unrecognized_keys", keys: ["durations"], path: ["options"], message: "Unrecognized key" },
    ]);
    expect(messageForError(withKey)).toBe("Bad options (durations)");
    const withPath = new ApiError(422, "VALIDATION_FAILED", "Bad input", [
      { code: "invalid_value", path: ["options", "duration"], message: "Invalid" },
    ]);
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
    const rejected = jobView("failed", {
      error: { code: "SUBMIT_REJECTED", message: "The model rejected this request." },
    });
    expect(messageForError(new JobFailedError(rejected))).toBe(
      "The model rejected this request. Your credits were returned.",
    );
    const unavailable = jobView("failed", {
      error: {
        code: "SUBMIT_FAILED",
        message: "The model service was unavailable. Your credits were returned.",
      },
    });
    expect(messageForError(new JobFailedError(unavailable))).toBe(
      "The model service was unavailable. Your credits were returned.",
    );
  });

  it("falls back to a plain message", () => {
    expect(messageForError(new Error("boom"))).toBe("Something went wrong");
    expect(messageForError("nope")).toBe("Something went wrong");
  });
});
