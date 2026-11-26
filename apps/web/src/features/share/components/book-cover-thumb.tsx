import type { ExplorePostItemDto } from "@starter/shared/types";
import { BookCover } from "@/features/books/components/book-cover";
import { cn } from "@/lib/utils";

export function BookCoverThumb({
  book,
  className,
}: {
  book: ExplorePostItemDto["book"];
  className?: string;
}) {
  return (
    <BookCover
      book={{
        title: book.title,
        author: book.author,
        coverUrl: book.coverUrl,
        coverColor: book.coverColor || "#3D3229",
        publishedYear: book.publishedYear ?? 2026,
        genres: book.genres ?? [],
        pageCount: book.pageCount ?? 160,
      }}
      className={cn("w-14 shrink-0", className)}
      decorative
    />
  );
}
