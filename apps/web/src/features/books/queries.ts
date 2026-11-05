import { queryOptions } from "@tanstack/react-query";
import type { ReadingProgressScope } from "@starter/shared/types";
import type {
  ListBooksInput,
  ReadBookInput,
  StockInput,
} from "@starter/shared/validators/books";
import {
  getBook,
  getBookReader,
  getBookStock,
  getReadingProgress,
  listAllHighlights,
  listAuthors,
  listBookHighlights,
  listBookReviews,
  listBookSessions,
  listBooks,
  listCategories,
  listChapterComments,
  listCollections,
} from "./api";

export const booksKeys = {
  all: ["books"] as const,
  lists: () => [...booksKeys.all, "list"] as const,
  list: (params?: ListBooksInput) => [...booksKeys.lists(), params ?? {}] as const,
  details: () => [...booksKeys.all, "detail"] as const,
  detail: (slug: string) => [...booksKeys.details(), slug] as const,
  stocks: () => [...booksKeys.all, "stock"] as const,
  stock: (slug: string, query?: StockInput) =>
    [...booksKeys.stocks(), slug, query ?? {}] as const,
  readers: () => [...booksKeys.all, "reader"] as const,
  reader: (slug: string, query: ReadBookInput) =>
    [...booksKeys.readers(), slug, query] as const,
  reviews: () => [...booksKeys.all, "reviews"] as const,
  reviewList: (slug: string) => [...booksKeys.reviews(), slug] as const,
  comments: () => [...booksKeys.all, "comments"] as const,
  commentList: (slug: string, chapterId: string) =>
    [...booksKeys.comments(), slug, chapterId] as const,
  authors: () => [...booksKeys.all, "authors"] as const,
  collections: () => [...booksKeys.all, "collections"] as const,
  categories: () => [...booksKeys.all, "categories"] as const,
  highlights: (bookId?: string) =>
    [...booksKeys.all, "highlights", bookId ?? "all"] as const,
  progress: (bookId: string, scope: ReadingProgressScope) =>
    [...booksKeys.all, "progress", bookId, scope] as const,
  sessions: (bookId: string) => [...booksKeys.all, "sessions", bookId] as const,
};

export function booksListQuery(params?: ListBooksInput) {
  return queryOptions({
    queryKey: booksKeys.list(params),
    queryFn: ({ signal }) => listBooks(params, signal),
  });
}

export function authorsQuery() {
  return queryOptions({
    queryKey: booksKeys.authors(),
    queryFn: ({ signal }) => listAuthors(signal),
  });
}

export function collectionsQuery() {
  return queryOptions({
    queryKey: booksKeys.collections(),
    queryFn: ({ signal }) => listCollections(signal),
  });
}

export function categoriesQuery() {
  return queryOptions({
    queryKey: booksKeys.categories(),
    queryFn: ({ signal }) => listCategories(signal),
  });
}

export function readingProgressQuery(bookId: string, scope: ReadingProgressScope) {
  return queryOptions({
    queryKey: booksKeys.progress(bookId, scope),
    queryFn: ({ signal }) => getReadingProgress(bookId, scope, signal),
  });
}

export function bookHighlightsQuery(bookId: string) {
  return queryOptions({
    queryKey: booksKeys.highlights(bookId),
    queryFn: ({ signal }) => listBookHighlights(bookId, signal),
  });
}

export function allHighlightsQuery() {
  return queryOptions({
    queryKey: booksKeys.highlights("all"),
    queryFn: ({ signal }) => listAllHighlights(signal),
  });
}

export function bookSessionsQuery(bookId: string) {
  return queryOptions({
    queryKey: booksKeys.sessions(bookId),
    queryFn: ({ signal }) => listBookSessions(bookId, signal),
  });
}

export function bookDetailQuery(slug: string) {
  return queryOptions({
    queryKey: booksKeys.detail(slug),
    queryFn: ({ signal }) => getBook(slug, signal),
  });
}

export function bookStockQuery(slug: string, query?: StockInput) {
  return queryOptions({
    queryKey: booksKeys.stock(slug, query),
    queryFn: ({ signal }) => getBookStock(slug, query, signal),
  });
}

export function bookReaderQuery(slug: string, query: ReadBookInput) {
  return queryOptions({
    queryKey: booksKeys.reader(slug, query),
    queryFn: ({ signal }) => getBookReader(slug, query, signal),
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: "always",
  });
}

export function bookReviewsQuery(slug: string) {
  return queryOptions({
    queryKey: booksKeys.reviewList(slug),
    queryFn: ({ signal }) => listBookReviews(slug, signal),
  });
}

export function chapterCommentsQuery(slug: string, chapterId: string) {
  return queryOptions({
    queryKey: booksKeys.commentList(slug, chapterId),
    queryFn: ({ signal }) => listChapterComments(slug, chapterId, signal),
  });
}
