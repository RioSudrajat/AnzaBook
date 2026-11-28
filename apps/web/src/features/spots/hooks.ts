import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  deleteMySpotReview,
  geocodeSpotLocation,
  reportSpotOrReview,
  submitReadingSpot,
  toggleSpotBookmark,
  upsertMySpotReview,
} from "./api";
import {
  mySpotsActivityQuery,
  nearbySpotCheckQuery,
  spotCitiesQuery,
  spotDetailQuery,
  spotKeys,
  spotReviewsQuery,
  spotsListQuery,
} from "./queries";
import type {
  CreateSpotReportInput,
  CreateSpotSubmissionInput,
  ListSpotsQueryInput,
  ListSpotsResponseDto,
  NearbyCheckQueryInput,
  ReadingSpotDetailDto,
  UpsertSpotReviewInput,
} from "./types";

export function useSpots(params: ListSpotsQueryInput = {}) {
  return useQuery({
    ...spotsListQuery(params),
    placeholderData: keepPreviousData,
  });
}

export function useSpotCities() {
  return useQuery(spotCitiesQuery());
}

export function useSpotDetail(slug: string) {
  return useQuery(spotDetailQuery(slug));
}

export function useToggleSpotBookmark() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (slug: string) => toggleSpotBookmark(slug),
    onMutate: async (slug) => {
      await queryClient.cancelQueries({ queryKey: spotKeys.all });

      const previousLists = queryClient.getQueriesData<ListSpotsResponseDto>({
        queryKey: spotKeys.lists(),
      });
      const previousDetail =
        queryClient.getQueryData<ReadingSpotDetailDto | null>(
          spotKeys.detail(slug),
        );

      queryClient.setQueriesData<ListSpotsResponseDto>(
        { queryKey: spotKeys.lists() },
        (current) => {
          if (!current) return current;
          return {
            ...current,
            data: current.data.map((spot) => {
              if (spot.slug !== slug) return spot;
              const nextBookmarked = !spot.isBookmarked;
              return {
                ...spot,
                isBookmarked: nextBookmarked,
                bookmarkCount: Math.max(
                  0,
                  spot.bookmarkCount + (nextBookmarked ? 1 : -1),
                ),
              };
            }),
          };
        },
      );

      if (previousDetail) {
        const nextBookmarked = !previousDetail.isBookmarked;
        queryClient.setQueryData<ReadingSpotDetailDto>(spotKeys.detail(slug), {
          ...previousDetail,
          isBookmarked: nextBookmarked,
          bookmarkCount: Math.max(
            0,
            previousDetail.bookmarkCount + (nextBookmarked ? 1 : -1),
          ),
        });
      }

      return { previousLists, previousDetail };
    },
    onError: (_err, slug, context) => {
      if (!context) return;
      for (const [key, data] of context.previousLists) {
        queryClient.setQueryData(key, data);
      }
      if (context.previousDetail !== undefined) {
        queryClient.setQueryData(spotKeys.detail(slug), context.previousDetail);
      }
    },
    onSuccess: (result, slug) => {
      queryClient.setQueriesData<ListSpotsResponseDto>(
        { queryKey: spotKeys.lists() },
        (current) => {
          if (!current) return current;
          return {
            ...current,
            data: current.data.map((spot) =>
              spot.slug === slug
                ? {
                    ...spot,
                    isBookmarked: result.isBookmarked,
                    bookmarkCount: result.bookmarkCount,
                  }
                : spot,
            ),
          };
        },
      );
      queryClient.setQueryData<ReadingSpotDetailDto | null>(
        spotKeys.detail(slug),
        (current) =>
          current
            ? {
                ...current,
                isBookmarked: result.isBookmarked,
                bookmarkCount: result.bookmarkCount,
              }
            : current,
      );
    },
    onSettled: () => {
      return queryClient.invalidateQueries({ queryKey: spotKeys.mine() });
    },
  });
}

export function useSpotReviews(
  slug: string,
  params: { limit?: number; offset?: number } = {},
) {
  return useQuery(spotReviewsQuery(slug, params));
}

export function useUpsertSpotReview(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpsertSpotReviewInput) =>
      upsertMySpotReview(slug, input),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: spotKeys.detail(slug) }),
        queryClient.invalidateQueries({ queryKey: spotKeys.reviewsAll(slug) }),
        queryClient.invalidateQueries({ queryKey: spotKeys.lists() }),
      ]),
  });
}

export function useDeleteSpotReview(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => deleteMySpotReview(slug),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: spotKeys.detail(slug) }),
        queryClient.invalidateQueries({ queryKey: spotKeys.reviewsAll(slug) }),
        queryClient.invalidateQueries({ queryKey: spotKeys.lists() }),
      ]),
  });
}

export function useGeocodeSpot() {
  return useMutation({
    mutationFn: (q: string) => geocodeSpotLocation(q),
  });
}

export function useNearbySpotCheck(
  params: NearbyCheckQueryInput,
  enabled = true,
) {
  return useQuery(nearbySpotCheckQuery(params, enabled));
}

export function useSubmitReadingSpot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateSpotSubmissionInput) => submitReadingSpot(input),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: spotKeys.mine() }),
        queryClient.invalidateQueries({ queryKey: spotKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: spotKeys.cities() }),
      ]),
  });
}

export function useMySpotActivity(enabled = true) {
  return useQuery({
    ...mySpotsActivityQuery(),
    enabled,
  });
}

export function useReportSpot(slug: string) {
  return useMutation({
    mutationFn: (input: CreateSpotReportInput) =>
      reportSpotOrReview(slug, input),
  });
}
