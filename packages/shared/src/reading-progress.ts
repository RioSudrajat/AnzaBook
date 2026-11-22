export const STANDARD_WORDS_PER_PAGE = 250;

export type ReadingTempo = "reflective" | "steady" | "brisk";

export function bookProgressPercent(
  chapterIndex: number,
  chapterCount: number,
  chapterPercent: number,
): number {
  if (chapterIndex < 0 || chapterIndex >= chapterCount) return 0;
  return Math.floor((chapterIndex * 100 + chapterPercent) / chapterCount);
}

export function wordsToStandardPages(words: number): number {
  if (!Number.isFinite(words) || words <= 0) return 0;
  return Math.round(words / STANDARD_WORDS_PER_PAGE);
}

export function computeWordWeightedProgress(
  chapterWordCounts: number[],
  currentChapterIndex: number,
  chapterFraction: number,
): number {
  if (
    chapterWordCounts.length === 0 ||
    currentChapterIndex < 0 ||
    currentChapterIndex >= chapterWordCounts.length
  ) {
    return 0;
  }

  const clampedFraction = Number.isFinite(chapterFraction)
    ? Math.min(1, Math.max(0, chapterFraction))
    : 0;

  const sanitizedCounts = chapterWordCounts.map((count) =>
    Number.isFinite(count) && count > 0 ? count : 0,
  );
  const totalWords = sanitizedCounts.reduce((sum, count) => sum + count, 0);

  if (totalWords <= 0) {
    return bookProgressPercent(
      currentChapterIndex,
      chapterWordCounts.length,
      Math.round(clampedFraction * 100),
    );
  }

  let wordsBefore = 0;
  for (let i = 0; i < currentChapterIndex; i++) {
    wordsBefore += sanitizedCounts[i] ?? 0;
  }

  const currentChapterWords =
    (sanitizedCounts[currentChapterIndex] ?? 0) * clampedFraction;
  const rawPercent = ((wordsBefore + currentChapterWords) / totalWords) * 100;

  return Math.min(100, Math.max(0, Math.round(rawPercent)));
}

export function computeReadingWpm(
  wordsRead: number,
  activeSeconds: number,
): number | null {
  if (
    !Number.isFinite(wordsRead) ||
    !Number.isFinite(activeSeconds) ||
    wordsRead <= 0 ||
    activeSeconds <= 0
  ) {
    return null;
  }

  const wpm = Math.round((wordsRead / activeSeconds) * 60);
  return wpm > 0 ? wpm : null;
}

export function classifyReadingTempo(avgWpm: number): ReadingTempo {
  if (avgWpm < 180) return "reflective";
  if (avgWpm <= 280) return "steady";
  return "brisk";
}
