import { useState } from "react";
import type { ExplorePostItemDto } from "@starter/shared/types";
import { AnzaLogoMark } from "@/components/brand";
import { cn } from "@/lib/utils";

function isLoadableCoverUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  const trimmed = url.trim();
  return (
    trimmed.startsWith("https://") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("data:image/")
  );
}

export function BookCoverThumb({
  book,
  className,
}: {
  book: ExplorePostItemDto["book"];
  className?: string;
}) {
  const [imgFailed, setImgFailed] = useState(false);

  if (isLoadableCoverUrl(book.coverUrl) && !imgFailed) {
    return (
      <img
        src={book.coverUrl}
        alt={`Sampul ${book.title}`}
        loading="lazy"
        onError={() => setImgFailed(true)}
        className={cn(
          "aspect-[7/10] w-14 shrink-0 rounded-md object-cover shadow-sm border border-black/15",
          className,
        )}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative aspect-[7/10] w-14 shrink-0 overflow-hidden rounded-md border border-white/15 p-1.5 shadow-sm flex flex-col justify-between text-[#F6F2E9]",
        className,
      )}
      style={{ backgroundColor: book.coverColor || "#3D3229" }}
    >
      <div className="flex items-center justify-end">
        <AnzaLogoMark variant="badge" className="size-3.5" />
      </div>
      <p className="font-serif text-[9px] font-bold leading-tight line-clamp-3">
        {book.title}
      </p>
      <span className="h-0.5 w-6 bg-[var(--color-accent)] rounded-full" />
    </div>
  );
}
