import { describe, expect, it } from "vitest";
import {
  createEventSchema,
  haversineDistanceMeters,
} from "@starter/shared/validators/community";

describe("Events & Calendars Validators", () => {
  it("calculates accurate Haversine distance in meters", () => {
    // Monas (-6.1754, 106.8272) to Menara Rajawali (-6.2284, 106.8352) ~5.9 km
    const distance = haversineDistanceMeters(-6.1754, 106.8272, -6.2284, 106.8352);
    expect(distance).toBeGreaterThan(5800);
    expect(distance).toBeLessThan(6100);

    // Nearby point within 250m
    const near = haversineDistanceMeters(-6.2284, 106.8352, -6.2295, 106.8360);
    expect(near).toBeLessThan(300);
  });

  it("accepts an event without bookId and with featuredWork (e.g. film discussion)", () => {
    const input = {
      calendarId: "123e4567-e89b-12d3-a456-426614174000",
      title: "Bedah Film & Naskah: Laut Bercerita",
      description: "Diskusi adaptasi novel ke film pendek bersama sutradara dan pemeran.",
      coverUrl: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=800&q=80",
      themePreset: "midnight_ink",
      visibility: "public",
      eventType: "film_discussion",
      categoryTag: "Sinema & Literasi",
      format: "offline",
      district: "Kecamatan Setiabudi",
      city: "Daerah Khusus Ibukota Jakarta",
      venueName: "GoWork Menara Rajawali",
      venueAddress: "Ground Floor, Menara Rajawali, Kuningan Timur",
      hideAddressUntilApproved: true,
      latitude: -6.22838,
      longitude: 106.83532,
      placeSourceLat: -6.22838,
      placeSourceLng: 106.83532,
      startsAt: "2026-11-12T13:00:00.000Z",
      endsAt: "2026-11-12T15:30:00.000Z",
      timezone: "Asia/Jakarta",
      capacity: 40,
      requiresApproval: true,
      allowWaitlist: true,
      featuredWork: {
        mediaType: "film",
        title: "Laut Bercerita",
        creator: "Pritagita Arianegara",
      },
    };

    const parsed = createEventSchema.safeParse(input);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.bookId).toBeUndefined();
      expect(parsed.data.featuredWork?.mediaType).toBe("film");
      expect(parsed.data.hideAddressUntilApproved).toBe(true);
    }
  });

  it("rejects an offline event where adjusted pin is > 1000m from source address", () => {
    const input = {
      calendarId: "123e4567-e89b-12d3-a456-426614174000",
      title: "Baca Bareng Akhir Pekan",
      description: "Sesi membaca hening bersama di taman.",
      coverUrl: "https://example.com/banner.jpg",
      themePreset: "minimal",
      visibility: "public",
      eventType: "silent_reading",
      format: "offline",
      city: "Jakarta",
      venueName: "Taman Suropati",
      venueAddress: "Jl. Taman Suropati No.5, Menteng",
      latitude: -6.1990, // moved > 1.2km away
      longitude: 106.8400,
      placeSourceLat: -6.1990,
      placeSourceLng: 106.8270, // ~1430m difference in longitude
      startsAt: "2026-11-14T09:00:00.000Z",
      endsAt: "2026-11-14T11:00:00.000Z",
    };

    const parsed = createEventSchema.safeParse(input);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const issue = parsed.error.issues.find((i) =>
        i.message.includes("1 km") || i.message.includes("1000"),
      );
      expect(issue).toBeDefined();
    }
  });

  it("validates banner coverUrl as URL or base64 data URI under 90k characters", () => {
    const baseInput = {
      calendarId: "123e4567-e89b-12d3-a456-426614174000",
      title: "Uji Banner",
      description: "Pengujian banner data URL.",
      themePreset: "minimal",
      visibility: "public",
      eventType: "book_club",
      format: "online",
      onlineMeetingUrl: "https://meet.google.com/abc-defg-hij",
      startsAt: "2026-11-15T10:00:00.000Z",
      endsAt: "2026-11-15T12:00:00.000Z",
    };

    // Valid data url
    const validDataUrl = `data:image/jpeg;base64,${"A".repeat(1000)}`;
    const validResult = createEventSchema.safeParse({
      ...baseInput,
      coverUrl: validDataUrl,
    });
    expect(validResult.success).toBe(true);

    // Oversized data url (> 90000 chars)
    const oversizedDataUrl = `data:image/jpeg;base64,${"A".repeat(95000)}`;
    const invalidResult = createEventSchema.safeParse({
      ...baseInput,
      coverUrl: oversizedDataUrl,
    });
    expect(invalidResult.success).toBe(false);
  });
});
