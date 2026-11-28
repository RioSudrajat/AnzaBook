import { queryOptions } from "@tanstack/react-query";
import { getSpotBySlug, listSpotCities, listSpots } from "./api";
import type { ListSpotsQueryInput } from "./types";

export const spotKeys = {
  all: ["spots"] as const,
  lists: () => [...spotKeys.all, "list"] as const,
  list: (params: ListSpotsQueryInput) => [...spotKeys.lists(), params] as const,
  cities: () => [...spotKeys.all, "cities"] as const,
  details: () => [...spotKeys.all, "detail"] as const,
  detail: (slug: string) => [...spotKeys.details(), slug] as const,
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
