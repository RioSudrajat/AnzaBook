import { randomBytes } from "node:crypto";
import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import type {
  AdminOverviewDto,
  AdminSpotModerationItemDto,
  BookClaimBatchDto,
  PublisherDto,
  ReadingSpotReportDto,
} from "@starter/shared/types";
import type {
  AdminListQueryInput,
  AdminReviewAuthorApplicationInput,
  AdminVerifyCalendarInput,
  AdminVerifyPublisherInput,
} from "@starter/shared/validators/admin";
import type { CreateClaimBatchInput } from "@starter/shared/validators/publisher";
import type {
  ListAdminSpotsQuery,
  ModerateSpotInput,
} from "@starter/shared/validators/spots";
import { db } from "../db";
import {
  authorApplications,
  bookClaimBatches,
  bookClaimCodes,
  bookPurchases,
  books,
  communityCalendars,
  communityWalletLedgers,
  membershipOrders,
  publishers,
  readingSpotReports,
  readingSpots,
  user,
} from "../db/schema";
import { HttpError } from "../lib/http-error";
import { countRecentHighRiskDrmEvents24h } from "./drm.service";
import { toSpotSummary } from "./spots.service";

function generateClaimCode(): string {
  return `ANZ-${randomBytes(6).toString("hex").toUpperCase()}`;
}

export async function getAdminOverview(): Promise<AdminOverviewDto> {
  const [
    [pendingCalRow],
    [pendingAuthorRow],
    [pendingPubRow],
    [pendingSpotsRow],
    [openSpotReportsRow],
    [membershipRevRow],
    [singlePurchaseRevRow],
    [affiliateRow],
    highRiskDrmEvents24hCount,
  ] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(communityCalendars)
      .where(eq(communityCalendars.verificationStatus, "pending")),
    db
      .select({ count: sql<number>`count(*)` })
      .from(authorApplications)
      .where(eq(authorApplications.status, "pending")),
    db
      .select({ count: sql<number>`count(*)` })
      .from(publishers)
      .where(eq(publishers.verificationStatus, "pending")),
    db
      .select({ count: sql<number>`count(*)` })
      .from(readingSpots)
      .where(eq(readingSpots.status, "pending_review")),
    db
      .select({ count: sql<number>`count(*)` })
      .from(readingSpotReports)
      .where(eq(readingSpotReports.status, "open")),
    db
      .select({ total: sql<number>`COALESCE(SUM(price_idr), 0)` })
      .from(membershipOrders)
      .where(eq(membershipOrders.status, "paid")),
    db
      .select({
        totalSales: sql<number>`COALESCE(SUM(price_idr), 0)`,
        totalPublisherShare: sql<number>`COALESCE(SUM(publisher_share_idr), 0)`,
        totalNetAnzabook: sql<number>`COALESCE(SUM(anzabook_net_idr), 0)`,
      })
      .from(bookPurchases)
      .where(eq(bookPurchases.status, "paid")),
    db
      .select({ totalAffiliate: sql<number>`COALESCE(SUM(amount_idr), 0)` })
      .from(communityWalletLedgers)
      .where(
        inArray(communityWalletLedgers.entryType, [
          "affiliate_nakama",
          "affiliate_book_purchase",
        ]),
      ),
    countRecentHighRiskDrmEvents24h(),
  ]);

  const membershipTotal = Number(membershipRevRow?.total ?? 0);
  const estimatedNakamaRoyaltyPoolIdr = Math.round(membershipTotal * 0.55);

  return {
    pendingCalendarsCount: Number(pendingCalRow?.count ?? 0),
    pendingAuthorsCount: Number(pendingAuthorRow?.count ?? 0),
    pendingPublishersCount: Number(pendingPubRow?.count ?? 0),
    pendingSpotsCount: Number(pendingSpotsRow?.count ?? 0),
    openSpotReportsCount: Number(openSpotReportsRow?.count ?? 0),
    highRiskDrmEvents24hCount,
    estimatedNakamaRoyaltyPoolIdr,
    totalSinglePurchaseSalesIdr: Number(singlePurchaseRevRow?.totalSales ?? 0),
    totalPublisherShareIdr: Number(
      singlePurchaseRevRow?.totalPublisherShare ?? 0,
    ),
    totalAffiliateCommissionsIdr: Number(affiliateRow?.totalAffiliate ?? 0),
    totalNetAnzabookIdr: Number(singlePurchaseRevRow?.totalNetAnzabook ?? 0),
  };
}

export async function listAdminCalendars(query: AdminListQueryInput) {
  const whereClause = query.status
    ? eq(
        communityCalendars.verificationStatus,
        query.status as "pending" | "verified" | "trusted" | "rejected",
      )
    : undefined;

  const rows = await db
    .select({
      id: communityCalendars.id,
      slug: communityCalendars.slug,
      name: communityCalendars.name,
      type: communityCalendars.type,
      description: communityCalendars.description,
      avatarUrl: communityCalendars.avatarUrl,
      coverUrl: communityCalendars.coverUrl,
      city: communityCalendars.city,
      contactEmail: communityCalendars.contactEmail,
      socialLinks: communityCalendars.socialLinks,
      verificationStatus: communityCalendars.verificationStatus,
      rejectionReason: communityCalendars.rejectionReason,
      verificationDocuments: communityCalendars.verificationDocuments,
      createdByUserId: communityCalendars.createdByUserId,
      creatorName: user.name,
      creatorEmail: user.email,
      createdAt: communityCalendars.createdAt,
      updatedAt: communityCalendars.updatedAt,
    })
    .from(communityCalendars)
    .leftJoin(user, eq(communityCalendars.createdByUserId, user.id))
    .where(whereClause)
    .orderBy(desc(communityCalendars.createdAt))
    .limit(query.limit ?? 50)
    .offset(query.offset ?? 0);

  return rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function verifyAdminCalendar(
  id: string,
  input: AdminVerifyCalendarInput,
) {
  const status = (input.verificationStatus || input.status)!;
  const [updated] = await db
    .update(communityCalendars)
    .set({
      verificationStatus: status,
      rejectionReason: input.rejectionReason ?? null,
      updatedAt: new Date(),
    })
    .where(eq(communityCalendars.id, id))
    .returning();

  if (!updated) {
    throw new HttpError(
      404,
      "NOT_FOUND",
      "Kalender komunitas tidak ditemukan.",
    );
  }

  return {
    ...updated,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  };
}

export async function listAdminAuthorApplications(query: AdminListQueryInput) {
  const whereClause = query.status
    ? eq(
        authorApplications.status,
        query.status as "pending" | "verified" | "rejected",
      )
    : undefined;

  const rows = await db
    .select({
      id: authorApplications.id,
      userId: authorApplications.userId,
      penName: authorApplications.penName,
      bio: authorApplications.bio,
      portfolioUrl: authorApplications.portfolioUrl,
      claimedBookId: authorApplications.claimedBookId,
      claimedBookTitle: books.title,
      claimedBookCover: books.coverUrl,
      status: authorApplications.status,
      rejectionReason: authorApplications.rejectionReason,
      verificationDocuments: authorApplications.verificationDocuments,
      reviewedByUserId: authorApplications.reviewedByUserId,
      reviewNotes: authorApplications.reviewNotes,
      userName: user.name,
      userEmail: user.email,
      createdAt: authorApplications.createdAt,
      updatedAt: authorApplications.updatedAt,
    })
    .from(authorApplications)
    .leftJoin(user, eq(authorApplications.userId, user.id))
    .leftJoin(books, eq(authorApplications.claimedBookId, books.id))
    .where(whereClause)
    .orderBy(desc(authorApplications.createdAt))
    .limit(query.limit ?? 50)
    .offset(query.offset ?? 0);

  return rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function reviewAdminAuthorApplication(
  id: string,
  reviewerUserId: string,
  input: AdminReviewAuthorApplicationInput,
) {
  return await db.transaction(async (tx) => {
    const [app] = await tx
      .select()
      .from(authorApplications)
      .where(eq(authorApplications.id, id));

    if (!app) {
      throw new HttpError(
        404,
        "NOT_FOUND",
        "Aplikasi penulis tidak ditemukan.",
      );
    }

    const [updatedApp] = await tx
      .update(authorApplications)
      .set({
        status: input.status,
        rejectionReason: input.rejectionReason ?? null,
        reviewedByUserId: reviewerUserId,
        reviewNotes: input.reviewNotes ?? null,
        updatedAt: new Date(),
      })
      .where(eq(authorApplications.id, id))
      .returning();

    if (input.status === "verified") {
      await tx
        .update(user)
        .set({
          authorStatus: "verified",
          authorPenName: app.penName,
          updatedAt: new Date(),
        })
        .where(eq(user.id, app.userId));

      if (app.claimedBookId) {
        await tx
          .update(books)
          .set({
            authorUserId: app.userId,
            updatedAt: new Date(),
          })
          .where(eq(books.id, app.claimedBookId));
      }
    } else if (input.status === "rejected") {
      await tx
        .update(user)
        .set({
          authorStatus: "rejected",
          updatedAt: new Date(),
        })
        .where(eq(user.id, app.userId));
    }

    return {
      ...updatedApp,
      createdAt: updatedApp.createdAt.toISOString(),
      updatedAt: updatedApp.updatedAt.toISOString(),
    };
  });
}

export async function listAdminPublishers(
  query: AdminListQueryInput,
): Promise<PublisherDto[]> {
  const whereClause = query.status
    ? eq(
        publishers.verificationStatus,
        query.status as "pending" | "verified" | "rejected",
      )
    : undefined;

  const rows = await db
    .select()
    .from(publishers)
    .where(whereClause)
    .orderBy(desc(publishers.createdAt))
    .limit(query.limit ?? 50)
    .offset(query.offset ?? 0);

  return rows.map((p) => ({
    ...p,
    verifiedAt: p.verifiedAt ? p.verifiedAt.toISOString() : null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));
}

export async function verifyAdminPublisher(
  id: string,
  input: AdminVerifyPublisherInput,
): Promise<PublisherDto> {
  const status = (input.verificationStatus || input.status)!;
  const verifiedAt = status === "verified" ? new Date() : null;

  const [updated] = await db
    .update(publishers)
    .set({
      verificationStatus: status,
      rejectionReason: input.rejectionReason ?? null,
      verifiedAt,
      updatedAt: new Date(),
    })
    .where(eq(publishers.id, id))
    .returning();

  if (!updated) {
    throw new HttpError(404, "NOT_FOUND", "Penerbit tidak ditemukan.");
  }

  return {
    ...updated,
    verifiedAt: updated.verifiedAt ? updated.verifiedAt.toISOString() : null,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  };
}

export async function createAdminClaimBatch(
  input: CreateClaimBatchInput,
): Promise<{
  batch: BookClaimBatchDto;
  codes: string[];
}> {
  return await db.transaction(async (tx) => {
    const [pub] = await tx
      .select()
      .from(publishers)
      .where(eq(publishers.id, input.publisherId));

    if (!pub) {
      throw new HttpError(404, "NOT_FOUND", "Penerbit tidak ditemukan.");
    }

    const [book] = await tx
      .select()
      .from(books)
      .where(eq(books.id, input.bookId));

    if (!book) {
      throw new HttpError(404, "NOT_FOUND", "Buku tidak ditemukan.");
    }

    // Check existing batches for this book
    const [existingCountRow] = await tx
      .select({ count: sql<number>`count(*)` })
      .from(bookClaimBatches)
      .where(eq(bookClaimBatches.bookId, input.bookId));

    const existingBatchesCount = Number(existingCountRow?.count ?? 0);
    const isFirstBatch = existingBatchesCount === 0;

    const billingStatus = isFirstBatch ? "free_tier" : "unbilled";
    const unitFeeIdr = isFirstBatch ? 0 : (pub.claimCodeFeeIdr ?? 2000);

    const [batch] = await tx
      .insert(bookClaimBatches)
      .values({
        bookId: input.bookId,
        publisherId: input.publisherId,
        batchName: input.batchName,
        totalCodes: input.totalCodes,
        unitFeeIdr,
        billingStatus,
      })
      .returning();

    const generatedCodes: string[] = [];
    const codeRecords: {
      bookId: string;
      batchId: string;
      code: string;
      isDemo: boolean;
    }[] = [];

    for (let i = 0; i < input.totalCodes; i++) {
      const code = generateClaimCode();
      generatedCodes.push(code);
      codeRecords.push({
        bookId: input.bookId,
        batchId: batch.id,
        code,
        isDemo: false,
      });
    }

    // Insert codes in chunks to prevent query parameter limits
    const CHUNK_SIZE = 500;
    for (let i = 0; i < codeRecords.length; i += CHUNK_SIZE) {
      const chunk = codeRecords.slice(i, i + CHUNK_SIZE);
      await tx.insert(bookClaimCodes).values(chunk);
    }

    return {
      batch: {
        id: batch.id,
        bookId: batch.bookId,
        bookTitle: book.title,
        publisherId: batch.publisherId,
        publisherName: pub.name,
        batchName: batch.batchName,
        totalCodes: batch.totalCodes,
        unitFeeIdr: batch.unitFeeIdr,
        billingStatus: batch.billingStatus,
        createdAt: batch.createdAt.toISOString(),
      },
      codes: generatedCodes,
    };
  });
}

export async function getAdminClaimBatchCodes(batchId: string) {
  const [batchRow] = await db
    .select({
      id: bookClaimBatches.id,
      bookId: bookClaimBatches.bookId,
      bookTitle: books.title,
      publisherId: bookClaimBatches.publisherId,
      publisherName: publishers.name,
      batchName: bookClaimBatches.batchName,
      totalCodes: bookClaimBatches.totalCodes,
      unitFeeIdr: bookClaimBatches.unitFeeIdr,
      billingStatus: bookClaimBatches.billingStatus,
      createdAt: bookClaimBatches.createdAt,
    })
    .from(bookClaimBatches)
    .leftJoin(books, eq(bookClaimBatches.bookId, books.id))
    .leftJoin(publishers, eq(bookClaimBatches.publisherId, publishers.id))
    .where(eq(bookClaimBatches.id, batchId));

  if (!batchRow) {
    throw new HttpError(404, "NOT_FOUND", "Batch kode klaim tidak ditemukan.");
  }

  const codes = await db
    .select({
      id: bookClaimCodes.id,
      code: bookClaimCodes.code,
      isDemo: bookClaimCodes.isDemo,
      claimedByUserId: bookClaimCodes.claimedByUserId,
      claimedAt: bookClaimCodes.claimedAt,
      createdAt: bookClaimCodes.createdAt,
    })
    .from(bookClaimCodes)
    .where(eq(bookClaimCodes.batchId, batchId))
    .orderBy(desc(bookClaimCodes.createdAt));

  return {
    batch: {
      ...batchRow,
      createdAt: batchRow.createdAt.toISOString(),
    },
    codes: codes.map((c) => ({
      ...c,
      claimedAt: c.claimedAt ? c.claimedAt.toISOString() : null,
      createdAt: c.createdAt.toISOString(),
    })),
  };
}

const SPOT_UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function escapeSpotLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

export async function listAdminSpots(
  query: ListAdminSpotsQuery,
): Promise<AdminSpotModerationItemDto[]> {
  const conditions = [];

  if (query.status) {
    conditions.push(eq(readingSpots.status, query.status));
  }

  if (query.hasOpenReports === true) {
    conditions.push(
      sql`exists (
        select 1 from ${readingSpotReports}
        where ${readingSpotReports.spotId} = ${readingSpots.id}
          and ${readingSpotReports.status} = 'open'
      )`,
    );
  } else if (query.hasOpenReports === false) {
    conditions.push(
      sql`not exists (
        select 1 from ${readingSpotReports}
        where ${readingSpotReports.spotId} = ${readingSpots.id}
          and ${readingSpotReports.status} = 'open'
      )`,
    );
  }

  if (query.q) {
    const pattern = `%${escapeSpotLikePattern(query.q)}%`;
    conditions.push(
      or(
        ilike(readingSpots.name, pattern),
        ilike(readingSpots.city, pattern),
        ilike(readingSpots.address, pattern),
        ilike(readingSpots.district, pattern),
      )!,
    );
  }

  const rows = await db
    .select({
      spot: readingSpots,
      submitterName: user.name,
      submitterEmail: user.email,
    })
    .from(readingSpots)
    .leftJoin(user, eq(readingSpots.submittedByUserId, user.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(readingSpots.createdAt))
    .limit(query.limit)
    .offset(query.offset);

  if (rows.length === 0) return [];

  const spotIds = rows.map((r) => r.spot.id);
  const reportRows = await db
    .select({
      report: readingSpotReports,
      reporterName: user.name,
    })
    .from(readingSpotReports)
    .leftJoin(user, eq(readingSpotReports.reporterUserId, user.id))
    .where(inArray(readingSpotReports.spotId, spotIds))
    .orderBy(desc(readingSpotReports.createdAt));

  const openCountBySpot = new Map<string, number>();
  const recentReportsBySpot = new Map<string, ReadingSpotReportDto[]>();

  for (const row of reportRows) {
    const sid = row.report.spotId;
    if (row.report.status === "open") {
      openCountBySpot.set(sid, (openCountBySpot.get(sid) ?? 0) + 1);
    }
    const list = recentReportsBySpot.get(sid) ?? [];
    if (list.length < 10) {
      list.push({
        id: row.report.id,
        spotId: row.report.spotId,
        reviewId: row.report.reviewId,
        reporterUserId: row.report.reporterUserId,
        reporterName: row.reporterName ?? null,
        reasonType: row.report.reasonType,
        details: row.report.details,
        status: row.report.status,
        createdAt: row.report.createdAt.toISOString(),
      });
      recentReportsBySpot.set(sid, list);
    }
  }

  return rows.map(({ spot, submitterName, submitterEmail }) => ({
    ...toSpotSummary(spot),
    status: spot.status,
    source: spot.source,
    rejectionReason: spot.rejectionReason,
    submittedByUserId: spot.submittedByUserId,
    submitterName: submitterName ?? null,
    submitterEmail: submitterEmail ?? null,
    openReportsCount: openCountBySpot.get(spot.id) ?? 0,
    recentReports: recentReportsBySpot.get(spot.id) ?? [],
    createdAt: spot.createdAt.toISOString(),
    updatedAt: spot.updatedAt.toISOString(),
  }));
}

export async function moderateAdminSpot(
  id: string,
  input: ModerateSpotInput,
): Promise<AdminSpotModerationItemDto> {
  if (!SPOT_UUID_REGEX.test(id)) {
    throw new HttpError(404, "SPOT_NOT_FOUND", "Sudut baca tidak ditemukan.");
  }

  return await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(readingSpots)
      .where(eq(readingSpots.id, id))
      .for("update")
      .limit(1);

    if (!existing) {
      throw new HttpError(404, "SPOT_NOT_FOUND", "Sudut baca tidak ditemukan.");
    }

    const patch: Partial<typeof readingSpots.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (input.action === "approve" || input.action === "reopen") {
      patch.status = "published";
      patch.rejectionReason = null;
    } else if (input.action === "reject") {
      patch.status = "rejected";
      patch.rejectionReason = input.rejectionReason?.trim() ?? null;
    } else if (input.action === "mark_closed") {
      patch.status = "closed";
      if (input.rejectionReason !== undefined) {
        patch.rejectionReason = input.rejectionReason.trim() || null;
      }
    }

    if (input.verifiedBadge !== undefined)
      patch.verifiedBadge = input.verifiedBadge;
    if (input.name !== undefined) patch.name = input.name;
    if (input.category !== undefined) patch.category = input.category;
    if (input.description !== undefined) patch.description = input.description;
    if (input.address !== undefined) patch.address = input.address;
    if (input.district !== undefined) patch.district = input.district;
    if (input.city !== undefined) patch.city = input.city;
    if (input.province !== undefined) patch.province = input.province;
    if (input.openingHoursText !== undefined)
      patch.openingHoursText = input.openingHoursText;
    if (input.priceRange !== undefined) patch.priceRange = input.priceRange;
    if (input.noiseLevel !== undefined) patch.noiseLevel = input.noiseLevel;
    if (input.facilities !== undefined) patch.facilities = input.facilities;
    if (input.googleMapsUrl !== undefined) {
      patch.googleMapsUrl =
        input.googleMapsUrl && input.googleMapsUrl.trim() !== ""
          ? input.googleMapsUrl.trim()
          : null;
    }
    if (input.coverUrl !== undefined) {
      patch.coverUrl =
        input.coverUrl && input.coverUrl.trim() !== ""
          ? input.coverUrl.trim()
          : null;
    }

    const [updated] = await tx
      .update(readingSpots)
      .set(patch)
      .where(eq(readingSpots.id, id))
      .returning();

    await tx
      .update(readingSpotReports)
      .set({ status: "resolved" })
      .where(
        and(
          eq(readingSpotReports.spotId, id),
          eq(readingSpotReports.status, "open"),
        ),
      );

    let submitterName: string | null = null;
    let submitterEmail: string | null = null;
    if (updated.submittedByUserId) {
      const [submitter] = await tx
        .select({ name: user.name, email: user.email })
        .from(user)
        .where(eq(user.id, updated.submittedByUserId))
        .limit(1);
      submitterName = submitter?.name ?? null;
      submitterEmail = submitter?.email ?? null;
    }

    const recentReportRows = await tx
      .select({
        report: readingSpotReports,
        reporterName: user.name,
      })
      .from(readingSpotReports)
      .leftJoin(user, eq(readingSpotReports.reporterUserId, user.id))
      .where(eq(readingSpotReports.spotId, id))
      .orderBy(desc(readingSpotReports.createdAt))
      .limit(10);

    return {
      ...toSpotSummary(updated),
      status: updated.status,
      source: updated.source,
      rejectionReason: updated.rejectionReason,
      submittedByUserId: updated.submittedByUserId,
      submitterName,
      submitterEmail,
      openReportsCount: 0,
      recentReports: recentReportRows.map((r) => ({
        id: r.report.id,
        spotId: r.report.spotId,
        reviewId: r.report.reviewId,
        reporterUserId: r.report.reporterUserId,
        reporterName: r.reporterName ?? null,
        reasonType: r.report.reasonType,
        details: r.report.details,
        status: r.report.status,
        createdAt: r.report.createdAt.toISOString(),
      })),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  });
}
