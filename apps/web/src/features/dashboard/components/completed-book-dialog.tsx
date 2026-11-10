import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  History,
  Info,
  Loader2,
  RotateCcw,
  Share2,
  X,
} from "lucide-react";
import type { BookSummaryDto, ReadingSessionDto } from "@starter/shared/types";
import { Button } from "@/components/ui/button";
import { BookCover } from "@/features/books/components/book-cover";
import { useBookSessions, useRestartBook } from "@/features/books/hooks";

const sessionDateFormat = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Jakarta",
});

type CompletedBookDialogProps = {
  book: BookSummaryDto | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenFlexStory: (session: ReadingSessionDto, bookTitle: string) => void;
};

export function CompletedBookDialog({
  book,
  isOpen,
  onClose,
  onOpenFlexStory,
}: CompletedBookDialogProps) {
  const navigate = useNavigate();
  const restartMutation = useRestartBook(book?.id ?? "");
  const [isRestarting, setIsRestarting] = useState(false);

  const sessions = useBookSessions(book?.id ?? "");

  if (!isOpen || !book) return null;

  async function handleRestartReading() {
    if (!book) return;
    setIsRestarting(true);
    try {
      await restartMutation.mutateAsync();
      onClose();
      await navigate({
        to: "/read/$slug",
        params: { slug: book.slug },
        search: { chapter: 1 },
      });
    } catch {
      setIsRestarting(false);
    }
  }

  const sessionList = sessions.data ?? [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="completed-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150 text-foreground overflow-y-auto"
    >
      <div className="max-w-lg w-full bg-card border border-border rounded-xl shadow-2xl p-5 sm:p-6 relative my-8 max-h-[90vh] flex flex-col">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 min-h-11 min-w-11 inline-flex items-center justify-center text-muted-foreground hover:text-foreground rounded-full hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
          aria-label="Tutup dialog"
        >
          <X className="size-4" />
        </button>

        {/* Header: Book Details & Completed Status */}
        <div className="flex gap-4 pb-4 border-b border-border items-start">
          <BookCover
            book={book}
            className="w-16 sm:w-20 shrink-0 shadow-md"
            decorative
          />
          <div className="min-w-0 flex-1 pr-6">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-[11px] font-semibold mb-1.5">
              <CheckCircle2 className="size-3" />
              <span>Selesai Dibaca</span>
            </div>
            <h2
              id="completed-dialog-title"
              className="font-serif text-lg sm:text-xl font-bold leading-snug line-clamp-2"
            >
              {book.title}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5 font-sans">
              {book.author}
            </p>
          </div>
        </div>

        {/* Body: Session History & Actions (Scrollable) */}
        <div className="flex-1 overflow-y-auto py-4 space-y-5 pr-1">
          {/* Action CTAs */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold">
              Pilihan Membaca
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Primary Action: Baca Lagi dari Awal */}
              <Button
                type="button"
                onClick={handleRestartReading}
                disabled={isRestarting}
                className="w-full min-h-11 justify-center gap-2 bg-[var(--color-accent)] text-white hover:brightness-105 font-mono text-xs"
              >
                {isRestarting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Menyiapkan...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="size-4" />
                    <span>Baca Lagi dari Awal</span>
                  </>
                )}
              </Button>

              {/* Secondary Action: Buka Naskah (Review) */}
              <Button
                asChild
                variant="outline"
                className="w-full min-h-11 justify-center gap-2 font-mono text-xs"
              >
                <Link
                  to="/read/$slug"
                  params={{ slug: book.slug }}
                  onClick={onClose}
                >
                  <BookOpen className="size-4 text-muted-foreground" />
                  <span>Buka Naskah (Review)</span>
                </Link>
              </Button>
            </div>

            <div className="pt-0.5">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground hover:text-foreground justify-center gap-1 font-sans"
              >
                <Link
                  to="/books/$slug"
                  params={{ slug: book.slug }}
                  onClick={onClose}
                >
                  <Info className="size-3.5" />
                  <span>Lihat Ringkasan & Detail Buku</span>
                </Link>
              </Button>
            </div>
          </div>

          {/* Section: Riwayat Sesi Baca */}
          <div className="space-y-2.5 border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <History className="size-4 text-[var(--color-accent)]" />
                <h3 className="text-sm font-semibold font-serif">
                  Riwayat Sesi Membaca
                </h3>
              </div>
              <span className="font-mono text-[11px] text-muted-foreground">
                Maks. 10 sesi terbaru
              </span>
            </div>

            {sessions.isPending ? (
              <div className="py-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                <span>Memuat riwayat sesi baca...</span>
              </div>
            ) : sessions.isError ? (
              <div className="p-3 rounded-lg border border-border bg-muted/20 text-xs text-muted-foreground text-center space-y-2">
                <p>Riwayat sesi gagal dimuat.</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void sessions.refetch()}
                >
                  Coba lagi
                </Button>
              </div>
            ) : sessionList.length === 0 ? (
              <p className="text-xs text-muted-foreground p-4 border border-dashed rounded-lg text-center">
                Belum ada sesi baca yang tercatat untuk buku ini.
              </p>
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border overflow-hidden bg-muted/10">
                {sessionList.map((session) => (
                  <li
                    key={session.id}
                    className="p-3 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <time
                        dateTime={session.createdAt}
                        className="block font-mono text-xs font-semibold text-foreground/90"
                      >
                        {sessionDateFormat.format(new Date(session.createdAt))} WIB
                      </time>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-2">
                        <span>{session.pagesRead} hal</span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Clock className="size-3 inline" />
                          {Math.max(1, Math.round(session.durationSeconds / 60))} menit
                        </span>
                        <span>·</span>
                        <span>{session.avgWpm} WPM</span>
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onOpenFlexStory(session, book.title)}
                      className="h-8 px-2.5 font-mono text-xs gap-1.5 shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                      title="Flex kutipan atau pencapaian sesi ini"
                    >
                      <Share2 className="size-3.5" />
                      <span className="hidden sm:inline">Flex Sesi</span>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
