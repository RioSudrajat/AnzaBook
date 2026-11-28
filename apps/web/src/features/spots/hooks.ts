import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toggleSpotBookmark } from "./api";
import {
  spotCitiesQuery,
  spotDetailQuery,
  spotKeys,
  spotsListQuery,
} from "./queries";
import type {
  ListSpotsQueryInput,
  ListSpotsResponseDto,
  ReadingSpotDetailDto,
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
  });
}
