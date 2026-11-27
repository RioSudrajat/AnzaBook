import { randomBytes } from "node:crypto";
import {
  and,
  asc,
  between,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  or,
  sql,
} from "drizzle-orm";
import type {
  ListSpotsResponseDto,
  ReadingSpotDetailDto,
  ReadingSpotReportDto,
  ReadingSpotReviewDto,
  ReadingSpotSummaryDto,
  ReadingSpotUpcomingEventDto,
  SpotCitySummaryDto,
  SpotGeocodeResultDto,
  SpotNearbyMatchDto,
  SpotReviewTag,
} from "@starter/shared/types";
import {
  INDONESIA_BBOX,
  expandSpotCityFilterValues,
  haversineDistanceMeters,
  type CreateSpotReportInput,
  type CreateSpotSubmission,
  type GeocodeSpotsQuery,
  type ListSpotsQuery,
  type NearbyCheckQuery,
  type UpsertSpotReview,
} from "@starter/shared/validators/spots";
import { db } from "../db";
import {
  communityCalendarMembers,
  communityCalendars,
  communityEvents,
  readingSpotBookmarks,
  readingSpotReports,
  readingSpotReviews,
  readingSpots,
  storeBranches,
  user,
} from "../db/schema";
import { HttpError } from "../lib/http-error";

const GEOCODE_CACHE_TTL_MS = 10 * 60 * 1000;
const GEOCODE_CACHE_MAX_ENTRIES = 200;

type GeocodeCacheEntry = {
  expiresAt: number;
  results: SpotGeocodeResultDto[];
};

const geocodeCache = new Map<string, GeocodeCacheEntry>();

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .trim();
}

function boundingBoxFromRadiusKm(lat: number, lng: number, radiusKm: number) {
  const latDelta = radiusKm / 111.32;
  const cosLat = Math.max(0.1, Math.cos((lat * Math.PI) / 180));
  const lngDelta = radiusKm / (111.32 * cosLat);
  return {
    minLat: Math.max(-90, lat - latDelta),
    maxLat: Math.min(90, lat + latDelta),
    minLng: Math.max(-180, lng - lngDelta),
    maxLng: Math.min(180, lng + lngDelta),
  };
}

function normalizeNameTokens(name: string): Set<string> {
  return new Set(
    name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length >= 2),
  );
}

function fuzzyNameScore(a: string, b: string): number {
  const tokensA = normalizeNameTokens(a);
  const tokensB = normalizeNameTokens(b);
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let overlap = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) overlap++;
  }
  return overlap / Math.max(tokensA.size, tokensB.size);
}

export function toSpotSummary(
  row: typeof readingSpots.$inferSelect,
  opts?: { distanceMeters?: number | null; isBookmarked?: boolean },
): ReadingSpotSummaryDto {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category,
    description: row.description,
    address: row.address,
    district: row.district,
    city: row.city,
    province: row.province,
    latitude: row.latitude,
    longitude: row.longitude,
    googleMapsUrl: row.googleMapsUrl,
    googlePlaceId: row.googlePlaceId,
    instagramHandle: row.instagramHandle,
    websiteUrl: row.websiteUrl,
    openingHoursText: row.openingHoursText,
    priceRange: row.priceRange,
    noiseLevel: row.noiseLevel,
    facilities: row.facilities ?? {},
    coverUrl: row.coverUrl,
    verifiedBadge: row.verifiedBadge,
    linkedBranchId: row.linkedBranchId,
    linkedCalendarId: row.linkedCalendarId,
    ratingAvg: Number(row.ratingAvg ?? 0),
    ratingCount: row.ratingCount,
    bookmarkCount: row.bookmarkCount,
    ...(opts?.distanceMeters !== undefined
      ? { distanceMeters: opts.distanceMeters }
      : {}),
    ...(opts?.isBookmarked !== undefined
      ? { isBookmarked: opts.isBookmarked }
      : {}),
  };
}

export async function listPublishedSpots(
  query: ListSpotsQuery,
  viewerUserId?: string,
): Promise<ListSpotsResponseDto> {
  const conditions = [eq(readingSpots.status, "published")];

  if (
    query.minLat !== undefined &&
    query.maxLat !== undefined &&
    query.minLng !== undefined &&
    query.maxLng !== undefined
  ) {
    conditions.push(
      between(readingSpots.latitude, query.minLat, query.maxLat),
      between(readingSpots.longitude, query.minLng, query.maxLng),
    );
  }

  if (
    query.lat !== undefined &&
    query.lng !== undefined &&
    query.radiusKm !== undefined
  ) {
    const bbox = boundingBoxFromRadiusKm(query.lat, query.lng, query.radiusKm);
    conditions.push(
      between(readingSpots.latitude, bbox.minLat, bbox.maxLat),
      between(readingSpots.longitude, bbox.minLng, bbox.maxLng),
    );
  }

  if (query.city) {
    const cityCandidates = expandSpotCityFilterValues(query.city).map((c) =>
      c.toLowerCase(),
    );
    if (cityCandidates.length > 0) {
      conditions.push(
        inArray(sql`lower(${readingSpots.city})`, cityCandidates),
      );
    }
  }

  if (query.province) {
    conditions.push(
      eq(sql`lower(${readingSpots.province})`, query.province.toLowerCase()),
    );
  }

  if (query.category) {
    conditions.push(eq(readingSpots.category, query.category));
  }

  if (query.facility) {
    conditions.push(
      sql`(${readingSpots.facilities} ->> ${query.facility})::boolean = true`,
    );
  }

  if (query.q) {
    const pattern = `%${escapeLikePattern(query.q)}%`;
    conditions.push(
      or(
        ilike(readingSpots.name, pattern),
        ilike(readingSpots.address, pattern),
        ilike(readingSpots.city, pattern),
        ilike(readingSpots.district, pattern),
      )!,
    );
  }

  const rows = await db
    .select()
    .from(readingSpots)
    .where(and(...conditions));

  const hasCoords = query.lat !== undefined && query.lng !== undefined;
  const maxRadiusMeters =
    query.radiusKm !== undefined ? query.radiusKm * 1000 : undefined;

  const scored = rows
    .map((row) => {
      const distanceMeters = hasCoords
        ? Math.round(
            haversineDistanceMeters(
              query.lat!,
              query.lng!,
              row.latitude,
              row.longitude,
            ),
          )
        : null;
      return { row, distanceMeters };
    })
    .filter((item) => {
      if (maxRadiusMeters !== undefined && item.distanceMeters !== null) {
        return item.distanceMeters <= maxRadiusMeters;
      }
      return true;
    });

  scored.sort((a, b) => {
    if (query.sort === "nearest" && hasCoords) {
      const diff =
        (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity);
      if (diff !== 0) return diff;
    } else if (query.sort === "popular") {
      const popA = a.row.bookmarkCount + a.row.ratingCount;
      const popB = b.row.bookmarkCount + b.row.ratingCount;
      if (popB !== popA) return popB - popA;
    }

    if (b.row.ratingAvg !== a.row.ratingAvg) {
      return b.row.ratingAvg - a.row.ratingAvg;
    }
    if (b.row.ratingCount !== a.row.ratingCount) {
      return b.row.ratingCount - a.row.ratingCount;
    }
    return a.row.name.localeCompare(b.row.name, "id");
  });

  const total = scored.length;
  const paged = scored.slice(query.offset, query.offset + query.limit);

  let bookmarkedIds = new Set<string>();
  if (viewerUserId && paged.length > 0) {
    const bookmarkRows = await db
      .select({ spotId: readingSpotBookmarks.spotId })
      .from(readingSpotBookmarks)
      .where(
        and(
          eq(readingSpotBookmarks.userId, viewerUserId),
          inArray(
            readingSpotBookmarks.spotId,
            paged.map((item) => item.row.id),
          ),
        ),
      );
    bookmarkedIds = new Set(bookmarkRows.map((b) => b.spotId));
  }

  return {
    data: paged.map(({ row, distanceMeters }) =>
      toSpotSummary(row, {
        distanceMeters,
        isBookmarked: viewerUserId ? bookmarkedIds.has(row.id) : false,
      }),
    ),
    meta: {
      total,
      limit: query.limit,
      offset: query.offset,
    },
  };
}

export async function listSpotCities(): Promise<SpotCitySummaryDto[]> {
  const rows = await db
    .select({
      city: readingSpots.city,
      province: readingSpots.province,
      count: sql<number>`count(*)::int`,
      latitude: sql<number>`avg(${readingSpots.latitude})::double precision`,
      longitude: sql<number>`avg(${readingSpots.longitude})::double precision`,
    })
    .from(readingSpots)
    .where(eq(readingSpots.status, "published"))
    .groupBy(readingSpots.city, readingSpots.province)
    .orderBy(desc(sql`count(*)`), asc(readingSpots.city));

  return rows.map((row) => ({
    city: row.city,
    province: row.province,
    count: Number(row.count),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
  }));
}

export async function getSpotBySlug(
  slug: string,
  viewerUserId?: string,
  viewerRole?: string,
): Promise<ReadingSpotDetailDto | null> {
  const [spot] = await db
    .select()
    .from(readingSpots)
    .where(eq(readingSpots.slug, slug))
    .limit(1);

  if (!spot) return null;

  const canViewNonPublished =
    viewerRole === "admin" ||
    (viewerUserId !== undefined && spot.submittedByUserId === viewerUserId);

  if (spot.status !== "published" && !canViewNonPublished) {
    return null;
  }

  let linkedBranchName: string | null = null;
  if (spot.linkedBranchId) {
    const [branch] = await db
      .select({ branchName: storeBranches.branchName })
      .from(storeBranches)
      .where(eq(storeBranches.id, spot.linkedBranchId))
      .limit(1);
    linkedBranchName = branch?.branchName ?? null;
  }

  let linkedCalendarSlug: string | null = null;
  let linkedCalendarName: string | null = null;
  if (spot.linkedCalendarId) {
    const [cal] = await db
      .select({
        slug: communityCalendars.slug,
        name: communityCalendars.name,
      })
      .from(communityCalendars)
      .where(eq(communityCalendars.id, spot.linkedCalendarId))
      .limit(1);
    linkedCalendarSlug = cal?.slug ?? null;
    linkedCalendarName = cal?.name ?? null;
  }

  const nearbyEventBox = boundingBoxFromRadiusKm(
    spot.latitude,
    spot.longitude,
    0.2,
  );
  const eventMatchConditions = [
    and(
      between(
        communityEvents.latitude,
        nearbyEventBox.minLat,
        nearbyEventBox.maxLat,
      ),
      between(
        communityEvents.longitude,
        nearbyEventBox.minLng,
        nearbyEventBox.maxLng,
      ),
    ),
  ];
  if (spot.linkedCalendarId) {
    eventMatchConditions.push(
      eq(communityEvents.calendarId, spot.linkedCalendarId),
    );
  }

  const candidateEvents = await db
    .select({
      id: communityEvents.id,
      slug: communityEvents.slug,
      title: communityEvents.title,
      startsAt: communityEvents.startsAt,
      calendarId: communityEvents.calendarId,
      latitude: communityEvents.latitude,
      longitude: communityEvents.longitude,
    })
    .from(communityEvents)
    .where(
      and(
        eq(communityEvents.status, "published"),
        gte(communityEvents.startsAt, new Date()),
        or(...eventMatchConditions),
      ),
    )
    .orderBy(asc(communityEvents.startsAt))
    .limit(15);

  const upcomingEvents: ReadingSpotUpcomingEventDto[] = candidateEvents
    .filter((ev) => {
      if (spot.linkedCalendarId && ev.calendarId === spot.linkedCalendarId) {
        return true;
      }
      if (ev.latitude !== null && ev.longitude !== null) {
        return (
          haversineDistanceMeters(
            spot.latitude,
            spot.longitude,
            ev.latitude,
            ev.longitude,
          ) <= 150
        );
      }
      return false;
    })
    .slice(0, 5)
    .map((ev) => ({
      id: ev.id,
      slug: ev.slug,
      title: ev.title,
      startAt: ev.startsAt.toISOString(),
    }));

  let isBookmarked = false;
  let myReview: ReadingSpotReviewDto | null = null;

  if (viewerUserId) {
    const [bookmarkRow] = await db
      .select({ id: readingSpotBookmarks.id })
      .from(readingSpotBookmarks)
      .where(
        and(
          eq(readingSpotBookmarks.spotId, spot.id),
          eq(readingSpotBookmarks.userId, viewerUserId),
        ),
      )
      .limit(1);
    isBookmarked = Boolean(bookmarkRow);

    const [reviewRow] = await db
      .select({
        review: readingSpotReviews,
        userName: user.name,
        userUsername: user.username,
        userImage: user.image,
      })
      .from(readingSpotReviews)
      .innerJoin(user, eq(readingSpotReviews.userId, user.id))
      .where(
        and(
          eq(readingSpotReviews.spotId, spot.id),
          eq(readingSpotReviews.userId, viewerUserId),
        ),
      )
      .limit(1);

    if (reviewRow) {
      myReview = {
        id: reviewRow.review.id,
        spotId: reviewRow.review.spotId,
        userId: reviewRow.review.userId,
        userName: reviewRow.userName,
        userUsername: reviewRow.userUsername,
        userImage: reviewRow.userImage,
        rating: reviewRow.review.rating,
        content: reviewRow.review.content,
        tags: reviewRow.review.tags ?? [],
        helpfulCount: reviewRow.review.helpfulCount,
        createdAt: reviewRow.review.createdAt.toISOString(),
        updatedAt: reviewRow.review.updatedAt.toISOString(),
      };
    }
  }

  return {
    ...toSpotSummary(spot, { isBookmarked }),
    linkedBranchName,
    linkedCalendarSlug,
    linkedCalendarName,
    upcomingEvents,
    myReview,
    status: spot.status,
    source: spot.source,
    rejectionReason: canViewNonPublished ? spot.rejectionReason : null,
  };
}

export async function listSpotReviews(
  slug: string,
  limit = 20,
  offset = 0,
): Promise<{
  data: ReadingSpotReviewDto[];
  meta: { limit: number; offset: number; hasMore: boolean };
  summary: {
    ratingAvg: number;
    ratingCount: number;
    distribution: Record<number, number>;
    tagCounts: Partial<Record<SpotReviewTag, number>>;
  };
}> {
  const [spot] = await db
    .select({
      id: readingSpots.id,
      ratingAvg: readingSpots.ratingAvg,
      ratingCount: readingSpots.ratingCount,
    })
    .from(readingSpots)
    .where(
      and(eq(readingSpots.slug, slug), eq(readingSpots.status, "published")),
    )
    .limit(1);

  if (!spot) {
    throw new HttpError(404, "SPOT_NOT_FOUND", "Sudut baca tidak ditemukan.");
  }

  const rows = await db
    .select({
      review: readingSpotReviews,
      userName: user.name,
      userUsername: user.username,
      userImage: user.image,
    })
    .from(readingSpotReviews)
    .innerJoin(user, eq(readingSpotReviews.userId, user.id))
    .where(eq(readingSpotReviews.spotId, spot.id))
    .orderBy(desc(readingSpotReviews.createdAt))
    .limit(limit + 1)
    .offset(offset);

  const hasMore = rows.length > limit;
  const pageRows = rows.slice(0, limit);

  const allStats = await db
    .select({
      rating: readingSpotReviews.rating,
      tags: readingSpotReviews.tags,
    })
    .from(readingSpotReviews)
    .where(eq(readingSpotReviews.spotId, spot.id));

  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const tagCounts: Partial<Record<SpotReviewTag, number>> = {};

  for (const stat of allStats) {
    if (stat.rating >= 1 && stat.rating <= 5) {
      distribution[stat.rating] = (distribution[stat.rating] ?? 0) + 1;
    }
    for (const tag of stat.tags ?? []) {
      tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
    }
  }

  return {
    data: pageRows.map((row) => ({
      id: row.review.id,
      spotId: row.review.spotId,
      userId: row.review.userId,
      userName: row.userName,
      userUsername: row.userUsername,
      userImage: row.userImage,
      rating: row.review.rating,
      content: row.review.content,
      tags: row.review.tags ?? [],
      helpfulCount: row.review.helpfulCount,
      createdAt: row.review.createdAt.toISOString(),
      updatedAt: row.review.updatedAt.toISOString(),
    })),
    meta: { limit, offset, hasMore },
    summary: {
      ratingAvg: Number(spot.ratingAvg ?? 0),
      ratingCount: spot.ratingCount,
      distribution,
      tagCounts,
    },
  };
}

export async function upsertMySpotReview(
  userId: string,
  slug: string,
  input: UpsertSpotReview,
): Promise<{
  review: ReadingSpotReviewDto;
  ratingAvg: number;
  ratingCount: number;
}> {
  return await db.transaction(async (tx) => {
    const [spot] = await tx
      .select({ id: readingSpots.id, status: readingSpots.status })
      .from(readingSpots)
      .where(eq(readingSpots.slug, slug))
      .for("update")
      .limit(1);

    if (!spot || spot.status !== "published") {
      throw new HttpError(404, "SPOT_NOT_FOUND", "Sudut baca tidak ditemukan.");
    }

    const now = new Date();
    const [saved] = await tx
      .insert(readingSpotReviews)
      .values({
        spotId: spot.id,
        userId,
        rating: input.rating,
        content: input.content,
        tags: input.tags,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [readingSpotReviews.spotId, readingSpotReviews.userId],
        set: {
          rating: input.rating,
          content: input.content,
          tags: input.tags,
          updatedAt: now,
        },
      })
      .returning();

    const [agg] = await tx
      .select({
        avgRating: sql<number>`coalesce(avg(${readingSpotReviews.rating}), 0)::double precision`,
        countRating: sql<number>`count(*)::int`,
      })
      .from(readingSpotReviews)
      .where(eq(readingSpotReviews.spotId, spot.id));

    const ratingCount = Number(agg?.countRating ?? 0);
    const ratingAvg =
      ratingCount > 0 ? Number(Number(agg?.avgRating ?? 0).toFixed(2)) : 0;

    await tx
      .update(readingSpots)
      .set({ ratingAvg, ratingCount, updatedAt: now })
      .where(eq(readingSpots.id, spot.id));

    const [author] = await tx
      .select({
        name: user.name,
        username: user.username,
        image: user.image,
      })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    return {
      review: {
        id: saved.id,
        spotId: saved.spotId,
        userId: saved.userId,
        userName: author?.name ?? "Pembaca",
        userUsername: author?.username ?? null,
        userImage: author?.image ?? null,
        rating: saved.rating,
        content: saved.content,
        tags: saved.tags ?? [],
        helpfulCount: saved.helpfulCount,
        createdAt: saved.createdAt.toISOString(),
        updatedAt: saved.updatedAt.toISOString(),
      },
      ratingAvg,
      ratingCount,
    };
  });
}

export async function deleteMySpotReview(
  userId: string,
  slug: string,
): Promise<{ deleted: boolean; ratingAvg: number; ratingCount: number }> {
  return await db.transaction(async (tx) => {
    const [spot] = await tx
      .select({ id: readingSpots.id, status: readingSpots.status })
      .from(readingSpots)
      .where(eq(readingSpots.slug, slug))
      .for("update")
      .limit(1);

    if (!spot || spot.status !== "published") {
      throw new HttpError(404, "SPOT_NOT_FOUND", "Sudut baca tidak ditemukan.");
    }

    const [deleted] = await tx
      .delete(readingSpotReviews)
      .where(
        and(
          eq(readingSpotReviews.spotId, spot.id),
          eq(readingSpotReviews.userId, userId),
        ),
      )
      .returning({ id: readingSpotReviews.id });

    if (!deleted) {
      throw new HttpError(
        404,
        "REVIEW_NOT_FOUND",
        "Ulasan Anda pada sudut baca ini tidak ditemukan.",
      );
    }

    const [agg] = await tx
      .select({
        avgRating: sql<number>`coalesce(avg(${readingSpotReviews.rating}), 0)::double precision`,
        countRating: sql<number>`count(*)::int`,
      })
      .from(readingSpotReviews)
      .where(eq(readingSpotReviews.spotId, spot.id));

    const ratingCount = Number(agg?.countRating ?? 0);
    const ratingAvg =
      ratingCount > 0 ? Number(Number(agg?.avgRating ?? 0).toFixed(2)) : 0;

    await tx
      .update(readingSpots)
      .set({ ratingAvg, ratingCount, updatedAt: new Date() })
      .where(eq(readingSpots.id, spot.id));

    return { deleted: true, ratingAvg, ratingCount };
  });
}

export async function toggleSpotBookmark(
  userId: string,
  slug: string,
): Promise<{ isBookmarked: boolean; bookmarkCount: number }> {
  return await db.transaction(async (tx) => {
    const [spot] = await tx
      .select({ id: readingSpots.id, status: readingSpots.status })
      .from(readingSpots)
      .where(eq(readingSpots.slug, slug))
      .for("update")
      .limit(1);

    if (!spot || spot.status !== "published") {
      throw new HttpError(404, "SPOT_NOT_FOUND", "Sudut baca tidak ditemukan.");
    }

    const [existing] = await tx
      .select({ id: readingSpotBookmarks.id })
      .from(readingSpotBookmarks)
      .where(
        and(
          eq(readingSpotBookmarks.spotId, spot.id),
          eq(readingSpotBookmarks.userId, userId),
        ),
      )
      .limit(1);

    let isBookmarked: boolean;
    if (existing) {
      await tx
        .delete(readingSpotBookmarks)
        .where(eq(readingSpotBookmarks.id, existing.id));
      isBookmarked = false;
    } else {
      await tx.insert(readingSpotBookmarks).values({
        spotId: spot.id,
        userId,
      });
      isBookmarked = true;
    }

    const [agg] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(readingSpotBookmarks)
      .where(eq(readingSpotBookmarks.spotId, spot.id));

    const bookmarkCount = Number(agg?.count ?? 0);
    await tx
      .update(readingSpots)
      .set({ bookmarkCount, updatedAt: new Date() })
      .where(eq(readingSpots.id, spot.id));

    return { isBookmarked, bookmarkCount };
  });
}

export async function checkNearbyDuplicateSpots(
  query: NearbyCheckQuery,
): Promise<SpotNearbyMatchDto[]> {
  const radiusKm = query.radiusMeters / 1000;
  const bbox = boundingBoxFromRadiusKm(query.lat, query.lng, radiusKm);

  const candidates = await db
    .select()
    .from(readingSpots)
    .where(
      and(
        inArray(readingSpots.status, ["published", "pending_review"]),
        between(readingSpots.latitude, bbox.minLat, bbox.maxLat),
        between(readingSpots.longitude, bbox.minLng, bbox.maxLng),
      ),
    );

  const matches = candidates
    .map((row) => ({
      row,
      distanceMeters: Math.round(
        haversineDistanceMeters(
          query.lat,
          query.lng,
          row.latitude,
          row.longitude,
        ),
      ),
      nameScore: query.name ? fuzzyNameScore(query.name, row.name) : 0,
    }))
    .filter((item) => item.distanceMeters <= query.radiusMeters);

  matches.sort((a, b) => {
    if (a.distanceMeters !== b.distanceMeters) {
      return a.distanceMeters - b.distanceMeters;
    }
    return b.nameScore - a.nameScore;
  });

  return matches.map(({ row, distanceMeters }) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category,
    address: row.address,
    city: row.city,
    latitude: row.latitude,
    longitude: row.longitude,
    distanceMeters,
    status: row.status,
  }));
}

async function canAutoPublishSpot(
  userId: string,
  userRole?: string,
): Promise<boolean> {
  if (userRole === "admin") return true;

  const [ownedTrustedCal] = await db
    .select({ id: communityCalendars.id })
    .from(communityCalendars)
    .where(
      and(
        eq(communityCalendars.createdByUserId, userId),
        inArray(communityCalendars.verificationStatus, ["verified", "trusted"]),
      ),
    )
    .limit(1);

  if (ownedTrustedCal) return true;

  const [managedTrustedCal] = await db
    .select({ id: communityCalendarMembers.id })
    .from(communityCalendarMembers)
    .innerJoin(
      communityCalendars,
      eq(communityCalendarMembers.calendarId, communityCalendars.id),
    )
    .where(
      and(
        eq(communityCalendarMembers.userId, userId),
        inArray(communityCalendarMembers.role, ["owner", "admin"]),
        inArray(communityCalendars.verificationStatus, ["verified", "trusted"]),
      ),
    )
    .limit(1);

  if (managedTrustedCal) return true;

  const [publishedCountRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(readingSpots)
    .where(
      and(
        eq(readingSpots.submittedByUserId, userId),
        eq(readingSpots.status, "published"),
      ),
    );

  return Number(publishedCountRow?.count ?? 0) >= 3;
}

async function generateUniqueSpotSlug(
  name: string,
  city: string,
): Promise<string> {
  const base = slugify(`${name}-${city}`).slice(0, 140) || "sudut-baca";
  const [existing] = await db
    .select({ id: readingSpots.id })
    .from(readingSpots)
    .where(eq(readingSpots.slug, base))
    .limit(1);

  if (!existing) return base;
  return `${base.slice(0, 145)}-${randomBytes(3).toString("hex")}`;
}

export async function submitReadingSpot(
  userId: string,
  userRole: string | undefined,
  input: CreateSpotSubmission,
): Promise<ReadingSpotDetailDto> {
  if (
    input.latitude < INDONESIA_BBOX.minLat ||
    input.latitude > INDONESIA_BBOX.maxLat ||
    input.longitude < INDONESIA_BBOX.minLng ||
    input.longitude > INDONESIA_BBOX.maxLng
  ) {
    throw new HttpError(
      400,
      "OUT_OF_INDONESIA_BOUNDS",
      "Koordinat berada di luar wilayah Indonesia.",
    );
  }

  const autoPublish = await canAutoPublishSpot(userId, userRole);
  const slug = await generateUniqueSpotSlug(input.name, input.city);

  const [inserted] = await db
    .insert(readingSpots)
    .values({
      slug,
      name: input.name,
      category: input.category,
      description: input.description ?? null,
      address: input.address,
      district: input.district ?? null,
      city: input.city,
      province: input.province,
      latitude: input.latitude,
      longitude: input.longitude,
      googleMapsUrl:
        input.googleMapsUrl && input.googleMapsUrl.trim() !== ""
          ? input.googleMapsUrl.trim()
          : null,
      googlePlaceId: input.googlePlaceId ?? null,
      instagramHandle: input.instagramHandle
        ? input.instagramHandle.replace(/^@+/, "")
        : null,
      websiteUrl:
        input.websiteUrl && input.websiteUrl.trim() !== ""
          ? input.websiteUrl.trim()
          : null,
      openingHoursText: input.openingHoursText ?? null,
      priceRange: input.priceRange,
      noiseLevel: input.noiseLevel,
      facilities: input.facilities ?? {},
      source: "community_submission",
      submittedByUserId: userId,
      status: autoPublish ? "published" : "pending_review",
      verifiedBadge: "none",
    })
    .returning();

  return {
    ...toSpotSummary(inserted, { isBookmarked: false }),
    linkedBranchName: null,
    linkedCalendarSlug: null,
    linkedCalendarName: null,
    upcomingEvents: [],
    myReview: null,
    status: inserted.status,
    source: inserted.source,
    rejectionReason: inserted.rejectionReason,
  };
}

export async function listMySpotActivity(userId: string): Promise<{
  submissions: ReadingSpotDetailDto[];
  bookmarks: ReadingSpotSummaryDto[];
}> {
  const [submissionRows, bookmarkRows] = await Promise.all([
    db
      .select()
      .from(readingSpots)
      .where(eq(readingSpots.submittedByUserId, userId))
      .orderBy(desc(readingSpots.createdAt)),
    db
      .select({ spot: readingSpots })
      .from(readingSpotBookmarks)
      .innerJoin(readingSpots, eq(readingSpotBookmarks.spotId, readingSpots.id))
      .where(
        and(
          eq(readingSpotBookmarks.userId, userId),
          eq(readingSpots.status, "published"),
        ),
      )
      .orderBy(desc(readingSpotBookmarks.createdAt)),
  ]);

  const bookmarkedIdSet = new Set(bookmarkRows.map((b) => b.spot.id));

  return {
    submissions: submissionRows.map((row) => ({
      ...toSpotSummary(row, { isBookmarked: bookmarkedIdSet.has(row.id) }),
      status: row.status,
      source: row.source,
      rejectionReason: row.rejectionReason,
    })),
    bookmarks: bookmarkRows.map(({ spot }) =>
      toSpotSummary(spot, { isBookmarked: true }),
    ),
  };
}

export async function reportSpotOrReview(
  userId: string,
  slug: string,
  input: CreateSpotReportInput,
): Promise<{
  report: ReadingSpotReportDto;
  openUniqueReporterCount: number;
}> {
  const [spot] = await db
    .select({ id: readingSpots.id, status: readingSpots.status })
    .from(readingSpots)
    .where(eq(readingSpots.slug, slug))
    .limit(1);

  if (!spot || spot.status !== "published") {
    throw new HttpError(404, "SPOT_NOT_FOUND", "Sudut baca tidak ditemukan.");
  }

  if (input.reviewId) {
    const [review] = await db
      .select({ id: readingSpotReviews.id })
      .from(readingSpotReviews)
      .where(
        and(
          eq(readingSpotReviews.id, input.reviewId),
          eq(readingSpotReviews.spotId, spot.id),
        ),
      )
      .limit(1);

    if (!review) {
      throw new HttpError(
        404,
        "REVIEW_NOT_FOUND",
        "Ulasan yang dilaporkan tidak ditemukan pada sudut baca ini.",
      );
    }
  }

  const [existingOpen] = await db
    .select({ id: readingSpotReports.id })
    .from(readingSpotReports)
    .where(
      and(
        eq(readingSpotReports.spotId, spot.id),
        eq(readingSpotReports.reporterUserId, userId),
        eq(readingSpotReports.reasonType, input.reasonType),
        eq(readingSpotReports.status, "open"),
      ),
    )
    .limit(1);

  if (existingOpen) {
    throw new HttpError(
      409,
      "DUPLICATE_OPEN_REPORT",
      "Anda sudah mengirimkan laporan serupa yang masih dalam peninjauan.",
    );
  }

  const [inserted] = await db
    .insert(readingSpotReports)
    .values({
      spotId: spot.id,
      reviewId: input.reviewId ?? null,
      reporterUserId: userId,
      reasonType: input.reasonType,
      details: input.details,
      status: "open",
    })
    .returning();

  const [reporter] = await db
    .select({ name: user.name })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  const [countRow] = await db
    .select({
      uniqueReporters: sql<number>`count(distinct ${readingSpotReports.reporterUserId})::int`,
    })
    .from(readingSpotReports)
    .where(
      and(
        eq(readingSpotReports.spotId, spot.id),
        eq(readingSpotReports.status, "open"),
      ),
    );

  return {
    report: {
      id: inserted.id,
      spotId: inserted.spotId,
      reviewId: inserted.reviewId,
      reporterUserId: inserted.reporterUserId,
      reporterName: reporter?.name ?? null,
      reasonType: inserted.reasonType,
      details: inserted.details,
      status: inserted.status,
      createdAt: inserted.createdAt.toISOString(),
    },
    openUniqueReporterCount: Number(countRow?.uniqueReporters ?? 1),
  };
}

type NominatimItem = {
  display_name?: string;
  lat?: string;
  lon?: string;
  address?: {
    road?: string;
    suburb?: string;
    village?: string;
    city_district?: string;
    municipality?: string;
    city?: string;
    town?: string;
    county?: string;
    state?: string;
  };
};

export async function geocodeIndonesiaLocation(
  query: GeocodeSpotsQuery,
): Promise<SpotGeocodeResultDto[]> {
  const cacheKey = query.q.toLowerCase();
  const now = Date.now();
  const cached = geocodeCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.results;
  }

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("countrycodes", "id");
    url.searchParams.set("accept-language", "id");
    url.searchParams.set("limit", "5");
    url.searchParams.set("q", query.q);

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": "AnzaBook/1.0 (https://anzabook.id)",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as NominatimItem[];
    if (!Array.isArray(payload)) {
      return [];
    }

    const results: SpotGeocodeResultDto[] = [];
    for (const item of payload) {
      const latitude = Number(item.lat);
      const longitude = Number(item.lon);
      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < INDONESIA_BBOX.minLat ||
        latitude > INDONESIA_BBOX.maxLat ||
        longitude < INDONESIA_BBOX.minLng ||
        longitude > INDONESIA_BBOX.maxLng
      ) {
        continue;
      }

      const addr = item.address ?? {};
      const city =
        addr.city ||
        addr.town ||
        addr.county ||
        addr.municipality ||
        addr.state ||
        "Indonesia";
      const district =
        addr.city_district || addr.suburb || addr.village || null;
      const province = addr.state ?? null;
      const displayName = item.display_name?.trim() || city;

      results.push({
        displayName,
        address: addr.road ? `${addr.road}, ${displayName}` : displayName,
        district,
        city,
        province,
        latitude,
        longitude,
      });
    }

    if (geocodeCache.size >= GEOCODE_CACHE_MAX_ENTRIES) {
      const oldestKey = geocodeCache.keys().next().value;
      if (oldestKey) geocodeCache.delete(oldestKey);
    }
    geocodeCache.set(cacheKey, {
      expiresAt: now + GEOCODE_CACHE_TTL_MS,
      results,
    });

    return results;
  } catch {
    return [];
  }
}
