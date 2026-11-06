import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronLeft, ChevronRight, Star } from "lucide-react";
import type { BookHighlightDto } from "@starter/shared/types";
import { Button } from "@/components/ui/button";

type ReaderSlideViewProps = {
  chapterNumber: number;
  chapterTitle: string;
  isFirstPageOfChapter: boolean;
  paragraphs: string[];
  globalPageNumber: number;
  totalPages: number;
  onPrevPage: () => void;
  onNextPage: () => void;
  canPrev: boolean;
  canNext: boolean;
  onFinishSession: () => void;
  onOpenRating: () => void;
  fontClass: string;
  fontSize: number;
  isPremiumPreview?: boolean;
  highlights: BookHighlightDto[];
  renderHighlights: (
    text: string,
    highlights: BookHighlightDto[],
    onFlex: (h: BookHighlightDto) => void,
  ) => ReactNode;
  onFlexHighlight: (h: BookHighlightDto) => void;
  direction?: number;
};

export function ReaderSlideView({
  chapterNumber,
  chapterTitle,
  isFirstPageOfChapter,
  paragraphs,
  globalPageNumber,
  totalPages,
  onPrevPage,
  onNextPage,
  canPrev,
  canNext,
  onFinishSession,
  onOpenRating,
  fontClass,
  fontSize,
  isPremiumPreview = false,
  highlights,
  renderHighlights,
  onFlexHighlight,
  direction = 0,
}: ReaderSlideViewProps) {
  // Respect user preference for reduced motion
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // Keyboard navigation for arrow keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === "ArrowLeft" && canPrev) {
        e.preventDefault();
        onPrevPage();
      } else if (e.key === "ArrowRight" && canNext) {
        e.preventDefault();
        onNextPage();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canNext, canPrev, onNextPage, onPrevPage]);

  // Distribute paragraphs between left and right pages on desktop
  const half = Math.ceil(paragraphs.length / 2);
  const leftParagraphs = paragraphs.slice(0, half);
  const rightParagraphs = paragraphs.slice(half);

  // 3D Physical Leaf Flip Motion Variants
  const flipVariants = {
    enter: (dir: number) =>
      prefersReducedMotion
        ? { opacity: 0 }
        : {
            rotateY: dir > 0 ? 45 : -45,
            opacity: 0,
            scale: 0.98,
            transformOrigin: dir > 0 ? "left center" : "right center",
          },
    center: {
      rotateY: 0,
      opacity: 1,
      scale: 1,
      transformOrigin: "center center",
      transition: {
        duration: prefersReducedMotion ? 0.15 : 0.42,
        ease: [0.22, 1, 0.36, 1], // Natural air resistance easing
      },
    },
    exit: (dir: number) =>
      prefersReducedMotion
        ? { opacity: 0 }
        : {
            rotateY: dir > 0 ? -45 : 45,
            opacity: 0,
            scale: 0.98,
            transformOrigin: dir > 0 ? "left center" : "right center",
            transition: {
              duration: prefersReducedMotion ? 0.1 : 0.32,
              ease: [0.32, 0, 0.67, 0],
            },
          },
  };

  return (
    <div className="w-full flex flex-col justify-between min-h-[calc(100vh-120px)] max-w-6xl mx-auto px-4 sm:px-8 py-6 select-text">
      {/* 3D Open Book Spread Container */}
      <div
        className="w-full flex-1 flex items-center justify-center relative perspective-[1800px]"
        style={{ transformStyle: "preserve-3d" }}
      >
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={globalPageNumber}
            custom={direction}
            variants={flipVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="w-full relative rounded-[8px] bg-card/15 shadow-sm border border-border/40 p-4 sm:p-8 lg:p-12 overflow-hidden"
            style={{
              willChange: "transform, opacity",
              transformStyle: "preserve-3d",
              backfaceVisibility: "hidden",
            }}
          >
            {/* Center Book Spine Crease & Shadow for Desktop Dual-Page Layout */}
            <div
              className="hidden md:block absolute inset-y-0 left-1/2 -translate-x-1/2 w-12 pointer-events-none z-10 bg-gradient-to-r from-transparent via-black/15 dark:via-black/35 to-transparent opacity-80"
              aria-hidden="true"
            />

            {/* Desktop Two-Page Grid (Left Page + Right Page) / Mobile Single Page */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16 relative z-0">
              {/* LEFT PAGE */}
              <div className="flex flex-col justify-start md:pr-4">
                {isFirstPageOfChapter && (
                  <header className="mb-8 text-center pb-6 border-b border-current/15">
                    <div className="text-xs font-mono uppercase tracking-[0.2em] opacity-60 mb-2">
                      CHAPTER {chapterNumber}
                    </div>
                    <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight">
                      {chapterTitle}
                    </h1>
                  </header>
                )}

                <div
                  className={`${fontClass} space-y-5`}
                  style={{ fontSize: `${fontSize}px`, lineHeight: 1.85 }}
                >
                  {leftParagraphs.map((text, idx) => (
                    <p
                      key={idx}
                      data-preview-fade={
                        (isPremiumPreview &&
                          !canNext &&
                          rightParagraphs.length === 0 &&
                          idx === leftParagraphs.length - 1) ||
                        undefined
                      }
                      className="leading-relaxed text-justify select-text"
                    >
                      {renderHighlights(text, highlights, onFlexHighlight)}
                    </p>
                  ))}
                </div>
              </div>

              {/* RIGHT PAGE (Hidden on mobile if empty; flows seamlessly on desktop) */}
              <div className="hidden md:flex flex-col justify-start md:pl-4">
                <div
                  className={`${fontClass} space-y-5`}
                  style={{ fontSize: `${fontSize}px`, lineHeight: 1.85 }}
                >
                  {rightParagraphs.map((text, idx) => (
                    <p
                      key={idx}
                      data-preview-fade={
                        (isPremiumPreview &&
                          !canNext &&
                          idx === rightParagraphs.length - 1) ||
                        undefined
                      }
                      className="leading-relaxed text-justify select-text"
                    >
                      {renderHighlights(text, highlights, onFlexHighlight)}
                    </p>
                  ))}
                </div>
              </div>
            </div>

            {/* Mobile Fallback: If on mobile, also show right paragraphs vertically below */}
            <div className="md:hidden mt-5 space-y-5">
              {rightParagraphs.map((text, idx) => (
                <p
                  key={idx}
                  data-preview-fade={
                    (isPremiumPreview &&
                      !canNext &&
                      idx === rightParagraphs.length - 1) ||
                    undefined
                  }
                  className={`leading-relaxed text-justify select-text ${fontClass}`}
                  style={{ fontSize: `${fontSize}px`, lineHeight: 1.85 }}
                >
                  {renderHighlights(text, highlights, onFlexHighlight)}
                </p>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Docked Minimal Bottom Navigation Bar matching Screenshot */}
      <footer className="w-full mt-6 pt-4 border-t border-current/15 flex items-center justify-between text-xs font-mono">
        {/* Left: Star / Beri Rating Button */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onOpenRating}
          className="gap-2 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 h-9"
          title="Beri Rating dan Ulasan untuk Buku Ini"
        >
          <Star className="size-4 text-amber-500/80" />
          <span>Beri Rating</span>
        </Button>

        {/* Center: Page Navigation Controls with Chevron Chevrons */}
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onPrevPage}
            disabled={!canPrev}
            className="size-8 p-0 text-muted-foreground hover:text-foreground disabled:opacity-20"
            aria-label="Halaman Sebelumnya"
          >
            <ChevronLeft className="size-4" />
          </Button>

          <div className="font-bold tracking-wide select-none">
            Page {globalPageNumber} of {totalPages}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onNextPage}
            disabled={!canNext}
            className="size-8 p-0 text-muted-foreground hover:text-foreground disabled:opacity-20"
            aria-label="Halaman Selanjutnya"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        {/* Right: Selesai Dibaca Button */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onFinishSession}
          className="gap-2 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 h-9"
          title="Selesaikan sesi membaca dan simpan progres"
        >
          <Check className="size-4 text-emerald-500" />
          <span>Selesai Dibaca</span>
        </Button>
      </footer>
    </div>
  );
}
