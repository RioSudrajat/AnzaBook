import { describe, expect, it } from "vitest";
import {
  MAX_PUBLIC_QUOTE_CHARS,
  buildQuoteShareCaption,
  buildSessionShareCaption,
  buildSharePostUrl,
  buildWhatsAppShareUrl,
  computeSevenDayConsistency,
  deriveAdaptiveCoverPalette,
  extractSurroundingContext,
  formatShareDuration,
  getQuoteExcerptValidation,
  resolveSafeInAppSessionTemplate,
  shareTempoLabel,
  suggestSessionTitle,
} from "../../../web/src/features/share/card-helpers";

describe("Share Card Helpers (Issue #13)", () => {
  it("validates public quote length against DRM-05 400-char limit", () => {
    expect(MAX_PUBLIC_QUOTE_CHARS).toBe(400);

    const ok = getQuoteExcerptValidation("  Kalimat pendek yang jelas.  ");
    expect(ok).toEqual({
      length: 26,
      maxLength: 400,
      isTooLong: false,
      remainingChars: 374,
    });

    const exact = getQuoteExcerptValidation("a".repeat(400));
    expect(exact.isTooLong).toBe(false);
    expect(exact.remainingChars).toBe(0);

    const tooLong = getQuoteExcerptValidation("a".repeat(415));
    expect(tooLong.isTooLong).toBe(true);
    expect(tooLong.remainingChars).toBe(-15);
  });

  it("maps photo_overlay safely to cover_trail for in-app feed posts", () => {
    expect(resolveSafeInAppSessionTemplate("photo_overlay")).toBe(
      "cover_trail",
    );
    expect(resolveSafeInAppSessionTemplate("cover_trail")).toBe("cover_trail");
    expect(resolveSafeInAppSessionTemplate("transparent_sticker")).toBe(
      "transparent_sticker",
    );
    expect(resolveSafeInAppSessionTemplate("literary_index")).toBe(
      "literary_index",
    );
  });

  it("suggests time-appropriate Indonesian session titles within 140 chars", () => {
    expect(
      suggestSessionTitle("Bumi Manusia", new Date(2026, 10, 23, 7, 30)),
    ).toBe("Baca Pagi · Bumi Manusia");
    expect(
      suggestSessionTitle("Filosofi Teras", new Date(2026, 10, 23, 12, 15)),
    ).toBe("Baca Siang · Filosofi Teras");
    expect(
      suggestSessionTitle("Laut Bercerita", new Date(2026, 10, 23, 16, 45)),
    ).toBe("Baca Sore · Laut Bercerita");
    expect(
      suggestSessionTitle("Cantik Itu Luka", new Date(2026, 10, 23, 21, 10)),
    ).toBe("Baca Malam · Cantik Itu Luka");

    const veryLong = suggestSessionTitle(
      "X".repeat(200),
      new Date(2026, 10, 23, 20, 0),
    );
    expect(veryLong.length).toBeLessThanOrEqual(140);
  });

  it("computes real 7-day consistency dots ending at referenceDate", () => {
    const ref = new Date(2026, 10, 23, 19, 0, 0);
    const sessions = [
      { createdAt: new Date(2026, 10, 23, 9, 0, 0).toISOString() },
      { startedAt: new Date(2026, 10, 21, 14, 0, 0).toISOString() },
      { startedAt: new Date(2026, 10, 17, 8, 0, 0).toISOString() },
      { createdAt: new Date(2026, 10, 10, 8, 0, 0).toISOString() }, // outside window
      { createdAt: "invalid-date" },
    ];

    const dots = computeSevenDayConsistency(sessions, ref);
    expect(dots).toHaveLength(7);
    expect(dots[0]?.dateKey).toBe("2026-11-17");
    expect(dots[0]?.active).toBe(true);
    expect(dots[4]?.dateKey).toBe("2026-11-21");
    expect(dots[4]?.active).toBe(true);
    expect(dots[5]?.active).toBe(false);
    expect(dots[6]?.dateKey).toBe("2026-11-23");
    expect(dots[6]?.active).toBe(true);
  });

  it("formats reading durations accurately in Indonesian", () => {
    expect(formatShareDuration(0)).toBe("0 dtk");
    expect(formatShareDuration(42)).toBe("42 dtk");
    expect(formatShareDuration(900)).toBe("15 mnt");
    expect(formatShareDuration(3600)).toBe("1 jam");
    expect(formatShareDuration(5100)).toBe("1 jam 25 mnt");
  });

  it("derives WCAG-safe cover tint foregrounds for dark, light, and orange hues", () => {
    const darkCover = deriveAdaptiveCoverPalette("#1A2634");
    expect(darkCover.isDarkBackground).toBe(true);
    expect(darkCover.foreground).toBe("#F6F2E9");

    const lightCover = deriveAdaptiveCoverPalette("#F6F2E9");
    expect(lightCover.isDarkBackground).toBe(false);
    expect(lightCover.foreground).toBe("#13110F");

    const orangeCover = deriveAdaptiveCoverPalette("#F06A24");
    expect(orangeCover.isDarkBackground).toBe(false);
    expect(orangeCover.foreground).toBe("#13110F");

    const invalidFallback = deriveAdaptiveCoverPalette("not-a-color");
    expect(invalidFallback.background).toBe("#243B4A");
    expect(invalidFallback.isDarkBackground).toBe(true);
  });

  it("builds public share URLs and WhatsApp links without private identifiers", () => {
    expect(
      buildSharePostUrl({
        origin: "https://anzabook.id/",
        postType: "quote",
        postId: "hl-123",
        isPosted: true,
        bookSlug: "bumi-manusia",
      }),
    ).toBe("https://anzabook.id/post/quote/hl-123");

    expect(
      buildSharePostUrl({
        origin: "https://anzabook.id",
        postType: "session",
        postId: "sess-99",
        isPosted: false,
        bookSlug: "bumi-manusia",
      }),
    ).toBe("https://anzabook.id/books/bumi-manusia");

    expect(
      buildSharePostUrl({
        origin: "https://anzabook.id",
        postType: "quote",
        isPosted: false,
        bookSlug: null,
      }),
    ).toBe("https://anzabook.id/app?tab=explore");

    const wa = buildWhatsAppShareUrl("Halo AnzaBook");
    expect(wa).toBe("https://api.whatsapp.com/send?text=Halo%20AnzaBook");
  });

  it("builds concise captions and maps ReadingTempo labels", () => {
    expect(shareTempoLabel(140)).toBe("Mendalam");
    expect(shareTempoLabel(230)).toBe("Mengalir");
    expect(shareTempoLabel(320)).toBe("Lugas");
    expect(shareTempoLabel(0)).toBe("");

    const quoteCap = buildQuoteShareCaption({
      quote: "Tahu lebih baik daripada menebak.",
      bookTitle: "Bumi Manusia",
      bookAuthor: "Pramoedya Ananta Toer",
      postCaption: "Bagian favorit di bab awal.",
      shareUrl: "https://anzabook.id/post/quote/1",
    });
    expect(quoteCap).toContain("Bagian favorit di bab awal.");
    expect(quoteCap).toContain("Bumi Manusia");
    expect(quoteCap).toContain("https://anzabook.id/post/quote/1");

    const sessionCap = buildSessionShareCaption({
      title: "Baca Malam · Bumi Manusia",
      bookTitle: "Bumi Manusia",
      durationSec: 1800,
      pagesRead: 14,
      tempoLabel: "Mengalir",
      shareUrl: "https://anzabook.id/post/session/2",
    });
    expect(sessionCap).toContain("Baca Malam · Bumi Manusia");
    expect(sessionCap).toContain("30 mnt");
    expect(sessionCap).toContain("14 hlm");
    expect(sessionCap).toContain("Mengalir");

    const hiddenDurationCap = buildSessionShareCaption({
      title: "Baca Malam · Bumi Manusia",
      bookTitle: "Bumi Manusia",
      durationSec: null,
      pagesRead: 14,
      tempoLabel: null,
      shareUrl: "https://anzabook.id/post/session/2",
    });
    expect(hiddenDurationCap).not.toContain("0 dtk");
    expect(hiddenDurationCap).toContain("Bumi Manusia · 14 hlm");

    const hiddenAllCap = buildSessionShareCaption({
      title: "Baca Malam · Bumi Manusia",
      bookTitle: "Bumi Manusia",
      durationSec: 0,
      pagesRead: 0,
      tempoLabel: "",
      shareUrl: "https://anzabook.id/post/session/2",
    });
    expect(hiddenAllCap).not.toContain("0 dtk");
    expect(hiddenAllCap).not.toContain("Bumi Manusia ·");
    expect(hiddenAllCap).toContain("\n\nBumi Manusia\n\n");
  });

  it("extracts real surrounding passage context and returns null when absent", () => {
    const chapter = [
      "Hujan turun perlahan di beranda rumah tua itu sejak sore.",
      "<!-- pagebreak -->",
      "Dalam kesunyian, Minke mencatat setiap kegelisahan zaman dengan pena hitamnya.",
      "Lampu minyak bergoyang ditiup angin malam yang basah.",
    ].join("\n\n");

    const excerpt = extractSurroundingContext(
      chapter,
      "Minke mencatat setiap kegelisahan zaman",
      120,
    );
    expect(excerpt).not.toBeNull();
    expect(excerpt).toContain("Hujan turun");
    expect(excerpt).not.toContain("pagebreak");
    expect(excerpt!.length).toBeLessThanOrEqual(120);

    expect(extractSurroundingContext(null, "Minke")).toBeNull();
    expect(extractSurroundingContext("", "Minke")).toBeNull();
  });
});
