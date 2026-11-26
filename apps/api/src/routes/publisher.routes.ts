import { Router } from "express";
import { z } from "zod";
import { calculatePrintEconomics } from "@starter/shared/print-economics";
import {
  addApprovedWriterSchema,
  addPublisherMemberSchema,
  applyPublisherSchema,
  authorUpdateManuscriptSchema,
  createManuscriptDraftSchema,
  listSubmissionTargetsQuerySchema,
  publishManuscriptSchema,
  publisherEditManuscriptSchema,
  publisherReviewManuscriptSchema,
  simulatePrintSchema,
  submitManuscriptSchema,
  updateBookInventorySchema,
  updatePublisherBookSchema,
  updatePublisherMemberSchema,
  updatePublisherSchema,
} from "@starter/shared/validators/publisher";
import { HttpError } from "../lib/http-error";
import { getAuth, optionalAuth, requireAuth } from "../middleware/auth";
import { jsonBody } from "../middleware/body";
import { requireTrustedOrigin } from "../middleware/origin";
import {
  applyPublisher,
  createManuscriptDraft,
  editPublisherManuscript,
  followPublisher,
  getManuscript,
  getPublisherBySlug,
  listMyManagedPublishers,
  listMyManuscripts,
  listPublisherManuscripts,
  listSubmissionTargets,
  listVerifiedPublishers,
  reviewPublisherManuscript,
  submitManuscript,
  submitManuscriptDraft,
  unfollowPublisher,
  updateManuscript,
  updatePublisher,
  withdrawManuscript,
} from "../services/publisher.service";
import {
  addPublisherApprovedWriter,
  addPublisherMember,
  listPublisherApprovedWriters,
  listPublisherBookInventory,
  listPublisherBooks,
  listPublisherMembers,
  listStoreBranches,
  publishPublisherManuscript,
  removePublisherApprovedWriter,
  removePublisherMember,
  updatePublisherBook,
  updatePublisherBookInventory,
  updatePublisherMember,
} from "../services/publisher-publishing.service";

export const publisherRouter = Router();

const submitDraftBodySchema = z
  .object({
    publisherId: z
      .string()
      .uuid("ID penerbit tidak valid")
      .optional()
      .nullable(),
  })
  .strict()
  .optional();

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

// Author submission targets ranked by official AnzaBook pin + topic overlap
publisherRouter.get("/submission-targets", optionalAuth, async (req, res) => {
  const currentUserId = req.auth?.user.id;
  const query = listSubmissionTargetsQuerySchema.parse(req.query);
  const targets = await listSubmissionTargets(query, currentUserId);
  res.json({ data: targets });
});

// List publishers managed by authenticated caller (including pending/rejected)
publisherRouter.get("/mine", requireAuth, async (req, res) => {
  const userId = getAuth(req).user.id;
  const managed = await listMyManagedPublishers(userId);
  res.json({ data: managed });
});

// List available store branches for physical book stock management
publisherRouter.get("/store-branches", requireAuth, async (_req, res) => {
  const branches = await listStoreBranches();
  res.json({ data: branches });
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

// Get manuscript by id or slug (author or publisher owner/editor)
publisherRouter.get("/manuscripts/:idOrSlug", requireAuth, async (req, res) => {
  const userId = getAuth(req).user.id;
  const idOrSlug = String(req.params.idOrSlug);
  const manuscript = await getManuscript(userId, idOrSlug);
  res.json({ data: manuscript });
});

// Update manuscript draft or revision content (author only, locked once submitted/published)
publisherRouter.patch(
  "/manuscripts/:idOrSlug",
  requireAuth,
  requireTrustedOrigin,
  jsonBody,
  async (req, res) => {
    const userId = getAuth(req).user.id;
    const idOrSlug = String(req.params.idOrSlug);
    const input = authorUpdateManuscriptSchema.parse(req.body);
    const manuscript = await updateManuscript(userId, idOrSlug, input);
    res.json({ data: manuscript });
  },
);

// Submit manuscript draft to publisher (falls back to official anzabook when omitted)
publisherRouter.post(
  "/manuscripts/:idOrSlug/submit",
  requireAuth,
  requireTrustedOrigin,
  jsonBody,
  async (req, res) => {
    const userId = getAuth(req).user.id;
    const idOrSlug = String(req.params.idOrSlug);
    const body = submitDraftBodySchema.parse(req.body);
    const manuscript = await submitManuscriptDraft(
      userId,
      idOrSlug,
      body?.publisherId ?? null,
    );
    res.json({ data: manuscript });
  },
);

// Withdraw submitted manuscript back to draft (author only, pending_review only)
publisherRouter.post(
  "/manuscripts/:idOrSlug/withdraw",
  requireAuth,
  requireTrustedOrigin,
  async (req, res) => {
    const userId = getAuth(req).user.id;
    const idOrSlug = String(req.params.idOrSlug);
    const manuscript = await withdrawManuscript(userId, idOrSlug);
    res.json({ data: manuscript });
  },
);

// Publisher Studio: Incoming manuscripts inbox (owner/editor)
publisherRouter.get("/:slug/manuscripts", requireAuth, async (req, res) => {
  const userId = getAuth(req).user.id;
  const slug = String(req.params.slug);
  const manuscripts = await listPublisherManuscripts(userId, slug);
  res.json({ data: manuscripts });
});

// Publisher Studio: Edit incoming manuscript & editorial notes (owner/editor)
publisherRouter.patch(
  "/:slug/manuscripts/:idOrSlug",
  requireAuth,
  requireTrustedOrigin,
  jsonBody,
  async (req, res) => {
    const userId = getAuth(req).user.id;
    const slug = String(req.params.slug);
    const idOrSlug = String(req.params.idOrSlug);
    const input = publisherEditManuscriptSchema.parse(req.body);
    const manuscript = await editPublisherManuscript(
      userId,
      slug,
      idOrSlug,
      input,
    );
    res.json({ data: manuscript });
  },
);

// Publisher Studio: Review incoming manuscript (start_editing | request_revision | reject)
publisherRouter.post(
  "/:slug/manuscripts/:idOrSlug/review",
  requireAuth,
  requireTrustedOrigin,
  jsonBody,
  async (req, res) => {
    const userId = getAuth(req).user.id;
    const slug = String(req.params.slug);
    const idOrSlug = String(req.params.idOrSlug);
    const input = publisherReviewManuscriptSchema.parse(req.body);
    const manuscript = await reviewPublisherManuscript(
      userId,
      slug,
      idOrSlug,
      input,
    );
    res.json({ data: manuscript });
  },
);

// Publisher Studio: Atomically publish manuscript to catalog (verified publisher + owner/editor)
publisherRouter.post(
  "/:slug/manuscripts/:idOrSlug/publish",
  requireAuth,
  requireTrustedOrigin,
  jsonBody,
  async (req, res) => {
    const userId = getAuth(req).user.id;
    const slug = String(req.params.slug);
    const idOrSlug = String(req.params.idOrSlug);
    const input = publishManuscriptSchema.parse(req.body);
    const result = await publishPublisherManuscript(
      userId,
      slug,
      idOrSlug,
      input,
    );
    res.json({ data: result });
  },
);

// Publisher Studio: List published books owned by publisher (owner/editor)
publisherRouter.get("/:slug/books", requireAuth, async (req, res) => {
  const userId = getAuth(req).user.id;
  const slug = String(req.params.slug);
  const catalog = await listPublisherBooks(userId, slug);
  res.json({ data: catalog });
});

// Publisher Studio: Update published book owned by publisher (owner/editor)
publisherRouter.patch(
  "/:slug/books/:bookId",
  requireAuth,
  requireTrustedOrigin,
  jsonBody,
  async (req, res) => {
    const userId = getAuth(req).user.id;
    const slug = String(req.params.slug);
    const bookId = String(req.params.bookId);
    const input = updatePublisherBookSchema.parse(req.body);
    const updated = await updatePublisherBook(userId, slug, bookId, input);
    res.json({ data: updated });
  },
);

// Publisher Studio: Physical store inventory management per book (owner/editor)
publisherRouter.get(
  "/:slug/books/:bookId/inventory",
  requireAuth,
  async (req, res) => {
    const userId = getAuth(req).user.id;
    const slug = String(req.params.slug);
    const bookId = String(req.params.bookId);
    const inventory = await listPublisherBookInventory(userId, slug, bookId);
    res.json({ data: inventory });
  },
);

publisherRouter.put(
  "/:slug/books/:bookId/inventory",
  requireAuth,
  requireTrustedOrigin,
  jsonBody,
  async (req, res) => {
    const userId = getAuth(req).user.id;
    const slug = String(req.params.slug);
    const bookId = String(req.params.bookId);
    const input = updateBookInventorySchema.parse(req.body);
    const inventory = await updatePublisherBookInventory(
      userId,
      slug,
      bookId,
      input,
    );
    res.json({ data: inventory });
  },
);

// Publisher Studio: Approved writers management (owner/editor)
publisherRouter.get(
  "/:slug/approved-writers",
  requireAuth,
  async (req, res) => {
    const userId = getAuth(req).user.id;
    const slug = String(req.params.slug);
    const writers = await listPublisherApprovedWriters(userId, slug);
    res.json({ data: writers });
  },
);

publisherRouter.post(
  "/:slug/approved-writers",
  requireAuth,
  requireTrustedOrigin,
  jsonBody,
  async (req, res) => {
    const userId = getAuth(req).user.id;
    const slug = String(req.params.slug);
    const input = addApprovedWriterSchema.parse(req.body);
    const created = await addPublisherApprovedWriter(userId, slug, input);
    res.status(201).json({ data: created });
  },
);

publisherRouter.delete(
  "/:slug/approved-writers/:writerId",
  requireAuth,
  requireTrustedOrigin,
  async (req, res) => {
    const userId = getAuth(req).user.id;
    const slug = String(req.params.slug);
    const writerId = String(req.params.writerId);
    const result = await removePublisherApprovedWriter(userId, slug, writerId);
    res.json({ data: result });
  },
);

// Publisher Studio: Team member management (owner only)
publisherRouter.get("/:slug/members", requireAuth, async (req, res) => {
  const userId = getAuth(req).user.id;
  const slug = String(req.params.slug);
  const members = await listPublisherMembers(userId, slug);
  res.json({ data: members });
});

publisherRouter.post(
  "/:slug/members",
  requireAuth,
  requireTrustedOrigin,
  jsonBody,
  async (req, res) => {
    const userId = getAuth(req).user.id;
    const slug = String(req.params.slug);
    const input = addPublisherMemberSchema.parse(req.body);
    const created = await addPublisherMember(userId, slug, input);
    res.status(201).json({ data: created });
  },
);

publisherRouter.patch(
  "/:slug/members/:memberId",
  requireAuth,
  requireTrustedOrigin,
  jsonBody,
  async (req, res) => {
    const userId = getAuth(req).user.id;
    const slug = String(req.params.slug);
    const memberId = String(req.params.memberId);
    const input = updatePublisherMemberSchema.parse(req.body);
    const updated = await updatePublisherMember(userId, slug, memberId, input);
    res.json({ data: updated });
  },
);

publisherRouter.delete(
  "/:slug/members/:memberId",
  requireAuth,
  requireTrustedOrigin,
  async (req, res) => {
    const userId = getAuth(req).user.id;
    const slug = String(req.params.slug);
    const memberId = String(req.params.memberId);
    const result = await removePublisherMember(userId, slug, memberId);
    res.json({ data: result });
  },
);

// Update partner publisher profile (owner only)
publisherRouter.patch(
  "/:slug",
  requireAuth,
  requireTrustedOrigin,
  jsonBody,
  async (req, res) => {
    const userId = getAuth(req).user.id;
    const slug = String(req.params.slug);
    const input = updatePublisherSchema.parse(req.body);
    const publisher = await updatePublisher(userId, slug, input);
    res.json({ data: publisher });
  },
);

// Follow / Unfollow verified publisher
publisherRouter.post(
  "/:slug/follow",
  requireAuth,
  requireTrustedOrigin,
  async (req, res) => {
    const userId = getAuth(req).user.id;
    const slug = String(req.params.slug);
    const result = await followPublisher(userId, slug);
    res.json({ data: result });
  },
);

publisherRouter.delete(
  "/:slug/follow",
  requireAuth,
  requireTrustedOrigin,
  async (req, res) => {
    const userId = getAuth(req).user.id;
    const slug = String(req.params.slug);
    const result = await unfollowPublisher(userId, slug);
    res.json({ data: result });
  },
);

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
