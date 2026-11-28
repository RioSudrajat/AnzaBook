import { ApiError, apiFetch } from "@/lib/api/client";
import type {
  CreateSpotReportInput,
  CreateSpotSubmissionInput,
  ListSpotsQueryInput,
  ListSpotsResponseDto,
  MySpotActivityDto,
  NearbyCheckQueryInput,
  ReadingSpotDetailDto,
  ReadingSpotReportDto,
  SpotCitySummaryDto,
  SpotGeocodeResultDto,
  SpotNearbyMatchDto,
  SpotReviewsResponseDto,
  UpsertSpotReviewInput,
  UpsertSpotReviewResponseDto,
} from "./types";

function cleanQuery(
  params?: ListSpotsQueryInput,
): Record<string, string | number | boolean | undefined> {
  if (!params) return {};
  return {
    minLat: params.minLat,
    maxLat: params.maxLat,
    minLng: params.minLng,
    maxLng: params.maxLng,
    lat: params.lat,
    lng: params.lng,
    radiusKm: params.radiusKm,
    city: params.city?.trim() || undefined,
    province: params.province?.trim() || undefined,
    category: params.category,
    facility: params.facility,
    q: params.q?.trim() || undefined,
    sort: params.sort,
    limit: params.limit,
    offset: params.offset,
  };
}

export async function listSpots(
  params?: ListSpotsQueryInput,
  signal?: AbortSignal,
): Promise<ListSpotsResponseDto> {
  const res = await apiFetch<ListSpotsResponseDto>("/api/spots", {
    query: cleanQuery(params),
    signal,
  });
  const rows = Array.isArray(res?.data) ? res.data : [];
  const total =
    typeof res?.meta?.total === "number" ? res.meta.total : rows.length;
  return {
    data: rows,
    meta: {
      total,
      limit: res?.meta?.limit,
      offset: res?.meta?.offset,
    },
  };
}

export async function listSpotCities(
  signal?: AbortSignal,
): Promise<SpotCitySummaryDto[]> {
  const res = await apiFetch<{ data?: SpotCitySummaryDto[] }>(
    "/api/spots/meta/cities",
    { signal },
  );
  return Array.isArray(res?.data) ? res.data : [];
}

export async function getSpotBySlug(
  slug: string,
  signal?: AbortSignal,
): Promise<ReadingSpotDetailDto | null> {
  if (!slug.trim()) {
    return null;
  }
  try {
    const res = await apiFetch<{ data: ReadingSpotDetailDto }>(
      `/api/spots/${encodeURIComponent(slug.trim())}`,
      { signal },
    );
    return res?.data ?? null;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return null;
    }
    throw err;
  }
}

export async function toggleSpotBookmark(
  slug: string,
): Promise<{ isBookmarked: boolean; bookmarkCount: number }> {
  const res = await apiFetch<{
    data?: { isBookmarked?: boolean; bookmarkCount?: number };
    isBookmarked?: boolean;
    bookmarkCount?: number;
  }>(`/api/spots/${encodeURIComponent(slug)}/bookmark`, {
    method: "POST",
    body: {},
  });
  const payload = res?.data ?? res;
  return {
    isBookmarked: Boolean(payload?.isBookmarked),
    bookmarkCount:
      typeof payload?.bookmarkCount === "number" ? payload.bookmarkCount : 0,
  };
}

export async function listSpotReviews(
  slug: string,
  params: { limit?: number; offset?: number } = {},
  signal?: AbortSignal,
): Promise<SpotReviewsResponseDto> {
  return apiFetch<SpotReviewsResponseDto>(
    `/api/spots/${encodeURIComponent(slug)}/reviews`,
    {
      query: {
        limit: params.limit ?? 10,
        offset: params.offset ?? 0,
      },
      signal,
    },
  );
}

export async function upsertMySpotReview(
  slug: string,
  input: UpsertSpotReviewInput,
): Promise<UpsertSpotReviewResponseDto> {
  const { data } = await apiFetch<{ data: UpsertSpotReviewResponseDto }>(
    `/api/spots/${encodeURIComponent(slug)}/reviews/me`,
    {
      method: "PUT",
      body: input,
    },
  );
  return data;
}

export async function deleteMySpotReview(
  slug: string,
): Promise<{ deleted: boolean; ratingAvg: number; ratingCount: number }> {
  const { data } = await apiFetch<{
    data: { deleted: boolean; ratingAvg: number; ratingCount: number };
  }>(`/api/spots/${encodeURIComponent(slug)}/reviews/me`, {
    method: "DELETE",
  });
  return data;
}

export async function geocodeSpotLocation(
  q: string,
  signal?: AbortSignal,
): Promise<SpotGeocodeResultDto[]> {
  const trimmed = q.trim();
  if (trimmed.length < 2) {
    return [];
  }
  const { data } = await apiFetch<{ data: SpotGeocodeResultDto[] }>(
    "/api/spots/geocode",
    {
      query: { q: trimmed },
      signal,
    },
  );
  return Array.isArray(data) ? data : [];
}

export async function checkNearbyDuplicateSpots(
  params: NearbyCheckQueryInput,
  signal?: AbortSignal,
): Promise<SpotNearbyMatchDto[]> {
  const { data } = await apiFetch<{ data: SpotNearbyMatchDto[] }>(
    "/api/spots/nearby-check",
    {
      query: {
        lat: params.lat,
        lng: params.lng,
        name: params.name?.trim() || undefined,
        radiusMeters: params.radiusMeters ?? 100,
      },
      signal,
    },
  );
  return Array.isArray(data) ? data : [];
}

export async function submitReadingSpot(
  input: CreateSpotSubmissionInput,
): Promise<ReadingSpotDetailDto> {
  const { data } = await apiFetch<{ data: ReadingSpotDetailDto }>(
    "/api/spots",
    {
      method: "POST",
      body: input,
    },
  );
  return data;
}

export async function listMySpotActivity(
  signal?: AbortSignal,
): Promise<MySpotActivityDto> {
  const { data } = await apiFetch<{ data: MySpotActivityDto }>(
    "/api/spots/mine",
    { signal },
  );
  return {
    submissions: Array.isArray(data?.submissions) ? data.submissions : [],
    bookmarks: Array.isArray(data?.bookmarks) ? data.bookmarks : [],
  };
}

export async function reportSpotOrReview(
  slug: string,
  input: CreateSpotReportInput,
): Promise<{
  report: ReadingSpotReportDto;
  openUniqueReporterCount: number;
}> {
  const { data } = await apiFetch<{
    data: {
      report: ReadingSpotReportDto;
      openUniqueReporterCount: number;
    };
  }>(`/api/spots/${encodeURIComponent(slug)}/reports`, {
    method: "POST",
    body: input,
  });
  return data;
}
