import {
  classifyReadingTempo,
  computeReadingWpm,
  computeWordWeightedProgress,
  countContentWords,
  countWords,
  extractPlainParagraphs,
  STANDARD_WORDS_PER_PAGE,
  wordsToStandardPages,
  type ReadingTempo,
} from "@starter/shared/reading-progress";

export { countWords, extractPlainParagraphs };

export const EXIT_PROMPT_MIN_ACTIVE_SECONDS = 15;
export const MIN_API_WPM = 30;
export const MAX_API_WPM = 1200;
export const FALLBACK_API_WPM = 200;

const DEFAULT_UNLOADED_CHAPTER_WORDS = 500;

export type ChapterTextSource = {
  chapterNumber: number;
  contentId?: string | null;
  contentEn?: string | null;
  fullWordCount?: number | null;
  isPreviewTruncated?: boolean;
};

export type ChapterWeightSource = {
  chapterNumber: number;
  wordCount?: number | null;
};

export type ReaderProgressSegment = {
  chapterNumber: number;
  weight: number;
  fillPercent: number;
};

export type ReaderProgressBarState = {
  overallPercent: number;
  formattedPercent: string;
  segments: ReaderProgressSegment[];
};

export type ChapterWordInfo = {
  chapterNumber: number;
  paragraphWordCounts: number[];
  paragraphPrefixWords: number[];
  totalWords: number;
  realWordsBeforeChapter: number;
  weightedWordsBeforeChapter: number;
  isEstimated: boolean;
};

export type BookWordMap = {
  chapters: ChapterWordInfo[];
  chapterWordCounts: number[];
  totalWords: number;
};

export type ReadingAnchor = {
  chapterNumber: number;
  paragraphIndex: number;
  scrollPercent: number;
  slideIndex?: number;
};

export type SessionMetricsResult = {
  wordsRead: number;
  pagesRead: number;
  activeSeconds: number;
  rawWpm: number | null;
  apiAvgWpm: number;
  tempo: ReadingTempo | null;
  startProgressPercent: number;
  endProgressPercent: number;
  startChapterNumber: number;
  endChapterNumber: number;
  hasForwardProgress: boolean;
};

function selectChapterContent(
  chapter: ChapterTextSource,
  languageView: "id" | "en" | "split",
): string | null | undefined {
  if (languageView === "en" && chapter.contentEn?.trim()) {
    return chapter.contentEn;
  }
  return chapter.contentId;
}

export function buildBookWordMap(
  chapters: readonly ChapterTextSource[],
  languageView: "id" | "en" | "split",
  allChapterNumbers?: readonly number[],
): BookWordMap {
  const loadedByNumber = new Map<number, ChapterTextSource>();
  for (const ch of chapters) {
    loadedByNumber.set(ch.chapterNumber, ch);
  }

  const orderedNumbers =
    allChapterNumbers && allChapterNumbers.length > 0
      ? [...allChapterNumbers].sort((a, b) => a - b)
      : Array.from(loadedByNumber.keys()).sort((a, b) => a - b);

  const loadedTotals: number[] = [];
  const parsedEntries = orderedNumbers.map((chapterNumber) => {
    const source = loadedByNumber.get(chapterNumber);
    if (!source) {
      return {
        chapterNumber,
        paragraphWordCounts: [] as number[],
        paragraphPrefixWords: [] as number[],
        totalWords: 0,
        isEstimated: true,
      };
    }

    const paragraphs = extractPlainParagraphs(
      selectChapterContent(source, languageView),
    );
    const paragraphWordCounts = paragraphs.map(countWords);
    const paragraphPrefixWords: number[] = [];
    let running = 0;
    for (const wc of paragraphWordCounts) {
      paragraphPrefixWords.push(running);
      running += wc;
    }
    if (running > 0) loadedTotals.push(running);

    return {
      chapterNumber,
      paragraphWordCounts,
      paragraphPrefixWords,
      totalWords: running,
      isEstimated: false,
    };
  });

  const avgLoadedWords =
    loadedTotals.length > 0
      ? Math.round(
          loadedTotals.reduce((sum, val) => sum + val, 0) / loadedTotals.length,
        )
      : DEFAULT_UNLOADED_CHAPTER_WORDS;

  let realWordsBeforeChapter = 0;
  let weightedWordsBeforeChapter = 0;
  const chapterInfos: ChapterWordInfo[] = [];
  const chapterWordCounts: number[] = [];

  for (const entry of parsedEntries) {
    const totalWords = entry.isEstimated ? avgLoadedWords : entry.totalWords;
    chapterInfos.push({
      chapterNumber: entry.chapterNumber,
      paragraphWordCounts: entry.paragraphWordCounts,
      paragraphPrefixWords: entry.paragraphPrefixWords,
      totalWords,
      realWordsBeforeChapter,
      weightedWordsBeforeChapter,
      isEstimated: entry.isEstimated,
    });
    chapterWordCounts.push(totalWords);

    if (!entry.isEstimated) {
      realWordsBeforeChapter += totalWords;
    }
    weightedWordsBeforeChapter += totalWords;
  }

  return {
    chapters: chapterInfos,
    chapterWordCounts,
    totalWords: weightedWordsBeforeChapter,
  };
}

export function anchorToBookWords(
  map: BookWordMap,
  anchor: ReadingAnchor,
): number {
  const chapter = map.chapters.find(
    (c) => c.chapterNumber === anchor.chapterNumber,
  );
  if (!chapter) return 0;
  if (chapter.isEstimated) return chapter.realWordsBeforeChapter;

  if (anchor.scrollPercent >= 100) {
    return chapter.realWordsBeforeChapter + chapter.totalWords;
  }
  if (anchor.paragraphIndex < 0 || chapter.paragraphWordCounts.length === 0) {
    return chapter.realWordsBeforeChapter;
  }
  const idx = Math.min(
    anchor.paragraphIndex,
    chapter.paragraphWordCounts.length - 1,
  );
  return (
    chapter.realWordsBeforeChapter + (chapter.paragraphPrefixWords[idx] ?? 0)
  );
}

export function computeSessionWordDelta(
  map: BookWordMap,
  start: ReadingAnchor,
  end: ReadingAnchor,
): number {
  const startWords = anchorToBookWords(map, start);
  const endWords = anchorToBookWords(map, end);
  if (endWords > startWords) {
    return endWords - startWords;
  }

  // Fallback when reader scrolled forward within the same paragraph.
  if (
    start.chapterNumber === end.chapterNumber &&
    start.paragraphIndex === end.paragraphIndex &&
    end.scrollPercent > start.scrollPercent &&
    end.scrollPercent < 100
  ) {
    const chapter = map.chapters.find(
      (c) => c.chapterNumber === end.chapterNumber,
    );
    if (
      !chapter ||
      chapter.isEstimated ||
      chapter.paragraphWordCounts.length === 0
    ) {
      return 0;
    }
    const idx = Math.min(
      Math.max(0, end.paragraphIndex),
      chapter.paragraphWordCounts.length - 1,
    );
    const currentParaWords = chapter.paragraphWordCounts[idx] ?? 0;
    return Math.max(
      0,
      Math.round(
        currentParaWords * ((end.scrollPercent - start.scrollPercent) / 100),
      ),
    );
  }

  return 0;
}

export function computeStandardPageForPosition(
  map: BookWordMap,
  chapterNumber: number,
  paragraphIndex: number,
): number {
  const chapter = map.chapters.find((c) => c.chapterNumber === chapterNumber);
  if (!chapter) return 1;

  let wordsInChapterBefore = 0;
  if (
    !chapter.isEstimated &&
    paragraphIndex >= 0 &&
    chapter.paragraphPrefixWords.length > 0
  ) {
    const idx = Math.min(
      paragraphIndex,
      chapter.paragraphPrefixWords.length - 1,
    );
    wordsInChapterBefore = chapter.paragraphPrefixWords[idx] ?? 0;
  }

  const cumulativeWords =
    chapter.weightedWordsBeforeChapter + wordsInChapterBefore;
  return Math.max(1, Math.floor(cumulativeWords / STANDARD_WORDS_PER_PAGE) + 1);
}

export function computeBookWordWeightedPercent(
  map: BookWordMap,
  chapterNumber: number,
  chapterPercent: number,
  hasFullAccess: boolean,
): number {
  if (!hasFullAccess) {
    return Math.min(100, Math.max(0, Math.round(chapterPercent)));
  }

  const chapterIndex = map.chapters.findIndex(
    (c) => c.chapterNumber === chapterNumber,
  );
  if (chapterIndex < 0) return 0;

  const clampedFraction = Math.min(1, Math.max(0, chapterPercent / 100));
  return computeWordWeightedProgress(
    map.chapterWordCounts,
    chapterIndex,
    clampedFraction,
  );
}

export function clampSessionWpm(rawWpm: number | null): number {
  if (rawWpm === null || !Number.isFinite(rawWpm)) {
    return FALLBACK_API_WPM;
  }
  return Math.min(MAX_API_WPM, Math.max(MIN_API_WPM, Math.round(rawWpm)));
}

export function hasGenuineForwardProgress(
  start: ReadingAnchor,
  end: ReadingAnchor,
  wordsRead: number,
  startProgressPercent: number,
  endProgressPercent: number,
): boolean {
  if (wordsRead > 0 || endProgressPercent > startProgressPercent) return true;
  if (end.chapterNumber > start.chapterNumber) return true;
  if (
    end.chapterNumber === start.chapterNumber &&
    start.scrollPercent < 100 &&
    end.paragraphIndex > start.paragraphIndex
  ) {
    return true;
  }
  if (
    start.slideIndex !== undefined &&
    end.slideIndex !== undefined &&
    end.slideIndex > start.slideIndex
  ) {
    return true;
  }
  return false;
}

export function shouldShowExitPrompt(params: {
  activeSeconds: number;
  hasForwardProgress: boolean;
}): boolean {
  return (
    params.activeSeconds >= EXIT_PROMPT_MIN_ACTIVE_SECONDS ||
    params.hasForwardProgress
  );
}

export function computeSessionMetrics(params: {
  map: BookWordMap;
  start: ReadingAnchor;
  end: ReadingAnchor;
  activeSeconds: number;
  hasFullAccess: boolean;
}): SessionMetricsResult {
  const { map, start, end, activeSeconds, hasFullAccess } = params;
  const safeActiveSeconds = Math.max(0, Math.floor(activeSeconds));

  const wordsRead = computeSessionWordDelta(map, start, end);
  const pagesRead = wordsToStandardPages(wordsRead);
  const rawWpm = computeReadingWpm(wordsRead, safeActiveSeconds);
  const apiAvgWpm = clampSessionWpm(rawWpm);
  const tempo = rawWpm !== null ? classifyReadingTempo(rawWpm) : null;

  const startProgressPercent = computeBookWordWeightedPercent(
    map,
    start.chapterNumber,
    start.scrollPercent,
    hasFullAccess,
  );
  const endProgressPercent = computeBookWordWeightedPercent(
    map,
    end.chapterNumber,
    end.scrollPercent,
    hasFullAccess,
  );

  const hasForwardProgress = hasGenuineForwardProgress(
    start,
    end,
    wordsRead,
    startProgressPercent,
    endProgressPercent,
  );

  return {
    wordsRead,
    pagesRead,
    activeSeconds: safeActiveSeconds,
    rawWpm,
    apiAvgWpm,
    tempo,
    startProgressPercent,
    endProgressPercent,
    startChapterNumber: start.chapterNumber,
    endChapterNumber: end.chapterNumber,
    hasForwardProgress,
  };
}

export function formatActiveDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  if (total < 60) return `${total} dtk`;
  if (total < 3600) {
    const minutes = Math.floor(total / 60);
    const remSeconds = total % 60;
    if (total < 600 && remSeconds > 0) {
      return `${minutes} mnt ${remSeconds} dtk`;
    }
    return `${minutes} mnt`;
  }
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  return minutes > 0 ? `${hours} jam ${minutes} mnt` : `${hours} jam`;
}

export function tempoLabelId(tempo: ReadingTempo): {
  label: string;
  description: string;
} {
  switch (tempo) {
    case "reflective":
      return {
        label: "Mendalam",
        description: "Ritme reflektif di bawah 180 KPM",
      };
    case "steady":
      return {
        label: "Mengalir",
        description: "Ritme stabil 180 hingga 280 KPM",
      };
    case "brisk":
      return {
        label: "Lugas",
        description: "Ritme cepat di atas 280 KPM",
      };
  }
}

export function formatReaderProgressPercent(percent: number): string {
  const clamped = Math.min(100, Math.max(0, percent));
  const rounded = Math.round(clamped * 10) / 10;
  if (rounded <= 0) return "0%";
  if (rounded >= 100) return "100%";
  return Number.isInteger(rounded) ? `${rounded}%` : `${rounded.toFixed(1)}%`;
}

export function computeReaderProgressBarState(params: {
  chapters: readonly ChapterTextSource[];
  languageView: "id" | "en" | "split";
  allChapters?: readonly ChapterWeightSource[];
  activeChapterNumber: number;
  chapterPercent: number;
}): ReaderProgressBarState {
  const {
    chapters,
    languageView,
    allChapters,
    activeChapterNumber,
    chapterPercent,
  } = params;

  const loadedByNumber = new Map<number, ChapterTextSource>();
  for (const ch of chapters) {
    loadedByNumber.set(ch.chapterNumber, ch);
  }

  const metaByNumber = new Map<number, ChapterWeightSource>();
  if (allChapters) {
    for (const meta of allChapters) {
      metaByNumber.set(meta.chapterNumber, meta);
    }
  }

  const orderedNumbers =
    allChapters && allChapters.length > 0
      ? allChapters.map((c) => c.chapterNumber).sort((a, b) => a - b)
      : Array.from(loadedByNumber.keys()).sort((a, b) => a - b);

  if (orderedNumbers.length === 0) {
    return { overallPercent: 0, formattedPercent: "0%", segments: [] };
  }

  const knownWordCounts: number[] = [];
  const rawEntries = orderedNumbers.map((chapterNumber) => {
    const source = loadedByNumber.get(chapterNumber);
    const meta = metaByNumber.get(chapterNumber);
    const accessibleWords = source
      ? countContentWords(selectChapterContent(source, languageView))
      : 0;

    // Prefer full word count when preview-truncated; else loaded words, then summary wordCount.
    const explicitFullWords =
      typeof source?.fullWordCount === "number" && source.fullWordCount > 0
        ? source.fullWordCount
        : typeof meta?.wordCount === "number" && meta.wordCount > 0
          ? meta.wordCount
          : 0;

    const fullWords = source?.isPreviewTruncated
      ? Math.max(explicitFullWords, accessibleWords)
      : source
        ? accessibleWords > 0
          ? accessibleWords
          : explicitFullWords
        : explicitFullWords;

    if (fullWords > 0) knownWordCounts.push(fullWords);

    return {
      chapterNumber,
      source,
      accessibleWords,
      fullWords,
      hasKnownWeight: fullWords > 0,
    };
  });

  const avgKnownWords =
    knownWordCounts.length > 0
      ? Math.round(
          knownWordCounts.reduce((sum, val) => sum + val, 0) /
            knownWordCounts.length,
        )
      : DEFAULT_UNLOADED_CHAPTER_WORDS;

  const resolvedEntries = rawEntries.map((entry) => ({
    ...entry,
    weight: entry.hasKnownWeight ? entry.fullWords : Math.max(1, avgKnownWords),
  }));

  const activeIndex = resolvedEntries.findIndex(
    (entry) => entry.chapterNumber === activeChapterNumber,
  );
  const clampedChapterFraction = Math.min(1, Math.max(0, chapterPercent / 100));

  let totalBookWords = 0;
  let readBookWords = 0;

  const segments: ReaderProgressSegment[] = resolvedEntries.map(
    (entry, idx) => {
      const accessibleRatio = entry.source?.isPreviewTruncated
        ? entry.weight > 0
          ? Math.min(1, entry.accessibleWords / entry.weight)
          : 0
        : 1;

      let fillFraction = 0;
      if (activeIndex >= 0) {
        if (idx < activeIndex) {
          fillFraction = accessibleRatio;
        } else if (idx === activeIndex) {
          fillFraction = clampedChapterFraction * accessibleRatio;
        }
      }

      totalBookWords += entry.weight;
      readBookWords += entry.weight * fillFraction;

      return {
        chapterNumber: entry.chapterNumber,
        weight: entry.weight,
        fillPercent:
          Math.round(Math.min(100, Math.max(0, fillFraction * 100)) * 100) /
          100,
      };
    },
  );

  const rawOverall =
    totalBookWords > 0
      ? Math.min(100, Math.max(0, (readBookWords / totalBookWords) * 100))
      : 0;
  const overallPercent = Math.round(rawOverall * 10) / 10;

  return {
    overallPercent,
    formattedPercent: formatReaderProgressPercent(overallPercent),
    segments,
  };
}
