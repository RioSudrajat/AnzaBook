import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import type {
  ListBooksInput,
  ReadBookInput,
  StockInput,
} from "@starter/shared/validators/books";
import type {
  CreateParagraphCommentInput,
  CreateReviewInput,
} from "@starter/shared/validators/community";
import {
  claimBookCode,
  createBookReview,
  createChapterComment,
} from "./api";
import {
  bookDetailQuery,
  bookReaderQuery,
  bookReviewsQuery,
  booksKeys,
  booksListQuery,
  bookStockQuery,
  chapterCommentsQuery,
} from "./queries";

export function useBooks(params?: ListBooksInput) {
  return useSuspenseQuery(booksListQuery(params));
}

export function useBookDetail(slug: string) {
  return useSuspenseQuery(bookDetailQuery(slug));
}

export function useBookStock(slug: string, query?: StockInput) {
  return useQuery(bookStockQuery(slug, query));
}

export function useBookReader(slug: string, query: ReadBookInput) {
  return useQuery(bookReaderQuery(slug, query));
}

export function useBookReviews(slug: string) {
  return useQuery(bookReviewsQuery(slug));
}

export function useChapterComments(slug: string, chapterId: string) {
  return useQuery(chapterCommentsQuery(slug, chapterId));
}

export function useClaimBookCode(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => claimBookCode(slug, code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: booksKeys.detail(slug) });
      queryClient.invalidateQueries({ queryKey: booksKeys.readers() });
    },
  });
}

export function useCreateReview(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateReviewInput) => createBookReview(slug, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: booksKeys.reviewList(slug) });
      queryClient.invalidateQueries({ queryKey: booksKeys.detail(slug) });
    },
  });
}

export function useCreateComment(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateParagraphCommentInput) =>
      createChapterComment(slug, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: booksKeys.commentList(slug, variables.chapterId),
      });
    },
  });
}
