const MAX_PREVIEW_KEYS = 5_000;
const PREVIEW_WINDOW_MS = 60_000;
const PREVIEW_MAX_REQUESTS = 30;

type PreviewRateEntry = {
  timestamps: number[];
  windowMs: number;
};

const previewRateStore = new Map<string, PreviewRateEntry>();

function pruneExpiredPreviewKeys(now: number) {
  for (const [entryKey, entry] of previewRateStore) {
    const latest = entry.timestamps.at(-1) ?? 0;
    if (latest <= now - entry.windowMs) {
      previewRateStore.delete(entryKey);
    }
  }
}

export function extractClientIp(request: Request): string {
  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp?.trim()) return cfIp.trim().slice(0, 128);

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded?.trim()) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 128);
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp?.trim()) return realIp.trim().slice(0, 128);

  return "anonymous";
}

export function checkPreviewRateLimit(
  request: Request,
): { allowed: true } | { allowed: false; retryAfterSeconds: number } {
  const isTest = process.env.NODE_ENV === "test";
  const forceTestCheck = request.headers.get("x-test-rate-limit") === "true";

  if (isTest && !forceTestCheck) {
    return { allowed: true };
  }

  const key = `og_preview:${extractClientIp(request)}`;
  const now = Date.now();
  const windowStart = now - PREVIEW_WINDOW_MS;

  if (!previewRateStore.has(key) && previewRateStore.size >= MAX_PREVIEW_KEYS) {
    pruneExpiredPreviewKeys(now);
    while (previewRateStore.size >= MAX_PREVIEW_KEYS) {
      const oldestKey = previewRateStore.keys().next().value;
      if (oldestKey === undefined) break;
      previewRateStore.delete(oldestKey);
    }
  }

  const existing = previewRateStore.get(key);
  const timestamps = (existing?.timestamps ?? []).filter(
    (t) => t > windowStart,
  );

  if (timestamps.length >= PREVIEW_MAX_REQUESTS) {
    const oldest = timestamps[0] ?? now;
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((oldest + PREVIEW_WINDOW_MS - now) / 1000),
    );
    return { allowed: false, retryAfterSeconds };
  }

  timestamps.push(now);
  if (existing) previewRateStore.delete(key);
  previewRateStore.set(key, { timestamps, windowMs: PREVIEW_WINDOW_MS });
  return { allowed: true };
}

export function _resetPreviewRateLimits(): void {
  previewRateStore.clear();
}
