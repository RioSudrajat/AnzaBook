import { randomBytes } from "node:crypto";
import { desc, eq, inArray, sql } from "drizzle-orm";
import type {
  AdminOverviewDto,
  BookClaimBatchDto,
  PublisherDto,
} from "@starter/shared/types";
import type {
  AdminListQueryInput,
  AdminReviewAuthorApplicationInput,
  AdminVerifyCalendarInput,
  AdminVerifyPublisherInput,
} from "@starter/shared/validators/admin";
import type { CreateClaimBatchInput } from "@starter/shared/validators/publisher";
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
  user,
} from "../db/schema";
import { HttpError } from "../lib/http-error";
import { countRecentHighRiskDrmEvents24h } from "./drm.service";

function generateClaimCode(): string {
  return `ANZ-${randomBytes(6).toString("hex").toUpperCase()}`;
}

export async function getAdminOverview(): Promise<AdminOverviewDto> {
  const [
    [pendingCalRow],
    [pendingAuthorRow],
    [pendingPubRow],
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
