import { randomBytes, randomUUID } from "node:crypto";
import { and, asc, desc, eq, or, sql } from "drizzle-orm";
import type {
  BookDistributionModel,
  BookSummaryDto,
  PublishManuscriptResultDto,
  PublisherApprovedWriterDto,
  PublisherBookInventoryItemDto,
  PublisherMemberDto,
  PublisherMemberRole,
  StoreBranchDto,
} from "@starter/shared/types";
import {
  DEFAULT_DIGITAL_BOOK_PRICE_IDR,
  deriveAccessTier,
  type AddApprovedWriterOutput,
  type AddPublisherMemberOutput,
  type PublishManuscriptInput,
  type UpdateBookInventoryInput,
  type UpdatePublisherBookInput,
  type UpdatePublisherMemberInput,
} from "@starter/shared/validators/publisher";
import { db } from "../db";
import {
  bookChapters,
  bookClaimBatches,
  bookClaimCodes,
  bookPrintEditions,
  books,
  manuscriptChapters,
  manuscriptSubmissions,
  publisherApprovedWriters,
  publisherMembers,
  publishers,
  storeBranches,
  storeInventories,
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
        image: user.image,
      })
      .from(user)
      .where(eq(user.id, manuscript.authorUserId))
      .limit(1);

    const resolvedTitle = overrides?.title?.trim() || manuscript.title;
    const resolvedSynopsis = overrides?.synopsis?.trim() || manuscript.synopsis;

    const authorName =
      overrides?.author?.trim() ||
      authorUser?.authorPenName ||
      authorUser?.name ||
      "Penulis AnzaBook";

    const digitalPolicy: BookDistributionModel =
      overrides?.digitalPolicy ||
      manuscript.proposedDigitalPolicy ||
      "nakama_subscription";

    const needsPurchasePrice =
      digitalPolicy === "single_purchase" ||
      digitalPolicy === "nakama_or_purchase";

    const rawPrice =
      overrides?.digitalPriceIdr !== undefined
        ? overrides.digitalPriceIdr
        : manuscript.proposedDigitalPriceIdr;

    const digitalPriceIdr = needsPurchasePrice
      ? rawPrice && rawPrice > 0
        ? rawPrice
        : DEFAULT_DIGITAL_BOOK_PRICE_IDR
      : (rawPrice ?? null);

    const hasPhysical =
      overrides?.hasPhysical ??
      (digitalPolicy === "print_code_only" ||
        digitalPolicy === "nakama_or_purchase");

    const accessTier = deriveAccessTier(digitalPolicy, hasPhysical);

    const coverUrl =
      overrides?.coverUrl?.trim() ||
      (manuscript.coverUrl && manuscript.coverUrl !== "template"
        ? manuscript.coverUrl
        : "") ||
      "/covers/default-book.jpg";

    const coverColor =
      overrides?.coverColor || manuscript.coverColor || "#13110F";

    const categories =
      overrides?.categories && overrides.categories.length > 0
        ? overrides.categories
        : manuscript.category
          ? [manuscript.category]
          : [];

    const hasEnglishChapters = chapters.some((ch) =>
      Boolean(ch.contentEn && ch.contentEn.trim().length > 0),
    );
    const availableLanguages = hasEnglishChapters
      ? ["id", "en"]
      : [manuscript.sourceLanguage || "id"];

    const publishedYear =
      overrides?.publishedYear ?? new Date().getUTCFullYear();
    const collectionName = overrides?.collectionName?.trim() || null;
    const rakyatPriceIdr = overrides?.rakyatPriceIdr ?? 35_000;
    const standardPriceIdr = overrides?.standardPriceIdr ?? 75_000;
    const isbn = overrides?.isbn?.trim() || manuscript.isbn || null;

    const baseBookSlug = slugify(resolvedTitle).slice(0, 100) || "buku";
    const bookSlug = `${baseBookSlug}-${randomUUID().slice(0, 8)}`;
    const readingMinutes = chapters.reduce(
      (sum, c) => sum + (c.estimatedMinutes || 5),
      0,
    );
    const pageCount =
      manuscript.estimatedPages ?? Math.max(chapters.length * 15, 20);

    const [book] = await tx
      .insert(books)
      .values({
        slug: bookSlug,
        title: resolvedTitle,
        author: authorName,
        authorAvatar: authorUser?.image ?? null,
        synopsis: resolvedSynopsis,
        coverUrl,
        coverColor,
        publishedYear,
        collectionName,
        categories,
        genres: categories,
        availableLanguages,
        digitalPolicy,
        accessTier,
        digitalPriceIdr,
        rakyatPriceIdr,
        standardPriceIdr,
        publisherId: pub.id,
        authorUserId: manuscript.authorUserId,
        totalChapters: chapters.length,
        readingMinutes,
        pageCount,
        hasPhysical,
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

    if (hasPhysical) {
      await tx.insert(bookPrintEditions).values([
        {
          bookId: book.id,
          tier: "rakyat_economy",
          tierName: "Edisi Cetak Rakyat",
          paperType: "Book Paper 55gsm",
          paperGsm: 55,
          coverType: "Softcover Standar",
          bindingType: "Lem Panas",
          priceIdr: rakyatPriceIdr,
          traditionalPriceIdr: Math.round(rakyatPriceIdr * 1.45),
          savingsPercent: 31,
          weightGrams: 190,
          inStock: true,
        },
        {
          bookId: book.id,
          isbn,
          tier: "standard_trade",
          tierName: "Edisi Standar Penerbit",
          paperType: "Book Paper 72gsm",
          paperGsm: 72,
          coverType: "Softcover Doft",
          bindingType: "Lem Panas",
          priceIdr: standardPriceIdr,
          traditionalPriceIdr: Math.round(standardPriceIdr * 1.25),
          savingsPercent: 20,
          weightGrams: 240,
          inStock: true,
        },
      ]);
    }

    let initialBatch: typeof bookClaimBatches.$inferSelect | null = null;

    if (digitalPolicy === "print_code_only") {
      const [batch] = await tx
        .insert(bookClaimBatches)
        .values({
          bookId: book.id,
          publisherId: pub.id,
          batchName: `Batch Perdana (500 Eks) - ${resolvedTitle.slice(0, 50)}`,
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
      book: toBookSummary(book, pub, authorUser?.image ?? null),
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
    .select({
      book: books,
      authorAvatarFallback: user.image,
    })
    .from(books)
    .leftJoin(user, eq(books.authorUserId, user.id))
    .where(eq(books.publisherId, pub.id))
    .orderBy(desc(books.createdAt), books.id);

  return rows.map(({ book, authorAvatarFallback }) =>
    toBookSummary(book, pub, authorAvatarFallback),
  );
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

  const nextPolicy: BookDistributionModel =
    input.digitalPolicy ??
    (existingBook.digitalPolicy as BookDistributionModel);
  const nextHasPhysical =
    input.hasPhysical ??
    (input.digitalPolicy !== undefined
      ? input.digitalPolicy === "print_code_only" ||
        input.digitalPolicy === "nakama_or_purchase"
      : existingBook.hasPhysical);

  const patch: Partial<typeof books.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (input.title !== undefined) patch.title = input.title;
  if (input.synopsis !== undefined) patch.synopsis = input.synopsis;
  if (input.author !== undefined) patch.author = input.author;
  if (input.coverUrl !== undefined) {
    patch.coverUrl = input.coverUrl?.trim() || "/covers/default-book.jpg";
  }
  if (input.coverColor !== undefined) patch.coverColor = input.coverColor;
  if (input.categories !== undefined) {
    patch.categories = input.categories;
    patch.genres = input.categories;
  }
  if (input.publishedYear !== undefined)
    patch.publishedYear = input.publishedYear;
  if (input.collectionName !== undefined)
    patch.collectionName = input.collectionName || null;
  if (input.rakyatPriceIdr !== undefined)
    patch.rakyatPriceIdr = input.rakyatPriceIdr;
  if (input.standardPriceIdr !== undefined)
    patch.standardPriceIdr = input.standardPriceIdr;

  patch.digitalPolicy = nextPolicy;
  patch.hasPhysical = nextHasPhysical;
  patch.accessTier = deriveAccessTier(nextPolicy, nextHasPhysical);

  const rawPrice =
    input.digitalPriceIdr !== undefined
      ? input.digitalPriceIdr
      : existingBook.digitalPriceIdr;

  if (nextPolicy === "single_purchase" || nextPolicy === "nakama_or_purchase") {
    patch.digitalPriceIdr =
      rawPrice && rawPrice > 0 ? rawPrice : DEFAULT_DIGITAL_BOOK_PRICE_IDR;
  } else if (input.digitalPriceIdr !== undefined) {
    patch.digitalPriceIdr = input.digitalPriceIdr;
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

  const normalizedEmail = input.email.trim().toLowerCase();
  const [targetUser] = await db
    .select({
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      image: user.image,
    })
    .from(user)
    .where(eq(sql`lower(${user.email})`, normalizedEmail))
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

/**
 * Lists approved writers ("Penulis Rekanan") registered with a publisher.
 * Restricted to publisher owner or editor.
 */
export async function listPublisherApprovedWriters(
  userId: string,
  publisherSlug: string,
): Promise<PublisherApprovedWriterDto[]> {
  const pub = await resolvePublisherBySlugOrId(publisherSlug);
  await requirePublisherMember(pub.id, userId, ["owner", "editor"]);

  const rows = await db
    .select({
      id: publisherApprovedWriters.id,
      publisherId: publisherApprovedWriters.publisherId,
      userId: publisherApprovedWriters.userId,
      invitedEmail: publisherApprovedWriters.invitedEmail,
      status: publisherApprovedWriters.status,
      canFastTrack: publisherApprovedWriters.canFastTrack,
      acceptedAt: publisherApprovedWriters.acceptedAt,
      createdAt: publisherApprovedWriters.createdAt,
      name: user.name,
      username: user.username,
      email: user.email,
      image: user.image,
    })
    .from(publisherApprovedWriters)
    .leftJoin(user, eq(publisherApprovedWriters.userId, user.id))
    .where(eq(publisherApprovedWriters.publisherId, pub.id))
    .orderBy(desc(publisherApprovedWriters.createdAt));

  return rows.map((row) => ({
    id: row.id,
    publisherId: row.publisherId,
    userId: row.userId ?? null,
    invitedEmail: row.invitedEmail ?? row.email ?? null,
    status: row.status,
    canFastTrack: row.canFastTrack,
    name: row.name ?? null,
    username: row.username ?? null,
    image: row.image ?? null,
    acceptedAt: row.acceptedAt ? row.acceptedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  }));
}

/**
 * Adds or updates an approved writer ("Penulis Rekanan") by email or username.
 * Restricted to publisher owner or editor.
 */
export async function addPublisherApprovedWriter(
  userId: string,
  publisherSlug: string,
  input: AddApprovedWriterOutput,
): Promise<PublisherApprovedWriterDto> {
  const normalized = input.identifier.trim().replace(/^@/, "").toLowerCase();

  return await db.transaction(async (tx) => {
    const pub = await resolvePublisherBySlugOrId(publisherSlug, tx);
    await requirePublisherMember(pub.id, userId, ["owner", "editor"], tx);

    const [targetUser] = await tx
      .select()
      .from(user)
      .where(
        or(
          eq(sql`lower(${user.email})`, normalized),
          eq(sql`lower(${user.username})`, normalized),
        ),
      )
      .limit(1);

    if (!targetUser) {
      throw new HttpError(
        404,
        "USER_NOT_FOUND",
        "Penulis dengan email atau username tersebut tidak ditemukan.",
      );
    }

    const [existing] = await tx
      .select()
      .from(publisherApprovedWriters)
      .where(
        and(
          eq(publisherApprovedWriters.publisherId, pub.id),
          eq(publisherApprovedWriters.userId, targetUser.id),
        ),
      )
      .limit(1);

    const now = new Date();

    if (existing) {
      const [updated] = await tx
        .update(publisherApprovedWriters)
        .set({
          status: "active",
          invitedEmail: targetUser.email,
          canFastTrack: input.canFastTrack,
          invitedByUserId: userId,
          acceptedAt: existing.acceptedAt ?? now,
        })
        .where(eq(publisherApprovedWriters.id, existing.id))
        .returning();

      return {
        id: updated.id,
        publisherId: updated.publisherId,
        userId: targetUser.id,
        invitedEmail: updated.invitedEmail ?? targetUser.email,
        status: updated.status,
        canFastTrack: updated.canFastTrack,
        name: targetUser.name,
        username: targetUser.username ?? null,
        image: targetUser.image ?? null,
        acceptedAt: updated.acceptedAt
          ? updated.acceptedAt.toISOString()
          : null,
        createdAt: updated.createdAt.toISOString(),
      };
    }

    const [inserted] = await tx
      .insert(publisherApprovedWriters)
      .values({
        publisherId: pub.id,
        userId: targetUser.id,
        invitedEmail: targetUser.email,
        status: "active",
        canFastTrack: input.canFastTrack,
        invitedByUserId: userId,
        acceptedAt: now,
      })
      .returning();

    return {
      id: inserted.id,
      publisherId: inserted.publisherId,
      userId: targetUser.id,
      invitedEmail: inserted.invitedEmail ?? targetUser.email,
      status: inserted.status,
      canFastTrack: inserted.canFastTrack,
      name: targetUser.name,
      username: targetUser.username ?? null,
      image: targetUser.image ?? null,
      acceptedAt: inserted.acceptedAt
        ? inserted.acceptedAt.toISOString()
        : null,
      createdAt: inserted.createdAt.toISOString(),
    };
  });
}

/**
 * Removes an approved writer record from a publisher.
 * Restricted to publisher owner or editor.
 */
export async function removePublisherApprovedWriter(
  userId: string,
  publisherSlug: string,
  writerId: string,
): Promise<{ removed: boolean }> {
  return await db.transaction(async (tx) => {
    const pub = await resolvePublisherBySlugOrId(publisherSlug, tx);
    await requirePublisherMember(pub.id, userId, ["owner", "editor"], tx);

    const [target] = await tx
      .select()
      .from(publisherApprovedWriters)
      .where(
        and(
          eq(publisherApprovedWriters.id, writerId),
          eq(publisherApprovedWriters.publisherId, pub.id),
        ),
      )
      .limit(1);

    if (!target) {
      throw new HttpError(
        404,
        "APPROVED_WRITER_NOT_FOUND",
        "Penulis rekanan tidak ditemukan pada penerbit ini.",
      );
    }

    await tx
      .delete(publisherApprovedWriters)
      .where(
        and(
          eq(publisherApprovedWriters.id, writerId),
          eq(publisherApprovedWriters.publisherId, pub.id),
        ),
      );

    return { removed: true };
  });
}

/**
 * Lists all registered partner bookstore branches so publishers can manage physical print inventory.
 */
export async function listStoreBranches(): Promise<StoreBranchDto[]> {
  const rows = await db
    .select()
    .from(storeBranches)
    .orderBy(asc(storeBranches.city), asc(storeBranches.branchName));

  return rows.map((row) => ({
    id: row.id,
    chainName: row.chainName as StoreBranchDto["chainName"],
    branchName: row.branchName,
    city: row.city,
    address: row.address,
  }));
}

/**
 * Lists inventory levels per bookstore branch for a publisher-owned book.
 */
export async function listPublisherBookInventory(
  userId: string,
  publisherSlug: string,
  bookId: string,
): Promise<PublisherBookInventoryItemDto[]> {
  const pub = await resolvePublisherBySlugOrId(publisherSlug);
  await requirePublisherMember(pub.id, userId, ["owner", "editor"]);

  const [book] = await db
    .select({ id: books.id })
    .from(books)
    .where(and(eq(books.id, bookId), eq(books.publisherId, pub.id)))
    .limit(1);

  if (!book) {
    throw new HttpError(
      404,
      "BOOK_NOT_FOUND",
      "Buku tidak ditemukan pada katalog penerbit ini.",
    );
  }

  const branches = await listStoreBranches();
  const invRows = await db
    .select()
    .from(storeInventories)
    .where(eq(storeInventories.bookId, book.id));

  const invByBranch = new Map(invRows.map((row) => [row.branchId, row]));

  return branches.map((branch) => {
    const inv = invByBranch.get(branch.id);
    const rakyatStock = inv?.rakyatStock ?? 0;
    const standardStock = inv?.standardStock ?? 0;
    const total = rakyatStock + standardStock;
    const computedStatus =
      inv?.stockStatus ??
      (total === 0 ? "out_of_stock" : total <= 5 ? "low_stock" : "available");

    return {
      branchId: branch.id,
      branchName: branch.branchName,
      chainName: branch.chainName,
      city: branch.city,
      address: branch.address,
      rakyatStock,
      standardStock,
      stockStatus: computedStatus,
      lastSyncedAt: inv?.lastSyncedAt
        ? inv.lastSyncedAt.toISOString()
        : new Date(0).toISOString(),
    };
  });
}

function resolveStockStatus(
  rakyatStock: number,
  standardStock: number,
  explicit?: "available" | "low_stock" | "out_of_stock",
): "available" | "low_stock" | "out_of_stock" {
  if (explicit) return explicit;
  const total = rakyatStock + standardStock;
  if (total <= 0) return "out_of_stock";
  if (total <= 5) return "low_stock";
  return "available";
}

/**
 * Replaces or upserts bookstore inventory counts for a publisher-owned book.
 */
export async function updatePublisherBookInventory(
  userId: string,
  publisherSlug: string,
  bookId: string,
  input: UpdateBookInventoryInput,
): Promise<PublisherBookInventoryItemDto[]> {
  await db.transaction(async (tx) => {
    const pub = await resolvePublisherBySlugOrId(publisherSlug, tx);
    await requirePublisherMember(pub.id, userId, ["owner", "editor"], tx);

    const [book] = await tx
      .select({ id: books.id })
      .from(books)
      .where(and(eq(books.id, bookId), eq(books.publisherId, pub.id)))
      .limit(1);

    if (!book) {
      throw new HttpError(
        404,
        "BOOK_NOT_FOUND",
        "Buku tidak ditemukan pada katalog penerbit ini.",
      );
    }

    const now = new Date();
    for (const item of input.items) {
      const stockStatus = resolveStockStatus(
        item.rakyatStock,
        item.standardStock,
        item.stockStatus,
      );

      const [existing] = await tx
        .select({ id: storeInventories.id })
        .from(storeInventories)
        .where(
          and(
            eq(storeInventories.bookId, book.id),
            eq(storeInventories.branchId, item.branchId),
          ),
        )
        .limit(1);

      if (existing) {
        await tx
          .update(storeInventories)
          .set({
            rakyatStock: item.rakyatStock,
            standardStock: item.standardStock,
            stockStatus,
            lastSyncedAt: now,
          })
          .where(eq(storeInventories.id, existing.id));
      } else {
        await tx.insert(storeInventories).values({
          bookId: book.id,
          branchId: item.branchId,
          rakyatStock: item.rakyatStock,
          standardStock: item.standardStock,
          stockStatus,
          lastSyncedAt: now,
        });
      }
    }
  });

  return listPublisherBookInventory(userId, publisherSlug, bookId);
}
