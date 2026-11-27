import { Router } from "express";
import { z } from "zod";
import {
  createSpotReportSchema,
  createSpotSubmissionSchema,
  geocodeSpotsQuerySchema,
  listSpotsQuerySchema,
  nearbyCheckQuerySchema,
  upsertSpotReviewSchema,
} from "@starter/shared/validators/spots";
import { HttpError } from "../lib/http-error";
import { getAuth, optionalAuth, requireAuth } from "../middleware/auth";
import { jsonBody } from "../middleware/body";
import { requireTrustedOrigin } from "../middleware/origin";
import {
  getGeocodeRateLimit,
  postReportRateLimit,
  postSpotRateLimit,
  putReviewRateLimit,
} from "../middleware/spot-rate-limit";
import {
  checkNearbyDuplicateSpots,
  deleteMySpotReview,
  geocodeIndonesiaLocation,
  getSpotBySlug,
  listMySpotActivity,
  listPublishedSpots,
  listSpotCities,
  listSpotReviews,
  reportSpotOrReview,
  submitReadingSpot,
  toggleSpotBookmark,
  upsertMySpotReview,
} from "../services/spots.service";

export const spotsRouter = Router();

const reviewsPaginationSchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .strict();

// GET /api/spots - Query reading spots (BBox or nearby + filters)
spotsRouter.get("/", optionalAuth, async (req, res) => {
  const query = listSpotsQuerySchema.parse(req.query);
  const viewerUserId = req.auth?.user.id;
  const result = await listPublishedSpots(query, viewerUserId);
  res.json(result);
});

// GET /api/spots/meta/cities - Public city summary & centroids
spotsRouter.get("/meta/cities", async (_req, res) => {
  const cities = await listSpotCities();
  res.json({ data: cities });
});

// GET /api/spots/nearby-check - Duplicate guard within radiusMeters (default 100m)
spotsRouter.get("/nearby-check", requireAuth, async (req, res) => {
  const query = nearbyCheckQuerySchema.parse(req.query);
  const matches = await checkNearbyDuplicateSpots(query);
  res.json({ data: matches });
});

// GET /api/spots/geocode - Rate-limited Nominatim geocode proxy
spotsRouter.get(
  "/geocode",
  requireAuth,
  getGeocodeRateLimit,
  async (req, res) => {
    const query = geocodeSpotsQuerySchema.parse(req.query);
    const results = await geocodeIndonesiaLocation(query);
    res.json({ data: results });
  },
);

// GET /api/spots/mine - Authenticated user's submissions & bookmarks
spotsRouter.get("/mine", requireAuth, async (req, res) => {
  const userId = getAuth(req).user.id;
  const activity = await listMySpotActivity(userId);
  res.json({ data: activity });
});

// GET /api/spots/:slug - Spot detail
spotsRouter.get("/:slug", optionalAuth, async (req, res) => {
  const slug = String(req.params.slug);
  const viewerUserId = req.auth?.user.id;
  const viewerRole = req.auth?.user.role || undefined;
  const spot = await getSpotBySlug(slug, viewerUserId, viewerRole);
  if (!spot) {
    throw new HttpError(404, "SPOT_NOT_FOUND", "Sudut baca tidak ditemukan.");
  }
  res.json({ data: spot });
});

// GET /api/spots/:slug/reviews - Paginated spot reviews & rating distribution
spotsRouter.get("/:slug/reviews", optionalAuth, async (req, res) => {
  const slug = String(req.params.slug);
  const { limit, offset } = reviewsPaginationSchema.parse(req.query);
  const reviews = await listSpotReviews(slug, limit, offset);
  res.json(reviews);
});

// POST /api/spots - Propose new reading spot (Rate limited: max 5/day/user)
spotsRouter.post(
  "/",
  requireAuth,
  requireTrustedOrigin,
  jsonBody,
  postSpotRateLimit,
  async (req, res) => {
    const auth = getAuth(req);
    const input = createSpotSubmissionSchema.parse(req.body);
    const created = await submitReadingSpot(
      auth.user.id,
      auth.user.role || undefined,
      input,
    );
    res.status(201).json({ data: created });
  },
);

// PUT /api/spots/:slug/reviews/me - Create/update own review (Rate limited: max 10/hour/user)
spotsRouter.put(
  "/:slug/reviews/me",
  requireAuth,
  requireTrustedOrigin,
  jsonBody,
  putReviewRateLimit,
  async (req, res) => {
    const userId = getAuth(req).user.id;
    const slug = String(req.params.slug);
    const input = upsertSpotReviewSchema.parse(req.body);
    const result = await upsertMySpotReview(userId, slug, input);
    res.json({ data: result });
  },
);

// DELETE /api/spots/:slug/reviews/me - Delete own review (enforces requireTrustedOrigin)
spotsRouter.delete(
  "/:slug/reviews/me",
  requireAuth,
  requireTrustedOrigin,
  async (req, res) => {
    const userId = getAuth(req).user.id;
    const slug = String(req.params.slug);
    const result = await deleteMySpotReview(userId, slug);
    res.json({ data: result });
  },
);

// POST /api/spots/:slug/bookmark - Toggle favorite bookmark
spotsRouter.post(
  "/:slug/bookmark",
  requireAuth,
  requireTrustedOrigin,
  async (req, res) => {
    const userId = getAuth(req).user.id;
    const slug = String(req.params.slug);
    const result = await toggleSpotBookmark(userId, slug);
    res.json({ data: result });
  },
);

// POST /api/spots/:slug/reports - Report spot issue/abuse (Rate limited: max 10/day/user)
spotsRouter.post(
  "/:slug/reports",
  requireAuth,
  requireTrustedOrigin,
  jsonBody,
  postReportRateLimit,
  async (req, res) => {
    const userId = getAuth(req).user.id;
    const slug = String(req.params.slug);
    const input = createSpotReportSchema.parse(req.body);
    const result = await reportSpotOrReview(userId, slug, input);
    res.status(201).json({ data: result });
  },
);
