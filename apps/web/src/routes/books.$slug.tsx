import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  BookMarked,
  BookOpen,
  Check,
  Clock,
  Headphones,
  Loader2,
  MessageSquare,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import type { EditionTier } from "@starter/shared/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ClaimCodeDialog } from "@/features/books/components/claim-code-dialog";
import { LiveStockTracker } from "@/features/books/components/live-stock-tracker";
import { PaperTierSelector } from "@/features/books/components/paper-tier-selector";
import {
  useBookDetail,
  useBookReviews,
  useCreateReview,
} from "@/features/books/hooks";
import { bookDetailQuery } from "@/features/books/queries";
import { useUpsertShelf } from "@/features/community/hooks";

export const Route = createFileRoute("/books/$slug")({
  loader: ({ context, params }) => {
    return context.queryClient.ensureQueryData(bookDetailQuery(params.slug));
  },
  component: BookDetailPage,
});

function BookDetailPage() {
  const { slug } = Route.useParams();
  const { data: book } = useBookDetail(slug);
  const { data: reviews = [] } = useBookReviews(slug);

  const [shelfSaved, setShelfSaved] = useState(false);
  const [selectedRating, setSelectedRating] = useState(5.0);
  const [reviewTier, setReviewTier] = useState<EditionTier | "digital">(
    "rakyat_economy",
  );
  const [reviewContent, setReviewContent] = useState("");
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  const upsertShelfMutation = useUpsertShelf();
  const createReviewMutation = useCreateReview(slug);

  const handleAddToShelf = async () => {
    try {
      await upsertShelfMutation.mutateAsync({
        bookId: book.id,
        shelfStatus: "want_to_read",
        favorite: false,
      });
      setShelfSaved(true);
      setTimeout(() => setShelfSaved(false), 4000);
    } catch {
      // Ignore or fall back gracefully
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reviewContent.trim().length < 5) {
      setReviewError("Tulis minimal 5 karakter ulasan.");
      return;
    }
    setReviewError(null);

    try {
      await createReviewMutation.mutateAsync({
        bookId: book.id,
        rating: selectedRating,
        content: reviewContent.trim(),
        editionTierReviewed: reviewTier,
      });
      setReviewContent("");
      setReviewSuccess(true);
      setTimeout(() => setReviewSuccess(false), 5000);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setReviewError(
        error?.message ||
          "Gagal mengirim ulasan. Pastikan Anda sudah masuk ke akun Anda.",
      );
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Top Breadcrumb & Quick Bar */}
      <div className="border-b border-border/80 bg-background/95 backdrop-blur-xs sticky top-14 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-12 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            <span>Kembali ke Katalog</span>
          </Link>

          <div className="flex items-center gap-2">
            <ClaimCodeDialog
              slug={book.slug}
              bookTitle={book.title}
              hasClaimedDigital={book.hasClaimedDigital}
            />
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 space-y-12">
        {/* Book Hero Header */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Cover Visual */}
          <div className="lg:col-span-4 flex justify-center lg:justify-start">
            <div
              className="w-[220px] sm:w-[260px] h-[320px] sm:h-[380px] rounded-[3px_8px_8px_3px] shadow-2xl p-6 flex flex-col justify-between relative transition-transform hover:scale-[1.01]"
              style={{
                backgroundColor: book.coverColor || "#1B1713",
                color: "#F6F2E9",
              }}
            >
              {/* Spine texture overlay */}
              <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-black/60 via-white/10 to-transparent pointer-events-none" />

              {/* Book Header */}
              <div className="flex items-center justify-between text-xs font-mono opacity-85 z-10">
                <span>{book.publishedYear}</span>
                <span className="uppercase text-[10px] tracking-wider px-1.5 py-0.5 bg-white/10 rounded-[3px]">
                  {book.genres[0] || "Klasik"}
                </span>
              </div>

              {/* Book Title */}
              <div className="z-10 my-auto">
                <h1 className="font-serif text-xl sm:text-2xl font-bold leading-tight">
                  {book.title}
                </h1>
                {book.originalTitle && (
                  <p className="text-xs opacity-75 italic mt-1 font-serif">
                    Judul asli: {book.originalTitle}
                  </p>
                )}
                <p className="text-sm font-sans opacity-90 mt-2">
                  {book.author}
                </p>
                {book.translator && (
                  <p className="text-xs opacity-70 font-sans mt-0.5">
                    Terjemahan: {book.translator}
                  </p>
                )}
              </div>

              {/* Book Footnote */}
              <div className="z-10 pt-3 border-t border-white/20 flex items-center justify-between text-xs font-mono">
                <span className="text-[var(--color-accent)] font-bold">
                  Rp{book.rakyatPriceIdr.toLocaleString("id-ID")}
                </span>
                <span className="opacity-80">{book.pageCount} Halaman</span>
              </div>
            </div>
          </div>

          {/* Book Information & Metadata */}
          <div className="lg:col-span-8 flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {book.genres.map((g) => (
                  <span
                    key={g}
                    className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 bg-muted rounded-[4px] text-muted-foreground"
                  >
                    {g}
                  </span>
                ))}
                {book.isWeeklyBulletin && (
                  <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 bg-[var(--color-accent)]/10 text-[var(--color-accent)] rounded-[4px] font-semibold flex items-center gap-1">
                    <Sparkles className="size-3" />
                    Buletin Pekan Ini
                  </span>
                )}
              </div>

              <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
                {book.title}
              </h2>
              <p className="text-base text-muted-foreground font-sans mt-1">
                Karya {book.author}
                {book.translator ? `, diterjemahkan oleh ${book.translator}` : ""}
              </p>

              {/* Key Quick Stats */}
              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-mono text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Star className="size-4 text-amber-500 fill-amber-500" />
                  <span className="font-bold text-foreground">
                    {book.ratingAvg.toFixed(1)}
                  </span>
                  <span>({book.ratingCount} ulasan)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="size-3.5" />
                  <span>{book.readingMinutes} Menit Baca</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Headphones className="size-3.5" />
                  <span>{book.audioDurationMinutes} Menit Audio</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="size-3.5" />
                  <span>{book.totalShelved} Tersimpan di Rak</span>
                </div>
              </div>

              {/* Synopsis */}
              <div className="mt-6 prose prose-neutral dark:prose-invert max-w-none">
                <p className="font-serif text-base leading-relaxed text-foreground/90">
                  {book.synopsis}
                </p>
              </div>

              {book.bulletinExcerpt && (
                <div className="mt-5 p-4 rounded-[8px] bg-muted/40 border-l-2 border-[var(--color-accent)]">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-accent)] font-semibold block mb-1">
                    Kutipan Kurator Pekan Ini
                  </span>
                  <p className="font-serif italic text-sm text-foreground/90 leading-relaxed">
                    &quot;{book.bulletinExcerpt}&quot;
                  </p>
                </div>
              )}
            </div>

            {/* Top CTA Row */}
            <div className="mt-8 pt-6 border-t border-border flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="h-11">
                <Link
                  to="/read/$slug"
                  params={{ slug: book.slug }}
                  search={{ mode: "blueprint", chapter: 1 }}
                >
                  <BookOpen className="size-4 mr-2" />
                  Baca Intisari 20 Menit
                </Link>
              </Button>

              <Button asChild variant="outline" size="lg" className="h-11">
                <Link
                  to="/read/$slug"
                  params={{ slug: book.slug }}
                  search={{ mode: "full", chapter: 1 }}
                >
                  Buka Web Reader Dwibahasa
                </Link>
              </Button>

              <Button
                variant="ghost"
                size="lg"
                onClick={handleAddToShelf}
                disabled={upsertShelfMutation.isPending || shelfSaved}
                className="h-11 font-mono text-xs"
              >
                {shelfSaved ? (
                  <>
                    <Check className="size-4 text-emerald-600 mr-1.5" />
                    Tersimpan di Rak!
                  </>
                ) : (
                  <>
                    <BookMarked className="size-4 mr-1.5" />
                    Simpan ke Rak Baca
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Section 1: 3D Paper & Tier Switcher */}
        <section aria-labelledby="paper-tier-heading">
          <PaperTierSelector book={book} />
        </section>

        {/* Section 2: Live Gramedia & Community Stock Tracker */}
        <section aria-labelledby="stock-tracker-heading">
          <LiveStockTracker
            slug={book.slug}
            initialStocks={book.storeStocks}
          />
        </section>

        {/* Section 3: Verified Reader Reviews & Community Marginalia */}
        <section
          aria-labelledby="reader-reviews-heading"
          className="bg-background border border-border rounded-[10px] p-6 shadow-xs"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
            <div>
              <div className="flex items-center gap-2">
                <Star className="size-5 text-amber-500 fill-amber-500" />
                <h3
                  id="reader-reviews-heading"
                  className="font-serif text-xl font-bold tracking-tight"
                >
                  Ulasan Pembaca Terverifikasi
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Ulasan murni dari pembaca edisi cetak rakyat maupun pelanggan web reader dwibahasa.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="font-serif text-2xl font-bold text-foreground">
                  {book.ratingAvg.toFixed(1)}
                  <span className="text-sm font-sans font-normal text-muted-foreground">
                    {" "}/ 5.0
                  </span>
                </div>
                <div className="text-[11px] font-mono text-muted-foreground">
                  Berdasarkan {reviews.length} ulasan
                </div>
              </div>
            </div>
          </div>

          {/* Review Submission Form */}
          <form
            onSubmit={handleReviewSubmit}
            className="mt-6 p-4 rounded-[8px] bg-muted/20 border border-border space-y-4"
          >
            <h4 className="font-serif text-sm font-bold text-foreground">
              Bagikan Catatan & Evaluasi Anda
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Rating picker */}
              <div>
                <label
                  htmlFor="ratingSelector"
                  className="block text-xs font-mono text-muted-foreground mb-1"
                >
                  Rating ({selectedRating} Bintang)
                </label>
                <div className="flex items-center gap-1.5" id="ratingSelector">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setSelectedRating(star)}
                      className="p-1 text-amber-500 hover:scale-110 transition-transform focus-visible:outline-2 focus-visible:outline-[var(--color-focus)] rounded-[4px]"
                      aria-label={`${star} Bintang`}
                    >
                      <Star
                        className={`size-5 ${
                          selectedRating >= star
                            ? "fill-amber-500 text-amber-500"
                            : "text-muted-foreground/40"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Edition tier reviewed */}
              <div>
                <label
                  htmlFor="tierReviewedSelect"
                  className="block text-xs font-mono text-muted-foreground mb-1"
                >
                  Edisi yang Anda Baca
                </label>
                <select
                  id="tierReviewedSelect"
                  value={reviewTier}
                  onChange={(e) =>
                    setReviewTier(e.target.value as EditionTier | "digital")
                  }
                  className="w-full bg-background border border-border rounded-[6px] px-3 py-2 text-xs font-sans text-foreground focus:outline-none focus:ring-1 focus:ring-[var(--color-focus)]"
                >
                  <option value="rakyat_economy">Edisi Rakyat Newsprint 48.8 gsm</option>
                  <option value="standard_trade">Edisi Standar Bookpaper 72 gsm</option>
                  <option value="kolektor_hardcover">Edisi Kolektor Hardcover 80 gsm</option>
                  <option value="digital">Pustaka Digital Dwibahasa</option>
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="reviewTextInput"
                className="block text-xs font-mono text-muted-foreground mb-1"
              >
                Catatan Bacaan & Kritik Kertas
              </label>
              <Textarea
                id="reviewTextInput"
                rows={3}
                placeholder="Bagikan kesan Anda terhadap kedalaman terjemahan, keterbacaan kertas newsprint, atau intisari 20 menit..."
                value={reviewContent}
                onChange={(e) => {
                  setReviewContent(e.target.value);
                  if (reviewError) setReviewError(null);
                }}
                className="text-xs font-sans"
              />
            </div>

            {reviewError && (
              <p className="text-xs text-destructive font-mono">{reviewError}</p>
            )}

            {reviewSuccess && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-mono">
                Ulasan berhasil dipublikasikan ke linimasa pembaca!
              </p>
            )}

            <div className="flex justify-end">
              <Button
                type="submit"
                size="sm"
                disabled={createReviewMutation.isPending || !reviewContent.trim()}
              >
                {createReviewMutation.isPending ? (
                  <>
                    <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                    Mengirim Ulasan...
                  </>
                ) : (
                  "Kirim Ulasan"
                )}
              </Button>
            </div>
          </form>

          {/* Reviews List */}
          <div className="mt-8 space-y-4">
            {reviews.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="size-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-sans">
                  Belum ada ulasan untuk buku ini. Jadilah pembaca pertama yang meninggalkan catatan!
                </p>
              </div>
            ) : (
              reviews.map((rev) => (
                <div
                  key={rev.id}
                  className="p-4 rounded-[8px] bg-background border border-border/80 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="size-7 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] font-serif font-bold text-xs flex items-center justify-center">
                        {rev.userName.slice(0, 1)}
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                          <span>{rev.userName}</span>
                          <span className="font-mono text-[9px] uppercase px-1.5 py-0.2 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 rounded-[3px]">
                            {rev.userRole}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {rev.editionTierReviewed === "rakyat_economy"
                            ? "Edisi Rakyat Newsprint"
                            : rev.editionTierReviewed === "standard_trade"
                              ? "Edisi Standar"
                              : rev.editionTierReviewed === "kolektor_hardcover"
                                ? "Edisi Kolektor"
                                : "Pustaka Digital"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-amber-500">
                      {Array.from({ length: Math.round(rev.rating) }).map((_, i) => (
                        <Star key={i} className="size-3 fill-amber-500" />
                      ))}
                    </div>
                  </div>

                  <p className="font-sans text-xs text-foreground/90 leading-relaxed pl-9">
                    {rev.content}
                  </p>

                  <div className="pl-9 text-[10px] font-mono text-muted-foreground">
                    {new Date(rev.createdAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
