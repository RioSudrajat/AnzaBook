import { Star } from "lucide-react";
import {
  formatReaderProgressPercent,
  type ReaderProgressSegment,
} from "@/features/reader/session-metrics";

type GlossyProgressBarProps = {
  currentChapter: number;
  totalChapters: number;
  currentPercent: number; // 0 to 100
  formattedPercent?: string;
  segments?: readonly ReaderProgressSegment[];
  onOpenRating?: () => void;
};

function buildFallbackSegments(
  currentChapter: number,
  totalChapters: number,
  currentPercent: number,
): ReaderProgressSegment[] {
  const safeTotal = Math.max(1, totalChapters);
  const clampedChapter = Math.min(safeTotal, Math.max(1, currentChapter));
  const clampedPercent = Math.min(100, Math.max(0, currentPercent));

  // Derive fill for the active chapter when callers omit explicit chapter segments.
  const exactChaptersRead = (clampedPercent / 100) * safeTotal;
  return Array.from({ length: safeTotal }, (_, index) => {
    const chapterNumber = index + 1;
    let fillPercent = 0;
    if (chapterNumber < clampedChapter) {
      fillPercent = 100;
    } else if (chapterNumber === clampedChapter) {
      fillPercent = Math.min(
        100,
        Math.max(0, (exactChaptersRead - index) * 100),
      );
    }
    return {
      chapterNumber,
      weight: 1,
      fillPercent,
    };
  });
}

export function GlossyProgressBar({
  currentChapter,
  totalChapters,
  currentPercent,
  formattedPercent,
  segments,
  onOpenRating,
}: GlossyProgressBarProps) {
  const safeTotal = Math.max(1, totalChapters);
  const displayPercent =
    formattedPercent ?? formatReaderProgressPercent(currentPercent);
  const resolvedSegments =
    segments && segments.length > 0
      ? segments
      : buildFallbackSegments(currentChapter, safeTotal, currentPercent);

  return (
    <div
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 w-[min(92vw,30rem)] select-none pointer-events-auto"
      role="region"
      aria-label={`Progres membaca bab ${currentChapter} dari ${safeTotal}, ${displayPercent}`}
    >
      <div className="rounded-full px-5 py-2.5 bg-card/85 text-foreground backdrop-blur-xl border border-border/70 shadow-[0_12px_32px_-10px_color-mix(in_oklab,var(--color-ink)_16%,transparent)] transition-colors duration-200">
        <div className="flex items-center justify-between gap-3 mb-2">
          <span className="text-xs font-medium tracking-tight text-foreground/90 tabular-nums">
            {currentChapter}/{safeTotal}
          </span>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-medium text-foreground/90 tabular-nums">
              {displayPercent}
            </span>
            {onOpenRating && (
              <button
                type="button"
                onClick={onOpenRating}
                aria-label="Ulas & Beri Rating Buku"
                title="Ulas & Beri Rating"
                className="relative inline-flex items-center justify-center rounded-full p-0.5 text-[var(--color-accent)] hover:bg-foreground/10 transition-colors cursor-pointer after:absolute after:-inset-2.5 after:content-['']"
              >
                <Star className="w-3.5 h-3.5 fill-[var(--color-accent)]/25" />
              </button>
            )}
          </div>
        </div>

        <div
          className="flex items-center gap-1 w-full"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(currentPercent * 10) / 10}
          aria-label="Progres baca per bab"
        >
          {resolvedSegments.map((segment) => (
            <div
              key={segment.chapterNumber}
              style={{
                flexGrow: Math.max(1, segment.weight),
                flexBasis: 0,
              }}
              className="min-w-[6px] h-[3.5px] rounded-full bg-foreground/15 overflow-hidden"
            >
              <div
                className="h-full rounded-full bg-[var(--color-accent)] transition-[width] duration-200 ease-out motion-reduce:transition-none"
                style={{
                  width: `${Math.min(100, Math.max(0, segment.fillPercent))}%`,
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
