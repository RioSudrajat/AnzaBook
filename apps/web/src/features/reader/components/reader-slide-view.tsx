import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { motion } from "motion/react";
import { Check, ChevronLeft, ChevronRight, Star } from "lucide-react";
import type { BookHighlightDto } from "@starter/shared/types";
import { Button } from "@/components/ui/button";

function subscribeReducedMotion(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  mediaQuery.addEventListener("change", callback);
  return () => mediaQuery.removeEventListener("change", callback);
}

function getReducedMotionSnapshot() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

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
  onOpenRating?: () => void;
  fontClass: string;
  fontSize: number;
  isPremiumPreview?: boolean;
  highlights: BookHighlightDto[];
  renderHighlights: (
    text: string,
    highlights: BookHighlightDto[],
    onFlexHighlight: (h: BookHighlightDto) => void,
  ) => ReactNode;
  onFlexHighlight: (h: BookHighlightDto) => void;
  direction?: number;
};

type PageSpreadData = {
  globalPageNumber: number;
  chapterNumber: number;
  chapterTitle: string;
  isFirstPageOfChapter: boolean;
  leftParagraphs: string[];
  rightParagraphs: string[];
  isPremiumPreview?: boolean;
  canNext: boolean;
};

// Reusable single page content column
function PageColumn({
  isLeft,
  isFirstPageOfChapter,
  chapterNumber,
  chapterTitle,
  paragraphs,
  fontClass,
  fontSize,
  isPremiumPreview,
  canNext,
  highlights,
  renderHighlights,
  onFlexHighlight,
}: {
  isLeft: boolean;
  isFirstPageOfChapter: boolean;
  chapterNumber: number;
  chapterTitle: string;
  paragraphs: string[];
  fontClass: string;
  fontSize: number;
  isPremiumPreview?: boolean;
  canNext?: boolean;
  highlights: BookHighlightDto[];
  renderHighlights: (
    text: string,
    highlights: BookHighlightDto[],
    onFlexHighlight: (h: BookHighlightDto) => void,
  ) => ReactNode;
  onFlexHighlight: (h: BookHighlightDto) => void;
}) {
  return (
    <div
      className={`w-full h-full flex flex-col justify-start overflow-hidden select-text ${
        isLeft ? "pr-6 lg:pr-12" : "pl-6 lg:pl-12"
      }`}
    >
      {isFirstPageOfChapter && isLeft && (
        <header className="mb-4 sm:mb-6 text-center pb-3 sm:pb-4 border-b border-current/15 shrink-0">
          <div className="text-[11px] font-mono uppercase tracking-[0.25em] opacity-60 mb-1.5">
            CHAPTER {chapterNumber}
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight">
            {chapterTitle}
          </h1>
        </header>
      )}

      <div
        className={`${fontClass} space-y-3.5 sm:space-y-4 flex-1 min-h-0 overflow-y-auto scrollbar-none`}
        style={{ fontSize: `${fontSize}px`, lineHeight: 1.72 }}
      >
        {paragraphs.map((text, idx) => (
          <p
            key={idx}
            data-preview-fade={
              (isPremiumPreview &&
                !canNext &&
                !isLeft &&
                idx === paragraphs.length - 1) ||
              undefined
            }
            className="leading-relaxed text-justify select-text"
          >
            {renderHighlights(text, highlights, onFlexHighlight)}
          </p>
        ))}
      </div>
    </div>
  );
}

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
}: ReaderSlideViewProps) {
  const prefersReducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    () => false,
  );

  const half = Math.ceil(paragraphs.length / 2);
  const leftParagraphs = paragraphs.slice(0, half);
  const rightParagraphs = paragraphs.slice(half);

  const incomingSpread: PageSpreadData = {
    globalPageNumber,
    chapterNumber,
    chapterTitle,
    isFirstPageOfChapter,
    leftParagraphs,
    rightParagraphs,
    isPremiumPreview,
    canNext,
  };

  const [spreadState, setSpreadState] = useState<{
    prevGlobal: number;
    activeSpread: PageSpreadData;
    previousSpread: PageSpreadData | null;
    flipDirection: "next" | "prev" | null;
  }>({
    prevGlobal: globalPageNumber,
    activeSpread: incomingSpread,
    previousSpread: null,
    flipDirection: null,
  });

  // Adjust state during render when globalPageNumber changes (React pattern: no effect needed)
  if (globalPageNumber !== spreadState.prevGlobal) {
    const direction: "next" | "prev" =
      globalPageNumber > spreadState.prevGlobal ? "next" : "prev";
    setSpreadState({
      prevGlobal: globalPageNumber,
      activeSpread: incomingSpread,
      previousSpread: prefersReducedMotion ? null : spreadState.activeSpread,
      flipDirection: prefersReducedMotion ? null : direction,
    });
  }

  const handleFlipComplete = () => {
    setSpreadState((prev) => ({
      ...prev,
      previousSpread: null,
      flipDirection: null,
    }));
  };

  const isFlipping =
    spreadState.flipDirection !== null && spreadState.previousSpread !== null;
  const activeSpread = spreadState.activeSpread;
  const previousSpread = spreadState.previousSpread;
  const flipDirection = spreadState.flipDirection;

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key === "ArrowLeft" && canPrev && !isFlipping) {
        e.preventDefault();
        onPrevPage();
      } else if (e.key === "ArrowRight" && canNext && !isFlipping) {
        e.preventDefault();
        onNextPage();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canNext, canPrev, onNextPage, onPrevPage, isFlipping]);

  return (
    <div className="w-full h-full max-h-full flex flex-col justify-between overflow-hidden select-text">
      {/* 3D Open Book Spread Stage */}
      <div
        className="w-full flex-1 min-h-0 flex items-center justify-center relative py-1 sm:py-2"
        style={{ perspective: "2200px" }}
      >
        {/* DESKTOP 2-PAGE SPREAD BOOK */}
        <div
          className="hidden md:flex w-full h-full max-h-[calc(100vh-130px)] rounded-2xl bg-[#FAF6EE] dark:bg-[#1C1A17] text-foreground border border-border/40 shadow-[0_20px_50px_rgba(0,0,0,0.35),0_0_0_1px_rgba(255,255,255,0.05)] relative overflow-hidden"
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* BASE LEFT PAGE */}
          <div
            className="w-1/2 h-full relative p-6 sm:p-8 lg:p-10 flex flex-col justify-start overflow-hidden border-r border-black/10 dark:border-white/5"
            style={{
              transform: "rotateY(1.2deg)",
              transformOrigin: "right center",
              transformStyle: "preserve-3d",
            }}
          >
            <PageColumn
              isLeft={true}
              isFirstPageOfChapter={
                isFlipping && flipDirection === "next" && previousSpread
                  ? previousSpread.isFirstPageOfChapter
                  : activeSpread.isFirstPageOfChapter
              }
              chapterNumber={
                isFlipping && flipDirection === "next" && previousSpread
                  ? previousSpread.chapterNumber
                  : activeSpread.chapterNumber
              }
              chapterTitle={
                isFlipping && flipDirection === "next" && previousSpread
                  ? previousSpread.chapterTitle
                  : activeSpread.chapterTitle
              }
              paragraphs={
                isFlipping && flipDirection === "next" && previousSpread
                  ? previousSpread.leftParagraphs
                  : activeSpread.leftParagraphs
              }
              fontClass={fontClass}
              fontSize={fontSize}
              highlights={highlights}
              renderHighlights={renderHighlights}
              onFlexHighlight={onFlexHighlight}
            />

            {/* Inner Spine Curvature Gradient (Left Gutter) */}
            <div
              className="absolute inset-y-0 right-0 w-16 lg:w-24 pointer-events-none z-10 bg-gradient-to-r from-transparent via-black/5 to-black/25 dark:via-black/15 dark:to-black/60"
              aria-hidden="true"
            />
          </div>

          {/* BASE RIGHT PAGE */}
          <div
            className="w-1/2 h-full relative p-6 sm:p-8 lg:p-10 flex flex-col justify-start overflow-hidden border-l border-black/10 dark:border-white/5"
            style={{
              transform: "rotateY(-1.2deg)",
              transformOrigin: "left center",
              transformStyle: "preserve-3d",
            }}
          >
            <PageColumn
              isLeft={false}
              isFirstPageOfChapter={false}
              chapterNumber={
                isFlipping && flipDirection === "prev" && previousSpread
                  ? previousSpread.chapterNumber
                  : activeSpread.chapterNumber
              }
              chapterTitle={
                isFlipping && flipDirection === "prev" && previousSpread
                  ? previousSpread.chapterTitle
                  : activeSpread.chapterTitle
              }
              paragraphs={
                isFlipping && flipDirection === "prev" && previousSpread
                  ? previousSpread.rightParagraphs
                  : activeSpread.rightParagraphs
              }
              fontClass={fontClass}
              fontSize={fontSize}
              isPremiumPreview={
                isFlipping && flipDirection === "prev" && previousSpread
                  ? previousSpread.isPremiumPreview
                  : activeSpread.isPremiumPreview
              }
              canNext={
                isFlipping && flipDirection === "prev" && previousSpread
                  ? previousSpread.canNext
                  : activeSpread.canNext
              }
              highlights={highlights}
              renderHighlights={renderHighlights}
              onFlexHighlight={onFlexHighlight}
            />

            {/* Inner Spine Curvature Gradient (Right Gutter) */}
            <div
              className="absolute inset-y-0 left-0 w-16 lg:w-24 pointer-events-none z-10 bg-gradient-to-l from-transparent via-black/5 to-black/25 dark:via-black/15 dark:to-black/60"
              aria-hidden="true"
            />
          </div>

          {/* REALISTIC 3D CENTER SPINE BINDING CREASE & SHADOWS */}
          <div
            className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[3px] pointer-events-none z-25 bg-black/50 dark:bg-black/95 shadow-[0_0_8px_rgba(0,0,0,0.85)]"
            aria-hidden="true"
          />
          <div
            className="absolute inset-y-0 left-1/2 -translate-x-12 lg:-translate-x-16 w-px pointer-events-none z-20 bg-white/10 dark:bg-white/5 opacity-60"
            aria-hidden="true"
          />
          <div
            className="absolute inset-y-0 left-1/2 translate-x-12 lg:translate-x-16 w-px pointer-events-none z-20 bg-white/10 dark:bg-white/5 opacity-60"
            aria-hidden="true"
          />

          {/* THE FLIPPING LEAF (ONLY ONE PAGE ROTATES ACROSS THE SPINE) */}
          {isFlipping && flipDirection === "next" && previousSpread && (
            <motion.div
              key={`flip-next-${activeSpread.globalPageNumber}`}
              initial={{
                rotateY: 0,
                skewY: 0,
                rotateZ: 0,
              }}
              animate={{
                rotateY: -180,
                // Soft paper curvature: corner pulls first, reaches apex curve, flexes and straightens upon landing
                skewY: [0, -3.2, -1, 2.2, 0],
                rotateZ: [0, -1.8, -0.6, 1.2, 0],
              }}
              transition={{
                duration: 0.6,
                ease: [0.22, 0.95, 0.32, 1],
              }}
              onAnimationComplete={handleFlipComplete}
              className="absolute inset-y-0 left-1/2 w-1/2 h-full z-30 pointer-events-none"
              style={{
                transformOrigin: "left center",
                transformStyle: "preserve-3d",
                willChange: "transform",
              }}
            >
              {/* FRONT FACE (Turning over from the Right page) */}
              <div
                className="absolute inset-0 w-full h-full p-6 sm:p-8 lg:p-10 bg-[#FAF6EE] dark:bg-[#1C1A17] text-foreground rounded-r-2xl border-y border-r border-border/40 overflow-hidden"
                style={{
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  transform: "rotateY(0deg)",
                }}
              >
                {/* Moving Curvature Shadow on lifting paper */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.45, 0.15, 0] }}
                  transition={{ duration: 0.6, ease: "easeInOut" }}
                  className="absolute inset-0 pointer-events-none z-20 bg-gradient-to-l from-black/40 via-black/15 to-transparent dark:from-black/70 dark:via-black/30 dark:to-transparent"
                />

                <PageColumn
                  isLeft={false}
                  isFirstPageOfChapter={false}
                  chapterNumber={previousSpread.chapterNumber}
                  chapterTitle={previousSpread.chapterTitle}
                  paragraphs={previousSpread.rightParagraphs}
                  fontClass={fontClass}
                  fontSize={fontSize}
                  isPremiumPreview={previousSpread.isPremiumPreview}
                  canNext={previousSpread.canNext}
                  highlights={highlights}
                  renderHighlights={renderHighlights}
                  onFlexHighlight={onFlexHighlight}
                />
              </div>

              {/* BACK FACE (Landing on the Left page) */}
              <div
                className="absolute inset-0 w-full h-full p-6 sm:p-8 lg:p-10 bg-[#FAF6EE] dark:bg-[#1C1A17] text-foreground rounded-l-2xl border-y border-l border-border/40 overflow-hidden"
                style={{
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                }}
              >
                {/* Landing Touchdown Shadow */}
                <motion.div
                  initial={{ opacity: 0.5 }}
                  animate={{ opacity: [0.5, 0.2, 0] }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="absolute inset-0 pointer-events-none z-20 bg-gradient-to-r from-black/40 via-black/15 to-transparent dark:from-black/70 dark:via-black/30 dark:to-transparent"
                />

                <PageColumn
                  isLeft={true}
                  isFirstPageOfChapter={activeSpread.isFirstPageOfChapter}
                  chapterNumber={activeSpread.chapterNumber}
                  chapterTitle={activeSpread.chapterTitle}
                  paragraphs={activeSpread.leftParagraphs}
                  fontClass={fontClass}
                  fontSize={fontSize}
                  highlights={highlights}
                  renderHighlights={renderHighlights}
                  onFlexHighlight={onFlexHighlight}
                />
              </div>
            </motion.div>
          )}

          {isFlipping && flipDirection === "prev" && previousSpread && (
            <motion.div
              key={`flip-prev-${activeSpread.globalPageNumber}`}
              initial={{
                rotateY: 0,
                skewY: 0,
                rotateZ: 0,
              }}
              animate={{
                rotateY: 180,
                // Soft paper curvature pulling from left corner across to right
                skewY: [0, 3.2, 1, -2.2, 0],
                rotateZ: [0, 1.8, 0.6, -1.2, 0],
              }}
              transition={{
                duration: 0.6,
                ease: [0.22, 0.95, 0.32, 1],
              }}
              onAnimationComplete={handleFlipComplete}
              className="absolute inset-y-0 left-0 w-1/2 h-full z-30 pointer-events-none"
              style={{
                transformOrigin: "right center",
                transformStyle: "preserve-3d",
                willChange: "transform",
              }}
            >
              {/* FRONT FACE (Turning over from the Left page) */}
              <div
                className="absolute inset-0 w-full h-full p-6 sm:p-8 lg:p-10 bg-[#FAF6EE] dark:bg-[#1C1A17] text-foreground rounded-l-2xl border-y border-l border-border/40 overflow-hidden"
                style={{
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  transform: "rotateY(0deg)",
                }}
              >
                {/* Moving Curvature Shadow on lifting paper */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.45, 0.15, 0] }}
                  transition={{ duration: 0.6, ease: "easeInOut" }}
                  className="absolute inset-0 pointer-events-none z-20 bg-gradient-to-r from-black/40 via-black/15 to-transparent dark:from-black/70 dark:via-black/30 dark:to-transparent"
                />

                <PageColumn
                  isLeft={true}
                  isFirstPageOfChapter={previousSpread.isFirstPageOfChapter}
                  chapterNumber={previousSpread.chapterNumber}
                  chapterTitle={previousSpread.chapterTitle}
                  paragraphs={previousSpread.leftParagraphs}
                  fontClass={fontClass}
                  fontSize={fontSize}
                  highlights={highlights}
                  renderHighlights={renderHighlights}
                  onFlexHighlight={onFlexHighlight}
                />
              </div>

              {/* BACK FACE (Landing on the Right page) */}
              <div
                className="absolute inset-0 w-full h-full p-6 sm:p-8 lg:p-10 bg-[#FAF6EE] dark:bg-[#1C1A17] text-foreground rounded-r-2xl border-y border-r border-border/40 overflow-hidden"
                style={{
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                }}
              >
                {/* Landing Touchdown Shadow */}
                <motion.div
                  initial={{ opacity: 0.5 }}
                  animate={{ opacity: [0.5, 0.2, 0] }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="absolute inset-0 pointer-events-none z-20 bg-gradient-to-l from-black/40 via-black/15 to-transparent dark:from-black/70 dark:via-black/30 dark:to-transparent"
                />

                <PageColumn
                  isLeft={false}
                  isFirstPageOfChapter={false}
                  chapterNumber={activeSpread.chapterNumber}
                  chapterTitle={activeSpread.chapterTitle}
                  paragraphs={activeSpread.rightParagraphs}
                  fontClass={fontClass}
                  fontSize={fontSize}
                  isPremiumPreview={activeSpread.isPremiumPreview}
                  canNext={activeSpread.canNext}
                  highlights={highlights}
                  renderHighlights={renderHighlights}
                  onFlexHighlight={onFlexHighlight}
                />
              </div>
            </motion.div>
          )}
        </div>

        {/* MOBILE SINGLE PAGE SPREAD (Compact, zero overflow) */}
        <div className="md:hidden w-full h-full max-h-[calc(100vh-125px)] rounded-xl bg-[#FAF6EE] dark:bg-[#1C1A17] text-foreground border border-border/40 p-4 sm:p-6 overflow-hidden flex flex-col justify-start shadow-md">
          {isFirstPageOfChapter && (
            <header className="mb-4 text-center pb-3 border-b border-current/15 shrink-0">
              <div className="text-[11px] font-mono uppercase tracking-[0.2em] opacity-60 mb-1">
                CHAPTER {chapterNumber}
              </div>
              <h1 className="font-serif text-xl sm:text-2xl font-bold tracking-tight">
                {chapterTitle}
              </h1>
            </header>
          )}

          <div
            className={`${fontClass} space-y-3.5 flex-1 min-h-0 overflow-y-auto scrollbar-none`}
            style={{ fontSize: `${fontSize}px`, lineHeight: 1.7 }}
          >
            {paragraphs.map((text, idx) => (
              <p
                key={idx}
                data-preview-fade={
                  (isPremiumPreview &&
                    !canNext &&
                    idx === paragraphs.length - 1) ||
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

      {/* DOCKED MINIMAL BOTTOM NAVIGATION BAR */}
      <footer className="w-full h-10 sm:h-12 shrink-0 border-t border-current/15 flex items-center justify-between text-xs font-mono px-2 sm:px-4">
        {/* Left: Star / Beri Rating Button */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onOpenRating}
          className="gap-2 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 h-8 sm:h-9"
          title="Beri Rating dan Ulasan untuk Buku Ini"
        >
          <Star className="size-3.5 sm:size-4 text-amber-500/80" />
          <span>Beri Rating</span>
        </Button>

        {/* Center: Cumulative Page Counter with Chevrons */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onPrevPage}
            disabled={!canPrev || isFlipping}
            className="size-7 sm:size-8 text-muted-foreground hover:text-foreground disabled:opacity-30"
            aria-label="Halaman sebelumnya"
          >
            <ChevronLeft className="size-4" />
          </Button>

          <span className="font-mono text-xs tracking-wider opacity-80 select-none">
            Page {globalPageNumber} of {totalPages}
          </span>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onNextPage}
            disabled={!canNext || isFlipping}
            className="size-7 sm:size-8 text-muted-foreground hover:text-foreground disabled:opacity-30"
            aria-label="Halaman selanjutnya"
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
          className="gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 h-8 sm:h-9"
        >
          <Check className="size-3.5 sm:size-4 text-emerald-500/80" />
          <span>Selesai Dibaca</span>
        </Button>
      </footer>
    </div>
  );
}
