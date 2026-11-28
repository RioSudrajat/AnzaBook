import { queryOptions } from "@tanstack/react-query";
import {
  checkNearbyDuplicateSpots,
  getSpotBySlug,
  listMySpotActivity,
  listSpotCities,
  listSpotReviews,
  listSpots,
} from "./api";
import type { ListSpotsQueryInput, NearbyCheckQueryInput } from "./types";

export const spotKeys = {
  all: ["spots"] as const,
  lists: () => [...spotKeys.all, "list"] as const,
  list: (params: ListSpotsQueryInput) => [...spotKeys.lists(), params] as const,
  cities: () => [...spotKeys.all, "cities"] as const,
  details: () => [...spotKeys.all, "detail"] as const,
  detail: (slug: string) => [...spotKeys.details(), slug] as const,
  reviewsAll: (slug: string) => [...spotKeys.all, "reviews", slug] as const,
  reviews: (slug: string, params: { limit?: number; offset?: number } = {}) =>
    [...spotKeys.reviewsAll(slug), params] as const,
  mine: () => [...spotKeys.all, "mine"] as const,
  nearbyCheck: (params: NearbyCheckQueryInput) =>
    [...spotKeys.all, "nearby-check", params] as const,
};

export function spotsListQuery(params: ListSpotsQueryInput = {}) {
  return queryOptions({
    queryKey: spotKeys.list(params),
    queryFn: ({ signal }) => listSpots(params, signal),
    staleTime: 30_000,
  });
}

export function spotCitiesQuery() {
  return queryOptions({
    queryKey: spotKeys.cities(),
    queryFn: ({ signal }) => listSpotCities(signal),
    staleTime: 5 * 60_000,
  });
}

export function spotDetailQuery(slug: string) {
  return queryOptions({
    queryKey: spotKeys.detail(slug),
    queryFn: ({ signal }) => getSpotBySlug(slug, signal),
    enabled: Boolean(slug.trim()),
    staleTime: 60_000,
  });
}

export function spotReviewsQuery(
  slug: string,
  params: { limit?: number; offset?: number } = {},
) {
  return queryOptions({
    queryKey: spotKeys.reviews(slug, params),
    queryFn: ({ signal }) => listSpotReviews(slug, params, signal),
    enabled: Boolean(slug.trim()),
    staleTime: 30_000,
  });
}

export function mySpotsActivityQuery() {
  return queryOptions({
    queryKey: spotKeys.mine(),
    queryFn: ({ signal }) => listMySpotActivity(signal),
    staleTime: 30_000,
  });
}

export function nearbySpotCheckQuery(
  params: NearbyCheckQueryInput,
  enabled = true,
) {
  return queryOptions({
    queryKey: spotKeys.nearbyCheck(params),
    queryFn: ({ signal }) => checkNearbyDuplicateSpots(params, signal),
    enabled:
      enabled && Number.isFinite(params.lat) && Number.isFinite(params.lng),
    staleTime: 15_000,
  });
}
