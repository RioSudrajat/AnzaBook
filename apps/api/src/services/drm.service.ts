import { randomBytes } from "node:crypto";
import { and, desc, eq, gt, gte, ilike, or, sql } from "drizzle-orm";
import type {
  AdminDrmEventsListResponse,
  AdminDrmSuspensionsListResponse,
  DrmReaderSuspensionDto,
  DrmSecurityEventDto,
  DrmWatermarkTraceDto,
  ReaderDrmStatusDto,
  RecordDrmEventResultDto,
} from "@starter/shared/types";
import {
  DRM_HIGH_RISK_SUSPEND_THRESHOLD,
  getDrmEventRiskLevel,
  type AdminDrmEventsQueryOutput,
  type AdminDrmSuspensionsQueryOutput,
  type AdminReviewDrmAppealOutput,
  type DrmClientOs,
  type RecordDrmEventOutput,
} from "@starter/shared/validators/drm";
import { db } from "../db";
import {
  books,
  drmReaderSuspensions,
  drmSecurityEvents,
  drmWatermarkSessions,
  manuscriptSubmissions,
  user,
} from "../db/schema";
import { HttpError } from "../lib/http-error";

const DEDUP_WINDOW_MS = 1500;
const DAY_MS = 24 * 60 * 60 * 1000;
const SCRAPE_SHORT_WINDOW_MS = 15_000;
const SCRAPE_SHORT_MAX_CHAPTERS = 6;
const SCRAPE_LONG_WINDOW_MS = 60_000;
const SCRAPE_LONG_MAX_CHAPTERS = 12;

type ChapterDeliveryEntry = { chapterNumber: number; deliveredAt: number };
const chapterDeliveryHistory = new Map<string, ChapterDeliveryEntry[]>();

function inferClientOsFromUserAgent(userAgent?: string | null): DrmClientOs {
  const ua = (userAgent ?? "").toLowerCase();
  if (ua.includes("android")) return "android";
  if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod")) {
    return "ios";
  }
  if (ua.includes("windows")) return "windows";
  if (ua.includes("mac os") || ua.includes("macintosh")) return "macos";
  if (ua.includes("linux")) return "linux";
  return "unknown";
}

function pruneChapterDeliveryHistory(now: number) {
  if (chapterDeliveryHistory.size <= 5000) return;
  for (const [key, entries] of chapterDeliveryHistory.entries()) {
    const active = entries.filter(
      (entry) => now - entry.deliveredAt <= SCRAPE_LONG_WINDOW_MS,
    );
    if (active.length === 0) {
      chapterDeliveryHistory.delete(key);
    } else {
      chapterDeliveryHistory.set(key, active);
    }
  }
}

/**
 * Blocks rapid distinct-chapter harvesting per user and book while allowing
 * repeated refetches of already-delivered chapters (e.g. window focus reloads).
 */
export async function enforceChapterWindowRateLimit(params: {
  userId: string;
  userRole?: string | null;
  bookId: string;
  bookSlug: string;
  requestedChapterNum: number;
  deliveredChapters: number[];
  watermarkCode: string;
  userAgent?: string | null;
  ipAddress?: string | null;
}): Promise<void> {
  const {
    userId,
    userRole,
    bookId,
    bookSlug,
    requestedChapterNum,
    deliveredChapters,
    watermarkCode,
    userAgent,
    ipAddress,
  } = params;
  if (deliveredChapters.length === 0) return;

  const now = Date.now();
  pruneChapterDeliveryHistory(now);
  const key = `${userId}:${bookId}`;
  const recentLong = (chapterDeliveryHistory.get(key) ?? []).filter(
    (entry) => now - entry.deliveredAt <= SCRAPE_LONG_WINDOW_MS,
  );

  const shortDistinct = new Set(
    recentLong
      .filter((entry) => now - entry.deliveredAt <= SCRAPE_SHORT_WINDOW_MS)
      .map((entry) => entry.chapterNumber),
  );
  const longDistinct = new Set(recentLong.map((entry) => entry.chapterNumber));

  const newForShort = deliveredChapters.filter((ch) => !shortDistinct.has(ch));
  const newForLong = deliveredChapters.filter((ch) => !longDistinct.has(ch));

  // Refetches inside the already-delivered window never consume scrape quota.
  if (newForShort.length === 0 && newForLong.length === 0) {
    chapterDeliveryHistory.set(key, recentLong);
    return;
  }

  const projectedShortCount = new Set([...shortDistinct, ...newForShort]).size;
  const projectedLongCount = new Set([...longDistinct, ...newForLong]).size;

  const exceedsShort =
    newForShort.length > 0 && projectedShortCount > SCRAPE_SHORT_MAX_CHAPTERS;
  const exceedsLong =
    newForLong.length > 0 && projectedLongCount > SCRAPE_LONG_MAX_CHAPTERS;

  if (exceedsShort || exceedsLong) {
    chapterDeliveryHistory.set(key, recentLong);
    const windowSummary = exceedsShort
      ? `${projectedShortCount} bab unik / 15 detik`
      : `${projectedLongCount} bab unik / 60 detik`;
    await recordDrmSecurityEvent({
      userId,
      userRole,
      input: {
        bookSlug,
        chapterNumber: requestedChapterNum,
        eventType: "api_scrape_anomaly",
        triggerDetail: `Burst fetch API terlalu cepat (${windowSummary}, target bab ${requestedChapterNum})`,
        watermarkCode,
        clientOs: inferClientOsFromUserAgent(userAgent),
      },
      userAgent,
      ipAddress,
    });
    throw new HttpError(
      429,
      "RATE_LIMITED",
      "Permintaan bab terlalu cepat terdeteksi. Akses dibatasi sementara demi keamanan naskah.",
    );
  }

  for (const ch of newForShort) {
    recentLong.push({ chapterNumber: ch, deliveredAt: now });
  }
  chapterDeliveryHistory.set(key, recentLong);
}

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

const drmSuspensionSelection = {
  id: drmReaderSuspensions.id,
  userId: drmReaderSuspensions.userId,
  userName: user.name,
  username: user.username,
  userEmail: user.email,
  status: drmReaderSuspensions.status,
  cycleNumber: drmReaderSuspensions.cycleNumber,
  triggerCount: drmReaderSuspensions.triggerCount,
  lastEventType: drmReaderSuspensions.lastEventType,
  lastBookSlug: drmReaderSuspensions.lastBookSlug,
  suspendedAt: drmReaderSuspensions.suspendedAt,
  appealMessage: drmReaderSuspensions.appealMessage,
  appealedAt: drmReaderSuspensions.appealedAt,
  reviewNote: drmReaderSuspensions.reviewNote,
  reviewedAt: drmReaderSuspensions.reviewedAt,
  reinstatedAt: drmReaderSuspensions.reinstatedAt,
};

function mapSuspensionRow(row: {
  id: string;
  userId: string;
  userName: string;
  username: string | null;
  userEmail: string;
  status: DrmReaderSuspensionDto["status"];
  cycleNumber: number;
  triggerCount: number;
  lastEventType: DrmReaderSuspensionDto["lastEventType"];
  lastBookSlug: string | null;
  suspendedAt: Date;
  appealMessage: string | null;
  appealedAt: Date | null;
  reviewNote: string | null;
  reviewedAt: Date | null;
  reinstatedAt: Date | null;
}): DrmReaderSuspensionDto {
  return {
    id: row.id,
    userId: row.userId,
    userName: row.userName,
    username: row.username,
    userEmail: row.userEmail,
    status: row.status,
    cycleNumber: row.cycleNumber,
    triggerCount: row.triggerCount,
    lastEventType: row.lastEventType,
    lastBookSlug: row.lastBookSlug,
    suspendedAt: row.suspendedAt.toISOString(),
    appealMessage: row.appealMessage,
    appealedAt: row.appealedAt ? row.appealedAt.toISOString() : null,
    reviewNote: row.reviewNote,
    reviewedAt: row.reviewedAt ? row.reviewedAt.toISOString() : null,
    reinstatedAt: row.reinstatedAt ? row.reinstatedAt.toISOString() : null,
  };
}

async function getLatestUserSuspension(userId: string) {
  const [latest] = await db
    .select(drmSuspensionSelection)
    .from(drmReaderSuspensions)
    .innerJoin(user, eq(drmReaderSuspensions.userId, user.id))
    .where(eq(drmReaderSuspensions.userId, userId))
    .orderBy(
      desc(drmReaderSuspensions.suspendedAt),
      desc(drmReaderSuspensions.cycleNumber),
    )
    .limit(1);
  return latest ?? null;
}

async function countHighRiskInCycle(
  userId: string,
  cycleStart: Date | null,
): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(drmSecurityEvents)
    .where(
      and(
        eq(drmSecurityEvents.userId, userId),
        eq(drmSecurityEvents.riskLevel, "high"),
        cycleStart ? gt(drmSecurityEvents.createdAt, cycleStart) : undefined,
      ),
    );
  return Number(row?.count ?? 0);
}

export async function assertReaderNotSuspended(
  userId: string,
  userRole?: string | null,
): Promise<void> {
  if (userRole === "admin") return;
  const latest = await getLatestUserSuspension(userId);
  if (!latest || latest.status === "reinstated") return;

  throw new HttpError(
    403,
    "READER_SUSPENDED",
    "Akses E-Reader akun Anda dibekukan sementara karena mencapai batas 7 pelanggaran DRM prioritas tinggi. Ajukan peninjauan kepada Admin untuk memulihkan akses baca.",
  );
}

export async function getReaderDrmStatus(
  userId: string,
): Promise<ReaderDrmStatusDto> {
  const latest = await getLatestUserSuspension(userId);
  const isSuspended = latest !== null && latest.status !== "reinstated";
  const cycleStart =
    latest?.status === "reinstated" && latest.reinstatedAt
      ? latest.reinstatedAt
      : null;
  const highRiskCount = isSuspended
    ? latest.triggerCount
    : await countHighRiskInCycle(userId, cycleStart);

  return {
    status: isSuspended ? latest.status : "active",
    highRiskCount,
    strikeLimit: DRM_HIGH_RISK_SUSPEND_THRESHOLD,
    latestSuspension: latest ? mapSuspensionRow(latest) : null,
  };
}

export async function recordDrmSecurityEvent(params: {
  userId: string;
  userRole?: string | null;
  input: RecordDrmEventOutput;
  userAgent?: string | null;
  ipAddress?: string | null;
}): Promise<RecordDrmEventResultDto> {
  const { userId, userRole, input, userAgent, ipAddress } = params;
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

  const latest = await getLatestUserSuspension(userId);
  const alreadySuspended = latest !== null && latest.status !== "reinstated";
  const cycleStart =
    latest?.status === "reinstated" && latest.reinstatedAt
      ? latest.reinstatedAt
      : null;

  const riskLevel = getDrmEventRiskLevel(input.eventType);
  const cutoff = new Date(Date.now() - DEDUP_WINDOW_MS);
  // Ensure post-reinstatement events always belong to the new cycle cleanly without cross-cycle dedup.
  const dedupSince = cycleStart && cycleStart > cutoff ? cycleStart : cutoff;

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
        gte(drmSecurityEvents.createdAt, dedupSince),
      ),
    )
    .orderBy(desc(drmSecurityEvents.createdAt))
    .limit(1);

  if (recentDuplicate) {
    const highRiskCount = alreadySuspended
      ? latest.triggerCount
      : await countHighRiskInCycle(userId, cycleStart);
    return {
      id: recentDuplicate.id,
      riskLevel: recentDuplicate.riskLevel,
      createdAt: recentDuplicate.createdAt.toISOString(),
      highRiskCount,
      strikeLimit: DRM_HIGH_RISK_SUSPEND_THRESHOLD,
      suspensionTriggered: false,
      readerStatus: alreadySuspended ? latest.status : "active",
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

  const highRiskCount = alreadySuspended
    ? latest.triggerCount
    : await countHighRiskInCycle(userId, cycleStart);

  let suspensionTriggered = false;
  let readerStatus: RecordDrmEventResultDto["readerStatus"] = alreadySuspended
    ? latest.status
    : "active";

  if (
    userRole !== "admin" &&
    !alreadySuspended &&
    riskLevel === "high" &&
    highRiskCount >= DRM_HIGH_RISK_SUSPEND_THRESHOLD
  ) {
    const insertedSuspension = await db.transaction(async (tx) => {
      const [active] = await tx
        .select({
          id: drmReaderSuspensions.id,
          status: drmReaderSuspensions.status,
        })
        .from(drmReaderSuspensions)
        .where(eq(drmReaderSuspensions.userId, userId))
        .orderBy(
          desc(drmReaderSuspensions.suspendedAt),
          desc(drmReaderSuspensions.cycleNumber),
        )
        .limit(1);

      if (active && active.status !== "reinstated") {
        return null;
      }

      const nextCycle = (latest?.cycleNumber ?? 0) + 1;
      const [createdSuspension] = await tx
        .insert(drmReaderSuspensions)
        .values({
          userId,
          status: "suspended",
          cycleNumber: nextCycle,
          triggerCount: highRiskCount,
          lastEventType: input.eventType,
          lastBookSlug: input.bookSlug,
        })
        .returning({ status: drmReaderSuspensions.status });
      return createdSuspension ?? null;
    });

    if (insertedSuspension) {
      suspensionTriggered = true;
      readerStatus = insertedSuspension.status;
    }
  }

  return {
    id: created.id,
    riskLevel: created.riskLevel,
    createdAt: created.createdAt.toISOString(),
    highRiskCount,
    strikeLimit: DRM_HIGH_RISK_SUSPEND_THRESHOLD,
    suspensionTriggered,
    readerStatus,
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

export async function submitReaderDrmAppeal(
  userId: string,
  appealMessage: string,
): Promise<DrmReaderSuspensionDto> {
  const latest = await getLatestUserSuspension(userId);
  if (!latest || latest.status === "reinstated") {
    throw new HttpError(
      409,
      "NO_ACTIVE_SUSPENSION",
      "Akses membaca akun Anda saat ini sedang aktif.",
    );
  }
  if (latest.status === "appeal_pending") {
    throw new HttpError(
      409,
      "APPEAL_ALREADY_PENDING",
      "Permintaan peninjauan Anda sudah diterima dan sedang menunggu keputusan Admin.",
    );
  }

  await db
    .update(drmReaderSuspensions)
    .set({
      status: "appeal_pending",
      appealMessage,
      appealedAt: new Date(),
    })
    .where(eq(drmReaderSuspensions.id, latest.id));

  const updated = await getLatestUserSuspension(userId);
  if (!updated) {
    throw new HttpError(
      404,
      "SUSPENSION_NOT_FOUND",
      "Data suspensi pembaca tidak ditemukan.",
    );
  }
  return mapSuspensionRow(updated);
}

export async function listAdminDrmSuspensions(
  query: AdminDrmSuspensionsQueryOutput,
): Promise<AdminDrmSuspensionsListResponse> {
  const filters = [];
  if (query.status !== "all") {
    filters.push(eq(drmReaderSuspensions.status, query.status));
  }
  if (query.search) {
    const pattern = `%${query.search}%`;
    filters.push(
      or(
        ilike(user.username, pattern),
        ilike(user.name, pattern),
        ilike(user.email, pattern),
        ilike(drmReaderSuspensions.lastBookSlug, pattern),
      ),
    );
  }

  const whereClause = filters.length > 0 ? and(...filters) : undefined;

  const [rows, [summaryRow]] = await Promise.all([
    db
      .select(drmSuspensionSelection)
      .from(drmReaderSuspensions)
      .innerJoin(user, eq(drmReaderSuspensions.userId, user.id))
      .where(whereClause)
      .orderBy(desc(drmReaderSuspensions.suspendedAt))
      .limit(query.limit + 1)
      .offset(query.offset),
    db
      .select({
        activeSuspendedCount: sql<number>`count(*) filter (where ${drmReaderSuspensions.status} = 'suspended')`,
        appealPendingCount: sql<number>`count(*) filter (where ${drmReaderSuspensions.status} = 'appeal_pending')`,
        reinstatedCount: sql<number>`count(*) filter (where ${drmReaderSuspensions.status} = 'reinstated')`,
        rejectedCount: sql<number>`count(*) filter (where ${drmReaderSuspensions.status} = 'rejected')`,
      })
      .from(drmReaderSuspensions),
  ]);

  const hasMore = rows.length > query.limit;
  const items = rows.slice(0, query.limit).map(mapSuspensionRow);

  return {
    data: items,
    meta: {
      limit: query.limit,
      offset: query.offset,
      hasMore,
    },
    summary: {
      activeSuspendedCount: Number(summaryRow?.activeSuspendedCount ?? 0),
      appealPendingCount: Number(summaryRow?.appealPendingCount ?? 0),
      reinstatedCount: Number(summaryRow?.reinstatedCount ?? 0),
      rejectedCount: Number(summaryRow?.rejectedCount ?? 0),
    },
  };
}

export async function reviewDrmSuspension(
  suspensionId: string,
  adminUserId: string,
  input: AdminReviewDrmAppealOutput,
): Promise<DrmReaderSuspensionDto> {
  const [existing] = await db
    .select(drmSuspensionSelection)
    .from(drmReaderSuspensions)
    .innerJoin(user, eq(drmReaderSuspensions.userId, user.id))
    .where(eq(drmReaderSuspensions.id, suspensionId))
    .limit(1);

  if (!existing) {
    throw new HttpError(
      404,
      "SUSPENSION_NOT_FOUND",
      "Data suspensi DRM tidak ditemukan.",
    );
  }
  if (existing.status === "reinstated") {
    throw new HttpError(
      409,
      "ALREADY_REINSTATED",
      "Akses E-Reader akun ini sudah dipulihkan sebelumnya.",
    );
  }

  const now = new Date();
  const nextStatus = input.action === "approve" ? "reinstated" : "rejected";
  const defaultNote =
    input.action === "approve"
      ? "Akses membaca E-Reader dipulihkan setelah peninjauan Admin."
      : "Permintaan peninjauan ditolak karena indikasi pelanggaran hak cipta.";

  await db
    .update(drmReaderSuspensions)
    .set({
      status: nextStatus,
      reviewedByUserId: adminUserId,
      reviewNote: input.reviewNote ?? defaultNote,
      reviewedAt: now,
      reinstatedAt: input.action === "approve" ? now : null,
    })
    .where(eq(drmReaderSuspensions.id, existing.id));

  const [updated] = await db
    .select(drmSuspensionSelection)
    .from(drmReaderSuspensions)
    .innerJoin(user, eq(drmReaderSuspensions.userId, user.id))
    .where(eq(drmReaderSuspensions.id, existing.id))
    .limit(1);

  return mapSuspensionRow(updated);
}
