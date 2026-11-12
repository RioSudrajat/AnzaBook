import { randomBytes } from "node:crypto";
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
  CreateManuscriptDraftInput,
  ReviewManuscriptInput,
  SubmitManuscriptInput,
  UpdateManuscriptInput,
  UpdatePublisherInput,
} from "@starter/shared/validators/publisher";
import type {
  ManuscriptChapterDto,
  ManuscriptSubmissionDto,
  PublisherDto,
} from "@starter/shared/types";

function toPublisherDto(
  pub: typeof publishers.$inferSelect,
  totalBooks = 0,
  currentUserRole?: typeof publisherMembers.$inferSelect["role"] | null,
): PublisherDto {
  return {
    id: pub.id,
    slug: pub.slug,
    name: pub.name,
    ikapiNumber: pub.ikapiNumber,
    description: pub.description,
    logoUrl: pub.logoUrl,
    headerImageUrl: pub.headerImageUrl,
    city: pub.city,
    address: pub.address,
    contactEmail: pub.contactEmail,
    socialLinks: pub.socialLinks || null,
    verificationStatus: pub.verificationStatus,
    rejectionReason: pub.rejectionReason,
    verificationDocuments: pub.verificationDocuments,
    verifiedAt: pub.verifiedAt ? pub.verifiedAt.toISOString() : null,
    freeClaimCodeQuotaPerBook: pub.freeClaimCodeQuotaPerBook,
    claimCodeFeeIdr: pub.claimCodeFeeIdr,
    totalBooks,
    currentUserRole: currentUserRole ?? null,
    createdAt: pub.createdAt.toISOString(),
    updatedAt: pub.updatedAt.toISOString(),
  };
}

function formatManuscriptDto(
  submission: typeof manuscriptSubmissions.$inferSelect,
  author: { name: string | null; authorPenName?: string | null } | null,
  publisherName: string | null | undefined,
  chapters: (typeof manuscriptChapters.$inferSelect)[],
): ManuscriptSubmissionDto {
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
    authorName: author?.name || undefined,
    authorPenName: author?.authorPenName || null,
    publisherId: submission.publisherId,
    publisherName: publisherName || null,
    title: submission.title,
    slug: submission.slug || null,
    coverUrl: submission.coverUrl || null,
    category: submission.category || null,
    synopsis: submission.synopsis,
    editorialNotes: submission.editorialNotes || null,
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
        headerImageUrl: input.headerImageUrl || null,
        city: input.city || null,
        address: input.address || null,
        contactEmail: input.contactEmail || null,
        socialLinks: input.socialLinks || null,
        verificationDocuments: input.verificationDocuments || null,
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

  return toPublisherDto(pub, 0, member.role);
}

export async function updatePublisher(
  userId: string,
  slug: string,
  input: UpdatePublisherInput,
  userRole?: string,
): Promise<PublisherDto> {
  const [pub] = await db
    .select()
    .from(publishers)
    .where(or(eq(publishers.slug, slug), sql`${publishers.id}::text = ${slug}`))
    .limit(1);

  if (!pub) {
    throw new HttpError(404, "PUBLISHER_NOT_FOUND", "Penerbit tidak ditemukan.");
  }

  const isSysAdmin = userRole === "admin";
  let memberRole: typeof publisherMembers.$inferSelect["role"] | null = null;
  if (!isSysAdmin) {
    const [member] = await db
      .select({ role: publisherMembers.role })
      .from(publisherMembers)
      .where(
        and(
          eq(publisherMembers.publisherId, pub.id),
          eq(publisherMembers.userId, userId),
        ),
      )
      .limit(1);

    if (!member || (member.role !== "owner" && member.role !== "editor")) {
      throw new HttpError(
        403,
        "FORBIDDEN",
        "Hanya pemilik atau editor penerbit yang dapat mengubah profil penerbit.",
      );
    }
    memberRole = member.role;
  }

  const patch: Partial<typeof publishers.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (input.name !== undefined) patch.name = input.name;
  if (input.description !== undefined) patch.description = input.description;
  if (input.logoUrl !== undefined) patch.logoUrl = input.logoUrl;
  if (input.headerImageUrl !== undefined) patch.headerImageUrl = input.headerImageUrl;
  if (input.city !== undefined) patch.city = input.city;
  if (input.address !== undefined) patch.address = input.address;
  if (input.contactEmail !== undefined) patch.contactEmail = input.contactEmail;
  if (input.socialLinks !== undefined) patch.socialLinks = input.socialLinks;
  if (input.ikapiNumber !== undefined) patch.ikapiNumber = input.ikapiNumber;

  const [updated] = await db
    .update(publishers)
    .set(patch)
    .where(eq(publishers.id, pub.id))
    .returning();

  const [bookCountRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(books)
    .where(eq(books.publisherId, pub.id));

  return toPublisherDto(updated, Number(bookCountRow?.count || 0), memberRole);
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

    results.push(toPublisherDto(pub, Number(bookCountRow?.count || 0), currentUserRole));
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

  return toPublisherDto(pub, Number(bookCountRow?.count || 0), currentUserRole);
}

export async function createManuscriptDraft(
  authorUserId: string,
  input: CreateManuscriptDraftInput,
): Promise<ManuscriptSubmissionDto> {
  const [author] = await db
    .select({ name: user.name, authorPenName: user.authorPenName })
    .from(user)
    .where(eq(user.id, authorUserId))
    .limit(1);

  const baseSlug = (input.title || "naskah-baru")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 100);
  const slug = `${baseSlug || "naskah"}-${randomBytes(3).toString("hex")}`;

  const { submission, chapters } = await db.transaction(async (tx) => {
    const [sub] = await tx
      .insert(manuscriptSubmissions)
      .values({
        authorUserId,
        publisherId: input.publisherId || null,
        slug,
        title: input.title,
        coverUrl: input.coverUrl || null,
        category: input.category || null,
        synopsis: input.synopsis || "",
        proposedDigitalPolicy: input.proposedDigitalPolicy || "hybrid_nakama_alacarte",
        proposedAlacartePriceIdr: input.proposedAlacartePriceIdr ?? null,
        status: "draft",
      })
      .returning();

    const createdChapters: typeof manuscriptChapters.$inferSelect[] = [];
    const chaptersToInsert =
      input.chapters && input.chapters.length > 0
        ? input.chapters
        : [
            {
              chapterNumber: 1,
              titleId: "Bab 1: Awal Mula",
              contentId: "<p>Tuliskan naskah karyamu di sini...</p>",
              estimatedMinutes: 5,
            },
          ];

    for (const ch of chaptersToInsert) {
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

    return { submission: sub, chapters: createdChapters };
  });

  return formatManuscriptDto(submission, author, null, chapters);
}

export async function getManuscript(
  userId: string,
  idOrSlug: string,
  userRole?: string,
): Promise<ManuscriptSubmissionDto> {
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      idOrSlug,
    );

  const [sub] = await db
    .select({
      submission: manuscriptSubmissions,
      publisherName: publishers.name,
      authorName: user.name,
      authorPenName: user.authorPenName,
    })
    .from(manuscriptSubmissions)
    .leftJoin(publishers, eq(manuscriptSubmissions.publisherId, publishers.id))
    .leftJoin(user, eq(manuscriptSubmissions.authorUserId, user.id))
    .where(
      isUuid
        ? or(
            eq(manuscriptSubmissions.id, idOrSlug),
            eq(manuscriptSubmissions.slug, idOrSlug),
          )
        : eq(manuscriptSubmissions.slug, idOrSlug),
    )
    .limit(1);

  if (!sub) {
    throw new HttpError(404, "MANUSCRIPT_NOT_FOUND", "Naskah tidak ditemukan.");
  }

  const isAuthor = sub.submission.authorUserId === userId;
  const isSysAdmin = userRole === "admin";
  let isPublisherEditor = false;

  if (sub.submission.publisherId) {
    const [pubMember] = await db
      .select({ role: publisherMembers.role })
      .from(publisherMembers)
      .where(
        and(
          eq(publisherMembers.publisherId, sub.submission.publisherId),
          eq(publisherMembers.userId, userId),
        ),
      )
      .limit(1);
    if (pubMember && (pubMember.role === "owner" || pubMember.role === "editor")) {
      isPublisherEditor = true;
    }
  }

  if (!isAuthor && !isSysAdmin && !isPublisherEditor) {
    throw new HttpError(
      403,
      "FORBIDDEN",
      "Anda tidak memiliki akses ke naskah ini.",
    );
  }

  const chapters = await db
    .select()
    .from(manuscriptChapters)
    .where(eq(manuscriptChapters.manuscriptId, sub.submission.id))
    .orderBy(manuscriptChapters.chapterNumber);

  return formatManuscriptDto(
    sub.submission,
    { name: sub.authorName, authorPenName: sub.authorPenName },
    sub.publisherName,
    chapters,
  );
}

export async function updateManuscript(
  userId: string,
  idOrSlug: string,
  input: UpdateManuscriptInput,
  userRole?: string,
): Promise<ManuscriptSubmissionDto> {
  const current = await getManuscript(userId, idOrSlug, userRole);

  const { submission, chapters } = await db.transaction(async (tx) => {
    const patch: Partial<typeof manuscriptSubmissions.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (input.title !== undefined) patch.title = input.title;
    if (input.synopsis !== undefined) patch.synopsis = input.synopsis;
    if (input.coverUrl !== undefined) patch.coverUrl = input.coverUrl;
    if (input.category !== undefined) patch.category = input.category;
    if (input.proposedDigitalPolicy !== undefined)
      patch.proposedDigitalPolicy = input.proposedDigitalPolicy;
    if (input.proposedAlacartePriceIdr !== undefined)
      patch.proposedAlacartePriceIdr = input.proposedAlacartePriceIdr;
    if (input.printSimJson !== undefined) patch.printSimJson = input.printSimJson;
    if (input.editorialNotes !== undefined) patch.editorialNotes = input.editorialNotes;
    if (input.status !== undefined) patch.status = input.status;
    if (input.rejectionReason !== undefined) patch.rejectionReason = input.rejectionReason;

    const [updatedSub] = await tx
      .update(manuscriptSubmissions)
      .set(patch)
      .where(eq(manuscriptSubmissions.id, current.id))
      .returning();

    if (input.chapters) {
      await tx
        .delete(manuscriptChapters)
        .where(eq(manuscriptChapters.manuscriptId, current.id));

      const newChapters: typeof manuscriptChapters.$inferSelect[] = [];
      for (const ch of input.chapters) {
        const [insertedCh] = await tx
          .insert(manuscriptChapters)
          .values({
            manuscriptId: current.id,
            chapterNumber: ch.chapterNumber,
            titleId: ch.titleId,
            contentId: ch.contentId,
            contentEn: ch.contentEn || null,
            blueprintContent: ch.blueprintContent || null,
            estimatedMinutes: ch.estimatedMinutes ?? 5,
          })
          .returning();
        newChapters.push(insertedCh);
      }
      return { submission: updatedSub, chapters: newChapters };
    }

    const existingChapters = await tx
      .select()
      .from(manuscriptChapters)
      .where(eq(manuscriptChapters.manuscriptId, current.id))
      .orderBy(manuscriptChapters.chapterNumber);

    return { submission: updatedSub, chapters: existingChapters };
  });

  return await getManuscript(userId, current.id, userRole);
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

  const baseSlug = (input.title || "naskah")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 100);
  const slug = `${baseSlug || "naskah"}-${randomBytes(3).toString("hex")}`;

  const { submission, chapters } = await db.transaction(async (tx) => {
    const [sub] = await tx
      .insert(manuscriptSubmissions)
      .values({
        authorUserId,
        publisherId: input.publisherId || null,
        slug,
        title: input.title,
        coverUrl: input.coverUrl || null,
        category: input.category || null,
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

  return formatManuscriptDto(submission, author, publisherName, chapters);
}

export async function submitManuscriptDraft(
  authorUserId: string,
  idOrSlug: string,
  publisherId?: string | null,
): Promise<ManuscriptSubmissionDto> {
  const current = await getManuscript(authorUserId, idOrSlug);
  if (current.authorUserId !== authorUserId) {
    throw new HttpError(
      403,
      "FORBIDDEN",
      "Hanya penulis pemilik naskah yang dapat mengajukan naskah.",
    );
  }

  let finalPublisherId = publisherId || current.publisherId;
  if (finalPublisherId) {
    const [pub] = await db
      .select({ id: publishers.id })
      .from(publishers)
      .where(eq(publishers.id, finalPublisherId))
      .limit(1);
    if (!pub) {
      throw new HttpError(
        404,
        "PUBLISHER_NOT_FOUND",
        "Penerbit tujuan tidak ditemukan.",
      );
    }
  }

  await db
    .update(manuscriptSubmissions)
    .set({
      publisherId: finalPublisherId || null,
      status: "pending_review",
      updatedAt: new Date(),
    })
    .where(eq(manuscriptSubmissions.id, current.id));

  return await getManuscript(authorUserId, current.id);
}

export async function listPublisherManuscripts(
  userId: string,
  publisherSlug: string,
  userRole?: string,
): Promise<ManuscriptSubmissionDto[]> {
  const [pub] = await db
    .select({ id: publishers.id, name: publishers.name })
    .from(publishers)
    .where(
      or(
        eq(publishers.slug, publisherSlug),
        sql`${publishers.id}::text = ${publisherSlug}`,
      ),
    )
    .limit(1);

  if (!pub) {
    throw new HttpError(404, "PUBLISHER_NOT_FOUND", "Penerbit tidak ditemukan.");
  }

  const isSysAdmin = userRole === "admin";
  if (!isSysAdmin) {
    const [member] = await db
      .select({ role: publisherMembers.role })
      .from(publisherMembers)
      .where(
        and(
          eq(publisherMembers.publisherId, pub.id),
          eq(publisherMembers.userId, userId),
        ),
      )
      .limit(1);

    if (!member || (member.role !== "owner" && member.role !== "editor")) {
      throw new HttpError(
        403,
        "FORBIDDEN",
        "Hanya pemilik atau editor penerbit yang dapat melihat daftar naskah masuk.",
      );
    }
  }

  const submissions = await db
    .select({
      submission: manuscriptSubmissions,
      authorName: user.name,
      authorPenName: user.authorPenName,
    })
    .from(manuscriptSubmissions)
    .leftJoin(user, eq(manuscriptSubmissions.authorUserId, user.id))
    .where(eq(manuscriptSubmissions.publisherId, pub.id))
    .orderBy(desc(manuscriptSubmissions.updatedAt));

  const results: ManuscriptSubmissionDto[] = [];
  for (const s of submissions) {
    const chapters = await db
      .select()
      .from(manuscriptChapters)
      .where(eq(manuscriptChapters.manuscriptId, s.submission.id))
      .orderBy(manuscriptChapters.chapterNumber);

    results.push(
      formatManuscriptDto(
        s.submission,
        { name: s.authorName, authorPenName: s.authorPenName },
        pub.name,
        chapters,
      ),
    );
  }

  return results;
}

export async function reviewManuscript(
  userId: string,
  idOrSlug: string,
  input: ReviewManuscriptInput,
  userRole?: string,
): Promise<ManuscriptSubmissionDto> {
  const current = await getManuscript(userId, idOrSlug, userRole);
  const isSysAdmin = userRole === "admin";

  if (!isSysAdmin && current.publisherId) {
    const [member] = await db
      .select({ role: publisherMembers.role })
      .from(publisherMembers)
      .where(
        and(
          eq(publisherMembers.publisherId, current.publisherId),
          eq(publisherMembers.userId, userId),
        ),
      )
      .limit(1);

    if (!member || (member.role !== "owner" && member.role !== "editor")) {
      throw new HttpError(
        403,
        "FORBIDDEN",
        "Hanya editor penerbit yang dapat meninjau naskah ini.",
      );
    }
  }

  const patch: Partial<typeof manuscriptSubmissions.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (input.action === "approve") {
    patch.status = "published";
  } else if (input.action === "request_revision") {
    patch.status = "revision_requested";
    patch.editorialNotes = input.notes || "Mohon periksa catatan editor.";
  } else if (input.action === "reject") {
    patch.status = "rejected";
    patch.rejectionReason =
      input.notes || "Naskah belum memenuhi kriteria penerbitan.";
  }

  await db
    .update(manuscriptSubmissions)
    .set(patch)
    .where(eq(manuscriptSubmissions.id, current.id));

  return await getManuscript(userId, current.id, userRole);
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
    .orderBy(desc(manuscriptSubmissions.updatedAt));

  const results: ManuscriptSubmissionDto[] = [];

  for (const row of submissions) {
    const chapters = await db
      .select()
      .from(manuscriptChapters)
      .where(eq(manuscriptChapters.manuscriptId, row.submission.id))
      .orderBy(manuscriptChapters.chapterNumber);

    results.push(
      formatManuscriptDto(
        row.submission,
        { name: row.authorName, authorPenName: row.authorPenName },
        row.publisherName,
        chapters,
      ),
    );
  }

  return results;
}
