import { useState, type FormEvent } from "react";
import { CheckCircle2, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCreateBookReview } from "@/features/books/hooks";

type RatingDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  bookId: string;
  bookTitle: string;
  bookSlug: string;
};

export function RatingDialog({
  isOpen,
  onClose,
  bookId,
  bookTitle,
  bookSlug,
}: RatingDialogProps) {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [content, setContent] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const createReviewMutation = useCreateBookReview(bookSlug);

  if (!isOpen) return null;

  const activeStars = hoverRating !== null ? hoverRating : rating;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (rating < 0.5) {
      setErrorMessage("Pilih minimal 1 bintang untuk memberikan penilaian.");
      return;
    }

    const trimmed = content.trim();
    const finalContent =
      trimmed.length >= 5
        ? trimmed
        : `Penilaian ${rating} bintang untuk buku ini via e-reader AnzaBook.`;

    try {
      await createReviewMutation.mutateAsync({
        bookId,
        rating,
        content: finalContent,
        editionTierReviewed: "digital",
      });
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setContent("");
        onClose();
      }, 1500);
    } catch {
      setErrorMessage("Gagal mengirim ulasan. Silakan periksa koneksi lalu coba lagi.");
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rating-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200 text-foreground"
    >
      <div className="max-w-md w-full bg-card border border-border rounded-[12px] p-6 shadow-2xl relative">
        <button
          type="button"
          onClick={onClose}
          disabled={createReviewMutation.isPending}
          className="absolute right-4 top-4 p-1.5 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors"
          aria-label="Tutup dialog rating"
        >
          <X className="size-4" />
        </button>

        {isSuccess ? (
          <div className="py-8 text-center space-y-3 animate-in zoom-in-95 duration-200">
            <div className="size-12 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="size-6" />
            </div>
            <h3 className="font-serif text-lg font-bold">Terima Kasih!</h3>
            <p className="text-xs text-muted-foreground font-sans max-w-xs mx-auto">
              Rating dan apresiasi Anda untuk <strong>{bookTitle}</strong> berhasil dicatat.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="text-center space-y-1">
              <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
                Ulasan Pembaca
              </div>
              <h3 id="rating-dialog-title" className="font-serif text-lg font-bold">
                Beri Penilaian Naskah
              </h3>
              <p className="text-xs text-muted-foreground truncate max-w-xs mx-auto">
                {bookTitle}
              </p>
            </div>

            {/* Interactive Star Picker */}
            <div className="flex flex-col items-center gap-1.5 py-3">
              <div className="flex items-center gap-1.5" role="group" aria-label="Pilih rating bintang">
                {[1, 2, 3, 4, 5].map((starVal) => {
                  const isFilled = starVal <= activeStars;
                  return (
                    <button
                      key={starVal}
                      type="button"
                      onClick={() => setRating(starVal)}
                      onMouseEnter={() => setHoverRating(starVal)}
                      onMouseLeave={() => setHoverRating(null)}
                      className="p-1 text-muted-foreground hover:scale-115 active:scale-95 transition-transform cursor-pointer focus-visible:outline-2 focus-visible:outline-ring rounded-xs"
                      aria-label={`${starVal} dari 5 bintang`}
                    >
                      <Star
                        className={`size-7 transition-colors ${
                          isFilled
                            ? "fill-amber-400 text-amber-500 drop-shadow-xs"
                            : "text-muted-foreground/30 hover:text-amber-400/60"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
              <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                {activeStars} dari 5 Bintang
              </span>
            </div>

            {/* Optional Review Text */}
            <div className="space-y-1.5">
              <label
                htmlFor="reader-review-note"
                className="text-xs font-mono text-muted-foreground"
              >
                Kesan atau Catatan Membaca (Opsional)
              </label>
              <Textarea
                id="reader-review-note"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Tuliskan pemikiran atau kutipan paling berkesan dari buku ini..."
                rows={3}
                className="text-xs leading-relaxed resize-none font-sans"
              />
            </div>

            {errorMessage && (
              <p role="alert" className="text-xs text-destructive font-mono text-center">
                {errorMessage}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
                disabled={createReviewMutation.isPending}
                className="text-xs font-mono"
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createReviewMutation.isPending}
                className="text-xs font-mono bg-[var(--color-accent)] text-white hover:brightness-110"
              >
                {createReviewMutation.isPending ? "Mengirim..." : "Kirim Penilaian"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
