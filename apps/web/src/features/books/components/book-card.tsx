import { Link } from "@tanstack/react-router";
import { Star } from "lucide-react";
import type { BookSummaryDto } from "@starter/shared/types";
import {
  formatBookRatingText,
  resolveBookAccessMeta,
  resolveBookPrimaryCategory,
  resolveReadingProgressMeta,
} from "@/features/books/book-card-helpers";
import { isUsableAssetUrl } from "@/lib/media-url";
import { cn } from "@/lib/utils";
import { BookAccessBadge } from "./book-access-badge";
import { BookCover } from "./book-cover";

export type BookCardVariant = "catalog" | "reading" | "shelf";

export type BookCardProps = {
  book: BookSummaryDto;
  variant?: BookCardVariant;
  /** Destination for link cards: book detail page or directly into the E-Reader. */
  hrefMode?: "detail" | "read";
  /** Optional click handler (renders a semantic stretched button instead of a link, e.g. Library completed book modal). */
  onClick?: () => void;
  /** Reading progress inputs (used when variant === "reading"). */
  progressPercent?: number;
  previewProgressPercent?: number | null;
  previewBookPercent?: number | null;
  /** Show digital single-purchase price below author. Defaults to true for "catalog", false otherwise. */
  showPrice?: boolean;
  /** Show compact "100%" completion chip in the stage corner (e.g. Library finished books). */
  showCompletedBadge?: boolean;
  /** Heading level for accessible document outline. Defaults to "h3". */
  headingLevel?: "h3" | "h4";
  className?: string;
};

export function BookCard({
  book,
  variant = "catalog",
  hrefMode = variant === "reading" ? "read" : "detail",
  onClick,
  progressPercent = 0,
  previewProgressPercent = null,
  previewBookPercent = null,
  showPrice = variant === "catalog",
  showCompletedBadge = false,
  headingLevel = "h3",
  className,
}: BookCardProps) {
  const accessMeta = resolveBookAccessMeta(book);
  const primaryCategory = resolveBookPrimaryCategory(book);
  const progressMeta =
    variant === "reading"
      ? resolveReadingProgressMeta({
          progressPercent,
          previewProgressPercent,
          previewBookPercent,
        })
      : null;
  const ratingText =
    variant === "catalog"
      ? formatBookRatingText(book.ratingAvg, book.ratingCount)
      : null;

  const hasAvatar = isUsableAssetUrl(book.authorAvatar);
  const authorInitial = (book.author?.trim() || "A").slice(0, 1).toUpperCase();
  const Heading = headingLevel;

  const titleActionClass =
    "anza-book-card-link text-left text-[var(--color-ink)] transition-colors group-hover:text-[var(--color-accent)] focus-visible:outline-none cursor-pointer";

  return (
    <article
      className={cn(
        "anza-book-card group relative flex h-full w-full flex-col",
        className,
      )}
    >
      {/* Top Book Stage Wrapper */}
      <div className="anza-book-card-stage relative flex flex-col gap-3 rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-3 sm:p-3.5 transition-colors group-hover:border-[var(--color-ink)]/30">
        <div className="flex min-h-5 items-center justify-between gap-2">
          <span className="min-w-0 truncate font-sans text-[11px] font-medium text-[var(--color-muted)]">
            {primaryCategory}
          </span>
          <BookAccessBadge book={book} />
        </div>

        <div className="relative mx-auto w-[60%] max-w-[148px] aspect-[2/3] py-1 sm:py-1.5">
          <BookCover
            book={book}
            decorative
            className="size-full shadow-[0_10px_22px_-8px_rgba(19,17,15,0.35)] transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:scale-[1.02] motion-reduce:transform-none"
          />
        </div>

        {showCompletedBadge && (
          <span className="absolute right-2.5 bottom-2.5 rounded-md border border-[var(--color-green)]/35 bg-[var(--color-green-soft)] px-1.5 py-0.5 font-mono text-[10px] font-bold text-[var(--color-green)]">
            100%
          </span>
        )}
      </div>

      {/* Open Metadata Stack Directly Below Stage */}
      <div className="mt-2.5 flex flex-1 flex-col">
        {progressMeta && (
          <div className="mb-2 flex items-center gap-2">
            <progress
              className="anza-reading-progress h-1.5 flex-1"
              max={100}
              value={progressMeta.percent}
              aria-label={`${progressMeta.ariaLabel} untuk ${book.title}`}
            />
            <span className="shrink-0 font-mono text-[11px] tabular-nums text-[var(--color-muted)]">
              {progressMeta.label}
            </span>
          </div>
        )}

        <Heading className="font-serif text-sm sm:text-[15px] font-bold leading-snug line-clamp-2">
          {onClick ? (
            <button
              type="button"
              onClick={onClick}
              className={titleActionClass}
            >
              {book.title}
            </button>
          ) : hrefMode === "read" ? (
            <Link
              to="/read/$slug"
              params={{ slug: book.slug }}
              className={titleActionClass}
            >
              {book.title}
            </Link>
          ) : (
            <Link
              to="/books/$slug"
              params={{ slug: book.slug }}
              className={titleActionClass}
            >
              {book.title}
            </Link>
          )}
        </Heading>

        <div className="mt-1.5 flex min-w-0 items-center gap-1.5">
          {hasAvatar && book.authorAvatar ? (
            <img
              src={book.authorAvatar}
              alt=""
              aria-hidden="true"
              className="size-4 shrink-0 rounded-full border border-[var(--color-rule)] object-cover"
            />
          ) : (
            <span
              aria-hidden="true"
              className="inline-flex size-4 shrink-0 items-center justify-center rounded-full border border-[var(--color-rule)] bg-[var(--color-paper-3)] font-mono text-[9px] font-bold text-[var(--color-ink-2)]"
            >
              {authorInitial}
            </span>
          )}
          <span className="truncate font-sans text-xs text-[var(--color-muted)]">
            {book.author}
          </span>
        </div>

        {showPrice && accessMeta.formattedPrice && (
          <p className="mt-1.5 font-mono text-xs sm:text-[13px] font-semibold tabular-nums text-[var(--color-ink)]">
            {accessMeta.formattedPrice}
          </p>
        )}

        {ratingText && (
          <div
            className="mt-1.5 flex min-w-0 items-center gap-1.5"
            aria-label={`Rating ${ratingText}`}
          >
            <span
              className="inline-flex shrink-0 items-center gap-0.5"
              aria-hidden="true"
            >
              {[1, 2, 3, 4, 5].map((starIndex) => {
                const isFilled = book.ratingAvg >= starIndex - 0.25;
                return (
                  <Star
                    key={starIndex}
                    className={
                      isFilled
                        ? "size-3.5 fill-amber-500 text-amber-500"
                        : "size-3.5 text-[var(--color-rule)]"
                    }
                  />
                );
              })}
            </span>
            <span className="truncate font-sans text-xs tabular-nums text-[var(--color-muted)]">
              {ratingText}
            </span>
          </div>
        )}
      </div>
    </article>
  );
}
