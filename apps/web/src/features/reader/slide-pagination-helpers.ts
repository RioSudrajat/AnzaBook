import type { BookReaderChapterDto } from "@starter/shared/types";

export type SlidePosition = {
  chapter: number;
  paragraph: number;
  offset: number;
};

export type SlideFragment = {
  paragraph: number;
  source: string;
  start: number;
  end: number;
};

export type SlideLeaf = { heading: boolean; fragments: SlideFragment[] };

export type SlideSpread = {
  chapter: BookReaderChapterDto;
  position: SlidePosition;
  leaves: SlideLeaf[];
  chapterPage: number;
  chapterPages: number;
};

export function findSlide(spreads: SlideSpread[], position: SlidePosition) {
  const first = spreads.findIndex(
    ({ position: start }) => start.chapter === position.chapter,
  );
  if (first === -1) return 0;
  let index = first;
  for (let i = first + 1; i < spreads.length; i++) {
    const start = spreads[i].position;
    if (
      start.chapter !== position.chapter ||
      start.paragraph > position.paragraph ||
      (start.paragraph === position.paragraph && start.offset > position.offset)
    )
      break;
    index = i;
  }
  return index;
}

export function slideParagraphText(raw: string) {
  return raw.replace(/<!--\s*pagebreak\s*-->|---pagebreak---/gi, "").trim();
}

export function extractCleanSlideParagraphs(
  content?: string | null,
  parseHtmlBlocks?: (html: string) => string[],
): string[] {
  if (!content) return [];

  const trimmed = content.trim();
  if (trimmed.startsWith("{") && trimmed.includes('"type"')) {
    try {
      interface TipTapAstNode {
        type?: string;
        text?: string;
        content?: TipTapAstNode[];
      }
      const parsed = JSON.parse(trimmed) as TipTapAstNode;
      const paras: string[] = [];
      const traverse = (node: TipTapAstNode) => {
        if (!node) return;
        if (node.type === "chapterBreak" || node.type === "pageBreak") return;
        if (node.type === "text" && node.text) {
          paras.push(node.text);
        } else if (node.content && Array.isArray(node.content)) {
          const directText = node.content
            .filter((c: TipTapAstNode) => c.type === "text")
            .map((c: TipTapAstNode) => c.text || "")
            .join("")
            .trim();
          if (directText) {
            paras.push(directText);
          } else {
            node.content.forEach(traverse);
          }
        }
      };
      if (parsed.content && Array.isArray(parsed.content)) {
        parsed.content.forEach(traverse);
      }
      if (paras.length > 0) return paras;
    } catch {
      // Fallback
    }
  }

  const withoutPagebreakComments = trimmed
    .replace(/<!--\s*pagebreak\s*-->|---pagebreak---/gi, "\n\n")
    .trim();

  // Only invoke HTML parsing when actual HTML block tags exist (plain text with <!-- pagebreak --> stays plain text).
  const hasHtmlBlockTags =
    /<\/?(?:p|div|h[1-6]|blockquote|li|ul|ol|br|section|article)\b/i.test(
      withoutPagebreakComments,
    );

  if (!hasHtmlBlockTags) {
    return withoutPagebreakComments
      .split(/\n\s*\n+/)
      .map((part) => part.replace(/\s+/g, " ").trim())
      .filter(Boolean);
  }

  if (parseHtmlBlocks) {
    return parseHtmlBlocks(withoutPagebreakComments);
  }

  return withoutPagebreakComments
    .replace(
      /<div[^>]+data-type=["'](?:chapter-break|page-break)["'][^>]*>[\s\S]*?<\/div>/gi,
      "\n\n",
    )
    .replace(/<[^>]*>/g, "\n\n")
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function computeStableBookSlideMeta(params: {
  spreads: readonly SlideSpread[];
  index: number;
  allChapterNumbers?: readonly number[];
  hasFullAccess?: boolean;
}): { displayPage: number; displayTotal: number } {
  const { spreads, index, allChapterNumbers, hasFullAccess } = params;
  if (spreads.length === 0) {
    return { displayPage: 0, displayTotal: 0 };
  }
  const safeIndex = Math.max(0, Math.min(spreads.length - 1, index));

  if (!hasFullAccess || !allChapterNumbers || allChapterNumbers.length === 0) {
    return { displayPage: safeIndex + 1, displayTotal: spreads.length };
  }

  const chapterSpreadCounts = new Map<number, number>();
  for (const spread of spreads) {
    const ch = spread.chapter.chapterNumber;
    chapterSpreadCounts.set(ch, (chapterSpreadCounts.get(ch) ?? 0) + 1);
  }

  const loadedCount = chapterSpreadCounts.size;
  if (loadedCount === 0) {
    return { displayPage: safeIndex + 1, displayTotal: spreads.length };
  }

  const avgSpreadsPerChapter = spreads.length / loadedCount;
  const firstLoadedChapter = spreads[0].chapter.chapterNumber;
  const chaptersBeforeFirst = allChapterNumbers.filter(
    (ch) => ch < firstLoadedChapter && !chapterSpreadCounts.has(ch),
  ).length;
  const unloadedChaptersCount = allChapterNumbers.filter(
    (ch) => !chapterSpreadCounts.has(ch),
  ).length;

  const estimatedBefore = Math.round(
    chaptersBeforeFirst * avgSpreadsPerChapter,
  );
  const displayPage = estimatedBefore + safeIndex + 1;
  const estimatedTotal =
    spreads.length + Math.round(unloadedChaptersCount * avgSpreadsPerChapter);

  return {
    displayPage,
    displayTotal: Math.max(displayPage, spreads.length, estimatedTotal),
  };
}

export function computeSpreadLeafPageNumbers(params: {
  spreads: readonly SlideSpread[];
  spreadIndex: number;
  allChapterNumbers?: readonly number[];
  hasFullAccess?: boolean;
}): { left?: number; right?: number } {
  const { spreads, spreadIndex, allChapterNumbers, hasFullAccess } = params;
  if (
    spreads.length === 0 ||
    spreadIndex < 0 ||
    spreadIndex >= spreads.length
  ) {
    return {};
  }

  const targetSpread = spreads[spreadIndex];
  const { displayPage } = computeStableBookSlideMeta({
    spreads,
    index: spreadIndex,
    allChapterNumbers,
    hasFullAccess,
  });
  const estimatedSpreadsBefore = Math.max(0, displayPage - (spreadIndex + 1));
  const leavesPerSpread = Math.max(
    1,
    spreads.reduce((max, item) => Math.max(max, item.leaves.length), 1),
  );

  let leavesBefore = estimatedSpreadsBefore * leavesPerSpread;
  for (let i = 0; i < spreadIndex; i++) {
    leavesBefore += spreads[i].leaves.length;
  }

  return {
    left: targetSpread.leaves[0] ? leavesBefore + 1 : undefined,
    right: targetSpread.leaves[1] ? leavesBefore + 2 : undefined,
  };
}
