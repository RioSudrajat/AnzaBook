import { describe, expect, it } from "vitest";
import {
  splitChapterIntoPages,
  getChapterPageInfo,
  computeBookPagination,
  getGlobalPageNumber,
  getChapterAndPageFromGlobal,
} from "@starter/shared/chapter-pagination";

describe("Chapter Pagination Utility", () => {
  it("splits text using explicit <!-- pagebreak --> markers", () => {
    const text = `Paragraf 1 di halaman 1.\n\nParagraf 2 di halaman 1.\n\n<!-- pagebreak -->\n\nParagraf 3 di halaman 2.\n\n<!-- pagebreak -->\n\nParagraf 4 di halaman 3.`;
    const pages = splitChapterIntoPages(text, 3);

    expect(pages).toHaveLength(3);
    expect(pages[0].pageIndex).toBe(0);
    expect(pages[0].paragraphs).toHaveLength(2);
    expect(pages[0].paragraphs[0]).toBe("Paragraf 1 di halaman 1.");
    expect(pages[1].pageIndex).toBe(1);
    expect(pages[1].paragraphs).toHaveLength(1);
    expect(pages[1].paragraphs[0]).toBe("Paragraf 3 di halaman 2.");
    expect(pages[2].pageIndex).toBe(2);
    expect(pages[2].paragraphs).toHaveLength(1);
    expect(pages[2].paragraphs[0]).toBe("Paragraf 4 di halaman 3.");
  });

  it("splits text using ---pagebreak--- variant marker", () => {
    const text = `Paragraf A.\n\n---pagebreak---\n\nParagraf B.`;
    const pages = splitChapterIntoPages(text, 3);

    expect(pages).toHaveLength(2);
    expect(pages[0].paragraphs[0]).toBe("Paragraf A.");
    expect(pages[1].paragraphs[0]).toBe("Paragraf B.");
  });

  it("falls back to chunking by paragraphsPerPage when no markers exist", () => {
    const text = `P1\n\nP2\n\nP3\n\nP4\n\nP5\n\nP6\n\nP7`;
    const pages = splitChapterIntoPages(text, 3);

    expect(pages).toHaveLength(3); // [3, 3, 1]
    expect(pages[0].paragraphs).toEqual(["P1", "P2", "P3"]);
    expect(pages[1].paragraphs).toEqual(["P4", "P5", "P6"]);
    expect(pages[2].paragraphs).toEqual(["P7"]);
  });

  it("handles empty or whitespace text gracefully", () => {
    const pages = splitChapterIntoPages("", 3);
    expect(pages).toHaveLength(1);
    expect(pages[0].paragraphs).toHaveLength(0);
    expect(pages[0].text).toBe("");
  });

  it("calculates chapter page info correctly", () => {
    const info = getChapterPageInfo(0, 4);
    expect(info.currentPage).toBe(1);
    expect(info.totalPages).toBe(4);

    const infoMid = getChapterPageInfo(2, 4);
    expect(infoMid.currentPage).toBe(3);
    expect(infoMid.totalPages).toBe(4);
  });

  describe("Cumulative Book Pagination", () => {
    const sampleChapters = [
      {
        chapterNumber: 1,
        contentId: "Hal 1<!-- pagebreak -->Hal 2<!-- pagebreak -->Hal 3",
      },
      {
        chapterNumber: 2,
        contentId: "Hal A<!-- pagebreak -->Hal B",
      },
      {
        chapterNumber: 3,
        contentId: "Satu halaman saja",
      },
    ];

    it("computes cumulative page count and chapter offsets across all chapters", () => {
      const pagination = computeBookPagination(sampleChapters, "id");
      expect(pagination.totalPages).toBe(6); // 3 + 2 + 1
      expect(pagination.chapters).toHaveLength(3);

      expect(pagination.chapters[0]).toEqual({
        chapterNumber: 1,
        pageCount: 3,
        startGlobalPage: 1,
        endGlobalPage: 3,
      });

      expect(pagination.chapters[1]).toEqual({
        chapterNumber: 2,
        pageCount: 2,
        startGlobalPage: 4,
        endGlobalPage: 5,
      });

      expect(pagination.chapters[2]).toEqual({
        chapterNumber: 3,
        pageCount: 1,
        startGlobalPage: 6,
        endGlobalPage: 6,
      });
    });

    it("maps local chapter page index to global page number", () => {
      const pagination = computeBookPagination(sampleChapters, "id");
      // Chapter 1, pageIndex 0 -> global 1
      expect(getGlobalPageNumber(1, 0, pagination)).toBe(1);
      // Chapter 1, pageIndex 2 -> global 3
      expect(getGlobalPageNumber(1, 2, pagination)).toBe(3);
      // Chapter 2, pageIndex 0 -> global 4
      expect(getGlobalPageNumber(2, 0, pagination)).toBe(4);
      // Chapter 2, pageIndex 1 -> global 5
      expect(getGlobalPageNumber(2, 1, pagination)).toBe(5);
      // Chapter 3, pageIndex 0 -> global 6
      expect(getGlobalPageNumber(3, 0, pagination)).toBe(6);
    });

    it("maps global page number back to chapter number and local page index", () => {
      const pagination = computeBookPagination(sampleChapters, "id");
      expect(getChapterAndPageFromGlobal(1, pagination)).toEqual({
        chapterNumber: 1,
        localPageIndex: 0,
      });
      expect(getChapterAndPageFromGlobal(3, pagination)).toEqual({
        chapterNumber: 1,
        localPageIndex: 2,
      });
      expect(getChapterAndPageFromGlobal(4, pagination)).toEqual({
        chapterNumber: 2,
        localPageIndex: 0,
      });
      expect(getChapterAndPageFromGlobal(5, pagination)).toEqual({
        chapterNumber: 2,
        localPageIndex: 1,
      });
      expect(getChapterAndPageFromGlobal(6, pagination)).toEqual({
        chapterNumber: 3,
        localPageIndex: 0,
      });
      // Out of bounds clamping
      expect(getChapterAndPageFromGlobal(0, pagination)).toEqual({
        chapterNumber: 1,
        localPageIndex: 0,
      });
      expect(getChapterAndPageFromGlobal(99, pagination)).toEqual({
        chapterNumber: 3,
        localPageIndex: 0,
      });
    });
  });
});
