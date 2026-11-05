import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import type { UpsertShelfInput } from "@starter/shared/validators/community";
import type { SimulatePrintSchemaInput } from "@starter/shared/validators/publisher";
import type {
  CreateReadingSessionInput,
  ListReadingSessionsQuery,
} from "@starter/shared/validators/reading";
import { booksKeys } from "@/features/books/queries";
import {
  createReadingSession,
  simulatePrintEconomics,
  upsertShelf,
} from "./api";
import { communityKeys, readingSessionsQuery, userShelvesQuery } from "./queries";

export function useUserShelves() {
  return useSuspenseQuery(userShelvesQuery());
}

export function useReadingSessions(params?: ListReadingSessionsQuery) {
  return useSuspenseQuery(readingSessionsQuery(params));
}

export function useUpsertShelf() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertShelfInput) => upsertShelf(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communityKeys.shelves() });
    },
  });
}

export function useCreateReadingSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateReadingSessionInput) =>
      createReadingSession(input),
    onSuccess: async (session) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: communityKeys.sessions() }),
        queryClient.invalidateQueries({ queryKey: booksKeys.sessions(session.bookId) }),
        queryClient.invalidateQueries({ queryKey: communityKeys.shelves(), refetchType: "all" }),
      ]);
    },
  });
}

export function useSimulatePrint() {
  return useMutation({
    mutationFn: (input: SimulatePrintSchemaInput) =>
      simulatePrintEconomics(input),
  });
}
