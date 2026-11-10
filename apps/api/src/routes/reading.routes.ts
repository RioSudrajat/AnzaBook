import { Router } from "express";
import {
  createHighlightSchema,
  createReadingSessionSchema,
  listReadingSessionsQuerySchema,
  readingBookParamsSchema,
  readingProgressQuerySchema,
  saveReadingProgressSchema,
} from "@starter/shared/validators/reading";
import { getAuth, requireAuth } from "../middleware/auth";
import { jsonBody } from "../middleware/body";
import { requireTrustedOrigin } from "../middleware/origin";
import {
  createHighlight,
  createReadingSession,
  deleteHighlight,
  getReadingProgress,
  listAllUserHighlights,
  listHighlights,
  listReadingSessions,
  listSessionsForBook,
  restartBookReading,
  saveReadingProgress,
} from "../services/reading.service";

export const readingRouter = Router();

readingRouter.use(requireAuth);

readingRouter.get("/", async (req, res) => {
  const query = listReadingSessionsQuerySchema.parse(req.query);
  const result = await listReadingSessions(getAuth(req).user.id, query);
  res.json(result);
});

readingRouter.post("/", requireTrustedOrigin, jsonBody, async (req, res) => {
  const input = createReadingSessionSchema.parse(req.body);
  const session = await createReadingSession(getAuth(req).user.id, input);
  res.status(201).json({ data: session });
});

// Reading Progress endpoints
readingRouter.get("/progress/:bookId", async (req, res) => {
  const { bookId } = readingBookParamsSchema.parse(req.params);
  const { scope } = readingProgressQuerySchema.parse(req.query);
  const progress = await getReadingProgress(
    getAuth(req).user.id,
    bookId,
    scope,
  );
  res.json({ data: progress });
});

readingRouter.put(
  "/progress/:bookId",
  requireTrustedOrigin,
  jsonBody,
  async (req, res) => {
    const { bookId } = readingBookParamsSchema.parse(req.params);
    const { scope } = readingProgressQuerySchema.parse(req.query);
    const input = saveReadingProgressSchema.parse(req.body);
    const progress = await saveReadingProgress(
      getAuth(req).user.id,
      bookId,
      scope,
      input,
    );
    res.json({ data: progress });
  },
);

// Highlights endpoints
readingRouter.get("/highlights/all", async (req, res) => {
  const highlights = await listAllUserHighlights(getAuth(req).user.id);
  res.json({ data: highlights });
});

readingRouter.get("/highlights/:bookId", async (req, res) => {
  const bookId = String(req.params.bookId);
  const highlights = await listHighlights(getAuth(req).user.id, bookId);
  res.json({ data: highlights });
});

readingRouter.post(
  "/highlights",
  requireTrustedOrigin,
  jsonBody,
  async (req, res) => {
    const input = createHighlightSchema.parse(req.body);
    const highlight = await createHighlight(getAuth(req).user.id, input);
    res.status(201).json({ data: highlight });
  },
);

readingRouter.delete(
  "/highlights/:id",
  requireTrustedOrigin,
  async (req, res) => {
    const id = String(req.params.id);
    await deleteHighlight(getAuth(req).user.id, id);
    res.json({ success: true });
  },
);

// Sessions per book
readingRouter.get("/sessions/:bookId", async (req, res) => {
  const { bookId } = readingBookParamsSchema.parse(req.params);
  const sessions = await listSessionsForBook(getAuth(req).user.id, bookId);
  res.json({ data: sessions });
});

// Restart book reading (re-read from beginning)
readingRouter.post(
  "/restart/:bookId",
  requireTrustedOrigin,
  async (req, res) => {
    const { bookId } = readingBookParamsSchema.parse(req.params);
    const result = await restartBookReading(getAuth(req).user.id, bookId);
    res.json({ data: result });
  },
);
