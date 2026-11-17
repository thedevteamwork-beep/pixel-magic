"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Favorites and removed images, kept in this browser: the backend has no
 * favorite or delete endpoint for jobs. Bounded so it never grows forever.
 */
type LibraryPrefs = { favorites: readonly string[]; hidden: readonly string[] };

const KEY = "pixelmagic:image-library:v1";
const CHANGE = "pixelmagic:image-library-changed";
const LIMIT = 500;
const EMPTY: LibraryPrefs = { favorites: [], hidden: [] };

let snapshot: { raw: string | null; value: LibraryPrefs } = { raw: null, value: EMPTY };

function read(): LibraryPrefs {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return EMPTY;
  }
  // useSyncExternalStore needs the same object back until the data changes.
  if (raw === snapshot.raw) return snapshot.value;
  let value = EMPTY;
  try {
    const parsed = raw ? (JSON.parse(raw) as Partial<LibraryPrefs>) : {};
    const list = (items: unknown) => (Array.isArray(items) ? items.filter((id) => typeof id === "string") : []);
    value = { favorites: list(parsed.favorites), hidden: list(parsed.hidden) };
  } catch {
    // A corrupt entry is treated as empty and replaced on the next write.
  }
  snapshot = { raw, value };
  return value;
}

function write(update: (prefs: LibraryPrefs) => LibraryPrefs) {
  const next = update(read());
  try {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ favorites: next.favorites.slice(-LIMIT), hidden: next.hidden.slice(-LIMIT) }),
    );
  } catch {
    // Private mode or a full quota: the change lasts for this page only.
    snapshot = { raw: snapshot.raw, value: next };
  }
  window.dispatchEvent(new Event(CHANGE));
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE, onChange);
    window.removeEventListener("storage", onChange);
  };
}

const toggle = (list: readonly string[], id: string) =>
  list.includes(id) ? list.filter((item) => item !== id) : [...list, id];

export function useLibraryPrefs() {
  const prefs = useSyncExternalStore(subscribe, read, () => EMPTY);
  const toggleFavorite = useCallback((id: string) => write((p) => ({ ...p, favorites: toggle(p.favorites, id) })), []);
  const hide = useCallback(
    (ids: readonly string[]) => write((p) => ({ ...p, hidden: [...new Set([...p.hidden, ...ids])] })),
    [],
  );
  const unhide = useCallback(
    (ids: readonly string[]) => write((p) => ({ ...p, hidden: p.hidden.filter((id) => !ids.includes(id)) })),
    [],
  );
  return { favorites: prefs.favorites, hidden: prefs.hidden, toggleFavorite, hide, unhide };
}
