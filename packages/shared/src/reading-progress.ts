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

type TiptapTextNode = {
  type?: string;
  text?: string;
  content?: TiptapTextNode[];
};

const SKIPPED_TIPTAP_NODES = new Set([
  "chapterBreak",
  "pageBreak",
  "thinDivider",
  "mediumDivider",
]);

function collectTiptapText(node: TiptapTextNode): string {
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return " ";
  if (!Array.isArray(node.content)) return "";
  return node.content.map(collectTiptapText).join("");
}

function extractTiptapParagraphs(parsed: TiptapTextNode): string[] {
  const blocks: string[] = [];
  const visit = (node: TiptapTextNode) => {
    if (!node || (node.type && SKIPPED_TIPTAP_NODES.has(node.type))) return;
    if (
      node.type === "paragraph" ||
      node.type === "heading" ||
      node.type === "codeBlock"
    ) {
      const text = collectTiptapText(node).trim();
      if (text) blocks.push(text);
      return;
    }
    if (Array.isArray(node.content)) {
      node.content.forEach(visit);
    }
  };
  visit(parsed);
  return blocks;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function stripHtmlTags(raw: string): string {
  return decodeHtmlEntities(
    raw.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]*>/g, ""),
  )
    .replace(/\s+/g, " ")
    .trim();
}

export function extractPlainParagraphs(content?: string | null): string[] {
  if (!content) return [];
  const trimmed = content.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith("{") && trimmed.includes('"type"')) {
    try {
      const parsed = JSON.parse(trimmed) as TiptapTextNode;
      const blocks = extractTiptapParagraphs(parsed);
      if (blocks.length > 0) return blocks;
    } catch {
      // Fall through to HTML/plain parsing if JSON is malformed.
    }
  }

  if (trimmed.includes("<")) {
    const cleaned = trimmed
      .replace(
        /<div[^>]*(?:data-type="(?:chapter-break|page-break)"|class="[^"]*tiptap-(?:chapter|page)-break[^"]*")[^>]*>[\s\S]*?<\/div>/gi,
        "\n\n",
      )
      .replace(/<!--[\s\S]*?-->/g, "\n\n")
      .replace(/<\/(?:p|h[1-6]|blockquote|li|div)>/gi, "\n\n");

    return cleaned.split(/\n\n+/).map(stripHtmlTags).filter(Boolean);
  }

  return trimmed
    .replace(/<!--\s*pagebreak\s*-->|---pagebreak---/gi, "\n\n")
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

export function countContentWords(content?: string | null): number {
  return extractPlainParagraphs(content).reduce(
    (sum, paragraph) => sum + countWords(paragraph),
    0,
  );
}
