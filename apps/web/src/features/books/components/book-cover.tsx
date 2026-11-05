import type { CSSProperties } from "react";
import type { BookSummaryDto } from "@starter/shared/types";
import { cn } from "@/lib/utils";

type CoverBook = Pick<BookSummaryDto,
  "title" | "author" | "coverColor" | "publishedYear" | "genres" | "pageCount" | "rakyatPriceIdr"
>;

export function BookCover({
  book,
  className,
  decorative = false,
  edition,
}: {
  book: CoverBook;
  className?: string;
  decorative?: boolean;
  edition?: { paperColor: string; label: string; priceIdr: number | null };
}) {
  return (
    <div
      data-book-cover={book.title}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : `Sampul ${book.title}, ${book.author}`}
      aria-hidden={decorative || undefined}
      className={cn("relative isolate aspect-[7/10] @container rounded-[2%_5%_5%_2%] shadow-lg", className)}
      style={{ "--book-cover-color": book.coverColor || "var(--book-cover-base)" } as CSSProperties}
    >
      <div className="absolute inset-0 flex flex-col justify-between overflow-hidden rounded-[inherit] bg-[var(--book-cover-color)] p-[8cqw] text-[var(--book-cover-text)]">
        <span aria-hidden="true" className="absolute inset-0 bg-[var(--book-cover-shade)]" />
        <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[9%] bg-linear-to-r from-[var(--book-cover-spine)] via-[var(--book-cover-crease)] to-transparent" />
        {edition && (
          <span aria-hidden="true" className="absolute inset-y-[3%] right-0 w-[4%] rounded-r-sm" style={{ backgroundColor: edition.paperColor }} />
        )}
        <div className="relative flex min-w-0 items-center justify-between gap-1 font-mono text-[4.6cqw] font-semibold">
          <span>{book.publishedYear}</span>
          <span className="truncate rounded-sm bg-[var(--book-cover-crease)] px-[2cqw] py-[0.5cqw] uppercase">
            {book.genres[0] || "Klasik"}
          </span>
        </div>
        <div className="relative min-w-0 pl-[2cqw]">
          <p className="line-clamp-4 break-words font-serif text-[8.6cqw] leading-tight font-bold">
            {book.title}
          </p>
          <p className="mt-[3cqw] truncate text-[5cqw] leading-tight">{book.author}</p>
        </div>
        <div className="relative flex min-w-0 items-center justify-between gap-[2cqw] border-t border-current/25 pt-[4cqw] font-mono text-[4.2cqw] whitespace-nowrap">
          <span className="font-bold text-[var(--book-cover-accent)]">
            {edition?.priceIdr === null ? "Digital" : `Rp${(edition?.priceIdr ?? book.rakyatPriceIdr).toLocaleString("id-ID")}`}
          </span>
          <span className="truncate">{edition?.label ?? `${book.pageCount} Halaman`}</span>
        </div>
      </div>
    </div>
  );
}
