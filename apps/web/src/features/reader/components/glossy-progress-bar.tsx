import { ChevronLeft, ChevronRight } from "lucide-react";

type GlossyProgressBarProps = {
  currentChapter: number;
  totalChapters: number;
  currentPercent: number; // 0 to 100
  onPrevChapter?: () => void;
  onNextChapter?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
};

export function GlossyProgressBar({
  currentChapter,
  totalChapters,
  currentPercent,
  onPrevChapter,
  onNextChapter,
  hasPrev,
  hasNext,
}: GlossyProgressBarProps) {
  const safePercent = Math.min(100, Math.max(0, Math.round(currentPercent)));

  return (
    <div className="fixed bottom-6 inset-x-0 z-40 flex justify-center px-4 pointer-events-none select-none">
      <div className="pointer-events-auto flex items-center gap-3 px-4 py-2.5 rounded-full bg-black/60 dark:bg-black/75 backdrop-blur-md border border-white/20 shadow-2xl text-white font-mono text-xs transition-all hover:bg-black/80">
        {/* Previous Chapter button */}
        {onPrevChapter && (
          <button
            type="button"
            onClick={onPrevChapter}
            disabled={!hasPrev}
            className={`p-1 rounded-full hover:bg-white/10 transition-colors ${
              !hasPrev ? "opacity-30 cursor-not-allowed" : "cursor-pointer"
            }`}
            title="Bab Sebelumnya"
          >
            <ChevronLeft className="size-4" />
          </button>
        )}

        {/* Dynamic Chapter Indicator */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="font-semibold text-white">
            Bab {currentChapter}/{totalChapters}
          </span>
        </div>

        {/* Progress Bar Track */}
        <div className="w-28 sm:w-48 h-1.5 bg-white/20 rounded-full overflow-hidden relative">
          <div
            className="h-full bg-gradient-to-r from-[var(--color-accent)] to-amber-400 rounded-full transition-all duration-300"
            style={{ width: `${safePercent}%` }}
          />
        </div>

        {/* Progress Percentage */}
        <div className="text-[11px] font-bold text-white/90 shrink-0 w-8 text-right">
          {safePercent}%
        </div>

        {/* Next Chapter button */}
        {onNextChapter && (
          <button
            type="button"
            onClick={onNextChapter}
            disabled={!hasNext}
            className={`p-1 rounded-full hover:bg-white/10 transition-colors ${
              !hasNext ? "opacity-30 cursor-not-allowed" : "cursor-pointer"
            }`}
            title="Bab Berikutnya"
          >
            <ChevronRight className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}
