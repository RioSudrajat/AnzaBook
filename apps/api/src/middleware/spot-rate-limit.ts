import type { RequestHandler } from "express";
import { HttpError } from "../lib/http-error";
import { getRequestContext } from "../lib/request-context";

export type RateLimitConfig = {
  windowMs: number;
  max: number;
  message: string;
  keyPrefix: string;
};

type RateLimitEntry = {
  timestamps: number[];
  windowMs: number;
};

const MAX_RATE_LIMIT_KEYS = 10_000;

// Bounded in-memory sliding window storage keyed by prefix + userId/IP
const rateLimitStore = new Map<string, RateLimitEntry>();

function pruneExpiredKeys(now: number) {
  for (const [entryKey, entry] of rateLimitStore) {
    const latest = entry.timestamps.at(-1) ?? 0;
    if (latest <= now - entry.windowMs) {
      rateLimitStore.delete(entryKey);
    }
  }
}

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

    if (
      !rateLimitStore.has(key) &&
      rateLimitStore.size >= MAX_RATE_LIMIT_KEYS
    ) {
      pruneExpiredKeys(now);
      while (rateLimitStore.size >= MAX_RATE_LIMIT_KEYS) {
        const oldestKey = rateLimitStore.keys().next().value;
        if (oldestKey === undefined) break;
        rateLimitStore.delete(oldestKey);
      }
    }

    const existing = rateLimitStore.get(key);
    // Prune expired timestamps for this bucket
    const timestamps = (existing?.timestamps ?? []).filter(
      (t) => t > windowStart,
    );

    if (timestamps.length >= config.max) {
      const oldest = timestamps[0] ?? now;
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((oldest + config.windowMs - now) / 1000),
      );
      res.setHeader("Retry-After", String(retryAfterSeconds));
      throw new HttpError(429, "RATE_LIMIT_EXCEEDED", config.message);
    }

    timestamps.push(now);
    // Re-insert so recently active keys move to insertion tail for LRU eviction
    if (existing) rateLimitStore.delete(key);
    rateLimitStore.set(key, { timestamps, windowMs: config.windowMs });
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

// 5. POST /api/reading: max 60 session submissions / hour / user
export const postReadingSessionRateLimit = createSpotRateLimiter({
  keyPrefix: "reading_session",
  windowMs: 60 * 60 * 1000,
  max: 60,
  message:
    "Terlalu banyak pencatatan sesi membaca. Coba lagi dalam beberapa saat.",
});

// 6. POST /api/reading/highlights: max 60 highlight creations / hour / user
export const postHighlightRateLimit = createSpotRateLimiter({
  keyPrefix: "reading_highlight",
  windowMs: 60 * 60 * 1000,
  max: 60,
  message: "Terlalu banyak pembuatan kutipan. Coba lagi nanti.",
});

// 7. POST /api/reading/drm-events: max 120 events / hour / user
export const postDrmEventRateLimit = createSpotRateLimiter({
  keyPrefix: "drm_event",
  windowMs: 60 * 60 * 1000,
  max: 120,
  message: "Terlalu banyak pelaporan peristiwa keamanan. Coba lagi nanti.",
});

// 8. POST /api/reading/drm-appeal: max 5 appeals / 24 hours / user
export const postDrmAppealRateLimit = createSpotRateLimiter({
  keyPrefix: "drm_appeal",
  windowMs: 24 * 60 * 60 * 1000,
  max: 5,
  message:
    "Batas pengajuan banding DRM harian tercapai. Coba lagi dalam 24 jam.",
});

// 9. POST /api/social/{highlights,sessions}/:id/toggle-post: max 30 / hour / user
export const postSocialPublishRateLimit = createSpotRateLimiter({
  keyPrefix: "social_publish",
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: "Terlalu banyak publikasi ke linimasa. Coba lagi nanti.",
});

// 10. POST /api/social/author-applications: max 5 / 24 hours / user
export const postAuthorApplicationRateLimit = createSpotRateLimiter({
  keyPrefix: "author_application",
  windowMs: 24 * 60 * 60 * 1000,
  max: 5,
  message:
    "Batas pengajuan penulis resmi harian tercapai. Coba lagi dalam 24 jam.",
});

// 11. POST /api/social/users/:userId/follow: max 60 / hour / user
export const postFollowRateLimit = createSpotRateLimiter({
  keyPrefix: "social_follow",
  windowMs: 60 * 60 * 1000,
  max: 60,
  message: "Terlalu banyak aktivitas mengikuti akun. Coba lagi nanti.",
});

// 12. GET /api/social/explore* & /api/social/posts/*: max 60 / minute / IP or user
export const publicExploreRateLimit = createSpotRateLimiter({
  keyPrefix: "public_explore",
  windowMs: 60 * 1000,
  max: 60,
  message: "Terlalu banyak permintaan pencarian. Coba lagi dalam 1 menit.",
});

// 13. GET /api/books & GET /api/books/:slug: max 120 / minute / IP or user
export const publicCatalogRateLimit = createSpotRateLimiter({
  keyPrefix: "public_catalog",
  windowMs: 60 * 1000,
  max: 120,
  message: "Terlalu banyak permintaan katalog. Coba lagi dalam 1 menit.",
});

// 14. POST /api/media/upload-image: max 20 uploads / hour / user
export const postMediaUploadRateLimit = createSpotRateLimiter({
  keyPrefix: "media_upload",
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: "Batas unggah gambar per jam tercapai. Coba lagi nanti.",
});

// 15. POST member/writer directory lookup: max 20 / minute / user
export const postMemberLookupRateLimit = createSpotRateLimiter({
  keyPrefix: "member_lookup",
  windowMs: 60 * 1000,
  max: 20,
  message:
    "Terlalu banyak permintaan penambahan anggota. Coba lagi dalam 1 menit.",
});

// 16. POST /api/books/:slug/claim-code: max 10 attempts / 15 minutes / user
export const postClaimCodeRateLimit = createSpotRateLimiter({
  keyPrefix: "claim_code",
  windowMs: 15 * 60 * 1000,
  max: 10,
  message:
    "Terlalu banyak percobaan klaim kode cetak. Coba lagi dalam 15 menit.",
});

/**
 * Resets the in-memory rate limit store for deterministic unit/integration testing.
 */
export function _resetSpotRateLimits() {
  rateLimitStore.clear();
}
