import { and, desc, eq } from "drizzle-orm";
import { db } from "../db";
import { books, readingSessions, userShelves } from "../db/schema";
import type {
  CreateReadingSessionInput,
  ListReadingSessionsQuery,
} from "@starter/shared/validators/reading";
import type {
  ReadingMode,
  ReadingSessionDto,
  ReadingTelemetrySummaryDto,
} from "@starter/shared/types";

export async function createReadingSession(
  userId: string,
  input: CreateReadingSessionInput,
): Promise<ReadingSessionDto> {
  const [book] = await db
    .select({ id: books.id, title: books.title, pageCount: books.pageCount })
    .from(books)
    .where(eq(books.id, input.bookId))
    .limit(1);

  const [session] = await db
    .insert(readingSessions)
    .values({
      userId,
      bookId: input.bookId,
      pagesRead: input.pagesRead,
      durationSeconds: input.durationSeconds,
      avgWpm: input.avgWpm,
      mode: input.mode,
    })
    .returning();

  // Update or insert shelf entry
  const [existingShelf] = await db
    .select()
    .from(userShelves)
    .where(
      and(
        eq(userShelves.userId, userId),
        eq(userShelves.bookId, input.bookId),
      ),
    )
    .limit(1);

  const totalPagesForBook = book?.pageCount || 200;
  const newProgressPct = Math.min(
    100,
    Math.round(((existingShelf?.progressPercent || 0) * totalPagesForBook / 100 + input.pagesRead) / totalPagesForBook * 100),
  );

  if (existingShelf) {
    await db
      .update(userShelves)
      .set({
        progressPercent: Math.max(existingShelf.progressPercent, newProgressPct),
        shelfStatus: newProgressPct >= 100 ? "finished" : existingShelf.shelfStatus === "want_to_read" ? "reading" : existingShelf.shelfStatus,
        updatedAt: new Date(),
      })
      .where(eq(userShelves.id, existingShelf.id));
  } else {
    await db.insert(userShelves).values({
      userId,
      bookId: input.bookId,
      shelfStatus: newProgressPct >= 100 ? "finished" : "reading",
      progressPercent: newProgressPct,
    });
  }

  return {
    id: session.id,
    bookId: session.bookId,
    bookTitle: book?.title || "Buku Pilihan",
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

  // Streak calculation (consecutive days)
  const distinctDays = new Set<string>();
  for (const s of allUserSessions) {
    distinctDays.add(s.createdAt.toISOString().slice(0, 10));
  }
  const currentStreakDays = distinctDays.size;

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
