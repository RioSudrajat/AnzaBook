import { queryOptions } from "@tanstack/react-query";
import {
  exploreAuthors,
  exploreReaders,
  getMyManuscripts,
  getMySocialProfile,
  getPublisherBySlug,
  getUserProfile,
  listVerifiedPublishers,
} from "./api";

export const socialKeys = {
  all: ["social"] as const,
  me: () => [...socialKeys.all, "me"] as const,
  user: (username: string) => [...socialKeys.all, "user", username] as const,
  authors: (query?: string) =>
    [...socialKeys.all, "authors", query ?? ""] as const,
  readers: (query?: string) =>
    [...socialKeys.all, "readers", query ?? ""] as const,
};

export const publisherKeys = {
  all: ["publisher"] as const,
  verified: () => [...publisherKeys.all, "verified"] as const,
  detail: (slug: string) => [...publisherKeys.all, "detail", slug] as const,
  myManuscripts: () => [...publisherKeys.all, "manuscripts", "mine"] as const,
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
