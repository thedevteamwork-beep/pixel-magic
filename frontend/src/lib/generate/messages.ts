import { ApiError } from "@/lib/api/client";
import { JobFailedError, PollLostError } from "@/lib/generate/pollJob";

// The field a VALIDATION_FAILED error points at. `meta` is the list of zod issues:
// an unrecognized key is named in `keys` (its `path` is the parent); others use `path`.
function validationField(meta: unknown): string | undefined {
  if (!Array.isArray(meta)) return undefined;
  const issue = meta[0] as { code?: string; keys?: unknown; path?: unknown } | undefined;
  if (issue?.code === "unrecognized_keys" && Array.isArray(issue.keys) && issue.keys.length > 0) {
    return String(issue.keys[0]);
  }
  return Array.isArray(issue?.path) && issue.path.length > 0 ? issue.path.join(".") : undefined;
}

function messageForApiError(error: ApiError): string {
  if (error.status === 401) return "Your session ended — sign in again";
  switch (error.code) {
    case "INSUFFICIENT_CREDITS":
      return "Not enough credits for this job";
    case "TOO_MANY_ACTIVE_JOBS":
      return "You have too many jobs running; wait for one to finish";
    case "UPLOAD_NOT_READY":
      return "The image didn't finish uploading; try again";
    case "VALIDATION_FAILED": {
      const field = validationField(error.meta);
      return field ? `${error.message} (${field})` : error.message;
    }
    case "UNAUTHENTICATED":
      return "Your session ended — sign in again";
    case "NETWORK_ERROR":
      return "Can't reach the server. Check your connection and try again";
    default:
      return "Something went wrong";
  }
}

const CREDITS_RETURNED = "Your credits were returned.";

// Backend messages end with a period, and one already says the credits were returned.
function failedJobMessage(message: string): string {
  if (message.includes(CREDITS_RETURNED)) return message;
  const sentence = message.endsWith(".") ? message : `${message}.`;
  return `${sentence} ${CREDITS_RETURNED}`;
}

/** A plain message for the user, from any error the generate page can hit. */
export function messageForError(error: unknown): string {
  if (error instanceof PollLostError) return "Lost connection — retrying stopped";
  if (error instanceof JobFailedError) return failedJobMessage(error.message);
  if (error instanceof ApiError) return messageForApiError(error);
  return "Something went wrong";
}
