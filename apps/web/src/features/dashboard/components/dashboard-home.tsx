import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Book,
  BookOpen,
  Calendar,
  ChevronRight,
  Clock,
  Crown,
  MapPin,
  Star,
  Unlock,
} from "lucide-react";
import type {
  AuthorSummaryDto,
  BookSummaryDto,
  CollectionSummaryDto,
  ShelfItemDto,
} from "@starter/shared/types";
import { Button } from "@/components/ui/button";
import { FlagIcon } from "@/components/ui/flag-icon";
import { BookCover } from "@/features/books/components/book-cover";
import { useEvents } from "@/features/events/hooks";

type DashboardHomeProps = {
  books: BookSummaryDto[];
  authors: AuthorSummaryDto[];
  bulletinBook: BookSummaryDto | null;
  collections: CollectionSummaryDto[];
  currentlyReading?: ShelfItemDto | ShelfItemDto[];
  currentlyReadingList?: ShelfItemDto[];
};

export function DashboardHome({
  books,
  authors,
  bulletinBook,
  collections,
  currentlyReading,
  currentlyReadingList,
}: DashboardHomeProps) {
  const { data: eventsData } = useEvents({ limit: 4 });
  const upcomingEvents = eventsData?.data || [];

  const readingList: ShelfItemDto[] = Array.isArray(currentlyReading)
    ? currentlyReading
    : currentlyReading
      ? [currentlyReading]
      : currentlyReadingList || [];

  const popularBooks = books
    .filter((book) => book.ratingCount > 0)
    .sort((first, second) => second.ratingCount - first.ratingCount)
    .slice(0, 6);

  return (
    <div className="space-y-12 pb-16">
      {bulletinBook && (
        <section aria-labelledby="bulletin-heading" className="space-y-3">
          <h2
            id="bulletin-heading"
            className="font-serif text-lg font-bold"
          >
            Buletin Mingguan
          </h2>
          <div className="flex flex-col items-start gap-5 rounded-xl border bg-card p-5 sm:flex-row sm:items-center sm:p-6">
            <BookCover
              book={bulletinBook}
              className="w-24 shrink-0 sm:w-28"
              decorative
            />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                {bulletinBook.accessTier === "premium" ? (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 font-mono text-[11px] font-semibold text-foreground border border-border/40">
                    <Crown
                      className="size-3.5 text-foreground/85"
                      aria-hidden="true"
                    />
                    Premium
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 font-mono text-[11px] font-semibold text-foreground border border-border/40">
                    <Unlock
                      className="size-3.5 text-foreground/85"
                      aria-hidden="true"
                    />
                    Free
                  </span>
                )}

                {bulletinBook.hasPhysical && (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 font-mono text-[11px] font-semibold text-foreground border border-border/40">
                    <Book
                      className="size-3.5 text-foreground/85"
                      aria-hidden="true"
                    />
                    Fisik
                  </span>
                )}

                <p className="flex items-center gap-1 font-mono text-xs text-muted-foreground ml-auto">
                  <Clock className="size-3.5" aria-hidden="true" />
                  {bulletinBook.readingMinutes} menit baca
                </p>
              </div>

              <h3 className="font-serif text-xl font-bold sm:text-2xl">
                {bulletinBook.title}
              </h3>
              <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                {bulletinBook.bulletinExcerpt || bulletinBook.synopsis}
              </p>
              <Button asChild variant="outline" className="mt-2 min-h-11">
                <Link to="/books/$slug" params={{ slug: bulletinBook.slug }}>
                  Baca Buletin Lengkap <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      <section aria-labelledby="continue-heading" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2
            id="continue-heading"
            className="flex items-center gap-2 font-serif text-lg font-bold"
          >
            <BookOpen className="size-4 text-accent" aria-hidden="true" />
            Lanjutkan Membaca
            {readingList.length > 0 && (
              <span className="text-xs font-mono font-normal text-muted-foreground">
                ({readingList.length})
              </span>
            )}
          </h2>
          <Link
            to="/app"
            search={{ tab: "library" }}
            className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            Rak Saya <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        </div>

        {readingList.length > 0 ? (
          <div className="flex gap-4 overflow-x-auto pb-3 pt-1 scrollbar-none snap-x snap-mandatory">
            {readingList.map((item) => (
              <div
                key={item.id}
                className="flex w-[290px] sm:w-[330px] shrink-0 snap-start items-center justify-between gap-3.5 rounded-xl border border-border/80 bg-card p-4 hover:border-foreground/30 transition-all shadow-xs"
              >
                <Link
                  to="/read/$slug"
                  params={{ slug: item.book.slug }}
                  className="shrink-0 focus-visible:outline-2 focus-visible:outline-ring rounded-md group"
                  title={item.book.title}
                >
                  <BookCover
                    book={item.book}
                    className="w-14 sm:w-16 shrink-0 shadow-sm rounded-md group-hover:scale-105 transition-transform"
                    decorative
                  />
                </Link>

                <div className="min-w-0 flex-1 space-y-1.5 flex flex-col justify-between self-stretch">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {item.book.accessTier === "premium" ? (
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
                      {item.book.hasPhysical && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 font-mono text-[10px] font-semibold text-foreground border border-border/40">
                          <Book
                            className="size-3 text-foreground/85"
                            aria-hidden="true"
                          />
                          Fisik
                        </span>
                      )}
                    </div>

                    <Link
                      to="/read/$slug"
                      params={{ slug: item.book.slug }}
                      className="hover:underline focus-visible:outline-2 focus-visible:outline-ring rounded-xs"
                    >
                      <h3 className="font-serif text-sm font-bold text-foreground line-clamp-1 mt-1 leading-snug">
                        {item.book.title}
                      </h3>
                    </Link>
                    <p className="text-xs text-muted-foreground truncate">
                      {item.book.author}
                    </p>
                  </div>

                  <div className="space-y-1 pt-1">
                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-[var(--color-accent)] h-1.5 rounded-full"
                        style={{
                          width: `${Math.min(100, Math.max(0, item.previewProgressPercent ?? item.progressPercent))}%`,
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                      <span>
                        {item.previewProgressPercent == null
                          ? `${item.progressPercent}%`
                          : `Cuplikan ${item.previewProgressPercent}%`}
                      </span>
                      <Link
                        to="/read/$slug"
                        params={{ slug: item.book.slug }}
                        className="text-xs font-semibold text-[var(--color-accent)] hover:underline inline-flex items-center gap-0.5"
                      >
                        <span>Lanjut</span>
                        <ChevronRight className="size-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex max-w-xl flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed p-4">
            <p className="text-sm text-muted-foreground">
              Belum ada bacaan yang sedang kamu lanjutkan.
            </p>
            <Button asChild variant="outline" className="min-h-11">
              <Link to="/app" search={{ tab: "explore" }}>
                Jelajahi katalog
              </Link>
            </Button>
          </div>
        )}
      </section>

      {upcomingEvents.length > 0 && (
        <section aria-labelledby="community-agenda-heading" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2
                id="community-agenda-heading"
                className="font-serif text-xl font-bold flex items-center gap-2"
              >
                <Calendar className="size-5 text-amber-500" />
                Agenda Komunitas & Diskusi
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Temu diskusi buku, bedah film, dan ruang temu pembaca AnzaBook
              </p>
            </div>
            <Link
              to="/app"
              search={{ tab: "events" }}
              className="text-xs font-semibold text-amber-500 hover:text-amber-600 inline-flex items-center gap-1"
            >
              Lihat Semua Agenda <ArrowRight className="size-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {upcomingEvents.map((ev) => (
              <Link
                key={ev.id}
                to="/app"
                search={{ tab: "events" }}
                className="group flex flex-col justify-between rounded-xl border border-border/80 bg-card p-3.5 hover:border-amber-500/60 hover:shadow-sm transition-all"
              >
                <div className="space-y-2">
                  <div className="aspect-square w-full rounded-lg overflow-hidden border border-border/40 bg-muted">
                    <img
                      src={ev.coverUrl}
                      alt={ev.title}
                      className="size-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold uppercase text-amber-500">
                      {new Date(ev.startsAt).toLocaleDateString("id-ID", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                    <h3 className="font-semibold text-xs text-foreground line-clamp-1 group-hover:text-amber-500 transition-colors">
                      {ev.title}
                    </h3>
                    <p className="text-[11px] text-muted-foreground line-clamp-1">
                      {ev.calendarName}
                    </p>
                  </div>
                </div>
                <div className="pt-2 text-[10px] text-muted-foreground flex items-center gap-1">
                  <MapPin className="size-3 text-muted-foreground/60" />
                  <span className="truncate">
                    {ev.isAddressHidden ? ev.city || "Jakarta" : ev.venueName || "Lokasi Acara"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {popularBooks.length > 0 && (
        <section aria-labelledby="popular-heading" className="space-y-4">
          <div>
            <h2 id="popular-heading" className="font-serif text-xl font-bold">
              Bacaan Populer
            </h2>
            <p className="text-sm text-muted-foreground">
              Buku dengan ulasan terbanyak di katalog.
            </p>
          </div>
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {popularBooks.map((book) => (
              <li key={book.id}>
                <Link
                  to="/books/$slug"
                  params={{ slug: book.slug }}
                  className="flex h-full items-start gap-4 rounded-lg border bg-card p-3.5 hover:border-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <BookCover book={book} className="w-16 shrink-0" decorative />
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
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
                    <h3 className="font-serif text-sm font-bold">
                      {book.title}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {book.author}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      <Star className="size-3.5" aria-hidden="true" />
                      <span>
                        {book.ratingAvg.toFixed(1)}/5 · {book.ratingCount}{" "}
                        ulasan
                      </span>
                      {book.availableLanguages.includes("id") && (
                        <FlagIcon lang="id" size="sm" />
                      )}
                      {book.availableLanguages.includes("en") && (
                        <FlagIcon lang="en" size="sm" />
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {books.length > 0 && (
        <section aria-labelledby="catalog-heading" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="catalog-heading" className="font-serif text-xl font-bold">
              Dari Katalog
            </h2>
            <Link
              to="/app"
              search={{ tab: "explore" }}
              className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            >
              Jelajahi Semua{" "}
              <ChevronRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <ul className="flex gap-4 sm:gap-5 overflow-x-auto pb-4 pt-1 scrollbar-none snap-x snap-mandatory">
            {books.map((book) => (
              <li
                key={book.id}
                className="w-[145px] sm:w-[165px] shrink-0 snap-start"
              >
                <Link
                  to="/books/$slug"
                  params={{ slug: book.slug }}
                  className="block space-y-2 rounded-sm focus-visible:outline-2 focus-visible:outline-ring group"
                >
                  <BookCover
                    book={book}
                    className="w-full shadow-sm rounded-md group-hover:scale-[1.03] transition-transform"
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
                  <h3 className="font-serif text-sm font-semibold leading-snug line-clamp-2 group-hover:text-[var(--color-accent)] transition-colors">
                    {book.title}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {book.author}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {authors.length > 0 && (
        <section aria-labelledby="authors-heading" className="space-y-4">
          <h2 id="authors-heading" className="font-serif text-xl font-bold">
            Para Penulis
          </h2>
          <ul className="flex items-start gap-5 sm:gap-6 overflow-x-auto pb-4 pt-1 scrollbar-none snap-x">
            {authors.map((author) => (
              <li
                key={author.name}
                className="flex w-24 shrink-0 snap-start flex-col items-center gap-2 text-center group cursor-pointer"
              >
                <div className="flex size-16 sm:size-18 items-center justify-center overflow-hidden rounded-full border border-border/80 bg-muted font-serif text-lg font-bold text-foreground shadow-2xs group-hover:scale-105 group-hover:border-[var(--color-accent)] transition-all">
                  {author.avatarUrl ? (
                    <img
                      src={author.avatarUrl}
                      alt={author.name}
                      className="size-full object-cover"
                    />
                  ) : (
                    <span aria-hidden="true">{author.name.slice(0, 1)}</span>
                  )}
                </div>
                <div className="w-full">
                  <p className="font-serif text-xs font-bold text-foreground group-hover:text-[var(--color-accent)] transition-colors line-clamp-1">
                    {author.name}
                  </p>
                  <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                    {author.bookCount} buku
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {collections.length > 0 && (
        <section aria-labelledby="collections-heading" className="space-y-4">
          <h2 id="collections-heading" className="font-serif text-xl font-bold">
            Koleksi Tematik
          </h2>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {collections.map((collection) => (
              <li key={collection.slug}>
                <Link
                  to="/app"
                  search={{ tab: "explore", collection: collection.name }}
                  className="block h-full min-h-11 rounded-lg border bg-card p-3.5 hover:border-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <h3 className="font-serif text-sm font-bold">
                    {collection.name}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {collection.bookCount} buku
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
