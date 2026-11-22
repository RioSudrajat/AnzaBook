import { Router } from "express";
import { optionalAuth, requireAuth } from "../middleware/auth";
import { jsonBody } from "../middleware/body";
import { requireTrustedOrigin } from "../middleware/origin";
import {
  getGeocodeRateLimit,
  postReportRateLimit,
  postSpotRateLimit,
  putReviewRateLimit,
} from "../middleware/spot-rate-limit";

export const spotsRouter = Router();

// GET /api/spots - Query reading spots (BBox or nearby)
spotsRouter.get("/", optionalAuth, async (_req, res) => {
  res.json({
    data: [],
    meta: {
      total: 0,
    },
  });
});

// GET /api/spots/geocode - Rate-limited Nominatim geocode proxy
spotsRouter.get(
  "/geocode",
  requireAuth,
  getGeocodeRateLimit,
  async (_req, res) => {
    res.json({
      data: [],
    });
  },
);

// GET /api/spots/:slug - Spot detail
spotsRouter.get("/:slug", optionalAuth, async (req, res) => {
  res.json({
    data: {
      slug: req.params.slug,
    },
  });
});

// POST /api/spots - Propose new reading spot (Rate limited: max 5/day/user)
spotsRouter.post(
  "/",
  requireAuth,
  requireTrustedOrigin,
  jsonBody,
  postSpotRateLimit,
  async (_req, res) => {
    res.status(201).json({
      status: "pending_review",
      message: "Usulan sudut baca berhasil dikirim untuk moderasi.",
    });
  },
);

// PUT /api/spots/:slug/reviews/me - Create/update review (Rate limited: max 10/hour/user)
spotsRouter.put(
  "/:slug/reviews/me",
  requireAuth,
  requireTrustedOrigin,
  jsonBody,
  putReviewRateLimit,
  async (_req, res) => {
    res.json({
      message: "Ulasan berhasil disimpan.",
    });
  },
);

// POST /api/spots/:slug/reports - Report spot issue/abuse (Rate limited: max 10/day/user)
spotsRouter.post(
  "/:slug/reports",
  requireAuth,
  requireTrustedOrigin,
  jsonBody,
  postReportRateLimit,
  async (_req, res) => {
    res.status(201).json({
      message: "Laporan berhasil dikirim.",
    });
  },
);
