import { and, desc, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { db } from "../db";
import {
  books,
  communityCalendars,
  communityCalendarFollowers,
  communityCalendarMembers,
  communityEvents,
  eventReports,
  eventRsvps,
  storeBranches,
  user,
} from "../db/schema";
import { HttpError } from "../lib/http-error";
import { toBookSummary } from "./books.service";
import type {
  CheckInRsvpInput,
  CreateCalendarInput,
  CreateEventInput,
  ListEventsQuery,
  RsvpEventInput,
  UpdateEventInput,
} from "@starter/shared/validators/community";
import type {
  CommunityCalendarDto,
  CommunityEventDetailDto,
  CommunityEventSummaryDto,
  EventAttendeePreviewDto,
  EventRsvpDto,
  PageMeta,
} from "@starter/shared/types";

function toCalendarDto(
  cal: typeof communityCalendars.$inferSelect,
  followerCount = 0,
  isFollowing = false,
  isManager = false,
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
      | "pending"
      | "verified"
      | "trusted"
      | "rejected",
    followerCount,
    isFollowing,
    isManager,
    createdAt: cal.createdAt.toISOString(),
  };
}

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

export async function listCalendars(
  currentUserId?: string,
): Promise<CommunityCalendarDto[]> {
  const cals = await db
    .select()
    .from(communityCalendars)
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
      toCalendarDto(cal, Number(followers[0]?.count || 0), isFollowing, isManager),
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

  return toCalendarDto(
    cal,
    Number(followers[0]?.count || 0),
    isFollowing,
    isManager,
  );
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
    conditions.push(ilike(communityEvents.city, `%${query.city}%`));
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
        },
      };
    }
    const userEventIdsSubquery = db
      .select({ eventId: eventRsvps.eventId })
      .from(eventRsvps)
      .where(
        and(
          eq(eventRsvps.userId, currentUserId),
          inArray(eventRsvps.status, ["going", "pending_approval", "waitlisted"]),
        ),
      );
    conditions.push(inArray(communityEvents.id, userEventIdsSubquery));
  } else if (query.filter === "hosting") {
    if (!currentUserId) {
      return {
        data: [],
        meta: {
          limit: query.limit,
          offset: query.offset,
          hasMore: false,
        },
      };
    }
    conditions.push(
      sql`EXISTS (
        SELECT 1 FROM ${communityCalendarMembers}
        WHERE ${communityCalendarMembers.calendarId} = ${communityEvents.calendarId}
          AND ${communityCalendarMembers.userId} = ${currentUserId}
          AND ${communityCalendarMembers.role} IN ('owner', 'admin')
      )`,
    );
  }

  // Filter published for public viewing, unless query is hosting or viewer manages calendar
  if (query.filter !== "hosting") {
    if (currentUserId) {
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
    } else {
      conditions.push(eq(communityEvents.status, "published"));
    }
  }

  const rows = await db
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
    .where(and(...conditions))
    .orderBy(
      query.filter === "past"
        ? desc(communityEvents.endsAt)
        : communityEvents.startsAt,
      communityEvents.id,
    )
    .limit(query.limit + 1)
    .offset(query.offset);

  const hasMore = rows.length > query.limit;
  const items = rows.slice(0, query.limit);

  const data: CommunityEventSummaryDto[] = [];
  for (const { event, calendar, book } of items) {
    // Count going attendees
    const [attCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(eventRsvps)
      .where(
        and(eq(eventRsvps.eventId, event.id), eq(eventRsvps.status, "going")),
      );

    // Previews (up to 5 going attendees)
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
      .limit(5);

    let userRsvpStatus: CommunityEventSummaryDto["userRsvpStatus"] = null;
    let isManager = false;

    if (currentUserId) {
      const [rsvp] = await db
        .select({ status: eventRsvps.status })
        .from(eventRsvps)
        .where(
          and(
            eq(eventRsvps.eventId, event.id),
            eq(eventRsvps.userId, currentUserId),
          ),
        )
        .limit(1);
      userRsvpStatus = (rsvp?.status as any) || null;
      isManager = await isCalendarManager(calendar.id, currentUserId, currentUserRole);
    }

    let pendingRsvpCount = 0;
    if (isManager) {
      const [pCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(eventRsvps)
        .where(
          and(
            eq(eventRsvps.eventId, event.id),
            eq(eventRsvps.status, "pending_approval"),
          ),
        );
      pendingRsvpCount = Number(pCount?.count || 0);
    }

    const isAddressHidden =
      event.hideAddressUntilApproved &&
      userRsvpStatus !== "going" &&
      !isManager;

    data.push({
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
      startsAt: event.startsAt.toISOString(),
      endsAt: event.endsAt.toISOString(),
      timezone: event.timezone,
      capacity: event.capacity,
      requiresApproval: event.requiresApproval,
      allowWaitlist: event.allowWaitlist,
      status: event.status,
      attendeeCount: Number(attCount?.count || 0),
      attendeesPreview: previews,
      userRsvpStatus,
      canManage: isManager,
      pendingRsvpCount,
    });
  }

  return {
    data,
    meta: {
      limit: query.limit,
      offset: query.offset,
      hasMore,
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

    if (r) {
      userRsvp = {
        ...r,
        status: r.status as any,
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
      and(
        eq(eventRsvps.eventId, event.id),
        eq(eventRsvps.status, "going"),
      ),
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
    status: row.status as any,
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
    .where(
      and(
        eq(eventRsvps.eventId, event.id),
        eq(eventRsvps.userId, userId),
      ),
    )
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

  const canManage = await isCalendarManager(event.calendarId, hostUserId, userRole);
  if (!canManage) {
    throw new HttpError(403, "FORBIDDEN", "Hanya pengelola yang dapat menyetujui pendaftar.");
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
    status: row.status as any,
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

  const canManage = await isCalendarManager(event.calendarId, hostUserId, userRole);
  if (!canManage) {
    throw new HttpError(403, "FORBIDDEN", "Hanya pengelola yang dapat mencatat kehadiran.");
  }

  const condition = input.checkinCode
    ? eq(eventRsvps.checkinCode, input.checkinCode)
    : eq(eventRsvps.userId, input.userId!);

  const [row] = await db
    .update(eventRsvps)
    .set({
      checkedInAt: new Date(),
      checkedInByUserId: hostUserId,
      updatedAt: new Date(),
    })
    .where(and(eq(eventRsvps.eventId, event.id), condition))
    .returning();

  if (!row) {
    throw new HttpError(404, "RSVP_NOT_FOUND", "Pendaftaran peserta tidak ditemukan.");
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
    status: row.status as any,
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

export async function getLocationSuggestions(): Promise<{
  recentVenues: {
    venueName: string;
    venueAddress: string;
    district: string | null;
    city: string | null;
    latitude: number | null;
    longitude: number | null;
  }[];
  partnerVenues: {
    branchName: string;
    address: string;
    city: string;
    latitude: number;
    longitude: number;
  }[];
}> {
  const branches = await db
    .select({
      branchName: storeBranches.branchName,
      address: storeBranches.address,
      city: storeBranches.city,
      latitude: storeBranches.latitude,
      longitude: storeBranches.longitude,
    })
    .from(storeBranches)
    .limit(10);

  const venues = await db
    .selectDistinctOn([communityEvents.venueName], {
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

  return {
    recentVenues: venues.filter((v): v is typeof v & { venueName: string; venueAddress: string } => !!v.venueName && !!v.venueAddress),
    partnerVenues: branches,
  };
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

  const canManage = await isCalendarManager(event.calendarId, hostUserId, userRole);
  if (!canManage) {
    throw new HttpError(403, "FORBIDDEN", "Hanya pengelola kalender yang dapat melihat daftar peserta lengkap.");
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
    status: r.status as any,
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

  const canManage = await isCalendarManager(event.calendarId, hostUserId, userRole);
  if (!canManage) {
    throw new HttpError(403, "FORBIDDEN", "Hanya pengelola yang dapat menolak pendaftar.");
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
    status: row.status as any,
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
    .select({ id: communityEvents.id, calendarId: communityEvents.calendarId })
    .from(communityEvents)
    .where(eq(communityEvents.slug, slug))
    .limit(1);

  if (!event) {
    throw new HttpError(404, "EVENT_NOT_FOUND", "Acara tidak ditemukan.");
  }

  const canManage = await isCalendarManager(event.calendarId, hostUserId, userRole);
  if (!canManage) {
    throw new HttpError(403, "FORBIDDEN", "Hanya pengelola kalender yang dapat memperbarui acara.");
  }

  const patch: Record<string, any> = { updatedAt: new Date() };
  if (input.title !== undefined) patch.title = input.title;
  if (input.description !== undefined) patch.description = input.description;
  if (input.coverUrl !== undefined) patch.coverUrl = input.coverUrl;
  if (input.themePreset !== undefined) patch.themePreset = input.themePreset;
  if (input.format !== undefined) patch.format = input.format;
  if (input.venueName !== undefined) patch.venueName = input.venueName;
  if (input.venueAddress !== undefined) patch.venueAddress = input.venueAddress;
  if (input.district !== undefined) patch.district = input.district;
  if (input.city !== undefined) patch.city = input.city;
  if (input.latitude !== undefined) patch.latitude = input.latitude;
  if (input.longitude !== undefined) patch.longitude = input.longitude;
  if (input.onlineMeetingUrl !== undefined) patch.onlineMeetingUrl = input.onlineMeetingUrl || null;
  if (input.startsAt !== undefined) patch.startsAt = new Date(input.startsAt);
  if (input.endsAt !== undefined) patch.endsAt = new Date(input.endsAt);
  if (input.capacity !== undefined) patch.capacity = input.capacity || null;
  if (input.requiresApproval !== undefined) patch.requiresApproval = input.requiresApproval;
  if (input.allowWaitlist !== undefined) patch.allowWaitlist = input.allowWaitlist;

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

  const canManage = await isCalendarManager(event.calendarId, hostUserId, userRole);
  if (!canManage) {
    throw new HttpError(403, "FORBIDDEN", "Hanya pengelola kalender yang dapat menghapus acara.");
  }

  await db.delete(communityEvents).where(eq(communityEvents.id, event.id));

  return { success: true, message: "Acara berhasil dihapus." };
}
