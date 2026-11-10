import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "../db";
import {
  authorApplications,
  books,
  readingSessions,
  user,
  userFollows,
  userShelves,
} from "../db/schema";
import { HttpError } from "../lib/http-error";
import type {
  ApplyAuthorInput,
  FollowUserInput,
  UpdateProfileBioInput,
} from "@starter/shared/validators/social";
import type {
  AuthorDirectoryItemDto,
  ReaderDirectoryItemDto,
  SocialProfileDto,
} from "@starter/shared/types";

const readingDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Jakarta",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const dayMs = 86_400_000;

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

export async function getSocialProfile(
  targetUserIdOrUsername: string,
  currentUserId?: string,
): Promise<SocialProfileDto> {
  const [targetUser] = await db
    .select()
    .from(user)
    .where(
      or(
        eq(user.username, targetUserIdOrUsername),
        eq(user.id, targetUserIdOrUsername),
      ),
    )
    .limit(1);

  if (!targetUser) {
    throw new HttpError(404, "USER_NOT_FOUND", "Pengguna tidak ditemukan.");
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
    .select({ totalSeconds: sql<number>`coalesce(sum(${readingSessions.durationSeconds}), 0)` })
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

  return {
    id: targetUser.id,
    name: targetUser.name,
    username: targetUser.username,
    image: targetUser.image,
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
    createdAt: targetUser.createdAt.toISOString(),
  };
}

export async function updateMySocialProfile(
  userId: string,
  input: UpdateProfileBioInput,
): Promise<SocialProfileDto> {
  const updateData: Partial<typeof user.$inferInsert> = {};

  if (input.bio !== undefined) updateData.bio = input.bio;
  if (input.locationCity !== undefined) updateData.locationCity = input.locationCity;
  if (input.authorPenName !== undefined) updateData.authorPenName = input.authorPenName;
  if (input.socialLinks !== undefined) updateData.socialLinks = input.socialLinks ?? undefined;

  await db.update(user).set(updateData).where(eq(user.id, userId));

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
    .select({ authorStatus: user.authorStatus, authorPenName: user.authorPenName })
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
        authorPenName: existingUser?.authorPenName || input.penName,
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

export async function exploreAuthors(
  currentUserId?: string,
  query?: string,
): Promise<AuthorDirectoryItemDto[]> {
  // Verified authors or authors with books
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
      or(
        eq(user.authorStatus, "verified"),
        sql`exists (select 1 from ${books} where ${books.authorUserId} = ${user.id})`,
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
          (a.username && a.username.toLowerCase().includes(query.toLowerCase())),
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
    .orderBy(desc(user.createdAt))
    .limit(50);

  const userRows = await usersQuery;

  const filteredUsers = query?.trim()
    ? userRows.filter(
        (u) =>
          u.name.toLowerCase().includes(query.toLowerCase()) ||
          (u.username && u.username.toLowerCase().includes(query.toLowerCase())),
      )
    : userRows;

  const results: ReaderDirectoryItemDto[] = [];

  for (const u of filteredUsers) {
    const [finishedShelves] = await db
      .select({ count: sql<number>`count(*)` })
      .from(userShelves)
      .where(
        and(eq(userShelves.userId, u.id), eq(userShelves.shelfStatus, "finished")),
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
