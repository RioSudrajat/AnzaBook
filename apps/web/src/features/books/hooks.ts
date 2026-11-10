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
import type {
  CreateHighlightInput,
  SaveReadingProgressInput,
} from "@starter/shared/validators/reading";
import type {
  BookHighlightDto,
  ReadingProgressDto,
  ReadingProgressScope,
} from "@starter/shared/types";
import { communityKeys } from "@/features/community/queries";
import {
  claimBookCode,
  createBookReview,
  createChapterComment,
  createHighlight,
  deleteHighlight,
  purchaseBookAlacarte,
  restartBookReading,
  saveReadingProgress,
} from "./api";
import type { PurchaseBookAlacarteInput } from "@starter/shared/validators/publisher";
import {
  allHighlightsQuery,
  authorsQuery,
  bookDetailQuery,
  bookHighlightsQuery,
  bookReaderQuery,
  bookReviewsQuery,
  bookSessionsQuery,
  booksKeys,
  booksListQuery,
  bookStockQuery,
  categoriesQuery,
  chapterCommentsQuery,
  collectionsQuery,
  readingProgressQuery,
} from "./queries";

export function useBooks(params?: ListBooksInput) {
  return useSuspenseQuery(booksListQuery(params));
}

export function useCatalogBooks(params: ListBooksInput) {
  return useQuery(booksListQuery(params));
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

export function useAuthors() {
  return useQuery(authorsQuery());
}

export function useCollections() {
  return useQuery(collectionsQuery());
}

export function useCategories() {
  return useQuery(categoriesQuery());
}

export function useReadingProgress(
  bookId: string,
  scope: ReadingProgressScope = "full",
) {
  return useQuery({
    ...readingProgressQuery(bookId, scope),
    enabled: Boolean(bookId),
  });
}

export function useSaveReadingProgress(
  bookId: string,
  scope: ReadingProgressScope = "full",
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveReadingProgressInput) =>
      saveReadingProgress(bookId, scope, input),
    onSuccess: async (saved) => {
      queryClient.setQueryData<ReadingProgressDto | null>(
        booksKeys.progress(bookId, scope),
        (current) =>
          !current || current.capturedAt <= saved.capturedAt ? saved : current,
      );
      await queryClient.invalidateQueries({
        queryKey: communityKeys.shelves(),
        refetchType: "all",
      });
    },
  });
}

export function useRestartBook(bookId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => restartBookReading(bookId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: communityKeys.shelves(),
        refetchType: "all",
      });
      await queryClient.invalidateQueries({
        queryKey: booksKeys.progress(bookId, "full"),
      });
      await queryClient.invalidateQueries({
        queryKey: booksKeys.progress(bookId, "preview"),
      });
      await queryClient.invalidateQueries({
        queryKey: booksKeys.sessions(bookId),
      });
    },
  });
}

export function useBookHighlights(bookId: string) {
  return useQuery({
    ...bookHighlightsQuery(bookId),
    enabled: Boolean(bookId),
  });
}

export function useAllHighlights() {
  return useQuery(allHighlightsQuery());
}

export function useCreateHighlight(bookId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateHighlightInput) => createHighlight(input),
    onSuccess: (newHighlight) => {
      queryClient.setQueryData(
        booksKeys.highlights(bookId),
        (old: BookHighlightDto[] | undefined) => {
          if (!old) return [newHighlight];
          const exists = old.some((h) => h.id === newHighlight.id);
          return exists ? old : [newHighlight, ...old];
        },
      );
      queryClient.invalidateQueries({ queryKey: booksKeys.highlights(bookId) });
      queryClient.invalidateQueries({ queryKey: booksKeys.highlights("all") });
    },
  });
}

export function useDeleteHighlight(bookId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteHighlight(id),
    onSuccess: () => {
      if (bookId) {
        queryClient.invalidateQueries({
          queryKey: booksKeys.highlights(bookId),
        });
      }
      queryClient.invalidateQueries({ queryKey: booksKeys.highlights("all") });
    },
  });
}

export function useBookSessions(bookId: string) {
  return useQuery(bookSessionsQuery(bookId));
}

export function useCreateBookReview(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateReviewInput) => createBookReview(slug, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: booksKeys.reviewList(slug) });
      queryClient.invalidateQueries({ queryKey: booksKeys.detail(slug) });
    },
  });
}

export function usePurchaseBookAlacarte(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input?: PurchaseBookAlacarteInput) =>
      purchaseBookAlacarte(slug, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: booksKeys.detail(slug) });
      queryClient.invalidateQueries({
        queryKey: booksKeys.readers(),
      });
    },
  });
}
