import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Pause, Play, Sparkles, Store } from "lucide-react";
import type { BookSummaryDto } from "@starter/shared/types";
import { BookCover } from "@/features/books/components/book-cover";
import { Button } from "@/components/ui/button";

type HeroBookStageProps = {
  books: BookSummaryDto[];
};

export function HeroBookStage({ books }: HeroBookStageProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  const displayBooks = books.slice(0, 5);
  const activeBook = displayBooks[activeIndex] || displayBooks[0];

  useEffect(() => {
    if (isPaused || displayBooks.length <= 1) return;

    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % displayBooks.length);
    }, 4500);

    return () => clearInterval(interval);
  }, [isPaused, displayBooks.length]);

  if (displayBooks.length === 0) return null;

  return (
    <div className="w-full relative flex flex-col items-center pt-4 pb-8">
      {/* 3D Shelf Stage Area */}
      <div
        className="relative flex h-[180px] w-full max-w-4xl items-end justify-center perspective-[1200px] select-none sm:h-[270px] md:h-[330px]"
        role="region"
        aria-label="Panggung Rak Buku 3D"
      >
        {/* Books on the Shelf */}
        <div className="flex items-end justify-center gap-1.5 sm:gap-4 md:gap-6 pb-4 z-10 w-full px-2">
          {displayBooks.map((book, idx) => {
            const isActive = idx === activeIndex;
            return (
              <button
                key={book.id}
                type="button"
                aria-pressed={isActive}
                aria-label={`Pilih buku ${book.title}`}
                onClick={() => {
                  setActiveIndex(idx);
                  setIsPaused(true);
                }}
                className={`relative group cursor-pointer transition-all duration-500 ease-out shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-focus)] rounded-[6px] ${
                  isActive
                    ? "scale-105 -translate-y-4 z-20"
                    : "opacity-75 hover:opacity-100 hover:-translate-y-2 scale-95 z-10"
                }`}
                style={{
                  transformStyle: "preserve-3d",
                }}
              >
                <BookCover book={book} className="w-[min(16vw,152px)] sm:w-[min(14vw,152px)]" decorative />

                {/* Drop shadow on shelf */}
                <div
                  className={`w-full h-3 rounded-full bg-black/25 blur-sm mt-1 transition-all ${
                    isActive ? "scale-110 opacity-60" : "scale-90 opacity-30"
                  }`}
                />
              </button>
            );
          })}
        </div>

        {/* Physical Drafting Ledge (Shelf Surface) */}
        <div className="absolute bottom-0 left-0 right-0 h-4 bg-[#D3C7B0] dark:bg-[#25221F] border-t border-black/15 shadow-md flex items-center justify-between px-4 z-0">
          <div className="h-0.5 w-full bg-black/10" />
        </div>
      </div>

      {/* Slide-out Index Card for Active Book */}
      <div className="w-full max-w-2xl mt-4 px-4">
        <div className="bg-[var(--color-paper)] border border-border/80 rounded-[10px] p-4 sm:p-5 shadow-sm transition-all duration-300 relative overflow-hidden">
          {/* Top metadata row */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border/60">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-mono font-medium px-2 py-0.5 rounded-[4px] bg-[var(--color-accent)]/20 text-[var(--color-ink)] border border-[var(--color-accent)]/30">
                <Sparkles className="size-3 text-[var(--color-accent)]" />
                Edisi Rakyat Newsprint 48.8 gsm
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                Hemat{" "}
                {Math.round(
                  (1 - activeBook.rakyatPriceIdr / activeBook.standardPriceIdr) *
                    100,
                )}
                %
              </span>
            </div>

            {/* Carousel Pause/Play Toggle Button (R-39 compliant) */}
            <button
              type="button"
              data-testid="carousel-pause-toggle"
              aria-label={isPaused ? "Lanjutkan putaran rak buku" : "Jeda putaran rak buku"}
              onClick={() => setIsPaused(!isPaused)}
              className="inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground cursor-pointer px-2 py-1 rounded-[4px] border border-border/60 hover:bg-muted/50 transition-colors focus-visible:outline-2 focus-visible:outline-[var(--color-focus)]"
            >
              {isPaused ? (
                <>
                  <Play className="size-3" /> Putar Rak
                </>
              ) : (
                <>
                  <Pause className="size-3" /> Jeda Rak
                </>
              )}
            </button>
          </div>

          {/* Book synopsis & live store highlight */}
          <div className="py-3">
            <h4 className="font-serif text-lg font-semibold tracking-tight text-foreground">
              {activeBook.title}
            </h4>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
              {activeBook.synopsis}
            </p>

            <div className="flex items-center gap-2 text-xs font-mono text-emerald-800 dark:text-emerald-300 mt-2.5">
              <Store className="size-3.5 shrink-0" />
              <span>
                Tersedia di Gramedia Matraman, Grand Indonesia & 4 cabang lainnya
              </span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/60">
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold font-mono text-foreground">
                Rp{activeBook.rakyatPriceIdr.toLocaleString("id-ID")}
              </span>
              <span className="text-xs font-mono text-muted-foreground line-through">
                Toko Konvensional: Rp{activeBook.standardPriceIdr.toLocaleString("id-ID")}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link
                  to="/read/$slug"
                  params={{ slug: activeBook.slug }}
                  search={{ mode: "full", chapter: 1 }}
                >
                  <BookOpen className="size-3.5 mr-1" />
                  Mulai Membaca
                </Link>
              </Button>

              <Button asChild size="sm">
                <Link to="/books/$slug" params={{ slug: activeBook.slug }}>
                  Buka Detail
                  <ArrowRight className="size-3.5 ml-1" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
