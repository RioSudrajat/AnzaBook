import { queryOptions } from "@tanstack/react-query";
import {
  exploreAuthors,
  exploreReaders,
  fetchUnifiedExplore,
  getManuscript,
  getMyManuscripts,
  getMySocialProfile,
  getPublisherBySlug,
  getPublisherManuscripts,
  getUserFollowers,
  getUserFollowing,
  getUserProfile,
  listVerifiedPublishers,
} from "./api";

export const socialKeys = {
  all: ["social"] as const,
  me: () => [...socialKeys.all, "me"] as const,
  user: (username: string) => [...socialKeys.all, "user", username] as const,
  followers: (username: string) =>
    [...socialKeys.all, "followers", username] as const,
  following: (username: string) =>
    [...socialKeys.all, "following", username] as const,
  authors: (query?: string) =>
    [...socialKeys.all, "authors", query ?? ""] as const,
  readers: (query?: string) =>
    [...socialKeys.all, "readers", query ?? ""] as const,
  explore: (params?: { q?: string; category?: string; sort?: string }) =>
    [
      ...socialKeys.all,
      "explore",
      params?.q ?? "",
      params?.category ?? "",
      params?.sort ?? "",
    ] as const,
};

export const publisherKeys = {
  all: ["publisher"] as const,
  verified: () => [...publisherKeys.all, "verified"] as const,
  detail: (slug: string) => [...publisherKeys.all, "detail", slug] as const,
  myManuscripts: () => [...publisherKeys.all, "manuscripts", "mine"] as const,
  manuscriptDetail: (idOrSlug: string) =>
    [...publisherKeys.all, "manuscript", idOrSlug] as const,
  publisherManuscripts: (slug: string) =>
    [...publisherKeys.all, "inbox", slug] as const,
};

export function mySocialProfileQuery() {
  return queryOptions({
    queryKey: socialKeys.me(),
    queryFn: ({ signal }) => getMySocialProfile(signal),
  });
}

export function userProfileQuery(username: string) {
  return queryOptions({
    queryKey: socialKeys.user(username),
    queryFn: ({ signal }) => getUserProfile(username, signal),
  });
}

export function userFollowersQuery(username: string) {
  return queryOptions({
    queryKey: socialKeys.followers(username),
    queryFn: ({ signal }) => getUserFollowers(username, signal),
    enabled: Boolean(username),
  });
}

export function userFollowingQuery(username: string) {
  return queryOptions({
    queryKey: socialKeys.following(username),
    queryFn: ({ signal }) => getUserFollowing(username, signal),
    enabled: Boolean(username),
  });
}

export function exploreAuthorsQuery(query?: string) {
  return queryOptions({
    queryKey: socialKeys.authors(query),
    queryFn: ({ signal }) => exploreAuthors(query, signal),
  });
}

export function exploreReadersQuery(query?: string) {
  return queryOptions({
    queryKey: socialKeys.readers(query),
    queryFn: ({ signal }) => exploreReaders(query, signal),
  });
}

export function unifiedExploreQuery(params?: {
  q?: string;
  category?: string;
  sort?: "top" | "latest";
}) {
  return queryOptions({
    queryKey: socialKeys.explore(params),
    queryFn: ({ signal }) => fetchUnifiedExplore(params, signal),
  });
}

export function verifiedPublishersQuery() {
  return queryOptions({
    queryKey: publisherKeys.verified(),
    queryFn: ({ signal }) => listVerifiedPublishers(signal),
  });
}

export function publisherDetailQuery(slug: string) {
  return queryOptions({
    queryKey: publisherKeys.detail(slug),
    queryFn: ({ signal }) => getPublisherBySlug(slug, signal),
    enabled: Boolean(slug),
  });
}

export function myManuscriptsQuery() {
  return queryOptions({
    queryKey: publisherKeys.myManuscripts(),
    queryFn: ({ signal }) => getMyManuscripts(signal),
  });
}

export function manuscriptDetailQuery(idOrSlug: string) {
  return queryOptions({
    queryKey: publisherKeys.manuscriptDetail(idOrSlug),
    queryFn: ({ signal }) => getManuscript(idOrSlug, signal),
    enabled: Boolean(idOrSlug),
  });
}

export function publisherManuscriptsQuery(slug: string) {
  return queryOptions({
    queryKey: publisherKeys.publisherManuscripts(slug),
    queryFn: ({ signal }) => getPublisherManuscripts(slug, signal),
    enabled: Boolean(slug),
  });
}
