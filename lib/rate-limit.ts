/**
 * Lightweight in-memory sliding-window rate limiter.
 * Note: state is per-process, so it is best-effort on multi-instance
 * deployments, but it stops the common brute-force and flood cases.
 */

interface Bucket {
  times: number[];
}

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 5000;
let pruneCounter = 0;

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { times: [] };
    buckets.set(key, bucket);
  }
  bucket.times = bucket.times.filter((t) => now - t < windowMs);

  if (bucket.times.length >= limit) {
    const retryAfter = Math.max(1, Math.ceil((bucket.times[0] + windowMs - now) / 1000));
    return { ok: false, retryAfter };
  }

  bucket.times.push(now);

  // Periodically drop stale keys so the map cannot grow unbounded.
  pruneCounter += 1;
  if (pruneCounter % 100 === 0) {
    for (const [k, b] of buckets) {
      b.times = b.times.filter((t) => now - t < windowMs);
      if (b.times.length === 0) buckets.delete(k);
      if (buckets.size > MAX_BUCKETS) break;
    }
  }

  return { ok: true, retryAfter: 0 };
}

export function clientIp(request: Request): string {
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) {
    const parts = fwd.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }
  return "unknown";
}

export function verifyCsrf(request: Request): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const host = request.headers.get("host") ?? request.headers.get("x-forwarded-host") ?? "";
  if (!origin && !referer) return true;
  const check = origin ?? referer ?? "";
  try {
    const url = new URL(check);
    return url.host === host;
  } catch {
    return false;
  }
}
