import { Router } from "express";
import { z } from "zod";
import { calculatePrintEconomics } from "@starter/shared/print-economics";
import {
  applyPublisherSchema,
  createManuscriptDraftSchema,
  reviewManuscriptSchema,
  simulatePrintSchema,
  submitManuscriptSchema,
  updateManuscriptSchema,
  updatePublisherSchema,
} from "@starter/shared/validators/publisher";
import { HttpError } from "../lib/http-error";
import { getAuth, optionalAuth, requireAuth } from "../middleware/auth";
import { jsonBody } from "../middleware/body";
import { requireTrustedOrigin } from "../middleware/origin";
import {
  applyPublisher,
  createManuscriptDraft,
  getManuscript,
  getPublisherBySlug,
  listMyManuscripts,
  listPublisherManuscripts,
  listVerifiedPublishers,
  reviewManuscript,
  submitManuscript,
  submitManuscriptDraft,
  updateManuscript,
  updatePublisher,
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

// Update partner publisher profile (manager or admin)
publisherRouter.patch(
  "/:slug",
  requireAuth,
  requireTrustedOrigin,
  jsonBody,
  async (req, res) => {
    const userId = getAuth(req).user.id;
    const userRole = getAuth(req).user.role || undefined;
    const slug = String(req.params.slug);
    const input = updatePublisherSchema.parse(req.body);
    const publisher = await updatePublisher(userId, slug, input, userRole);
    res.json({ data: publisher });
  },
);

// Create manuscript draft
publisherRouter.post(
  "/manuscripts/drafts",
  requireAuth,
  requireTrustedOrigin,
  jsonBody,
  async (req, res) => {
    const userId = getAuth(req).user.id;
    const input = createManuscriptDraftSchema.parse(req.body);
    const manuscript = await createManuscriptDraft(userId, input);
    res.status(201).json({ data: manuscript });
  },
);

// Submit manuscript with chapters directly
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

// List author's submitted manuscripts & drafts
publisherRouter.get("/manuscripts/mine", requireAuth, async (req, res) => {
  const userId = getAuth(req).user.id;
  const manuscripts = await listMyManuscripts(userId);
  res.json({ data: manuscripts });
});

// Get manuscript by id or slug (author, publisher, or admin)
publisherRouter.get("/manuscripts/:idOrSlug", requireAuth, async (req, res) => {
  const userId = getAuth(req).user.id;
  const userRole = getAuth(req).user.role || undefined;
  const idOrSlug = String(req.params.idOrSlug);
  const manuscript = await getManuscript(userId, idOrSlug, userRole);
  res.json({ data: manuscript });
});

// Update manuscript draft or content
publisherRouter.patch(
  "/manuscripts/:idOrSlug",
  requireAuth,
  requireTrustedOrigin,
  jsonBody,
  async (req, res) => {
    const userId = getAuth(req).user.id;
    const userRole = getAuth(req).user.role || undefined;
    const idOrSlug = String(req.params.idOrSlug);
    const input = updateManuscriptSchema.parse(req.body);
    const manuscript = await updateManuscript(userId, idOrSlug, input, userRole);
    res.json({ data: manuscript });
  },
);

// Submit manuscript draft to publisher
publisherRouter.post(
  "/manuscripts/:idOrSlug/submit",
  requireAuth,
  requireTrustedOrigin,
  jsonBody,
  async (req, res) => {
    const userId = getAuth(req).user.id;
    const idOrSlug = String(req.params.idOrSlug);
    const publisherId = req.body?.publisherId ? String(req.body.publisherId) : null;
    const manuscript = await submitManuscriptDraft(userId, idOrSlug, publisherId);
    res.json({ data: manuscript });
  },
);

// Review manuscript by publisher or admin
publisherRouter.post(
  "/manuscripts/:idOrSlug/review",
  requireAuth,
  requireTrustedOrigin,
  jsonBody,
  async (req, res) => {
    const userId = getAuth(req).user.id;
    const userRole = getAuth(req).user.role || undefined;
    const idOrSlug = String(req.params.idOrSlug);
    const input = reviewManuscriptSchema.parse(req.body);
    const manuscript = await reviewManuscript(userId, idOrSlug, input, userRole);
    res.json({ data: manuscript });
  },
);

// Publisher incoming manuscripts inbox
publisherRouter.get("/:slug/manuscripts", requireAuth, async (req, res) => {
  const userId = getAuth(req).user.id;
  const userRole = getAuth(req).user.role || undefined;
  const slug = String(req.params.slug);
  const manuscripts = await listPublisherManuscripts(userId, slug, userRole);
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
