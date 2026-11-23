import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "../db";
import {
  authorApplications,
  bookHighlights,
  bookReviews,
  books,
  communityCalendarFollowers,
  communityCalendarMembers,
  communityCalendars,
  publisherMembers,
  publishers,
  readingSessions,
  user,
  userFollows,
  userShelves,
} from "../db/schema";
import { HttpError } from "../lib/http-error";
import { toBookSummary } from "./books.service";
import {
  quotePostConfigSchema,
  sessionPostConfigSchema,
  type ApplyAuthorInput,
  type PublicSocialPostType,
  type PublishHighlightPostInput,
  type PublishSessionPostInput,
  type UpdateProfileBioInput,
} from "@starter/shared/validators/social";
import type {
  AuthorDirectoryItemDto,
  BookSummaryDto,
  ExplorePostItemDto,
  ExploreUserItemDto,
  HighlightColor,
  ManagedCommunitySummaryDto,
  ManagedPublisherSummaryDto,
  PublicProfileReviewDto,
  ReaderDirectoryItemDto,
  ShelfItemDto,
  SocialProfileDto,
  SocialRelationItemDto,
  UnifiedExploreResultDto,
  QuotePostConfig,
  SessionPostConfig,
} from "@starter/shared/types";

const readingDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Jakarta",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const dayMs = 86_400_000;

type PublicAuthorPreview = {
  id: string;
  name: string;
  username: string | null;
  image: string | null;
};

type PublicBookPreview = {
  id: string;
  slug: string;
  title: string;
  author: string;
  coverColor: string | null;
  coverUrl: string | null;
};

function parseQuotePostConfig(raw: unknown): QuotePostConfig | null {
  if (!raw) return null;
  const parsed = quotePostConfigSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

function parseSessionPostConfig(raw: unknown): SessionPostConfig | null {
  if (!raw) return null;
  const parsed = sessionPostConfigSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

function buildSanitizedSessionContent(params: {
  note: string | null;
  durationSeconds: number;
  pagesRead: number;
  showDuration: boolean;
  showPages: boolean;
}): string {
  if (params.note && params.note.trim().length > 0) {
    return params.note;
  }
  const parts: string[] = [];
  if (params.showDuration && params.durationSeconds > 0) {
    const minutes = Math.round(params.durationSeconds / 60);
    parts.push(
      minutes >= 1 ? `${minutes} menit` : `${params.durationSeconds} detik`,
    );
  }
  if (params.showPages && params.pagesRead > 0) {
    parts.push(`${params.pagesRead} halaman`);
  }
  if (parts.length > 0) {
    return `Menyelesaikan sesi membaca (${parts.join(" · ")}).`;
  }
  return "Menyelesaikan sesi membaca.";
}

function mapPublicQuoteRow(row: {
  id: string;
  selectedText: string;
  note: string | null;
  postCaption: string | null;
  postConfig: unknown;
  color: string;
  chapterNumber: number;
  pageNumber: number;
  createdAt: Date;
  postedAt: Date | null;
  author: PublicAuthorPreview;
  book: PublicBookPreview;
}): ExplorePostItemDto {
  const postConfig = parseQuotePostConfig(row.postConfig);
  return {
    id: row.id,
    type: "quote",
    content: row.selectedText,
    note: postConfig?.includeNote === true ? row.note : null,
    postCaption: row.postCaption,
    postConfig,
    chapterNumber: row.chapterNumber,
    pageNumber: row.pageNumber,
    createdAt: (row.postedAt || row.createdAt).toISOString(),
    author: row.author,
    book: row.book,
    color: row.color as HighlightColor,
  };
}

function mapPublicSessionRow(row: {
  id: string;
  title: string | null;
  note: string | null;
  pagesRead: number;
  wordsRead: number | null;
  durationSeconds: number;
  avgWpm: number;
  startProgressPercent: number | null;
  endProgressPercent: number | null;
  startChapterNumber: number | null;
  endChapterNumber: number | null;
  highlightsCount: number;
  postConfig: unknown;
  createdAt: Date;
  postedAt: Date | null;
  author: PublicAuthorPreview;
  book: PublicBookPreview;
}): ExplorePostItemDto {
  const postConfig = parseSessionPostConfig(row.postConfig);
  const showWpm = postConfig?.showWpm !== false;
  const showDuration = postConfig?.showDuration !== false;
  const showPages = postConfig?.showPages !== false;

  const base: ExplorePostItemDto = {
    id: row.id,
    type: "session",
    title: row.title,
    content: buildSanitizedSessionContent({
      note: row.note,
      durationSeconds: row.durationSeconds,
      pagesRead: row.pagesRead,
      showDuration,
      showPages,
    }),
    note: row.note,
    createdAt: (row.postedAt || row.createdAt).toISOString(),
    author: row.author,
    book: row.book,
    avgWpm: showWpm ? row.avgWpm : null,
    wordsRead: showPages ? row.wordsRead : null,
    startProgressPercent: row.startProgressPercent,
    endProgressPercent: row.endProgressPercent,
    startChapterNumber: row.startChapterNumber,
    endChapterNumber: row.endChapterNumber,
    highlightsCount: row.highlightsCount,
    postConfig,
  };

  if (showDuration) {
    base.durationSeconds = row.durationSeconds;
  }
  if (showPages) {
    base.pagesRead = row.pagesRead;
  }
  return base;
}

function calculateStreak(sessions: { createdAt: Date }[]): number {
  if (!sessions.length) return 0;
  const activeDays = new Set(
    sessions.map(({ createdAt }) => Date.parse(readingDay.format(createdAt))),
  );
  let streakDay = Date.parse(readingDay.format(new Date()));
  if (!activeDays.has(streakDay)) streakDay -= dayMs;
  let currentStreakDays = 0;
  while (activeDays.has(streakDay)) {
    currentStreakDays++;
    streakDay -= dayMs;
  }
  return currentStreakDays;
}

export async function generateUniqueUsername(
  name: string,
  excludeUserId?: string,
): Promise<string> {
  let base = (name || "nakama")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 24);
  if (!base || base.length < 3) base = "nakama";

  let candidate = base;
  let suffix = 1;
  while (true) {
    const [existing] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.username, candidate))
      .limit(1);
    if (!existing || (excludeUserId && existing.id === excludeUserId)) break;
    candidate = `${base}${suffix}`;
    suffix++;
  }
  return candidate;
}

export async function getSocialProfile(
  targetUserIdOrUsername: string,
  currentUserId?: string,
): Promise<SocialProfileDto> {
  const cleanHandle = targetUserIdOrUsername
    .replace(/^@/, "")
    .trim()
    .toLowerCase();

  let [targetUser] = await db
    .select()
    .from(user)
    .where(
      or(
        eq(user.username, cleanHandle),
        eq(user.username, targetUserIdOrUsername),
        eq(user.id, targetUserIdOrUsername),
      ),
    )
    .limit(1);

  if (!targetUser) {
    throw new HttpError(404, "USER_NOT_FOUND", "Pengguna tidak ditemukan.");
  }

  // Auto-generate unique username for legacy users without a handle
  if (!targetUser.username) {
    const generatedUsername = await generateUniqueUsername(
      targetUser.name,
      targetUser.id,
    );
    await db
      .update(user)
      .set({ username: generatedUsername })
      .where(eq(user.id, targetUser.id));
    targetUser = { ...targetUser, username: generatedUsername };
  }

  // Count followers
  const [followerCountRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(userFollows)
    .where(eq(userFollows.followingUserId, targetUser.id));

  // Count following
  const [followingCountRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(userFollows)
    .where(eq(userFollows.followerUserId, targetUser.id));

  // Count books published
  const [booksPublishedRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(books)
    .where(eq(books.authorUserId, targetUser.id));

  // Total reading minutes
  const [readingDurationRow] = await db
    .select({
      totalSeconds: sql<number>`coalesce(sum(${readingSessions.durationSeconds}), 0)`,
    })
    .from(readingSessions)
    .where(eq(readingSessions.userId, targetUser.id));

  const totalReadingMinutes = Math.round(
    Number(readingDurationRow?.totalSeconds || 0) / 60,
  );

  let isFollowing = false;
  let isSubscribedUpdates = false;

  if (currentUserId && currentUserId !== targetUser.id) {
    const [follow] = await db
      .select({
        id: userFollows.id,
        isSubscribedUpdates: userFollows.isSubscribedUpdates,
      })
      .from(userFollows)
      .where(
        and(
          eq(userFollows.followerUserId, currentUserId),
          eq(userFollows.followingUserId, targetUser.id),
        ),
      )
      .limit(1);

    if (follow) {
      isFollowing = true;
      isSubscribedUpdates = follow.isSubscribedUpdates;
    }
  }

  const isSelf = currentUserId === targetUser.id;

  // Check publisher membership & managed publishers
  const managedPubRows = await db
    .select({
      id: publishers.id,
      name: publishers.name,
      slug: publishers.slug,
      logoUrl: publishers.logoUrl,
      headerImageUrl: publishers.headerImageUrl,
      city: publishers.city,
      verificationStatus: publishers.verificationStatus,
      rejectionReason: publishers.rejectionReason,
      role: publisherMembers.role,
    })
    .from(publisherMembers)
    .innerJoin(publishers, eq(publisherMembers.publisherId, publishers.id))
    .where(eq(publisherMembers.userId, targetUser.id));

  const visiblePubRows = isSelf
    ? managedPubRows
    : managedPubRows.filter((p) => p.verificationStatus === "verified");

  const managedPublishers: ManagedPublisherSummaryDto[] = visiblePubRows.map(
    (p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      logoUrl: p.logoUrl,
      headerImageUrl: p.headerImageUrl,
      city: p.city,
      verificationStatus: p.verificationStatus,
      rejectionReason: isSelf ? p.rejectionReason : null,
      role: p.role,
    }),
  );

  const pubMember = visiblePubRows[0] || null;

  // Check community membership & managed communities
  const managedCommunityRows = await db
    .select({
      id: communityCalendars.id,
      name: communityCalendars.name,
      slug: communityCalendars.slug,
      avatarUrl: communityCalendars.avatarUrl,
      coverUrl: communityCalendars.coverUrl,
      city: communityCalendars.city,
      verificationStatus: communityCalendars.verificationStatus,
      rejectionReason: communityCalendars.rejectionReason,
      role: communityCalendarMembers.role,
    })
    .from(communityCalendars)
    .innerJoin(
      communityCalendarMembers,
      eq(communityCalendars.id, communityCalendarMembers.calendarId),
    )
    .where(eq(communityCalendarMembers.userId, targetUser.id));

  const visibleCommunityRows = isSelf
    ? managedCommunityRows
    : managedCommunityRows.filter(
        (c) =>
          c.verificationStatus === "verified" ||
          c.verificationStatus === "trusted",
      );

  const managedCommunities: ManagedCommunitySummaryDto[] =
    visibleCommunityRows.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      avatarUrl: c.avatarUrl,
      coverUrl: c.coverUrl,
      city: c.city,
      verificationStatus:
        c.verificationStatus as ManagedCommunitySummaryDto["verificationStatus"],
      rejectionReason: isSelf ? c.rejectionReason : null,
      role: c.role as ManagedCommunitySummaryDto["role"],
    }));

  const ownedCommunity =
    visibleCommunityRows.find((c) => c.role === "owner") ||
    visibleCommunityRows[0] ||
    null;

  // Get author's published books
  let publishedBooks: BookSummaryDto[] = [];
  if (
    targetUser.authorStatus === "verified" ||
    Number(booksPublishedRow?.count || 0) > 0
  ) {
    const bookRows = await db
      .select()
      .from(books)
      .where(eq(books.authorUserId, targetUser.id))
      .orderBy(desc(books.publishedYear));
    publishedBooks = bookRows.map(toBookSummary);
  }

  // Public reading shelves belonging to target user (not viewer)
  const shelfRows = await db
    .select({ shelf: userShelves, book: books })
    .from(userShelves)
    .innerJoin(books, eq(userShelves.bookId, books.id))
    .where(
      and(
        eq(userShelves.userId, targetUser.id),
        or(
          eq(userShelves.shelfStatus, "reading"),
          eq(userShelves.shelfStatus, "finished"),
        ),
      ),
    )
    .orderBy(desc(userShelves.updatedAt))
    .limit(60);

  const publicShelves: ShelfItemDto[] = shelfRows.map(({ shelf, book }) => ({
    id: shelf.id,
    bookId: shelf.bookId,
    book: toBookSummary(book),
    shelfStatus: shelf.shelfStatus as ShelfItemDto["shelfStatus"],
    favorite: shelf.favorite,
    progressPercent: shelf.progressPercent,
    updatedAt: shelf.updatedAt.toISOString(),
  }));

  // Public reviews by target user
  const reviewRows = await db
    .select({ review: bookReviews, book: books })
    .from(bookReviews)
    .innerJoin(books, eq(bookReviews.bookId, books.id))
    .where(eq(bookReviews.userId, targetUser.id))
    .orderBy(desc(bookReviews.createdAt))
    .limit(30);

  const publicReviews: PublicProfileReviewDto[] = reviewRows.map(
    ({ review, book }) => ({
      id: review.id,
      rating: review.ratingHalfSteps / 2,
      content: review.content,
      createdAt: review.createdAt.toISOString(),
      book: toBookSummary(book),
    }),
  );

  // Public quotes posted by target user
  const quoteRows = await db
    .select({ quote: bookHighlights, book: books })
    .from(bookHighlights)
    .innerJoin(books, eq(bookHighlights.bookId, books.id))
    .where(
      and(
        eq(bookHighlights.userId, targetUser.id),
        eq(bookHighlights.isPosted, true),
      ),
    )
    .orderBy(desc(bookHighlights.createdAt))
    .limit(30);

  // Public reading sessions posted by target user
  const sessionRows = await db
    .select({ session: readingSessions, book: books })
    .from(readingSessions)
    .innerJoin(books, eq(readingSessions.bookId, books.id))
    .where(
      and(
        eq(readingSessions.userId, targetUser.id),
        eq(readingSessions.isPosted, true),
      ),
    )
    .orderBy(desc(readingSessions.createdAt))
    .limit(30);

  const authorPreview = {
    id: targetUser.id,
    name: targetUser.name,
    username: targetUser.username,
    image: targetUser.image,
  };

  const publicActivities: ExplorePostItemDto[] = [
    ...reviewRows.map(({ review, book }) => ({
      id: review.id,
      type: "review" as const,
      content: review.content,
      createdAt: review.createdAt.toISOString(),
      author: authorPreview,
      book: {
        id: book.id,
        slug: book.slug,
        title: book.title,
        author: book.author,
        coverColor: book.coverColor,
        coverUrl: book.coverUrl,
      },
      rating: review.ratingHalfSteps / 2,
    })),
    ...quoteRows.map(({ quote, book }) =>
      mapPublicQuoteRow({
        id: quote.id,
        selectedText: quote.selectedText,
        note: quote.note,
        postCaption: quote.postCaption,
        postConfig: quote.postConfig,
        color: quote.color,
        chapterNumber: quote.chapterNumber,
        pageNumber: quote.pageNumber,
        createdAt: quote.createdAt,
        postedAt: quote.postedAt,
        author: authorPreview,
        book: {
          id: book.id,
          slug: book.slug,
          title: book.title,
          author: book.author,
          coverColor: book.coverColor,
          coverUrl: book.coverUrl,
        },
      }),
    ),
    ...sessionRows.map(({ session, book }) =>
      mapPublicSessionRow({
        id: session.id,
        title: session.title,
        note: session.note,
        pagesRead: session.pagesRead,
        wordsRead: session.wordsRead,
        durationSeconds: session.durationSeconds,
        avgWpm: session.avgWpm,
        startProgressPercent: session.startProgressPercent,
        endProgressPercent: session.endProgressPercent,
        startChapterNumber: session.startChapterNumber,
        endChapterNumber: session.endChapterNumber,
        highlightsCount: session.highlightsCount,
        postConfig: session.postConfig,
        createdAt: session.createdAt,
        postedAt: session.postedAt,
        author: authorPreview,
        book: {
          id: book.id,
          slug: book.slug,
          title: book.title,
          author: book.author,
          coverColor: book.coverColor,
          coverUrl: book.coverUrl,
        },
      }),
    ),
  ];

  publicActivities.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const booksCompletedCount = publicShelves.filter(
    (item) => item.shelfStatus === "finished",
  ).length;

  return {
    id: targetUser.id,
    name: targetUser.name,
    username: targetUser.username,
    image: targetUser.image,
    headerImage: targetUser.socialLinks?.headerImage ?? null,
    bio: targetUser.bio ?? "",
    locationCity: targetUser.locationCity,
    socialLinks: targetUser.socialLinks ?? null,
    authorStatus: targetUser.authorStatus,
    authorPenName: targetUser.authorPenName,
    followersCount: Number(followerCountRow?.count || 0),
    followingCount: Number(followingCountRow?.count || 0),
    isFollowing,
    isSubscribedUpdates,
    booksPublishedCount: Number(booksPublishedRow?.count || 0),
    totalReadingMinutes,
    isPublisher: !!pubMember,
    publisherSlug: pubMember?.slug ?? null,
    publisherName: pubMember?.name ?? null,
    isCommunityOwner: !!ownedCommunity,
    ownedCommunitySlug: ownedCommunity?.slug ?? null,
    ownedCommunityName: ownedCommunity?.name ?? null,
    managedCommunities,
    managedPublishers,
    publishedBooks,
    publicShelves,
    publicReviews,
    publicActivities,
    booksCompletedCount,
    createdAt: targetUser.createdAt.toISOString(),
  };
}

export async function updateMySocialProfile(
  userId: string,
  input: UpdateProfileBioInput,
): Promise<SocialProfileDto> {
  const [existingUser] = await db
    .select()
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!existingUser) {
    throw new HttpError(404, "USER_NOT_FOUND", "Pengguna tidak ditemukan.");
  }

  const updateData: Partial<typeof user.$inferInsert> = {};

  if (input.name !== undefined) {
    const trimmedName = input.name.trim();
    if (trimmedName) {
      updateData.name = trimmedName;
      if (existingUser.authorStatus !== "none") {
        updateData.authorPenName = trimmedName;
      }
    }
  }

  if (input.authorPenName !== undefined) {
    updateData.authorPenName = input.authorPenName?.trim() || null;
  }

  if (input.username !== undefined) {
    const cleanUsername = input.username
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "");
    if (cleanUsername && cleanUsername !== existingUser.username) {
      const [collision] = await db
        .select({ id: user.id })
        .from(user)
        .where(
          and(eq(user.username, cleanUsername), sql`${user.id} != ${userId}`),
        )
        .limit(1);
      if (collision) {
        throw new HttpError(
          409,
          "USERNAME_TAKEN",
          `Username @${cleanUsername} sudah digunakan. Silakan pilih handle lain.`,
        );
      }
      updateData.username = cleanUsername;
    }
  }

  if (input.image !== undefined) {
    updateData.image = input.image?.trim() || null;
  }

  if (input.bio !== undefined) updateData.bio = input.bio;
  if (input.locationCity !== undefined)
    updateData.locationCity = input.locationCity;

  if (input.socialLinks !== undefined || input.headerImage !== undefined) {
    const currentSocial = existingUser.socialLinks || {};
    const mergedSocial = {
      ...currentSocial,
      ...(input.socialLinks || {}),
    };
    if (input.headerImage !== undefined) {
      mergedSocial.headerImage = input.headerImage?.trim() || undefined;
    }
    updateData.socialLinks = mergedSocial;
  }

  if (Object.keys(updateData).length > 0) {
    await db.update(user).set(updateData).where(eq(user.id, userId));
  }

  return getSocialProfile(userId, userId);
}

export async function followUser(
  followerUserId: string,
  targetUserId: string,
  isSubscribedUpdates = true,
): Promise<{ success: boolean; isFollowing: boolean }> {
  if (followerUserId === targetUserId) {
    throw new HttpError(
      400,
      "CANNOT_FOLLOW_SELF",
      "Tidak dapat mengikuti diri sendiri.",
    );
  }

  const [targetUser] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.id, targetUserId))
    .limit(1);

  if (!targetUser) {
    throw new HttpError(404, "USER_NOT_FOUND", "Pengguna tidak ditemukan.");
  }

  await db
    .insert(userFollows)
    .values({
      followerUserId,
      followingUserId: targetUserId,
      isSubscribedUpdates,
    })
    .onConflictDoUpdate({
      target: [userFollows.followerUserId, userFollows.followingUserId],
      set: {
        isSubscribedUpdates,
        updatedAt: new Date(),
      },
    });

  return { success: true, isFollowing: true };
}

export async function unfollowUser(
  followerUserId: string,
  targetUserId: string,
): Promise<{ success: boolean; isFollowing: boolean }> {
  await db
    .delete(userFollows)
    .where(
      and(
        eq(userFollows.followerUserId, followerUserId),
        eq(userFollows.followingUserId, targetUserId),
      ),
    );

  return { success: true, isFollowing: false };
}

export async function applyOfficialAuthor(
  userId: string,
  input: ApplyAuthorInput,
) {
  const [existingUser] = await db
    .select({ authorStatus: user.authorStatus })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (existingUser?.authorStatus === "verified") {
    throw new HttpError(
      400,
      "AUTHOR_APPLICATION_ALREADY_EXISTS",
      "Akun Anda sudah berstatus sebagai Penulis Resmi.",
    );
  }

  const [pendingApp] = await db
    .select({ id: authorApplications.id })
    .from(authorApplications)
    .where(
      and(
        eq(authorApplications.userId, userId),
        eq(authorApplications.status, "pending"),
      ),
    )
    .limit(1);

  if (pendingApp) {
    throw new HttpError(
      400,
      "AUTHOR_APPLICATION_ALREADY_EXISTS",
      "Pengajuan penulis Anda sedang diproses atau sudah diverifikasi.",
    );
  }

  const result = await db.transaction(async (tx) => {
    const [insertedApp] = await tx
      .insert(authorApplications)
      .values({
        userId,
        penName: input.penName,
        bio: input.bio,
        portfolioUrl: input.portfolioUrl || null,
        claimedBookId: input.claimedBookId || null,
        status: "pending",
      })
      .returning();

    await tx
      .update(user)
      .set({
        authorStatus: "pending",
        name: input.penName,
        authorPenName: input.penName,
      })
      .where(eq(user.id, userId));

    return insertedApp;
  });

  return {
    id: result.id,
    userId: result.userId,
    penName: result.penName,
    bio: result.bio,
    portfolioUrl: result.portfolioUrl,
    claimedBookId: result.claimedBookId,
    status: result.status,
    createdAt: result.createdAt.toISOString(),
  };
}

function nonAdminUserCondition() {
  return sql`(${user.role} is null or (',' || replace(${user.role}, ' ', '') || ',') not like '%,admin,%')`;
}

export async function exploreAuthors(
  currentUserId?: string,
  query?: string,
): Promise<AuthorDirectoryItemDto[]> {
  const authorsQuery = db
    .select({
      id: user.id,
      name: user.name,
      username: user.username,
      image: user.image,
      bio: user.bio,
      locationCity: user.locationCity,
      authorStatus: user.authorStatus,
      authorPenName: user.authorPenName,
    })
    .from(user)
    .where(
      and(
        nonAdminUserCondition(),
        or(
          eq(user.authorStatus, "verified"),
          sql`exists (select 1 from ${books} where ${books.authorUserId} = ${user.id})`,
        ),
      ),
    )
    .orderBy(desc(user.createdAt))
    .limit(50);

  const authorRows = await authorsQuery;

  const filteredAuthors = query?.trim()
    ? authorRows.filter(
        (a) =>
          a.name.toLowerCase().includes(query.toLowerCase()) ||
          (a.authorPenName &&
            a.authorPenName.toLowerCase().includes(query.toLowerCase())) ||
          (a.username &&
            a.username.toLowerCase().includes(query.toLowerCase())),
      )
    : authorRows;

  const results: AuthorDirectoryItemDto[] = [];

  for (const a of filteredAuthors) {
    const [booksCountRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(books)
      .where(eq(books.authorUserId, a.id));

    const [followerCountRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(userFollows)
      .where(eq(userFollows.followingUserId, a.id));

    let isFollowing = false;
    if (currentUserId && currentUserId !== a.id) {
      const [follow] = await db
        .select({ id: userFollows.id })
        .from(userFollows)
        .where(
          and(
            eq(userFollows.followerUserId, currentUserId),
            eq(userFollows.followingUserId, a.id),
          ),
        )
        .limit(1);
      isFollowing = !!follow;
    }

    results.push({
      id: a.id,
      name: a.name,
      penName: a.authorPenName || a.name,
      username: a.username,
      image: a.image,
      bio: a.bio,
      locationCity: a.locationCity,
      authorStatus: a.authorStatus,
      bookCount: Number(booksCountRow?.count || 0),
      followerCount: Number(followerCountRow?.count || 0),
      isFollowing,
    });
  }

  return results;
}

export async function exploreReaders(
  currentUserId?: string,
  query?: string,
): Promise<ReaderDirectoryItemDto[]> {
  const usersQuery = db
    .select({
      id: user.id,
      name: user.name,
      username: user.username,
      image: user.image,
      bio: user.bio,
      locationCity: user.locationCity,
    })
    .from(user)
    .where(nonAdminUserCondition())
    .orderBy(desc(user.createdAt))
    .limit(50);

  const userRows = await usersQuery;

  const filteredUsers = query?.trim()
    ? userRows.filter(
        (u) =>
          u.name.toLowerCase().includes(query.toLowerCase()) ||
          (u.username &&
            u.username.toLowerCase().includes(query.toLowerCase())),
      )
    : userRows;

  const results: ReaderDirectoryItemDto[] = [];

  for (const u of filteredUsers) {
    const [finishedShelves] = await db
      .select({ count: sql<number>`count(*)` })
      .from(userShelves)
      .where(
        and(
          eq(userShelves.userId, u.id),
          eq(userShelves.shelfStatus, "finished"),
        ),
      );

    const [followerCountRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(userFollows)
      .where(eq(userFollows.followingUserId, u.id));

    const sessions = await db
      .select({ createdAt: readingSessions.createdAt })
      .from(readingSessions)
      .where(eq(readingSessions.userId, u.id))
      .orderBy(desc(readingSessions.createdAt));

    const streakDays = calculateStreak(sessions);

    let isFollowing = false;
    if (currentUserId && currentUserId !== u.id) {
      const [follow] = await db
        .select({ id: userFollows.id })
        .from(userFollows)
        .where(
          and(
            eq(userFollows.followerUserId, currentUserId),
            eq(userFollows.followingUserId, u.id),
          ),
        )
        .limit(1);
      isFollowing = !!follow;
    }

    results.push({
      id: u.id,
      name: u.name,
      username: u.username,
      image: u.image,
      bio: u.bio,
      locationCity: u.locationCity,
      booksReadCount: Number(finishedShelves?.count || 0),
      streakDays,
      followerCount: Number(followerCountRow?.count || 0),
      isFollowing,
    });
  }

  return results;
}

export async function getUserFollowers(
  usernameOrId: string,
  currentUserId?: string,
): Promise<SocialRelationItemDto[]> {
  const profile = await getSocialProfile(usernameOrId, currentUserId);
  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      username: user.username,
      image: user.image,
      bio: user.bio,
      authorStatus: user.authorStatus,
    })
    .from(userFollows)
    .innerJoin(user, eq(userFollows.followerUserId, user.id))
    .where(eq(userFollows.followingUserId, profile.id))
    .orderBy(desc(userFollows.createdAt))
    .limit(50);

  const results: SocialRelationItemDto[] = [];
  for (const r of rows) {
    let isFollowing = false;
    if (currentUserId && currentUserId !== r.id) {
      const [f] = await db
        .select({ id: userFollows.id })
        .from(userFollows)
        .where(
          and(
            eq(userFollows.followerUserId, currentUserId),
            eq(userFollows.followingUserId, r.id),
          ),
        )
        .limit(1);
      isFollowing = !!f;
    }

    results.push({
      id: r.id,
      name: r.name,
      username: r.username,
      image: r.image,
      bio: r.bio,
      role: r.authorStatus === "verified" ? "Penulis Resmi" : "Pembaca",
      type: r.authorStatus === "verified" ? "author" : "user",
      href: `/u/@${r.username || r.id}`,
      isFollowing,
    });
  }
  return results;
}

export async function getUserFollowing(
  usernameOrId: string,
  currentUserId?: string,
): Promise<SocialRelationItemDto[]> {
  const profile = await getSocialProfile(usernameOrId, currentUserId);
  const results: SocialRelationItemDto[] = [];

  // 1. Followed users
  const userRows = await db
    .select({
      id: user.id,
      name: user.name,
      username: user.username,
      image: user.image,
      bio: user.bio,
      authorStatus: user.authorStatus,
    })
    .from(userFollows)
    .innerJoin(user, eq(userFollows.followingUserId, user.id))
    .where(eq(userFollows.followerUserId, profile.id))
    .orderBy(desc(userFollows.createdAt))
    .limit(50);

  for (const r of userRows) {
    let isFollowing = true;
    if (currentUserId && currentUserId !== r.id) {
      const [f] = await db
        .select({ id: userFollows.id })
        .from(userFollows)
        .where(
          and(
            eq(userFollows.followerUserId, currentUserId),
            eq(userFollows.followingUserId, r.id),
          ),
        )
        .limit(1);
      isFollowing = !!f;
    }

    results.push({
      id: r.id,
      name: r.name,
      username: r.username,
      image: r.image,
      bio: r.bio,
      role: r.authorStatus === "verified" ? "Penulis Resmi" : "Pembaca",
      type: r.authorStatus === "verified" ? "author" : "user",
      href: `/u/@${r.username || r.id}`,
      isFollowing,
    });
  }

  // 2. Followed communities (from communityCalendarFollowers)
  const commRows = await db
    .select({
      id: communityCalendars.id,
      name: communityCalendars.name,
      slug: communityCalendars.slug,
      avatarUrl: communityCalendars.avatarUrl,
      description: communityCalendars.description,
      city: communityCalendars.city,
    })
    .from(communityCalendarFollowers)
    .innerJoin(
      communityCalendars,
      eq(communityCalendarFollowers.calendarId, communityCalendars.id),
    )
    .where(eq(communityCalendarFollowers.userId, profile.id))
    .orderBy(desc(communityCalendarFollowers.createdAt))
    .limit(50);

  for (const c of commRows) {
    let isFollowing = true;
    if (currentUserId) {
      const [f] = await db
        .select({ id: communityCalendarFollowers.id })
        .from(communityCalendarFollowers)
        .where(
          and(
            eq(communityCalendarFollowers.calendarId, c.id),
            eq(communityCalendarFollowers.userId, currentUserId),
          ),
        )
        .limit(1);
      isFollowing = !!f;
    }

    results.push({
      id: c.id,
      name: c.name,
      username: c.slug,
      image: c.avatarUrl,
      bio:
        c.description ||
        (c.city ? `Komunitas Literasi ${c.city}` : "Komunitas Literasi"),
      role: "Komunitas Literasi",
      type: "community",
      href: `/c/${c.slug}`,
      isFollowing,
    });
  }

  return results;
}

export async function unifiedExplore(
  currentUserId?: string,
  params: {
    q?: string;
    category?: string;
    sort?: "top" | "latest";
  } = {},
): Promise<UnifiedExploreResultDto> {
  const rawQ = params.q?.trim() || "";
  const cleanQ = rawQ.replace(/^@/, "").trim();
  const searchPattern = cleanQ ? `%${cleanQ}%` : null;
  const categoryPattern = params.category?.trim()
    ? `%${params.category.trim()}%`
    : null;

  // 1. Users
  let userCondition = nonAdminUserCondition();
  if (searchPattern) {
    userCondition = and(
      nonAdminUserCondition(),
      or(
        ilike(user.name, searchPattern),
        ilike(user.username, searchPattern),
        ilike(user.bio, searchPattern),
      ),
    )!;
  }

  const userRows = await db
    .select({
      id: user.id,
      name: user.name,
      username: user.username,
      image: user.image,
      bio: user.bio,
      locationCity: user.locationCity,
      authorStatus: user.authorStatus,
      authorPenName: user.authorPenName,
    })
    .from(user)
    .where(userCondition)
    .orderBy(desc(user.createdAt))
    .limit(20);

  const userIds = userRows.map((u) => u.id);
  const followedSet = new Set<string>();
  if (currentUserId && userIds.length > 0) {
    const follows = await db
      .select({ followingUserId: userFollows.followingUserId })
      .from(userFollows)
      .where(
        and(
          eq(userFollows.followerUserId, currentUserId),
          sql`${userFollows.followingUserId} in ${userIds}`,
        ),
      );
    for (const f of follows) {
      followedSet.add(f.followingUserId);
    }
  }

  const users: ExploreUserItemDto[] = [];
  for (const u of userRows) {
    const [followerCountRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(userFollows)
      .where(eq(userFollows.followingUserId, u.id));

    const [booksCountRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(books)
      .where(eq(books.authorUserId, u.id));

    const [readCountRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(userShelves)
      .where(
        and(
          eq(userShelves.userId, u.id),
          eq(userShelves.shelfStatus, "finished"),
        ),
      );

    users.push({
      id: u.id,
      name: u.name,
      username: u.username,
      image: u.image,
      bio: u.bio,
      locationCity: u.locationCity,
      authorStatus: u.authorStatus,
      authorPenName: u.authorPenName,
      followerCount: Number(followerCountRow?.count || 0),
      bookCount: Number(booksCountRow?.count || 0),
      booksReadCount: Number(readCountRow?.count || 0),
      streakDays: 0,
      isFollowing: currentUserId ? followedSet.has(u.id) : false,
    });
  }

  // 2. Books
  const bookConditions = [];
  if (searchPattern) {
    bookConditions.push(
      or(
        ilike(books.title, searchPattern),
        ilike(books.author, searchPattern),
        ilike(books.synopsis, searchPattern),
      )!,
    );
  }
  if (categoryPattern) {
    bookConditions.push(
      sql`(exists (
        select 1 from jsonb_array_elements_text(${books.categories}) as cat where cat ilike ${categoryPattern}
      ) or exists (
        select 1 from jsonb_array_elements_text(${books.genres}) as g where g ilike ${categoryPattern}
      ))`,
    );
  }

  const bookRows = await db
    .select()
    .from(books)
    .where(bookConditions.length > 0 ? and(...bookConditions) : undefined)
    .orderBy(
      params.sort === "latest"
        ? desc(books.publishedYear)
        : desc(books.ratingAvg),
    )
    .limit(20);

  const booksList = bookRows.map(toBookSummary);

  // 3. Communities
  const commConditions = [
    sql`${communityCalendars.verificationStatus} in ('verified', 'trusted')`,
  ];
  if (searchPattern) {
    commConditions.push(
      or(
        ilike(communityCalendars.name, searchPattern),
        ilike(communityCalendars.city, searchPattern),
        ilike(communityCalendars.description, searchPattern),
      )!,
    );
  }
  const commRows = await db
    .select({
      id: communityCalendars.id,
      name: communityCalendars.name,
      slug: communityCalendars.slug,
      avatarUrl: communityCalendars.avatarUrl,
      coverUrl: communityCalendars.coverUrl,
      city: communityCalendars.city,
      verificationStatus: communityCalendars.verificationStatus,
    })
    .from(communityCalendars)
    .where(and(...commConditions))
    .limit(10);

  const communities: ManagedCommunitySummaryDto[] = commRows.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    avatarUrl: c.avatarUrl,
    coverUrl: c.coverUrl,
    city: c.city,
    verificationStatus:
      c.verificationStatus as ManagedCommunitySummaryDto["verificationStatus"],
    role: "member",
  }));

  // 4. Publishers
  const pubConditions = [eq(publishers.verificationStatus, "verified")];
  if (searchPattern) {
    pubConditions.push(
      or(
        ilike(publishers.name, searchPattern),
        ilike(publishers.city, searchPattern),
        ilike(publishers.description, searchPattern),
      )!,
    );
  }
  const pubRows = await db
    .select({
      id: publishers.id,
      name: publishers.name,
      slug: publishers.slug,
      logoUrl: publishers.logoUrl,
      headerImageUrl: publishers.headerImageUrl,
      city: publishers.city,
      verificationStatus: publishers.verificationStatus,
    })
    .from(publishers)
    .where(and(...pubConditions))
    .limit(10);

  const publishersList: ManagedPublisherSummaryDto[] = pubRows.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    logoUrl: p.logoUrl,
    headerImageUrl: p.headerImageUrl,
    city: p.city,
    verificationStatus: p.verificationStatus,
    role: "editor",
  }));

  // 5. Posts (Reviews, Posted Quotes & Posted Sessions)
  const reviewConditions = [];
  if (searchPattern) {
    reviewConditions.push(
      or(
        ilike(bookReviews.content, searchPattern),
        ilike(books.title, searchPattern),
        ilike(books.author, searchPattern),
      )!,
    );
  }
  const reviewRows = await db
    .select({
      id: bookReviews.id,
      content: bookReviews.content,
      ratingHalfSteps: bookReviews.ratingHalfSteps,
      createdAt: bookReviews.createdAt,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        image: user.image,
      },
      book: {
        id: books.id,
        slug: books.slug,
        title: books.title,
        author: books.author,
        coverColor: books.coverColor,
        coverUrl: books.coverUrl,
      },
    })
    .from(bookReviews)
    .innerJoin(user, eq(bookReviews.userId, user.id))
    .innerJoin(books, eq(bookReviews.bookId, books.id))
    .where(reviewConditions.length > 0 ? and(...reviewConditions) : undefined)
    .orderBy(desc(bookReviews.createdAt))
    .limit(15);

  // Only public posted highlights
  const quoteConditions = [eq(bookHighlights.isPosted, true)];
  if (searchPattern) {
    quoteConditions.push(
      or(
        ilike(bookHighlights.selectedText, searchPattern),
        ilike(bookHighlights.postCaption, searchPattern),
        and(
          sql`coalesce((${bookHighlights.postConfig} ->> 'includeNote')::boolean, false) = true`,
          ilike(bookHighlights.note, searchPattern),
        ),
        ilike(books.title, searchPattern),
        ilike(books.author, searchPattern),
      )!,
    );
  }
  const quoteRows = await db
    .select({
      id: bookHighlights.id,
      selectedText: bookHighlights.selectedText,
      note: bookHighlights.note,
      postCaption: bookHighlights.postCaption,
      postConfig: bookHighlights.postConfig,
      color: bookHighlights.color,
      chapterNumber: bookHighlights.chapterNumber,
      pageNumber: bookHighlights.pageNumber,
      createdAt: bookHighlights.createdAt,
      postedAt: bookHighlights.postedAt,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        image: user.image,
      },
      book: {
        id: books.id,
        slug: books.slug,
        title: books.title,
        author: books.author,
        coverColor: books.coverColor,
        coverUrl: books.coverUrl,
      },
    })
    .from(bookHighlights)
    .innerJoin(user, eq(bookHighlights.userId, user.id))
    .innerJoin(books, eq(bookHighlights.bookId, books.id))
    .where(and(...quoteConditions))
    .orderBy(desc(bookHighlights.createdAt))
    .limit(15);

  // Only public posted reading sessions
  const sessionConditions = [eq(readingSessions.isPosted, true)];
  if (searchPattern) {
    sessionConditions.push(
      or(
        ilike(readingSessions.title, searchPattern),
        ilike(readingSessions.note, searchPattern),
        ilike(books.title, searchPattern),
        ilike(books.author, searchPattern),
      )!,
    );
  }
  const sessionRows = await db
    .select({
      id: readingSessions.id,
      title: readingSessions.title,
      note: readingSessions.note,
      pagesRead: readingSessions.pagesRead,
      wordsRead: readingSessions.wordsRead,
      durationSeconds: readingSessions.durationSeconds,
      avgWpm: readingSessions.avgWpm,
      startProgressPercent: readingSessions.startProgressPercent,
      endProgressPercent: readingSessions.endProgressPercent,
      startChapterNumber: readingSessions.startChapterNumber,
      endChapterNumber: readingSessions.endChapterNumber,
      highlightsCount: readingSessions.highlightsCount,
      postConfig: readingSessions.postConfig,
      createdAt: readingSessions.createdAt,
      postedAt: readingSessions.postedAt,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        image: user.image,
      },
      book: {
        id: books.id,
        slug: books.slug,
        title: books.title,
        author: books.author,
        coverColor: books.coverColor,
        coverUrl: books.coverUrl,
      },
    })
    .from(readingSessions)
    .innerJoin(user, eq(readingSessions.userId, user.id))
    .innerJoin(books, eq(readingSessions.bookId, books.id))
    .where(and(...sessionConditions))
    .orderBy(desc(readingSessions.createdAt))
    .limit(15);

  const posts: ExplorePostItemDto[] = [
    ...reviewRows.map((r) => ({
      id: r.id,
      type: "review" as const,
      content: r.content,
      createdAt: r.createdAt.toISOString(),
      author: r.user,
      book: r.book,
      rating: r.ratingHalfSteps / 2,
    })),
    ...quoteRows.map((q) =>
      mapPublicQuoteRow({
        id: q.id,
        selectedText: q.selectedText,
        note: q.note,
        postCaption: q.postCaption,
        postConfig: q.postConfig,
        color: q.color,
        chapterNumber: q.chapterNumber,
        pageNumber: q.pageNumber,
        createdAt: q.createdAt,
        postedAt: q.postedAt,
        author: q.user,
        book: q.book,
      }),
    ),
    ...sessionRows.map((s) =>
      mapPublicSessionRow({
        id: s.id,
        title: s.title,
        note: s.note,
        pagesRead: s.pagesRead,
        wordsRead: s.wordsRead,
        durationSeconds: s.durationSeconds,
        avgWpm: s.avgWpm,
        startProgressPercent: s.startProgressPercent,
        endProgressPercent: s.endProgressPercent,
        startChapterNumber: s.startChapterNumber,
        endChapterNumber: s.endChapterNumber,
        highlightsCount: s.highlightsCount,
        postConfig: s.postConfig,
        createdAt: s.createdAt,
        postedAt: s.postedAt,
        author: s.user,
        book: s.book,
      }),
    ),
  ];

  posts.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return {
    users,
    books: booksList,
    posts,
    communities,
    publishers: publishersList,
  };
}

const MAX_PUBLIC_QUOTE_CHARS = 400;

export async function togglePostHighlight(
  userId: string,
  highlightId: string,
  input: PublishHighlightPostInput = {},
): Promise<{
  id: string;
  isPosted: boolean;
  postCaption: string | null;
  postConfig: QuotePostConfig | null;
  postedAt: string | null;
}> {
  const [existing] = await db
    .select({
      id: bookHighlights.id,
      selectedText: bookHighlights.selectedText,
      isPosted: bookHighlights.isPosted,
      postCaption: bookHighlights.postCaption,
      postConfig: bookHighlights.postConfig,
      postedAt: bookHighlights.postedAt,
    })
    .from(bookHighlights)
    .where(
      and(
        eq(bookHighlights.id, highlightId),
        eq(bookHighlights.userId, userId),
      ),
    )
    .limit(1);

  if (!existing) {
    throw new HttpError(404, "HIGHLIGHT_NOT_FOUND", "Kutipan tidak ditemukan.");
  }

  const nextStatus =
    input.isPosted !== undefined ? input.isPosted : !existing.isPosted;

  // DRM-05 public excerpt cap
  if (
    nextStatus &&
    existing.selectedText.trim().length > MAX_PUBLIC_QUOTE_CHARS
  ) {
    throw new HttpError(
      422,
      "EXCERPT_TOO_LONG",
      `Kutipan yang dibagikan ke publik maksimal ${MAX_PUBLIC_QUOTE_CHARS} karakter sesuai ketentuan DRM-05.`,
    );
  }

  const nextCaption =
    input.postCaption !== undefined
      ? input.postCaption || null
      : existing.postCaption;
  const nextConfig =
    input.postConfig !== undefined ? input.postConfig : existing.postConfig;
  const postedAt = nextStatus ? (existing.postedAt ?? new Date()) : null;

  await db
    .update(bookHighlights)
    .set({
      isPosted: nextStatus,
      postCaption: nextCaption,
      postConfig: nextConfig,
      postedAt,
    })
    .where(eq(bookHighlights.id, highlightId));

  return {
    id: highlightId,
    isPosted: nextStatus,
    postCaption: nextCaption,
    postConfig: nextConfig ?? null,
    postedAt: postedAt ? postedAt.toISOString() : null,
  };
}

export async function togglePostSession(
  userId: string,
  sessionId: string,
  input: PublishSessionPostInput = {},
): Promise<{
  id: string;
  isPosted: boolean;
  title: string | null;
  note: string | null;
  postConfig: SessionPostConfig | null;
  postedAt: string | null;
}> {
  const [existing] = await db
    .select({
      id: readingSessions.id,
      isPosted: readingSessions.isPosted,
      title: readingSessions.title,
      note: readingSessions.note,
      postConfig: readingSessions.postConfig,
      postedAt: readingSessions.postedAt,
    })
    .from(readingSessions)
    .where(
      and(
        eq(readingSessions.id, sessionId),
        eq(readingSessions.userId, userId),
      ),
    )
    .limit(1);

  if (!existing) {
    throw new HttpError(
      404,
      "SESSION_NOT_FOUND",
      "Sesi membaca tidak ditemukan.",
    );
  }

  const nextStatus =
    input.isPosted !== undefined ? input.isPosted : !existing.isPosted;
  const nextTitle =
    input.title !== undefined ? input.title || null : existing.title;
  const nextNote =
    input.note !== undefined ? input.note || null : existing.note;
  const nextConfig =
    input.postConfig !== undefined ? input.postConfig : existing.postConfig;
  const postedAt = nextStatus ? (existing.postedAt ?? new Date()) : null;

  await db
    .update(readingSessions)
    .set({
      isPosted: nextStatus,
      title: nextTitle,
      note: nextNote,
      postConfig: nextConfig,
      postedAt,
    })
    .where(eq(readingSessions.id, sessionId));

  return {
    id: sessionId,
    isPosted: nextStatus,
    title: nextTitle,
    note: nextNote,
    postConfig: nextConfig ?? null,
    postedAt: postedAt ? postedAt.toISOString() : null,
  };
}

export async function getPublicSocialPost(
  type: PublicSocialPostType,
  id: string,
): Promise<ExplorePostItemDto> {
  if (type === "quote") {
    const [row] = await db
      .select({
        id: bookHighlights.id,
        selectedText: bookHighlights.selectedText,
        note: bookHighlights.note,
        postCaption: bookHighlights.postCaption,
        postConfig: bookHighlights.postConfig,
        color: bookHighlights.color,
        chapterNumber: bookHighlights.chapterNumber,
        pageNumber: bookHighlights.pageNumber,
        createdAt: bookHighlights.createdAt,
        postedAt: bookHighlights.postedAt,
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          image: user.image,
        },
        book: {
          id: books.id,
          slug: books.slug,
          title: books.title,
          author: books.author,
          coverColor: books.coverColor,
          coverUrl: books.coverUrl,
        },
      })
      .from(bookHighlights)
      .innerJoin(user, eq(bookHighlights.userId, user.id))
      .innerJoin(books, eq(bookHighlights.bookId, books.id))
      .where(and(eq(bookHighlights.id, id), eq(bookHighlights.isPosted, true)))
      .limit(1);

    if (!row) {
      throw new HttpError(
        404,
        "POST_NOT_FOUND",
        "Postingan tidak ditemukan atau bersifat privat.",
      );
    }

    return mapPublicQuoteRow({
      id: row.id,
      selectedText: row.selectedText,
      note: row.note,
      postCaption: row.postCaption,
      postConfig: row.postConfig,
      color: row.color,
      chapterNumber: row.chapterNumber,
      pageNumber: row.pageNumber,
      createdAt: row.createdAt,
      postedAt: row.postedAt,
      author: row.user,
      book: row.book,
    });
  }

  const [row] = await db
    .select({
      id: readingSessions.id,
      title: readingSessions.title,
      note: readingSessions.note,
      pagesRead: readingSessions.pagesRead,
      wordsRead: readingSessions.wordsRead,
      durationSeconds: readingSessions.durationSeconds,
      avgWpm: readingSessions.avgWpm,
      startProgressPercent: readingSessions.startProgressPercent,
      endProgressPercent: readingSessions.endProgressPercent,
      startChapterNumber: readingSessions.startChapterNumber,
      endChapterNumber: readingSessions.endChapterNumber,
      highlightsCount: readingSessions.highlightsCount,
      postConfig: readingSessions.postConfig,
      createdAt: readingSessions.createdAt,
      postedAt: readingSessions.postedAt,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        image: user.image,
      },
      book: {
        id: books.id,
        slug: books.slug,
        title: books.title,
        author: books.author,
        coverColor: books.coverColor,
        coverUrl: books.coverUrl,
      },
    })
    .from(readingSessions)
    .innerJoin(user, eq(readingSessions.userId, user.id))
    .innerJoin(books, eq(readingSessions.bookId, books.id))
    .where(and(eq(readingSessions.id, id), eq(readingSessions.isPosted, true)))
    .limit(1);

  if (!row) {
    throw new HttpError(
      404,
      "POST_NOT_FOUND",
      "Postingan tidak ditemukan atau bersifat privat.",
    );
  }

  return mapPublicSessionRow({
    id: row.id,
    title: row.title,
    note: row.note,
    pagesRead: row.pagesRead,
    wordsRead: row.wordsRead,
    durationSeconds: row.durationSeconds,
    avgWpm: row.avgWpm,
    startProgressPercent: row.startProgressPercent,
    endProgressPercent: row.endProgressPercent,
    startChapterNumber: row.startChapterNumber,
    endChapterNumber: row.endChapterNumber,
    highlightsCount: row.highlightsCount,
    postConfig: row.postConfig,
    createdAt: row.createdAt,
    postedAt: row.postedAt,
    author: row.user,
    book: row.book,
  });
}
