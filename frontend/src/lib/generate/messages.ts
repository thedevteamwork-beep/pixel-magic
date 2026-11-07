import { ApiError } from "@/lib/api/client";
import { JobFailedError, PollLostError } from "@/lib/generate/pollJob";

// The field a VALIDATION_FAILED error points at: an unknown key, or the first issue's path.
function validationField(meta: unknown): string | undefined {
  if (Array.isArray(meta)) {
    const path = (meta[0] as { path?: unknown } | undefined)?.path;
    return Array.isArray(path) && path.length > 0 ? path.join(".") : undefined;
  }
  const keys = (meta as { unrecognized_keys?: unknown } | null | undefined)?.unrecognized_keys;
  return Array.isArray(keys) && keys.length > 0 ? String(keys[0]) : undefined;
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

/** A plain message for the user, from any error the generate page can hit. */
export function messageForError(error: unknown): string {
  if (error instanceof PollLostError) return "Lost connection — retrying stopped";
  if (error instanceof JobFailedError) return `${error.message}. Your credits were returned`;
  if (error instanceof ApiError) return messageForApiError(error);
  return "Something went wrong";
}
