// Shared search rules, so every search box in the app behaves the same way.
//
// A search only runs once at least SEARCH_MIN_CHARS characters have been typed
// (leading/trailing spaces don't count). With 1-2 characters nothing is
// filtered and nothing is sent to the server; the full list stays on screen.

export const SEARCH_MIN_CHARS = 3;
export const SEARCH_DEBOUNCE_MS = 300;

// Returns the trimmed search text when it is long enough to search with,
// otherwise "" (meaning "no search active").
export function activeSearchTerm(value) {
  const v = (value || "").trim();
  return v.length >= SEARCH_MIN_CHARS ? v : "";
}

// True while the user has typed something, but not enough yet.
export function isSearchTooShort(value) {
  const v = (value || "").trim();
  return v.length > 0 && v.length < SEARCH_MIN_CHARS;
}
