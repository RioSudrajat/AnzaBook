import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

export function ManuscriptCoverPlaceholder({
  title,
  compact = false,
  className,
}: {
  title?: string | null;
  compact?: boolean;
  className?: string;
}) {
  const hasRealTitle = Boolean(title && title.trim().length > 0);
  const displayInitial = hasRealTitle
    ? title!.trim().charAt(0).toUpperCase()
    : null;

  return (
    <div
      className={cn(
        "relative flex aspect-[2/3] w-full flex-col items-center justify-center overflow-hidden rounded-[6px] border border-dashed border-[var(--color-rule)] bg-[var(--color-paper-3)]/55 text-[var(--color-muted)] select-none",
        className,
      )}
      aria-hidden="true"
    >
      <BookOpen
        className={cn(compact ? "size-4" : "size-6", "opacity-75")}
        strokeWidth={1.6}
      />
      {!compact && (
        <span className="mt-1.5 px-2 text-center font-mono text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
          {displayInitial ? `Draf ${displayInitial}` : "Tanpa Sampul"}
        </span>
      )}
    </div>
  );
}
