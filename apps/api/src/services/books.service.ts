import { and, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { db } from "../db";
import { env } from "../config/env";
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
import { getActiveMembership } from "./membership.service";
import type {
  ListBooksQuery,
  ReadBookQuery,
  StockQuery,
} from "@starter/shared/validators/books";
import type {
  AccessTier,
  BookChapterSummaryDto,
  BookDetailDto,
  BookReaderPayloadDto,
  BookSummaryDto,
  DigitalPolicy,
  EditionTier,
  PartnerType,
  StoreStockItemDto,
} from "@starter/shared/types";

async function listBookChapters(bookId: string): Promise<BookChapterSummaryDto[]> {
  const chapters = await db
    .select({
      id: bookChapters.id,
      chapterNumber: bookChapters.chapterNumber,
      title: bookChapters.titleId,
    })
    .from(bookChapters)
    .where(eq(bookChapters.bookId, bookId))
    .orderBy(bookChapters.chapterNumber);

  return chapters.map((chapter) => ({ ...chapter, isSample: chapter.chapterNumber === 1 }));
}

async function hasClaimedBook(bookId: string, userId: string): Promise<boolean> {
  const [claim] = await db
    .select({ id: bookClaimCodes.id })
    .from(bookClaimCodes)
    .where(and(
      eq(bookClaimCodes.bookId, bookId),
      eq(bookClaimCodes.claimedByUserId, userId),
      env.isProduction ? eq(bookClaimCodes.isDemo, false) : undefined,
    ))
    .limit(1);
  return !!claim;
}

export async function getBookReadAccess(
  book: Pick<typeof books.$inferSelect, "id" | "digitalPolicy">,
  userId: string,
): Promise<{ hasFullAccess: boolean; accessExpiresAt: string | null }> {
  if (book.digitalPolicy === "free_open" || await hasClaimedBook(book.id, userId)) {
    return { hasFullAccess: true, accessExpiresAt: null };
  }
  const membership = book.digitalPolicy === "sample_only"
    ? await getActiveMembership(userId)
    : null;
  return {
    hasFullAccess: !!membership,
    accessExpiresAt: membership?.expiresAt.toISOString() ?? null,
  };
}

function splitParagraphs(text: string): string[] {
  return text.split(/\n\n+/).map((paragraph) => paragraph.trim()).filter(Boolean);
}

export function getPreviewParagraphCount(text: string): number {
  return Math.min(3, Math.max(1, splitParagraphs(text).length - 1));
}

function previewText(text: string | null, count: number): string | null {
  if (text === null) return null;
  const paragraphs = splitParagraphs(text);
  if (paragraphs.length === 1) {
    const paragraph = paragraphs[0];
    const cutoff = Math.min(750, Math.ceil(paragraph.length / 2));
    const excerpt = paragraph.slice(0, cutoff);
    const lastWordBreak = excerpt.lastIndexOf(" ");
    return (lastWordBreak > 0 ? excerpt.slice(0, lastWordBreak) : excerpt) + "…";
  }
  return paragraphs.slice(0, Math.min(count, paragraphs.length - 1)).join("\n\n");
}

export async function getReadableParagraphCount(slug: string, chapterId: string, userId: string) {
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

  if (!chapter) throw new HttpError(404, "CHAPTER_NOT_FOUND", "Bab tidak ditemukan.");
  const { hasFullAccess } = await getBookReadAccess(chapter, userId);
  if (hasFullAccess) return splitParagraphs(chapter.contentId).length;
  if (chapter.chapterNumber === 1) return getPreviewParagraphCount(chapter.contentId);
  throw new HttpError(403, "FORBIDDEN_DIGITAL_ACCESS", "Bab ini memerlukan akses naskah lengkap.");
}

export function toBookSummary(row: typeof books.$inferSelect): BookSummaryDto {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    originalTitle: row.originalTitle,
    author: row.author,
    authorAvatar: row.authorAvatar,
    editor: row.editor,
    editorAvatar: row.editorAvatar,
    translator: row.translator,
    coverUrl: row.coverUrl,
    coverColor: row.coverColor,
    synopsis: row.synopsis,
    bulletinExcerpt: row.bulletinExcerpt,
    publishedYear: row.publishedYear,
    pageCount: row.pageCount,
    totalChapters: row.totalChapters,
    readingMinutes: row.readingMinutes,
    audioDurationMinutes: row.audioDurationMinutes,
    digitalPolicy: row.digitalPolicy as DigitalPolicy,
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
  };
}

export async function listBooks(query: ListBooksQuery) {
  const conditions = [];
  if (query.search) {
    const keyword = `%${query.search}%`;
    conditions.push(or(ilike(books.title, keyword), ilike(books.author, keyword)));
  }
  if (query.category) {
    conditions.push(sql`${books.categories} @> ${JSON.stringify([query.category])}::jsonb`);
  }
  if (query.language) {
    conditions.push(sql`${books.availableLanguages} @> ${JSON.stringify([query.language])}::jsonb`);
  }
  if (query.accessTier && query.accessTier !== "all") {
    conditions.push(eq(books.accessTier, query.accessTier));
  }
  if (query.collection) {
    conditions.push(eq(books.collectionName, query.collection));
  }

  const rows = await db
    .select()
    .from(books)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(books.isWeeklyBulletin), desc(books.createdAt), books.id)
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
    bulletin: bulletinRow ? toBookSummary(bulletinRow) : null,
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

  const hasClaimedDigital = userId ? await hasClaimedBook(book.id, userId) : false;
  const chapters = await listBookChapters(book.id);

  const shelves = await db
    .select({ id: userShelves.id })
    .from(userShelves)
    .where(eq(userShelves.bookId, book.id));

  return {
    ...toBookSummary(book),
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
    .where(and(
      eq(bookClaimCodes.bookId, book.id),
      eq(bookClaimCodes.code, code),
      env.isProduction ? eq(bookClaimCodes.isDemo, false) : undefined,
    ))
    .limit(1);

  if (!claimRow) {
    throw new HttpError(404, "INVALID_CLAIM_CODE", "Kode klaim tidak ditemukan pada buku ini.");
  }

  if (claimRow.claimedByUserId) {
    throw new HttpError(409, "CLAIM_CODE_ALREADY_USED", "Kode klaim fisik ini sudah digunakan.");
  }

  const [claimed] = await db
    .update(bookClaimCodes)
    .set({ claimedByUserId: userId, claimedAt: new Date() })
    .where(and(eq(bookClaimCodes.id, claimRow.id), isNull(bookClaimCodes.claimedByUserId)))
    .returning({ id: bookClaimCodes.id });

  if (!claimed) {
    throw new HttpError(409, "CLAIM_CODE_ALREADY_USED", "Kode klaim fisik ini sudah digunakan.");
  }

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

  const access = await getBookReadAccess(book, userId);
  const requestedChapterNum = query.chapter;
  if (!access.hasFullAccess && requestedChapterNum !== 1) {
    throw new HttpError(
      403,
      "FORBIDDEN_DIGITAL_ACCESS",
      "Akses bab penuh ini memerlukan klaim kode buku fisik atau keanggotaan aktif.",
    );
  }

  const continuous = query.continuous === "true" && access.hasFullAccess && query.mode === "full";
  const rows = await db
    .select()
    .from(bookChapters)
    .where(and(
      eq(bookChapters.bookId, book.id),
      continuous ? undefined : eq(bookChapters.chapterNumber, requestedChapterNum),
    ))
    .orderBy(bookChapters.chapterNumber);

  const chapters = rows.map((row) => {
    const previewCount = access.hasFullAccess ? 0 : getPreviewParagraphCount(row.contentId);
    const contentId = access.hasFullAccess ? row.contentId : previewText(row.contentId, previewCount) ?? "";
    const contentEn = access.hasFullAccess ? row.contentEn : previewText(row.contentEn, previewCount);
    const canPlayAudio = access.hasFullAccess && query.mode !== "blueprint";
    return {
      id: row.id,
      chapterNumber: row.chapterNumber,
      title: row.titleId,
      contentId: query.mode === "full" ? contentId : "",
      contentEn: query.mode === "full" ? contentEn : null,
      blueprintContent: query.mode === "blueprint" ? row.blueprintContent : "",
      audioUrl: canPlayAudio ? row.audioUrl : null,
      audioDurationSeconds: canPlayAudio ? row.audioDurationSec : null,
    };
  });
  const currentChapter = chapters.find((chapter) => chapter.chapterNumber === requestedChapterNum);
  if (!currentChapter) {
    throw new HttpError(404, "CHAPTER_NOT_FOUND", "Bab tidak ditemukan.");
  }

  return {
    book: toBookSummary(book),
    mode: query.mode,
    currentChapter,
    chapters,
    allChapters: await listBookChapters(book.id),
    ...access,
    watermark: `${userEmail} : ${userId.slice(0, 8)} : ${new Date().toISOString()}`,
  };
}

export async function listAuthors() {
  const allBooks = await db
    .select({
      author: books.author,
      authorAvatar: books.authorAvatar,
    })
    .from(books);

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
    .from(books);

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
    .from(books);
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
