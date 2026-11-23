import type {
  ReadingSessionDto,
  SessionPostConfig,
} from "@starter/shared/types";
import {
  SessionPostComposerDialog,
  type SessionComposerTarget,
} from "./session-post-composer-dialog";

export type FlexReadingDialogProps = {
  session: ReadingSessionDto | null;
  bookTitle?: string;
  bookAuthor?: string | null;
  bookSlug?: string | null;
  bookCoverUrl?: string | null;
  bookCoverColor?: string | null;
  streakDays?: number | null;
  recentSessions?: ReadonlyArray<{
    createdAt?: string | null;
    startedAt?: string | null;
    endedAt?: string | null;
  }>;
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
  onPublishedChange?: (result: {
    id: string;
    isPosted: boolean;
    title: string | null;
    note: string | null;
    postConfig: SessionPostConfig | null;
  }) => void;
};

export function FlexReadingDialog({
  session,
  bookTitle,
  bookAuthor,
  bookSlug,
  bookCoverUrl,
  bookCoverColor,
  streakDays,
  recentSessions,
  isOpen,
  onClose,
  userName = "Pembaca AnzaBook",
  onPublishedChange,
}: FlexReadingDialogProps) {
  const resolvedTitle =
    session?.bookTitle?.trim() || bookTitle?.trim() || "Sesi Membaca";

  const target: SessionComposerTarget | null = session
    ? {
        sessionId: session.id,
        startedAt: session.createdAt,
        bookTitle: resolvedTitle,
        bookAuthor: bookAuthor ?? null,
        bookSlug: bookSlug ?? null,
        bookCoverUrl: session.bookCoverUrl ?? bookCoverUrl ?? null,
        bookCoverColor: bookCoverColor ?? null,
        durationSec: session.durationSeconds,
        pagesRead: session.pagesRead,
        avgWpm: session.avgWpm,
        startChapterNumber: session.startChapterNumber ?? null,
        endChapterNumber: session.endChapterNumber ?? null,
        startProgressPercent: session.startProgressPercent ?? null,
        endProgressPercent: session.endProgressPercent ?? null,
        streakDays: streakDays ?? null,
        title: session.title ?? null,
        note: session.note ?? null,
        isPosted: session.isPosted,
        postConfig: session.postConfig ?? null,
      }
    : null;

  return (
    <SessionPostComposerDialog
      isOpen={isOpen}
      onClose={onClose}
      target={target}
      readerName={userName}
      recentSessions={recentSessions}
      onPublishedChange={onPublishedChange}
    />
  );
}
