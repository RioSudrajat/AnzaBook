import { and, desc, eq, or, sql } from "drizzle-orm";
import { db } from "../db";
import {
  books,
  manuscriptChapters,
  manuscriptSubmissions,
  publisherMembers,
  publishers,
  user,
} from "../db/schema";
import { HttpError } from "../lib/http-error";
import type {
  ApplyPublisherInput,
  SubmitManuscriptInput,
} from "@starter/shared/validators/publisher";
import type {
  ManuscriptChapterDto,
  ManuscriptSubmissionDto,
  PublisherDto,
} from "@starter/shared/types";

export async function applyPublisher(
  userId: string,
  input: ApplyPublisherInput,
): Promise<PublisherDto> {
  const [existing] = await db
    .select({ id: publishers.id })
    .from(publishers)
    .where(eq(publishers.slug, input.slug))
    .limit(1);

  if (existing) {
    throw new HttpError(
      409,
      "PUBLISHER_SLUG_TAKEN",
      "Slug penerbit sudah digunakan.",
    );
  }

  const { pub, member } = await db.transaction(async (tx) => {
    const [insertedPub] = await tx
      .insert(publishers)
      .values({
        name: input.name,
        slug: input.slug,
        ikapiNumber: input.ikapiNumber || null,
        description: input.description || null,
        logoUrl: input.logoUrl || null,
        city: input.city || null,
        address: input.address || null,
        contactEmail: input.contactEmail || null,
        verificationStatus: "pending",
      })
      .returning();

    const [insertedMember] = await tx
      .insert(publisherMembers)
      .values({
        publisherId: insertedPub.id,
        userId,
        role: "owner",
      })
      .returning();

    return { pub: insertedPub, member: insertedMember };
  });

  return {
    id: pub.id,
    slug: pub.slug,
    name: pub.name,
    ikapiNumber: pub.ikapiNumber,
    description: pub.description,
    logoUrl: pub.logoUrl,
    city: pub.city,
    address: pub.address,
    contactEmail: pub.contactEmail,
    verificationStatus: pub.verificationStatus,
    verifiedAt: pub.verifiedAt ? pub.verifiedAt.toISOString() : null,
    freeClaimCodeQuotaPerBook: pub.freeClaimCodeQuotaPerBook,
    claimCodeFeeIdr: pub.claimCodeFeeIdr,
    totalBooks: 0,
    currentUserRole: member.role,
    createdAt: pub.createdAt.toISOString(),
    updatedAt: pub.updatedAt.toISOString(),
  };
}

export async function listVerifiedPublishers(
  currentUserId?: string,
): Promise<PublisherDto[]> {
  const pubRows = await db
    .select()
    .from(publishers)
    .where(eq(publishers.verificationStatus, "verified"))
    .orderBy(publishers.name);

  const results: PublisherDto[] = [];

  for (const pub of pubRows) {
    const [bookCountRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(books)
      .where(eq(books.publisherId, pub.id));

    let currentUserRole = null;
    if (currentUserId) {
      const [member] = await db
        .select({ role: publisherMembers.role })
        .from(publisherMembers)
        .where(
          and(
            eq(publisherMembers.publisherId, pub.id),
            eq(publisherMembers.userId, currentUserId),
          ),
        )
        .limit(1);
      if (member) currentUserRole = member.role;
    }

    results.push({
      id: pub.id,
      slug: pub.slug,
      name: pub.name,
      ikapiNumber: pub.ikapiNumber,
      description: pub.description,
      logoUrl: pub.logoUrl,
      city: pub.city,
      address: pub.address,
      contactEmail: pub.contactEmail,
      verificationStatus: pub.verificationStatus,
      verifiedAt: pub.verifiedAt ? pub.verifiedAt.toISOString() : null,
      freeClaimCodeQuotaPerBook: pub.freeClaimCodeQuotaPerBook,
      claimCodeFeeIdr: pub.claimCodeFeeIdr,
      totalBooks: Number(bookCountRow?.count || 0),
      currentUserRole,
      createdAt: pub.createdAt.toISOString(),
      updatedAt: pub.updatedAt.toISOString(),
    });
  }

  return results;
}

export async function getPublisherBySlug(
  slug: string,
  currentUserId?: string,
): Promise<PublisherDto | null> {
  const [pub] = await db
    .select()
    .from(publishers)
    .where(or(eq(publishers.slug, slug), sql`${publishers.id}::text = ${slug}`))
    .limit(1);

  if (!pub) return null;

  const [bookCountRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(books)
    .where(eq(books.publisherId, pub.id));

  let currentUserRole = null;
  if (currentUserId) {
    const [member] = await db
      .select({ role: publisherMembers.role })
      .from(publisherMembers)
      .where(
        and(
          eq(publisherMembers.publisherId, pub.id),
          eq(publisherMembers.userId, currentUserId),
        ),
      )
      .limit(1);
    if (member) currentUserRole = member.role;
  }

  return {
    id: pub.id,
    slug: pub.slug,
    name: pub.name,
    ikapiNumber: pub.ikapiNumber,
    description: pub.description,
    logoUrl: pub.logoUrl,
    city: pub.city,
    address: pub.address,
    contactEmail: pub.contactEmail,
    verificationStatus: pub.verificationStatus,
    verifiedAt: pub.verifiedAt ? pub.verifiedAt.toISOString() : null,
    freeClaimCodeQuotaPerBook: pub.freeClaimCodeQuotaPerBook,
    claimCodeFeeIdr: pub.claimCodeFeeIdr,
    totalBooks: Number(bookCountRow?.count || 0),
    currentUserRole,
    createdAt: pub.createdAt.toISOString(),
    updatedAt: pub.updatedAt.toISOString(),
  };
}

export async function submitManuscript(
  authorUserId: string,
  input: SubmitManuscriptInput,
): Promise<ManuscriptSubmissionDto> {
  let publisherName: string | null = null;
  if (input.publisherId) {
    const [pub] = await db
      .select({ name: publishers.name })
      .from(publishers)
      .where(eq(publishers.id, input.publisherId))
      .limit(1);

    if (!pub) {
      throw new HttpError(404, "PUBLISHER_NOT_FOUND", "Penerbit tidak ditemukan.");
    }
    publisherName = pub.name;
  }

  const [author] = await db
    .select({ name: user.name, authorPenName: user.authorPenName })
    .from(user)
    .where(eq(user.id, authorUserId))
    .limit(1);

  const { submission, chapters } = await db.transaction(async (tx) => {
    const [sub] = await tx
      .insert(manuscriptSubmissions)
      .values({
        authorUserId,
        publisherId: input.publisherId || null,
        title: input.title,
        synopsis: input.synopsis,
        proposedDigitalPolicy: input.proposedDigitalPolicy,
        proposedAlacartePriceIdr: input.proposedAlacartePriceIdr ?? null,
        printSimJson: input.printSimJson ?? null,
        status: "pending_review",
      })
      .returning();

    const createdChapters: typeof manuscriptChapters.$inferSelect[] = [];

    if (input.chapters && input.chapters.length > 0) {
      for (const ch of input.chapters) {
        const [insertedCh] = await tx
          .insert(manuscriptChapters)
          .values({
            manuscriptId: sub.id,
            chapterNumber: ch.chapterNumber,
            titleId: ch.titleId,
            contentId: ch.contentId,
            contentEn: ch.contentEn || null,
            blueprintContent: ch.blueprintContent || null,
            estimatedMinutes: ch.estimatedMinutes ?? 5,
          })
          .returning();
        createdChapters.push(insertedCh);
      }
    }

    return { submission: sub, chapters: createdChapters };
  });

  const chapterDtos: ManuscriptChapterDto[] = chapters.map((ch) => ({
    id: ch.id,
    manuscriptId: ch.manuscriptId,
    chapterNumber: ch.chapterNumber,
    titleId: ch.titleId,
    contentId: ch.contentId,
    contentEn: ch.contentEn,
    blueprintContent: ch.blueprintContent,
    estimatedMinutes: ch.estimatedMinutes,
    createdAt: ch.createdAt.toISOString(),
    updatedAt: ch.updatedAt.toISOString(),
  }));

  return {
    id: submission.id,
    authorUserId: submission.authorUserId,
    authorName: author?.name,
    authorPenName: author?.authorPenName,
    publisherId: submission.publisherId,
    publisherName,
    title: submission.title,
    synopsis: submission.synopsis,
    proposedDigitalPolicy: submission.proposedDigitalPolicy,
    proposedAlacartePriceIdr: submission.proposedAlacartePriceIdr,
    printSimJson: submission.printSimJson,
    status: submission.status,
    rejectionReason: submission.rejectionReason,
    publishedBookId: submission.publishedBookId,
    chapters: chapterDtos,
    totalChapters: chapterDtos.length,
    createdAt: submission.createdAt.toISOString(),
    updatedAt: submission.updatedAt.toISOString(),
  };
}

export async function listMyManuscripts(
  authorUserId: string,
): Promise<ManuscriptSubmissionDto[]> {
  const submissions = await db
    .select({
      submission: manuscriptSubmissions,
      publisherName: publishers.name,
      authorName: user.name,
      authorPenName: user.authorPenName,
    })
    .from(manuscriptSubmissions)
    .leftJoin(publishers, eq(manuscriptSubmissions.publisherId, publishers.id))
    .leftJoin(user, eq(manuscriptSubmissions.authorUserId, user.id))
    .where(eq(manuscriptSubmissions.authorUserId, authorUserId))
    .orderBy(desc(manuscriptSubmissions.createdAt));

  const results: ManuscriptSubmissionDto[] = [];

  for (const row of submissions) {
    const chapters = await db
      .select()
      .from(manuscriptChapters)
      .where(eq(manuscriptChapters.manuscriptId, row.submission.id))
      .orderBy(manuscriptChapters.chapterNumber);

    const chapterDtos: ManuscriptChapterDto[] = chapters.map((ch) => ({
      id: ch.id,
      manuscriptId: ch.manuscriptId,
      chapterNumber: ch.chapterNumber,
      titleId: ch.titleId,
      contentId: ch.contentId,
      contentEn: ch.contentEn,
      blueprintContent: ch.blueprintContent,
      estimatedMinutes: ch.estimatedMinutes,
      createdAt: ch.createdAt.toISOString(),
      updatedAt: ch.updatedAt.toISOString(),
    }));

    results.push({
      id: row.submission.id,
      authorUserId: row.submission.authorUserId,
      authorName: row.authorName || undefined,
      authorPenName: row.authorPenName,
      publisherId: row.submission.publisherId,
      publisherName: row.publisherName,
      title: row.submission.title,
      synopsis: row.submission.synopsis,
      proposedDigitalPolicy: row.submission.proposedDigitalPolicy,
      proposedAlacartePriceIdr: row.submission.proposedAlacartePriceIdr,
      printSimJson: row.submission.printSimJson,
      status: row.submission.status,
      rejectionReason: row.submission.rejectionReason,
      publishedBookId: row.submission.publishedBookId,
      chapters: chapterDtos,
      totalChapters: chapterDtos.length,
      createdAt: row.submission.createdAt.toISOString(),
      updatedAt: row.submission.updatedAt.toISOString(),
    });
  }

  return results;
}
