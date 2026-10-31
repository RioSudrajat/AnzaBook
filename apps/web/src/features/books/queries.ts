import { queryOptions } from "@tanstack/react-query";
import type {
  ListBooksInput,
  ReadBookInput,
  StockInput,
} from "@starter/shared/validators/books";
import {
  getBook,
  getBookReader,
  getBookStock,
  listBookReviews,
  listBooks,
  listChapterComments,
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
};

export function booksListQuery(params?: ListBooksInput) {
  return queryOptions({
    queryKey: booksKeys.list(params),
    queryFn: ({ signal }) => listBooks(params, signal),
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
