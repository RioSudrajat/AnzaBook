import { Router } from "express";
import {
  bookCheckoutSchema,
  bookPurchaseOrderId,
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
import { purchaseBookSchema } from "@starter/shared/validators/publisher";
import { HttpError } from "../lib/http-error";
import {
  getAuth,
  getOptionalAuth,
  optionalAuth,
  requireAuth,
} from "../middleware/auth";
import { jsonBody } from "../middleware/body";
import { requireTrustedOrigin } from "../middleware/origin";
import {
  postClaimCodeRateLimit,
  publicCatalogRateLimit,
} from "../middleware/spot-rate-limit";
import { createUserWindowLimiter } from "../middleware/user-rate-limit";
import {
  claimPrintCode,
  getBookBySlug,
  getBookPurchaseOrder,
  getBookReaderPayload,
  getReadableParagraphCount,
  getBookStock,
  listAuthors,
  listCategories,
  listCollections,
  listBooks,
  purchaseDigitalBook,
  reconcileBookPurchasePayment,
  startBookCheckout,
} from "../services/books.service";
import { membershipGateway } from "../services/membership.service";
import {
  createComment,
  createReview,
  listComments,
  listReviews,
} from "../services/community.service";

export const booksRouter = Router();

// Public: List books & catalog
booksRouter.get("/", publicCatalogRateLimit, async (req, res) => {
  const query = listBooksQuerySchema.parse(req.query);
  const result = await listBooks(query);
  res.json(result);
});

// Public: Authors list
booksRouter.get("/meta/authors", async (_req, res) => {
  const authors = await listAuthors();
  res.json({ data: authors });
});

// Public: Collections list
booksRouter.get("/meta/collections", async (_req, res) => {
  const collections = await listCollections();
  res.json({ data: collections });
});

// Public: Categories list
booksRouter.get("/meta/categories", async (_req, res) => {
  const categories = await listCategories();
  res.json({ data: categories });
});

const limitBookPurchaseStatusRefresh = createUserWindowLimiter({
  limit: 20,
  code: "STATUS_RATE_LIMIT",
  message: "Terlalu banyak pemeriksaan status pembelian. Coba lagi nanti.",
});

// Protected: Get single book Midtrans purchase order
booksRouter.get("/purchases/:purchaseId", requireAuth, async (req, res) => {
  const purchaseId = bookPurchaseOrderId.parse(req.params.purchaseId);
  const order = await getBookPurchaseOrder(getAuth(req).user.id, purchaseId);
  res.json({ data: order });
});

// Protected: Refresh single book Midtrans purchase order status
booksRouter.post(
  "/purchases/:purchaseId/refresh",
  requireAuth,
  requireTrustedOrigin,
  async (req, res) => {
    const buyerId = getAuth(req).user.id;
    const purchaseId = bookPurchaseOrderId.parse(req.params.purchaseId);
    const order = await getBookPurchaseOrder(buyerId, purchaseId);
    if (
      order.status === "pending" ||
      order.status === "failed" ||
      order.status === "expired"
    ) {
      limitBookPurchaseStatusRefresh(buyerId);
      const payment = await membershipGateway().getPayment(purchaseId);
      if (payment) await reconcileBookPurchasePayment(payment);
    }
    res.json({ data: await getBookPurchaseOrder(buyerId, purchaseId) });
  },
);

// Public with optional auth: Book details
booksRouter.get(
  "/:slug",
  publicCatalogRateLimit,
  optionalAuth,
  async (req, res) => {
    const { slug } = bookSlugSchema.parse({ slug: req.params.slug });
    const auth = getOptionalAuth(req);
    const book = await getBookBySlug(slug, auth?.user?.id);
    if (!book)
      throw new HttpError(404, "BOOK_NOT_FOUND", "Buku tidak ditemukan.");
    res.json({ data: book });
  },
);

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
    query,
    auth.session.id,
    {
      userRole: auth.user.role,
      userAgent: req.get("user-agent") ?? null,
      ipAddress: req.ip ?? req.socket.remoteAddress ?? null,
    },
  );
  res.json({ data: payload });
});

// Protected: Claim physical book code
booksRouter.post(
  "/:slug/claim-code",
  requireAuth,
  requireTrustedOrigin,
  postClaimCodeRateLimit,
  jsonBody,
  async (req, res) => {
    const { slug } = bookSlugSchema.parse({ slug: req.params.slug });
    const auth = getAuth(req);
    const { code } = claimPrintCodeSchema.parse(req.body);
    const result = await claimPrintCode(slug, auth.user.id, code);
    res.json({ data: result });
  },
);

// Protected: Start Midtrans QRIS checkout for a single_purchase digital book
booksRouter.post(
  "/:slug/checkout",
  requireAuth,
  requireTrustedOrigin,
  jsonBody,
  async (req, res) => {
    const { slug } = bookSlugSchema.parse({ slug: req.params.slug });
    const auth = getAuth(req);
    const input = bookCheckoutSchema.parse(req.body);
    const order = await startBookCheckout(auth.user.id, slug, input);
    res
      .status(201)
      .location(`/api/books/purchases/${order.id}`)
      .json({ data: order });
  },
);

// Protected: Purchase single book permanently (75% publisher, 10% community affiliate, 15% AnzaBook)
booksRouter.post(
  "/:slug/purchase",
  requireAuth,
  requireTrustedOrigin,
  jsonBody,
  async (req, res) => {
    const { slug } = bookSlugSchema.parse({ slug: req.params.slug });
    const auth = getAuth(req);
    const input = purchaseBookSchema.parse({
      ...req.body,
      affiliateCalendarSlug:
        req.body?.affiliateCalendarSlug ??
        (typeof req.query.affiliateCalendarSlug === "string"
          ? req.query.affiliateCalendarSlug
          : undefined),
      affiliateCalendarId:
        req.body?.affiliateCalendarId ??
        (typeof req.query.affiliateCalendarId === "string"
          ? req.query.affiliateCalendarId
          : undefined),
    });
    const result = await purchaseDigitalBook(auth.user.id, slug, input);
    res.status(201).json({ data: result });
  },
);

// Reviews
booksRouter.get("/:slug/reviews", async (req, res) => {
  const { slug } = bookSlugSchema.parse({ slug: req.params.slug });
  const book = await getBookBySlug(slug);
  if (!book)
    throw new HttpError(404, "BOOK_NOT_FOUND", "Buku tidak ditemukan.");
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
    if (!book)
      throw new HttpError(404, "BOOK_NOT_FOUND", "Buku tidak ditemukan.");
    const auth = getAuth(req);
    const input = createReviewSchema.parse(req.body);
    if (input.bookId !== book.id) {
      throw new HttpError(
        422,
        "REVIEW_BOOK_MISMATCH",
        "Ulasan tidak sesuai dengan buku.",
      );
    }
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
booksRouter.get("/:slug/comments", requireAuth, async (req, res) => {
  const { slug } = bookSlugSchema.parse({ slug: req.params.slug });
  const query = listParagraphCommentsQuerySchema.parse(req.query);
  const paragraphCount = await getReadableParagraphCount(
    slug,
    query.chapterId,
    getAuth(req).user.id,
  );
  const comments = await listComments(query.chapterId, paragraphCount);
  res.json({ data: comments });
});

booksRouter.post(
  "/:slug/comments",
  requireAuth,
  requireTrustedOrigin,
  jsonBody,
  async (req, res) => {
    const { slug } = bookSlugSchema.parse({ slug: req.params.slug });
    const auth = getAuth(req);
    const input = createParagraphCommentSchema.parse(req.body);
    const paragraphCount = await getReadableParagraphCount(
      slug,
      input.chapterId,
      auth.user.id,
    );
    if (input.paragraphIndex >= paragraphCount) {
      throw new HttpError(
        422,
        "INVALID_PARAGRAPH",
        "Paragraf ini berada di luar bagian yang dapat dibaca.",
      );
    }
    const comment = await createComment(auth.user.id, auth.user.name, input);
    res.status(201).json({ data: comment });
  },
);
