import { and, desc, eq, lt, sql } from "drizzle-orm";
import { db } from "../db";
import {
  books,
  bookChapters,
  bookHighlights,
  readingProgress,
  readingSessions,
  userShelves,
} from "../db/schema";
import { HttpError } from "../lib/http-error";
import { getBookReadAccess, getPreviewParagraphCount } from "./books.service";
import type {
  CreateHighlightInput,
  CreateReadingSessionInput,
  ListReadingSessionsQuery,
  SaveReadingProgressInput,
} from "@starter/shared/validators/reading";
import type {
  BookHighlightDto,
  HighlightColor,
  ReadingMode,
  ReadingProgressDto,
  ReadingProgressScope,
  ReadingSessionDto,
  ReadingTelemetrySummaryDto,
} from "@starter/shared/types";

const readingDay = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Jakarta",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const dayMs = 86_400_000;

export async function createReadingSession(
  userId: string,
  input: CreateReadingSessionInput,
): Promise<ReadingSessionDto> {
  const [book] = await db
    .select({ title: books.title })
    .from(books)
    .where(eq(books.id, input.bookId))
    .limit(1);

  if (!book) throw new HttpError(404, "BOOK_NOT_FOUND", "Buku tidak ditemukan.");

  const session = await db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(readingSessions)
      .values({
        id: input.sessionId,
        userId,
        bookId: input.bookId,
        pagesRead: input.pagesRead,
        durationSeconds: input.durationSeconds,
        avgWpm: input.avgWpm,
        mode: input.mode,
      })
      .onConflictDoNothing({ target: readingSessions.id })
      .returning();

    if (inserted) {
      await tx
        .insert(userShelves)
        .values({ userId, bookId: input.bookId, shelfStatus: "reading" })
        .onConflictDoUpdate({
          target: [userShelves.userId, userShelves.bookId],
          set: { shelfStatus: "reading" },
          setWhere: eq(userShelves.shelfStatus, "want_to_read"),
        });
      return inserted;
    }

    const [existing] = await tx
      .select()
      .from(readingSessions)
      .where(and(
        eq(readingSessions.id, input.sessionId!),
        eq(readingSessions.userId, userId),
        eq(readingSessions.bookId, input.bookId),
      ));
    if (!existing) throw new HttpError(409, "READING_SESSION_CONFLICT", "Sesi baca tidak dapat dicatat.");
    return existing;
  });

  return {
    id: session.id,
    bookId: session.bookId,
    bookTitle: book.title,
    pagesRead: session.pagesRead,
    durationSeconds: session.durationSeconds,
    avgWpm: session.avgWpm,
    mode: session.mode as ReadingMode,
    createdAt: session.createdAt.toISOString(),
  };
}

export async function listReadingSessions(
  userId: string,
  query: ListReadingSessionsQuery,
) {
  const rows = await db
    .select({
      id: readingSessions.id,
      bookId: readingSessions.bookId,
      bookTitle: books.title,
      pagesRead: readingSessions.pagesRead,
      durationSeconds: readingSessions.durationSeconds,
      avgWpm: readingSessions.avgWpm,
      mode: readingSessions.mode,
      createdAt: readingSessions.createdAt,
    })
    .from(readingSessions)
    .innerJoin(books, eq(readingSessions.bookId, books.id))
    .where(eq(readingSessions.userId, userId))
    .orderBy(desc(readingSessions.createdAt))
    .limit(query.limit + 1)
    .offset(query.offset);

  const data: ReadingSessionDto[] = rows.slice(0, query.limit).map((r) => ({
    id: r.id,
    bookId: r.bookId,
    bookTitle: r.bookTitle,
    pagesRead: r.pagesRead,
    durationSeconds: r.durationSeconds,
    avgWpm: r.avgWpm,
    mode: r.mode as ReadingMode,
    createdAt: r.createdAt.toISOString(),
  }));

  // Calculate summary metrics across all user sessions
  const allUserSessions = await db
    .select({
      pagesRead: readingSessions.pagesRead,
      durationSeconds: readingSessions.durationSeconds,
      avgWpm: readingSessions.avgWpm,
      createdAt: readingSessions.createdAt,
    })
    .from(readingSessions)
    .where(eq(readingSessions.userId, userId))
    .orderBy(desc(readingSessions.createdAt));

  let totalPagesRead = 0;
  let totalDurationSeconds = 0;
  let wpmSum = 0;

  for (const s of allUserSessions) {
    totalPagesRead += s.pagesRead;
    totalDurationSeconds += s.durationSeconds;
    wpmSum += s.avgWpm;
  }

  const totalMinutesRead = Math.round(totalDurationSeconds / 60);
  const avgWpm = allUserSessions.length > 0 ? Math.round(wpmSum / allUserSessions.length) : 0;

  const activeDays = new Set(allUserSessions.map(({ createdAt }) =>
    Date.parse(readingDay.format(createdAt)),
  ));
  let streakDay = Date.parse(readingDay.format(new Date()));
  if (!activeDays.has(streakDay)) streakDay -= dayMs;
  let currentStreakDays = 0;
  while (activeDays.has(streakDay)) {
    currentStreakDays++;
    streakDay -= dayMs;
  }

  const completedShelves = await db
    .select({ id: userShelves.id })
    .from(userShelves)
    .where(
      and(
        eq(userShelves.userId, userId),
        eq(userShelves.shelfStatus, "finished"),
      ),
    );

  const summary: ReadingTelemetrySummaryDto = {
    totalMinutesRead,
    totalPagesRead,
    currentStreakDays,
    booksCompleted: completedShelves.length,
    avgWpm,
  };

  return {
    data,
    summary,
    meta: {
      limit: query.limit,
      offset: query.offset,
      hasMore: rows.length > query.limit,
    },
  };
}

export async function getReadingProgress(
  userId: string,
  bookId: string,
  scope: ReadingProgressScope,
): Promise<ReadingProgressDto | null> {
  const [row] = await db
    .select()
    .from(readingProgress)
    .where(readingProgressKey(userId, bookId, scope))
    .limit(1);

  return row ? toReadingProgress(row) : null;
}

function readingProgressKey(userId: string, bookId: string, scope: ReadingProgressScope) {
  return and(
    eq(readingProgress.userId, userId),
    eq(readingProgress.bookId, bookId),
    eq(readingProgress.scope, scope),
  );
}

function toReadingProgress(row: typeof readingProgress.$inferSelect): ReadingProgressDto {
  return {
    bookId: row.bookId,
    lastChapterId: row.lastChapterId,
    lastChapterNumber: row.lastChapterNumber,
    lastPageNumber: row.lastPageNumber,
    lastScrollPercent: row.lastScrollPercent,
    lastParagraphIndex: row.lastParagraphIndex,
    layout: row.layout,
    capturedAt: row.capturedAt.getTime(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function saveReadingProgress(
  userId: string,
  bookId: string,
  scope: ReadingProgressScope,
  input: SaveReadingProgressInput,
): Promise<ReadingProgressDto> {
  const [book] = await db
    .select({ id: books.id, digitalPolicy: books.digitalPolicy })
    .from(books)
    .where(eq(books.id, bookId))
    .limit(1);
  if (!book) throw new HttpError(404, "BOOK_NOT_FOUND", "Buku tidak ditemukan.");

  const { hasFullAccess } = await getBookReadAccess(book, userId);
  if ((scope === "full" && !hasFullAccess) ||
      (scope === "preview" && input.lastChapterNumber !== 1)) {
    throw new HttpError(403, "FORBIDDEN_DIGITAL_ACCESS", "Posisi ini berada di luar bagian buku yang bisa dibaca.");
  }

  const [chapter] = await db
    .select({ id: bookChapters.id, contentId: bookChapters.contentId })
    .from(bookChapters)
    .where(and(eq(bookChapters.bookId, bookId), eq(bookChapters.chapterNumber, input.lastChapterNumber)))
    .limit(1);
  if (!chapter || (input.lastChapterId && input.lastChapterId !== chapter.id)) {
    throw new HttpError(422, "INVALID_READING_POSITION", "Posisi baca tidak sesuai dengan bab buku.");
  }
  const paragraphCount = scope === "preview"
    ? getPreviewParagraphCount(chapter.contentId)
    : chapter.contentId.split(/\n\n+/).filter((paragraph) => paragraph.trim()).length;
  if ((input.lastParagraphIndex !== undefined && input.lastParagraphIndex >= paragraphCount) ||
      input.lastPageNumber > Math.max(1, paragraphCount)) {
    throw new HttpError(422, "INVALID_READING_POSITION", "Posisi baca berada di luar isi bab.");
  }

  const now = Date.now();
  if (input.capturedAt !== undefined && input.capturedAt > now + 60_000) {
    throw new HttpError(422, "INVALID_READING_POSITION", "Waktu posisi baca tidak valid.");
  }
  const capturedAt = new Date(input.capturedAt ?? now);
  const position = {
    lastChapterId: chapter.id,
    lastChapterNumber: input.lastChapterNumber,
    lastPageNumber: input.lastPageNumber,
    lastScrollPercent: input.lastScrollPercent,
    lastParagraphIndex: input.lastParagraphIndex ?? null,
    layout: input.layout ?? null,
    capturedAt,
    updatedAt: capturedAt,
  };

  const chapters = scope === "full"
    ? await db.select({ number: bookChapters.chapterNumber }).from(bookChapters)
      .where(eq(bookChapters.bookId, bookId)).orderBy(bookChapters.chapterNumber)
    : [];
  const chapterIndex = chapters.findIndex((item) => item.number === input.lastChapterNumber);
  const progressPercent = chapterIndex < 0 ? 0 :
    Math.floor((chapterIndex * 100 + input.lastScrollPercent) / chapters.length);
  const shelfStatus = progressPercent >= 100 ? "finished" : "reading";

  const row = await db.transaction(async (tx) => {
    const [saved] = await tx
      .insert(readingProgress)
      .values({ userId, bookId, scope, ...position })
      .onConflictDoUpdate({
        target: [readingProgress.userId, readingProgress.bookId, readingProgress.scope],
        set: position,
        setWhere: lt(readingProgress.capturedAt, capturedAt),
      })
      .returning();

    if (!saved) {
      const [current] = await tx.select().from(readingProgress)
        .where(readingProgressKey(userId, bookId, scope));
      return current;
    }

    await tx.insert(userShelves).values({ userId, bookId, shelfStatus, progressPercent })
      .onConflictDoUpdate({
        target: [userShelves.userId, userShelves.bookId],
        set: {
          shelfStatus: sql`case when ${userShelves.shelfStatus} = 'finished' then 'finished' else ${shelfStatus} end`,
          progressPercent: sql`greatest(${userShelves.progressPercent}, ${progressPercent})`,
        },
      });
    return saved;
  });

  return toReadingProgress(row);
}

export async function listHighlights(
  userId: string,
  bookId: string,
): Promise<BookHighlightDto[]> {
  const rows = await db
    .select()
    .from(bookHighlights)
    .where(
      and(
        eq(bookHighlights.userId, userId),
        eq(bookHighlights.bookId, bookId),
      ),
    )
    .orderBy(desc(bookHighlights.createdAt));

  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    bookId: r.bookId,
    chapterId: r.chapterId,
    chapterNumber: r.chapterNumber,
    pageNumber: r.pageNumber,
    selectedText: r.selectedText,
    color: r.color as HighlightColor,
    note: r.note,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function listAllUserHighlights(
  userId: string,
): Promise<BookHighlightDto[]> {
  const rows = await db
    .select()
    .from(bookHighlights)
    .where(eq(bookHighlights.userId, userId))
    .orderBy(desc(bookHighlights.createdAt));

  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    bookId: r.bookId,
    chapterId: r.chapterId,
    chapterNumber: r.chapterNumber,
    pageNumber: r.pageNumber,
    selectedText: r.selectedText,
    color: r.color as HighlightColor,
    note: r.note,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function createHighlight(
  userId: string,
  input: CreateHighlightInput,
): Promise<BookHighlightDto> {
  const [created] = await db
    .insert(bookHighlights)
    .values({
      userId,
      bookId: input.bookId,
      chapterId: input.chapterId ?? null,
      chapterNumber: input.chapterNumber,
      pageNumber: input.pageNumber,
      selectedText: input.selectedText,
      color: input.color,
      note: input.note ?? null,
    })
    .returning();

  return {
    id: created.id,
    userId: created.userId,
    bookId: created.bookId,
    chapterId: created.chapterId,
    chapterNumber: created.chapterNumber,
    pageNumber: created.pageNumber,
    selectedText: created.selectedText,
    color: created.color as HighlightColor,
    note: created.note,
    createdAt: created.createdAt.toISOString(),
  };
}

export async function deleteHighlight(
  userId: string,
  highlightId: string,
): Promise<void> {
  const [deleted] = await db
    .delete(bookHighlights)
    .where(
      and(
        eq(bookHighlights.id, highlightId),
        eq(bookHighlights.userId, userId),
      ),
    )
    .returning();

  if (!deleted) {
    throw new HttpError(404, "HIGHLIGHT_NOT_FOUND", "Highlight tidak ditemukan.");
  }
}

export async function listSessionsForBook(
  userId: string,
  bookId: string,
): Promise<ReadingSessionDto[]> {
  const rows = await db
    .select({
      id: readingSessions.id,
      bookId: readingSessions.bookId,
      bookTitle: books.title,
      pagesRead: readingSessions.pagesRead,
      durationSeconds: readingSessions.durationSeconds,
      avgWpm: readingSessions.avgWpm,
      mode: readingSessions.mode,
      createdAt: readingSessions.createdAt,
    })
    .from(readingSessions)
    .innerJoin(books, eq(readingSessions.bookId, books.id))
    .where(
      and(
        eq(readingSessions.userId, userId),
        eq(readingSessions.bookId, bookId),
      ),
    )
    .orderBy(desc(readingSessions.createdAt));

  return rows.map((r) => ({
    id: r.id,
    bookId: r.bookId,
    bookTitle: r.bookTitle,
    pagesRead: r.pagesRead,
    durationSeconds: r.durationSeconds,
    avgWpm: r.avgWpm,
    mode: r.mode as ReadingMode,
    createdAt: r.createdAt.toISOString(),
  }));
}
