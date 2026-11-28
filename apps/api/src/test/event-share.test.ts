import { afterEach, describe, expect, it, vi } from "vitest";
import { ANZA_ARCH_LOGO_PATHS } from "../../../web/src/lib/brand-mark";
import { buildEventPreviewSvg } from "../../../web/src/features/events/event-preview-svg";
import {
  copyPngBlobToClipboard,
  sharePngFileNative,
} from "../../../web/src/features/share/native-share-helpers";
import {
  buildEventShareCaption,
  buildEventShareFilename,
  buildEventTelegramUrl,
  buildEventWhatsAppUrl,
  buildEventXUrl,
  formatEventShareSchedule,
  getSafeEventShareLocation,
  resolveEventSharePalette,
  type EventShareSource,
} from "../../../web/src/features/events/event-share";

function makeEventFixture(
  overrides: Partial<EventShareSource> = {},
): EventShareSource {
  return {
    id: "evt-1",
    slug: "bedah-buku-filsafat-pasar-santa",
    calendarName: "Kolektif Literasi Jakarta",
    calendarAvatarUrl: null,
    bookSummary: null,
    featuredWork: {
      mediaType: "book",
      title: "Madilog",
      creator: "Tan Malaka",
    },
    title: 'Bedah Buku & "Diskusi" <Filsafat> Malam',
    description: "Diskusi hangat membaca buku bersama di akhir pekan.",
    coverUrl: "https://images.unsplash.com/photo-1512820790803-83ca734da794",
    themePreset: "v2:nbk:or:ln:li:l",
    visibility: "public",
    eventType: "book_club",
    categoryTag: "filsafat",
    coHosts: [{ name: "Penerbit Aksara" }],
    format: "offline",
    district: "Kebayoran Baru",
    city: "Jakarta Selatan",
    venueName: "Pasar Santa Lt. 2",
    venueAddress: "Jl. Cipaku I No. 233, Jakarta Selatan",
    isAddressHidden: false,
    meetingPlatform: null,
    startsAt: "2026-11-28T12:00:00.000Z", // 19:00 WIB
    endsAt: "2026-11-28T14:00:00.000Z", // 21:00 WIB
    capacity: 40,
    attendeeCount: 18,
    ...overrides,
  };
}

describe("Event Share Helpers & OG Preview SVG", () => {
  it("formats schedule deterministically in Asia/Jakarta WIB", () => {
    const schedule = formatEventShareSchedule(
      "2026-11-28T12:00:00.000Z",
      "2026-11-28T14:00:00.000Z",
    );
    expect(schedule.dayNumber).toBe("28");
    expect(schedule.shortMonth).toBe("NOV");
    expect(schedule.fullMonth).toBe("November");
    expect(schedule.weekday).toBe("Sabtu");
    expect(schedule.timeRange).toBe("19:00 - 21:00 WIB");
  });

  it("enforces privacy masking on location for hidden offline, online, and hybrid events", () => {
    const offlineHidden = getSafeEventShareLocation(
      makeEventFixture({
        format: "offline",
        isAddressHidden: true,
        venueName: "Apartemen Pribadi Unit 12B",
      }),
    );
    expect(offlineHidden.isMaskedAddress).toBe(true);
    expect(offlineHidden.primaryLine).toBe("Kebayoran Baru, Jakarta Selatan");
    expect(offlineHidden.primaryLine).not.toContain("Apartemen Pribadi");

    const online = getSafeEventShareLocation(
      makeEventFixture({
        format: "online",
        meetingPlatform: "google_meet",
      }),
    );
    expect(online.modeLabel).toBe("Daring");
    expect(online.primaryLine).toBe("Google Meet");

    const hybrid = getSafeEventShareLocation(
      makeEventFixture({
        format: "hybrid",
        meetingPlatform: "zoom",
        isAddressHidden: false,
      }),
    );
    expect(hybrid.modeLabel).toBe("Hibrida");
    expect(hybrid.primaryLine).toBe("Pasar Santa Lt. 2 & Zoom");
  });

  it("builds WhatsApp and attending captions cleanly without private leaks", () => {
    const shareUrl =
      "https://anzabook.id/events/bedah-buku-filsafat-pasar-santa";
    const ev = makeEventFixture({
      isAddressHidden: true,
      venueName: "Ruang Rahasia Host",
      venueAddress: "Jl. Rahasia 99",
    });

    const inviteCaption = buildEventShareCaption(ev, shareUrl, {
      mode: "invite",
    });
    expect(inviteCaption).toContain(
      "Mari bergabung di agenda komunitas AnzaBook:",
    );
    expect(inviteCaption).toContain("Kebayoran Baru, Jakarta Selatan");
    expect(inviteCaption).toContain("Karya bahasan: Madilog (Tan Malaka)");
    expect(inviteCaption).toContain(shareUrl);
    expect(inviteCaption).not.toContain("Ruang Rahasia Host");
    expect(inviteCaption).not.toContain("Jl. Rahasia 99");

    const attendingCaption = buildEventShareCaption(ev, shareUrl, {
      mode: "attending",
      readerName: "Raka Alpiansyah",
    });
    expect(attendingCaption).toContain(
      "Raka Alpiansyah akan hadir di agenda AnzaBook berikut",
    );

    expect(buildEventWhatsAppUrl(inviteCaption)).toMatch(
      /^https:\/\/wa\.me\/\?text=/,
    );
    expect(buildEventTelegramUrl(shareUrl, "Judul")).toContain(
      "https://t.me/share/url?",
    );
    expect(buildEventXUrl(shareUrl, "Judul")).toContain(
      "https://x.com/intent/post?",
    );
    expect(
      buildEventShareFilename(
        "Bedah Buku Pasar Santa!",
        "attending_pass",
        "story",
      ),
    ).toBe("anzabook-agenda-bedah-buku-pasar-santa-hadir-9x16.png");
  });

  it("resolves WCAG AA palettes across all 7 theme presets", () => {
    const presets = ["min", "ris", "nbk", "sln", "bot", "cin", "mus"] as const;
    for (const preset of presets) {
      const dark = resolveEventSharePalette(`v2:${preset}:sa:pl:li:d`);
      const light = resolveEventSharePalette(`v2:${preset}:co:ln:jk:l`);
      const auto = resolveEventSharePalette(`v2:${preset}:or:gr:mn:a`);
      expect(dark.isDark).toBe(true);
      expect(light.isDark).toBe(false);
      expect(auto.isDark).toBe(false);
      expect(dark.accent).toMatch(/^#[0-9A-F]{6}$/i);
      expect(light.accent).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });

  it("escapes XML safely in buildEventPreviewSvg and never leaks private fields", () => {
    const fixtureWithSensitiveFields = {
      ...makeEventFixture({
        isAddressHidden: true,
        venueName: "Rumah Pribadi <Rahasia>",
        venueAddress: "Jl. Pribadi No. 777",
      }),
      onlineMeetingUrl: "https://meet.google.com/secret-room-code",
      logisticsNotes: "PIN pintu 4829",
      userRsvp: {
        checkinCode: "ANZB-SECRET-TICKET",
      },
    } as EventShareSource;

    const svg = buildEventPreviewSvg(fixtureWithSensitiveFields);
    expect(svg).toContain('width="1200" height="630"');
    expect(svg).toContain(ANZA_ARCH_LOGO_PATHS.leftSweep);
    expect(svg).toContain("Bedah Buku &#38; &#34;Diskusi&#34;");
    expect(svg).toContain("&#60;Filsafat&#62; Malam");
    expect(svg).toContain("19:00 - 21:00 WIB");
    expect(svg).not.toContain("Rumah Pribadi");
    expect(svg).not.toContain("Jl. Pribadi");
    expect(svg).not.toContain("secret-room-code");
    expect(svg).not.toContain("4829");
    expect(svg).not.toContain("ANZB-SECRET-TICKET");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shares PNG files natively with an image-only payload and handles cancel/unsupported", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "poster.png", {
      type: "image/png",
    });
    const shareMock = vi.fn().mockResolvedValue(undefined);
    const canShareMock = vi.fn().mockReturnValue(true);

    vi.stubGlobal("navigator", {
      share: shareMock,
      canShare: canShareMock,
    });

    expect(await sharePngFileNative(file)).toBe("shared");
    expect(shareMock).toHaveBeenCalledWith({ files: [file] });

    const abortErr = new Error("Aborted");
    abortErr.name = "AbortError";
    shareMock.mockRejectedValueOnce(abortErr);
    expect(await sharePngFileNative(file)).toBe("cancelled");

    canShareMock.mockReturnValueOnce(false);
    expect(await sharePngFileNative(file)).toBe("unsupported");
  });

  it("copies PNG blobs to clipboard when ClipboardItem is supported and falls back cleanly", async () => {
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" });
    const writeMock = vi.fn().mockResolvedValue(undefined);

    class FakeClipboardItem {
      data: Record<string, Blob>;
      constructor(data: Record<string, Blob>) {
        this.data = data;
      }
    }

    vi.stubGlobal("ClipboardItem", FakeClipboardItem);
    vi.stubGlobal("navigator", {
      clipboard: { write: writeMock },
    });

    expect(await copyPngBlobToClipboard(blob)).toBe(true);
    expect(writeMock).toHaveBeenCalledTimes(1);

    writeMock.mockRejectedValueOnce(new Error("Denied"));
    expect(await copyPngBlobToClipboard(blob)).toBe(false);

    vi.stubGlobal("navigator", {});
    expect(await copyPngBlobToClipboard(blob)).toBe(false);
  });
});
