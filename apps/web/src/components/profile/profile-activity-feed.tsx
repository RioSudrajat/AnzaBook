import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Clock, ExternalLink, Heart, Quote, Share2, Star } from "lucide-react";
import type { BookSummaryDto, ExplorePostItemDto } from "@starter/shared/types";
import { Button } from "@/components/ui/button";
import { BookCover } from "@/features/books/components/book-cover";
import { PostShareDialog } from "@/features/share/components/post-share-dialog";
import { QuotePostCard } from "@/features/share/components/quote-post-card";
import { SessionPostCard } from "@/features/share/components/session-post-card";

export type ProfileActivityEntry = {
  post: ExplorePostItemDto;
  /** Visibility indicator on owner profile; omitted on public profile. */
  isPosted?: boolean;
  /** Owner publish/re-share action for highlights and reading sessions. */
  onOwnerShare?: () => void;
};

type ActivityFilter = "all" | "quote" | "session" | "review";

type ProfileActivityFeedProps = {
  entries: ProfileActivityEntry[];
  isOwner?: boolean;
  ownerName?: string;
};

function RatingStars({ value }: { value: number }) {
  return (
    <span
      className="inline-flex items-center gap-0.5 text-amber-500"
      role="img"
      aria-label={`${value.toFixed(1)} dari 5`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`size-3.5 ${
            value >= n - 0.25
              ? "fill-amber-500 text-amber-500"
              : "text-[var(--color-rule)]"
          }`}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

function ReviewBookLine({ book }: { book: ExplorePostItemDto["book"] }) {
  return (
    <Link
      to="/books/$slug"
      params={{ slug: book.slug }}
      className="group flex w-fit max-w-full items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-[var(--color-focus)]"
    >
      <BookCover
        book={book as unknown as BookSummaryDto}
        decorative
        className="w-10 shrink-0"
      />
      <span className="min-w-0">
        <span className="block truncate font-serif text-sm font-bold text-[var(--color-ink)] group-hover:text-[var(--color-accent)] transition-colors">
          {book.title}
        </span>
        <span className="block truncate text-xs text-[var(--color-muted)]">
          {book.author}
        </span>
      </span>
    </Link>
  );
}

export function ProfileActivityFeed({
  entries,
  isOwner = false,
  ownerName,
}: ProfileActivityFeedProps) {
  const [filter, setFilter] = useState<ActivityFilter>("all");

  const quoteCount = entries.filter((e) => e.post.type === "quote").length;
  const sessionCount = entries.filter((e) => e.post.type === "session").length;
  const reviewCount = entries.filter((e) => e.post.type === "review").length;

  const filtered =
    filter === "all"
      ? entries
      : entries.filter((entry) => entry.post.type === filter);

  const filterChips: Array<{
    id: ActivityFilter;
    label: string;
    count: number;
  }> = [
    { id: "all", label: "Semua", count: entries.length },
    { id: "quote", label: "Kutipan", count: quoteCount },
    { id: "session", label: "Sesi Baca", count: sessionCount },
    { id: "review", label: "Ulasan", count: reviewCount },
  ];

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--color-rule)] p-10 text-center text-xs text-[var(--color-muted)]">
        {isOwner
          ? "Belum ada kutipan, sesi membaca, atau ulasan buku. Mulai membaca dan sorot teks di E-Reader untuk mencatat aktivitas literasimu."
          : `${ownerName || "Pembaca ini"} belum membagikan kutipan, ulasan, atau sesi membaca ke linimasa.`}
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div
        role="group"
        aria-label="Filter jenis aktivitas"
        className="flex flex-wrap items-center gap-2"
      >
        {filterChips.map((chip) => {
          const active = filter === chip.id;
          return (
            <button
              key={chip.id}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(chip.id)}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 font-sans text-xs font-medium transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--color-focus)] ${
                active
                  ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-paper)]"
                  : "border-[var(--color-rule)] bg-[var(--color-paper-2)] text-[var(--color-ink-2)] hover:border-[var(--color-ink)]/40"
              }`}
            >
              <span>{chip.label}</span>
              <span
                className={`font-mono text-[10px] tabular-nums ${
                  active ? "opacity-85" : "text-[var(--color-muted)]"
                }`}
              >
                {chip.count}
              </span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--color-rule)] p-8 text-center text-xs text-[var(--color-muted)]">
          Belum ada aktivitas pada kategori ini.
        </p>
      ) : (
        <div className="space-y-4">
          {filtered.map((entry) => (
            <ActivityItemCard
              key={`${entry.post.type}-${entry.post.id}`}
              entry={entry}
              isOwner={isOwner}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ActivityItemCard({
  entry,
  isOwner,
}: {
  entry: ProfileActivityEntry;
  isOwner: boolean;
}) {
  const { post, isPosted, onOwnerShare } = entry;
  const [isLiked, setIsLiked] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);

  const formattedDate = new Date(post.createdAt).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const isShareablePost = post.type === "quote" || post.type === "session";
  const showDetailLink =
    isShareablePost && (isOwner ? Boolean(isPosted) : true);

  return (
    <article className="rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-4 sm:p-5 space-y-3.5 transition-colors hover:border-[var(--color-ink)]/30">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--color-muted)]">
        <div className="flex flex-wrap items-center gap-2">
          {post.type === "quote" && (
            <span className="inline-flex items-center gap-1 rounded-md bg-[var(--color-green-soft)] px-2.5 py-0.5 font-mono text-[11px] font-medium text-[var(--color-green)]">
              <Quote className="size-3" aria-hidden="true" />
              <span>{isOwner && !isPosted ? "Kutipan" : "Kutipan Publik"}</span>
            </span>
          )}
          {post.type === "review" && (
            <span className="inline-flex items-center gap-1 rounded-md bg-[var(--color-accent-soft)] px-2.5 py-0.5 font-mono text-[11px] font-medium text-[var(--color-ink)]">
              <Star className="size-3 fill-current" aria-hidden="true" />
              <span>Ulasan Buku</span>
            </span>
          )}
          {post.type === "session" && (
            <span className="inline-flex items-center gap-1 rounded-md bg-[var(--color-accent-soft)] px-2.5 py-0.5 font-mono text-[11px] font-medium text-[var(--color-ink)]">
              <Clock className="size-3" aria-hidden="true" />
              <span>Sesi Membaca</span>
            </span>
          )}
          <span className="font-mono text-[11px]">{formattedDate}</span>
        </div>

        {post.type === "review" && typeof post.rating === "number" && (
          <div className="flex items-center gap-1.5">
            <RatingStars value={post.rating} />
            <span className="font-mono text-[11px] font-semibold tabular-nums text-[var(--color-ink-2)]">
              {post.rating.toFixed(1)}/5
            </span>
          </div>
        )}
      </div>

      {post.type === "quote" ? (
        <QuotePostCard post={post} as="div" />
      ) : post.type === "session" ? (
        <SessionPostCard post={post} as="div" />
      ) : (
        <div className="space-y-3">
          <ReviewBookLine book={post.book} />
          <p className="whitespace-pre-line font-serif text-[15px] leading-relaxed text-[var(--color-ink)]/90">
            {post.content}
          </p>
        </div>
      )}

      {isOwner ? (
        isShareablePost ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-[var(--color-rule)] pt-3">
            <span
              className={`inline-flex items-center rounded-md border px-2.5 py-1 font-mono text-[11px] font-medium ${
                isPosted
                  ? "border-[var(--color-green)]/40 bg-[var(--color-green-soft)] text-[var(--color-ink)]"
                  : "border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-muted)]"
              }`}
            >
              {isPosted ? "Dipublikasikan ke Eksplor" : "Catatan Pribadi"}
            </span>

            <div className="ml-auto flex flex-wrap items-center gap-2">
              {showDetailLink && (
                <Link
                  to="/post/$type/$id"
                  params={{ type: post.type, id: post.id }}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 text-xs font-medium text-[var(--color-ink)] hover:bg-[var(--color-paper-3)] transition-colors"
                >
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                  <span>Lihat Post</span>
                </Link>
              )}

              {onOwnerShare && (
                <Button
                  type="button"
                  size="sm"
                  variant={isPosted ? "outline" : "default"}
                  onClick={onOwnerShare}
                  className={`min-h-11 cursor-pointer rounded-xl px-3.5 text-xs inline-flex items-center gap-1.5 ${
                    isPosted
                      ? "border-[var(--color-green)]/40 bg-[var(--color-green-soft)] text-[var(--color-ink)]"
                      : "bg-[var(--color-accent)] font-semibold text-[var(--color-accent-ink)] hover:brightness-95"
                  }`}
                >
                  <Share2 className="size-3.5" aria-hidden="true" />
                  <span>{isPosted ? "Bagikan Ulang" : "Post & Bagikan"}</span>
                </Button>
              )}
            </div>
          </div>
        ) : null
      ) : (
        <div className="flex flex-wrap items-center gap-3 border-t border-[var(--color-rule)] pt-2.5 text-xs text-[var(--color-muted)]">
          <button
            type="button"
            onClick={() => setIsLiked((prev) => !prev)}
            className={`inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-md px-2 transition-colors hover:text-destructive focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] ${
              isLiked ? "font-semibold text-destructive" : ""
            }`}
          >
            <Heart className={`size-4 ${isLiked ? "fill-current" : ""}`} />
            <span>{isLiked ? 1 : 0}</span>
          </button>

          <div className="ml-auto flex items-center gap-1.5">
            {showDetailLink && (
              <Link
                to="/post/$type/$id"
                params={{ type: post.type, id: post.id }}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-[var(--color-muted)] transition-colors hover:bg-[var(--color-paper-3)] hover:text-[var(--color-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
              >
                <ExternalLink className="size-3.5" aria-hidden="true" />
                <span>Detail</span>
              </Link>
            )}

            <button
              type="button"
              onClick={() => setIsShareOpen(true)}
              className="inline-flex min-h-10 min-w-10 cursor-pointer items-center justify-center gap-1.5 rounded-md px-2.5 transition-colors hover:bg-[var(--color-paper-3)] hover:text-[var(--color-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
              aria-label="Bagikan aktivitas"
            >
              <Share2 className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Bagikan</span>
            </button>
          </div>
        </div>
      )}

      {!isOwner && (
        <PostShareDialog
          post={isShareOpen ? post : null}
          onClose={() => setIsShareOpen(false)}
        />
      )}
    </article>
  );
}
