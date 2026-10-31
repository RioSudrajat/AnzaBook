import type {
  BookDetailDto,
  BookReaderPayloadDto,
  BookReviewDto,
  BookSummaryDto,
  DataResponse,
  PageMeta,
  ParagraphCommentDto,
  StoreStockItemDto,
} from "@starter/shared/types";
import type {
  ListBooksInput,
  ReadBookInput,
  StockInput,
} from "@starter/shared/validators/books";
import type {
  CreateParagraphCommentInput,
  CreateReviewInput,
} from "@starter/shared/validators/community";
import { apiFetch } from "@/lib/api/client";

export type BooksListResponse = {
  data: BookSummaryDto[];
  bulletin: BookSummaryDto | null;
  meta: PageMeta;
};

export function listBooks(params?: ListBooksInput, signal?: AbortSignal) {
  return apiFetch<BooksListResponse>("/api/books", { query: params, signal });
}

export async function getBook(slug: string, signal?: AbortSignal) {
  const { data } = await apiFetch<DataResponse<BookDetailDto>>(
    `/api/books/${encodeURIComponent(slug)}`,
    { signal },
  );
  return data;
}

export async function getBookStock(
  slug: string,
  query?: StockInput,
  signal?: AbortSignal,
) {
  const { data } = await apiFetch<DataResponse<StoreStockItemDto[]>>(
    `/api/books/${encodeURIComponent(slug)}/stock`,
    { query, signal },
  );
  return data;
}

export async function getBookReader(
  slug: string,
  query: ReadBookInput,
  signal?: AbortSignal,
) {
  const { data } = await apiFetch<
    DataResponse<BookReaderPayloadDto & { watermark: string }>
  >(`/api/books/${encodeURIComponent(slug)}/read`, { query, signal });
  return data;
}

export async function claimBookCode(slug: string, code: string) {
  const { data } = await apiFetch<
    DataResponse<{ success: boolean; message: string }>
  >(`/api/books/${encodeURIComponent(slug)}/claim-code`, {
    method: "POST",
    body: { code },
  });
  return data;
}

export async function listBookReviews(slug: string, signal?: AbortSignal) {
  const { data } = await apiFetch<DataResponse<BookReviewDto[]>>(
    `/api/books/${encodeURIComponent(slug)}/reviews`,
    { signal },
  );
  return data;
}

export async function createBookReview(
  slug: string,
  input: CreateReviewInput,
) {
  const { data } = await apiFetch<DataResponse<BookReviewDto>>(
    `/api/books/${encodeURIComponent(slug)}/reviews`,
    {
      method: "POST",
      body: input,
    },
  );
  return data;
}

export async function listChapterComments(
  slug: string,
  chapterId: string,
  signal?: AbortSignal,
) {
  const { data } = await apiFetch<DataResponse<ParagraphCommentDto[]>>(
    `/api/books/${encodeURIComponent(slug)}/comments`,
    { query: { chapterId }, signal },
  );
  return data;
}

export async function createChapterComment(
  slug: string,
  input: CreateParagraphCommentInput,
) {
  const { data } = await apiFetch<DataResponse<ParagraphCommentDto>>(
    `/api/books/${encodeURIComponent(slug)}/comments`,
    {
      method: "POST",
      body: input,
    },
  );
  return data;
}
