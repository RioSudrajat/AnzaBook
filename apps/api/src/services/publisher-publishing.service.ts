import { randomBytes, randomUUID } from "node:crypto";
import { and, asc, desc, eq, ilike, or } from "drizzle-orm";
import type {
  BookSummaryDto,
  DigitalPolicy,
  PublishManuscriptResultDto,
  PublisherMemberDto,
  PublisherMemberRole,
} from "@starter/shared/types";
import type {
  AddPublisherMemberOutput,
  PublishManuscriptInput,
  UpdatePublisherBookInput,
  UpdatePublisherMemberInput,
} from "@starter/shared/validators/publisher";
import { db } from "../db";
import {
  bookChapters,
  bookClaimBatches,
  bookClaimCodes,
  books,
  manuscriptChapters,
  manuscriptSubmissions,
  publisherMembers,
  publishers,
  user,
} from "../db/schema";
import { HttpError } from "../lib/http-error";
import { toBookSummary } from "./books.service";

export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type DbOrTx =
  typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/--+/g, "-")
    .replace(/^-+|-+$/g, "")
    .trim();
}

function generateClaimCode(): string {
  return `ANZ-${randomBytes(6).toString("hex").toUpperCase()}`;
}

/**
 * Resolves a publisher by slug or UUID, throwing 404 PUBLISHER_NOT_FOUND when absent.
 */
export async function resolvePublisherBySlugOrId(
  slugOrId: string,
  executor: DbOrTx = db,
): Promise<typeof publishers.$inferSelect> {
  const isUuid = UUID_REGEX.test(slugOrId);
  const [pub] = await executor
    .select()
    .from(publishers)
    .where(
      isUuid
        ? or(eq(publishers.slug, slugOrId), eq(publishers.id, slugOrId))
        : eq(publishers.slug, slugOrId),
    )
    .limit(1);

  if (!pub) {
    throw new HttpError(
      404,
      "PUBLISHER_NOT_FOUND",
      "Penerbit tidak ditemukan.",
    );
  }

  return pub;
}

/**
 * Enforces explicit membership in `publisher_members` with one of `allowedRoles`.
 * Platform admins receive NO bypass here — domain boundaries remain strict.
 */
export async function requirePublisherMember(
  publisherId: string,
  userId: string,
  allowedRoles: readonly PublisherMemberRole[],
  executor: DbOrTx = db,
): Promise<typeof publisherMembers.$inferSelect> {
  const [member] = await executor
    .select()
    .from(publisherMembers)
    .where(
      and(
        eq(publisherMembers.publisherId, publisherId),
        eq(publisherMembers.userId, userId),
      ),
    )
    .limit(1);

  if (!member || !allowedRoles.includes(member.role)) {
    throw new HttpError(
      403,
      "FORBIDDEN",
      "Anda tidak memiliki izin peran penerbit untuk tindakan ini.",
    );
  }

  return member;
}

/**
 * Atomically publishes a manuscript scoped to a verified publisher.
 * Uses `SELECT ... FOR UPDATE` on the manuscript row to prevent concurrent double-publishing.
 */
export async function publishPublisherManuscript(
  userId: string,
  publisherSlug: string,
  idOrSlug: string,
  overrides?: PublishManuscriptInput,
): Promise<PublishManuscriptResultDto> {
  return await db.transaction(async (tx) => {
    const pub = await resolvePublisherBySlugOrId(publisherSlug, tx);
    await requirePublisherMember(pub.id, userId, ["owner", "editor"], tx);

    if (pub.verificationStatus !== "verified") {
      throw new HttpError(
        403,
        "PUBLISHER_NOT_VERIFIED",
        "Penerbit harus terverifikasi sebelum menerbitkan buku ke katalog.",
      );
    }

    const isUuid = UUID_REGEX.test(idOrSlug);
    const [manuscript] = await tx
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
      .for("update")
      .limit(1);

    if (!manuscript) {
      throw new HttpError(
        404,
        "MANUSCRIPT_NOT_FOUND",
        "Naskah tidak ditemukan.",
      );
    }

    if (manuscript.publisherId !== pub.id) {
      throw new HttpError(
        403,
        "FORBIDDEN",
        "Naskah ini tidak ditujukan ke penerbit Anda.",
      );
    }

    if (
      manuscript.status === "published" ||
      manuscript.publishedBookId !== null
    ) {
      throw new HttpError(
        409,
        "ALREADY_PUBLISHED",
        "Naskah ini sudah diterbitkan ke katalog.",
      );
    }

    if (
      manuscript.status !== "pending_review" &&
      manuscript.status !== "in_editing"
    ) {
      throw new HttpError(
        409,
        "INVALID_MANUSCRIPT_STATUS",
        "Hanya naskah berstatus menunggu kurasi atau sedang disunting yang dapat diterbitkan.",
      );
    }

    const chapters = await tx
      .select()
      .from(manuscriptChapters)
      .where(eq(manuscriptChapters.manuscriptId, manuscript.id))
      .orderBy(asc(manuscriptChapters.chapterNumber));

    if (chapters.length === 0) {
      throw new HttpError(
        400,
        "NO_CHAPTERS",
        "Naskah belum memiliki bab untuk diterbitkan.",
      );
    }

    const [authorUser] = await tx
      .select({
        name: user.name,
        authorPenName: user.authorPenName,
      })
      .from(user)
      .where(eq(user.id, manuscript.authorUserId))
      .limit(1);

    const authorName =
      overrides?.author?.trim() ||
      authorUser?.authorPenName ||
      authorUser?.name ||
      "Penulis AnzaBook";

    const digitalPolicy: DigitalPolicy =
      overrides?.digitalPolicy ||
      manuscript.proposedDigitalPolicy ||
      "sample_only";

    const alacartePriceIdr =
      overrides?.alacartePriceIdr !== undefined
        ? overrides.alacartePriceIdr
        : (manuscript.proposedAlacartePriceIdr ??
          (digitalPolicy === "alacarte_only" ? 45000 : null));

    const coverUrl =
      overrides?.coverUrl?.trim() ||
      (manuscript.coverUrl && manuscript.coverUrl !== "template"
        ? manuscript.coverUrl
        : "") ||
      "/covers/default-book.jpg";

    const categories =
      overrides?.categories && overrides.categories.length > 0
        ? overrides.categories
        : manuscript.category
          ? [manuscript.category]
          : [];

    const baseBookSlug = slugify(manuscript.title).slice(0, 100) || "buku";
    const bookSlug = `${baseBookSlug}-${randomUUID().slice(0, 8)}`;
    const readingMinutes = chapters.reduce(
      (sum, c) => sum + (c.estimatedMinutes || 5),
      0,
    );
    const pageCount = Math.max(chapters.length * 15, 20);

    const [book] = await tx
      .insert(books)
      .values({
        slug: bookSlug,
        title: manuscript.title,
        author: authorName,
        synopsis: manuscript.synopsis,
        coverUrl,
        categories,
        digitalPolicy,
        alacartePriceIdr,
        publisherId: pub.id,
        authorUserId: manuscript.authorUserId,
        totalChapters: chapters.length,
        readingMinutes,
        pageCount,
        hasPhysical:
          digitalPolicy === "print_claim_only" ||
          digitalPolicy === "hybrid_nakama_alacarte",
      })
      .returning();

    await tx.insert(bookChapters).values(
      chapters.map((ch) => ({
        bookId: book.id,
        chapterNumber: ch.chapterNumber,
        titleId: ch.titleId,
        contentId: ch.contentId,
        contentEn: ch.contentEn,
        blueprintContent: ch.blueprintContent ?? "",
      })),
    );

    let initialBatch: typeof bookClaimBatches.$inferSelect | null = null;

    if (digitalPolicy === "print_claim_only") {
      const [batch] = await tx
        .insert(bookClaimBatches)
        .values({
          bookId: book.id,
          publisherId: pub.id,
          batchName: `Batch Perdana (500 Eks) - ${manuscript.title.slice(0, 50)}`,
          totalCodes: 500,
          unitFeeIdr: 0,
          billingStatus: "free_tier",
        })
        .returning();

      initialBatch = batch;

      const codeRecords = Array.from({ length: 500 }, () => ({
        bookId: book.id,
        batchId: batch.id,
        code: generateClaimCode(),
        isDemo: false,
      }));

      await tx.insert(bookClaimCodes).values(codeRecords);
    }

    await tx
      .update(manuscriptSubmissions)
      .set({
        status: "published",
        publishedBookId: book.id,
        updatedAt: new Date(),
      })
      .where(eq(manuscriptSubmissions.id, manuscript.id));

    return {
      publishedBookId: book.id,
      book: toBookSummary(book, pub),
      claimBatch: initialBatch
        ? {
            id: initialBatch.id,
            bookId: initialBatch.bookId,
            bookTitle: book.title,
            publisherId: initialBatch.publisherId,
            publisherName: pub.name,
            batchName: initialBatch.batchName,
            totalCodes: initialBatch.totalCodes,
            unitFeeIdr: initialBatch.unitFeeIdr,
            billingStatus: initialBatch.billingStatus,
            createdAt: initialBatch.createdAt.toISOString(),
          }
        : null,
    };
  });
}

/**
 * Lists all catalog books owned by the publisher (owner or editor only).
 */
export async function listPublisherBooks(
  userId: string,
  publisherSlug: string,
): Promise<BookSummaryDto[]> {
  const pub = await resolvePublisherBySlugOrId(publisherSlug);
  await requirePublisherMember(pub.id, userId, ["owner", "editor"]);

  const rows = await db
    .select()
    .from(books)
    .where(eq(books.publisherId, pub.id))
    .orderBy(desc(books.createdAt), books.id);

  return rows.map((row) => toBookSummary(row, pub));
}

/**
 * Updates metadata or distribution policy for a catalog book owned by the publisher.
 */
export async function updatePublisherBook(
  userId: string,
  publisherSlug: string,
  bookId: string,
  input: UpdatePublisherBookInput,
): Promise<BookSummaryDto> {
  const pub = await resolvePublisherBySlugOrId(publisherSlug);
  await requirePublisherMember(pub.id, userId, ["owner", "editor"]);

  if (!UUID_REGEX.test(bookId)) {
    throw new HttpError(404, "BOOK_NOT_FOUND", "Buku tidak ditemukan.");
  }

  const [existingBook] = await db
    .select()
    .from(books)
    .where(eq(books.id, bookId))
    .limit(1);

  if (!existingBook) {
    throw new HttpError(404, "BOOK_NOT_FOUND", "Buku tidak ditemukan.");
  }

  if (existingBook.publisherId !== pub.id) {
    throw new HttpError(
      403,
      "FORBIDDEN",
      "Buku ini bukan milik penerbit Anda.",
    );
  }

  const patch: Partial<typeof books.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (input.title !== undefined) patch.title = input.title;
  if (input.synopsis !== undefined) patch.synopsis = input.synopsis;
  if (input.coverUrl !== undefined) {
    patch.coverUrl = input.coverUrl?.trim() || "/covers/default-book.jpg";
  }
  if (input.categories !== undefined) patch.categories = input.categories;
  if (input.digitalPolicy !== undefined) {
    patch.digitalPolicy = input.digitalPolicy;
    patch.hasPhysical =
      input.digitalPolicy === "print_claim_only" ||
      input.digitalPolicy === "hybrid_nakama_alacarte";
  }
  if (input.alacartePriceIdr !== undefined) {
    patch.alacartePriceIdr = input.alacartePriceIdr;
  }

  const [updated] = await db
    .update(books)
    .set(patch)
    .where(and(eq(books.id, bookId), eq(books.publisherId, pub.id)))
    .returning();

  return toBookSummary(updated, pub);
}

/**
 * Lists all members of a publisher team (owner only).
 */
export async function listPublisherMembers(
  userId: string,
  publisherSlug: string,
): Promise<PublisherMemberDto[]> {
  const pub = await resolvePublisherBySlugOrId(publisherSlug);
  await requirePublisherMember(pub.id, userId, ["owner"]);

  const rows = await db
    .select({
      id: publisherMembers.id,
      publisherId: publisherMembers.publisherId,
      userId: publisherMembers.userId,
      role: publisherMembers.role,
      createdAt: publisherMembers.createdAt,
      name: user.name,
      username: user.username,
      email: user.email,
      image: user.image,
    })
    .from(publisherMembers)
    .innerJoin(user, eq(publisherMembers.userId, user.id))
    .where(eq(publisherMembers.publisherId, pub.id))
    .orderBy(asc(publisherMembers.createdAt));

  return rows.map((row) => ({
    id: row.id,
    publisherId: row.publisherId,
    userId: row.userId,
    role: row.role,
    name: row.name,
    username: row.username,
    email: row.email,
    image: row.image,
    createdAt: row.createdAt.toISOString(),
  }));
}

/**
 * Adds a registered user to the publisher team by email (owner only).
 */
export async function addPublisherMember(
  userId: string,
  publisherSlug: string,
  input: AddPublisherMemberOutput,
): Promise<PublisherMemberDto> {
  const pub = await resolvePublisherBySlugOrId(publisherSlug);
  await requirePublisherMember(pub.id, userId, ["owner"]);

  const [targetUser] = await db
    .select({
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      image: user.image,
    })
    .from(user)
    .where(ilike(user.email, input.email.trim()))
    .limit(1);

  if (!targetUser) {
    throw new HttpError(
      404,
      "USER_NOT_FOUND",
      "Pengguna dengan email tersebut tidak ditemukan.",
    );
  }

  const [existing] = await db
    .select({ id: publisherMembers.id })
    .from(publisherMembers)
    .where(
      and(
        eq(publisherMembers.publisherId, pub.id),
        eq(publisherMembers.userId, targetUser.id),
      ),
    )
    .limit(1);

  if (existing) {
    throw new HttpError(
      409,
      "MEMBER_ALREADY_EXISTS",
      "Pengguna tersebut sudah terdaftar sebagai anggota tim penerbit ini.",
    );
  }

  const [inserted] = await db
    .insert(publisherMembers)
    .values({
      publisherId: pub.id,
      userId: targetUser.id,
      role: input.role,
    })
    .returning();

  return {
    id: inserted.id,
    publisherId: inserted.publisherId,
    userId: inserted.userId,
    role: inserted.role,
    name: targetUser.name,
    username: targetUser.username,
    email: targetUser.email,
    image: targetUser.image,
    createdAt: inserted.createdAt.toISOString(),
  };
}

/**
 * Updates a publisher member's role (owner only), preventing demoting the last owner.
 */
export async function updatePublisherMember(
  userId: string,
  publisherSlug: string,
  memberId: string,
  input: UpdatePublisherMemberInput,
): Promise<PublisherMemberDto> {
  if (!UUID_REGEX.test(memberId)) {
    throw new HttpError(
      404,
      "MEMBER_NOT_FOUND",
      "Anggota tim penerbit tidak ditemukan.",
    );
  }

  return await db.transaction(async (tx) => {
    const pub = await resolvePublisherBySlugOrId(publisherSlug, tx);
    await requirePublisherMember(pub.id, userId, ["owner"], tx);

    const lockedMembers = await tx
      .select()
      .from(publisherMembers)
      .where(eq(publisherMembers.publisherId, pub.id))
      .for("update");

    const target = lockedMembers.find((m) => m.id === memberId);
    if (!target) {
      throw new HttpError(
        404,
        "MEMBER_NOT_FOUND",
        "Anggota tim penerbit tidak ditemukan.",
      );
    }

    if (target.role === "owner" && input.role !== "owner") {
      const ownerCount = lockedMembers.filter((m) => m.role === "owner").length;
      if (ownerCount <= 1) {
        throw new HttpError(
          400,
          "LAST_OWNER_REQUIRED",
          "Penerbit harus memiliki minimal satu pemilik (owner).",
        );
      }
    }

    const [updated] = await tx
      .update(publisherMembers)
      .set({ role: input.role })
      .where(
        and(
          eq(publisherMembers.id, memberId),
          eq(publisherMembers.publisherId, pub.id),
        ),
      )
      .returning();

    const [memberUser] = await tx
      .select({
        name: user.name,
        username: user.username,
        email: user.email,
        image: user.image,
      })
      .from(user)
      .where(eq(user.id, updated.userId))
      .limit(1);

    return {
      id: updated.id,
      publisherId: updated.publisherId,
      userId: updated.userId,
      role: updated.role,
      name: memberUser?.name ?? "Anggota Tim",
      username: memberUser?.username ?? null,
      email: memberUser?.email,
      image: memberUser?.image ?? null,
      createdAt: updated.createdAt.toISOString(),
    };
  });
}

/**
 * Removes a member from a publisher team (owner only), blocking removal of the last remaining owner.
 */
export async function removePublisherMember(
  userId: string,
  publisherSlug: string,
  memberId: string,
): Promise<{ removed: boolean }> {
  if (!UUID_REGEX.test(memberId)) {
    throw new HttpError(
      404,
      "MEMBER_NOT_FOUND",
      "Anggota tim penerbit tidak ditemukan.",
    );
  }

  return await db.transaction(async (tx) => {
    const pub = await resolvePublisherBySlugOrId(publisherSlug, tx);
    await requirePublisherMember(pub.id, userId, ["owner"], tx);

    const lockedMembers = await tx
      .select()
      .from(publisherMembers)
      .where(eq(publisherMembers.publisherId, pub.id))
      .for("update");

    const target = lockedMembers.find((m) => m.id === memberId);
    if (!target) {
      throw new HttpError(
        404,
        "MEMBER_NOT_FOUND",
        "Anggota tim penerbit tidak ditemukan.",
      );
    }

    if (target.role === "owner") {
      const ownerCount = lockedMembers.filter((m) => m.role === "owner").length;
      if (ownerCount <= 1) {
        throw new HttpError(
          400,
          "LAST_OWNER_REQUIRED",
          "Tidak dapat menghapus pemilik terakhir penerbit.",
        );
      }
    }

    await tx
      .delete(publisherMembers)
      .where(
        and(
          eq(publisherMembers.id, memberId),
          eq(publisherMembers.publisherId, pub.id),
        ),
      );

    return { removed: true };
  });
}
