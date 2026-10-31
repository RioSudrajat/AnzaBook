import { queryOptions } from "@tanstack/react-query";
import type { ListReadingSessionsQuery } from "@starter/shared/validators/reading";
import { getUserShelves, listReadingSessions } from "./api";

export const communityKeys = {
  all: ["community"] as const,
  shelves: () => [...communityKeys.all, "shelves"] as const,
  sessions: () => [...communityKeys.all, "sessions"] as const,
  sessionList: (params?: ListReadingSessionsQuery) =>
    [...communityKeys.sessions(), params ?? {}] as const,
};

export function userShelvesQuery() {
  return queryOptions({
    queryKey: communityKeys.shelves(),
    queryFn: ({ signal }) => getUserShelves(signal),
  });
}

export function readingSessionsQuery(params?: ListReadingSessionsQuery) {
  return queryOptions({
    queryKey: communityKeys.sessionList(params),
    queryFn: ({ signal }) => listReadingSessions(params, signal),
  });
}
