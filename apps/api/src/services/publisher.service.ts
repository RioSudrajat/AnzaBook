import { randomBytes } from "node:crypto";
import { and, asc, desc, eq, inArray, or, sql } from "drizzle-orm";
import type {
  ManagedPublisherSummaryDto,
  ManuscriptChapterDto,
  ManuscriptSubmissionDto,
  PublisherDto,
  PublisherMemberRole,
} from "@starter/shared/types";
import type {
  ApplyPublisherInput,
  AuthorUpdateManuscriptInput,
  CreateManuscriptDraftInput,
  ListSubmissionTargetsQuery,
  PublisherEditManuscriptInput,
  PublisherReviewManuscriptInput,
  SubmitManuscriptInput,
  UpdatePublisherInput,
} from "@starter/shared/validators/publisher";
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
import {
  UUID_REGEX,
  requirePublisherMember,
  resolvePublisherBySlugOrId,
} from "./publisher-publishing.service";

const OFFICIAL_ANZABOOK_SLUG = "anzabook";
const MAX_PUBLISHER_TOPICS = 15;

function normalizeTopics(topics: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of topics) {
    const cleaned = raw.trim().replace(/\s+/g, " ").slice(0, 60);
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(cleaned);
    if (result.length >= MAX_PUBLISHER_TOPICS) break;
  }

  return result;
}

function toPublisherDto(
  pub: typeof publishers.$inferSelect,
  totalBooks = 0,
  currentUserRole?: PublisherMemberRole | null,
  extras?: { topicMatchScore?: number; matchedTopics?: string[] },
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
    topics: pub.topics ?? [],
    isAcceptingSubmissions: pub.isAcceptingSubmissions,
    submissionGuidelines: pub.submissionGuidelines ?? null,
    ...(extras?.topicMatchScore !== undefined
      ? { topicMatchScore: extras.topicMatchScore }
      : {}),
    ...(extras?.matchedTopics !== undefined
      ? { matchedTopics: extras.matchedTopics }
      : {}),
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

async function resolveDefaultAnzaBookPublisher(): Promise<{
  id: string;
  name: string;
} | null> {
  const [anzabook] = await db
    .select({ id: publishers.id, name: publishers.name })
    .from(publishers)
    .where(eq(publishers.slug, OFFICIAL_ANZABOOK_SLUG))
    .limit(1);
  return anzabook ?? null;
}

async function loadBookCountsMap(
  publisherIds: readonly string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (publisherIds.length === 0) return map;

  const rows = await db
    .select({
      publisherId: books.publisherId,
      count: sql<number>`count(*)`,
    })
    .from(books)
    .where(inArray(books.publisherId, [...publisherIds]))
    .groupBy(books.publisherId);

  for (const row of rows) {
    if (row.publisherId) {
      map.set(row.publisherId, Number(row.count || 0));
    }
  }
  return map;
}

async function loadUserRolesMap(
  userId?: string,
  publisherIds: readonly string[] = [],
): Promise<Map<string, PublisherMemberRole>> {
  const map = new Map<string, PublisherMemberRole>();
  if (!userId || publisherIds.length === 0) return map;

  const rows = await db
    .select({
      publisherId: publisherMembers.publisherId,
      role: publisherMembers.role,
    })
    .from(publisherMembers)
    .where(
      and(
        eq(publisherMembers.userId, userId),
        inArray(publisherMembers.publisherId, [...publisherIds]),
      ),
    );

  for (const row of rows) {
    map.set(row.publisherId, row.role);
  }
  return map;
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

  const normalizedTopics = input.topics ? normalizeTopics(input.topics) : [];

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
        topics: normalizedTopics,
        isAcceptingSubmissions: input.isAcceptingSubmissions ?? true,
        submissionGuidelines: input.submissionGuidelines || null,
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

/**
 * Updates publisher profile and curation configuration.
 * Strictly requires `owner` membership — no platform admin bypass.
 */
export async function updatePublisher(
  userId: string,
  slug: string,
  input: UpdatePublisherInput,
): Promise<PublisherDto> {
  const pub = await resolvePublisherBySlugOrId(slug);
  const member = await requirePublisherMember(pub.id, userId, ["owner"]);

  const patch: Partial<typeof publishers.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (input.name !== undefined) patch.name = input.name;
  if (input.description !== undefined) patch.description = input.description;
  if (input.logoUrl !== undefined) patch.logoUrl = input.logoUrl || null;
  if (input.headerImageUrl !== undefined)
    patch.headerImageUrl = input.headerImageUrl || null;
  if (input.city !== undefined) patch.city = input.city;
  if (input.address !== undefined) patch.address = input.address;
  if (input.contactEmail !== undefined) patch.contactEmail = input.contactEmail;
  if (input.socialLinks !== undefined) patch.socialLinks = input.socialLinks;
  if (input.ikapiNumber !== undefined) patch.ikapiNumber = input.ikapiNumber;
  if (input.topics !== undefined) {
    patch.topics = normalizeTopics(input.topics);
  }
  if (input.isAcceptingSubmissions !== undefined) {
    patch.isAcceptingSubmissions = input.isAcceptingSubmissions;
  }
  if (input.submissionGuidelines !== undefined) {
    patch.submissionGuidelines = input.submissionGuidelines || null;
  }

  const [updated] = await db
    .update(publishers)
    .set(patch)
    .where(eq(publishers.id, pub.id))
    .returning();

  const [bookCountRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(books)
    .where(eq(books.publisherId, pub.id));

  return toPublisherDto(updated, Number(bookCountRow?.count || 0), member.role);
}

export async function listVerifiedPublishers(
  currentUserId?: string,
): Promise<PublisherDto[]> {
  const pubRows = await db
    .select()
    .from(publishers)
    .where(eq(publishers.verificationStatus, "verified"))
    .orderBy(publishers.name);

  const pubIds = pubRows.map((p) => p.id);
  const [countsMap, rolesMap] = await Promise.all([
    loadBookCountsMap(pubIds),
    loadUserRolesMap(currentUserId, pubIds),
  ]);

  return pubRows.map((pub) =>
    toPublisherDto(
      pub,
      countsMap.get(pub.id) ?? 0,
      rolesMap.get(pub.id) ?? null,
    ),
  );
}

/**
 * Lists all publishers managed by the authenticated user (including pending & rejected).
 */
export async function listMyManagedPublishers(
  userId: string,
): Promise<ManagedPublisherSummaryDto[]> {
  const rows = await db
    .select({
      id: publishers.id,
      name: publishers.name,
      slug: publishers.slug,
      logoUrl: publishers.logoUrl,
      headerImageUrl: publishers.headerImageUrl,
      city: publishers.city,
      topics: publishers.topics,
      verificationStatus: publishers.verificationStatus,
      rejectionReason: publishers.rejectionReason,
      role: publisherMembers.role,
    })
    .from(publisherMembers)
    .innerJoin(publishers, eq(publisherMembers.publisherId, publishers.id))
    .where(eq(publisherMembers.userId, userId))
    .orderBy(desc(publishers.updatedAt), asc(publishers.name));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    logoUrl: row.logoUrl,
    headerImageUrl: row.headerImageUrl,
    city: row.city,
    topics: row.topics ?? [],
    verificationStatus: row.verificationStatus,
    rejectionReason: row.rejectionReason,
    role: row.role,
  }));
}

/**
 * Lists verified, submission-accepting publishers for author manuscript routing.
 * Always pins `anzabook` at index 0 when it matches `q`, then sorts by descending
 * topic overlap score -> descending totalBooks -> ascending name.
 */
export async function listSubmissionTargets(
  query: ListSubmissionTargetsQuery,
  currentUserId?: string,
): Promise<PublisherDto[]> {
  const pubRows = await db
    .select()
    .from(publishers)
    .where(
      and(
        eq(publishers.verificationStatus, "verified"),
        eq(publishers.isAcceptingSubmissions, true),
      ),
    );

  const pubIds = pubRows.map((p) => p.id);
  const [countsMap, rolesMap] = await Promise.all([
    loadBookCountsMap(pubIds),
    loadUserRolesMap(currentUserId, pubIds),
  ]);

  const q = query.q?.trim().toLowerCase() ?? "";
  const topicQuery = query.topic?.trim() ?? "";
  const topicQueryLower = topicQuery.toLowerCase();
  const topicTokens = topicQueryLower
    .split(/[^a-z0-9]+/i)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2);

  const eligible = q
    ? pubRows.filter((pub) => {
        const haystack = [
          pub.name,
          pub.slug,
          pub.city ?? "",
          pub.description ?? "",
          pub.submissionGuidelines ?? "",
          ...(pub.topics ?? []),
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      })
    : pubRows;

  const dtos = eligible.map((pub) => {
    const pubTopics = pub.topics ?? [];
    const matchedTopics = topicQuery
      ? pubTopics.filter((t) => {
          const lower = t.toLowerCase();
          if (
            lower.includes(topicQueryLower) ||
            topicQueryLower.includes(lower)
          ) {
            return true;
          }
          return topicTokens.some((tok) => lower.includes(tok));
        })
      : [];

    const topicMatchScore = matchedTopics.reduce((score, topic) => {
      return score + (topic.toLowerCase() === topicQueryLower ? 15 : 10);
    }, 0);

    return toPublisherDto(
      pub,
      countsMap.get(pub.id) ?? 0,
      rolesMap.get(pub.id) ?? null,
      topicQuery ? { topicMatchScore, matchedTopics } : undefined,
    );
  });

  dtos.sort((a, b) => {
    const aOfficial = a.slug === OFFICIAL_ANZABOOK_SLUG ? 1 : 0;
    const bOfficial = b.slug === OFFICIAL_ANZABOOK_SLUG ? 1 : 0;
    if (aOfficial !== bOfficial) return bOfficial - aOfficial;

    const scoreDiff = (b.topicMatchScore ?? 0) - (a.topicMatchScore ?? 0);
    if (scoreDiff !== 0) return scoreDiff;

    const booksDiff = (b.totalBooks ?? 0) - (a.totalBooks ?? 0);
    if (booksDiff !== 0) return booksDiff;

    return a.name.localeCompare(b.name, "id");
  });

  return dtos.slice(0, query.limit);
}

export async function getPublisherBySlug(
  slug: string,
  currentUserId?: string,
): Promise<PublisherDto | null> {
  const isUuid = UUID_REGEX.test(slug);
  const [pub] = await db
    .select()
    .from(publishers)
    .where(
      isUuid
        ? or(eq(publishers.slug, slug), eq(publishers.id, slug))
        : eq(publishers.slug, slug),
    )
    .limit(1);

  if (!pub) return null;

  const [bookCountRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(books)
    .where(eq(books.publisherId, pub.id));

  let currentUserRole: PublisherMemberRole | null = null;
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
  let publisherName: string | null = null;
  if (input.publisherId) {
    const [pub] = await db
      .select({ name: publishers.name })
      .from(publishers)
      .where(eq(publishers.id, input.publisherId))
      .limit(1);
    if (!pub) {
      throw new HttpError(
        404,
        "PUBLISHER_NOT_FOUND",
        "Penerbit tidak ditemukan.",
      );
    }
    publisherName = pub.name;
  }

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
        proposedDigitalPolicy:
          input.proposedDigitalPolicy || "hybrid_nakama_alacarte",
        proposedAlacartePriceIdr: input.proposedAlacartePriceIdr ?? null,
        status: "draft",
      })
      .returning();

    const createdChapters: (typeof manuscriptChapters.$inferSelect)[] = [];
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

  return formatManuscriptDto(submission, author, publisherName, chapters);
}

/**
 * Loads a manuscript by UUID or slug.
 * Strictly checks actor access: only the author OR an owner/editor member of the target publisher.
 */
export async function getManuscript(
  userId: string,
  idOrSlug: string,
): Promise<ManuscriptSubmissionDto> {
  const isUuid = UUID_REGEX.test(idOrSlug);

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
    if (
      pubMember &&
      (pubMember.role === "owner" || pubMember.role === "editor")
    ) {
      isPublisherEditor = true;
    }
  }

  if (!isAuthor && !isPublisherEditor) {
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
    .orderBy(asc(manuscriptChapters.chapterNumber));

  return formatManuscriptDto(
    sub.submission,
    { name: sub.authorName, authorPenName: sub.authorPenName },
    sub.publisherName,
    chapters,
  );
}

/**
 * Updates a manuscript by its author while it is in `draft` or `revision_requested` status.
 * Enforces author ownership and rejects updates when locked by curation/publication.
 */
export async function updateManuscript(
  userId: string,
  idOrSlug: string,
  input: AuthorUpdateManuscriptInput,
): Promise<ManuscriptSubmissionDto> {
  const isUuid = UUID_REGEX.test(idOrSlug);
  const [existing] = await db
    .select()
    .from(manuscriptSubmissions)
    .where(
      isUuid
        ? or(
            eq(manuscriptSubmissions.id, idOrSlug),
            eq(manuscriptSubmissions.slug, idOrSlug),
          )
        : eq(manuscriptSubmissions.slug, idOrSlug),
    )
    .limit(1);

  if (!existing) {
    throw new HttpError(404, "MANUSCRIPT_NOT_FOUND", "Naskah tidak ditemukan.");
  }

  if (existing.authorUserId !== userId) {
    throw new HttpError(
      403,
      "FORBIDDEN",
      "Hanya penulis pemilik naskah yang dapat mengubah naskah ini.",
    );
  }

  if (existing.status !== "draft" && existing.status !== "revision_requested") {
    throw new HttpError(
      409,
      "MANUSCRIPT_LOCKED",
      "Naskah tidak dapat diubah oleh penulis saat sedang dikurasi atau sudah diterbitkan.",
    );
  }

  if (input.publisherId) {
    const [pub] = await db
      .select({ id: publishers.id })
      .from(publishers)
      .where(eq(publishers.id, input.publisherId))
      .limit(1);
    if (!pub) {
      throw new HttpError(
        404,
        "PUBLISHER_NOT_FOUND",
        "Penerbit tujuan tidak ditemukan.",
      );
    }
  }

  await db.transaction(async (tx) => {
    const patch: Partial<typeof manuscriptSubmissions.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (input.publisherId !== undefined) patch.publisherId = input.publisherId;
    if (input.title !== undefined) patch.title = input.title;
    if (input.slug !== undefined) patch.slug = input.slug || existing.slug;
    if (input.synopsis !== undefined) patch.synopsis = input.synopsis;
    if (input.coverUrl !== undefined) patch.coverUrl = input.coverUrl;
    if (input.category !== undefined) patch.category = input.category;
    if (input.proposedDigitalPolicy !== undefined)
      patch.proposedDigitalPolicy = input.proposedDigitalPolicy;
    if (input.proposedAlacartePriceIdr !== undefined)
      patch.proposedAlacartePriceIdr = input.proposedAlacartePriceIdr;
    if (input.printSimJson !== undefined)
      patch.printSimJson = input.printSimJson;

    await tx
      .update(manuscriptSubmissions)
      .set(patch)
      .where(eq(manuscriptSubmissions.id, existing.id));

    if (input.chapters) {
      await tx
        .delete(manuscriptChapters)
        .where(eq(manuscriptChapters.manuscriptId, existing.id));

      if (input.chapters.length > 0) {
        await tx.insert(manuscriptChapters).values(
          input.chapters.map((ch) => ({
            manuscriptId: existing.id,
            chapterNumber: ch.chapterNumber,
            titleId: ch.titleId,
            contentId: ch.contentId,
            contentEn: ch.contentEn || null,
            blueprintContent: ch.blueprintContent || null,
            estimatedMinutes: ch.estimatedMinutes ?? 5,
          })),
        );
      }
    }
  });

  return await getManuscript(userId, existing.id);
}

/**
 * Edits manuscript content and editorial notes inside a publisher studio.
 * Strictly requires `owner` or `editor` membership for the target publisher.
 */
export async function editPublisherManuscript(
  userId: string,
  publisherSlug: string,
  idOrSlug: string,
  input: PublisherEditManuscriptInput,
): Promise<ManuscriptSubmissionDto> {
  const pub = await resolvePublisherBySlugOrId(publisherSlug);
  await requirePublisherMember(pub.id, userId, ["owner", "editor"]);

  const isUuid = UUID_REGEX.test(idOrSlug);
  const [existing] = await db
    .select()
    .from(manuscriptSubmissions)
    .where(
      isUuid
        ? or(
            eq(manuscriptSubmissions.id, idOrSlug),
            eq(manuscriptSubmissions.slug, idOrSlug),
          )
        : eq(manuscriptSubmissions.slug, idOrSlug),
    )
    .limit(1);

  if (!existing) {
    throw new HttpError(404, "MANUSCRIPT_NOT_FOUND", "Naskah tidak ditemukan.");
  }

  if (existing.publisherId !== pub.id) {
    throw new HttpError(
      403,
      "FORBIDDEN",
      "Naskah ini tidak ditujukan ke penerbit Anda.",
    );
  }

  if (
    existing.status !== "pending_review" &&
    existing.status !== "in_editing"
  ) {
    throw new HttpError(
      409,
      "MANUSCRIPT_LOCKED",
      "Naskah hanya dapat disunting saat menunggu kurasi atau sedang disunting.",
    );
  }

  await db.transaction(async (tx) => {
    const patch: Partial<typeof manuscriptSubmissions.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (input.title !== undefined) patch.title = input.title;
    if (input.slug !== undefined) patch.slug = input.slug || existing.slug;
    if (input.coverUrl !== undefined) patch.coverUrl = input.coverUrl;
    if (input.category !== undefined) patch.category = input.category;
    if (input.synopsis !== undefined) patch.synopsis = input.synopsis;
    if (input.proposedDigitalPolicy !== undefined)
      patch.proposedDigitalPolicy = input.proposedDigitalPolicy;
    if (input.proposedAlacartePriceIdr !== undefined)
      patch.proposedAlacartePriceIdr = input.proposedAlacartePriceIdr;
    if (input.printSimJson !== undefined)
      patch.printSimJson = input.printSimJson;
    if (input.editorialNotes !== undefined)
      patch.editorialNotes = input.editorialNotes;

    await tx
      .update(manuscriptSubmissions)
      .set(patch)
      .where(eq(manuscriptSubmissions.id, existing.id));

    if (input.chapters) {
      await tx
        .delete(manuscriptChapters)
        .where(eq(manuscriptChapters.manuscriptId, existing.id));

      if (input.chapters.length > 0) {
        await tx.insert(manuscriptChapters).values(
          input.chapters.map((ch) => ({
            manuscriptId: existing.id,
            chapterNumber: ch.chapterNumber,
            titleId: ch.titleId,
            contentId: ch.contentId,
            contentEn: ch.contentEn || null,
            blueprintContent: ch.blueprintContent || null,
            estimatedMinutes: ch.estimatedMinutes ?? 5,
          })),
        );
      }
    }
  });

  return await getManuscript(userId, existing.id);
}

/**
 * Submits a manuscript directly to a publisher (auto-assigns `anzabook` if omitted).
 */
export async function submitManuscript(
  authorUserId: string,
  input: SubmitManuscriptInput,
): Promise<ManuscriptSubmissionDto> {
  let finalPublisherId: string | null = input.publisherId || null;
  let publisherName: string | null = null;

  if (finalPublisherId) {
    const [pub] = await db
      .select({ id: publishers.id, name: publishers.name })
      .from(publishers)
      .where(eq(publishers.id, finalPublisherId))
      .limit(1);

    if (!pub) {
      throw new HttpError(
        404,
        "PUBLISHER_NOT_FOUND",
        "Penerbit tidak ditemukan.",
      );
    }
    publisherName = pub.name;
  } else {
    const defaultPub = await resolveDefaultAnzaBookPublisher();
    if (defaultPub) {
      finalPublisherId = defaultPub.id;
      publisherName = defaultPub.name;
    }
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
        publisherId: finalPublisherId,
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

    const createdChapters: (typeof manuscriptChapters.$inferSelect)[] = [];

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

/**
 * Submits an author's draft or revised manuscript to a publisher.
 * Auto-assigns `anzabook` if no publisherId is given on either the draft or the request.
 */
export async function submitManuscriptDraft(
  authorUserId: string,
  idOrSlug: string,
  publisherId?: string | null,
): Promise<ManuscriptSubmissionDto> {
  const isUuid = UUID_REGEX.test(idOrSlug);
  const [current] = await db
    .select()
    .from(manuscriptSubmissions)
    .where(
      isUuid
        ? or(
            eq(manuscriptSubmissions.id, idOrSlug),
            eq(manuscriptSubmissions.slug, idOrSlug),
          )
        : eq(manuscriptSubmissions.slug, idOrSlug),
    )
    .limit(1);

  if (!current) {
    throw new HttpError(404, "MANUSCRIPT_NOT_FOUND", "Naskah tidak ditemukan.");
  }

  if (current.authorUserId !== authorUserId) {
    throw new HttpError(
      403,
      "FORBIDDEN",
      "Hanya penulis pemilik naskah yang dapat mengajukan naskah.",
    );
  }

  if (current.status !== "draft" && current.status !== "revision_requested") {
    throw new HttpError(
      409,
      "MANUSCRIPT_LOCKED",
      "Naskah sudah diajukan atau telah diterbitkan.",
    );
  }

  let finalPublisherId = publisherId || current.publisherId || null;
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
  } else {
    const defaultPub = await resolveDefaultAnzaBookPublisher();
    if (defaultPub) {
      finalPublisherId = defaultPub.id;
    }
  }

  await db
    .update(manuscriptSubmissions)
    .set({
      publisherId: finalPublisherId,
      status: "pending_review",
      updatedAt: new Date(),
    })
    .where(eq(manuscriptSubmissions.id, current.id));

  return await getManuscript(authorUserId, current.id);
}

/**
 * Lists incoming manuscripts for a publisher (owner or editor only — no system admin bypass).
 */
export async function listPublisherManuscripts(
  userId: string,
  publisherSlug: string,
): Promise<ManuscriptSubmissionDto[]> {
  const pub = await resolvePublisherBySlugOrId(publisherSlug);
  await requirePublisherMember(pub.id, userId, ["owner", "editor"]);

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
      .orderBy(asc(manuscriptChapters.chapterNumber));

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

/**
 * Applies an editorial review transition (`start_editing`, `request_revision`, `reject`)
 * strictly scoped to an owner or editor of the receiving publisher.
 */
export async function reviewPublisherManuscript(
  userId: string,
  publisherSlug: string,
  idOrSlug: string,
  input: PublisherReviewManuscriptInput,
): Promise<ManuscriptSubmissionDto> {
  const pub = await resolvePublisherBySlugOrId(publisherSlug);
  await requirePublisherMember(pub.id, userId, ["owner", "editor"]);

  const isUuid = UUID_REGEX.test(idOrSlug);
  const [current] = await db
    .select()
    .from(manuscriptSubmissions)
    .where(
      isUuid
        ? or(
            eq(manuscriptSubmissions.id, idOrSlug),
            eq(manuscriptSubmissions.slug, idOrSlug),
          )
        : eq(manuscriptSubmissions.slug, idOrSlug),
    )
    .limit(1);

  if (!current) {
    throw new HttpError(404, "MANUSCRIPT_NOT_FOUND", "Naskah tidak ditemukan.");
  }

  if (current.publisherId !== pub.id) {
    throw new HttpError(
      403,
      "FORBIDDEN",
      "Naskah ini tidak ditujukan ke penerbit Anda.",
    );
  }

  if (current.status !== "pending_review" && current.status !== "in_editing") {
    throw new HttpError(
      409,
      "INVALID_MANUSCRIPT_STATUS",
      "Transisi tinjauan hanya diizinkan pada naskah berstatus menunggu kurasi atau sedang disunting.",
    );
  }

  const patch: Partial<typeof manuscriptSubmissions.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (input.action === "start_editing") {
    patch.status = "in_editing";
    if (input.notes?.trim()) {
      patch.editorialNotes = input.notes.trim();
    }
  } else if (input.action === "request_revision") {
    patch.status = "revision_requested";
    patch.editorialNotes =
      input.notes?.trim() || "Mohon periksa catatan editor.";
  } else if (input.action === "reject") {
    patch.status = "rejected";
    patch.rejectionReason =
      input.notes?.trim() || "Naskah belum memenuhi kriteria penerbitan.";
  }

  await db
    .update(manuscriptSubmissions)
    .set(patch)
    .where(eq(manuscriptSubmissions.id, current.id));

  return await getManuscript(userId, current.id);
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
      .orderBy(asc(manuscriptChapters.chapterNumber));

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
