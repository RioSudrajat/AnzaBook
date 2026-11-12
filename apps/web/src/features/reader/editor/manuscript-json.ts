import type { JSONContent } from "@tiptap/core";

export interface ExtractedChapter {
  chapterNumber: number;
  title: string;
  doc: JSONContent;
  plainTextParagraphs: string[];
}

/**
 * Extracts plain text recursively from a Tiptap node
 */
export function extractTextFromNode(node: JSONContent): string {
  if (node.type === "chapterBreak" || node.type === "pageBreak") {
    return "";
  }
  if (node.type === "text" && node.text) {
    return node.text;
  }
  if (node.content && Array.isArray(node.content)) {
    return node.content
      .map(extractTextFromNode)
      .join("")
      .trim();
  }
  return "";
}

/**
 * Normalizes a Tiptap document so that:
 * 1. It is a valid doc object
 * 2. It always starts with Chapter 1 break at content[0]
 * 3. All chapter breaks have valid chapter numbers and titles
 */
export function normalizeManuscriptJson(
  rawJson: JSONContent | null | undefined,
  defaultTitle = "Bab 1: Permulaan",
): JSONContent {
  if (!rawJson || typeof rawJson !== "object") {
    return {
      type: "doc",
      content: [
        {
          type: "chapterBreak",
          attrs: { chapterNumber: 1, title: defaultTitle },
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Mulai menulis naskah Anda di sini..." }],
        },
      ],
    };
  }

  const content: JSONContent[] = Array.isArray(rawJson.content)
    ? [...rawJson.content]
    : [];

  if (content.length === 0) {
    return {
      type: "doc",
      content: [
        {
          type: "chapterBreak",
          attrs: { chapterNumber: 1, title: defaultTitle },
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Mulai menulis naskah Anda di sini..." }],
        },
      ],
    };
  }

  // Check if first element is chapterBreak for Chapter 1
  const firstNode = content[0];
  if (firstNode.type !== "chapterBreak" || Number(firstNode.attrs?.chapterNumber) !== 1) {
    content.unshift({
      type: "chapterBreak",
      attrs: { chapterNumber: 1, title: defaultTitle },
    });
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
        title: "Bab 1",
        doc: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Mulai menulis naskah Anda di sini..." }],
            },
          ],
        },
        plainTextParagraphs: ["Mulai menulis naskah Anda di sini..."],
      },
    ];
  }

  const chapters: ExtractedChapter[] = [];
  let currentNum = 1;
  let currentTitle = "Bab 1";
  let currentNodes: JSONContent[] = [];

  const flushChapter = () => {
    const paragraphs: string[] = [];

    for (const node of currentNodes) {
      if (node.type === "chapterBreak" || node.type === "pageBreak") continue;
      const text = extractTextFromNode(node);
      if (text) {
        paragraphs.push(text);
      }
    }

    const safeNodes =
      currentNodes.length > 0
        ? currentNodes
        : [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Mulai menulis naskah bab ini..." }],
            },
          ];

    chapters.push({
      chapterNumber: currentNum,
      title: currentTitle,
      doc: {
        type: "doc",
        content: safeNodes,
      },
      plainTextParagraphs:
        paragraphs.length > 0 ? paragraphs : ["Mulai menulis naskah bab ini..."],
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
      currentTitle = String(node.attrs?.title || `Bab ${currentNum}`);
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
        title: "Bab 1: Permulaan",
        doc: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Mulai menulis naskah Bab 1 di sini..." }],
            },
          ],
        },
        plainTextParagraphs: ["Mulai menulis naskah Bab 1 di sini..."],
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
  defaultBookTitle?: string,
): JSONContent {
  if (!chapters || chapters.length === 0) {
    return normalizeManuscriptJson(null, defaultBookTitle || "Bab 1: Permulaan");
  }

  const unifiedContent: JSONContent[] = [];

  // Sort chapters by chapterNumber
  const sorted = [...chapters].sort((a, b) => a.chapterNumber - b.chapterNumber);

  for (let idx = 0; idx < sorted.length; idx++) {
    const chap = sorted[idx];
    const chapNum = chap.chapterNumber || idx + 1;
    const chapTitle = chap.titleId || chap.title || `Bab ${chapNum}`;

    // Add chapter break header node
    unifiedContent.push({
      type: "chapterBreak",
      attrs: {
        chapterNumber: chapNum,
        title: chapTitle,
      },
    });

    // Check if blueprintContent is a Tiptap JSON
    let parsedDoc: JSONContent | null = null;
    const rawBlueprint = chap.blueprintContent?.trim();
    if (rawBlueprint && rawBlueprint.startsWith("{") && rawBlueprint.includes('"type"')) {
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
      const subNodes = parsedDoc.content.filter((n) => n.type !== "chapterBreak");
      unifiedContent.push(...subNodes);
    } else {
      // Legacy HTML or plain text fallback: convert lines to paragraph nodes
      const rawText = chap.contentId || "Mulai menulis naskah Anda di sini...";
      // Strip any raw HTML tags
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
        unifiedContent.push({
          type: "paragraph",
          content: [{ type: "text", text: "Mulai menulis naskah Anda di sini..." }],
        });
      }
    }
  }

  return normalizeManuscriptJson(
    { type: "doc", content: unifiedContent },
    defaultBookTitle || "Bab 1: Permulaan",
  );
}
