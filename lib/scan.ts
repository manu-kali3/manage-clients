/** Parse a scanned / typed ticket value into a booking id.
 *
 * Accepts the full verify URL, the `BVN-<32hex>` code (spaced or not),
 * or the bare 32-char hex booking id. Returns null when nothing matches.
 */
export function parseTicketCode(input: string): string | null {
  if (!input) return null;
  let raw = input.trim();

  if (/^https?:\/\//i.test(raw)) {
    try {
      raw = new URL(raw).pathname.split("/").filter(Boolean).pop() ?? raw;
    } catch {
      // fall through and try the raw value
    }
  }

  raw = raw.replace(/[\s-]/g, "");

  const m = /^(?:BVN-)?([A-Fa-f0-9]{32})$/.exec(raw);
  if (!m) return null;

  const hex = m[1].toLowerCase();
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Pretty grouped code, e.g. BVN-721F 7F0E C64F 4587. */
export function displayCode(bookingId: string): string {
  const hex = bookingId.replace(/-/g, "").toUpperCase();
  const groups = hex.match(/.{1,4}/g) ?? [];
  return `BVN-${groups.join(" ")}`;
}
