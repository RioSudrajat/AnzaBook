import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Book,
  BookMarked,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Compass,
  Crown,
  Highlighter,
  Inbox,
  RotateCcw,
  Unlock,
} from "lucide-react";
import type { BookSummaryDto, ReadingSessionDto, ShelfItemDto } from "@starter/shared/types";
import { Button } from "@/components/ui/button";
import { BookCover } from "@/features/books/components/book-cover";
import { useBookSessions } from "@/features/books/hooks";
import { CompletedBookDialog } from "./completed-book-dialog";

type DashboardLibraryProps = {
  shelves: ShelfItemDto[];
  onOpenAllHighlights: () => void;
  onOpenFlexStory: (session: ReadingSessionDto, bookTitle: string) => void;
};

export function DashboardLibrary({
  shelves,
  onOpenAllHighlights,
  onOpenFlexStory,
}: DashboardLibraryProps) {
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [completedBookModal, setCompletedBookModal] =
    useState<BookSummaryDto | null>(null);
  const currentlyReading = shelves.filter(
    (item) => item.shelfStatus === "reading",
  );
  const wantToRead = shelves.filter(
    (item) => item.shelfStatus === "want_to_read",
  );
  const completed = shelves.filter((item) => item.shelfStatus === "finished");

  return (
    <div className="space-y-12 pb-16">
      {/* Top Header & Highlights Button */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-border">
        <p className="text-xs text-muted-foreground font-sans">
          Kelola progres bacaan dan koleksi bukumu.
        </p>

        <Button
          onClick={onOpenAllHighlights}
          variant="outline"
          size="sm"
          className="font-mono text-xs gap-1.5 h-9 bg-card hover:bg-muted ml-auto cursor-pointer"
        >
          <Highlighter className="size-3.5 text-amber-500" />
          <span>Highlights</span>
        </Button>
      </div>

      {/* 1. Subseksi: Sedang Dibaca (per SS 4) */}
      <section aria-labelledby="reading-heading" className="space-y-4">
        <div className="flex items-center gap-2">
          <BookOpen className="size-4 text-[var(--color-accent)]" />
          <h2 id="reading-heading" className="font-serif text-lg font-bold">
            Sedang Dibaca
          </h2>
        </div>

        {currentlyReading.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
            Buku yang mulai kamu baca akan muncul di sini.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {currentlyReading.map(
              ({ book, bookId, progressPercent, previewProgressPercent }) => {
                const expanded = selectedBookId === bookId;
                const historyId = `reading-history-${bookId}`;
                return (
                  <li key={bookId} className="px-3 py-3 sm:px-4">
                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                      <button
                        type="button"
                        aria-expanded={expanded}
                        aria-controls={historyId}
                        onClick={() =>
                          setSelectedBookId(expanded ? null : bookId)
                        }
                        className="flex min-h-11 max-w-full items-center gap-3 rounded-md text-left focus-visible:outline-2 focus-visible:outline-ring"
                      >
                        <ChevronDown
                          aria-hidden="true"
                          className={
                            expanded
                              ? "size-4 shrink-0"
                              : "size-4 shrink-0 -rotate-90"
                          }
                        />
                        <BookCover
                          book={book}
                          className="w-14 shrink-0"
                          decorative
                        />
                        <span className="min-w-0">
                          <span className="block font-serif font-semibold">
                            {book.title}
                          </span>
                          <span
                            className="block text-sm text-muted-foreground"
                            aria-hidden="true"
                          >
                            {book.author}
                          </span>
                        </span>
                      </button>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-sm tabular-nums text-muted-foreground">
                          {previewProgressPercent == null
                            ? `${progressPercent}%`
                            : `Cuplikan ${previewProgressPercent}%`}
                        </span>
                        <Button asChild variant="outline" className="min-h-11">
                          <Link to="/read/$slug" params={{ slug: book.slug }}>
                            Lanjut Baca
                          </Link>
                        </Button>
                      </div>
                    </div>
                    <div id={historyId} hidden={!expanded}>
                      {expanded && (
                        <BookSessionHistory
                          bookId={bookId}
                          onOpenFlexStory={onOpenFlexStory}
                        />
                      )}
                    </div>
                  </li>
                );
              },
            )}
          </ul>
        )}
      </section>

      {/* 2. Subseksi: Tersimpan (per SS 4) */}
      <section aria-labelledby="saved-heading" className="space-y-4">
        <div className="flex items-center gap-2">
          <BookMarked className="size-4 text-muted-foreground" />
          <h2 id="saved-heading" className="font-serif text-lg font-bold">
            Tersimpan
          </h2>
        </div>

        {wantToRead.length === 0 ? (
          /* Authentic Empty State per SS 4 */
          <div className="py-16 rounded-[12px] border border-dashed border-border/80 flex flex-col items-center justify-center text-center p-6 space-y-2 text-muted-foreground">
            <div className="size-12 rounded-full bg-muted/40 flex items-center justify-center mb-1">
              <Inbox className="size-6 opacity-60" />
            </div>
            <p className="font-sans text-xs font-semibold text-foreground/80">
              Belum ada buku yang tersimpan
            </p>
            <p className="font-sans text-xs max-w-sm leading-relaxed opacity-70">
              Simpan buku ke daftar bacaan untuk melihatnya di sini.
            </p>
            <div className="pt-2">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="font-mono text-xs text-[var(--color-accent)]"
              >
                <Link to="/app" search={{ tab: "explore" }}>
                  <Compass className="size-3.5 mr-1.5" />
                  Eksplorasi Buku
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <ShelfBookLinks shelves={wantToRead} />
        )}
      </section>

      {/* 3. Subseksi: Selesai Dibaca (per SS 4) */}
      <section aria-labelledby="completed-heading" className="space-y-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="size-4 text-emerald-600" />
          <h2 id="completed-heading" className="font-serif text-lg font-bold">
            Selesai Dibaca
          </h2>
        </div>

        {completed.length === 0 ? (
          /* Authentic Empty State per SS 4 */
          <div className="py-16 rounded-[12px] border border-dashed border-border/80 flex flex-col items-center justify-center text-center p-6 space-y-2 text-muted-foreground">
            <div className="size-12 rounded-full bg-muted/40 flex items-center justify-center mb-1">
              <Inbox className="size-6 opacity-60" />
            </div>
            <p className="font-sans text-xs font-semibold text-foreground/80">
              Belum ada buku yang selesai dibaca
            </p>
            <p className="font-sans text-xs max-w-sm leading-relaxed opacity-70">
              Selesaikan pembacaan buku untuk melihatnya di sini.
            </p>
          </div>
        ) : (
          <CompletedShelfBooks
            shelves={completed}
            onSelectBook={setCompletedBookModal}
          />
        )}
      </section>

      {/* Completed Book & Re-read Modal */}
      <CompletedBookDialog
        book={completedBookModal}
        isOpen={Boolean(completedBookModal)}
        onClose={() => setCompletedBookModal(null)}
        onOpenFlexStory={onOpenFlexStory}
      />
    </div>
  );
}

function CompletedShelfBooks({
  shelves,
  onSelectBook,
}: {
  shelves: ShelfItemDto[];
  onSelectBook: (book: BookSummaryDto) => void;
}) {
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
      {shelves.map(({ id, book }) => (
        <li key={id}>
          <button
            type="button"
            onClick={() => onSelectBook(book)}
            className="w-full text-left h-full space-y-2 rounded-lg border bg-card p-3 transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-ring cursor-pointer group flex flex-col justify-between"
          >
            <div className="space-y-2 w-full">
              <div className="relative">
                <BookCover
                  book={book}
                  className="mx-auto w-full max-w-28 group-hover:brightness-105 transition-all shadow-sm"
                  decorative
                />
                <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-xs text-[10px] font-mono text-emerald-400 font-bold border border-emerald-400/30">
                  100%
                </span>
              </div>
              <div className="flex items-center gap-1 flex-wrap pt-0.5">
                {book.accessTier === "premium" ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 font-mono text-[10px] font-semibold text-foreground border border-border/40">
                    <Crown
                      className="size-3 text-foreground/85"
                      aria-hidden="true"
                    />
                    Premium
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 font-mono text-[10px] font-semibold text-foreground border border-border/40">
                    <Unlock
                      className="size-3 text-foreground/85"
                      aria-hidden="true"
                    />
                    Free
                  </span>
                )}
                {book.hasPhysical && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 font-mono text-[10px] font-semibold text-foreground border border-border/40">
                    <Book
                      className="size-3 text-foreground/85"
                      aria-hidden="true"
                    />
                    Fisik
                  </span>
                )}
              </div>
              <h3 className="font-serif text-sm font-bold line-clamp-2 group-hover:text-[var(--color-accent)] transition-colors">
                {book.title}
              </h3>
              <p className="text-xs text-muted-foreground line-clamp-1">
                {book.author}
              </p>
            </div>

            <div className="pt-2 flex items-center justify-between text-[11px] font-mono text-muted-foreground border-t border-border/60 w-full mt-auto">
              <span>Riwayat & Baca</span>
              <RotateCcw className="size-3 text-muted-foreground group-hover:text-[var(--color-accent)] transition-colors" />
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

function ShelfBookLinks({ shelves }: { shelves: ShelfItemDto[] }) {
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
      {shelves.map(({ id, book }) => (
        <li key={id}>
          <Link
            to="/books/$slug"
            params={{ slug: book.slug }}
            className="block h-full space-y-2 rounded-lg border bg-card p-3 focus-visible:outline-2 focus-visible:outline-ring group hover:border-muted-foreground transition-all"
          >
            <BookCover
              book={book}
              className="mx-auto w-full max-w-28 group-hover:scale-[1.02] transition-transform"
              decorative
            />
            <div className="flex items-center gap-1 flex-wrap pt-0.5">
              {book.accessTier === "premium" ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 font-mono text-[10px] font-semibold text-foreground border border-border/40">
                  <Crown
                    className="size-3 text-foreground/85"
                    aria-hidden="true"
                  />
                  Premium
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 font-mono text-[10px] font-semibold text-foreground border border-border/40">
                  <Unlock
                    className="size-3 text-foreground/85"
                    aria-hidden="true"
                  />
                  Free
                </span>
              )}
              {book.hasPhysical && (
                <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 font-mono text-[10px] font-semibold text-foreground border border-border/40">
                  <Book
                    className="size-3 text-foreground/85"
                    aria-hidden="true"
                  />
                  Fisik
                </span>
              )}
            </div>
            <h3 className="font-serif text-sm font-bold line-clamp-2">{book.title}</h3>
            <p className="text-xs text-muted-foreground line-clamp-1">{book.author}</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

const sessionDateFormat = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Jakarta",
});

function BookSessionHistory({
  bookId,
  onOpenFlexStory,
}: {
  bookId: string;
  onOpenFlexStory: DashboardLibraryProps["onOpenFlexStory"];
}) {
  const sessions = useBookSessions(bookId);

  return (
    <div className="mt-3 border-t border-border pt-3 pl-3 sm:pl-7">
      <h3 className="text-sm font-semibold">Riwayat sesi</h3>
      {sessions.isPending ? (
        <p role="status" className="mt-2 text-sm text-muted-foreground">
          Memuat riwayat baca…
        </p>
      ) : sessions.isError ? (
        <div className="mt-2 space-y-2">
          <p role="alert" className="text-sm text-muted-foreground">
            Riwayat baca gagal dimuat.
          </p>
          <Button
            variant="outline"
            className="min-h-11"
            onClick={() => void sessions.refetch()}
          >
            Coba lagi
          </Button>
        </div>
      ) : sessions.data.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Belum ada sesi baca untuk buku ini.
        </p>
      ) : (
        <ul className="mt-1 divide-y divide-border">
          {sessions.data.map((session) => (
            <li
              key={session.id}
              className="flex flex-wrap items-center justify-between gap-2 py-2"
            >
              <div className="space-y-1 text-sm">
                <time dateTime={session.createdAt}>
                  {sessionDateFormat.format(new Date(session.createdAt))} WIB
                </time>
                <p className="text-muted-foreground">
                  {session.pagesRead} halaman ·{" "}
                  {Math.max(1, Math.round(session.durationSeconds / 60))} menit
                  · {session.avgWpm} kata/menit
                </p>
              </div>
              <Button
                variant="ghost"
                className="min-h-11"
                onClick={() => onOpenFlexStory(session, session.bookTitle)}
              >
                Bagikan sesi
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
