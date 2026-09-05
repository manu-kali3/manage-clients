/** Returns the URL when it is a plausible http(s) link, otherwise null. */
export function safeUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length > 2000) return null;
  if (!/^https?:\/\/[^\s]+$/i.test(trimmed)) return null;
  return trimmed;
}

/** Caps a string field at a max length, trimming whitespace. */
export function capped(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > max) return null;
  return trimmed;
}
