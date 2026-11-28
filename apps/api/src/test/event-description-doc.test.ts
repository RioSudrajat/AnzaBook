import { describe, expect, it } from "vitest";
import {
  createEventSchema,
  detectMeetingPlatform,
  encodeEventThemeSpec,
  getMeetingPlatformMeta,
  isValidEventTheme,
  parseEventThemeSpec,
} from "@starter/shared/validators/community";
import {
  createDefaultEventFormState,
  eventDescriptionToPlainExcerpt,
  formatEventApiError,
  formatLocalDateInput,
  formatLocalTimeInput,
  markdownToTiptapDoc,
  normalizeOptionalHttpUrl,
  parseEventDescriptionBlocks,
  tiptapDocToMarkdown,
} from "../../../web/src/features/events/event-description-doc";

describe("Event Description Doc, Rich Renderer & Form Helpers", () => {
  it("round-trips Tiptap JSON nodes to clean Markdown and back", () => {
    const sampleMarkdown = [
      "# Agenda Utama",
      "",
      "## Sesi Pembukaan",
      "",
      "Mari membawa **catatan baca** dan *pena* favoritmu.",
      "",
      "> Membaca bersama memperdalam pemahaman.",
      "",
      "- Perkenalan peserta",
      "- Bedah bab pertama",
      "",
      "1. Pendaftaran ulang",
      "2. Diskusi kelompok",
      "",
      "---",
      "",
      "![Suasana Diskusi](/api/media/images/123e4567-e89b-12d3-a456-426614174000.jpg)",
    ].join("\n");

    const doc = markdownToTiptapDoc(sampleMarkdown);
    expect(doc.type).toBe("doc");
    expect(doc.content?.some((node) => node.type === "heading")).toBe(true);
    expect(doc.content?.some((node) => node.type === "blockquote")).toBe(true);
    expect(doc.content?.some((node) => node.type === "bulletList")).toBe(true);
    expect(doc.content?.some((node) => node.type === "orderedList")).toBe(true);
    expect(doc.content?.some((node) => node.type === "horizontalRule")).toBe(
      true,
    );
    expect(doc.content?.some((node) => node.type === "image")).toBe(true);

    const serialized = tiptapDocToMarkdown(doc);
    expect(serialized).toContain("# Agenda Utama");
    expect(serialized).toContain("## Sesi Pembukaan");
    expect(serialized).toContain("**catatan baca**");
    expect(serialized).toContain("*pena*");
    expect(serialized).toContain("> Membaca bersama memperdalam pemahaman.");
    expect(serialized).toContain("- Perkenalan peserta");
    expect(serialized).toContain("1. Pendaftaran ulang");
    expect(serialized).toContain("---");
    expect(serialized).toContain(
      "![Suasana Diskusi](/api/media/images/123e4567-e89b-12d3-a456-426614174000.jpg)",
    );
  });

  it("parses structured AST blocks cleanly and strips unsafe URLs", () => {
    const raw = [
      "# Judul Besar",
      "",
      "Kunjungi [situs aman](https://anzabook.id) atau [bahaya](javascript:alert(1)).",
      "",
      "![XSS](javascript:alert(1))",
      "",
      "![Poster](https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800)",
    ].join("\n");

    const blocks = parseEventDescriptionBlocks(raw);
    expect(blocks.some((b) => b.type === "heading" && b.level === 1)).toBe(
      true,
    );

    const paragraph = blocks.find((b) => b.type === "paragraph");
    expect(paragraph?.type).toBe("paragraph");
    if (paragraph?.type === "paragraph") {
      const links = paragraph.runs.filter((r) => r.linkHref);
      expect(links).toHaveLength(1);
      expect(links[0]?.linkHref).toBe("https://anzabook.id/");
    }

    const images = blocks.filter((b) => b.type === "image");
    expect(images).toHaveLength(1);
    if (images[0]?.type === "image") {
      expect(images[0].src).toContain("https://images.unsplash.com/");
    }
  });

  it("produces readable plain excerpts without raw markdown hashes", () => {
    const excerpt = eventDescriptionToPlainExcerpt(
      "# Agenda Utama\n\n## Pembahasan\n\n- Diskusi buku **Bumi Manusia**\n\n![Foto](/api/media/images/abc.jpg)",
    );
    expect(excerpt).not.toContain("#");
    expect(excerpt).not.toContain("**");
    expect(excerpt).not.toContain("![");
    expect(excerpt).toContain("Agenda Utama");
    expect(excerpt).toContain("Diskusi buku Bumi Manusia");
  });

  it("formats local date and time inputs without UTC day-shift bugs", () => {
    const localSample = new Date(2026, 10, 29, 19, 30, 0);
    const iso = localSample.toISOString();
    expect(formatLocalDateInput(iso)).toBe("2026-11-29");
    expect(formatLocalTimeInput(iso)).toBe("19:30");
  });

  it("returns fresh default state on every CreateEventDialog session", () => {
    const first = createDefaultEventFormState();
    const second = createDefaultEventFormState();
    expect(first).not.toBe(second);
    expect(first.title).toBe("");
    expect(first.description).toBe("");
    expect(first.logisticsNotes).toBe("");
    expect(first.coHosts).toEqual([]);
    expect(first.locationState.format).toBe("offline");
  });

  it("encodes, parses, and validates 5-axis v2 themes alongside legacy keys", () => {
    const encoded = encodeEventThemeSpec({
      preset: "bot",
      accent: "am",
      style: "dg",
      font: "cl",
      mode: "d",
    });
    expect(encoded).toBe("v2:bot:am:dg:cl:d");
    expect(encoded.length).toBeLessThanOrEqual(32);
    expect(isValidEventTheme(encoded)).toBe(true);
    expect(parseEventThemeSpec(encoded)).toEqual({
      preset: "bot",
      accent: "am",
      style: "dg",
      font: "cl",
      mode: "d",
    });

    expect(parseEventThemeSpec("classic_paper")).toEqual({
      preset: "nbk",
      accent: "am",
      style: "ln",
      font: "li",
      mode: "l",
    });
    expect(parseEventThemeSpec("midnight_ink")).toEqual({
      preset: "sln",
      accent: "or",
      style: "lb",
      font: "li",
      mode: "d",
    });

    expect(isValidEventTheme("v2:bad:xx:yy:zz:q")).toBe(false);
    expect(isValidEventTheme("<script>alert(1)</script>")).toBe(false);
    expect(parseEventThemeSpec("v2:bad:xx:yy:zz:q")).toEqual({
      preset: "min",
      accent: "or",
      style: "pl",
      font: "li",
      mode: "a",
    });

    const validPayload = {
      calendarId: "123e4567-e89b-12d3-a456-426614174000",
      title: "Malam Sastra Daun Gugur",
      description: "Diskusi sastra senja bersama pembaca lintas kota.",
      coverUrl: "/covers/default-book.jpg",
      themePreset: encoded,
      format: "online" as const,
      onlineMeetingUrl: "https://meet.google.com/anzabook-diskusi",
      startsAt: "2026-11-29T12:00:00.000Z",
      endsAt: "2026-11-29T14:00:00.000Z",
    };
    expect(createEventSchema.safeParse(validPayload).success).toBe(true);

    const invalidPayload = {
      ...validPayload,
      themePreset: "v2:bad:xx:yy:zz:q",
    };
    expect(createEventSchema.safeParse(invalidPayload).success).toBe(false);
  });

  it("normalizes bare HTTP URLs safely and formats validation details in Indonesian", () => {
    expect(normalizeOptionalHttpUrl("  ")).toBeUndefined();
    expect(normalizeOptionalHttpUrl("meet.google.com/uji-anzabook")).toBe(
      "https://meet.google.com/uji-anzabook",
    );
    expect(normalizeOptionalHttpUrl("https://zoom.us/j/123456")).toBe(
      "https://zoom.us/j/123456",
    );
    expect(normalizeOptionalHttpUrl("javascript:alert(1)")).toBeUndefined();
    expect(normalizeOptionalHttpUrl("bukan-tautan")).toBeUndefined();

    expect(
      formatEventApiError(
        {
          message: "Check the supplied fields.",
          details: [
            {
              field: "venueName",
              message:
                "Nama tempat atau alamat fisik wajib diisi untuk acara luring",
            },
          ],
        },
        "Gagal membuat acara.",
      ),
    ).toBe("Nama tempat atau alamat fisik wajib diisi untuk acara luring");

    expect(
      formatEventApiError(
        { message: "Check the supplied fields." },
        "Gagal membuat acara.",
      ),
    ).not.toContain("Check the supplied fields");
  });

  it("detects virtual meeting platforms and returns clean UI labels without raw URLs", () => {
    expect(detectMeetingPlatform("meet.google.com/anzabook-diskusi")).toBe(
      "google_meet",
    );
    expect(
      detectMeetingPlatform("https://us02web.zoom.us/j/987654321?pwd=xyz"),
    ).toBe("zoom");
    expect(detectMeetingPlatform("https://teams.microsoft.com/l/meetup")).toBe(
      "teams",
    );
    expect(detectMeetingPlatform("https://discord.gg/anzabook")).toBe(
      "discord",
    );
    expect(detectMeetingPlatform("https://youtu.be/dQw4w9WgXcQ")).toBe(
      "youtube",
    );
    expect(detectMeetingPlatform("https://event.anzabook.id/room")).toBe(
      "virtual",
    );
    expect(detectMeetingPlatform("javascript:alert(1)")).toBeNull();
    expect(detectMeetingPlatform("")).toBeNull();

    expect(getMeetingPlatformMeta("google_meet")).toEqual({
      id: "google_meet",
      label: "Google Meet",
      ctaLabel: "Buka Google Meet",
    });
    expect(getMeetingPlatformMeta("zoom")).toEqual({
      id: "zoom",
      label: "Zoom",
      ctaLabel: "Gabung via Zoom",
    });
    expect(getMeetingPlatformMeta("virtual")).toEqual({
      id: "virtual",
      label: "Ruang Virtual",
      ctaLabel: "Buka Ruang Rapat",
    });
  });
});
