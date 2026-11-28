import type { JSONContent } from "@tiptap/core";

export interface ExtractedChapter {
  chapterNumber: number;
  title: string;
  doc: JSONContent;
  plainTextParagraphs: string[];
}

export interface LockedPreviewSlice {
  slicedDoc: JSONContent;
  unlockedChapterNumbers: Set<number>;
  hitPaywallNode: boolean;
  truncatedByFallback: boolean;
}

const RICH_CONTENT_NODE_TYPES = new Set([
  "image",
  "audioEmbed",
  "videoEmbed",
  "calloutBox",
  "financialChart",
  "latexBlock",
  "collapsible",
  "poetryBlock",
  "pollBlock",
  "predictionMarket",
  "recipeBlock",
  "audienceGated",
  "footnoteBlock",
  "substackButton",
]);

/**
 * Extracts inline plain text recursively from any Tiptap node (including chapterBreak titles).
 */
export function extractInlineText(node: JSONContent): string {
  if (node.type === "text" && node.text) {
    return node.text;
  }
  if (node.content && Array.isArray(node.content)) {
    return node.content.map(extractInlineText).join("").trim();
  }
  return "";
}

/**
 * Extracts plain body text recursively from a Tiptap node (skips chapter/page markers).
 */
export function extractTextFromNode(node: JSONContent): string {
  if (
    node.type === "chapterBreak" ||
    node.type === "pageBreak" ||
    node.type === "nakamaPaywall"
  ) {
    return "";
  }
  return extractInlineText(node);
}

function nodeHasMeaningfulBody(node: JSONContent): boolean {
  if (!node.type) return false;
  if (
    node.type === "chapterBreak" ||
    node.type === "pageBreak" ||
    node.type === "nakamaPaywall"
  ) {
    return false;
  }
  if (RICH_CONTENT_NODE_TYPES.has(node.type)) {
    return true;
  }
  return extractTextFromNode(node).trim().length > 0;
}

function normalizeChapterBreakNode(
  node: JSONContent,
  chapterNumber: number,
  fallbackTitle = "",
): JSONContent {
  const inlineText = extractInlineText(node);
  const resolvedTitle =
    inlineText ||
    (typeof node.attrs?.title === "string" ? node.attrs.title.trim() : "") ||
    fallbackTitle;

  const hasExplicitContentArray = Array.isArray(node.content);
  const nextContent = hasExplicitContentArray
    ? node.content
    : resolvedTitle
      ? [{ type: "text", text: resolvedTitle }]
      : [];

  return {
    type: "chapterBreak",
    attrs: {
      chapterNumber,
    },
    ...(nextContent && nextContent.length > 0 ? { content: nextContent } : {}),
  };
}

/**
 * Normalizes a Tiptap document so that:
 * 1. It is a valid doc object
 * 2. It always starts with Chapter 1 break at content[0] with live editable text content
 * 3. All chapter breaks have valid sequential chapter numbers
 * 4. Empty documents stay genuinely empty (no fake starter sentences)
 */
export function normalizeManuscriptJson(
  rawJson: JSONContent | null | undefined,
  defaultTitle = "",
): JSONContent {
  const emptyChapter1: JSONContent = {
    type: "chapterBreak",
    attrs: { chapterNumber: 1 },
    ...(defaultTitle
      ? { content: [{ type: "text", text: defaultTitle }] }
      : {}),
  };

  if (!rawJson || typeof rawJson !== "object") {
    return {
      type: "doc",
      content: [emptyChapter1, { type: "paragraph" }],
    };
  }

  const content: JSONContent[] = Array.isArray(rawJson.content)
    ? [...rawJson.content]
    : [];

  if (content.length === 0) {
    return {
      type: "doc",
      content: [emptyChapter1, { type: "paragraph" }],
    };
  }

  // Upgrade any chapterBreak node that still carries legacy attrs.title without content
  for (let i = 0; i < content.length; i++) {
    const item = content[i];
    if (item?.type === "chapterBreak") {
      const num = Number(item.attrs?.chapterNumber) || 1;
      content[i] = normalizeChapterBreakNode(
        item,
        num,
        num === 1 ? defaultTitle : "",
      );
    }
  }

  // Check if first element is chapterBreak for Chapter 1
  const firstNode = content[0];
  if (
    firstNode.type !== "chapterBreak" ||
    Number(firstNode.attrs?.chapterNumber) !== 1
  ) {
    content.unshift(emptyChapter1);
  }

  return {
    type: "doc",
    content,
  };
}

/**
 * Splits a unified Tiptap JSON doc into individual chapters.
 * Ensures zero content loss - all nodes are attributed to the active chapter.
 */
export function extractChaptersFromJson(doc: JSONContent): ExtractedChapter[] {
  if (!doc || !Array.isArray(doc.content) || doc.content.length === 0) {
    return [
      {
        chapterNumber: 1,
        title: "",
        doc: {
          type: "doc",
          content: [{ type: "paragraph" }],
        },
        plainTextParagraphs: [],
      },
    ];
  }

  const chapters: ExtractedChapter[] = [];
  let currentNum = 1;
  let currentTitle = "";
  let currentNodes: JSONContent[] = [];

  const flushChapter = () => {
    const paragraphs: string[] = [];

    for (const node of currentNodes) {
      if (
        node.type === "chapterBreak" ||
        node.type === "pageBreak" ||
        node.type === "nakamaPaywall"
      ) {
        continue;
      }
      const text = extractTextFromNode(node);
      if (text) {
        paragraphs.push(text);
      }
    }

    const safeNodes =
      currentNodes.length > 0 ? currentNodes : [{ type: "paragraph" }];

    chapters.push({
      chapterNumber: currentNum,
      title: currentTitle,
      doc: {
        type: "doc",
        content: safeNodes,
      },
      plainTextParagraphs: paragraphs,
    });
  };

  let foundAnyChapterBreak = false;

  for (const node of doc.content) {
    if (node.type === "chapterBreak") {
      if (foundAnyChapterBreak || currentNodes.length > 0) {
        flushChapter();
        currentNodes = [];
      }
      foundAnyChapterBreak = true;
      currentNum = Number(node.attrs?.chapterNumber) || chapters.length + 1;
      const inlineTitle = extractInlineText(node).trim();
      currentTitle =
        inlineTitle ||
        (typeof node.attrs?.title === "string"
          ? node.attrs.title.trim()
          : "") ||
        "";
    } else {
      currentNodes.push(node);
    }
  }

  flushChapter();

  // Ensure sequential chapter numbering starting at 1
  const sorted = chapters.sort((a, b) => a.chapterNumber - b.chapterNumber);

  if (sorted.length > 0 && sorted[0].chapterNumber !== 1) {
    if (sorted.length === 1) {
      sorted[0].chapterNumber = 1;
    } else {
      sorted.unshift({
        chapterNumber: 1,
        title: "",
        doc: {
          type: "doc",
          content: [{ type: "paragraph" }],
        },
        plainTextParagraphs: [],
      });
    }
  }

  // Renumber to ensure strict 1..N sequence without gaps
  sorted.forEach((chap, idx) => {
    chap.chapterNumber = idx + 1;
  });

  return sorted;
}

/**
 * Reconstructs a full unified Tiptap JSON document from a list of database chapters.
 * Handles both JSON doc strings and legacy HTML/plain text gracefully.
 */
export function buildUnifiedDocFromChapters(
  chapters: Array<{
    chapterNumber: number;
    titleId?: string;
    title?: string;
    contentId?: string;
    contentEn?: string | null;
    blueprintContent?: string | null;
  }>,
): JSONContent {
  if (!chapters || chapters.length === 0) {
    return normalizeManuscriptJson(null, "");
  }

  const unifiedContent: JSONContent[] = [];

  // Sort chapters by chapterNumber
  const sorted = [...chapters].sort(
    (a, b) => a.chapterNumber - b.chapterNumber,
  );

  for (let idx = 0; idx < sorted.length; idx++) {
    const chap = sorted[idx];
    const chapNum = chap.chapterNumber || idx + 1;
    const chapTitle = (chap.titleId || chap.title || "").trim();

    // Add live editable chapter break header node
    unifiedContent.push({
      type: "chapterBreak",
      attrs: {
        chapterNumber: chapNum,
      },
      ...(chapTitle ? { content: [{ type: "text", text: chapTitle }] } : {}),
    });

    // Check if blueprintContent is a Tiptap JSON
    let parsedDoc: JSONContent | null = null;
    const rawBlueprint = chap.blueprintContent?.trim();
    if (
      rawBlueprint &&
      rawBlueprint.startsWith("{") &&
      rawBlueprint.includes('"type"')
    ) {
      try {
        const parsed = JSON.parse(rawBlueprint);
        if (parsed.type === "doc" && Array.isArray(parsed.content)) {
          parsedDoc = parsed;
        }
      } catch {
        // Fallback to contentId
      }
    }

    // Check if contentId is a JSON string
    if (!parsedDoc && chap.contentId) {
      const rawContent = chap.contentId.trim();
      if (rawContent.startsWith("{") && rawContent.includes('"type"')) {
        try {
          const parsed = JSON.parse(rawContent);
          if (parsed.type === "doc" && Array.isArray(parsed.content)) {
            parsedDoc = parsed;
          }
        } catch {
          // Fallback to text parsing
        }
      }
    }

    if (parsedDoc && parsedDoc.content) {
      // Filter out any duplicate chapterBreak nodes that might be inside the sub-doc
      const subNodes = parsedDoc.content.filter(
        (n) => n.type !== "chapterBreak",
      );
      if (subNodes.length > 0) {
        unifiedContent.push(...subNodes);
      } else {
        unifiedContent.push({ type: "paragraph" });
      }
    } else {
      // Legacy HTML or plain text fallback: convert lines to paragraph nodes
      const rawText = chap.contentId || "";
      const cleanParagraphs = rawText
        .replace(/<[^>]*>/g, "\n\n")
        .split(/\n\n+/)
        .map((p) => p.trim())
        .filter(Boolean);

      if (cleanParagraphs.length > 0) {
        for (const p of cleanParagraphs) {
          unifiedContent.push({
            type: "paragraph",
            content: [{ type: "text", text: p }],
          });
        }
      } else {
        unifiedContent.push({ type: "paragraph" });
      }
    }
  }

  return normalizeManuscriptJson({ type: "doc", content: unifiedContent }, "");
}

/**
 * Checks whether any chapter in a manuscript already contains real body content.
 */
export function hasManuscriptBodyContent(
  chapters: Array<{
    contentId?: string | null;
    blueprintContent?: string | null;
    plainTextParagraphs?: string[];
    doc?: JSONContent;
  }>,
): boolean {
  if (!chapters || chapters.length === 0) return false;
  for (const ch of chapters) {
    if (ch.plainTextParagraphs && ch.plainTextParagraphs.length > 0) {
      return true;
    }
    if (ch.doc?.content?.some(nodeHasMeaningfulBody)) {
      return true;
    }
    const raw = (ch.blueprintContent || ch.contentId || "").trim();
    if (!raw) continue;
    if (raw.startsWith("{") && raw.includes('"type"')) {
      try {
        const parsed = JSON.parse(raw) as JSONContent;
        if (parsed.content?.some(nodeHasMeaningfulBody)) {
          return true;
        }
        continue;
      } catch {
        // Fall through to plain text check
      }
    }
    const stripped = raw.replace(/<[^>]*>/g, "").trim();
    if (stripped.length > 0) return true;
  }
  return false;
}

/**
 * Slices a Tiptap document for Locked Preview mode (`Terkunci`):
 * - If a `nakamaPaywall` divider exists, slices cleanly before that node.
 * - Otherwise falls back to `min(3, max(1, chapter1BodyCount - 1))` paragraphs of Chapter 1
 *   and locks Chapter 2+.
 */
export function sliceDocForLockedPreview(doc: JSONContent): LockedPreviewSlice {
  const nodes = Array.isArray(doc.content) ? doc.content : [];
  const paywallIndex = nodes.findIndex((n) => n.type === "nakamaPaywall");

  if (paywallIndex !== -1) {
    const slicedContent = nodes.slice(0, paywallIndex);
    const unlocked = new Set<number>([1]);
    for (const node of slicedContent) {
      if (node.type === "chapterBreak") {
        const num = Number(node.attrs?.chapterNumber) || 1;
        unlocked.add(num);
      }
    }
    return {
      slicedDoc: {
        type: "doc",
        content:
          slicedContent.length > 0
            ? slicedContent
            : [{ type: "chapterBreak", attrs: { chapterNumber: 1 } }],
      },
      unlockedChapterNumbers: unlocked,
      hitPaywallNode: true,
      truncatedByFallback: false,
    };
  }

  // Fallback: slice Chapter 1 to getPreviewParagraphCount(chapter1)
  const secondChapterIdx = nodes.findIndex(
    (n, idx) => idx > 0 && n.type === "chapterBreak",
  );
  const chapter1Nodes =
    secondChapterIdx === -1 ? nodes : nodes.slice(0, secondChapterIdx);
  const hasLaterChapters = secondChapterIdx !== -1;

  const nonEmptyBodyIndices: number[] = [];
  chapter1Nodes.forEach((node, idx) => {
    if (nodeHasMeaningfulBody(node)) {
      nonEmptyBodyIndices.push(idx);
    }
  });

  const allowedCount = Math.min(3, Math.max(1, nonEmptyBodyIndices.length - 1));
  const lastAllowedIdx =
    nonEmptyBodyIndices.length > 0
      ? (nonEmptyBodyIndices[
          Math.min(allowedCount, nonEmptyBodyIndices.length) - 1
        ] ?? chapter1Nodes.length - 1)
      : chapter1Nodes.length - 1;

  const slicedContent = chapter1Nodes.slice(0, lastAllowedIdx + 1);
  const truncatedByFallback =
    hasLaterChapters || nonEmptyBodyIndices.length > allowedCount;

  return {
    slicedDoc: {
      type: "doc",
      content:
        slicedContent.length > 0
          ? slicedContent
          : [{ type: "chapterBreak", attrs: { chapterNumber: 1 } }],
    },
    unlockedChapterNumbers: new Set<number>([1]),
    hitPaywallNode: false,
    truncatedByFallback,
  };
}
