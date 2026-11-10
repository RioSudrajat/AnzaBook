import { Router, type RequestHandler } from "express";
import {
  adminEditManuscriptSchema,
  adminListQuerySchema,
  adminPublishManuscriptSchema,
  adminReviewAuthorApplicationSchema,
  adminVerifyCalendarSchema,
  adminVerifyPublisherSchema,
} from "@starter/shared/validators/admin";
import {
  listNotesSchema,
  noteIdSchema,
} from "@starter/shared/validators/notes";
import { createClaimBatchSchema } from "@starter/shared/validators/publisher";
import { HttpError } from "../lib/http-error";
import { getAuth, requireAuth, requirePermission } from "../middleware/auth";
import { jsonBody } from "../middleware/body";
import { requireTrustedOrigin } from "../middleware/origin";
import {
  createAdminClaimBatch,
  getAdminClaimBatchCodes,
  getAdminManuscriptById,
  getAdminOverview,
  listAdminAuthorApplications,
  listAdminCalendars,
  listAdminManuscripts,
  listAdminPublishers,
  publishAdminManuscript,
  reviewAdminAuthorApplication,
  updateAdminManuscript,
  verifyAdminCalendar,
  verifyAdminPublisher,
} from "../services/admin-cms.service";
import { deleteAnyNote, listAnyNotes } from "../services/notes.service";

export const adminRouter = Router();

// Require admin role for all admin routes. Non-admins get 403 FORBIDDEN.
const requireAdmin: RequestHandler = (req, _res, next) => {
  const user = getAuth(req).user;
  const roles = (user.role || "").split(",").map((r) => r.trim());
  if (!roles.includes("admin")) {
    throw new HttpError(
      403,
      "FORBIDDEN",
      "Your account cannot perform this action.",
    );
  }
  next();
};

adminRouter.use(requireAuth, requireTrustedOrigin, requireAdmin);

// ---------------- Admin Overview ---------------- //

adminRouter.get("/overview", async (_req, res) => {
  const overview = await getAdminOverview();
  res.json({ data: overview });
});

// ---------------- Calendars Verification ---------------- //

adminRouter.get("/calendars", async (req, res) => {
  const query = adminListQuerySchema.parse(req.query);
  const calendars = await listAdminCalendars(query);
  res.json({ data: calendars });
});

adminRouter.patch("/calendars/:id/verify", jsonBody, async (req, res) => {
  const input = adminVerifyCalendarSchema.parse(req.body);
  const calendar = await verifyAdminCalendar(req.params.id as string, input);
  res.json({ data: calendar });
});

// ---------------- Author Applications ---------------- //

adminRouter.get("/author-applications", async (req, res) => {
  const query = adminListQuerySchema.parse(req.query);
  const applications = await listAdminAuthorApplications(query);
  res.json({ data: applications });
});

adminRouter.patch(
  "/author-applications/:id/review",
  jsonBody,
  async (req, res) => {
    const input = adminReviewAuthorApplicationSchema.parse(req.body);
    const reviewerUserId = getAuth(req).user.id;
    const application = await reviewAdminAuthorApplication(
      req.params.id as string,
      reviewerUserId,
      input,
    );
    res.json({ data: application });
  },
);

// ---------------- Publishers Verification ---------------- //

adminRouter.get("/publishers", async (req, res) => {
  const query = adminListQuerySchema.parse(req.query);
  const publishersList = await listAdminPublishers(query);
  res.json({ data: publishersList });
});

adminRouter.patch("/publishers/:id/verify", jsonBody, async (req, res) => {
  const input = adminVerifyPublisherSchema.parse(req.body);
  const publisher = await verifyAdminPublisher(req.params.id as string, input);
  res.json({ data: publisher });
});

// ---------------- Manuscripts & Catalog Publishing ---------------- //

adminRouter.get("/manuscripts", async (req, res) => {
  const query = adminListQuerySchema.parse(req.query);
  const manuscripts = await listAdminManuscripts(query);
  res.json({ data: manuscripts });
});

adminRouter.get("/manuscripts/:id", async (req, res) => {
  const manuscript = await getAdminManuscriptById(req.params.id as string);
  res.json({ data: manuscript });
});

adminRouter.patch("/manuscripts/:id", jsonBody, async (req, res) => {
  const input = adminEditManuscriptSchema.parse(req.body);
  const manuscript = await updateAdminManuscript(req.params.id as string, input);
  res.json({ data: manuscript });
});

adminRouter.post("/manuscripts/:id/publish", jsonBody, async (req, res) => {
  const input = adminPublishManuscriptSchema.parse(req.body);
  const result = await publishAdminManuscript(req.params.id as string, input);
  res.json({ data: result });
});

// ---------------- Claim Code Batches (Skema A Phygital) ---------------- //

adminRouter.post("/claim-batches", jsonBody, async (req, res) => {
  const input = createClaimBatchSchema.parse(req.body);
  const result = await createAdminClaimBatch(input);
  res.status(201).json({ data: result });
});

adminRouter.get("/claim-batches/:id/codes", async (req, res) => {
  const result = await getAdminClaimBatchCodes(req.params.id as string);
  res.json({ data: result });
});

// ---------------- Existing Notes Management ---------------- //

adminRouter.get(
  "/notes",
  requirePermission({ notes: ["read-any"] }),
  async (req, res) => {
    const query = listNotesSchema.parse(req.query);
    res.json(await listAnyNotes(query));
  },
);

adminRouter.delete(
  "/notes/:id",
  requirePermission({ notes: ["delete-any"] }),
  async (req, res) => {
    const id = noteIdSchema.parse(req.params.id);
    if (!(await deleteAnyNote(id)))
      throw new HttpError(404, "NOT_FOUND", "Note not found.");
    res.status(204).end();
  },
);
