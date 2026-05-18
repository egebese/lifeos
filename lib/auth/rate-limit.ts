// Tiny in-memory token-bucket rate limiter. Single-replica only.

type Bucket = { tokens: number; updatedAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key) ?? { tokens: max, updatedAt: now };
  const elapsed = now - b.updatedAt;
  const refill = (elapsed / windowMs) * max;
  b.tokens = Math.min(max, b.tokens + refill);
  b.updatedAt = now;
  if (b.tokens < 1) {
    buckets.set(key, b);
    return false;
  }
  b.tokens -= 1;
  buckets.set(key, b);
  return true;
}
