import { Link } from "@tanstack/react-router";
import { Star } from "lucide-react";
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

  return (
    <div className="group relative bg-background border border-border/80 rounded-[10px] p-4 flex flex-col justify-between hover:border-border hover:shadow-md transition-all">
      <div>
        {/* Top Badges: Tier & Languages */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {isPremium ? (
              <span className="px-2 py-0.5 rounded-[4px] bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] font-mono font-bold tracking-wider uppercase">
                PREMIUM
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-[4px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold tracking-wider uppercase">
                FREE
              </span>
            )}

            {hasPhysical && (
              <span className="px-1.5 py-0.5 rounded-[4px] bg-stone-500/10 text-muted-foreground border border-border/60 text-[9px] font-mono uppercase">
                + FISIK
              </span>
            )}
          </div>

          {/* Languages */}
          <div className="flex items-center gap-1.5 text-xs select-none" title="Bahasa yang tersedia">
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

        {/* Book Cover + Meta */}
        <div className="flex gap-4">
          {/* Cover Thumbnail */}
          <Link
            to="/books/$slug"
            params={{ slug: book.slug }}
            aria-label={book.title}
            className="w-24 shrink-0 self-start rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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
                <span className="font-mono text-[10px]">Penerbit:</span> {book.editor || "Anza Book"}
              </div>
            </div>

            {/* Rating Stars & Count */}
            {book.ratingCount > 0 ? <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground mt-2">
              <div className="flex items-center text-amber-500">
                <Star className="size-3.5 fill-amber-500 text-amber-500" />
                <span className="font-bold ml-1 text-foreground">
                  {book.ratingAvg.toFixed(1)}
                </span>
              </div>
              <span>&bull;</span>
              <span className="text-[11px]">
                ({book.ratingCount} ulasan)
              </span>
            </div> : <p className="mt-2 text-xs text-muted-foreground">Belum ada ulasan</p>}
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

      {/* Action Footer */}
      <div className="pt-3 mt-3 border-t border-border/60 flex items-center justify-between">
        <div className="text-xs font-mono text-[var(--color-ink)] font-semibold">
          Edisi Rakyat: Rp{book.rakyatPriceIdr.toLocaleString("id-ID")}
        </div>
        <Link
          to="/books/$slug"
          params={{ slug: book.slug }}
          className="text-xs font-mono text-[var(--color-accent)] font-semibold hover:underline"
        >
          Lihat Buku &rarr;
        </Link>
      </div>
    </div>
  );
}
