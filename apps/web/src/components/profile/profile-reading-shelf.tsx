import { BookMarked, CheckCircle2, TrendingUp } from "lucide-react";
import type { ShelfItemDto } from "@starter/shared/types";
import { BookCard } from "@/features/books/components/book-card";

type ProfileReadingShelfProps = {
  shelves: ShelfItemDto[];
  isOwner?: boolean;
  ownerName?: string;
};

export function ProfileReadingShelf({
  shelves,
  isOwner = false,
  ownerName,
}: ProfileReadingShelfProps) {
  const reading = shelves.filter((item) => item.shelfStatus === "reading");
  const finished = shelves.filter((item) => item.shelfStatus === "finished");
  const wantToRead = shelves.filter(
    (item) => item.shelfStatus === "want_to_read",
  );

  const groups = [
    {
      key: "reading" as const,
      title: "Sedang Dibaca",
      icon: (
        <TrendingUp
          className="size-4 text-[var(--color-accent)]"
          aria-hidden="true"
        />
      ),
      items: reading,
    },
    {
      key: "finished" as const,
      title: "Buku Tamat",
      icon: (
        <CheckCircle2
          className="size-4 text-[var(--color-green)]"
          aria-hidden="true"
        />
      ),
      items: finished,
    },
    {
      key: "want_to_read" as const,
      title: "Ingin Dibaca",
      icon: (
        <BookMarked
          className="size-4 text-[var(--color-muted)]"
          aria-hidden="true"
        />
      ),
      items: wantToRead,
    },
  ].filter((group) => group.items.length > 0);

  if (groups.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--color-rule)] p-10 text-center text-xs text-[var(--color-muted)]">
        {isOwner
          ? "Belum ada buku di rak bacaanmu. Telusuri katalog di tab Explore untuk mulai membaca atau menyimpan buku."
          : `Belum ada buku di rak bacaan ${ownerName || "pembaca ini"}.`}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {groups.map((group, index) => (
        <section
          key={group.key}
          aria-labelledby={`shelf-group-${group.key}`}
          className={
            index > 0
              ? "space-y-4 border-t border-[var(--color-rule)] pt-6"
              : "space-y-4"
          }
        >
          <h3
            id={`shelf-group-${group.key}`}
            className="flex items-center gap-2 font-serif text-lg font-bold text-[var(--color-ink)]"
          >
            {group.icon}
            <span>
              {group.title} ({group.items.length})
            </span>
          </h3>

          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {group.items.map((item) => (
              <li key={item.id}>
                {group.key === "reading" ? (
                  <BookCard
                    book={item.book}
                    variant="reading"
                    hrefMode={isOwner ? "read" : "detail"}
                    progressPercent={item.progressPercent}
                    previewProgressPercent={item.previewProgressPercent}
                    previewBookPercent={item.previewBookPercent}
                    headingLevel="h4"
                  />
                ) : (
                  <BookCard
                    book={item.book}
                    variant="shelf"
                    hrefMode="detail"
                    showPrice={group.key === "want_to_read"}
                    headingLevel="h4"
                  />
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
