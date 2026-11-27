import { HttpError } from "../lib/http-error";

export type UserWindowLimiterOptions = {
  limit: number;
  windowMs?: number;
  maxBuckets?: number;
  code: string;
  message: string;
};

/**
 * Enforces a per-user fixed-window request quota with bounded in-memory cleanup.
 */
export function createUserWindowLimiter(options: UserWindowLimiterOptions) {
  const {
    limit,
    windowMs = 60_000,
    maxBuckets = 10_000,
    code,
    message,
  } = options;
  const requests = new Map<string, { count: number; until: number }>();

  return (userId: string) => {
    const now = Date.now();
    for (const [id, bucket] of requests) {
      if (bucket.until > now) break;
      requests.delete(id);
    }
    const current = requests.get(userId);
    if (current ? current.count >= limit : requests.size >= maxBuckets) {
      throw new HttpError(429, code, message);
    }
    if (current) {
      current.count += 1;
    } else {
      requests.set(userId, { count: 1, until: now + windowMs });
    }
  };
}
