import { Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, ChevronRight, Clock, Sparkles, Star } from "lucide-react";
import type {
  AuthorSummaryDto,
  BookSummaryDto,
  CollectionSummaryDto,
  ShelfItemDto,
} from "@starter/shared/types";
import { Button } from "@/components/ui/button";
import { FlagIcon } from "@/components/ui/flag-icon";
import { BookCover } from "@/features/books/components/book-cover";

type DashboardHomeProps = {
  books: BookSummaryDto[];
  authors: AuthorSummaryDto[];
  bulletinBook: BookSummaryDto | null;
  collections: CollectionSummaryDto[];
  currentlyReading?: ShelfItemDto;
};

export function DashboardHome({
  books,
  authors,
  bulletinBook,
  collections,
  currentlyReading,
}: DashboardHomeProps) {
  const popularBooks = books
    .filter((book) => book.ratingCount > 0)
    .sort((first, second) => second.ratingCount - first.ratingCount)
    .slice(0, 6);

  return (
    <div className="space-y-12 pb-16">
      {bulletinBook && (
        <section aria-labelledby="bulletin-heading" className="space-y-3">
          <h2 id="bulletin-heading" className="flex items-center gap-2 font-serif text-lg font-bold">
            <Sparkles className="size-4 text-accent" aria-hidden="true" />
            Buletin Mingguan
          </h2>
          <div className="flex flex-col items-start gap-5 rounded-xl border bg-card p-5 sm:flex-row sm:items-center sm:p-6">
            <BookCover book={bulletinBook} className="w-24 shrink-0 sm:w-28" decorative />
            <div className="min-w-0 flex-1 space-y-2">
              <p className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
                <Clock className="size-3.5" aria-hidden="true" />
                {bulletinBook.readingMinutes} menit baca
              </p>
              <h3 className="font-serif text-xl font-bold sm:text-2xl">{bulletinBook.title}</h3>
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
          <h2 id="continue-heading" className="flex items-center gap-2 font-serif text-lg font-bold">
            <BookOpen className="size-4 text-accent" aria-hidden="true" />
            Lanjutkan Membaca
          </h2>
          <Link
            to="/app"
            search={{ tab: "library" }}
            className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            Rak Saya <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        {currentlyReading ? (
          <div className="flex max-w-xl flex-wrap items-center justify-between gap-4 rounded-lg border bg-card p-4">
            <div className="flex min-w-0 items-center gap-4">
              <BookCover book={currentlyReading.book} className="w-16 shrink-0" decorative />
              <div className="min-w-0 space-y-1">
                <h3 className="font-serif text-sm font-bold">{currentlyReading.book.title}</h3>
                <p className="text-sm text-muted-foreground">{currentlyReading.book.author}</p>
                <div className="flex items-center gap-2 pt-1">
                  <progress
                    aria-label={currentlyReading.previewProgressPercent == null ? "Progres buku" : "Progres cuplikan"}
                    value={currentlyReading.previewProgressPercent ?? currentlyReading.progressPercent}
                    max={100}
                    className="h-2 w-24 accent-primary"
                  />
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {currentlyReading.previewProgressPercent == null
                      ? `${currentlyReading.progressPercent}%`
                      : `Cuplikan ${currentlyReading.previewProgressPercent}%`}
                  </span>
                </div>
              </div>
            </div>
            <Button asChild className="min-h-11 shrink-0">
              <Link to="/read/$slug" params={{ slug: currentlyReading.book.slug }}>
                Lanjut Baca
              </Link>
            </Button>
          </div>
        ) : (
          <div className="flex max-w-xl flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed p-4">
            <p className="text-sm text-muted-foreground">Belum ada bacaan yang sedang kamu lanjutkan.</p>
            <Button asChild variant="outline" className="min-h-11">
              <Link to="/app" search={{ tab: "explore" }}>Jelajahi katalog</Link>
            </Button>
          </div>
        )}
      </section>

      {popularBooks.length > 0 && (
        <section aria-labelledby="popular-heading" className="space-y-4">
          <div>
            <h2 id="popular-heading" className="font-serif text-xl font-bold">Bacaan Populer</h2>
            <p className="text-sm text-muted-foreground">Buku dengan ulasan terbanyak di katalog.</p>
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
                    <h3 className="font-serif text-sm font-bold">{book.title}</h3>
                    <p className="text-xs text-muted-foreground">{book.author}</p>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      <Star className="size-3.5" aria-hidden="true" />
                      <span>{book.ratingAvg.toFixed(1)}/5 · {book.ratingCount} ulasan</span>
                      {book.availableLanguages.includes("id") && <FlagIcon lang="id" size="sm" />}
                      {book.availableLanguages.includes("en") && <FlagIcon lang="en" size="sm" />}
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
            <h2 id="catalog-heading" className="font-serif text-xl font-bold">Dari Katalog</h2>
            <Link
              to="/app"
              search={{ tab: "explore" }}
              className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            >
              Jelajahi Semua <ChevronRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-6">
            {books.slice(0, 6).map((book) => (
              <li key={book.id}>
                <Link to="/books/$slug" params={{ slug: book.slug }} className="block space-y-2 rounded-sm focus-visible:outline-2 focus-visible:outline-ring">
                  <BookCover book={book} className="w-full" decorative />
                  <h3 className="font-serif text-sm font-semibold leading-snug">{book.title}</h3>
                  <p className="text-xs text-muted-foreground">{book.author}</p>
                  {book.accessTier === "premium" && <span className="text-xs text-muted-foreground">Premium</span>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {authors.length > 0 && (
        <section aria-labelledby="authors-heading" className="space-y-4">
          <h2 id="authors-heading" className="font-serif text-xl font-bold">Para Penulis</h2>
          <ul className="flex flex-wrap items-start gap-5">
            {authors.map((author) => (
              <li key={author.name} className="flex w-24 flex-col items-center gap-2 text-center">
                <div className="flex size-16 items-center justify-center overflow-hidden rounded-full border bg-muted font-serif text-lg font-bold">
                  {author.avatarUrl
                    ? <img src={author.avatarUrl} alt="" className="size-full object-cover" />
                    : <span aria-hidden="true">{author.name.slice(0, 1)}</span>}
                </div>
                <div>
                  <p className="font-serif text-xs font-bold">{author.name}</p>
                  <p className="text-xs text-muted-foreground">{author.bookCount} buku</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {collections.length > 0 && (
        <section aria-labelledby="collections-heading" className="space-y-4">
          <h2 id="collections-heading" className="font-serif text-xl font-bold">Koleksi Tematik</h2>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {collections.map((collection) => (
              <li key={collection.slug}>
                <Link
                  to="/app"
                  search={{ tab: "explore", collection: collection.name }}
                  className="block h-full min-h-11 rounded-lg border bg-card p-3.5 hover:border-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <h3 className="font-serif text-sm font-bold">{collection.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{collection.bookCount} buku</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
