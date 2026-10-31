import { and, desc, eq, ilike } from "drizzle-orm";
import { db } from "../db";
import {
  books,
  bookChapters,
  bookPrintEditions,
  bookClaimCodes,
  storeBranches,
  storeInventories,
  userShelves,
} from "../db/schema";
import { HttpError } from "../lib/http-error";
import type {
  ListBooksQuery,
  ReadBookQuery,
  StockQuery,
} from "@starter/shared/validators/books";
import type {
  BookDetailDto,
  BookReaderPayloadDto,
  BookSummaryDto,
  DigitalPolicy,
  EditionTier,
  PartnerType,
  StoreStockItemDto,
} from "@starter/shared/types";

function toBookSummary(row: typeof books.$inferSelect): BookSummaryDto {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    originalTitle: row.originalTitle,
    author: row.author,
    translator: row.translator,
    coverUrl: row.coverUrl,
    synopsis: row.synopsis,
    bulletinExcerpt: row.bulletinExcerpt,
    publishedYear: row.publishedYear,
    pageCount: row.pageCount,
    audioDurationMinutes: row.audioDurationMinutes,
    digitalPolicy: row.digitalPolicy as DigitalPolicy,
    isWeeklyBulletin: row.isWeeklyBulletin,
    rakyatPriceIdr: row.rakyatPriceIdr,
    standardPriceIdr: row.standardPriceIdr,
    ratingAvg: row.ratingAvg,
    ratingCount: row.ratingCount,
    genres: (row.genres as string[]) || [],
  };
}

export async function listBooks(query: ListBooksQuery) {
  const conditions = [];
  if (query.search) {
    conditions.push(ilike(books.title, `%${query.search}%`));
  }
  if (query.category) {
    conditions.push(ilike(books.synopsis, `%${query.category}%`));
  }

  const rows = await db
    .select()
    .from(books)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(books.isWeeklyBulletin), desc(books.createdAt))
    .limit(query.limit + 1)
    .offset(query.offset);

  const data = rows.slice(0, query.limit).map(toBookSummary);

  const [bulletinRow] = await db
    .select()
    .from(books)
    .where(eq(books.isWeeklyBulletin, true))
    .limit(1);

  return {
    data,
    bulletin: bulletinRow ? toBookSummary(bulletinRow) : data[0] || null,
    meta: {
      limit: query.limit,
      offset: query.offset,
      hasMore: rows.length > query.limit,
    },
  };
}

export async function getBookBySlug(slug: string, userId?: string): Promise<BookDetailDto | null> {
  const [book] = await db
    .select()
    .from(books)
    .where(eq(books.slug, slug))
    .limit(1);

  if (!book) return null;

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

  let hasClaimedDigital = false;
  if (userId) {
    const [claimed] = await db
      .select({ id: bookClaimCodes.id })
      .from(bookClaimCodes)
      .where(
        and(
          eq(bookClaimCodes.bookId, book.id),
          eq(bookClaimCodes.claimedByUserId, userId),
        ),
      )
      .limit(1);
    hasClaimedDigital = !!claimed;
  }

  const shelves = await db
    .select({ id: userShelves.id })
    .from(userShelves)
    .where(eq(userShelves.bookId, book.id));

  return {
    ...toBookSummary(book),
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
    totalShelved: shelves.length,
  };
}

export async function getBookStock(slug: string, query: StockQuery): Promise<StoreStockItemDto[]> {
  const [book] = await db
    .select({ id: books.id })
    .from(books)
    .where(eq(books.slug, slug))
    .limit(1);

  if (!book) throw new HttpError(404, "BOOK_NOT_FOUND", "Buku tidak ditemukan.");

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

export async function claimPrintCode(slug: string, userId: string, code: string) {
  const [book] = await db
    .select({ id: books.id })
    .from(books)
    .where(eq(books.slug, slug))
    .limit(1);

  if (!book) throw new HttpError(404, "BOOK_NOT_FOUND", "Buku tidak ditemukan.");

  const [claimRow] = await db
    .select()
    .from(bookClaimCodes)
    .where(and(eq(bookClaimCodes.bookId, book.id), eq(bookClaimCodes.code, code)))
    .limit(1);

  if (!claimRow) {
    throw new HttpError(404, "INVALID_CLAIM_CODE", "Kode klaim tidak ditemukan pada buku ini.");
  }

  if (claimRow.claimedByUserId) {
    throw new HttpError(409, "CLAIM_CODE_ALREADY_USED", "Kode klaim fisik ini sudah digunakan.");
  }

  await db
    .update(bookClaimCodes)
    .set({ claimedByUserId: userId, claimedAt: new Date() })
    .where(eq(bookClaimCodes.id, claimRow.id));

  return { success: true, message: "Buku fisik berhasil diklaim. Akses digital terbuka penuh." };
}

export async function getBookReaderPayload(
  slug: string,
  userId: string,
  userEmail: string,
  query: ReadBookQuery,
): Promise<BookReaderPayloadDto & { watermark: string }> {
  const [book] = await db
    .select()
    .from(books)
    .where(eq(books.slug, slug))
    .limit(1);

  if (!book) throw new HttpError(404, "BOOK_NOT_FOUND", "Buku tidak ditemukan.");

  const allChapters = await db
    .select({
      id: bookChapters.id,
      chapterNumber: bookChapters.chapterNumber,
      title: bookChapters.titleId,
    })
    .from(bookChapters)
    .where(eq(bookChapters.bookId, book.id))
    .orderBy(bookChapters.chapterNumber);

  // Check access rights
  let hasFullAccess = book.digitalPolicy === "free_open";
  if (!hasFullAccess) {
    const [claimed] = await db
      .select({ id: bookClaimCodes.id })
      .from(bookClaimCodes)
      .where(
        and(
          eq(bookClaimCodes.bookId, book.id),
          eq(bookClaimCodes.claimedByUserId, userId),
        ),
      )
      .limit(1);
    hasFullAccess = !!claimed;
  }

  const requestedChapterNum = query.chapter;
  if (!hasFullAccess && requestedChapterNum > 1 && query.mode === "full") {
    throw new HttpError(
      403,
      "FORBIDDEN_DIGITAL_ACCESS",
      "Akses bab penuh ini memerlukan klaim kode buku fisik atau keanggotaan aktif.",
    );
  }

  const [currentChapter] = await db
    .select()
    .from(bookChapters)
    .where(
      and(
        eq(bookChapters.bookId, book.id),
        eq(bookChapters.chapterNumber, requestedChapterNum),
      ),
    )
    .limit(1);

  if (!currentChapter) {
    throw new HttpError(404, "CHAPTER_NOT_FOUND", "Bab tidak ditemukan.");
  }

  const watermark = `${userEmail} : ${userId.slice(0, 8)} : ${new Date().toISOString()}`;

  return {
    book: toBookSummary(book),
    mode: query.mode,
    currentChapter: {
      id: currentChapter.id,
      chapterNumber: currentChapter.chapterNumber,
      title: currentChapter.titleId,
      contentId: currentChapter.contentId,
      contentEn: currentChapter.contentEn,
      blueprintContent: currentChapter.blueprintContent,
      audioUrl: currentChapter.audioUrl,
      audioDurationSeconds: currentChapter.audioDurationSec,
    },
    allChapters: allChapters.map((c) => ({
      id: c.id,
      chapterNumber: c.chapterNumber,
      title: c.title,
      isSample: c.chapterNumber === 1,
    })),
    hasFullAccess,
    watermark,
  };
}
