import { useId, useMemo, useState, type FormEvent } from "react";
import {
  Flag,
  Loader2,
  MessageSquareText,
  Pencil,
  Star,
  Trash2,
} from "lucide-react";
import { upsertSpotReviewSchema } from "@starter/shared/validators/spots";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  useDeleteSpotReview,
  useSpotReviews,
  useUpsertSpotReview,
} from "../hooks";
import {
  SPOT_REVIEW_TAG_LABELS,
  calculateRatingPercent,
  formatSpotApiError,
  toggleVibeTagSelection,
} from "../spots-helpers";
import {
  spotReviewTagValues,
  type ReadingSpotReviewDto,
  type SpotReviewTag,
} from "../types";

type SpotReviewsSectionProps = {
  spotSlug: string;
  spotName: string;
  currentUserId: string;
  initialMyReview?: ReadingSpotReviewDto | null;
  onReportReview: (review: { id: string; authorName: string }) => void;
};

const STAR_LEVELS = [5, 4, 3, 2, 1] as const;

function formatReviewDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function SpotReviewsSection({
  spotSlug,
  spotName,
  currentUserId,
  initialMyReview = null,
  onReportReview,
}: SpotReviewsSectionProps) {
  const [limitState, setLimitState] = useState<{ slug: string; limit: number }>(
    { slug: spotSlug, limit: 10 },
  );
  const activeLimit = limitState.slug === spotSlug ? limitState.limit : 10;

  const {
    data: reviewsResponse,
    isLoading,
    isFetching,
  } = useSpotReviews(spotSlug, { limit: activeLimit, offset: 0 });

  const upsertMutation = useUpsertSpotReview(spotSlug);
  const deleteMutation = useDeleteSpotReview(spotSlug);

  const reviews = useMemo(
    () => reviewsResponse?.data ?? [],
    [reviewsResponse?.data],
  );
  const summary = reviewsResponse?.summary ?? {
    ratingAvg: 0,
    ratingCount: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    tagCounts: {},
  };
  const hasMore = Boolean(reviewsResponse?.meta?.hasMore) && activeLimit < 100;

  const myReview = useMemo(() => {
    if (initialMyReview && initialMyReview.userId === currentUserId) {
      return initialMyReview;
    }
    return reviews.find((item) => item.userId === currentUserId) ?? null;
  }, [currentUserId, initialMyReview, reviews]);

  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [confirmDeleteSlug, setConfirmDeleteSlug] = useState<string | null>(
    null,
  );
  const [statusNotice, setStatusNotice] = useState<{
    slug: string;
    tone: "success" | "error";
    text: string;
  } | null>(null);

  const isEditing = editingSlug === spotSlug;
  const isConfirmingDelete = confirmDeleteSlug === spotSlug;
  const activeNotice = statusNotice?.slug === spotSlug ? statusNotice : null;

  const topVibeTags = useMemo(() => {
    return Object.entries(summary.tagCounts)
      .filter((entry): entry is [SpotReviewTag, number] => {
        const [tag, count] = entry;
        return (
          tag in SPOT_REVIEW_TAG_LABELS &&
          typeof count === "number" &&
          count > 0
        );
      })
      .sort((a, b) => b[1] - a[1]);
  }, [summary.tagCounts]);

  const communityReviews = useMemo(
    () => reviews.filter((item) => item.userId !== currentUserId),
    [currentUserId, reviews],
  );

  const handleDeleteReview = () => {
    setStatusNotice(null);
    deleteMutation.mutate(undefined, {
      onSuccess: () => {
        setConfirmDeleteSlug(null);
        setEditingSlug(null);
        setStatusNotice({
          slug: spotSlug,
          tone: "success",
          text: "Ulasan Anda telah dihapus.",
        });
      },
      onError: (err) => {
        setStatusNotice({
          slug: spotSlug,
          tone: "error",
          text: formatSpotApiError(err, "Gagal menghapus ulasan."),
        });
      },
    });
  };

  return (
    <section
      aria-label={`Ulasan dan rating untuk ${spotName}`}
      className="space-y-5 border-t border-border pt-5"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-serif text-lg font-bold text-foreground">
          Rating &amp; Ulasan Pembaca
        </h3>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {summary.ratingCount} ulasan
        </span>
      </div>

      {/* Aggregate Rating & Distribution */}
      <div className="rounded-xl border border-border bg-[var(--color-paper-2)] p-4 space-y-4">
        <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-4 items-center">
          <div className="text-center pr-3 border-r border-border min-w-[84px]">
            <p className="font-mono text-3xl font-bold tabular-nums text-foreground leading-none">
              {summary.ratingCount > 0 ? summary.ratingAvg.toFixed(1) : "—"}
            </p>
            <div
              className="mt-1.5 flex items-center justify-center gap-0.5"
              aria-hidden="true"
            >
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`size-3.5 ${
                    star <= Math.round(summary.ratingAvg)
                      ? "fill-[var(--color-accent)] text-[var(--color-accent)]"
                      : "text-border"
                  }`}
                />
              ))}
            </div>
            <p className="mt-1 font-mono text-[11px] tabular-nums text-muted-foreground">
              {summary.ratingCount} rating
            </p>
          </div>

          <div className="space-y-1.5" aria-label="Distribusi bintang">
            {STAR_LEVELS.map((star) => {
              const count = summary.distribution[star] ?? 0;
              const pct = calculateRatingPercent(count, summary.ratingCount);
              return (
                <div
                  key={star}
                  className="grid grid-cols-[28px_minmax(0,1fr)_32px] items-center gap-2 text-xs font-mono tabular-nums"
                >
                  <span className="text-muted-foreground">{star}★</span>
                  <div className="h-2 rounded-full bg-background border border-border/70 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--color-accent)]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-right text-muted-foreground">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {topVibeTags.length > 0 && (
          <div className="pt-3 border-t border-border/80 space-y-2">
            <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Suasana Baca Paling Sering Disebut
            </p>
            <div className="flex flex-wrap gap-1.5">
              {topVibeTags.map(([tag, count]) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-xs text-foreground"
                >
                  <span>{SPOT_REVIEW_TAG_LABELS[tag]}</span>
                  <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                    {count}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {activeNotice && (
        <p
          role={activeNotice.tone === "error" ? "alert" : "status"}
          className={`rounded-xl border px-3.5 py-2.5 text-xs font-medium ${
            activeNotice.tone === "error"
              ? "border-[var(--color-error)]/40 bg-[var(--color-error-soft)] text-[var(--color-error)]"
              : "border-[var(--color-green)]/40 bg-[var(--color-green-soft)] text-[var(--color-green)]"
          }`}
        >
          {activeNotice.text}
        </p>
      )}

      {/* Own Review Card or Inline Composer / Editor */}
      {myReview && !isEditing ? (
        <div className="rounded-xl border border-[var(--color-accent)]/45 bg-[var(--color-accent-soft)]/30 p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-wider font-semibold text-[var(--color-accent-text)]">
                Ulasan Anda
              </p>
              <div className="mt-1 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 font-mono text-xs font-bold tabular-nums text-foreground">
                  <Star
                    className="size-3.5 fill-[var(--color-accent)] text-[var(--color-accent)]"
                    aria-hidden="true"
                  />
                  {myReview.rating}.0
                </span>
                <span className="text-xs text-muted-foreground">
                  · {formatReviewDate(myReview.updatedAt)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setConfirmDeleteSlug(null);
                  setStatusNotice(null);
                  setEditingSlug(spotSlug);
                }}
                className="min-h-11 px-3 text-xs"
              >
                <Pencil className="size-3.5" aria-hidden="true" />
                <span>Edit Ulasan</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setStatusNotice(null);
                  setConfirmDeleteSlug(isConfirmingDelete ? null : spotSlug);
                }}
                className="min-h-11 px-3 text-xs text-[var(--color-error)] hover:text-[var(--color-error)]"
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
                <span>Hapus</span>
              </Button>
            </div>
          </div>

          {myReview.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {myReview.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-foreground"
                >
                  {SPOT_REVIEW_TAG_LABELS[tag]}
                </span>
              ))}
            </div>
          )}

          <p className="text-sm text-foreground leading-relaxed whitespace-pre-line break-words">
            {myReview.content}
          </p>

          {isConfirmingDelete && (
            <div
              role="alert"
              className="rounded-lg border border-[var(--color-error)]/40 bg-background p-3 flex flex-wrap items-center justify-between gap-2"
            >
              <p className="text-xs font-medium text-foreground">
                Yakin ingin menghapus ulasan Anda untuk sudut baca ini?
              </p>
              <div className="flex items-center gap-2 ml-auto">
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={deleteMutation.isPending}
                  onClick={handleDeleteReview}
                  className="min-h-11 text-xs"
                >
                  {deleteMutation.isPending && (
                    <Loader2
                      className="size-3.5 animate-spin"
                      aria-hidden="true"
                    />
                  )}
                  <span>Ya, Hapus</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={deleteMutation.isPending}
                  onClick={() => setConfirmDeleteSlug(null)}
                  className="min-h-11 text-xs"
                >
                  Batal
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <ReviewComposerForm
          key={`${spotSlug}:${myReview?.id ?? "new"}:${isEditing ? "edit" : "create"}`}
          initialRating={myReview?.rating ?? 0}
          initialTags={myReview?.tags ?? []}
          initialContent={myReview?.content ?? ""}
          isEditing={Boolean(myReview)}
          isPending={upsertMutation.isPending}
          onCancel={
            myReview
              ? () => {
                  setEditingSlug(null);
                }
              : undefined
          }
          onSubmit={(input, onError) => {
            setStatusNotice(null);
            upsertMutation.mutate(input, {
              onSuccess: () => {
                setEditingSlug(null);
                setStatusNotice({
                  slug: spotSlug,
                  tone: "success",
                  text: myReview
                    ? "Perubahan ulasan berhasil disimpan."
                    : "Terima kasih! Ulasan Anda sudah tayang.",
                });
              },
              onError: (err) => {
                onError(
                  formatSpotApiError(
                    err,
                    "Gagal menyimpan ulasan. Silakan coba lagi.",
                  ),
                );
              },
            });
          }}
        />
      )}

      {/* Community Review List */}
      <div className="space-y-3">
        <h4 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          Ulasan Komunitas
        </h4>

        {isLoading ? (
          <div className="space-y-2.5" aria-label="Memuat ulasan">
            {[0, 1].map((idx) => (
              <div
                key={idx}
                className="h-24 rounded-xl border border-border bg-[var(--color-paper-2)] animate-pulse"
              />
            ))}
          </div>
        ) : communityReviews.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-[var(--color-paper-2)] p-4 text-center space-y-1">
            <MessageSquareText
              className="size-5 text-muted-foreground mx-auto"
              aria-hidden="true"
            />
            <p className="text-xs font-medium text-foreground">
              {myReview
                ? "Belum ada ulasan dari pembaca lain."
                : "Jadilah pembaca pertama yang berbagi pengalaman di sini."}
            </p>
          </div>
        ) : (
          <ul className="ruled-index" aria-label="Daftar ulasan pembaca">
            {communityReviews.map((review) => (
              <li key={review.id} className="py-3.5 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      aria-hidden="true"
                      className="size-8 rounded-full border border-border bg-[var(--color-paper-2)] flex items-center justify-center font-mono text-xs font-bold text-foreground shrink-0"
                    >
                      {review.userName.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {review.userName}
                      </p>
                      <div className="flex items-center gap-2 font-mono text-[11px] tabular-nums text-muted-foreground">
                        <span className="inline-flex items-center gap-0.5 text-foreground font-semibold">
                          <Star
                            className="size-3 fill-[var(--color-accent)] text-[var(--color-accent)]"
                            aria-hidden="true"
                          />
                          {review.rating}.0
                        </span>
                        <span>·</span>
                        <span>{formatReviewDate(review.updatedAt)}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      onReportReview({
                        id: review.id,
                        authorName: review.userName,
                      })
                    }
                    className="min-h-11 inline-flex items-center gap-1 rounded-lg px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-ring"
                    aria-label={`Laporkan ulasan dari ${review.userName}`}
                  >
                    <Flag className="size-3.5" aria-hidden="true" />
                    <span>Laporkan ulasan</span>
                  </button>
                </div>

                {review.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {review.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded border border-border bg-[var(--color-paper-2)] px-2 py-0.5 text-[11px] text-muted-foreground"
                      >
                        {SPOT_REVIEW_TAG_LABELS[tag]}
                      </span>
                    ))}
                  </div>
                )}

                <p className="text-sm text-foreground leading-relaxed whitespace-pre-line break-words">
                  {review.content}
                </p>
              </li>
            ))}
          </ul>
        )}

        {hasMore && (
          <Button
            type="button"
            variant="outline"
            disabled={isFetching}
            onClick={() =>
              setLimitState({
                slug: spotSlug,
                limit: Math.min(100, activeLimit + 10),
              })
            }
            className="w-full min-h-11 text-xs"
          >
            {isFetching ? "Memuat ulasan..." : "Muat ulasan lainnya"}
          </Button>
        )}
      </div>
    </section>
  );
}

function ReviewComposerForm({
  initialRating,
  initialTags,
  initialContent,
  isEditing,
  isPending,
  onCancel,
  onSubmit,
}: {
  initialRating: number;
  initialTags: SpotReviewTag[];
  initialContent: string;
  isEditing: boolean;
  isPending: boolean;
  onCancel?: () => void;
  onSubmit: (
    input: { rating: number; content: string; tags: SpotReviewTag[] },
    onError: (message: string) => void,
  ) => void;
}) {
  const starGroupName = useId();
  const textareaId = useId();
  const errorId = useId();

  const [rating, setRating] = useState<number>(initialRating);
  const [tags, setTags] = useState<SpotReviewTag[]>(initialTags);
  const [content, setContent] = useState<string>(initialContent);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFieldError(null);
    setApiError(null);

    const parsed = upsertSpotReviewSchema.safeParse({
      rating,
      content: content.trim(),
      tags,
    });

    if (!parsed.success) {
      setFieldError(
        parsed.error.issues[0]?.message ?? "Periksa kembali ulasan Anda.",
      );
      return;
    }

    onSubmit(parsed.data, (message) => setApiError(message));
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-border bg-card p-4 space-y-4"
      noValidate
    >
      <div className="space-y-1">
        <h4 className="font-serif text-base font-bold text-foreground">
          {isEditing ? "Edit Ulasan Anda" : "Tulis Ulasan Sudut Baca"}
        </h4>
        <p className="text-xs text-muted-foreground">
          Bagikan kenyamanan colokan, ketenangan, dan suasana bacanya untuk
          pembaca lain.
        </p>
      </div>

      {/* Accessible 1..5 Integer Star Radio Group (>= 44x44px tap targets) */}
      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold text-foreground">
          Rating kenyamanan baca (1–5 bintang) <span aria-hidden="true">*</span>
        </legend>
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((value) => {
            const active = value <= rating;
            return (
              <label
                key={value}
                className={`size-11 rounded-lg border flex items-center justify-center transition-colors cursor-pointer has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring ${
                  active
                    ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent-text)]"
                    : "border-border bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                <input
                  type="radio"
                  name={starGroupName}
                  value={value}
                  checked={rating === value}
                  onChange={() => {
                    setRating(value);
                    if (fieldError) setFieldError(null);
                  }}
                  aria-label={`${value} bintang`}
                  className="sr-only"
                />
                <Star
                  className={`size-5 ${
                    active
                      ? "fill-[var(--color-accent)] text-[var(--color-accent)]"
                      : ""
                  }`}
                  aria-hidden="true"
                />
              </label>
            );
          })}
          {rating > 0 && (
            <span className="ml-2 font-mono text-xs font-semibold tabular-nums text-foreground">
              {rating}/5
            </span>
          )}
        </div>
      </fieldset>

      {/* Multi-select up to 3 Reading Vibe Tags */}
      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold text-foreground">
          Tag suasana baca (opsional, pilih maks 3 —{" "}
          <span className="font-mono tabular-nums">{tags.length}/3</span>)
        </legend>
        <div className="flex flex-wrap gap-1.5">
          {spotReviewTagValues.map((tag) => {
            const selected = tags.includes(tag);
            const atLimit = !selected && tags.length >= 3;
            return (
              <button
                key={tag}
                type="button"
                aria-pressed={selected}
                disabled={atLimit}
                onClick={() =>
                  setTags((prev) => toggleVibeTagSelection(prev, tag, 3))
                }
                className={`min-h-11 rounded-lg border px-3 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring ${
                  selected
                    ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-foreground font-semibold cursor-pointer"
                    : atLimit
                      ? "border-border/60 bg-muted/40 text-muted-foreground/60 cursor-not-allowed"
                      : "border-border bg-background text-muted-foreground hover:text-foreground cursor-pointer"
                }`}
              >
                {SPOT_REVIEW_TAG_LABELS[tag]}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Review Content */}
      <div className="space-y-1.5">
        <label
          htmlFor={textareaId}
          className="block text-xs font-semibold text-foreground"
        >
          Ceritakan pengalaman bacamu (10–1500 karakter){" "}
          <span aria-hidden="true">*</span>
        </label>
        <Textarea
          id={textareaId}
          name="content"
          rows={3}
          required
          minLength={10}
          maxLength={1500}
          value={content}
          onChange={(event) => {
            const next = event.target.value;
            setContent(next);
            if (fieldError && next.trim().length >= 10 && rating >= 1) {
              setFieldError(null);
            }
          }}
          onBlur={() => {
            if (content.length > 0 && content.trim().length < 10) {
              setFieldError("Ulasan minimal 10 karakter");
            }
          }}
          aria-invalid={Boolean(fieldError)}
          aria-describedby={fieldError ? errorId : undefined}
          placeholder="Contoh: Pencahayaan hangat, banyak colokan di meja panjang, cocok buat baca novel 2 jam..."
          className="text-base sm:text-sm bg-background"
        />
        <div className="flex items-center justify-between gap-2 text-xs">
          {fieldError ? (
            <p
              id={errorId}
              role="alert"
              className="text-[var(--color-error)] font-medium"
            >
              {fieldError}
            </p>
          ) : (
            <span className="text-muted-foreground">
              1 akun menyimpan 1 ulasan aktif per sudut baca.
            </span>
          )}
          <span className="font-mono tabular-nums text-muted-foreground shrink-0">
            {content.trim().length}/1500
          </span>
        </div>
      </div>

      {apiError && (
        <p
          role="alert"
          className="rounded-lg border border-[var(--color-error)]/40 bg-[var(--color-error-soft)] px-3 py-2 text-xs font-medium text-[var(--color-error)]"
        >
          {apiError}
        </p>
      )}

      <div className="flex items-center justify-end gap-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isPending}
            className="min-h-11 text-xs"
          >
            Batal
          </Button>
        )}
        <Button
          type="submit"
          disabled={isPending}
          className="min-h-11 bg-[var(--color-accent)] text-[var(--color-accent-ink)] hover:opacity-90 font-semibold text-xs px-4"
        >
          {isPending && (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          )}
          <span>{isEditing ? "Simpan Perubahan" : "Kirim Ulasan"}</span>
        </Button>
      </div>
    </form>
  );
}
