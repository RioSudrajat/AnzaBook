import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { db } from "../db";
import {
  books,
  communityCalendars,
  communityCalendarFollowers,
  communityCalendarMembers,
  communityEvents,
  communityWalletLedgers,
  eventReports,
  eventRsvps,
  storeBranches,
  user,
} from "../db/schema";
import { HttpError } from "../lib/http-error";
import { toBookSummary } from "./books.service";
import {
  detectMeetingPlatform,
  type AddCalendarMemberOutput,
  type CheckInRsvpInput,
  type CreateCalendarInput,
  type CreateEventInput,
  type ListEventsQuery,
  type RsvpEventInput,
  type UpdateCalendarInput,
  type UpdateCalendarMemberInput,
  type UpdateEventInput,
} from "@starter/shared/validators/community";
import type {
  CommunityCalendarDto,
  CommunityCalendarMemberDto,
  CommunityEventDetailDto,
  CommunityEventSummaryDto,
  CommunityWalletDto,
  CommunityWalletLedgerDto,
  EventRsvpDto,
  LocationSuggestionDto,
  PageMeta,
} from "@starter/shared/types";

function toCalendarDto(
  cal: typeof communityCalendars.$inferSelect,
  followerCount = 0,
  isFollowing = false,
  isManager = false,
  isMember = false,
  memberRole: "owner" | "admin" | "checkin_staff" | "member" | null = null,
): CommunityCalendarDto {
  return {
    id: cal.id,
    slug: cal.slug,
    name: cal.name,
    type: cal.type as "community" | "author" | "publisher",
    description: cal.description,
    avatarUrl: cal.avatarUrl,
    coverUrl: cal.coverUrl,
    city: cal.city,
    contactEmail: cal.contactEmail,
    socialLinks: cal.socialLinks || null,
    verificationStatus: cal.verificationStatus as
      "pending" | "verified" | "trusted" | "rejected",
    rejectionReason: cal.rejectionReason,
    verificationDocuments: cal.verificationDocuments,
    followerCount,
    isFollowing,
    isManager,
    isMember,
    memberRole,
    createdAt: cal.createdAt.toISOString(),
  };
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function isCalendarManager(
  calendarId: string,
  userId?: string,
  userRole?: string,
): Promise<boolean> {
  if (!userId) return false;
  if (userRole === "admin") return true;

  const [membership] = await db
    .select({ id: communityCalendarMembers.id })
    .from(communityCalendarMembers)
    .where(
      and(
        eq(communityCalendarMembers.calendarId, calendarId),
        eq(communityCalendarMembers.userId, userId),
        inArray(communityCalendarMembers.role, ["owner", "admin"]),
      ),
    )
    .limit(1);

  return !!membership;
}

export async function canCheckInEvent(
  calendarId: string,
  userId?: string,
  userRole?: string,
): Promise<boolean> {
  if (!userId) return false;
  if (userRole === "admin") return true;

  const [membership] = await db
    .select({ id: communityCalendarMembers.id })
    .from(communityCalendarMembers)
    .where(
      and(
        eq(communityCalendarMembers.calendarId, calendarId),
        eq(communityCalendarMembers.userId, userId),
        inArray(communityCalendarMembers.role, [
          "owner",
          "admin",
          "checkin_staff",
        ]),
      ),
    )
    .limit(1);

  return !!membership;
}

export async function createCalendar(
  userId: string,
  input: CreateCalendarInput,
): Promise<CommunityCalendarDto> {
  const [existing] = await db
    .select({ id: communityCalendars.id })
    .from(communityCalendars)
    .where(eq(communityCalendars.slug, input.slug))
    .limit(1);

  if (existing) {
    throw new HttpError(
      409,
      "CALENDAR_SLUG_TAKEN",
      "Slug kalender sudah digunakan, silakan pilih yang lain.",
    );
  }

  const [cal] = await db
    .insert(communityCalendars)
    .values({
      slug: input.slug,
      name: input.name,
      type: input.type,
      description: input.description,
      avatarUrl: input.avatarUrl,
      coverUrl: input.coverUrl,
      city: input.city,
      contactEmail: input.contactEmail || null,
      socialLinks: input.socialLinks,
      verificationDocuments: input.verificationDocuments,
      verificationStatus: "pending",
      createdByUserId: userId,
    })
    .returning();

  await db.insert(communityCalendarMembers).values({
    calendarId: cal.id,
    userId,
    role: "owner",
  });

  return toCalendarDto(cal, 0, false, true);
}

export async function updateCalendar(
  userId: string,
  slug: string,
  input: UpdateCalendarInput,
  userRole?: string,
): Promise<CommunityCalendarDto> {
  const [cal] = await db
    .select()
    .from(communityCalendars)
    .where(eq(communityCalendars.slug, slug))
    .limit(1);

  if (!cal) {
    throw new HttpError(
      404,
      "CALENDAR_NOT_FOUND",
      "Kalender komunitas tidak ditemukan.",
    );
  }

  const canManage = await isCalendarManager(cal.id, userId, userRole);
  if (!canManage) {
    throw new HttpError(
      403,
      "FORBIDDEN",
      "Hanya pengelola yang dapat mengubah profil komunitas.",
    );
  }

  const patch: Partial<typeof communityCalendars.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (input.name !== undefined) patch.name = input.name;
  if (input.description !== undefined) patch.description = input.description;
  if (input.avatarUrl !== undefined) patch.avatarUrl = input.avatarUrl;
  if (input.coverUrl !== undefined) patch.coverUrl = input.coverUrl;
  if (input.city !== undefined) patch.city = input.city;
  if (input.contactEmail !== undefined)
    patch.contactEmail = input.contactEmail || null;
  if (input.socialLinks !== undefined) patch.socialLinks = input.socialLinks;

  const [updated] = await db
    .update(communityCalendars)
    .set(patch)
    .where(eq(communityCalendars.id, cal.id))
    .returning();

  return (await getCalendarBySlug(updated.slug, userId))!;
}

export async function listCalendars(
  currentUserId?: string,
): Promise<CommunityCalendarDto[]> {
  const cals = await db
    .select()
    .from(communityCalendars)
    .where(
      inArray(communityCalendars.verificationStatus, ["verified", "trusted"]),
    )
    .orderBy(desc(communityCalendars.createdAt));

  const results: CommunityCalendarDto[] = [];
  for (const cal of cals) {
    const followers = await db
      .select({ count: sql<number>`count(*)` })
      .from(communityCalendarFollowers)
      .where(eq(communityCalendarFollowers.calendarId, cal.id));

    let isFollowing = false;
    let isManager = false;

    if (currentUserId) {
      const [follow] = await db
        .select({ id: communityCalendarFollowers.id })
        .from(communityCalendarFollowers)
        .where(
          and(
            eq(communityCalendarFollowers.calendarId, cal.id),
            eq(communityCalendarFollowers.userId, currentUserId),
          ),
        )
        .limit(1);
      isFollowing = !!follow;

      isManager = await isCalendarManager(cal.id, currentUserId);
    }

    results.push(
      toCalendarDto(
        cal,
        Number(followers[0]?.count || 0),
        isFollowing,
        isManager,
      ),
    );
  }

  return results;
}

export async function getCalendarBySlug(
  slug: string,
  currentUserId?: string,
): Promise<CommunityCalendarDto | null> {
  const [cal] = await db
    .select()
    .from(communityCalendars)
    .where(eq(communityCalendars.slug, slug))
    .limit(1);

  if (!cal) return null;

  const followers = await db
    .select({ count: sql<number>`count(*)` })
    .from(communityCalendarFollowers)
    .where(eq(communityCalendarFollowers.calendarId, cal.id));

  let isFollowing = false;
  let isManager = false;
  let isMember = false;
  let memberRole: "owner" | "admin" | "checkin_staff" | "member" | null = null;

  if (currentUserId) {
    const [follow] = await db
      .select({ id: communityCalendarFollowers.id })
      .from(communityCalendarFollowers)
      .where(
        and(
          eq(communityCalendarFollowers.calendarId, cal.id),
          eq(communityCalendarFollowers.userId, currentUserId),
        ),
      )
      .limit(1);
    isFollowing = !!follow;

    const [membership] = await db
      .select({ role: communityCalendarMembers.role })
      .from(communityCalendarMembers)
      .where(
        and(
          eq(communityCalendarMembers.calendarId, cal.id),
          eq(communityCalendarMembers.userId, currentUserId),
        ),
      )
      .limit(1);

    if (membership) {
      isMember = true;
      memberRole = membership.role;
      isManager = membership.role === "owner" || membership.role === "admin";
    }
  }

  return toCalendarDto(
    cal,
    Number(followers[0]?.count || 0),
    isFollowing,
    isManager,
    isMember,
    memberRole,
  );
}

export async function getCalendarMembers(
  slug: string,
): Promise<CommunityCalendarMemberDto[]> {
  const [cal] = await db
    .select({ id: communityCalendars.id })
    .from(communityCalendars)
    .where(eq(communityCalendars.slug, slug))
    .limit(1);

  if (!cal) {
    throw new HttpError(
      404,
      "CALENDAR_NOT_FOUND",
      "Kalender komunitas tidak ditemukan.",
    );
  }

  const rows = await db
    .select({
      id: communityCalendarMembers.id,
      userId: communityCalendarMembers.userId,
      name: user.name,
      username: user.username,
      image: user.image,
      role: communityCalendarMembers.role,
      createdAt: communityCalendarMembers.createdAt,
    })
    .from(communityCalendarMembers)
    .innerJoin(user, eq(communityCalendarMembers.userId, user.id))
    .where(eq(communityCalendarMembers.calendarId, cal.id))
    .orderBy(desc(communityCalendarMembers.createdAt));

  return rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function verifyCalendar(
  calendarSlug: string,
  status: "verified" | "trusted" | "rejected",
): Promise<CommunityCalendarDto> {
  const [cal] = await db
    .update(communityCalendars)
    .set({ verificationStatus: status })
    .where(eq(communityCalendars.slug, calendarSlug))
    .returning();

  if (!cal) {
    throw new HttpError(404, "CALENDAR_NOT_FOUND", "Kalender tidak ditemukan.");
  }

  return toCalendarDto(cal);
}

export async function toggleFollowCalendar(
  calendarSlug: string,
  userId: string,
): Promise<{ following: boolean }> {
  const [cal] = await db
    .select({ id: communityCalendars.id })
    .from(communityCalendars)
    .where(eq(communityCalendars.slug, calendarSlug))
    .limit(1);

  if (!cal) {
    throw new HttpError(404, "CALENDAR_NOT_FOUND", "Kalender tidak ditemukan.");
  }

  const [existing] = await db
    .select({ id: communityCalendarFollowers.id })
    .from(communityCalendarFollowers)
    .where(
      and(
        eq(communityCalendarFollowers.calendarId, cal.id),
        eq(communityCalendarFollowers.userId, userId),
      ),
    )
    .limit(1);

  if (existing) {
    await db
      .delete(communityCalendarFollowers)
      .where(eq(communityCalendarFollowers.id, existing.id));
    return { following: false };
  }

  await db
    .insert(communityCalendarFollowers)
    .values({ calendarId: cal.id, userId });
  return { following: true };
}

export async function createEvent(
  userId: string,
  userRole: string = "user",
  input: CreateEventInput,
): Promise<CommunityEventDetailDto> {
  const [calendar] = await db
    .select()
    .from(communityCalendars)
    .where(eq(communityCalendars.id, input.calendarId))
    .limit(1);

  if (!calendar) {
    throw new HttpError(404, "CALENDAR_NOT_FOUND", "Kalender tidak ditemukan.");
  }

  const canManage = await isCalendarManager(calendar.id, userId, userRole);
  if (!canManage) {
    throw new HttpError(
      403,
      "FORBIDDEN_CALENDAR_ACCESS",
      "Anda bukan pengelola kalender ini.",
    );
  }

  if (input.visibility === "public") {
    const isVerified =
      calendar.verificationStatus === "verified" ||
      calendar.verificationStatus === "trusted";
    if (!isVerified && userRole !== "admin") {
      throw new HttpError(
        403,
        "CALENDAR_NOT_VERIFIED",
        "Komunitas harus terverifikasi oleh kurasi admin sebelum dapat mempublikasikan acara publik.",
      );
    }
  }

  // Create slug from title
  const baseSlug = input.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 120);
  const slug = `${baseSlug}-${randomBytes(3).toString("hex")}`;

  const status = "published";

  const [event] = await db
    .insert(communityEvents)
    .values({
      slug,
      calendarId: input.calendarId,
      bookId: input.bookId || null,
      featuredWork: input.featuredWork || null,
      title: input.title,
      description: input.description,
      logisticsNotes: input.logisticsNotes,
      coverUrl: input.coverUrl,
      themePreset: input.themePreset,
      visibility: input.visibility,
      eventType: input.eventType,
      categoryTag: input.categoryTag,
      coHosts: input.coHosts,
      format: input.format,
      district: input.district,
      city: input.city,
      venueName: input.venueName,
      venueAddress: input.venueAddress,
      hideAddressUntilApproved: input.hideAddressUntilApproved,
      latitude: input.latitude,
      longitude: input.longitude,
      placeSourceLat: input.placeSourceLat,
      placeSourceLng: input.placeSourceLng,
      onlineMeetingUrl: input.onlineMeetingUrl || null,
      startsAt: new Date(input.startsAt),
      endsAt: new Date(input.endsAt),
      timezone: input.timezone,
      capacity: input.capacity || null,
      requiresApproval: input.requiresApproval,
      allowWaitlist: input.allowWaitlist,
      status,
    })
    .returning();

  return (await getEventBySlug(event.slug, userId, userRole))!;
}

function escapeIlikePattern(raw: string): string {
  return raw.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

export async function listEvents(
  query: ListEventsQuery,
  currentUserId?: string,
  currentUserRole?: string,
): Promise<{ data: CommunityEventSummaryDto[]; meta: PageMeta }> {
  const conditions = [];

  if (query.format) {
    conditions.push(eq(communityEvents.format, query.format));
  }
  if (query.eventType) {
    conditions.push(eq(communityEvents.eventType, query.eventType));
  }
  if (query.city) {
    conditions.push(
      ilike(communityEvents.city, `%${escapeIlikePattern(query.city)}%`),
    );
  }
  if (query.q && query.q.trim()) {
    const pattern = `%${escapeIlikePattern(query.q.trim())}%`;
    const canMatchVenue =
      currentUserId && currentUserRole === "admin"
        ? ilike(communityEvents.venueName, pattern)
        : currentUserId
          ? and(
              ilike(communityEvents.venueName, pattern),
              or(
                eq(communityEvents.hideAddressUntilApproved, false),
                sql`EXISTS (
                  SELECT 1 FROM ${communityCalendarMembers}
                  WHERE ${communityCalendarMembers.calendarId} = ${communityEvents.calendarId}
                    AND ${communityCalendarMembers.userId} = ${currentUserId}
                    AND ${communityCalendarMembers.role} IN ('owner', 'admin')
                )`,
                sql`EXISTS (
                  SELECT 1 FROM ${eventRsvps}
                  WHERE ${eventRsvps.eventId} = ${communityEvents.id}
                    AND ${eventRsvps.userId} = ${currentUserId}
                    AND ${eventRsvps.status} = 'going'
                )`,
              ),
            )
          : and(
              eq(communityEvents.hideAddressUntilApproved, false),
              ilike(communityEvents.venueName, pattern),
            );
    conditions.push(
      or(
        ilike(communityEvents.title, pattern),
        canMatchVenue,
        ilike(communityEvents.city, pattern),
        ilike(communityEvents.district, pattern),
        ilike(communityEvents.categoryTag, pattern),
        ilike(communityCalendars.name, pattern),
      )!,
    );
  }
  if (query.bookId) {
    conditions.push(eq(communityEvents.bookId, query.bookId));
  }
  if (query.calendarSlug) {
    conditions.push(eq(communityCalendars.slug, query.calendarSlug));
  }

  const now = new Date();
  if (query.filter === "past") {
    conditions.push(sql`${communityEvents.endsAt} < ${now}`);
  } else if (query.filter === "upcoming") {
    conditions.push(sql`${communityEvents.endsAt} >= ${now}`);
  } else if (query.filter === "my_rsvps") {
    if (!currentUserId) {
      return {
        data: [],
        meta: {
          limit: query.limit,
          offset: query.offset,
          hasMore: false,
          total: 0,
        },
      };
    }
    const userEventIdsSubquery = db
      .select({ eventId: eventRsvps.eventId })
      .from(eventRsvps)
      .where(
        and(
          eq(eventRsvps.userId, currentUserId),
          inArray(eventRsvps.status, [
            "going",
            "pending_approval",
            "waitlisted",
          ]),
        ),
      );
    conditions.push(inArray(communityEvents.id, userEventIdsSubquery));
    if (query.timeScope === "upcoming") {
      conditions.push(sql`${communityEvents.endsAt} >= ${now}`);
    } else if (query.timeScope === "past") {
      conditions.push(sql`${communityEvents.endsAt} < ${now}`);
    }
  } else if (query.filter === "hosting") {
    if (!currentUserId) {
      return {
        data: [],
        meta: {
          limit: query.limit,
          offset: query.offset,
          hasMore: false,
          total: 0,
        },
      };
    }
    if (currentUserRole !== "admin") {
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM ${communityCalendarMembers}
          WHERE ${communityCalendarMembers.calendarId} = ${communityEvents.calendarId}
            AND ${communityCalendarMembers.userId} = ${currentUserId}
            AND ${communityCalendarMembers.role} IN ('owner', 'admin')
        )`,
      );
    }
    if (query.timeScope === "upcoming") {
      conditions.push(sql`${communityEvents.endsAt} >= ${now}`);
    } else if (query.timeScope === "past") {
      conditions.push(sql`${communityEvents.endsAt} < ${now}`);
    }
  }

  // Filter published for public viewing, unless query is hosting or viewer manages calendar
  if (query.filter !== "hosting") {
    if (currentUserId && currentUserRole !== "admin") {
      conditions.push(
        or(
          eq(communityEvents.status, "published"),
          sql`EXISTS (
            SELECT 1 FROM ${communityCalendarMembers}
            WHERE ${communityCalendarMembers.calendarId} = ${communityEvents.calendarId}
              AND ${communityCalendarMembers.userId} = ${currentUserId}
              AND ${communityCalendarMembers.role} IN ('owner', 'admin')
          )`,
        ),
      );
    } else if (!currentUserId) {
      conditions.push(eq(communityEvents.status, "published"));
    }
  }

  // Filter visibility: private_link events must not leak in public directory
  if (query.filter !== "hosting" && query.filter !== "my_rsvps") {
    if (currentUserId && currentUserRole !== "admin") {
      conditions.push(
        or(
          eq(communityEvents.visibility, "public"),
          sql`EXISTS (
            SELECT 1 FROM ${communityCalendarMembers}
            WHERE ${communityCalendarMembers.calendarId} = ${communityEvents.calendarId}
              AND ${communityCalendarMembers.userId} = ${currentUserId}
              AND ${communityCalendarMembers.role} IN ('owner', 'admin')
          )`,
        ),
      );
    } else if (!currentUserId) {
      conditions.push(eq(communityEvents.visibility, "public"));
    }
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const orderByDesc = query.filter === "past" || query.timeScope === "past";

  const [[countRow], rows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(communityEvents)
      .innerJoin(
        communityCalendars,
        eq(communityEvents.calendarId, communityCalendars.id),
      )
      .leftJoin(books, eq(communityEvents.bookId, books.id))
      .where(whereClause),
    db
      .select({
        event: communityEvents,
        calendar: communityCalendars,
        book: books,
      })
      .from(communityEvents)
      .innerJoin(
        communityCalendars,
        eq(communityEvents.calendarId, communityCalendars.id),
      )
      .leftJoin(books, eq(communityEvents.bookId, books.id))
      .where(whereClause)
      .orderBy(
        orderByDesc ? desc(communityEvents.endsAt) : communityEvents.startsAt,
        communityEvents.id,
      )
      .limit(query.limit + 1)
      .offset(query.offset),
  ]);

  const total = Number(countRow?.count || 0);
  const hasMore = rows.length > query.limit;
  const items = rows.slice(0, query.limit);

  if (items.length === 0) {
    return {
      data: [],
      meta: {
        limit: query.limit,
        offset: query.offset,
        hasMore: false,
        total,
      },
    };
  }

  const eventIds = items.map((r) => r.event.id);
  const calendarIds = [...new Set(items.map((r) => r.calendar.id))];

  const rankedPreviews = db
    .select({
      eventId: eventRsvps.eventId,
      userId: user.id,
      name: user.name,
      image: user.image,
      rn: sql<number>`row_number() over (partition by ${eventRsvps.eventId} order by ${eventRsvps.createdAt} asc, ${eventRsvps.id} asc)`.as(
        "rn",
      ),
    })
    .from(eventRsvps)
    .innerJoin(user, eq(eventRsvps.userId, user.id))
    .where(
      and(
        inArray(eventRsvps.eventId, eventIds),
        eq(eventRsvps.status, "going"),
      ),
    )
    .as("ranked_event_previews");

  const [goingCounts, previewRows, userRsvpRows, managerRows] =
    await Promise.all([
      db
        .select({
          eventId: eventRsvps.eventId,
          count: sql<number>`count(*)`,
        })
        .from(eventRsvps)
        .where(
          and(
            inArray(eventRsvps.eventId, eventIds),
            eq(eventRsvps.status, "going"),
          ),
        )
        .groupBy(eventRsvps.eventId),
      db
        .select({
          eventId: rankedPreviews.eventId,
          userId: rankedPreviews.userId,
          name: rankedPreviews.name,
          image: rankedPreviews.image,
        })
        .from(rankedPreviews)
        .where(sql`${rankedPreviews.rn} <= 5`),
      currentUserId
        ? db
            .select({
              eventId: eventRsvps.eventId,
              status: eventRsvps.status,
            })
            .from(eventRsvps)
            .where(
              and(
                inArray(eventRsvps.eventId, eventIds),
                eq(eventRsvps.userId, currentUserId),
              ),
            )
        : Promise.resolve([]),
      currentUserId && currentUserRole !== "admin"
        ? db
            .select({ calendarId: communityCalendarMembers.calendarId })
            .from(communityCalendarMembers)
            .where(
              and(
                inArray(communityCalendarMembers.calendarId, calendarIds),
                eq(communityCalendarMembers.userId, currentUserId),
                inArray(communityCalendarMembers.role, ["owner", "admin"]),
              ),
            )
        : Promise.resolve([]),
    ]);

  const attendeeCountMap = new Map<string, number>();
  for (const row of goingCounts) {
    attendeeCountMap.set(row.eventId, Number(row.count || 0));
  }

  const previewsMap = new Map<
    string,
    { userId: string; name: string; image: string | null }[]
  >();
  for (const row of previewRows) {
    const bucket = previewsMap.get(row.eventId) ?? [];
    if (bucket.length < 5) {
      bucket.push({ userId: row.userId, name: row.name, image: row.image });
      previewsMap.set(row.eventId, bucket);
    }
  }

  const userRsvpMap = new Map<
    string,
    CommunityEventSummaryDto["userRsvpStatus"]
  >();
  for (const row of userRsvpRows) {
    if (row.status !== "canceled") {
      userRsvpMap.set(
        row.eventId,
        row.status as CommunityEventSummaryDto["userRsvpStatus"],
      );
    }
  }

  const managedCalendarSet =
    currentUserId && currentUserRole === "admin"
      ? new Set(calendarIds)
      : new Set(managerRows.map((m) => m.calendarId));

  const managedEventIds = items
    .filter((r) =>
      Boolean(currentUserId && managedCalendarSet.has(r.calendar.id)),
    )
    .map((r) => r.event.id);

  const pendingCountMap = new Map<string, number>();
  if (managedEventIds.length > 0) {
    const pendingRows = await db
      .select({
        eventId: eventRsvps.eventId,
        count: sql<number>`count(*)`,
      })
      .from(eventRsvps)
      .where(
        and(
          inArray(eventRsvps.eventId, managedEventIds),
          eq(eventRsvps.status, "pending_approval"),
        ),
      )
      .groupBy(eventRsvps.eventId);

    for (const row of pendingRows) {
      pendingCountMap.set(row.eventId, Number(row.count || 0));
    }
  }

  const data: CommunityEventSummaryDto[] = items.map(
    ({ event, calendar, book }) => {
      const userRsvpStatus = userRsvpMap.get(event.id) ?? null;
      const isManager = Boolean(
        currentUserId && managedCalendarSet.has(calendar.id),
      );
      const pendingRsvpCount = isManager
        ? (pendingCountMap.get(event.id) ?? 0)
        : 0;
      const isAddressHidden =
        event.hideAddressUntilApproved &&
        userRsvpStatus !== "going" &&
        !isManager;

      return {
        id: event.id,
        slug: event.slug,
        calendarId: calendar.id,
        calendarSlug: calendar.slug,
        calendarName: calendar.name,
        calendarAvatarUrl: calendar.avatarUrl,
        bookId: event.bookId,
        bookSummary: book ? toBookSummary(book) : null,
        featuredWork: event.featuredWork,
        title: event.title,
        description: event.description,
        coverUrl: event.coverUrl,
        themePreset: event.themePreset,
        visibility: event.visibility,
        eventType: event.eventType,
        categoryTag: event.categoryTag,
        coHosts: event.coHosts,
        format: event.format,
        district: event.district,
        city: event.city,
        venueName: isAddressHidden ? null : event.venueName,
        venueAddress: isAddressHidden ? null : event.venueAddress,
        hideAddressUntilApproved: event.hideAddressUntilApproved,
        isAddressHidden,
        latitude: isAddressHidden ? null : event.latitude,
        longitude: isAddressHidden ? null : event.longitude,
        meetingPlatform: detectMeetingPlatform(event.onlineMeetingUrl),
        startsAt: event.startsAt.toISOString(),
        endsAt: event.endsAt.toISOString(),
        timezone: event.timezone,
        capacity: event.capacity,
        requiresApproval: event.requiresApproval,
        allowWaitlist: event.allowWaitlist,
        status: event.status,
        attendeeCount: attendeeCountMap.get(event.id) ?? 0,
        attendeesPreview: previewsMap.get(event.id) ?? [],
        userRsvpStatus,
        canManage: isManager,
        pendingRsvpCount,
      };
    },
  );

  return {
    data,
    meta: {
      limit: query.limit,
      offset: query.offset,
      hasMore,
      total,
    },
  };
}

export async function getEventBySlug(
  slug: string,
  currentUserId?: string,
  currentUserRole?: string,
): Promise<CommunityEventDetailDto | null> {
  const [row] = await db
    .select({
      event: communityEvents,
      calendar: communityCalendars,
      book: books,
    })
    .from(communityEvents)
    .innerJoin(
      communityCalendars,
      eq(communityEvents.calendarId, communityCalendars.id),
    )
    .leftJoin(books, eq(communityEvents.bookId, books.id))
    .where(eq(communityEvents.slug, slug))
    .limit(1);

  if (!row) return null;

  const { event, calendar, book } = row;
  const canManage = await isCalendarManager(
    calendar.id,
    currentUserId,
    currentUserRole,
  );

  let userRsvp: EventRsvpDto | null = null;
  if (currentUserId) {
    const [r] = await db
      .select({
        id: eventRsvps.id,
        eventId: eventRsvps.eventId,
        userId: eventRsvps.userId,
        userName: user.name,
        userEmail: user.email,
        userImage: user.image,
        status: eventRsvps.status,
        checkinCode: eventRsvps.checkinCode,
        checkedInAt: eventRsvps.checkedInAt,
        createdAt: eventRsvps.createdAt,
      })
      .from(eventRsvps)
      .innerJoin(user, eq(eventRsvps.userId, user.id))
      .where(
        and(
          eq(eventRsvps.eventId, event.id),
          eq(eventRsvps.userId, currentUserId),
        ),
      )
      .limit(1);

    if (r && r.status !== "canceled") {
      userRsvp = {
        ...r,
        status: r.status as EventRsvpDto["status"],
        checkedInAt: r.checkedInAt?.toISOString() || null,
        createdAt: r.createdAt.toISOString(),
      };
    }
  }

  const [attCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(eventRsvps)
    .where(
      and(eq(eventRsvps.eventId, event.id), eq(eventRsvps.status, "going")),
    );

  const previews = await db
    .select({
      userId: user.id,
      name: user.name,
      image: user.image,
    })
    .from(eventRsvps)
    .innerJoin(user, eq(eventRsvps.userId, user.id))
    .where(
      and(eq(eventRsvps.eventId, event.id), eq(eventRsvps.status, "going")),
    )
    .limit(8);

  const isGoing = userRsvp?.status === "going";
  const canSeeMeetingUrl = canManage || isGoing;
  const isAddressHidden =
    event.hideAddressUntilApproved && !isGoing && !canManage;

  return {
    id: event.id,
    slug: event.slug,
    calendarId: calendar.id,
    calendarSlug: calendar.slug,
    calendarName: calendar.name,
    calendarAvatarUrl: calendar.avatarUrl,
    bookId: event.bookId,
    bookSummary: book ? toBookSummary(book) : null,
    featuredWork: event.featuredWork,
    title: event.title,
    description: event.description,
    logisticsNotes: event.logisticsNotes,
    coverUrl: event.coverUrl,
    themePreset: event.themePreset,
    visibility: event.visibility,
    eventType: event.eventType,
    categoryTag: event.categoryTag,
    coHosts: event.coHosts,
    format: event.format,
    district: event.district,
    city: event.city,
    venueName: isAddressHidden ? null : event.venueName,
    venueAddress: isAddressHidden ? null : event.venueAddress,
    hideAddressUntilApproved: event.hideAddressUntilApproved,
    isAddressHidden,
    latitude: isAddressHidden ? null : event.latitude,
    longitude: isAddressHidden ? null : event.longitude,
    meetingPlatform: detectMeetingPlatform(event.onlineMeetingUrl),
    onlineMeetingUrl: canSeeMeetingUrl ? event.onlineMeetingUrl : null,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt.toISOString(),
    timezone: event.timezone,
    capacity: event.capacity,
    requiresApproval: event.requiresApproval,
    allowWaitlist: event.allowWaitlist,
    status: event.status,
    attendeeCount: Number(attCount?.count || 0),
    attendeesPreview: previews,
    userRsvpStatus: userRsvp?.status || null,
    userRsvp,
    canManage,
  };
}

export async function rsvpEvent(
  slug: string,
  userId: string,
  input: RsvpEventInput,
): Promise<EventRsvpDto> {
  const [event] = await db
    .select()
    .from(communityEvents)
    .where(eq(communityEvents.slug, slug))
    .limit(1);

  if (!event) {
    throw new HttpError(404, "EVENT_NOT_FOUND", "Acara tidak ditemukan.");
  }

  // Count current going RSVPs
  const [goingRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(eventRsvps)
    .where(
      and(eq(eventRsvps.eventId, event.id), eq(eventRsvps.status, "going")),
    );

  const goingCount = Number(goingRow?.count || 0);

  let status: EventRsvpDto["status"] = "going";
  if (event.requiresApproval) {
    status = "pending_approval";
  } else if (event.capacity !== null && goingCount >= event.capacity) {
    if (event.allowWaitlist) {
      status = "waitlisted";
    } else {
      throw new HttpError(
        409,
        "EVENT_FULL",
        "Kapasitas acara sudah penuh dan daftar tunggu tidak diaktifkan.",
      );
    }
  }

  const checkinCode = `CHK-${randomBytes(3).toString("hex").toUpperCase()}`;

  const [row] = await db
    .insert(eventRsvps)
    .values({
      eventId: event.id,
      userId,
      status,
      note: input.note,
      checkinCode,
    })
    .onConflictDoUpdate({
      target: [eventRsvps.eventId, eventRsvps.userId],
      set: {
        status,
        note: input.note,
        updatedAt: new Date(),
      },
    })
    .returning();

  const [userData] = await db
    .select({ name: user.name, email: user.email, image: user.image })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  return {
    id: row.id,
    eventId: row.eventId,
    userId: row.userId,
    userName: userData?.name || "Peserta",
    userEmail: userData?.email || "",
    userImage: userData?.image || null,
    status: row.status as EventRsvpDto["status"],
    checkinCode: row.checkinCode,
    checkedInAt: row.checkedInAt?.toISOString() || null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function cancelRsvp(
  slug: string,
  userId: string,
): Promise<{ success: boolean; message: string }> {
  const [event] = await db
    .select({ id: communityEvents.id, capacity: communityEvents.capacity })
    .from(communityEvents)
    .where(eq(communityEvents.slug, slug))
    .limit(1);

  if (!event) {
    throw new HttpError(404, "EVENT_NOT_FOUND", "Acara tidak ditemukan.");
  }

  const [existing] = await db
    .select()
    .from(eventRsvps)
    .where(and(eq(eventRsvps.eventId, event.id), eq(eventRsvps.userId, userId)))
    .limit(1);

  if (!existing || existing.status === "canceled") {
    return { success: true, message: "Pendaftaran sudah dibatalkan." };
  }

  const wasGoing = existing.status === "going";

  await db
    .update(eventRsvps)
    .set({ status: "canceled", updatedAt: new Date() })
    .where(eq(eventRsvps.id, existing.id));

  // If a going seat freed up, promote the oldest waitlisted user
  if (wasGoing) {
    const [nextWaitlisted] = await db
      .select({ id: eventRsvps.id })
      .from(eventRsvps)
      .where(
        and(
          eq(eventRsvps.eventId, event.id),
          eq(eventRsvps.status, "waitlisted"),
        ),
      )
      .orderBy(eventRsvps.createdAt)
      .limit(1);

    if (nextWaitlisted) {
      await db
        .update(eventRsvps)
        .set({ status: "going", updatedAt: new Date() })
        .where(eq(eventRsvps.id, nextWaitlisted.id));
    }
  }

  return { success: true, message: "Pendaftaran berhasil dibatalkan." };
}

export async function approveRsvp(
  slug: string,
  rsvpId: string,
  hostUserId: string,
  userRole: string = "user",
): Promise<EventRsvpDto> {
  const [event] = await db
    .select({ id: communityEvents.id, calendarId: communityEvents.calendarId })
    .from(communityEvents)
    .where(eq(communityEvents.slug, slug))
    .limit(1);

  if (!event) {
    throw new HttpError(404, "EVENT_NOT_FOUND", "Acara tidak ditemukan.");
  }

  const canManage = await isCalendarManager(
    event.calendarId,
    hostUserId,
    userRole,
  );
  if (!canManage) {
    throw new HttpError(
      403,
      "FORBIDDEN",
      "Hanya pengelola yang dapat menyetujui pendaftar.",
    );
  }

  const [existing] = await db
    .select()
    .from(eventRsvps)
    .where(and(eq(eventRsvps.id, rsvpId), eq(eventRsvps.eventId, event.id)))
    .limit(1);

  if (!existing) {
    throw new HttpError(404, "RSVP_NOT_FOUND", "Pendaftaran tidak ditemukan.");
  }

  if (existing.status === "canceled") {
    throw new HttpError(
      409,
      "RSVP_CANCELED",
      "Peserta sudah membatalkan pendaftaran dan tidak dapat disetujui.",
    );
  }

  const [row] = await db
    .update(eventRsvps)
    .set({ status: "going", updatedAt: new Date() })
    .where(and(eq(eventRsvps.id, rsvpId), eq(eventRsvps.eventId, event.id)))
    .returning();

  if (!row) {
    throw new HttpError(404, "RSVP_NOT_FOUND", "Pendaftaran tidak ditemukan.");
  }

  const [userData] = await db
    .select({ name: user.name, email: user.email, image: user.image })
    .from(user)
    .where(eq(user.id, row.userId))
    .limit(1);

  return {
    id: row.id,
    eventId: row.eventId,
    userId: row.userId,
    userName: userData?.name || "Peserta",
    userEmail: userData?.email || "",
    userImage: userData?.image || null,
    status: row.status as EventRsvpDto["status"],
    checkinCode: row.checkinCode,
    checkedInAt: row.checkedInAt?.toISOString() || null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function checkInRsvp(
  slug: string,
  input: CheckInRsvpInput,
  hostUserId: string,
  userRole: string = "user",
): Promise<EventRsvpDto> {
  const [event] = await db
    .select({ id: communityEvents.id, calendarId: communityEvents.calendarId })
    .from(communityEvents)
    .where(eq(communityEvents.slug, slug))
    .limit(1);

  if (!event) {
    throw new HttpError(404, "EVENT_NOT_FOUND", "Acara tidak ditemukan.");
  }

  const canCheckIn = await canCheckInEvent(
    event.calendarId,
    hostUserId,
    userRole,
  );
  if (!canCheckIn) {
    throw new HttpError(
      403,
      "FORBIDDEN",
      "Hanya pengelola atau petugas check-in yang dapat mencatat kehadiran.",
    );
  }

  const normalizedCode = input.checkinCode?.trim().toUpperCase();
  const condition = normalizedCode
    ? sql`upper(${eventRsvps.checkinCode}) = ${normalizedCode}`
    : eq(eventRsvps.userId, input.userId!);

  const [existing] = await db
    .select()
    .from(eventRsvps)
    .where(and(eq(eventRsvps.eventId, event.id), condition))
    .limit(1);

  if (!existing) {
    throw new HttpError(
      404,
      "RSVP_NOT_FOUND",
      "Pendaftaran peserta tidak ditemukan.",
    );
  }

  if (existing.status !== "going") {
    throw new HttpError(
      409,
      "RSVP_NOT_CONFIRMED",
      "Hanya peserta dengan status terdaftar (akan hadir) yang dapat melakukan check-in.",
    );
  }

  const row = existing.checkedInAt
    ? existing
    : (
        await db
          .update(eventRsvps)
          .set({
            checkedInAt: new Date(),
            checkedInByUserId: hostUserId,
            updatedAt: new Date(),
          })
          .where(eq(eventRsvps.id, existing.id))
          .returning()
      )[0];

  const [userData] = await db
    .select({ name: user.name, email: user.email, image: user.image })
    .from(user)
    .where(eq(user.id, row.userId))
    .limit(1);

  return {
    id: row.id,
    eventId: row.eventId,
    userId: row.userId,
    userName: userData?.name || "Peserta",
    userEmail: userData?.email || "",
    userImage: userData?.image || null,
    status: row.status as EventRsvpDto["status"],
    checkinCode: row.checkinCode,
    checkedInAt: row.checkedInAt?.toISOString() || null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function reportEvent(
  slug: string,
  reporterUserId: string,
  reason: string,
): Promise<{ success: boolean }> {
  const [event] = await db
    .select({ id: communityEvents.id })
    .from(communityEvents)
    .where(eq(communityEvents.slug, slug))
    .limit(1);

  if (!event) {
    throw new HttpError(404, "EVENT_NOT_FOUND", "Acara tidak ditemukan.");
  }

  await db.insert(eventReports).values({
    eventId: event.id,
    reporterUserId,
    reason,
  });

  return { success: true };
}

export async function getLocationSuggestions(): Promise<
  LocationSuggestionDto[]
> {
  const branches = await db
    .select({
      id: storeBranches.id,
      branchName: storeBranches.branchName,
      address: storeBranches.address,
      city: storeBranches.city,
      mapUrl: storeBranches.mapUrl,
      latitude: storeBranches.latitude,
      longitude: storeBranches.longitude,
    })
    .from(storeBranches)
    .limit(10);

  const venues = await db
    .selectDistinctOn([communityEvents.venueName], {
      id: communityEvents.id,
      venueName: communityEvents.venueName,
      venueAddress: communityEvents.venueAddress,
      district: communityEvents.district,
      city: communityEvents.city,
      latitude: communityEvents.latitude,
      longitude: communityEvents.longitude,
    })
    .from(communityEvents)
    .where(sql`${communityEvents.venueName} is not null`)
    .limit(10);

  const partnerSuggestions: LocationSuggestionDto[] = branches.map((b) => ({
    id: b.id,
    name: b.branchName,
    address: b.address,
    city: b.city,
    district: null,
    latitude: b.latitude,
    longitude: b.longitude,
    mapsUrl: b.mapUrl || null,
    source: "partner_store",
    isStoreBranch: true,
  }));

  const recentSuggestions: LocationSuggestionDto[] = venues
    .filter(
      (v): v is typeof v & { venueName: string; venueAddress: string } =>
        !!v.venueName && !!v.venueAddress,
    )
    .map((v) => ({
      id: v.id,
      name: v.venueName,
      address: v.venueAddress,
      city: v.city || "Jakarta",
      district: v.district || null,
      latitude: v.latitude ?? -6.2088,
      longitude: v.longitude ?? 106.8456,
      mapsUrl: null,
      source: "recent_venue",
      isStoreBranch: false,
    }));

  return [...recentSuggestions, ...partnerSuggestions];
}

export async function getEventAttendees(
  slug: string,
  hostUserId: string,
  userRole: string = "user",
): Promise<EventRsvpDto[]> {
  const [event] = await db
    .select({ id: communityEvents.id, calendarId: communityEvents.calendarId })
    .from(communityEvents)
    .where(eq(communityEvents.slug, slug))
    .limit(1);

  if (!event) {
    throw new HttpError(404, "EVENT_NOT_FOUND", "Acara tidak ditemukan.");
  }

  const canCheckIn = await canCheckInEvent(
    event.calendarId,
    hostUserId,
    userRole,
  );
  if (!canCheckIn) {
    throw new HttpError(
      403,
      "FORBIDDEN",
      "Hanya pengelola kalender atau petugas check-in yang dapat melihat daftar peserta lengkap.",
    );
  }

  const rows = await db
    .select({
      id: eventRsvps.id,
      eventId: eventRsvps.eventId,
      userId: eventRsvps.userId,
      userName: user.name,
      userEmail: user.email,
      userImage: user.image,
      status: eventRsvps.status,
      checkinCode: eventRsvps.checkinCode,
      checkedInAt: eventRsvps.checkedInAt,
      createdAt: eventRsvps.createdAt,
    })
    .from(eventRsvps)
    .innerJoin(user, eq(eventRsvps.userId, user.id))
    .where(eq(eventRsvps.eventId, event.id))
    .orderBy(desc(eventRsvps.createdAt));

  return rows.map((r) => ({
    ...r,
    status: r.status as EventRsvpDto["status"],
    checkedInAt: r.checkedInAt?.toISOString() || null,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function rejectRsvp(
  slug: string,
  rsvpId: string,
  hostUserId: string,
  userRole: string = "user",
): Promise<EventRsvpDto> {
  const [event] = await db
    .select({ id: communityEvents.id, calendarId: communityEvents.calendarId })
    .from(communityEvents)
    .where(eq(communityEvents.slug, slug))
    .limit(1);

  if (!event) {
    throw new HttpError(404, "EVENT_NOT_FOUND", "Acara tidak ditemukan.");
  }

  const canManage = await isCalendarManager(
    event.calendarId,
    hostUserId,
    userRole,
  );
  if (!canManage) {
    throw new HttpError(
      403,
      "FORBIDDEN",
      "Hanya pengelola yang dapat menolak pendaftar.",
    );
  }

  const [row] = await db
    .update(eventRsvps)
    .set({ status: "rejected", updatedAt: new Date() })
    .where(and(eq(eventRsvps.id, rsvpId), eq(eventRsvps.eventId, event.id)))
    .returning();

  if (!row) {
    throw new HttpError(404, "RSVP_NOT_FOUND", "Pendaftaran tidak ditemukan.");
  }

  const [userData] = await db
    .select({ name: user.name, email: user.email, image: user.image })
    .from(user)
    .where(eq(user.id, row.userId))
    .limit(1);

  return {
    id: row.id,
    eventId: row.eventId,
    userId: row.userId,
    userName: userData?.name || "Peserta",
    userEmail: userData?.email || "",
    userImage: userData?.image || null,
    status: row.status as EventRsvpDto["status"],
    checkinCode: row.checkinCode,
    checkedInAt: row.checkedInAt?.toISOString() || null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function updateEvent(
  slug: string,
  hostUserId: string,
  userRole: string = "user",
  input: UpdateEventInput,
): Promise<CommunityEventDetailDto> {
  const [event] = await db
    .select()
    .from(communityEvents)
    .where(eq(communityEvents.slug, slug))
    .limit(1);

  if (!event) {
    throw new HttpError(404, "EVENT_NOT_FOUND", "Acara tidak ditemukan.");
  }

  const canManage = await isCalendarManager(
    event.calendarId,
    hostUserId,
    userRole,
  );
  if (!canManage) {
    throw new HttpError(
      403,
      "FORBIDDEN",
      "Hanya pengelola kalender yang dapat memperbarui acara.",
    );
  }

  if (input.visibility === "public" && userRole !== "admin") {
    const [calendar] = await db
      .select({ verificationStatus: communityCalendars.verificationStatus })
      .from(communityCalendars)
      .where(eq(communityCalendars.id, event.calendarId))
      .limit(1);
    const isVerified =
      calendar?.verificationStatus === "verified" ||
      calendar?.verificationStatus === "trusted";
    if (!isVerified) {
      throw new HttpError(
        403,
        "CALENDAR_NOT_VERIFIED",
        "Komunitas harus terverifikasi oleh kurasi admin sebelum dapat mempublikasikan acara publik.",
      );
    }
  }

  if (input.bookId) {
    const [linkedBook] = await db
      .select({ id: books.id })
      .from(books)
      .where(eq(books.id, input.bookId))
      .limit(1);
    if (!linkedBook) {
      throw new HttpError(
        404,
        "BOOK_NOT_FOUND",
        "Buku yang ditautkan tidak ditemukan.",
      );
    }
  }

  const nextStartsAt = input.startsAt
    ? new Date(input.startsAt)
    : event.startsAt;
  const nextEndsAt = input.endsAt ? new Date(input.endsAt) : event.endsAt;
  if (nextEndsAt <= nextStartsAt) {
    throw new HttpError(
      400,
      "INVALID_EVENT_SCHEDULE",
      "Waktu selesai harus setelah waktu mulai acara.",
    );
  }

  const nextFormat = input.format ?? event.format;
  const nextMeetingUrl =
    input.onlineMeetingUrl !== undefined
      ? input.onlineMeetingUrl || null
      : event.onlineMeetingUrl;
  const nextVenueName =
    input.venueName !== undefined ? input.venueName || null : event.venueName;
  const nextVenueAddress =
    input.venueAddress !== undefined
      ? input.venueAddress || null
      : event.venueAddress;

  if (nextFormat === "online" && !nextMeetingUrl) {
    throw new HttpError(
      400,
      "MISSING_MEETING_URL",
      "Tautan rapat virtual wajib diisi untuk acara daring.",
    );
  }

  if (
    (nextFormat === "offline" || nextFormat === "hybrid") &&
    !nextVenueName &&
    !nextVenueAddress
  ) {
    throw new HttpError(
      400,
      "MISSING_VENUE",
      "Nama tempat atau alamat fisik wajib diisi untuk acara tatap muka.",
    );
  }

  if (nextFormat === "hybrid" && !nextMeetingUrl) {
    throw new HttpError(
      400,
      "MISSING_MEETING_URL",
      "Tautan rapat virtual wajib diisi untuk acara hibrida.",
    );
  }

  const patch: Partial<typeof communityEvents.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (input.title !== undefined) patch.title = input.title;
  if (input.description !== undefined) patch.description = input.description;
  if (input.coverUrl !== undefined) patch.coverUrl = input.coverUrl;
  if (input.themePreset !== undefined) patch.themePreset = input.themePreset;
  if (input.eventType !== undefined) patch.eventType = input.eventType;
  if (input.visibility !== undefined) patch.visibility = input.visibility;
  if (input.categoryTag !== undefined) patch.categoryTag = input.categoryTag;
  if (input.hideAddressUntilApproved !== undefined)
    patch.hideAddressUntilApproved = input.hideAddressUntilApproved;
  if (input.bookId !== undefined) patch.bookId = input.bookId;
  if (input.featuredWork !== undefined) patch.featuredWork = input.featuredWork;
  if (input.format !== undefined) patch.format = input.format;
  if (input.timezone !== undefined) patch.timezone = input.timezone;

  if (nextFormat === "online") {
    patch.venueName = null;
    patch.venueAddress = null;
    patch.district = null;
    patch.city = null;
    patch.latitude = null;
    patch.longitude = null;
    patch.onlineMeetingUrl = nextMeetingUrl;
  } else if (nextFormat === "offline") {
    patch.onlineMeetingUrl = null;
    if (input.venueName !== undefined)
      patch.venueName = input.venueName || null;
    if (input.venueAddress !== undefined)
      patch.venueAddress = input.venueAddress || null;
    if (input.district !== undefined) patch.district = input.district || null;
    if (input.city !== undefined) patch.city = input.city || null;
    if (input.latitude !== undefined) patch.latitude = input.latitude;
    if (input.longitude !== undefined) patch.longitude = input.longitude;
  } else {
    if (input.venueName !== undefined)
      patch.venueName = input.venueName || null;
    if (input.venueAddress !== undefined)
      patch.venueAddress = input.venueAddress || null;
    if (input.district !== undefined) patch.district = input.district || null;
    if (input.city !== undefined) patch.city = input.city || null;
    if (input.latitude !== undefined) patch.latitude = input.latitude;
    if (input.longitude !== undefined) patch.longitude = input.longitude;
    if (input.onlineMeetingUrl !== undefined)
      patch.onlineMeetingUrl = input.onlineMeetingUrl || null;
  }

  if (input.startsAt !== undefined) patch.startsAt = nextStartsAt;
  if (input.endsAt !== undefined) patch.endsAt = nextEndsAt;
  if (input.capacity !== undefined) patch.capacity = input.capacity;
  if (input.coHosts !== undefined) patch.coHosts = input.coHosts;
  if (input.logisticsNotes !== undefined)
    patch.logisticsNotes = input.logisticsNotes || null;
  if (input.requiresApproval !== undefined)
    patch.requiresApproval = input.requiresApproval;
  if (input.allowWaitlist !== undefined)
    patch.allowWaitlist = input.allowWaitlist;

  await db
    .update(communityEvents)
    .set(patch)
    .where(eq(communityEvents.id, event.id));

  return (await getEventBySlug(slug, hostUserId, userRole))!;
}

export async function deleteEvent(
  slug: string,
  hostUserId: string,
  userRole: string = "user",
): Promise<{ success: boolean; message: string }> {
  const [event] = await db
    .select({ id: communityEvents.id, calendarId: communityEvents.calendarId })
    .from(communityEvents)
    .where(eq(communityEvents.slug, slug))
    .limit(1);

  if (!event) {
    throw new HttpError(404, "EVENT_NOT_FOUND", "Acara tidak ditemukan.");
  }

  const canManage = await isCalendarManager(
    event.calendarId,
    hostUserId,
    userRole,
  );
  if (!canManage) {
    throw new HttpError(
      403,
      "FORBIDDEN",
      "Hanya pengelola kalender yang dapat menghapus acara.",
    );
  }

  await db.delete(communityEvents).where(eq(communityEvents.id, event.id));

  return { success: true, message: "Acara berhasil dihapus." };
}

export async function joinCalendar(
  userId: string,
  slug: string,
): Promise<{ success: boolean; role: string }> {
  const [cal] = await db
    .select({ id: communityCalendars.id })
    .from(communityCalendars)
    .where(eq(communityCalendars.slug, slug))
    .limit(1);

  if (!cal) {
    throw new HttpError(
      404,
      "CALENDAR_NOT_FOUND",
      "Kalender komunitas tidak ditemukan.",
    );
  }

  const [existingMember] = await db
    .select({ role: communityCalendarMembers.role })
    .from(communityCalendarMembers)
    .where(
      and(
        eq(communityCalendarMembers.calendarId, cal.id),
        eq(communityCalendarMembers.userId, userId),
      ),
    )
    .limit(1);

  if (existingMember) {
    throw new HttpError(
      400,
      "ALREADY_A_MEMBER",
      "Anda sudah bergabung dengan komunitas ini.",
    );
  }

  await db.insert(communityCalendarMembers).values({
    calendarId: cal.id,
    userId,
    role: "member",
  });

  return { success: true, role: "member" };
}

export async function leaveCalendar(
  userId: string,
  slug: string,
): Promise<{ success: boolean; message: string }> {
  const [cal] = await db
    .select({ id: communityCalendars.id })
    .from(communityCalendars)
    .where(eq(communityCalendars.slug, slug))
    .limit(1);

  if (!cal) {
    throw new HttpError(
      404,
      "CALENDAR_NOT_FOUND",
      "Kalender komunitas tidak ditemukan.",
    );
  }

  const [existingMember] = await db
    .select({ role: communityCalendarMembers.role })
    .from(communityCalendarMembers)
    .where(
      and(
        eq(communityCalendarMembers.calendarId, cal.id),
        eq(communityCalendarMembers.userId, userId),
      ),
    )
    .limit(1);

  if (!existingMember) {
    throw new HttpError(
      400,
      "NOT_A_MEMBER",
      "Anda belum bergabung dengan komunitas ini.",
    );
  }

  if (existingMember.role === "owner") {
    throw new HttpError(
      400,
      "OWNER_CANNOT_LEAVE",
      "Pemilik komunitas tidak dapat keluar tanpa mentransfer kepemilikan.",
    );
  }

  await db
    .delete(communityCalendarMembers)
    .where(
      and(
        eq(communityCalendarMembers.calendarId, cal.id),
        eq(communityCalendarMembers.userId, userId),
      ),
    );

  return {
    success: true,
    message: "Berhasil keluar dari keanggotaan komunitas.",
  };
}

type CalendarTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function requireCalendarMemberContext(
  tx: CalendarTx,
  slug: string,
  actorUserId: string,
) {
  const [cal] = await tx
    .select({ id: communityCalendars.id })
    .from(communityCalendars)
    .where(eq(communityCalendars.slug, slug))
    .limit(1);

  if (!cal) {
    throw new HttpError(
      404,
      "CALENDAR_NOT_FOUND",
      "Kalender komunitas tidak ditemukan.",
    );
  }

  const members = await tx
    .select()
    .from(communityCalendarMembers)
    .where(eq(communityCalendarMembers.calendarId, cal.id))
    .for("update");

  const actor = members.find((m) => m.userId === actorUserId);
  if (!actor || (actor.role !== "owner" && actor.role !== "admin")) {
    throw new HttpError(
      403,
      "FORBIDDEN",
      "Hanya pemilik atau pengurus komunitas yang dapat mengelola tim host.",
    );
  }

  return { cal, members, actor };
}

export async function addCalendarMember(
  actorUserId: string,
  slug: string,
  input: AddCalendarMemberOutput,
): Promise<CommunityCalendarMemberDto> {
  const normalizedIdentifier = input.identifier
    .trim()
    .replace(/^@/, "")
    .toLowerCase();

  if (!normalizedIdentifier) {
    throw new HttpError(
      404,
      "USER_NOT_FOUND",
      "Pengguna dengan email atau username tersebut tidak ditemukan.",
    );
  }

  return await db.transaction(async (tx) => {
    const { cal, members, actor } = await requireCalendarMemberContext(
      tx,
      slug,
      actorUserId,
    );

    if (input.role === "admin" && actor.role !== "owner") {
      throw new HttpError(
        403,
        "FORBIDDEN",
        "Hanya pemilik komunitas yang dapat menambahkan atau mengangkat Host Pengelola (Admin).",
      );
    }

    const [targetUser] = await tx
      .select({
        id: user.id,
        name: user.name,
        username: user.username,
        image: user.image,
      })
      .from(user)
      .where(
        or(
          eq(sql`lower(${user.email})`, normalizedIdentifier),
          eq(sql`lower(${user.username})`, normalizedIdentifier),
        ),
      )
      .limit(1);

    if (!targetUser) {
      throw new HttpError(
        404,
        "USER_NOT_FOUND",
        "Pengguna dengan email atau username tersebut tidak ditemukan.",
      );
    }

    const existing = members.find((m) => m.userId === targetUser.id);
    if (existing) {
      if (existing.role === "owner") {
        throw new HttpError(
          400,
          "CANNOT_MODIFY_OWNER",
          "Peran pemilik komunitas tidak dapat diubah melalui menu ini.",
        );
      }
      if (existing.role === input.role) {
        throw new HttpError(
          409,
          "MEMBER_ALREADY_EXISTS",
          "Pengguna tersebut sudah memiliki peran yang sama di komunitas ini.",
        );
      }
      if (existing.role === "admin" && actor.role !== "owner") {
        throw new HttpError(
          403,
          "FORBIDDEN",
          "Hanya pemilik komunitas yang dapat mengubah peran pengurus admin.",
        );
      }

      const [promoted] = await tx
        .update(communityCalendarMembers)
        .set({ role: input.role })
        .where(eq(communityCalendarMembers.id, existing.id))
        .returning();

      return {
        id: promoted.id,
        userId: promoted.userId,
        name: targetUser.name,
        username: targetUser.username,
        image: targetUser.image,
        role: promoted.role,
        createdAt: promoted.createdAt.toISOString(),
      };
    }

    const [inserted] = await tx
      .insert(communityCalendarMembers)
      .values({
        calendarId: cal.id,
        userId: targetUser.id,
        role: input.role,
      })
      .returning();

    return {
      id: inserted.id,
      userId: inserted.userId,
      name: targetUser.name,
      username: targetUser.username,
      image: targetUser.image,
      role: inserted.role,
      createdAt: inserted.createdAt.toISOString(),
    };
  });
}

export async function updateCalendarMemberRole(
  actorUserId: string,
  slug: string,
  memberId: string,
  input: UpdateCalendarMemberInput,
): Promise<CommunityCalendarMemberDto> {
  if (!UUID_REGEX.test(memberId)) {
    throw new HttpError(
      404,
      "MEMBER_NOT_FOUND",
      "Anggota komunitas tidak ditemukan.",
    );
  }

  return await db.transaction(async (tx) => {
    const { cal, members, actor } = await requireCalendarMemberContext(
      tx,
      slug,
      actorUserId,
    );

    const target = members.find((m) => m.id === memberId);
    if (!target) {
      throw new HttpError(
        404,
        "MEMBER_NOT_FOUND",
        "Anggota komunitas tidak ditemukan.",
      );
    }

    if (target.role === "owner") {
      const ownerCount = members.filter((m) => m.role === "owner").length;
      if (ownerCount <= 1) {
        throw new HttpError(
          400,
          "LAST_OWNER_REQUIRED",
          "Komunitas harus memiliki minimal satu pemilik (owner).",
        );
      }
    }

    if (
      (input.role === "admin" ||
        target.role === "admin" ||
        target.role === "owner") &&
      actor.role !== "owner"
    ) {
      throw new HttpError(
        403,
        "FORBIDDEN",
        "Hanya pemilik komunitas yang dapat mengelola peran Host Pengelola (Admin).",
      );
    }

    const [updated] = await tx
      .update(communityCalendarMembers)
      .set({ role: input.role })
      .where(
        and(
          eq(communityCalendarMembers.id, memberId),
          eq(communityCalendarMembers.calendarId, cal.id),
        ),
      )
      .returning();

    const [memberUser] = await tx
      .select({
        name: user.name,
        username: user.username,
        image: user.image,
      })
      .from(user)
      .where(eq(user.id, updated.userId))
      .limit(1);

    return {
      id: updated.id,
      userId: updated.userId,
      name: memberUser?.name ?? "Anggota Komunitas",
      username: memberUser?.username ?? null,
      image: memberUser?.image ?? null,
      role: updated.role,
      createdAt: updated.createdAt.toISOString(),
    };
  });
}

export async function removeCalendarMember(
  actorUserId: string,
  slug: string,
  memberId: string,
): Promise<{ removed: boolean }> {
  if (!UUID_REGEX.test(memberId)) {
    throw new HttpError(
      404,
      "MEMBER_NOT_FOUND",
      "Anggota komunitas tidak ditemukan.",
    );
  }

  return await db.transaction(async (tx) => {
    const { cal, members, actor } = await requireCalendarMemberContext(
      tx,
      slug,
      actorUserId,
    );

    const target = members.find((m) => m.id === memberId);
    if (!target) {
      throw new HttpError(
        404,
        "MEMBER_NOT_FOUND",
        "Anggota komunitas tidak ditemukan.",
      );
    }

    if (target.role === "owner") {
      const ownerCount = members.filter((m) => m.role === "owner").length;
      if (ownerCount <= 1) {
        throw new HttpError(
          400,
          "LAST_OWNER_REQUIRED",
          "Tidak dapat menghapus pemilik terakhir komunitas.",
        );
      }
    }

    if (
      (target.role === "admin" || target.role === "owner") &&
      actor.role !== "owner"
    ) {
      throw new HttpError(
        403,
        "FORBIDDEN",
        "Hanya pemilik komunitas yang dapat menghapus Host Pengelola (Admin).",
      );
    }

    await tx
      .delete(communityCalendarMembers)
      .where(
        and(
          eq(communityCalendarMembers.id, memberId),
          eq(communityCalendarMembers.calendarId, cal.id),
        ),
      );

    return { removed: true };
  });
}

export async function getCommunityWallet(
  userId: string,
  slug: string,
  userRole?: string,
): Promise<CommunityWalletDto> {
  const [cal] = await db
    .select({ id: communityCalendars.id, name: communityCalendars.name })
    .from(communityCalendars)
    .where(eq(communityCalendars.slug, slug))
    .limit(1);

  if (!cal) {
    throw new HttpError(
      404,
      "CALENDAR_NOT_FOUND",
      "Kalender komunitas tidak ditemukan.",
    );
  }

  const isSysAdmin = userRole === "admin";
  const [membership] = await db
    .select({ role: communityCalendarMembers.role })
    .from(communityCalendarMembers)
    .where(
      and(
        eq(communityCalendarMembers.calendarId, cal.id),
        eq(communityCalendarMembers.userId, userId),
      ),
    )
    .limit(1);

  const isLeader =
    membership && (membership.role === "owner" || membership.role === "admin");

  if (!isSysAdmin && !isLeader) {
    throw new HttpError(
      403,
      "FORBIDDEN_CALENDAR_ADMIN",
      "Hanya pemilik atau admin komunitas yang dapat mengakses kas.",
    );
  }

  const ledgers = await db
    .select()
    .from(communityWalletLedgers)
    .where(eq(communityWalletLedgers.calendarId, cal.id))
    .orderBy(desc(communityWalletLedgers.createdAt));

  let balanceIdr = 0;
  let totalAffiliateNakamaIdr = 0;
  let totalAffiliateBookPurchasesIdr = 0;
  let totalPaidEventTicketsIdr = 0;
  let totalPayoutsWithdrawnIdr = 0;

  for (const item of ledgers) {
    balanceIdr += item.amountIdr;
    if (item.entryType === "affiliate_nakama") {
      totalAffiliateNakamaIdr += item.amountIdr;
    } else if (item.entryType === "affiliate_book_purchase") {
      totalAffiliateBookPurchasesIdr += item.amountIdr;
    } else if (item.entryType === "paid_event_ticket") {
      totalPaidEventTicketsIdr += item.amountIdr;
    } else if (item.entryType === "payout_withdrawal") {
      totalPayoutsWithdrawnIdr += Math.abs(item.amountIdr);
    }
  }

  const recentLedgers: CommunityWalletLedgerDto[] = ledgers
    .slice(0, 20)
    .map((l) => ({
      id: l.id,
      calendarId: l.calendarId,
      entryType: l.entryType,
      amountIdr: l.amountIdr,
      sourceOrderId: l.sourceOrderId,
      sourceEventId: l.sourceEventId,
      sourceBookPurchaseId: l.sourceBookPurchaseId,
      description: l.description,
      createdAt: l.createdAt.toISOString(),
    }));

  return {
    calendarId: cal.id,
    calendarName: cal.name,
    balanceIdr,
    totalAffiliateNakamaIdr,
    totalAffiliateBookPurchasesIdr,
    totalPaidEventTicketsIdr,
    totalPayoutsWithdrawnIdr,
    recentLedgers,
  };
}
