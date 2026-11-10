import { Router } from "express";
import { calculatePrintEconomics } from "@starter/shared/print-economics";
import {
  applyPublisherSchema,
  simulatePrintSchema,
  submitManuscriptSchema,
} from "@starter/shared/validators/publisher";
import { HttpError } from "../lib/http-error";
import { getAuth, optionalAuth, requireAuth } from "../middleware/auth";
import { jsonBody } from "../middleware/body";
import { requireTrustedOrigin } from "../middleware/origin";
import {
  applyPublisher,
  getPublisherBySlug,
  listMyManuscripts,
  listVerifiedPublishers,
  submitManuscript,
} from "../services/publisher.service";

export const publisherRouter = Router();

// Print Economics Simulator
publisherRouter.post("/simulate", jsonBody, async (req, res) => {
  const input = simulatePrintSchema.parse(req.body);
  const result = calculatePrintEconomics(input);
  res.json({ data: result });
});

// Explore: List verified publishers
publisherRouter.get("/list", optionalAuth, async (req, res) => {
  const currentUserId = req.auth?.user.id;
  const publishers = await listVerifiedPublishers(currentUserId);
  res.json({ data: publishers });
});

// Apply to become partner publisher
publisherRouter.post(
  "/apply",
  requireAuth,
  requireTrustedOrigin,
  jsonBody,
  async (req, res) => {
    const userId = getAuth(req).user.id;
    const input = applyPublisherSchema.parse(req.body);
    const publisher = await applyPublisher(userId, input);
    res.status(201).json({ data: publisher });
  },
);

// Submit manuscript with chapters
publisherRouter.post(
  "/manuscripts",
  requireAuth,
  requireTrustedOrigin,
  jsonBody,
  async (req, res) => {
    const userId = getAuth(req).user.id;
    const input = submitManuscriptSchema.parse(req.body);
    const manuscript = await submitManuscript(userId, input);
    res.status(201).json({ data: manuscript });
  },
);

// List author's submitted manuscripts
publisherRouter.get("/manuscripts/mine", requireAuth, async (req, res) => {
  const userId = getAuth(req).user.id;
  const manuscripts = await listMyManuscripts(userId);
  res.json({ data: manuscripts });
});

// Public: Get publisher detail by slug
publisherRouter.get("/:slug", optionalAuth, async (req, res) => {
  const currentUserId = req.auth?.user.id;
  const slug = String(req.params.slug);
  const publisher = await getPublisherBySlug(slug, currentUserId);
  if (!publisher) {
    throw new HttpError(
      404,
      "PUBLISHER_NOT_FOUND",
      "Penerbit mitra tidak ditemukan.",
    );
  }
  res.json({ data: publisher });
});
