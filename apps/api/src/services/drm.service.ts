import { randomBytes } from "node:crypto";
import { and, desc, eq, gte, ilike, or, sql } from "drizzle-orm";
import type {
  AdminDrmEventsListResponse,
  DrmSecurityEventDto,
  DrmWatermarkTraceDto,
} from "@starter/shared/types";
import {
  getDrmEventRiskLevel,
  type AdminDrmEventsQueryOutput,
  type RecordDrmEventOutput,
} from "@starter/shared/validators/drm";
import { db } from "../db";
import {
  books,
  drmSecurityEvents,
  drmWatermarkSessions,
  manuscriptSubmissions,
  user,
} from "../db/schema";
import { HttpError } from "../lib/http-error";

const DEDUP_WINDOW_MS = 1500;
const DAY_MS = 24 * 60 * 60 * 1000;

function generateWatermarkCode(): string {
  return `ANZ-${randomBytes(6).toString("hex").toUpperCase()}`;
}

export async function issueOrGetDrmWatermarkSession(input: {
  userId: string;
  bookId: string;
  authSessionId?: string | null;
}): Promise<string> {
  const { userId, bookId, authSessionId } = input;

  if (authSessionId) {
    const [existing] = await db
      .select({
        id: drmWatermarkSessions.id,
        watermarkCode: drmWatermarkSessions.watermarkCode,
      })
      .from(drmWatermarkSessions)
      .where(
        and(
          eq(drmWatermarkSessions.authSessionId, authSessionId),
          eq(drmWatermarkSessions.bookId, bookId),
        ),
      )
      .limit(1);

    if (existing) {
      await db
        .update(drmWatermarkSessions)
        .set({ lastSeenAt: new Date() })
        .where(eq(drmWatermarkSessions.id, existing.id));
      return existing.watermarkCode;
    }
  }

  const watermarkCode = generateWatermarkCode();
  const [inserted] = await db
    .insert(drmWatermarkSessions)
    .values({
      watermarkCode,
      userId,
      authSessionId: authSessionId ?? null,
      bookId,
    })
    .onConflictDoNothing({
      target: [drmWatermarkSessions.authSessionId, drmWatermarkSessions.bookId],
    })
    .returning({ watermarkCode: drmWatermarkSessions.watermarkCode });

  if (inserted) return inserted.watermarkCode;

  if (authSessionId) {
    const [raced] = await db
      .select({ watermarkCode: drmWatermarkSessions.watermarkCode })
      .from(drmWatermarkSessions)
      .where(
        and(
          eq(drmWatermarkSessions.authSessionId, authSessionId),
          eq(drmWatermarkSessions.bookId, bookId),
        ),
      )
      .limit(1);
    if (raced) return raced.watermarkCode;
  }

  return watermarkCode;
}

export async function recordDrmSecurityEvent(params: {
  userId: string;
  input: RecordDrmEventOutput;
  userAgent?: string | null;
  ipAddress?: string | null;
}): Promise<{ id: string; riskLevel: string; createdAt: string }> {
  const { userId, input, userAgent, ipAddress } = params;
  const isManuscriptSlug =
    input.bookSlug.startsWith("manuscript-") ||
    input.bookSlug.startsWith("manu-");

  let resolvedBookId: string | null = null;
  if (isManuscriptSlug) {
    const manuscriptId = input.bookSlug
      .replace(/^manuscript-/, "")
      .replace(/^manu-/, "");
    const [manuscript] = await db
      .select({ id: manuscriptSubmissions.id })
      .from(manuscriptSubmissions)
      .where(eq(manuscriptSubmissions.id, manuscriptId))
      .limit(1);
    if (!manuscript) {
      throw new HttpError(
        404,
        "MANUSCRIPT_NOT_FOUND",
        "Naskah tidak ditemukan.",
      );
    }
  } else {
    const [book] = await db
      .select({ id: books.id })
      .from(books)
      .where(eq(books.slug, input.bookSlug))
      .limit(1);
    if (!book) {
      throw new HttpError(404, "BOOK_NOT_FOUND", "Buku tidak ditemukan.");
    }
    resolvedBookId = book.id;
  }

  const normalizedWatermark = input.watermarkCode.trim().toUpperCase();
  const [wmSession] = await db
    .select({ id: drmWatermarkSessions.id })
    .from(drmWatermarkSessions)
    .where(
      and(
        eq(drmWatermarkSessions.watermarkCode, normalizedWatermark),
        eq(drmWatermarkSessions.userId, userId),
      ),
    )
    .limit(1);

  const riskLevel = getDrmEventRiskLevel(input.eventType);
  const cutoff = new Date(Date.now() - DEDUP_WINDOW_MS);

  const [recentDuplicate] = await db
    .select({
      id: drmSecurityEvents.id,
      riskLevel: drmSecurityEvents.riskLevel,
      createdAt: drmSecurityEvents.createdAt,
    })
    .from(drmSecurityEvents)
    .where(
      and(
        eq(drmSecurityEvents.userId, userId),
        eq(drmSecurityEvents.bookSlug, input.bookSlug),
        eq(drmSecurityEvents.eventType, input.eventType),
        eq(drmSecurityEvents.triggerDetail, input.triggerDetail),
        gte(drmSecurityEvents.createdAt, cutoff),
      ),
    )
    .orderBy(desc(drmSecurityEvents.createdAt))
    .limit(1);

  if (recentDuplicate) {
    return {
      id: recentDuplicate.id,
      riskLevel: recentDuplicate.riskLevel,
      createdAt: recentDuplicate.createdAt.toISOString(),
    };
  }

  const [created] = await db
    .insert(drmSecurityEvents)
    .values({
      userId,
      watermarkSessionId: wmSession?.id ?? null,
      watermarkCode: normalizedWatermark,
      bookId: resolvedBookId,
      bookSlug: input.bookSlug,
      chapterNumber: input.chapterNumber ?? null,
      eventType: input.eventType,
      riskLevel,
      triggerDetail: input.triggerDetail,
      clientOs: input.clientOs,
      userAgent: userAgent ? userAgent.slice(0, 512) : null,
      ipAddress: ipAddress ? ipAddress.slice(0, 64) : null,
    })
    .returning({
      id: drmSecurityEvents.id,
      riskLevel: drmSecurityEvents.riskLevel,
      createdAt: drmSecurityEvents.createdAt,
    });

  return {
    id: created.id,
    riskLevel: created.riskLevel,
    createdAt: created.createdAt.toISOString(),
  };
}

export async function countRecentHighRiskDrmEvents24h(): Promise<number> {
  const since = new Date(Date.now() - DAY_MS);
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(drmSecurityEvents)
    .where(
      and(
        eq(drmSecurityEvents.riskLevel, "high"),
        gte(drmSecurityEvents.createdAt, since),
      ),
    );
  return Number(row?.count ?? 0);
}

function mapEventRow(row: {
  id: string;
  userId: string;
  userName: string;
  username: string | null;
  userEmail: string;
  watermarkCode: string;
  bookId: string | null;
  bookSlug: string;
  bookTitle: string | null;
  chapterNumber: number | null;
  eventType: DrmSecurityEventDto["eventType"];
  riskLevel: DrmSecurityEventDto["riskLevel"];
  triggerDetail: string;
  clientOs: string;
  createdAt: Date;
}): DrmSecurityEventDto {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
  };
}

const drmEventSelection = {
  id: drmSecurityEvents.id,
  userId: drmSecurityEvents.userId,
  userName: user.name,
  username: user.username,
  userEmail: user.email,
  watermarkCode: drmSecurityEvents.watermarkCode,
  bookId: drmSecurityEvents.bookId,
  bookSlug: drmSecurityEvents.bookSlug,
  bookTitle: books.title,
  chapterNumber: drmSecurityEvents.chapterNumber,
  eventType: drmSecurityEvents.eventType,
  riskLevel: drmSecurityEvents.riskLevel,
  triggerDetail: drmSecurityEvents.triggerDetail,
  clientOs: drmSecurityEvents.clientOs,
  createdAt: drmSecurityEvents.createdAt,
};

export async function listAdminDrmEvents(
  query: AdminDrmEventsQueryOutput,
): Promise<AdminDrmEventsListResponse> {
  const filters = [];
  if (query.riskLevel !== "all") {
    filters.push(eq(drmSecurityEvents.riskLevel, query.riskLevel));
  }
  if (query.eventType !== "all") {
    filters.push(eq(drmSecurityEvents.eventType, query.eventType));
  }
  if (query.search) {
    const pattern = `%${query.search}%`;
    filters.push(
      or(
        ilike(user.username, pattern),
        ilike(user.name, pattern),
        ilike(user.email, pattern),
        ilike(drmSecurityEvents.watermarkCode, pattern),
        ilike(drmSecurityEvents.bookSlug, pattern),
        ilike(drmSecurityEvents.triggerDetail, pattern),
      ),
    );
  }

  const whereClause = filters.length > 0 ? and(...filters) : undefined;
  const since24h = new Date(Date.now() - DAY_MS);

  const [rows, [summaryRow]] = await Promise.all([
    db
      .select(drmEventSelection)
      .from(drmSecurityEvents)
      .innerJoin(user, eq(drmSecurityEvents.userId, user.id))
      .leftJoin(books, eq(drmSecurityEvents.bookId, books.id))
      .where(whereClause)
      .orderBy(desc(drmSecurityEvents.createdAt))
      .limit(query.limit + 1)
      .offset(query.offset),
    db
      .select({
        totalEvents: sql<number>`count(*)`,
        highRiskCount: sql<number>`count(*) filter (where ${drmSecurityEvents.riskLevel} = 'high')`,
        mediumRiskCount: sql<number>`count(*) filter (where ${drmSecurityEvents.riskLevel} = 'medium')`,
        lowRiskCount: sql<number>`count(*) filter (where ${drmSecurityEvents.riskLevel} = 'low')`,
        last24hHighRiskCount: sql<number>`count(*) filter (where ${drmSecurityEvents.riskLevel} = 'high' and ${drmSecurityEvents.createdAt} >= ${since24h})`,
        uniqueFlaggedUsersCount: sql<number>`count(distinct ${drmSecurityEvents.userId}) filter (where ${drmSecurityEvents.riskLevel} = 'high')`,
      })
      .from(drmSecurityEvents),
  ]);

  const hasMore = rows.length > query.limit;
  const items = rows.slice(0, query.limit).map(mapEventRow);

  return {
    data: items,
    meta: {
      limit: query.limit,
      offset: query.offset,
      hasMore,
    },
    summary: {
      totalEvents: Number(summaryRow?.totalEvents ?? 0),
      highRiskCount: Number(summaryRow?.highRiskCount ?? 0),
      mediumRiskCount: Number(summaryRow?.mediumRiskCount ?? 0),
      lowRiskCount: Number(summaryRow?.lowRiskCount ?? 0),
      last24hHighRiskCount: Number(summaryRow?.last24hHighRiskCount ?? 0),
      uniqueFlaggedUsersCount: Number(summaryRow?.uniqueFlaggedUsersCount ?? 0),
    },
  };
}

export async function traceDrmWatermarkSession(
  watermarkCode: string,
): Promise<DrmWatermarkTraceDto> {
  const normalizedCode = watermarkCode.trim().toUpperCase();

  const [sessionRow] = await db
    .select({
      watermarkCode: drmWatermarkSessions.watermarkCode,
      userId: drmWatermarkSessions.userId,
      userName: user.name,
      username: user.username,
      userEmail: user.email,
      bookId: drmWatermarkSessions.bookId,
      bookSlug: books.slug,
      bookTitle: books.title,
      createdAt: drmWatermarkSessions.createdAt,
      lastSeenAt: drmWatermarkSessions.lastSeenAt,
    })
    .from(drmWatermarkSessions)
    .innerJoin(user, eq(drmWatermarkSessions.userId, user.id))
    .innerJoin(books, eq(drmWatermarkSessions.bookId, books.id))
    .where(eq(drmWatermarkSessions.watermarkCode, normalizedCode))
    .limit(1);

  if (!sessionRow) {
    throw new HttpError(
      404,
      "WATERMARK_NOT_FOUND",
      "ID sesi watermark tidak ditemukan.",
    );
  }

  const eventRows = await db
    .select(drmEventSelection)
    .from(drmSecurityEvents)
    .innerJoin(user, eq(drmSecurityEvents.userId, user.id))
    .leftJoin(books, eq(drmSecurityEvents.bookId, books.id))
    .where(eq(drmSecurityEvents.watermarkCode, normalizedCode))
    .orderBy(desc(drmSecurityEvents.createdAt))
    .limit(25);

  return {
    watermarkCode: sessionRow.watermarkCode,
    userId: sessionRow.userId,
    userName: sessionRow.userName,
    username: sessionRow.username,
    userEmail: sessionRow.userEmail,
    bookId: sessionRow.bookId,
    bookSlug: sessionRow.bookSlug,
    bookTitle: sessionRow.bookTitle,
    createdAt: sessionRow.createdAt.toISOString(),
    lastSeenAt: sessionRow.lastSeenAt.toISOString(),
    recentEvents: eventRows.map(mapEventRow),
  };
}
