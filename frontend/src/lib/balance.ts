const EVENT_NAME = "pixelmagic:credits-changed";

/** Tell the header to refetch the credit balance (call after a job is created or finishes). */
export function notifyCreditsChanged(): void {
  window.dispatchEvent(new Event(EVENT_NAME));
}

/** Run `callback` whenever credits change; returns a function that stops listening. */
export function onCreditsChanged(callback: () => void): () => void {
  window.addEventListener(EVENT_NAME, callback);
  return () => window.removeEventListener(EVENT_NAME, callback);
}
