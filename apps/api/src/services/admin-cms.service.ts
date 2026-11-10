import { randomBytes, randomUUID } from "node:crypto";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type {
  AdminOverviewDto,
  BookClaimBatchDto,
  DigitalPolicy,
  ManuscriptSubmissionDto,
  PublisherDto,
} from "@starter/shared/types";
import type {
  AdminEditManuscriptInput,
  AdminListQueryInput,
  AdminPublishManuscriptInput,
  AdminReviewAuthorApplicationInput,
  AdminVerifyCalendarInput,
  AdminVerifyPublisherInput,
} from "@starter/shared/validators/admin";
import type { CreateClaimBatchInput } from "@starter/shared/validators/publisher";
import { db } from "../db";
import {
  authorApplications,
  bookChapters,
  bookClaimBatches,
  bookClaimCodes,
  bookPurchases,
  books,
  communityCalendars,
  communityWalletLedgers,
  manuscriptChapters,
  manuscriptSubmissions,
  membershipOrders,
  publishers,
  user,
} from "../db/schema";
import { HttpError } from "../lib/http-error";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/--+/g, "-")
    .trim();
}

function generateClaimCode(): string {
  return `ANZ-${randomBytes(6).toString("hex").toUpperCase()}`;
}

export async function getAdminOverview(): Promise<AdminOverviewDto> {
  const [
    [pendingCalRow],
    [pendingAuthorRow],
    [pendingPubRow],
    [pendingManuRow],
    [membershipRevRow],
    [alacarteRevRow],
    [affiliateRow],
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
      .from(manuscriptSubmissions)
      .where(eq(manuscriptSubmissions.status, "pending_review")),
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
  ]);

  const membershipTotal = Number(membershipRevRow?.total ?? 0);
  const estimatedNakamaRoyaltyPoolIdr = Math.round(membershipTotal * 0.55);

  return {
    pendingCalendarsCount: Number(pendingCalRow?.count ?? 0),
    pendingAuthorsCount: Number(pendingAuthorRow?.count ?? 0),
    pendingPublishersCount: Number(pendingPubRow?.count ?? 0),
    pendingManuscriptsCount: Number(pendingManuRow?.count ?? 0),
    estimatedNakamaRoyaltyPoolIdr,
    totalAlacarteSalesIdr: Number(alacarteRevRow?.totalSales ?? 0),
    totalPublisherShareIdr: Number(alacarteRevRow?.totalPublisherShare ?? 0),
    totalAffiliateCommissionsIdr: Number(affiliateRow?.totalAffiliate ?? 0),
    totalNetAnzabookIdr: Number(alacarteRevRow?.totalNetAnzabook ?? 0),
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
    .limit(query.limit)
    .offset(query.offset);

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
      updatedAt: new Date(),
    })
    .where(eq(communityCalendars.id, id))
    .returning();

  if (!updated) {
    throw new HttpError(404, "NOT_FOUND", "Kalender komunitas tidak ditemukan.");
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
    .limit(query.limit)
    .offset(query.offset);

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
      throw new HttpError(404, "NOT_FOUND", "Aplikasi penulis tidak ditemukan.");
    }

    const [updatedApp] = await tx
      .update(authorApplications)
      .set({
        status: input.status,
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
    .limit(query.limit)
    .offset(query.offset);

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

export async function listAdminManuscripts(
  query: AdminListQueryInput,
): Promise<ManuscriptSubmissionDto[]> {
  const whereClause = query.status
    ? eq(
        manuscriptSubmissions.status,
        query.status as
          | "pending_review"
          | "in_editing"
          | "published"
          | "rejected",
      )
    : undefined;

  const rows = await db
    .select({
      id: manuscriptSubmissions.id,
      authorUserId: manuscriptSubmissions.authorUserId,
      publisherId: manuscriptSubmissions.publisherId,
      title: manuscriptSubmissions.title,
      synopsis: manuscriptSubmissions.synopsis,
      proposedDigitalPolicy: manuscriptSubmissions.proposedDigitalPolicy,
      proposedAlacartePriceIdr: manuscriptSubmissions.proposedAlacartePriceIdr,
      printSimJson: manuscriptSubmissions.printSimJson,
      status: manuscriptSubmissions.status,
      rejectionReason: manuscriptSubmissions.rejectionReason,
      publishedBookId: manuscriptSubmissions.publishedBookId,
      createdAt: manuscriptSubmissions.createdAt,
      updatedAt: manuscriptSubmissions.updatedAt,
      authorName: user.name,
      authorPenName: user.authorPenName,
      publisherName: publishers.name,
    })
    .from(manuscriptSubmissions)
    .leftJoin(user, eq(manuscriptSubmissions.authorUserId, user.id))
    .leftJoin(publishers, eq(manuscriptSubmissions.publisherId, publishers.id))
    .where(whereClause)
    .orderBy(desc(manuscriptSubmissions.createdAt))
    .limit(query.limit)
    .offset(query.offset);

  return rows.map((r) => ({
    ...r,
    authorName: r.authorName ?? undefined,
    authorPenName: r.authorPenName ?? undefined,
    publisherName: r.publisherName ?? undefined,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

type DatabaseExecutor =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function getAdminManuscriptById(
  id: string,
  d: DatabaseExecutor = db,
): Promise<ManuscriptSubmissionDto> {
  const [submission] = await d
    .select({
      id: manuscriptSubmissions.id,
      authorUserId: manuscriptSubmissions.authorUserId,
      publisherId: manuscriptSubmissions.publisherId,
      title: manuscriptSubmissions.title,
      synopsis: manuscriptSubmissions.synopsis,
      proposedDigitalPolicy: manuscriptSubmissions.proposedDigitalPolicy,
      proposedAlacartePriceIdr: manuscriptSubmissions.proposedAlacartePriceIdr,
      printSimJson: manuscriptSubmissions.printSimJson,
      status: manuscriptSubmissions.status,
      rejectionReason: manuscriptSubmissions.rejectionReason,
      publishedBookId: manuscriptSubmissions.publishedBookId,
      createdAt: manuscriptSubmissions.createdAt,
      updatedAt: manuscriptSubmissions.updatedAt,
      authorName: user.name,
      authorPenName: user.authorPenName,
      publisherName: publishers.name,
    })
    .from(manuscriptSubmissions)
    .leftJoin(user, eq(manuscriptSubmissions.authorUserId, user.id))
    .leftJoin(publishers, eq(manuscriptSubmissions.publisherId, publishers.id))
    .where(eq(manuscriptSubmissions.id, id));

  if (!submission) {
    throw new HttpError(404, "NOT_FOUND", "Naskah tidak ditemukan.");
  }

  const chapters = await d
    .select()
    .from(manuscriptChapters)
    .where(eq(manuscriptChapters.manuscriptId, id))
    .orderBy(manuscriptChapters.chapterNumber);

  return {
    ...submission,
    authorName: submission.authorName ?? undefined,
    authorPenName: submission.authorPenName ?? undefined,
    publisherName: submission.publisherName ?? undefined,
    totalChapters: chapters.length,
    chapters: chapters.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    })),
    createdAt: submission.createdAt.toISOString(),
    updatedAt: submission.updatedAt.toISOString(),
  };
}

export async function updateAdminManuscript(
  id: string,
  input: AdminEditManuscriptInput,
): Promise<ManuscriptSubmissionDto> {
  return await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(manuscriptSubmissions)
      .where(eq(manuscriptSubmissions.id, id));

    if (!existing) {
      throw new HttpError(404, "NOT_FOUND", "Naskah tidak ditemukan.");
    }

    const updateData: Partial<typeof manuscriptSubmissions.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (input.title !== undefined) updateData.title = input.title;
    if (input.synopsis !== undefined) updateData.synopsis = input.synopsis;
    if (input.proposedDigitalPolicy !== undefined)
      updateData.proposedDigitalPolicy = input.proposedDigitalPolicy;
    if (input.proposedAlacartePriceIdr !== undefined)
      updateData.proposedAlacartePriceIdr = input.proposedAlacartePriceIdr;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.rejectionReason !== undefined)
      updateData.rejectionReason = input.rejectionReason;

    await tx
      .update(manuscriptSubmissions)
      .set(updateData)
      .where(eq(manuscriptSubmissions.id, id));

    if (input.chapters && input.chapters.length > 0) {
      for (const ch of input.chapters) {
        if (ch.id) {
          await tx
            .update(manuscriptChapters)
            .set({
              titleId: ch.titleId,
              contentId: ch.contentId,
              contentEn: ch.contentEn ?? null,
              blueprintContent: ch.blueprintContent ?? null,
              estimatedMinutes: ch.estimatedMinutes,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(manuscriptChapters.id, ch.id),
                eq(manuscriptChapters.manuscriptId, id),
              ),
            );
        } else {
          await tx.insert(manuscriptChapters).values({
            manuscriptId: id,
            chapterNumber: ch.chapterNumber,
            titleId: ch.titleId,
            contentId: ch.contentId,
            contentEn: ch.contentEn ?? null,
            blueprintContent: ch.blueprintContent ?? null,
            estimatedMinutes: ch.estimatedMinutes,
          });
        }
      }
    }

    return await getAdminManuscriptById(id, tx);
  });
}

export async function publishAdminManuscript(
  id: string,
  overrides?: AdminPublishManuscriptInput,
) {
  return await db.transaction(async (tx) => {
    const [manuscript] = await tx
      .select()
      .from(manuscriptSubmissions)
      .where(eq(manuscriptSubmissions.id, id));

    if (!manuscript) {
      throw new HttpError(404, "NOT_FOUND", "Naskah tidak ditemukan.");
    }

    const chapters = await tx
      .select()
      .from(manuscriptChapters)
      .where(eq(manuscriptChapters.manuscriptId, id))
      .orderBy(manuscriptChapters.chapterNumber);

    if (chapters.length === 0) {
      throw new HttpError(
        400,
        "NO_CHAPTERS",
        "Naskah belum memiliki bab untuk diterbitkan.",
      );
    }

    const [authorUser] = await tx
      .select()
      .from(user)
      .where(eq(user.id, manuscript.authorUserId));

    const authorName =
      overrides?.author ||
      authorUser?.authorPenName ||
      authorUser?.name ||
      "Penulis AnzaBook";

    const digitalPolicy: DigitalPolicy =
      (overrides?.digitalPolicy as DigitalPolicy | undefined) ||
      manuscript.proposedDigitalPolicy ||
      "sample_only";

    const alacartePriceIdr =
      overrides?.alacartePriceIdr !== undefined
        ? overrides.alacartePriceIdr
        : manuscript.proposedAlacartePriceIdr ??
          (digitalPolicy === "alacarte_only" ? 45000 : null);

    const coverUrl =
      overrides?.coverUrl ||
      "/covers/default-book.jpg";

    const slug = `${slugify(manuscript.title)}-${randomUUID().slice(0, 8)}`;
    const readingMinutes = chapters.reduce(
      (sum, c) => sum + (c.estimatedMinutes || 5),
      0,
    );
    const pageCount = Math.max(chapters.length * 15, 20);

    // Insert into books
    const [book] = await tx
      .insert(books)
      .values({
        slug,
        title: manuscript.title,
        author: authorName,
        synopsis: manuscript.synopsis,
        coverUrl,
        digitalPolicy,
        alacartePriceIdr,
        publisherId: manuscript.publisherId,
        authorUserId: manuscript.authorUserId,
        totalChapters: chapters.length,
        readingMinutes,
        pageCount,
        hasPhysical:
          digitalPolicy === "print_claim_only" ||
          digitalPolicy === "hybrid_nakama_alacarte",
      })
      .returning();

    // Insert all chapters into bookChapters
    for (const ch of chapters) {
      await tx.insert(bookChapters).values({
        bookId: book.id,
        chapterNumber: ch.chapterNumber,
        titleId: ch.titleId,
        contentId: ch.contentId,
        contentEn: ch.contentEn,
        blueprintContent: ch.blueprintContent ?? "",
      });
    }

    let initialBatch: typeof bookClaimBatches.$inferSelect | null = null;

    // If print_claim_only and publisher is present, generate initial 500 free claim codes
    if (digitalPolicy === "print_claim_only" && manuscript.publisherId) {
      const [batch] = await tx
        .insert(bookClaimBatches)
        .values({
          bookId: book.id,
          publisherId: manuscript.publisherId,
          batchName: `Batch Perdana (500 Eks) - ${manuscript.title.slice(0, 50)}`,
          totalCodes: 500,
          unitFeeIdr: 0,
          billingStatus: "free_tier",
        })
        .returning();

      initialBatch = batch;

      const codeRecords: {
        bookId: string;
        batchId: string;
        code: string;
        isDemo: boolean;
      }[] = [];

      for (let i = 0; i < 500; i++) {
        codeRecords.push({
          bookId: book.id,
          batchId: batch.id,
          code: generateClaimCode(),
          isDemo: false,
        });
      }

      await tx.insert(bookClaimCodes).values(codeRecords);
    }

    // Update manuscript status
    await tx
      .update(manuscriptSubmissions)
      .set({
        status: "published",
        publishedBookId: book.id,
        updatedAt: new Date(),
      })
      .where(eq(manuscriptSubmissions.id, id));

    return {
      publishedBookId: book.id,
      book: {
        ...book,
        createdAt: book.createdAt.toISOString(),
        updatedAt: book.updatedAt.toISOString(),
      },
      claimBatch: initialBatch
        ? {
            ...initialBatch,
            createdAt: initialBatch.createdAt.toISOString(),
          }
        : null,
    };
  });
}

export async function createAdminClaimBatch(input: CreateClaimBatchInput): Promise<{
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
    const unitFeeIdr = isFirstBatch ? 0 : pub.claimCodeFeeIdr ?? 2000;

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
