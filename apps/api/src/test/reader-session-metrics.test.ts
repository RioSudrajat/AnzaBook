import { describe, expect, it } from "vitest";
import {
  ActiveReadingTimerEngine,
  DEFAULT_IDLE_TIMEOUT_MS,
} from "../../../web/src/features/reader/active-reading-timer-engine";
import {
  buildBookWordMap,
  clampSessionWpm,
  computeBookWordWeightedPercent,
  computeSessionMetrics,
  computeSessionWordDelta,
  computeStandardPageForPosition,
  extractPlainParagraphs,
  formatActiveDuration,
  shouldShowExitPrompt,
  tempoLabelId,
} from "../../../web/src/features/reader/session-metrics";

function words(count: number, prefix = "kata"): string {
  return Array.from({ length: count }, (_, i) => `${prefix}${i}`).join(" ");
}

describe("ActiveReadingTimerEngine", () => {
  it("accumulates active reading seconds while visible and active, capping at the 60s idle window", () => {
    const engine = new ActiveReadingTimerEngine({
      now: 0,
      idleTimeoutMs: DEFAULT_IDLE_TIMEOUT_MS,
      isVisible: true,
    });

    expect(engine.getActiveSeconds(20_000)).toBe(20);
    // Still within 60s idle window, user scrolls at 45s.
    engine.recordActivity(45_000);
    expect(engine.getActiveSeconds(90_000)).toBe(90);

    // User leaves tab open without interacting for 3 minutes (90s -> 270s).
    // Active window closes at 45s + 60s = 105s.
    expect(engine.getActiveSeconds(270_000)).toBe(105);

    // Returning later and scrolling does not retroactively count the idle gap.
    engine.recordActivity(300_000);
    expect(engine.getActiveSeconds(312_000)).toBe(117);
  });

  it("pauses when tab loses visibility and resumes cleanly without counting hidden time", () => {
    const engine = new ActiveReadingTimerEngine({
      now: 1_000,
      isVisible: true,
    });

    engine.setVisible(false, 16_000);
    expect(engine.getActiveSeconds(16_000)).toBe(15);
    expect(engine.getActiveSeconds(120_000)).toBe(15);

    engine.setVisible(true, 120_000);
    expect(engine.getActiveSeconds(130_000)).toBe(25);
  });

  it("pauses while a modal/dialog is open and resumes when dismissed", () => {
    const engine = new ActiveReadingTimerEngine({
      now: 0,
      isVisible: true,
    });

    engine.setPaused(true, 18_000);
    expect(engine.getActiveSeconds(90_000)).toBe(18);

    engine.setPaused(false, 90_000);
    expect(engine.getActiveSeconds(102_000)).toBe(30);
  });

  it("continues counting beyond 60s idle during active audiobook playback while visible", () => {
    const engine = new ActiveReadingTimerEngine({
      now: 0,
      isVisible: true,
      isAudioPlaying: true,
    });

    expect(engine.getActiveSeconds(150_000)).toBe(150);

    engine.setAudioPlaying(false, 150_000);
    // Without interaction, idle timeout applies from 150s -> stops at 210s.
    expect(engine.getActiveSeconds(260_000)).toBe(210);

    engine.reset(260_000);
    expect(engine.getActiveSeconds(260_000)).toBe(0);
    expect(engine.getActiveSeconds(265_000)).toBe(5);
  });
});

describe("reader session metrics & word-delta calculations", () => {
  const sampleChapters = [
    {
      chapterNumber: 1,
      contentId: [
        words(100, "a"),
        words(150, "b"),
        "<!-- pagebreak -->",
        words(250, "c"),
        words(250, "d"),
      ].join("\n\n"),
    },
    {
      chapterNumber: 2,
      contentId: [words(300, "e"), words(200, "f"), words(500, "g")].join(
        "\n\n",
      ),
    },
  ];

  it("computes exact word delta on mid-chapter resume without counting earlier paragraphs", () => {
    const map = buildBookWordMap(sampleChapters, "id");
    // Resume at chapter 1 paragraph 2 (after 100 + 150 = 250 words), read to paragraph 4 (scroll 99%)
    // Wait: paragraph 3 is last index (0..3), so paragraph 2 -> end of chapter 1 (scrollPercent 100) = 250 + 250 = 500
    const deltaMidToThree = computeSessionWordDelta(
      map,
      { chapterNumber: 1, paragraphIndex: 1, scrollPercent: 25 },
      { chapterNumber: 1, paragraphIndex: 3, scrollPercent: 75 },
    );
    // Paragraph 1 (150) + Paragraph 2 (250) = 400 words; Paragraph 0 (100) is excluded.
    expect(deltaMidToThree).toBe(400);
  });

  it("computes word delta accurately across multiple chapters and completion at 100%", () => {
    const map = buildBookWordMap(sampleChapters, "id");
    const deltaMulti = computeSessionWordDelta(
      map,
      { chapterNumber: 1, paragraphIndex: 2, scrollPercent: 50 },
      { chapterNumber: 2, paragraphIndex: 1, scrollPercent: 40 },
    );
    // Remaining in ch1: p2 (250) + p3 (250) = 500; plus ch2 p0 (300) = 800 words.
    expect(deltaMulti).toBe(800);

    const deltaToEnd = computeSessionWordDelta(
      map,
      { chapterNumber: 2, paragraphIndex: 1, scrollPercent: 30 },
      { chapterNumber: 2, paragraphIndex: 2, scrollPercent: 100 },
    );
    // ch2 p1 (200) + p2 (500) = 700 words.
    expect(deltaToEnd).toBe(700);
  });

  it("clamps backward navigation to zero and estimates proportional delta on same-paragraph scroll", () => {
    const map = buildBookWordMap(sampleChapters, "id");

    const backward = computeSessionWordDelta(
      map,
      { chapterNumber: 2, paragraphIndex: 1, scrollPercent: 50 },
      { chapterNumber: 1, paragraphIndex: 1, scrollPercent: 10 },
    );
    expect(backward).toBe(0);

    const sameParaScroll = computeSessionWordDelta(
      map,
      { chapterNumber: 1, paragraphIndex: 0, scrollPercent: 0 },
      { chapterNumber: 1, paragraphIndex: 0, scrollPercent: 50 },
    );
    expect(sameParaScroll).toBe(50);
  });

  it("computes meaningful standard page numbers (250 words/page) for scroll highlights", () => {
    const map = buildBookWordMap(sampleChapters, "id");
    expect(computeStandardPageForPosition(map, 1, 0)).toBe(1);
    // After p0 (100) + p1 (150) = 250 words -> page 2 starts
    expect(computeStandardPageForPosition(map, 1, 2)).toBe(2);
    // Ch2 p0 starts after 750 words -> page 4
    expect(computeStandardPageForPosition(map, 2, 0)).toBe(4);
    // Ch2 p2 starts after 750 + 300 + 200 = 1250 words -> page 6
    expect(computeStandardPageForPosition(map, 2, 2)).toBe(6);
  });

  it("handles DRM-02 windowed chapters cleanly for word-weighted progress and avoids inventing skipped chapter words", () => {
    // Book has 4 chapters in allChapters, only chapters 1 and 4 are loaded in window (2 and 3 skipped via TOC)
    const map = buildBookWordMap(
      [
        { chapterNumber: 1, contentId: words(500, "x") },
        { chapterNumber: 4, contentId: words(500, "y") },
      ],
      "id",
      [1, 2, 3, 4],
    );

    expect(computeBookWordWeightedPercent(map, 1, 50, true)).toBe(13);
    expect(computeBookWordWeightedPercent(map, 4, 0, true)).toBe(75);
    expect(computeBookWordWeightedPercent(map, 4, 100, true)).toBe(100);
    // Preview mode preserves chapter-local percentage
    expect(computeBookWordWeightedPercent(map, 1, 42, false)).toBe(42);

    // Jumping ch1 -> ch4 directly must not claim unloaded ch2/ch3 (estimated) as read words
    const jumpedWords = computeSessionWordDelta(
      map,
      { chapterNumber: 1, paragraphIndex: 0, scrollPercent: 0 },
      { chapterNumber: 4, paragraphIndex: 0, scrollPercent: 0 },
    );
    expect(jumpedWords).toBe(500);
  });

  it("computes full session metrics, safe WPM clamping, and 15s / progress exit prompt threshold", () => {
    const map = buildBookWordMap(sampleChapters, "id");
    const metrics = computeSessionMetrics({
      map,
      start: { chapterNumber: 1, paragraphIndex: 1, scrollPercent: 20 },
      end: { chapterNumber: 2, paragraphIndex: 0, scrollPercent: 10 },
      activeSeconds: 180,
      hasFullAccess: true,
    });

    // p1 (150) + p2 (250) + p3 (250) = 650 words -> 3 standard pages, ~217 WPM
    expect(metrics.wordsRead).toBe(650);
    expect(metrics.pagesRead).toBe(3);
    expect(metrics.rawWpm).toBe(217);
    expect(metrics.apiAvgWpm).toBe(217);
    expect(metrics.tempo).toBe("steady");
    expect(metrics.hasForwardProgress).toBe(true);
    expect(metrics.startChapterNumber).toBe(1);
    expect(metrics.endChapterNumber).toBe(2);
    expect(metrics.endProgressPercent).toBeGreaterThan(
      metrics.startProgressPercent,
    );

    expect(clampSessionWpm(null)).toBe(200);
    expect(clampSessionWpm(10)).toBe(30);
    expect(clampSessionWpm(2400)).toBe(1200);
    expect(clampSessionWpm(185)).toBe(185);

    expect(
      shouldShowExitPrompt({ activeSeconds: 14, hasForwardProgress: false }),
    ).toBe(false);
    expect(
      shouldShowExitPrompt({ activeSeconds: 15, hasForwardProgress: false }),
    ).toBe(true);
    expect(
      shouldShowExitPrompt({ activeSeconds: 2, hasForwardProgress: true }),
    ).toBe(true);

    const noProgressAtBookEnd = computeSessionMetrics({
      map,
      start: { chapterNumber: 2, paragraphIndex: 0, scrollPercent: 100 },
      end: { chapterNumber: 2, paragraphIndex: 2, scrollPercent: 100 },
      activeSeconds: 3,
      hasFullAccess: true,
    });
    expect(noProgressAtBookEnd.wordsRead).toBe(0);
    expect(noProgressAtBookEnd.hasForwardProgress).toBe(false);
    expect(
      shouldShowExitPrompt({
        activeSeconds: noProgressAtBookEnd.activeSeconds,
        hasForwardProgress: noProgressAtBookEnd.hasForwardProgress,
      }),
    ).toBe(false);
  });

  it("extracts plain paragraphs from Tiptap JSON and HTML and formats labels cleanly", () => {
    const tiptapJson = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "chapterBreak",
          attrs: { chapterNumber: 1, title: "Bab 1" },
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Paragraf pertama dari editor." }],
        },
        {
          type: "blockquote",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Kutipan penting." }],
            },
          ],
        },
      ],
    });
    expect(extractPlainParagraphs(tiptapJson)).toEqual([
      "Paragraf pertama dari editor.",
      "Kutipan penting.",
    ]);

    const html =
      '<div data-type="chapter-break">Bab 1</div><p>Satu dua</p><p>Tiga <strong>empat</strong>.</p>';
    expect(extractPlainParagraphs(html)).toEqual(["Satu dua", "Tiga empat."]);

    expect(formatActiveDuration(42)).toBe("42 dtk");
    expect(formatActiveDuration(125)).toBe("2 mnt 5 dtk");
    expect(formatActiveDuration(900)).toBe("15 mnt");
    expect(formatActiveDuration(3720)).toBe("1 jam 2 mnt");
    expect(tempoLabelId("reflective").label).toBe("Mendalam");
    expect(tempoLabelId("steady").label).toBe("Mengalir");
    expect(tempoLabelId("brisk").label).toBe("Lugas");
  });
});
