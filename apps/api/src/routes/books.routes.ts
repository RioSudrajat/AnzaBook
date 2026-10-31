import { Router } from "express";
import {
  bookSlugSchema,
  claimPrintCodeSchema,
  listBooksQuerySchema,
  readBookQuerySchema,
  stockQuerySchema,
} from "@starter/shared/validators/books";
import {
  createParagraphCommentSchema,
  createReviewSchema,
  listParagraphCommentsQuerySchema,
} from "@starter/shared/validators/community";
import { HttpError } from "../lib/http-error";
import { getAuth, getOptionalAuth, optionalAuth, requireAuth } from "../middleware/auth";
import { jsonBody } from "../middleware/body";
import { requireTrustedOrigin } from "../middleware/origin";
import {
  claimPrintCode,
  getBookBySlug,
  getBookReaderPayload,
  getBookStock,
  listBooks,
} from "../services/books.service";
import {
  createComment,
  createReview,
  listComments,
  listReviews,
} from "../services/community.service";

export const booksRouter = Router();

// Public: List books & catalog
booksRouter.get("/", async (req, res) => {
  const query = listBooksQuerySchema.parse(req.query);
  const result = await listBooks(query);
  res.json(result);
});

// Public with optional auth: Book details
booksRouter.get("/:slug", optionalAuth, async (req, res) => {
  const { slug } = bookSlugSchema.parse({ slug: req.params.slug });
  const auth = getOptionalAuth(req);
  const book = await getBookBySlug(slug, auth?.user?.id);
  if (!book) throw new HttpError(404, "BOOK_NOT_FOUND", "Buku tidak ditemukan.");
  res.json({ data: book });
});

// Public: Live store stock
booksRouter.get("/:slug/stock", async (req, res) => {
  const { slug } = bookSlugSchema.parse({ slug: req.params.slug });
  const query = stockQuerySchema.parse(req.query);
  const stocks = await getBookStock(slug, query);
  res.json({ data: stocks });
});

// Protected: Reader payload with DRM watermark
booksRouter.get("/:slug/read", requireAuth, async (req, res) => {
  const { slug } = bookSlugSchema.parse({ slug: req.params.slug });
  const query = readBookQuerySchema.parse(req.query);
  const auth = getAuth(req);
  const payload = await getBookReaderPayload(
    slug,
    auth.user.id,
    auth.user.email,
    query,
  );
  res.json({ data: payload });
});

// Protected: Claim physical book code
booksRouter.post(
  "/:slug/claim-code",
  requireAuth,
  requireTrustedOrigin,
  jsonBody,
  async (req, res) => {
    const { slug } = bookSlugSchema.parse({ slug: req.params.slug });
    const auth = getAuth(req);
    const { code } = claimPrintCodeSchema.parse(req.body);
    const result = await claimPrintCode(slug, auth.user.id, code);
    res.json({ data: result });
  },
);

// Reviews
booksRouter.get("/:slug/reviews", async (req, res) => {
  const { slug } = bookSlugSchema.parse({ slug: req.params.slug });
  const book = await getBookBySlug(slug);
  if (!book) throw new HttpError(404, "BOOK_NOT_FOUND", "Buku tidak ditemukan.");
  const reviews = await listReviews(book.id);
  res.json({ data: reviews });
});

booksRouter.post(
  "/:slug/reviews",
  requireAuth,
  requireTrustedOrigin,
  jsonBody,
  async (req, res) => {
    const { slug } = bookSlugSchema.parse({ slug: req.params.slug });
    const book = await getBookBySlug(slug);
    if (!book) throw new HttpError(404, "BOOK_NOT_FOUND", "Buku tidak ditemukan.");
    const auth = getAuth(req);
    const input = createReviewSchema.parse(req.body);
    const review = await createReview(
      auth.user.id,
      auth.user.name,
      auth.user.role || "user",
      input,
    );
    res.status(201).json({ data: review });
  },
);

// Marginalia Paragraph Comments
booksRouter.get("/:slug/comments", async (req, res) => {
  bookSlugSchema.parse({ slug: req.params.slug });
  const query = listParagraphCommentsQuerySchema.parse(req.query);
  const comments = await listComments(query.chapterId);
  res.json({ data: comments });
});

booksRouter.post(
  "/:slug/comments",
  requireAuth,
  requireTrustedOrigin,
  jsonBody,
  async (req, res) => {
    bookSlugSchema.parse({ slug: req.params.slug });
    const auth = getAuth(req);
    const input = createParagraphCommentSchema.parse(req.body);
    const comment = await createComment(auth.user.id, auth.user.name, input);
    res.status(201).json({ data: comment });
  },
);
