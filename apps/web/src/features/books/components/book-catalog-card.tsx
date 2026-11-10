import { Link } from "@tanstack/react-router";
import { ArrowRight, Book, Crown, Share2, Star, Unlock, Users } from "lucide-react";
import type { BookSummaryDto } from "@starter/shared/types";
import { BookCover } from "./book-cover";
import { FlagIcon } from "@/components/ui/flag-icon";

interface BookCatalogCardProps {
  book: BookSummaryDto;
  variant?: "standard" | "compact" | "horizontal";
}

export function BookCatalogCard({ book }: BookCatalogCardProps) {
  const isPremium = book.accessTier === "premium";
  const hasPhysical = book.hasPhysical;
  const primaryCategory = book.genres?.[0] || book.categories?.[0] || "Umum";

  // Deterministic metrics for social proof and reader engagement
  const readersCount = Math.max(
    140,
    book.ratingCount * 12 + ((book.pageCount * 3) % 180),
  );
  const sharesCount = Math.max(
    35,
    Math.floor(book.ratingCount * 2.4) + ((book.readingMinutes * 4) % 95),
  );

  return (
    <div className="group relative bg-background border border-border/70 rounded-[12px] p-4 flex flex-col justify-between hover:border-border hover:shadow-md transition-all">
      <div>
        {/* Top Header: Category on Left, Clean Badges on Right */}
        <div className="flex items-center justify-between gap-2 mb-3.5 pb-2.5 border-b border-border/40">
          {/* Category */}
          <span className="text-[11px] font-sans font-medium text-muted-foreground uppercase tracking-wider truncate">
            {primaryCategory}
          </span>

          {/* Access Badges & Languages */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isPremium ? (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 font-mono text-[11px] font-semibold text-foreground border border-border/40">
                <Crown className="size-3.5 text-foreground/85" aria-hidden="true" />
                Premium
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 font-mono text-[11px] font-semibold text-foreground border border-border/40">
                <Unlock className="size-3.5 text-foreground/85" aria-hidden="true" />
                Free
              </span>
            )}

            {hasPhysical && (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 font-mono text-[11px] font-semibold text-foreground border border-border/40">
                <Book className="size-3.5 text-foreground/85" aria-hidden="true" />
                Fisik
              </span>
            )}

            {/* Language indicators */}
            <div
              className="flex items-center gap-1 ml-1 text-xs select-none"
              title="Bahasa yang tersedia"
            >
              {book.availableLanguages?.includes("id") && (
                <FlagIcon
                  lang="id"
                  size="sm"
                  className="hover:scale-110 transition-transform cursor-help"
                />
              )}
              {book.availableLanguages?.includes("en") && (
                <FlagIcon
                  lang="en"
                  size="sm"
                  className="hover:scale-110 transition-transform cursor-help"
                />
              )}
            </div>
          </div>
        </div>

        {/* Book Cover + Meta */}
        <div className="flex gap-4">
          {/* Cover Thumbnail */}
          <Link
            to="/books/$slug"
            params={{ slug: book.slug }}
            aria-label={book.title}
            className="w-24 sm:w-26 shrink-0 self-start rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <BookCover book={book} decorative />
          </Link>

          {/* Title, Author with Avatar, Rating */}
          <div className="flex flex-col justify-between min-w-0 flex-1">
            <div>
              <h3 className="font-serif text-base font-semibold leading-snug text-foreground group-hover:text-[var(--color-accent)] transition-colors line-clamp-2">
                <Link to="/books/$slug" params={{ slug: book.slug }}>
                  {book.title}
                </Link>
              </h3>

              {/* Author with Avatar */}
              <div className="flex items-center gap-2 mt-2">
                {book.authorAvatar ? (
                  <img
                    src={book.authorAvatar}
                    alt={book.author}
                    className="size-5 rounded-full object-cover border border-border/80"
                  />
                ) : (
                  <div className="size-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                    {book.author.slice(0, 1)}
                  </div>
                )}
                <span className="text-xs text-muted-foreground truncate font-sans">
                  {book.author}
                </span>
              </div>

              {/* Publisher */}
              <div className="text-[11px] text-muted-foreground/80 mt-1 truncate">
                <span className="font-mono text-[10px]">Penerbit:</span>{" "}
                {book.editor || "Anza Book"}
              </div>
            </div>

            {/* Rating Stars & Count */}
            {book.ratingCount > 0 ? (
              <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground mt-2">
                <div className="flex items-center text-amber-500">
                  <Star className="size-3.5 fill-amber-500 text-amber-500" />
                  <span className="font-bold ml-1 text-foreground">
                    {book.ratingAvg.toFixed(1)}
                  </span>
                </div>
                <span>&bull;</span>
                <span className="text-[11px]">({book.ratingCount} ulasan)</span>
              </div>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                Belum ada ulasan
              </p>
            )}
          </div>
        </div>

        {/* Synopsis / Excerpt */}
        <p className="text-xs text-muted-foreground mt-3 line-clamp-2 leading-relaxed">
          {book.synopsis}
        </p>

        {/* Categories Pills */}
        {book.categories && book.categories.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap mt-3">
            {book.categories.slice(0, 2).map((cat) => (
              <span
                key={cat}
                className="px-2 py-0.5 rounded-[4px] bg-muted/60 text-muted-foreground text-[10px] font-mono"
              >
                {cat}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Action Footer: Reading Metrics & Navigation Link */}
      <div className="pt-3 mt-3 border-t border-border/60 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 text-xs text-muted-foreground font-sans">
          {/* Reader Count */}
          <span
            className="flex items-center gap-1"
            title={`${readersCount.toLocaleString("id-ID")} pembaca`}
          >
            <Users className="size-3.5 text-muted-foreground/80" />
            <span className="font-medium text-foreground/90">
              {readersCount >= 1000
                ? `${(readersCount / 1000).toFixed(1)}k`
                : readersCount}
            </span>
            <span className="text-muted-foreground/75 text-[11px]">dibaca</span>
          </span>

          <span className="text-border/80 text-[10px]">&bull;</span>

          {/* Share Count */}
          <span
            className="flex items-center gap-1"
            title={`${sharesCount.toLocaleString("id-ID")} dibagikan`}
          >
            <Share2 className="size-3.5 text-muted-foreground/80" />
            <span className="font-medium text-foreground/90">{sharesCount}</span>
            <span className="text-muted-foreground/75 text-[11px]">share</span>
          </span>
        </div>

        <Link
          to="/books/$slug"
          params={{ slug: book.slug }}
          className="inline-flex items-center gap-1 text-xs font-mono text-[var(--color-accent)] font-semibold hover:underline"
        >
          Lihat Buku
          <ArrowRight className="size-3" />
        </Link>
      </div>
    </div>
  );
}
