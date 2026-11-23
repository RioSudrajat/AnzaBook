import type { HighlightColor, QuotePostConfig } from "@starter/shared/types";
import {
  QuotePostComposerDialog,
  type QuoteComposerTarget,
} from "@/features/share/components/quote-post-composer-dialog";

export type HighlightStoryDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  highlightId?: string | null;
  bookTitle: string;
  bookAuthor?: string | null;
  bookSlug?: string | null;
  bookCoverUrl?: string | null;
  bookCoverColor?: string | null;
  chapterNumber?: number | null;
  pageNumber?: number | null;
  highlightText: string;
  color: HighlightColor;
  note?: string | null;
  surroundingContext?: string | null;
  isPosted?: boolean;
  postCaption?: string | null;
  postConfig?: QuotePostConfig | null;
  readerName?: string;
  onPublishedChange?: (result: {
    id: string;
    isPosted: boolean;
    postCaption: string | null;
    postConfig: QuotePostConfig | null;
  }) => void;
};

export function HighlightStoryDialog({
  isOpen,
  onClose,
  highlightId,
  bookTitle,
  bookAuthor,
  bookSlug,
  bookCoverUrl,
  bookCoverColor,
  chapterNumber,
  pageNumber,
  highlightText,
  color,
  note,
  surroundingContext,
  isPosted,
  postCaption,
  postConfig,
  readerName = "Pembaca AnzaBook",
  onPublishedChange,
}: HighlightStoryDialogProps) {
  const target: QuoteComposerTarget | null = highlightText.trim()
    ? {
        id: highlightId ?? null,
        selectedText: highlightText,
        chapterNumber: chapterNumber ?? null,
        pageNumber: pageNumber ?? null,
        color,
        note: note ?? null,
        surroundingContext: surroundingContext ?? null,
        isPosted: Boolean(isPosted),
        postCaption: postCaption ?? null,
        postConfig: postConfig ?? null,
        bookTitle,
        bookAuthor: bookAuthor ?? null,
        bookSlug: bookSlug ?? null,
        bookCoverUrl: bookCoverUrl ?? null,
        bookCoverColor: bookCoverColor ?? null,
      }
    : null;

  return (
    <QuotePostComposerDialog
      isOpen={isOpen}
      onClose={onClose}
      target={target}
      readerName={readerName}
      onPublishedChange={onPublishedChange}
    />
  );
}
