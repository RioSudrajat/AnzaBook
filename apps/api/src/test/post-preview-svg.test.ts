import { describe, expect, it } from "vitest";
import type { ExplorePostItemDto } from "@starter/shared/types";
import { ANZA_ARCH_LOGO_PATHS } from "../../../web/src/lib/brand-mark";
import { buildPostPreviewSvg } from "../../../web/src/features/share/post-preview-svg";

const baseAuthor = {
  id: "user-1",
  name: "Nadia <Pustakawan> & Co",
  username: "nadia_reads",
  image: null,
};

const baseBook = {
  id: "book-1",
  slug: "madilog-tan-malaka",
  title: 'Madilog & "Logika" <Baru>',
  author: "Tan Malaka",
  coverColor: "#283618",
  coverUrl: null,
};

describe("Dynamic OG Post Preview SVG Builder (Issue #14)", () => {
  it("escapes XML characters safely, includes Open-Page Arch mark, and enforces includeNote privacy", () => {
    const quotePost: ExplorePostItemDto = {
      id: "quote-1",
      type: "quote",
      content: 'Berpikir <merdeka> & "jernih" menyelamatkan zaman.',
      note: "CatatanRahasiaTidakBolehBocor",
      postCaption: "Kutipan favorit malam ini",
      chapterNumber: 2,
      pageNumber: 35,
      createdAt: "2026-11-23T10:00:00.000Z",
      author: baseAuthor,
      book: baseBook,
      postConfig: {
        template: "night_stabilo",
        aspect: "story",
        alignment: "left",
        includeNote: false,
      },
    };

    const svgHidden = buildPostPreviewSvg(quotePost);
    expect(svgHidden).toContain('width="1200" height="630"');
    expect(svgHidden).toContain(ANZA_ARCH_LOGO_PATHS.leftSweep);
    expect(svgHidden).toContain('fill="#161411"');
    expect(svgHidden).not.toContain("<merdeka>");
    expect(svgHidden).toContain("&#60;merdeka&#62;");
    expect(svgHidden).not.toContain("CatatanRahasiaTidakBolehBocor");

    const svgRevealed = buildPostPreviewSvg({
      ...quotePost,
      postConfig: {
        template: "furrow_paper",
        aspect: "square",
        alignment: "center",
        includeNote: true,
      },
    });
    expect(svgRevealed).toContain('fill="#F6F2E9"');
    expect(svgRevealed).toContain("CatatanRahasiaTidakBolehBocor");
  });

  it("renders session Reading Trail while omitting hidden WPM/duration metrics and safely falling back photo_overlay", () => {
    const sessionPost: ExplorePostItemDto = {
      id: "session-1",
      type: "session",
      title: "Sesi Malam Tenang",
      content: "Menyelesaikan sesi membaca.",
      note: "Bab 2 sangat jernih.",
      pagesRead: 11,
      wordsRead: 2750,
      durationSeconds: 900,
      avgWpm: 205,
      startProgressPercent: 20,
      endProgressPercent: 45,
      startChapterNumber: 1,
      endChapterNumber: 2,
      highlightsCount: 3,
      createdAt: "2026-11-23T10:00:00.000Z",
      author: baseAuthor,
      book: baseBook,
      postConfig: {
        template: "photo_overlay",
        aspect: "story",
        showWpm: false,
        showDuration: false,
        showPages: true,
      },
    };

    const svg = buildPostPreviewSvg(sessionPost);
    expect(svg).toContain('width="1200" height="630"');
    expect(svg).toContain(ANZA_ARCH_LOGO_PATHS.leftSweep);
    expect(svg).toContain("Sesi Malam Tenang");
    expect(svg).toContain("11 hlm");
    expect(svg).toContain("20%");
    expect(svg).toContain("45%");
    expect(svg).toContain("Bab 1 ke Bab 2");
    expect(svg).not.toContain("→");
    expect(svg).not.toContain("205 wpm");
    expect(svg).not.toContain("205 WPM");
    expect(svg).not.toContain("15 mnt");
    expect(svg).not.toContain("<image");

    const svgWithWpm = buildPostPreviewSvg({
      ...sessionPost,
      postConfig: {
        template: "cover_trail",
        aspect: "4:3",
        showWpm: true,
        showDuration: true,
        showPages: true,
      },
    });
    expect(svgWithWpm).toContain(">205 wpm</text>");
    expect(svgWithWpm).toContain(">Mengalir</text>");
  });
});
