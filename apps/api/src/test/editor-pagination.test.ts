import { describe, expect, it } from "vitest";
import {
  EDITOR_MAX_PAGE_CHARS,
  EDITOR_MAX_PAGE_HEIGHT_PX,
  EDITOR_MAX_PAGE_WORDS,
  computePageMetricsInSlice,
  shouldAutoInsertPageBreakOnEnter,
} from "../../../web/src/features/reader/editor/page-limit";
import {
  buildUnifiedDocFromChapters,
  extractChaptersFromJson,
  normalizeManuscriptJson,
} from "../../../web/src/features/reader/editor/manuscript-json";

describe("Editor Auto-Pagination & Live Chapter Breaks", () => {
  it("tracks current page words, chars, and page index inside a chapter cleanly", () => {
    const nodes = [
      { type: "chapterBreak", textContent: "Bab 1: Permulaan" },
      { type: "paragraph", textContent: "Satu dua tiga empat lima." },
      { type: "pageBreak", textContent: "" },
      { type: "paragraph", textContent: "Halaman kedua bab satu dimulai." },
      {
        type: "paragraph",
        textContent: "Lanjutan paragraf kedua halaman dua.",
      },
    ];

    const page1 = computePageMetricsInSlice(nodes, 1);
    expect(page1).toEqual({
      pageNumber: 1,
      wordsInPage: 5,
      charsInPage: 25,
    });

    const page2 = computePageMetricsInSlice(nodes, 4);
    expect(page2).toEqual({
      pageNumber: 2,
      wordsInPage: 10,
      charsInPage: 67,
    });
  });

  it("resets page numbering to 1 whenever a new chapterBreak starts", () => {
    const nodes = [
      { type: "chapterBreak", textContent: "Bab 1" },
      { type: "paragraph", textContent: "Teks bab satu" },
      { type: "pageBreak", textContent: "" },
      { type: "paragraph", textContent: "Halaman dua bab satu" },
      { type: "chapterBreak", textContent: "Bab 2" },
      { type: "paragraph", textContent: "Halaman satu bab dua" },
    ];

    expect(computePageMetricsInSlice(nodes, 5).pageNumber).toBe(1);
  });

  it("auto-inserts a page break on Enter only at end of non-empty body block once 1-page capacity is reached", () => {
    expect(
      shouldAutoInsertPageBreakOnEnter({
        wordsInPage: EDITOR_MAX_PAGE_WORDS - 10,
        charsInPage: EDITOR_MAX_PAGE_CHARS - 50,
        renderedPageHeightPx: EDITOR_MAX_PAGE_HEIGHT_PX - 40,
        cursorAtEndOfBlock: true,
        currentBlockHasText: true,
        parentTypeName: "paragraph",
      }),
    ).toBe(false);

    expect(
      shouldAutoInsertPageBreakOnEnter({
        wordsInPage: EDITOR_MAX_PAGE_WORDS,
        charsInPage: 1200,
        renderedPageHeightPx: 400,
        cursorAtEndOfBlock: true,
        currentBlockHasText: true,
        parentTypeName: "paragraph",
      }),
    ).toBe(true);

    expect(
      shouldAutoInsertPageBreakOnEnter({
        wordsInPage: 80,
        charsInPage: 500,
        renderedPageHeightPx: EDITOR_MAX_PAGE_HEIGHT_PX,
        cursorAtEndOfBlock: true,
        currentBlockHasText: true,
        parentTypeName: "paragraph",
      }),
    ).toBe(true);

    // Mid-paragraph split or empty line or inside chapter title should never auto-break
    expect(
      shouldAutoInsertPageBreakOnEnter({
        wordsInPage: EDITOR_MAX_PAGE_WORDS + 20,
        charsInPage: 2000,
        renderedPageHeightPx: 900,
        cursorAtEndOfBlock: false,
        currentBlockHasText: true,
        parentTypeName: "paragraph",
      }),
    ).toBe(false);

    expect(
      shouldAutoInsertPageBreakOnEnter({
        wordsInPage: EDITOR_MAX_PAGE_WORDS + 20,
        charsInPage: 2000,
        renderedPageHeightPx: 900,
        cursorAtEndOfBlock: true,
        currentBlockHasText: false,
        parentTypeName: "paragraph",
      }),
    ).toBe(false);

    expect(
      shouldAutoInsertPageBreakOnEnter({
        wordsInPage: EDITOR_MAX_PAGE_WORDS + 20,
        charsInPage: 2000,
        renderedPageHeightPx: 900,
        cursorAtEndOfBlock: true,
        currentBlockHasText: true,
        parentTypeName: "chapterBreak",
      }),
    ).toBe(false);
  });

  it("extracts live inline chapterBreak titles while staying backward compatible with legacy attrs.title and pageBreak nodes", () => {
    const unified = buildUnifiedDocFromChapters([
      {
        chapterNumber: 1,
        titleId: "Bab Pertama Live",
        contentId: "Paragraf pembuka.",
      },
      {
        chapterNumber: 2,
        titleId: "Bab Kedua Live",
        contentId: "Paragraf bab dua.",
      },
    ]);

    const firstNode = unified.content?.[0];
    expect(firstNode?.type).toBe("chapterBreak");
    expect(firstNode?.content?.[0]?.text).toBe("Bab Pertama Live");

    // Simulate editing the live inline text of Chapter 1 & adding a pageBreak inside Chapter 2
    const editedDoc = {
      type: "doc",
      content: [
        {
          type: "chapterBreak",
          attrs: { chapterNumber: 1 },
          content: [{ type: "text", text: "Judul Baru Diedit Live" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Isi bab satu." }],
        },
        {
          type: "chapterBreak",
          attrs: { chapterNumber: 2, title: "Legacy Title" },
          content: [{ type: "text", text: "Judul Bab Dua Live" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Halaman pertama bab dua." }],
        },
        { type: "pageBreak" },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Halaman kedua bab dua." }],
        },
      ],
    };

    const chapters = extractChaptersFromJson(editedDoc);
    expect(chapters).toHaveLength(2);
    expect(chapters[0].title).toBe("Judul Baru Diedit Live");
    expect(chapters[1].title).toBe("Judul Bab Dua Live");
    expect(chapters[1].doc.content?.some((n) => n.type === "pageBreak")).toBe(
      true,
    );

    const legacyMigrated = normalizeManuscriptJson({
      type: "doc",
      content: [
        {
          type: "chapterBreak",
          attrs: { chapterNumber: 1, title: "Judul Lama Atom" },
        },
        { type: "paragraph", content: [{ type: "text", text: "Isi lama." }] },
      ],
    });
    expect(legacyMigrated.content?.[0]?.content?.[0]?.text).toBe(
      "Judul Lama Atom",
    );
  });
});
