export type ChapterPage = {
  pageIndex: number;
  pageNumber: number;
  paragraphs: string[];
  text: string;
};

export function splitChapterIntoPages(
  rawText?: string | null,
  paragraphsPerPage = 5,
): ChapterPage[] {
  if (!rawText || !rawText.trim()) {
    return [
      {
        pageIndex: 0,
        pageNumber: 1,
        paragraphs: [],
        text: "",
      },
    ];
  }

  const explicitPagebreakPattern = /<!--\s*pagebreak\s*-->|---pagebreak---/i;

  if (explicitPagebreakPattern.test(rawText)) {
    const rawPages = rawText
      .split(explicitPagebreakPattern)
      .map((p) => p.trim())
      .filter(Boolean);

    if (rawPages.length === 0) {
      return [
        {
          pageIndex: 0,
          pageNumber: 1,
          paragraphs: [],
          text: "",
        },
      ];
    }

    return rawPages.map((pageText, idx) => {
      const paragraphs = pageText
        .split(/\n\n+/)
        .map((p) => p.trim())
        .filter(Boolean);

      return {
        pageIndex: idx,
        pageNumber: idx + 1,
        paragraphs,
        text: pageText,
      };
    });
  }

  // Fallback: chunk paragraphs by paragraphsPerPage
  const allParagraphs = rawText
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (allParagraphs.length === 0) {
    return [
      {
        pageIndex: 0,
        pageNumber: 1,
        paragraphs: [],
        text: "",
      },
    ];
  }

  const pageSize = Math.max(1, paragraphsPerPage);
  const pages: ChapterPage[] = [];

  for (let i = 0; i < allParagraphs.length; i += pageSize) {
    const chunk = allParagraphs.slice(i, i + pageSize);
    pages.push({
      pageIndex: pages.length,
      pageNumber: pages.length + 1,
      paragraphs: chunk,
      text: chunk.join("\n\n"),
    });
  }

  return pages;
}

export function getChapterPageInfo(
  currentSlidePageIndex: number,
  totalPagesCount: number,
): {
  currentPage: number;
  totalPages: number;
} {
  const total = Math.max(1, totalPagesCount);
  const current = Math.min(total, Math.max(1, currentSlidePageIndex + 1));
  return {
    currentPage: current,
    totalPages: total,
  };
}

export type ChapterPaginationInput = {
  chapterNumber: number;
  contentId: string;
  contentEn?: string | null;
};

export type ChapterPageSummary = {
  chapterNumber: number;
  pageCount: number;
  startGlobalPage: number; // 1-indexed
  endGlobalPage: number; // 1-indexed
};

export type BookPagination = {
  chapters: ChapterPageSummary[];
  totalPages: number;
};

export function computeBookPagination(
  chapters: ChapterPaginationInput[],
  languageView: "id" | "en" | "split" = "id",
  paragraphsPerPage = 5,
): BookPagination {
  if (!chapters || chapters.length === 0) {
    return {
      chapters: [],
      totalPages: 1,
    };
  }

  let runningGlobalPage = 1;
  const summaries: ChapterPageSummary[] = [];

  for (const ch of chapters) {
    const rawText =
      languageView === "en" && ch.contentEn ? ch.contentEn : ch.contentId;
    const pages = splitChapterIntoPages(rawText, paragraphsPerPage);
    const pageCount = Math.max(1, pages.length);
    const startGlobalPage = runningGlobalPage;
    const endGlobalPage = runningGlobalPage + pageCount - 1;

    summaries.push({
      chapterNumber: ch.chapterNumber,
      pageCount,
      startGlobalPage,
      endGlobalPage,
    });

    runningGlobalPage += pageCount;
  }

  return {
    chapters: summaries,
    totalPages: Math.max(1, runningGlobalPage - 1),
  };
}

export function getGlobalPageNumber(
  chapterNumber: number,
  localPageIndex: number,
  pagination: BookPagination,
): number {
  const chapter = pagination.chapters.find(
    (c) => c.chapterNumber === chapterNumber,
  );
  if (!chapter) {
    return Math.min(pagination.totalPages, Math.max(1, localPageIndex + 1));
  }
  const target = chapter.startGlobalPage + Math.max(0, localPageIndex);
  return Math.min(chapter.endGlobalPage, Math.max(chapter.startGlobalPage, target));
}

export function getChapterAndPageFromGlobal(
  globalPage: number,
  pagination: BookPagination,
): {
  chapterNumber: number;
  localPageIndex: number;
} {
  if (!pagination.chapters || pagination.chapters.length === 0) {
    return { chapterNumber: 1, localPageIndex: 0 };
  }

  const clamped = Math.min(
    pagination.totalPages,
    Math.max(1, globalPage),
  );

  const found = pagination.chapters.find(
    (c) => clamped >= c.startGlobalPage && clamped <= c.endGlobalPage,
  );

  if (found) {
    return {
      chapterNumber: found.chapterNumber,
      localPageIndex: Math.max(0, clamped - found.startGlobalPage),
    };
  }

  // Fallback to first chapter
  const first = pagination.chapters[0];
  return {
    chapterNumber: first.chapterNumber,
    localPageIndex: 0,
  };
}
