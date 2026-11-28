import {
  and,
  desc,
  eq,
  gt,
  gte,
  ilike,
  isNull,
  lte,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "../db";
import { env } from "../config/env";
import {
  books,
  bookChapters,
  bookPrintEditions,
  bookClaimCodes,
  bookPurchases,
  communityCalendars,
  communityEvents,
  communityWalletLedgers,
  eventRsvps,
  publisherMembers,
  publishers,
  storeBranches,
  storeInventories,
  user,
  userShelves,
} from "../db/schema";
import { HttpError } from "../lib/http-error";
import {
  assertReaderNotSuspended,
  enforceChapterWindowRateLimit,
  issueOrGetDrmWatermarkSession,
} from "./drm.service";
import { getActiveMembership, membershipGateway } from "./membership.service";
import type { VerifiedPayment } from "./membership-payment";
import { membershipTaxBreakdown, nextOrderStatus } from "./membership-policy";
import { countContentWords } from "@starter/shared/reading-progress";
import type {
  BookCheckoutInput,
  ListBooksQuery,
  ReadBookQuery,
  StockQuery,
} from "@starter/shared/validators/books";
import type { PurchaseBookInput } from "@starter/shared/validators/publisher";
import type {
  AccessTier,
  BookChapterSummaryDto,
  BookDetailDto,
  BookDistributionModel,
  BookPurchaseDto,
  BookPurchaseOrderDto,
  BookReaderPayloadDto,
  BookSummaryDto,
  CommunityEventSummaryDto,
  EditionTier,
  PartnerType,
  StoreStockItemDto,
} from "@starter/shared/types";

export async function listBookChapters(
  bookId: string,
  userId?: string,
): Promise<BookChapterSummaryDto[]> {
  const chapters = await db
    .select({
      id: bookChapters.id,
      chapterNumber: bookChapters.chapterNumber,
      title: bookChapters.titleId,
      contentId: bookChapters.contentId,
    })
    .from(bookChapters)
    .where(eq(bookChapters.bookId, bookId))
    .orderBy(bookChapters.chapterNumber);

  const hasEventAccess = userId
    ? await hasActiveEventBookSampleAccess(bookId, userId)
    : false;

  return chapters.map(({ contentId, ...chapter }) => ({
    ...chapter,
    isSample:
      chapter.chapterNumber === 1 ||
      (hasEventAccess && chapter.chapterNumber === 2),
    wordCount: countContentWords(contentId),
  }));
}

export async function hasActiveEventBookSampleAccess(
  bookId: string,
  userId: string,
): Promise<boolean> {
  const [activeRsvp] = await db
    .select({ id: eventRsvps.id })
    .from(eventRsvps)
    .innerJoin(communityEvents, eq(eventRsvps.eventId, communityEvents.id))
    .where(
      and(
        eq(eventRsvps.userId, userId),
        eq(eventRsvps.status, "going"),
        eq(communityEvents.bookId, bookId),
      ),
    )
    .limit(1);

  return !!activeRsvp;
}

async function hasClaimedBook(
  bookId: string,
  userId: string,
): Promise<boolean> {
  const [claim] = await db
    .select({ id: bookClaimCodes.id })
    .from(bookClaimCodes)
    .where(
      and(
        eq(bookClaimCodes.bookId, bookId),
        eq(bookClaimCodes.claimedByUserId, userId),
        env.isProduction ? eq(bookClaimCodes.isDemo, false) : undefined,
      ),
    )
    .limit(1);
  return !!claim;
}

export async function hasPurchasedBook(
  bookId: string,
  userId: string,
): Promise<boolean> {
  const [purchase] = await db
    .select({ id: bookPurchases.id })
    .from(bookPurchases)
    .where(
      and(
        eq(bookPurchases.bookId, bookId),
        eq(bookPurchases.userId, userId),
        eq(bookPurchases.status, "paid"),
      ),
    )
    .limit(1);
  return !!purchase;
}

export async function getBookReadAccess(
  book: Pick<typeof books.$inferSelect, "id" | "digitalPolicy">,
  userId: string,
): Promise<{
  hasFullAccess: boolean;
  accessExpiresAt: string | null;
  hasEventSampleAccess: boolean;
}> {
  const hasEventSampleAccess = await hasActiveEventBookSampleAccess(
    book.id,
    userId,
  );

  // 1. free_open is open for everyone logged in
  if (book.digitalPolicy === "free_open") {
    return { hasFullAccess: true, accessExpiresAt: null, hasEventSampleAccess };
  }

  // 2. Physical claim code unlocks all paid digital policies
  const isClaimed = await hasClaimedBook(book.id, userId);
  if (isClaimed) {
    return { hasFullAccess: true, accessExpiresAt: null, hasEventSampleAccess };
  }

  // 3. Single purchase: permanent digital purchase required. Nakama membership does NOT unlock.
  if (book.digitalPolicy === "single_purchase") {
    const isPurchased = await hasPurchasedBook(book.id, userId);
    return {
      hasFullAccess: isPurchased,
      accessExpiresAt: null,
      hasEventSampleAccess,
    };
  }

  // 4. Nakama subscription: active Nakama membership unlocks
  const membership =
    book.digitalPolicy === "nakama_subscription"
      ? await getActiveMembership(userId)
      : null;

  return {
    hasFullAccess: !!membership,
    accessExpiresAt: membership?.expiresAt.toISOString() ?? null,
    hasEventSampleAccess,
  };
}

export async function resolveCommunityAffiliateAttribution(
  userId: string,
  input?: {
    affiliateCalendarSlug?: string | null;
    affiliateCalendarId?: string | null;
  },
): Promise<string | null> {
  // Priority 1: Explicit calendar ID
  if (input?.affiliateCalendarId) {
    const [cal] = await db
      .select({ id: communityCalendars.id })
      .from(communityCalendars)
      .where(eq(communityCalendars.id, input.affiliateCalendarId))
      .limit(1);
    if (cal) return cal.id;
  }

  // Priority 1 (alt): Explicit calendar slug
  if (input?.affiliateCalendarSlug) {
    const [cal] = await db
      .select({ id: communityCalendars.id })
      .from(communityCalendars)
      .where(eq(communityCalendars.slug, input.affiliateCalendarSlug))
      .limit(1);
    if (cal) return cal.id;
  }

  // Priority 2: Published community events attended by user (status: "going") within last 14 days
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const [recentRsvp] = await db
    .select({ calendarId: communityEvents.calendarId })
    .from(eventRsvps)
    .innerJoin(communityEvents, eq(eventRsvps.eventId, communityEvents.id))
    .where(
      and(
        eq(eventRsvps.userId, userId),
        eq(eventRsvps.status, "going"),
        eq(communityEvents.status, "published"),
        or(
          gte(communityEvents.startsAt, fourteenDaysAgo),
          gte(eventRsvps.createdAt, fourteenDaysAgo),
        ),
      ),
    )
    .orderBy(desc(eventRsvps.createdAt))
    .limit(1);

  if (recentRsvp?.calendarId) {
    return recentRsvp.calendarId;
  }

  return null;
}

function toBookPurchaseDto(
  purchase: typeof bookPurchases.$inferSelect,
  book?: Pick<typeof books.$inferSelect, "slug" | "title" | "coverUrl">,
): BookPurchaseDto {
  return {
    id: purchase.id,
    userId: purchase.userId,
    bookId: purchase.bookId,
    bookSlug: book?.slug,
    bookTitle: book?.title,
    bookCoverUrl: book?.coverUrl,
    priceIdr: purchase.priceIdr,
    tax:
      purchase.subtotalIdr === null ||
      purchase.taxIdr === null ||
      purchase.taxRateBps === null
        ? null
        : {
            subtotalIdr: purchase.subtotalIdr,
            taxIdr: purchase.taxIdr,
            rateBps: purchase.taxRateBps,
          },
    publisherShareIdr: purchase.publisherShareIdr,
    affiliateCalendarId: purchase.affiliateCalendarId,
    affiliateCommissionIdr: purchase.affiliateCommissionIdr,
    anzabookNetIdr: purchase.anzabookNetIdr,
    status: purchase.status,
    paymentMethod: purchase.paymentMethod,
    checkoutUrl: purchase.checkoutUrl,
    createdAt: purchase.createdAt.toISOString(),
    paidAt: purchase.paidAt?.toISOString() ?? null,
  };
}

const BOOK_DAY_MS = 24 * 60 * 60 * 1000;
const BOOK_CHECKOUT_WINDOW_MS = 10 * 60 * 1000;
const BOOK_CHECKOUT_LIMIT = 6;

function toBookPurchaseOrderDto(
  purchase: typeof bookPurchases.$inferSelect,
  book: Pick<typeof books.$inferSelect, "slug" | "title" | "coverUrl">,
): BookPurchaseOrderDto {
  const awaitingPayment =
    purchase.status === "pending" || purchase.status === "failed";
  const linkExpired =
    awaitingPayment &&
    Boolean(
      purchase.checkoutCreatedAt &&
      Date.now() - purchase.checkoutCreatedAt.getTime() >= BOOK_DAY_MS,
    );
  return {
    id: purchase.id,
    bookId: purchase.bookId,
    bookSlug: book.slug,
    bookTitle: book.title,
    bookCoverUrl: book.coverUrl,
    priceIdr: purchase.priceIdr,
    tax:
      purchase.subtotalIdr === null ||
      purchase.taxIdr === null ||
      purchase.taxRateBps === null
        ? null
        : {
            subtotalIdr: purchase.subtotalIdr,
            taxIdr: purchase.taxIdr,
            rateBps: purchase.taxRateBps,
          },
    status: linkExpired ? "expired" : purchase.status,
    checkoutUrl: awaitingPayment && !linkExpired ? purchase.checkoutUrl : null,
    createdAt: purchase.createdAt.toISOString(),
    paidAt: purchase.paidAt?.toISOString() ?? null,
  };
}

async function reserveBookCheckoutOrder(
  userId: string,
  slug: string,
  input: BookCheckoutInput,
) {
  return db.transaction(async (tx) => {
    await tx
      .select({ id: user.id })
      .from(user)
      .where(eq(user.id, userId))
      .for("no key update");

    const [book] = await tx
      .select()
      .from(books)
      .where(and(eq(books.slug, slug), eq(books.isArchived, false)))
      .limit(1);

    if (!book) {
      throw new HttpError(404, "BOOK_NOT_FOUND", "Buku tidak ditemukan.");
    }
    if (
      book.digitalPolicy !== "single_purchase" ||
      book.digitalPriceIdr === null ||
      book.digitalPriceIdr <= 0
    ) {
      throw new HttpError(
        400,
        "BOOK_NOT_PURCHASABLE",
        "Buku ini tidak tersedia untuk pembelian satuan digital.",
      );
    }

    const [existingRequest] = await tx
      .select()
      .from(bookPurchases)
      .where(
        and(
          eq(bookPurchases.userId, userId),
          eq(bookPurchases.requestId, input.requestId),
        ),
      );
    if (existingRequest) {
      if (existingRequest.bookId !== book.id) {
        throw new HttpError(
          409,
          "CHECKOUT_CONFLICT",
          "Pesanan buku berubah. Buat pesanan baru.",
        );
      }
      return { purchaseId: existingRequest.id, book };
    }

    const [alreadyPaid] = await tx
      .select({ id: bookPurchases.id })
      .from(bookPurchases)
      .where(
        and(
          eq(bookPurchases.bookId, book.id),
          eq(bookPurchases.userId, userId),
          eq(bookPurchases.status, "paid"),
        ),
      );
    if (alreadyPaid) {
      throw new HttpError(
        409,
        "BOOK_ALREADY_PURCHASED",
        "Buku ini sudah Anda miliki secara penuh.",
      );
    }

    const recent = await tx
      .select({ id: bookPurchases.id })
      .from(bookPurchases)
      .where(
        and(
          eq(bookPurchases.userId, userId),
          gt(
            bookPurchases.createdAt,
            new Date(Date.now() - BOOK_CHECKOUT_WINDOW_MS),
          ),
        ),
      )
      .limit(BOOK_CHECKOUT_LIMIT);
    if (recent.length >= BOOK_CHECKOUT_LIMIT) {
      throw new HttpError(
        429,
        "CHECKOUT_RATE_LIMIT",
        "Terlalu banyak percobaan pembayaran buku. Coba lagi nanti.",
      );
    }

    const rateBps = env.membershipTaxRateBps;
    if (rateBps === null) {
      throw new HttpError(
        503,
        "PAYMENT_UNAVAILABLE",
        "Perhitungan pajak pembayaran belum tersedia.",
      );
    }
    const tax = membershipTaxBreakdown(book.digitalPriceIdr, rateBps);
    const grossPriceIdr = tax.subtotalIdr + tax.taxIdr;
    const subtotalForShare = tax.subtotalIdr;

    const affiliateCalendarId = await resolveCommunityAffiliateAttribution(
      userId,
      input,
    );
    const publisherShareIdr = Math.round(subtotalForShare * 0.75);
    const affiliateCommissionIdr = affiliateCalendarId
      ? Math.round(subtotalForShare * 0.1)
      : 0;
    const anzabookNetIdr =
      subtotalForShare - publisherShareIdr - affiliateCommissionIdr;

    const [inserted] = await tx
      .insert(bookPurchases)
      .values({
        requestId: input.requestId,
        userId,
        bookId: book.id,
        priceIdr: grossPriceIdr,
        subtotalIdr: tax.subtotalIdr,
        taxIdr: tax.taxIdr,
        taxRateBps: tax.rateBps,
        currency: "IDR",
        publisherShareIdr,
        affiliateCalendarId,
        affiliateCommissionIdr,
        anzabookNetIdr,
        status: "pending",
        paymentMethod: "qris",
      })
      .returning({ id: bookPurchases.id });

    return { purchaseId: inserted.id, book };
  });
}

export async function startBookCheckout(
  userId: string,
  slug: string,
  input: BookCheckoutInput,
): Promise<BookPurchaseOrderDto> {
  const gateway = membershipGateway();
  const { purchaseId, book } = await reserveBookCheckoutOrder(
    userId,
    slug,
    input,
  );

  return db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(bookPurchases)
      .where(
        and(eq(bookPurchases.id, purchaseId), eq(bookPurchases.userId, userId)),
      )
      .for("update");

    if (!order) {
      throw new HttpError(404, "ORDER_NOT_FOUND", "Pesanan tidak ditemukan.");
    }
    if (order.checkoutUrl || order.status !== "pending") {
      return toBookPurchaseOrderDto(order, book);
    }

    const subtotalIdr = order.subtotalIdr ?? order.priceIdr;
    const taxIdr = order.taxIdr ?? 0;

    const checkoutUrl = await gateway.createBookCheckout({
      id: order.id,
      bookSlug: book.slug,
      bookTitle: book.title,
      priceIdr: order.priceIdr,
      subtotalIdr,
      taxIdr,
    });

    const [updated] = await tx
      .update(bookPurchases)
      .set({
        checkoutUrl,
        checkoutCreatedAt: new Date(),
      })
      .where(eq(bookPurchases.id, order.id))
      .returning();

    return toBookPurchaseOrderDto(updated, book);
  });
}

export async function getBookPurchaseOrder(
  userId: string,
  purchaseId: string,
): Promise<BookPurchaseOrderDto> {
  const [row] = await db
    .select({
      purchase: bookPurchases,
      book: {
        slug: books.slug,
        title: books.title,
        coverUrl: books.coverUrl,
      },
    })
    .from(bookPurchases)
    .innerJoin(books, eq(bookPurchases.bookId, books.id))
    .where(
      and(eq(bookPurchases.id, purchaseId), eq(bookPurchases.userId, userId)),
    )
    .limit(1);

  if (!row) {
    throw new HttpError(
      404,
      "ORDER_NOT_FOUND",
      "Pesanan buku tidak ditemukan.",
    );
  }

  return toBookPurchaseOrderDto(row.purchase, row.book);
}

export async function bookPurchaseOrderExists(
  orderId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: bookPurchases.id })
    .from(bookPurchases)
    .where(eq(bookPurchases.id, orderId))
    .limit(1);
  return Boolean(row);
}

export async function reconcileBookPurchasePayment(payment: VerifiedPayment) {
  await db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(bookPurchases)
      .where(eq(bookPurchases.id, payment.orderId))
      .for("update");

    if (!order) return;

    if (
      order.priceIdr !== payment.priceIdr ||
      order.currency !== payment.currency
    ) {
      throw new HttpError(
        409,
        "PAYMENT_AMOUNT_MISMATCH",
        "Nominal pembayaran tidak cocok dengan harga buku.",
      );
    }

    if (
      order.paidTransactionId &&
      order.paidTransactionId !== payment.transactionId
    ) {
      return;
    }

    const status = nextOrderStatus(order.status, payment.status);
    if (status === order.status) return;

    const changedToPaid = status === "paid";
    const paidAt = changedToPaid
      ? new Date(
          Math.max(
            order.createdAt.getTime(),
            Math.min(payment.paidAt?.getTime() ?? Date.now(), Date.now()),
          ),
        )
      : order.paidAt;

    await tx
      .update(bookPurchases)
      .set({
        status,
        paidAt,
        paidTransactionId: changedToPaid
          ? payment.transactionId
          : order.paidTransactionId,
      })
      .where(eq(bookPurchases.id, order.id));

    if (
      changedToPaid &&
      order.affiliateCalendarId &&
      order.affiliateCommissionIdr > 0
    ) {
      const [existingLedger] = await tx
        .select({ id: communityWalletLedgers.id })
        .from(communityWalletLedgers)
        .where(
          and(
            eq(communityWalletLedgers.calendarId, order.affiliateCalendarId),
            eq(communityWalletLedgers.entryType, "affiliate_book_purchase"),
            eq(communityWalletLedgers.sourceBookPurchaseId, order.id),
          ),
        )
        .limit(1);

      if (!existingLedger) {
        const [book] = await tx
          .select({ title: books.title })
          .from(books)
          .where(eq(books.id, order.bookId))
          .limit(1);
        await tx.insert(communityWalletLedgers).values({
          calendarId: order.affiliateCalendarId,
          entryType: "affiliate_book_purchase",
          amountIdr: order.affiliateCommissionIdr,
          sourceBookPurchaseId: order.id,
          description: `Komisi afiliasi pembelian buku "${book?.title ?? "AnzaBook"}"`,
        });
      }
    }
  });
}

export async function purchaseDigitalBook(
  userId: string,
  slug: string,
  input?: PurchaseBookInput,
): Promise<BookPurchaseDto> {
  if (env.MIDTRANS_ENV === "production") {
    throw new HttpError(
      503,
      "PAYMENT_UNAVAILABLE",
      "Pembelian buku satuan langsung belum tersedia pada mode produksi.",
    );
  }

  const [book] = await db
    .select()
    .from(books)
    .where(and(eq(books.slug, slug), eq(books.isArchived, false)))
    .limit(1);

  if (!book) {
    throw new HttpError(404, "BOOK_NOT_FOUND", "Buku tidak ditemukan.");
  }

  if (
    book.digitalPriceIdr === null ||
    book.digitalPriceIdr <= 0 ||
    book.digitalPolicy !== "single_purchase"
  ) {
    throw new HttpError(
      400,
      "BOOK_NOT_PURCHASABLE",
      "Buku ini tidak tersedia untuk pembelian satuan digital.",
    );
  }

  if (input?.bookId && input.bookId !== book.id) {
    throw new HttpError(
      422,
      "BOOK_ID_MISMATCH",
      "ID buku tidak cocok dengan slug buku.",
    );
  }

  const alreadyPurchased = await hasPurchasedBook(book.id, userId);
  if (alreadyPurchased) {
    throw new HttpError(
      409,
      "BOOK_ALREADY_PURCHASED",
      "Buku ini sudah Anda beli.",
    );
  }

  const priceIdr = book.digitalPriceIdr;
  const publisherShareIdr = Math.round(priceIdr * 0.75);
  const affiliateCalendarId = await resolveCommunityAffiliateAttribution(
    userId,
    input,
  );
  const affiliateCommissionIdr = affiliateCalendarId
    ? Math.round(priceIdr * 0.1)
    : 0;
  const anzabookNetIdr = priceIdr - publisherShareIdr - affiliateCommissionIdr;

  const purchase = await db.transaction(async (tx) => {
    await tx
      .select({ id: user.id })
      .from(user)
      .where(eq(user.id, userId))
      .for("no key update");

    const [existing] = await tx
      .select({ id: bookPurchases.id })
      .from(bookPurchases)
      .where(
        and(
          eq(bookPurchases.bookId, book.id),
          eq(bookPurchases.userId, userId),
          eq(bookPurchases.status, "paid"),
        ),
      );

    if (existing) {
      throw new HttpError(
        409,
        "BOOK_ALREADY_PURCHASED",
        "Buku ini sudah Anda beli.",
      );
    }

    const [inserted] = await tx
      .insert(bookPurchases)
      .values({
        userId,
        bookId: book.id,
        priceIdr,
        publisherShareIdr,
        affiliateCalendarId,
        affiliateCommissionIdr,
        anzabookNetIdr,
        status: "paid",
        paidAt: new Date(),
        paymentMethod: input?.paymentMethod || "manual_or_midtrans",
      })
      .returning();

    if (affiliateCalendarId && affiliateCommissionIdr > 0) {
      await tx.insert(communityWalletLedgers).values({
        calendarId: affiliateCalendarId,
        entryType: "affiliate_book_purchase",
        amountIdr: affiliateCommissionIdr,
        sourceBookPurchaseId: inserted.id,
        description: `Komisi afiliasi pembelian buku "${book.title}"`,
      });
    }

    return inserted;
  });

  return toBookPurchaseDto(purchase, book);
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export function getPreviewParagraphCount(text: string): number {
  return Math.min(3, Math.max(1, splitParagraphs(text).length - 1));
}

export function previewText(text: string | null, count: number): string | null {
  if (text === null) return null;
  const paragraphs = splitParagraphs(text);
  if (paragraphs.length === 1) {
    const paragraph = paragraphs[0];
    const cutoff = Math.min(750, Math.ceil(paragraph.length / 2));
    const excerpt = paragraph.slice(0, cutoff);
    const lastWordBreak = excerpt.lastIndexOf(" ");
    return (
      (lastWordBreak > 0 ? excerpt.slice(0, lastWordBreak) : excerpt) + "…"
    );
  }
  return paragraphs
    .slice(0, Math.min(count, paragraphs.length - 1))
    .join("\n\n");
}

export async function getReadableParagraphCount(
  slug: string,
  chapterId: string,
  userId: string,
) {
  const [chapter] = await db
    .select({
      id: books.id,
      digitalPolicy: books.digitalPolicy,
      chapterNumber: bookChapters.chapterNumber,
      contentId: bookChapters.contentId,
    })
    .from(bookChapters)
    .innerJoin(books, eq(bookChapters.bookId, books.id))
    .where(and(eq(books.slug, slug), eq(bookChapters.id, chapterId)))
    .limit(1);

  if (!chapter)
    throw new HttpError(404, "CHAPTER_NOT_FOUND", "Bab tidak ditemukan.");
  const { hasFullAccess, hasEventSampleAccess } = await getBookReadAccess(
    chapter,
    userId,
  );
  if (hasFullAccess) return splitParagraphs(chapter.contentId).length;
  if (
    hasEventSampleAccess &&
    (chapter.chapterNumber === 1 || chapter.chapterNumber === 2)
  ) {
    return splitParagraphs(chapter.contentId).length;
  }
  if (chapter.chapterNumber === 1)
    return getPreviewParagraphCount(chapter.contentId);
  throw new HttpError(
    403,
    "FORBIDDEN_DIGITAL_ACCESS",
    "Bab ini memerlukan akses naskah lengkap.",
  );
}

export type BookSummaryPublisher = {
  name: string | null;
  slug: string | null;
  logoUrl: string | null;
};

export function toBookSummary(
  row: typeof books.$inferSelect,
  publisher?: BookSummaryPublisher | null,
  authorAvatarFallback?: string | null,
  authorUsername?: string | null,
): BookSummaryDto {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    author: row.author,
    authorAvatar: row.authorAvatar ?? authorAvatarFallback ?? null,
    editor: row.editor,
    editorAvatar: row.editorAvatar,
    coverUrl: row.coverUrl,
    coverColor: row.coverColor,
    synopsis: row.synopsis,
    bulletinExcerpt: row.bulletinExcerpt,
    publishedYear: row.publishedYear,
    pageCount: row.pageCount,
    totalChapters: row.totalChapters,
    readingMinutes: row.readingMinutes,
    audioDurationMinutes: row.audioDurationMinutes,
    digitalPolicy: row.digitalPolicy as BookDistributionModel,
    accessTier: (row.accessTier as AccessTier) || "free",
    hasPhysical: row.hasPhysical,
    isWeeklyBulletin: row.isWeeklyBulletin,
    rakyatPriceIdr: row.rakyatPriceIdr,
    standardPriceIdr: row.standardPriceIdr,
    ratingAvg: row.ratingAvg,
    ratingCount: row.ratingCount,
    availableLanguages: (row.availableLanguages as string[]) || ["id"],
    categories: (row.categories as string[]) || [],
    collectionName: row.collectionName,
    genres: (row.genres as string[]) || [],
    publisherId: row.publisherId,
    publisherSlug: publisher?.slug ?? null,
    publisherName: publisher?.name ?? null,
    publisherLogoUrl: publisher?.logoUrl ?? null,
    authorUserId: row.authorUserId,
    authorUsername: authorUsername ?? null,
    digitalPriceIdr: row.digitalPriceIdr,
  };
}

export async function listBooks(query: ListBooksQuery) {
  const conditions: (SQL<unknown> | undefined)[] = [
    eq(books.isArchived, false),
  ];
  if (query.search) {
    const keyword = `%${query.search}%`;
    conditions.push(
      or(ilike(books.title, keyword), ilike(books.author, keyword)),
    );
  }
  if (query.category) {
    conditions.push(
      sql`${books.categories} @> ${JSON.stringify([query.category])}::jsonb`,
    );
  }
  if (query.language) {
    conditions.push(
      sql`${books.availableLanguages} @> ${JSON.stringify([query.language])}::jsonb`,
    );
  }
  if (query.accessTier && query.accessTier !== "all") {
    conditions.push(eq(books.accessTier, query.accessTier));
  }
  if (query.digitalPolicy && query.digitalPolicy !== "all") {
    conditions.push(eq(books.digitalPolicy, query.digitalPolicy));
  }
  if (query.collection) {
    conditions.push(eq(books.collectionName, query.collection));
  }
  if (query.publisher) {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        query.publisher,
      );
    const [pub] = await db
      .select({ id: publishers.id })
      .from(publishers)
      .where(
        isUuid
          ? or(
              eq(publishers.id, query.publisher),
              eq(publishers.slug, query.publisher),
            )
          : eq(publishers.slug, query.publisher),
      )
      .limit(1);
    if (pub) {
      conditions.push(eq(books.publisherId, pub.id));
    } else {
      conditions.push(sql`1 = 0`);
    }
  }

  const rows = await db
    .select({
      book: books,
      publisher: {
        name: publishers.name,
        slug: publishers.slug,
        logoUrl: publishers.logoUrl,
      },
      authorUserImage: user.image,
      authorUsername: user.username,
    })
    .from(books)
    .leftJoin(publishers, eq(books.publisherId, publishers.id))
    .leftJoin(user, eq(books.authorUserId, user.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(books.isWeeklyBulletin), desc(books.createdAt), books.id)
    .limit(query.limit + 1)
    .offset(query.offset);

  const data = rows
    .slice(0, query.limit)
    .map(({ book, publisher, authorUserImage, authorUsername }) =>
      toBookSummary(book, publisher, authorUserImage, authorUsername),
    );

  const [bulletinRow] = await db
    .select({
      book: books,
      publisher: {
        name: publishers.name,
        slug: publishers.slug,
        logoUrl: publishers.logoUrl,
      },
      authorUserImage: user.image,
      authorUsername: user.username,
    })
    .from(books)
    .leftJoin(publishers, eq(books.publisherId, publishers.id))
    .leftJoin(user, eq(books.authorUserId, user.id))
    .where(and(eq(books.isWeeklyBulletin, true), eq(books.isArchived, false)))
    .limit(1);

  return {
    data,
    bulletin: bulletinRow
      ? toBookSummary(
          bulletinRow.book,
          bulletinRow.publisher,
          bulletinRow.authorUserImage,
          bulletinRow.authorUsername,
        )
      : null,
    meta: {
      limit: query.limit,
      offset: query.offset,
      hasMore: rows.length > query.limit,
    },
  };
}

export async function getBookBySlug(
  slug: string,
  userId?: string,
): Promise<BookDetailDto | null> {
  const [bookRow] = await db
    .select({
      book: books,
      publisher: {
        name: publishers.name,
        slug: publishers.slug,
        logoUrl: publishers.logoUrl,
      },
      authorUserImage: user.image,
      authorUsername: user.username,
    })
    .from(books)
    .leftJoin(publishers, eq(books.publisherId, publishers.id))
    .leftJoin(user, eq(books.authorUserId, user.id))
    .where(eq(books.slug, slug))
    .limit(1);

  if (!bookRow) return null;
  const { book, publisher, authorUserImage, authorUsername } = bookRow;

  const hasClaimedDigital = userId
    ? await hasClaimedBook(book.id, userId)
    : false;
  const hasPurchasedDigital = userId
    ? await hasPurchasedBook(book.id, userId)
    : false;

  if (book.isArchived) {
    let isTeam = Boolean(userId && book.authorUserId === userId);
    if (!isTeam && userId && book.publisherId) {
      const [member] = await db
        .select({ id: publisherMembers.id })
        .from(publisherMembers)
        .where(
          and(
            eq(publisherMembers.publisherId, book.publisherId),
            eq(publisherMembers.userId, userId),
          ),
        )
        .limit(1);
      isTeam = Boolean(member);
    }
    if (!hasPurchasedDigital && !hasClaimedDigital && !isTeam) {
      return null;
    }
  }

  const editions = await db
    .select()
    .from(bookPrintEditions)
    .where(eq(bookPrintEditions.bookId, book.id));

  const stocks = await db
    .select({
      id: storeInventories.id,
      branchName: storeBranches.branchName,
      partnerType: storeBranches.chainName,
      city: storeBranches.city,
      address: storeBranches.address,
      latitude: storeBranches.latitude,
      longitude: storeBranches.longitude,
      rakyatStock: storeInventories.rakyatStock,
      standardStock: storeInventories.standardStock,
      lastStockCheck: storeInventories.lastSyncedAt,
    })
    .from(storeInventories)
    .innerJoin(storeBranches, eq(storeInventories.branchId, storeBranches.id))
    .where(eq(storeInventories.bookId, book.id));

  const chapters = await listBookChapters(book.id);

  const shelves = await db
    .select({ id: userShelves.id })
    .from(userShelves)
    .where(eq(userShelves.bookId, book.id));

  const eventRows = await db
    .select({
      event: communityEvents,
      calendar: communityCalendars,
    })
    .from(communityEvents)
    .innerJoin(
      communityCalendars,
      eq(communityEvents.calendarId, communityCalendars.id),
    )
    .where(
      and(
        eq(communityEvents.bookId, book.id),
        eq(communityEvents.status, "published"),
      ),
    )
    .orderBy(communityEvents.startsAt)
    .limit(5);

  const upcomingEvents = await Promise.all(
    eventRows.map(async ({ event: ev, calendar: cal }) => {
      const [goingRes] = await db
        .select({ count: sql<number>`count(*)` })
        .from(eventRsvps)
        .where(
          and(eq(eventRsvps.eventId, ev.id), eq(eventRsvps.status, "going")),
        );
      const goingCount = Number(goingRes?.count || 0);

      return {
        id: ev.id,
        slug: ev.slug,
        calendarId: ev.calendarId,
        calendarName: cal.name,
        calendarSlug: cal.slug,
        calendarAvatarUrl: cal.avatarUrl,
        bookId: ev.bookId,
        bookSummary: null,
        featuredWork: ev.featuredWork,
        title: ev.title,
        description: ev.description,
        coverUrl: ev.coverUrl,
        themePreset: ev.themePreset as CommunityEventSummaryDto["themePreset"],
        visibility: ev.visibility as CommunityEventSummaryDto["visibility"],
        eventType: ev.eventType as CommunityEventSummaryDto["eventType"],
        categoryTag: ev.categoryTag,
        coHosts: ev.coHosts,
        format: ev.format as CommunityEventSummaryDto["format"],
        district: ev.district,
        city: ev.city,
        venueName: ev.hideAddressUntilApproved ? null : ev.venueName,
        venueAddress: ev.hideAddressUntilApproved ? null : ev.venueAddress,
        hideAddressUntilApproved: ev.hideAddressUntilApproved,
        isAddressHidden: ev.hideAddressUntilApproved,
        latitude: ev.hideAddressUntilApproved ? null : ev.latitude,
        longitude: ev.hideAddressUntilApproved ? null : ev.longitude,
        startsAt: ev.startsAt.toISOString(),
        endsAt: ev.endsAt.toISOString(),
        timezone: ev.timezone,
        capacity: ev.capacity,
        requiresApproval: ev.requiresApproval,
        allowWaitlist: ev.allowWaitlist,
        status: ev.status as CommunityEventSummaryDto["status"],
        attendeeCount: goingCount,
        attendeesPreview: [],
        userRsvpStatus: null,
      };
    }),
  );

  return {
    ...toBookSummary(book, publisher, authorUserImage, authorUsername),
    chapters,
    editions: editions.map((e) => ({
      id: e.id,
      bookId: e.bookId,
      tier: e.tier as EditionTier,
      tierName: e.tierName,
      paperType: e.paperType,
      coverType: e.coverType,
      bindingType: e.bindingType,
      priceIdr: e.priceIdr,
      traditionalStorePriceIdr: e.traditionalPriceIdr,
      savingsPercent: e.savingsPercent,
      weightGrams: e.weightGrams,
      inStock: e.inStock,
    })),
    storeStocks: stocks.map((s) => ({
      id: s.id,
      branchName: s.branchName,
      partnerType: s.partnerType as PartnerType,
      city: s.city,
      address: s.address,
      latitude: s.latitude,
      longitude: s.longitude,
      rakyatStock: s.rakyatStock,
      standardStock: s.standardStock,
      lastStockCheck: s.lastStockCheck.toISOString(),
    })),
    hasClaimedDigital,
    hasPurchasedDigital,
    checkoutAvailable: Boolean(env.MIDTRANS_SERVER_KEY),
    isArchived: book.isArchived,
    totalShelved: shelves.length,
    upcomingEvents,
  };
}

export async function getBookStock(
  slug: string,
  query: StockQuery,
): Promise<StoreStockItemDto[]> {
  const [book] = await db
    .select({ id: books.id })
    .from(books)
    .where(eq(books.slug, slug))
    .limit(1);

  if (!book)
    throw new HttpError(404, "BOOK_NOT_FOUND", "Buku tidak ditemukan.");

  const conditions = [eq(storeInventories.bookId, book.id)];
  if (query.city) {
    conditions.push(ilike(storeBranches.city, `%${query.city}%`));
  }
  if (query.partner && query.partner !== "all") {
    conditions.push(eq(storeBranches.chainName, query.partner));
  }

  const rows = await db
    .select({
      id: storeInventories.id,
      branchName: storeBranches.branchName,
      partnerType: storeBranches.chainName,
      city: storeBranches.city,
      address: storeBranches.address,
      latitude: storeBranches.latitude,
      longitude: storeBranches.longitude,
      rakyatStock: storeInventories.rakyatStock,
      standardStock: storeInventories.standardStock,
      lastStockCheck: storeInventories.lastSyncedAt,
    })
    .from(storeInventories)
    .innerJoin(storeBranches, eq(storeInventories.branchId, storeBranches.id))
    .where(and(...conditions));

  return rows.map((s) => ({
    id: s.id,
    branchName: s.branchName,
    partnerType: s.partnerType as PartnerType,
    city: s.city,
    address: s.address,
    latitude: s.latitude,
    longitude: s.longitude,
    rakyatStock: s.rakyatStock,
    standardStock: s.standardStock,
    lastStockCheck: s.lastStockCheck.toISOString(),
  }));
}

export async function claimPrintCode(
  slug: string,
  userId: string,
  code: string,
) {
  const [book] = await db
    .select({ id: books.id })
    .from(books)
    .where(eq(books.slug, slug))
    .limit(1);

  if (!book)
    throw new HttpError(404, "BOOK_NOT_FOUND", "Buku tidak ditemukan.");

  const [claimRow] = await db
    .select()
    .from(bookClaimCodes)
    .where(
      and(
        eq(bookClaimCodes.bookId, book.id),
        eq(bookClaimCodes.code, code),
        env.isProduction ? eq(bookClaimCodes.isDemo, false) : undefined,
      ),
    )
    .limit(1);

  if (!claimRow) {
    throw new HttpError(
      404,
      "INVALID_CLAIM_CODE",
      "Kode klaim tidak ditemukan pada buku ini.",
    );
  }

  if (claimRow.claimedByUserId) {
    throw new HttpError(
      409,
      "CLAIM_CODE_ALREADY_USED",
      "Kode klaim fisik ini sudah digunakan.",
    );
  }

  const [claimed] = await db
    .update(bookClaimCodes)
    .set({ claimedByUserId: userId, claimedAt: new Date() })
    .where(
      and(
        eq(bookClaimCodes.id, claimRow.id),
        isNull(bookClaimCodes.claimedByUserId),
      ),
    )
    .returning({ id: bookClaimCodes.id });

  if (!claimed) {
    throw new HttpError(
      409,
      "CLAIM_CODE_ALREADY_USED",
      "Kode klaim fisik ini sudah digunakan.",
    );
  }

  return {
    success: true,
    message: "Buku fisik berhasil diklaim. Akses digital terbuka penuh.",
  };
}

export async function getBookReaderPayload(
  slug: string,
  userId: string,
  query: ReadBookQuery,
  authSessionId?: string | null,
  requestContext?: {
    userRole?: string | null;
    userAgent?: string | null;
    ipAddress?: string | null;
  },
): Promise<BookReaderPayloadDto & { watermark: string }> {
  const [book] = await db
    .select()
    .from(books)
    .where(eq(books.slug, slug))
    .limit(1);

  if (!book)
    throw new HttpError(404, "BOOK_NOT_FOUND", "Buku tidak ditemukan.");

  await assertReaderNotSuspended(userId, requestContext?.userRole);

  const access = await getBookReadAccess(book, userId);

  if (book.isArchived && !access.hasFullAccess) {
    throw new HttpError(404, "BOOK_NOT_FOUND", "Buku tidak ditemukan.");
  }
  const requestedChapterNum = query.chapter;
  const isSampleAllowed =
    requestedChapterNum === 1 ||
    (access.hasEventSampleAccess && requestedChapterNum === 2);

  if (!access.hasFullAccess && !isSampleAllowed) {
    throw new HttpError(
      403,
      "FORBIDDEN_DIGITAL_ACCESS",
      "Akses bab penuh ini memerlukan klaim kode buku fisik atau keanggotaan aktif.",
    );
  }

  const continuous =
    query.continuous === "true" &&
    access.hasFullAccess &&
    query.mode === "full";
  const windowSize = continuous
    ? Math.min(2, Math.max(1, query.windowSize ?? 2))
    : 1;
  const maxChapterNum = requestedChapterNum + windowSize - 1;
  const rows = await db
    .select()
    .from(bookChapters)
    .where(
      and(
        eq(bookChapters.bookId, book.id),
        continuous
          ? and(
              gte(bookChapters.chapterNumber, requestedChapterNum),
              lte(bookChapters.chapterNumber, maxChapterNum),
            )
          : eq(bookChapters.chapterNumber, requestedChapterNum),
      ),
    )
    .orderBy(bookChapters.chapterNumber);

  const chapters = rows.map((row) => {
    const isUnlockedSample =
      access.hasEventSampleAccess &&
      (row.chapterNumber === 1 || row.chapterNumber === 2);
    const isFullChapter = access.hasFullAccess || isUnlockedSample;

    const previewCount = isFullChapter
      ? 0
      : getPreviewParagraphCount(row.contentId);
    const fullWordCount = countContentWords(row.contentId || row.contentEn);
    const contentId = isFullChapter
      ? row.contentId
      : (previewText(row.contentId, previewCount) ?? "");
    const contentEn = isFullChapter
      ? row.contentEn
      : previewText(row.contentEn, previewCount);
    const canPlayAudio = isFullChapter && query.mode !== "blueprint";
    return {
      id: row.id,
      chapterNumber: row.chapterNumber,
      title: row.titleId,
      contentId: query.mode === "full" ? contentId : "",
      contentEn: query.mode === "full" ? contentEn : null,
      blueprintContent: query.mode === "blueprint" ? row.blueprintContent : "",
      audioUrl: canPlayAudio ? row.audioUrl : null,
      audioDurationSeconds: canPlayAudio ? row.audioDurationSec : null,
      fullWordCount,
      isPreviewTruncated: !isFullChapter,
    };
  });
  const currentChapter = chapters.find(
    (chapter) => chapter.chapterNumber === requestedChapterNum,
  );
  if (!currentChapter) {
    throw new HttpError(404, "CHAPTER_NOT_FOUND", "Bab tidak ditemukan.");
  }

  const [allChapters, watermarkCode] = await Promise.all([
    listBookChapters(book.id, userId),
    issueOrGetDrmWatermarkSession({
      userId,
      bookId: book.id,
      authSessionId,
    }),
  ]);

  await enforceChapterWindowRateLimit({
    userId,
    userRole: requestContext?.userRole ?? null,
    bookId: book.id,
    bookSlug: book.slug,
    requestedChapterNum,
    deliveredChapters: rows.map((row) => row.chapterNumber),
    watermarkCode,
    userAgent: requestContext?.userAgent ?? null,
    ipAddress: requestContext?.ipAddress ?? null,
  });

  return {
    book: toBookSummary(book),
    mode: query.mode,
    currentChapter,
    chapters,
    allChapters,
    ...access,
    watermark: watermarkCode,
  };
}

export async function listAuthors() {
  const allBooks = await db
    .select({
      author: books.author,
      authorAvatar: books.authorAvatar,
    })
    .from(books)
    .where(eq(books.isArchived, false));

  const countMap = new Map<
    string,
    { avatarUrl: string | null; count: number }
  >();
  for (const b of allBooks) {
    const existing = countMap.get(b.author);
    if (existing) {
      existing.count += 1;
    } else {
      countMap.set(b.author, { avatarUrl: b.authorAvatar, count: 1 });
    }
  }

  return Array.from(countMap.entries()).map(([name, val]) => ({
    name,
    avatarUrl: val.avatarUrl,
    bookCount: val.count,
  }));
}

export async function listCollections() {
  const allBooks = await db
    .select({
      collectionName: books.collectionName,
      coverUrl: books.coverUrl,
    })
    .from(books)
    .where(eq(books.isArchived, false));

  const colMap = new Map<string, { count: number; coverUrl?: string }>();
  for (const b of allBooks) {
    if (!b.collectionName) continue;
    const existing = colMap.get(b.collectionName);
    if (existing) {
      existing.count += 1;
    } else {
      colMap.set(b.collectionName, { count: 1, coverUrl: b.coverUrl });
    }
  }

  return Array.from(colMap.entries()).map(([name, val]) => ({
    name,
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    bookCount: val.count,
    coverUrl: val.coverUrl,
  }));
}

export async function listCategories() {
  const allBooks = await db
    .select({ categories: books.categories })
    .from(books)
    .where(eq(books.isArchived, false));
  const catMap = new Map<string, number>();
  for (const b of allBooks) {
    const cats = (b.categories as string[]) || [];
    for (const c of cats) {
      catMap.set(c, (catMap.get(c) || 0) + 1);
    }
  }
  return Array.from(catMap.entries()).map(([name, count]) => ({
    name,
    bookCount: count,
  }));
}
