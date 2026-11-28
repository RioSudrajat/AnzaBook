import { ApiError, apiFetch } from "@/lib/api/client";
import type {
  ListSpotsQueryInput,
  ListSpotsResponseDto,
  ReadingSpotDetailDto,
  SpotCitySummaryDto,
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
