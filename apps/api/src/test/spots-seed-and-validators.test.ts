import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  INDONESIA_BBOX,
  createSpotReportSchema,
  createSpotSubmissionSchema,
  expandSpotCityFilterValues,
  geocodeSpotsQuerySchema,
  haversineDistanceMeters,
  listAdminSpotsQuerySchema,
  listSpotsQuerySchema,
  moderateSpotSchema,
  nearbyCheckQuerySchema,
  spotFacilityKeyValues,
  upsertSpotReviewSchema,
} from "@starter/shared/validators/spots";

describe("Reading Spots Shared Validators (Issue #19)", () => {
  it("pins Indonesia bounding box and re-exports haversineDistanceMeters", () => {
    expect(INDONESIA_BBOX).toEqual({
      minLat: -11.5,
      maxLat: 6.5,
      minLng: 94.5,
      maxLng: 141.5,
    });
    const dist = haversineDistanceMeters(-6.2088, 106.8456, -6.1904, 106.8396);
    expect(dist).toBeGreaterThan(2000);
    expect(dist).toBeLessThan(2500);
  });

  it("enforces Indonesia bounds and strict input rules on createSpotSubmissionSchema", () => {
    const valid = createSpotSubmissionSchema.safeParse({
      name: "Kineruku",
      category: "book_cafe",
      city: "Bandung",
      province: "Jawa Barat",
      address: "Jl. Hegarmanah No. 52, Cidadap",
      latitude: -6.8832,
      longitude: 107.6054,
      facilities: { wifi: true, quietZone: true, hasBookCollection: true },
      googleMapsUrl: "https://maps.app.goo.gl/kineruku123",
      websiteUrl: "https://kineruku.com",
    });
    expect(valid.success).toBe(true);

    // Coordinates outside INDONESIA_BBOX (e.g. Manila north, Tokyo, Sydney) must fail
    expect(
      createSpotSubmissionSchema.safeParse({
        name: "Manila Library",
        category: "library",
        city: "Manila",
        province: "Metro Manila",
        address: "100 Rizal Park Ave",
        latitude: 14.5995,
        longitude: 120.9842,
      }).success,
    ).toBe(false);

    expect(
      createSpotSubmissionSchema.safeParse({
        name: "Tokyo Bookshop",
        category: "indie_bookstore",
        city: "Tokyo",
        province: "Kanto",
        address: "Jinbocho 1-1",
        latitude: 35.6762,
        longitude: 139.6503,
      }).success,
    ).toBe(false);

    // Reject javascript: websiteUrl and unknown keys
    expect(
      createSpotSubmissionSchema.safeParse({
        name: "Kafe Buku",
        category: "book_cafe",
        city: "Jakarta",
        province: "DKI Jakarta",
        address: "Jl. Kemang Selatan No. 1",
        latitude: -6.27,
        longitude: 106.81,
        websiteUrl: "javascript:alert(1)",
      }).success,
    ).toBe(false);

    expect(
      createSpotSubmissionSchema.safeParse({
        name: "Kafe Buku",
        category: "book_cafe",
        city: "Jakarta",
        province: "DKI Jakarta",
        address: "Jl. Kemang Selatan No. 1",
        latitude: -6.27,
        longitude: 106.81,
        extraField: "disallowed",
      }).success,
    ).toBe(false);
  });

  it("supports PR #37 combined bbox + lat/lng queries, zoom-4 WGS84 viewports, and lat/lng without radiusKm", () => {
    // PR #37 "Cari di area ini" sends lat/lng AND bbox simultaneously, possibly wider than INDONESIA_BBOX at minZoom=4
    const searchAreaQuery = listSpotsQuerySchema.safeParse({
      lat: "-6.2088",
      lng: "106.8456",
      minLat: "-13.5",
      maxLat: "8.2",
      minLng: "92.0",
      maxLng: "143.5",
      sort: "rating",
      limit: "60",
    });
    expect(searchAreaQuery.success).toBe(true);
    if (searchAreaQuery.success) {
      expect(searchAreaQuery.data.radiusKm).toBeUndefined();
      expect(searchAreaQuery.data.limit).toBe(60);
    }

    // PR #37 initial /spots load sends lat/lng without radiusKm or bbox
    const initialLoad = listSpotsQuerySchema.safeParse({
      lat: "-6.2088",
      lng: "106.8456",
      sort: "nearest",
      limit: "60",
    });
    expect(initialLoad.success).toBe(true);

    // All 8 facility filter keys are accepted
    for (const facility of spotFacilityKeyValues) {
      expect(
        listSpotsQuerySchema.safeParse({ facility }).success,
        `Facility "${facility}" must be accepted`,
      ).toBe(true);
    }

    // Reject partial bbox, inverted bbox, or unpaired lat/lng
    expect(
      listSpotsQuerySchema.safeParse({ minLat: "-7.0", maxLat: "-6.0" }).success,
    ).toBe(false);
    expect(
      listSpotsQuerySchema.safeParse({
        minLat: "-5.0",
        maxLat: "-7.0",
        minLng: "106.0",
        maxLng: "107.0",
      }).success,
    ).toBe(false);
    expect(listSpotsQuerySchema.safeParse({ lat: "-6.2" }).success).toBe(false);
  });

  it("validates nearby-check, geocode, reviews, reports, and moderation schemas", () => {
    const nearby = nearbyCheckQuerySchema.safeParse({
      lat: "-6.2",
      lng: "106.8",
    });
    expect(nearby.success).toBe(true);
    if (nearby.success) {
      expect(nearby.data.radiusMeters).toBe(100);
    }
    expect(
      nearbyCheckQuerySchema.safeParse({
        lat: "-6.2",
        lng: "106.8",
        radiusMeters: "800",
      }).success,
    ).toBe(false);

    expect(geocodeSpotsQuerySchema.safeParse({ q: "a" }).success).toBe(false);
    expect(
      geocodeSpotsQuerySchema.safeParse({ q: "Tebet Jakarta" }).success,
    ).toBe(true);

    expect(
      upsertSpotReviewSchema.safeParse({
        rating: 5,
        content: "Colokan banyak, kopi mantap, tenang buat baca lama.",
        tags: ["colokan_banyak", "wifi_stabil", "tenang_fokus"],
      }).success,
    ).toBe(true);

    expect(
      upsertSpotReviewSchema.safeParse({
        rating: 4.5,
        content: "Rating harus bilangan bulat.",
        tags: [],
      }).success,
    ).toBe(false);

    expect(
      upsertSpotReviewSchema.safeParse({
        rating: 4,
        content: "Terlalu banyak tag dipilih untuk ulasan.",
        tags: [
          "colokan_banyak",
          "wifi_stabil",
          "tenang_fokus",
          "koleksi_bagus",
        ],
      }).success,
    ).toBe(false);

    expect(
      upsertSpotReviewSchema.safeParse({
        rating: 4,
        content: "Tag tidak boleh duplikat.",
        tags: ["wifi_stabil", "wifi_stabil"],
      }).success,
    ).toBe(false);

    expect(
      createSpotReportSchema.safeParse({
        reasonType: "review_abuse",
        reviewId: randomUUID(),
        details: "Ulasan mengandung promosi spam.",
      }).success,
    ).toBe(true);

    expect(
      moderateSpotSchema.safeParse({ action: "reject" }).success,
    ).toBe(false);

    expect(
      moderateSpotSchema.safeParse({
        action: "reject",
        rejectionReason: "Lokasi rumah pribadi bukan sudut baca publik.",
      }).success,
    ).toBe(true);

    expect(
      moderateSpotSchema.safeParse({
        action: "approve",
        verifiedBadge: "curated",
        coverUrl: "//evil.com/cover.png",
      }).success,
    ).toBe(false);

    const adminFalse = listAdminSpotsQuerySchema.safeParse({
      hasOpenReports: "false",
    });
    expect(adminFalse.success).toBe(true);
    if (adminFalse.success) {
      expect(adminFalse.data.hasOpenReports).toBe(false);
    }
  });

  it("expands Jakarta and Bali city filter aliases cleanly for #22 presets", () => {
    expect(expandSpotCityFilterValues("Jakarta")).toEqual(
      expect.arrayContaining([
        "Jakarta",
        "Jakarta Pusat",
        "Jakarta Selatan",
        "Jakarta Timur",
      ]),
    );
    expect(expandSpotCityFilterValues("Bali")).toEqual(
      expect.arrayContaining(["Bali", "Denpasar", "Ubud"]),
    );
    expect(expandSpotCityFilterValues("Bandung")).toEqual(["Bandung"]);
  });
});
