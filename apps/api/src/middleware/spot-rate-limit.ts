import type { RequestHandler } from "express";
import { HttpError } from "../lib/http-error";
import { getRequestContext } from "../lib/request-context";

export type RateLimitConfig = {
  windowMs: number;
  max: number;
  message: string;
  keyPrefix: string;
};

// In-memory sliding window storage keyed by prefix + userId/IP
const rateLimitStore = new Map<string, number[]>();

/**
 * Creates an abuse-resistant sliding window rate limiter middleware.
 * Returns HTTP 429 RATE_LIMIT_EXCEEDED with Retry-After header and localized Indonesian error message.
 * Cleanly bypassed in NODE_ENV=test unless x-test-rate-limit: true is passed.
 */
export function createSpotRateLimiter(config: RateLimitConfig): RequestHandler {
  return (req, res, next) => {
    const isTest = process.env.NODE_ENV === "test";
    const forceTestCheck = req.headers["x-test-rate-limit"] === "true";

    if (isTest && !forceTestCheck) {
      return next();
    }

    const userId =
      req.auth?.user?.id ??
      getRequestContext()?.userId ??
      req.ip ??
      req.socket?.remoteAddress ??
      "anonymous";

    const key = `${config.keyPrefix}:${userId}`;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Prune expired entries
    const timestamps = (rateLimitStore.get(key) ?? []).filter(
      (t) => t > windowStart,
    );

    if (timestamps.length >= config.max) {
      const oldest = timestamps[0];
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((oldest + config.windowMs - now) / 1000),
      );
      res.setHeader("Retry-After", String(retryAfterSeconds));
      throw new HttpError(429, "RATE_LIMIT_EXCEEDED", config.message);
    }

    timestamps.push(now);
    rateLimitStore.set(key, timestamps);
    next();
  };
}

// 1. POST /api/spots: max 5 submissions / 24 hours / user
export const postSpotRateLimit = createSpotRateLimiter({
  keyPrefix: "spot_submission",
  windowMs: 24 * 60 * 60 * 1000,
  max: 5,
  message:
    "Batas pengajuan sudut baca harian tercapai. Anda hanya dapat mengajukan maksimal 5 sudut baca dalam 24 jam.",
});

// 2. PUT /api/spots/:slug/reviews/me: max 10 requests / hour / user
export const putReviewRateLimit = createSpotRateLimiter({
  keyPrefix: "spot_review",
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: "Terlalu banyak permintaan ulasan. Silakan coba lagi nanti.",
});

// 3. POST /api/spots/:slug/reports: max 10 reports / 24 hours / user
export const postReportRateLimit = createSpotRateLimiter({
  keyPrefix: "spot_report",
  windowMs: 24 * 60 * 60 * 1000,
  max: 10,
  message: "Batas pengiriman laporan harian tercapai. Coba lagi dalam 24 jam.",
});

// 4. GET /api/spots/geocode: max 30 requests / minute / user
export const getGeocodeRateLimit = createSpotRateLimiter({
  keyPrefix: "spot_geocode",
  windowMs: 60 * 1000,
  max: 30,
  message:
    "Batas pencarian lokasi tercapai. Tunggu 1 menit sebelum mencoba lagi.",
});

/**
 * Resets the in-memory rate limit store for deterministic unit/integration testing.
 */
export function _resetSpotRateLimits() {
  rateLimitStore.clear();
}
