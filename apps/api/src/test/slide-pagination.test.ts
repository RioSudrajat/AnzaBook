import { describe, expect, it } from "vitest";
import {
  computeStableBookSlideMeta,
  extractCleanSlideParagraphs,
  type SlideSpread,
} from "../../../web/src/features/reader/slide-pagination-helpers";

function makeSpread(
  chapterNumber: number,
  chapterPage: number,
  chapterPages: number,
): SlideSpread {
  return {
    chapter: {
      id: `ch-${chapterNumber}`,
      chapterNumber,
      title: `Bab ${chapterNumber}`,
      contentId: "Teks",
      contentEn: null,
      blueprintContent: "",
      audioUrl: null,
      audioDurationSeconds: null,
    },
    position: { chapter: chapterNumber, paragraph: chapterPage - 1, offset: 0 },
    leaves: [],
    chapterPage,
    chapterPages,
  };
}

describe("Slide Pagination Paragraphs & Stable Book Counter", () => {
  it("preserves multiple paragraphs when plain text contains <!-- pagebreak --> markers", () => {
    const plainWithPagebreak = [
      "Paragraf pertama tentang sidang Landraad Bandung.",
      "Paragraf kedua menjelaskan dakwaan kolonial.",
      "<!-- pagebreak -->",
      "Paragraf ketiga tentang pembelaan Soekarno.",
      "Paragraf keempat menutup bab pertama.",
    ].join("\n\n");

    const paragraphs = extractCleanSlideParagraphs(plainWithPagebreak);
    expect(paragraphs).toEqual([
      "Paragraf pertama tentang sidang Landraad Bandung.",
      "Paragraf kedua menjelaskan dakwaan kolonial.",
      "Paragraf ketiga tentang pembelaan Soekarno.",
      "Paragraf keempat menutup bab pertama.",
    ]);
  });

  it("still parses real HTML blocks cleanly while stripping page-break nodes", () => {
    const htmlContent =
      '<p>Paragraf satu.</p><div data-type="page-break"></div><p>Paragraf dua.</p>';
    const paragraphs = extractCleanSlideParagraphs(htmlContent);
    expect(paragraphs).toEqual(["Paragraf satu.", "Paragraf dua."]);
  });

  it("computes a stable book-wide page total when DRM window loads 2 chapters at a time", () => {
    const allChapters = [1, 2, 3, 4, 5, 6, 7, 8, 9];

    // Window 1: chapters 1 & 2 loaded (2 spreads each -> 4 measured spreads)
    const twoChapterSpreads = [
      makeSpread(1, 1, 2),
      makeSpread(1, 2, 2),
      makeSpread(2, 1, 2),
      makeSpread(2, 2, 2),
    ];
    const metaAt2 = computeStableBookSlideMeta({
      spreads: twoChapterSpreads,
      index: 0,
      allChapterNumbers: allChapters,
      hasFullAccess: true,
    });
    expect(metaAt2).toEqual({ displayPage: 1, displayTotal: 18 });

    // Window 2: chapter 3 prefetched (still 2 spreads per chapter -> total stays 18, no jump from 4 to 6!)
    const threeChapterSpreads = [
      ...twoChapterSpreads,
      makeSpread(3, 1, 2),
      makeSpread(3, 2, 2),
    ];
    const metaAt3 = computeStableBookSlideMeta({
      spreads: threeChapterSpreads,
      index: 1,
      allChapterNumbers: allChapters,
      hasFullAccess: true,
    });
    expect(metaAt3).toEqual({ displayPage: 2, displayTotal: 18 });

    // Preview mode (!hasFullAccess) shows exact loaded spreads only
    const previewMeta = computeStableBookSlideMeta({
      spreads: twoChapterSpreads.slice(0, 2),
      index: 0,
      allChapterNumbers: allChapters,
      hasFullAccess: false,
    });
    expect(previewMeta).toEqual({ displayPage: 1, displayTotal: 2 });
  });
});
