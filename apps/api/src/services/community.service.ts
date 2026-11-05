import { and, desc, eq, lt, sql } from "drizzle-orm";
import { db } from "../db";
import {
  books,
  bookReviews,
  paragraphComments,
  userShelves,
  user,
  bookClaimCodes,
  readingProgress,
  readingSessions,
} from "../db/schema";
import { HttpError } from "../lib/http-error";
import { toBookSummary } from "./books.service";
import type {
  CreateParagraphCommentInput,
  CreateReviewInput,
  UpsertShelfInput,
} from "@starter/shared/validators/community";
import type {
  BookReviewDto,
  ParagraphCommentDto,
  ShelfItemDto,
  ShelfStatus,
} from "@starter/shared/types";

export async function upsertShelf(
  userId: string,
  input: UpsertShelfInput,
): Promise<ShelfItemDto> {
  const [book] = await db
    .select()
    .from(books)
    .where(eq(books.id, input.bookId))
    .limit(1);

  if (!book) throw new HttpError(404, "BOOK_NOT_FOUND", "Buku tidak ditemukan.");

  const progressPercent = input.shelfStatus === "finished" ? 100 : 0;
  const [shelfRow] = await db
    .insert(userShelves)
    .values({
      userId,
      bookId: input.bookId,
      shelfStatus: input.shelfStatus,
      favorite: input.favorite ?? false,
      progressPercent,
    })
    .onConflictDoUpdate({
      target: [userShelves.userId, userShelves.bookId],
      set: {
        shelfStatus: input.shelfStatus === "want_to_read"
          ? sql`case when ${userShelves.shelfStatus} in ('reading', 'finished') then ${userShelves.shelfStatus} else 'want_to_read' end`
          : input.shelfStatus,
        favorite: input.favorite,
        progressPercent: sql`greatest(${userShelves.progressPercent}, ${progressPercent})`,
      },
    })
    .returning();

  return {
    id: shelfRow.id,
    bookId: shelfRow.bookId,
    book: toBookSummary(book),
    shelfStatus: shelfRow.shelfStatus as ShelfStatus,
    favorite: shelfRow.favorite,
    progressPercent: shelfRow.progressPercent,
    updatedAt: shelfRow.updatedAt.toISOString(),
  };
}

export async function getUserShelves(userId: string): Promise<ShelfItemDto[]> {
  const activity = sql`coalesce(
    (select max(${readingProgress.capturedAt}) from ${readingProgress}
      where ${readingProgress.userId} = ${userShelves.userId} and ${readingProgress.bookId} = ${userShelves.bookId}),
    (select max(${readingSessions.createdAt}) from ${readingSessions}
      where ${readingSessions.userId} = ${userShelves.userId} and ${readingSessions.bookId} = ${userShelves.bookId}),
    ${userShelves.updatedAt}
  )`;
  const previewProgressPercent = sql<number | null>`(
    select case when ${readingProgress.scope} = 'preview'
      then ${readingProgress.lastScrollPercent} end
    from ${readingProgress}
    where ${readingProgress.userId} = ${userShelves.userId}
      and ${readingProgress.bookId} = ${userShelves.bookId}
    order by ${readingProgress.capturedAt} desc, ${readingProgress.scope}
    limit 1
  )`;
  const rows = await db
    .select({
      shelf: userShelves,
      book: books,
      previewProgressPercent,
    })
    .from(userShelves)
    .innerJoin(books, eq(userShelves.bookId, books.id))
    .where(eq(userShelves.userId, userId))
    .orderBy(desc(activity), userShelves.id);

  return rows.map(({ shelf, book, previewProgressPercent }) => ({
    id: shelf.id,
    bookId: shelf.bookId,
    book: toBookSummary(book),
    shelfStatus: shelf.shelfStatus as ShelfStatus,
    favorite: shelf.favorite,
    progressPercent: shelf.progressPercent,
    previewProgressPercent,
    updatedAt: shelf.updatedAt.toISOString(),
  }));
}

export async function createReview(
  userId: string,
  userName: string,
  userRole: string,
  input: CreateReviewInput,
): Promise<BookReviewDto> {
  // Check verified reader status
  const [shelf] = await db
    .select({ progressPercent: userShelves.progressPercent })
    .from(userShelves)
    .where(
      and(
        eq(userShelves.userId, userId),
        eq(userShelves.bookId, input.bookId),
      ),
    )
    .limit(1);

  const [claim] = await db
    .select({ id: bookClaimCodes.id })
    .from(bookClaimCodes)
    .where(
      and(
        eq(bookClaimCodes.bookId, input.bookId),
        eq(bookClaimCodes.claimedByUserId, userId),
      ),
    )
    .limit(1);

  const isVerifiedReader = (shelf?.progressPercent ?? 0) >= 70 || !!claim;
  const ratingHalfSteps = Math.round(input.rating * 2);

  const [review] = await db
    .insert(bookReviews)
    .values({
      userId,
      bookId: input.bookId,
      ratingHalfSteps,
      content: input.content,
      editionTierReviewed: input.editionTierReviewed,
      isVerifiedReader,
    })
    .returning();

  // Recalculate book average rating
  const allBookReviews = await db
    .select({ ratingHalfSteps: bookReviews.ratingHalfSteps })
    .from(bookReviews)
    .where(eq(bookReviews.bookId, input.bookId));

  const totalReviews = allBookReviews.length;
  const avg =
    totalReviews > 0
      ? allBookReviews.reduce((sum, r) => sum + r.ratingHalfSteps / 2, 0) / totalReviews
      : input.rating;

  await db
    .update(books)
    .set({
      ratingAvg: Math.round(avg * 10) / 10,
      ratingCount: totalReviews,
    })
    .where(eq(books.id, input.bookId));

  return {
    id: review.id,
    bookId: review.bookId,
    userName,
    userRole,
    rating: review.ratingHalfSteps / 2,
    content: review.content,
    editionTierReviewed: review.editionTierReviewed,
    createdAt: review.createdAt.toISOString(),
  };
}

export async function listReviews(bookId: string): Promise<BookReviewDto[]> {
  const rows = await db
    .select({
      id: bookReviews.id,
      bookId: bookReviews.bookId,
      userName: user.name,
      userRole: user.role,
      ratingHalfSteps: bookReviews.ratingHalfSteps,
      content: bookReviews.content,
      editionTierReviewed: bookReviews.editionTierReviewed,
      createdAt: bookReviews.createdAt,
    })
    .from(bookReviews)
    .innerJoin(user, eq(bookReviews.userId, user.id))
    .where(eq(bookReviews.bookId, bookId))
    .orderBy(desc(bookReviews.createdAt));

  return rows.map((r) => ({
    id: r.id,
    bookId: r.bookId,
    userName: r.userName,
    userRole: r.userRole || "user",
    rating: r.ratingHalfSteps / 2,
    content: r.content,
    editionTierReviewed: r.editionTierReviewed,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function createComment(
  userId: string,
  userName: string,
  input: CreateParagraphCommentInput,
): Promise<ParagraphCommentDto> {
  const [comment] = await db
    .insert(paragraphComments)
    .values({
      userId,
      chapterId: input.chapterId,
      paragraphIndex: input.paragraphIndex,
      content: input.content,
    })
    .returning();

  return {
    id: comment.id,
    chapterId: comment.chapterId,
    paragraphIndex: comment.paragraphIndex,
    userName,
    content: comment.content,
    createdAt: comment.createdAt.toISOString(),
  };
}

export async function listComments(chapterId: string, paragraphCount: number): Promise<ParagraphCommentDto[]> {
  const rows = await db
    .select({
      id: paragraphComments.id,
      chapterId: paragraphComments.chapterId,
      paragraphIndex: paragraphComments.paragraphIndex,
      userName: user.name,
      content: paragraphComments.content,
      createdAt: paragraphComments.createdAt,
    })
    .from(paragraphComments)
    .innerJoin(user, eq(paragraphComments.userId, user.id))
    .where(and(eq(paragraphComments.chapterId, chapterId), lt(paragraphComments.paragraphIndex, paragraphCount)))
    .orderBy(paragraphComments.paragraphIndex, desc(paragraphComments.createdAt));

  return rows.map((r) => ({
    id: r.id,
    chapterId: r.chapterId,
    paragraphIndex: r.paragraphIndex,
    userName: r.userName,
    content: r.content,
    createdAt: r.createdAt.toISOString(),
  }));
}
