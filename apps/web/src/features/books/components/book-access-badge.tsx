import { Crown } from "lucide-react";
import type { BookSummaryDto } from "@starter/shared/types";
import { resolveBookAccessMeta } from "@/features/books/book-card-helpers";
import { cn } from "@/lib/utils";

type BookAccessBadgeProps = {
  book: Pick<
    BookSummaryDto,
    "digitalPolicy" | "accessTier" | "digitalPriceIdr"
  >;
  className?: string;
};

export function BookAccessBadge({ book, className }: BookAccessBadgeProps) {
  const { isFree, label } = resolveBookAccessMeta(book);

  if (isFree) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center rounded-[5px] border border-[var(--color-green)]/30 bg-[var(--color-green-soft)] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--color-green)]",
          className,
        )}
      >
        {label}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-[5px] border border-amber-500/40 bg-amber-300/35 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-950 dark:border-amber-400/70 dark:bg-amber-400 dark:text-neutral-950",
        className,
      )}
    >
      <Crown className="size-2.5 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
