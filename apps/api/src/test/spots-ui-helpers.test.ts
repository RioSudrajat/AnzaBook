import { describe, expect, it } from "vitest";
import {
  createSpotSubmissionSchema,
  spotReportReasonValues,
  spotReviewTagValues,
  spotStatusValues,
} from "@starter/shared/validators/spots";
import type { ReadingSpotSummaryDto } from "../../../web/src/features/spots/types";
import {
  SPOT_CATEGORY_STYLES,
  SPOT_NOISE_LEVEL_OPTIONS,
  SPOT_PRICE_RANGE_OPTIONS,
  SPOT_REPORT_REASON_LABELS,
  SPOT_REVIEW_TAG_LABELS,
  SPOT_STATUS_META,
  buildGoogleMapsDirectionsUrl,
  buildGoogleMapsPlaceUrl,
  buildSpotSubmissionPayload,
  calculateDistanceMeters,
  calculateRatingPercent,
  clampIndonesiaCoordinate,
  clampMapBounds,
  formatDistanceMeters,
  formatNoiseLevel,
  formatPriceRange,
  formatSpotApiError,
  formatSpotCategory,
  formatVerifiedBadge,
  getActiveFacilityChips,
  hasViewportShiftedSignificantly,
  isWithinIndonesiaBbox,
  parseSavedSpotRegion,
  projectSpotsToPreviewCanvas,
  resolveCityCameraTarget,
  sanitizeExternalHttpUrl,
  serializeSavedSpotRegion,
  spotsToGeoJson,
  toggleVibeTagSelection,
} from "../../../web/src/features/spots/spots-helpers";

function makeSpot(
  overrides: Partial<ReadingSpotSummaryDto> = {},
): ReadingSpotSummaryDto {
  return {
    id: overrides.id ?? "spot-1",
    slug: overrides.slug ?? "kineruku-bandung",
    name: overrides.name ?? "Kineruku",
    category: overrides.category ?? "book_cafe",
    description:
      overrides.description ??
      "Perpustakaan & kafe buku independen di Hegarmanah.",
    address: overrides.address ?? "Jl. Hegarmanah No. 52",
    district: overrides.district ?? "Cidadap",
    city: overrides.city ?? "Bandung",
    province: overrides.province ?? "Jawa Barat",
    latitude: overrides.latitude ?? -6.8832,
    longitude: overrides.longitude ?? 107.6054,
    googleMapsUrl: overrides.googleMapsUrl ?? null,
    googlePlaceId: overrides.googlePlaceId ?? null,
    instagramHandle: overrides.instagramHandle ?? "kineruku",
    websiteUrl: overrides.websiteUrl ?? "https://kineruku.com",
    openingHoursText: overrides.openingHoursText ?? "Sel-Min 11:30-17:30",
    priceRange: overrides.priceRange ?? "budget",
    noiseLevel: overrides.noiseLevel ?? "quiet",
    facilities: overrides.facilities ?? {
      wifi: true,
      powerOutlets: true,
      quietZone: true,
      hasBookCollection: true,
      outdoorSeating: true,
    },
    coverUrl: overrides.coverUrl ?? null,
    verifiedBadge: overrides.verifiedBadge ?? "partner",
    linkedBranchId:
      "linkedBranchId" in overrides
        ? (overrides.linkedBranchId ?? null)
        : "branch-1",
    linkedCalendarId:
      "linkedCalendarId" in overrides
        ? (overrides.linkedCalendarId ?? null)
        : null,
    ratingAvg: overrides.ratingAvg ?? 4.8,
    ratingCount: overrides.ratingCount ?? 124,
    bookmarkCount: overrides.bookmarkCount ?? 48,
    distanceMeters: overrides.distanceMeters ?? 1420,
    isBookmarked: overrides.isBookmarked ?? false,
  };
}

describe("Reading Spots UI & Cartographic Helpers (Issue #22)", () => {
  it("builds Google Maps universal directions URL with and without googlePlaceId", () => {
    const basicSpot = makeSpot({
      latitude: -6.8832,
      longitude: 107.6054,
      googlePlaceId: null,
    });
    expect(buildGoogleMapsDirectionsUrl(basicSpot)).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=-6.8832,107.6054",
    );

    const placeSpot = makeSpot({
      latitude: -6.8832,
      longitude: 107.6054,
      googlePlaceId: "ChIJabc123+xyz",
    });
    expect(buildGoogleMapsDirectionsUrl(placeSpot)).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=-6.8832,107.6054&destination_place_id=ChIJabc123%2Bxyz",
    );
  });

  it("builds Google Maps place search URL safely and rejects javascript: URIs", () => {
    const withCustom = makeSpot({
      googleMapsUrl: "https://maps.app.goo.gl/xyz123",
    });
    expect(buildGoogleMapsPlaceUrl(withCustom)).toBe(
      "https://maps.app.goo.gl/xyz123",
    );

    const withUnsafe = makeSpot({
      googleMapsUrl: "javascript:alert(1)",
      name: "POST Bookshop",
      city: "Jakarta",
    });
    expect(buildGoogleMapsPlaceUrl(withUnsafe)).toBe(
      "https://www.google.com/maps/search/?api=1&query=POST%20Bookshop%20Jakarta",
    );

    const withNonGoogleDomain = makeSpot({
      googleMapsUrl: "https://phishing.example/maps/place/foo",
      name: "Kineruku",
      city: "Bandung",
    });
    expect(buildGoogleMapsPlaceUrl(withNonGoogleDomain)).toBe(
      "https://www.google.com/maps/search/?api=1&query=Kineruku%20Bandung",
    );

    expect(sanitizeExternalHttpUrl("javascript:alert(1)")).toBeNull();
    expect(sanitizeExternalHttpUrl("https://anzabook.id/spots")).toBe(
      "https://anzabook.id/spots",
    );
  });

  it("clamps map viewport bounds safely within [-90, 90] and [-180, 180]", () => {
    expect(
      clampMapBounds({
        minLat: -95,
        maxLat: 92,
        minLng: -210,
        maxLng: 195,
      }),
    ).toEqual({
      minLat: -90,
      maxLat: 90,
      minLng: -180,
      maxLng: 180,
    });

    expect(
      clampMapBounds({
        minLat: -8.5,
        maxLat: -6.1,
        minLng: 105.2,
        maxLng: 112.4,
      }),
    ).toEqual({
      minLat: -8.5,
      maxLat: -6.1,
      minLng: 105.2,
      maxLng: 112.4,
    });
  });

  it("formats distance, categories, noise level, price range, and verified badges cleanly in Indonesian", () => {
    expect(formatDistanceMeters(348.7)).toBe("350 m");
    expect(formatDistanceMeters(1420)).toBe("1,4 km");
    expect(formatDistanceMeters(12500)).toBe("12,5 km");
    expect(formatDistanceMeters(null)).toBeNull();
    expect(formatDistanceMeters(-10)).toBeNull();

    expect(formatSpotCategory("book_cafe")).toBe("Kafe Buku");
    expect(formatSpotCategory("tbm")).toBe("TBM");
    expect(formatPriceRange("free")).toBe("Gratis");
    expect(formatNoiseLevel("quiet")).toBe("Tenang");
    expect(formatVerifiedBadge("partner")).toBe("Mitra AnzaBook");
    expect(formatVerifiedBadge("curated")).toBe("Terkurasi");
    expect(formatVerifiedBadge("none")).toBeNull();
  });

  it("extracts ordered Reading Comfort facility badges cleanly", () => {
    const chips = getActiveFacilityChips({
      wifi: true,
      powerOutlets: false,
      quietZone: true,
      hasBookCollection: true,
      prayerRoom: true,
    });

    expect(chips.map((c) => c.key)).toEqual([
      "wifi",
      "quietZone",
      "hasBookCollection",
      "prayerRoom",
    ]);
    expect(chips.map((c) => c.label)).toEqual([
      "Wi-Fi",
      "Zona Tenang",
      "Koleksi Buku",
      "Mushola",
    ]);
  });

  it("converts spots into valid GeoJSON FeatureCollection with [lng, lat] geometry", () => {
    const geojson = spotsToGeoJson([
      makeSpot({
        id: "spot-1",
        slug: "kineruku",
        latitude: -6.8832,
        longitude: 107.6054,
        verifiedBadge: "partner",
        linkedBranchId: "branch-1",
      }),
      makeSpot({
        id: "spot-2",
        slug: "perpustakaan-cikini",
        name: "Perpustakaan Jakarta",
        category: "library",
        latitude: -6.1904,
        longitude: 106.8396,
        verifiedBadge: "curated",
        linkedBranchId: null,
      }),
    ]);

    expect(geojson.type).toBe("FeatureCollection");
    expect(geojson.features).toHaveLength(2);
    expect(geojson.features[0]?.geometry).toEqual({
      type: "Point",
      coordinates: [107.6054, -6.8832],
    });
    expect(geojson.features[0]?.properties).toMatchObject({
      id: "spot-1",
      slug: "kineruku",
      category: "book_cafe",
      isPartner: true,
    });
    expect(geojson.features[1]?.properties).toMatchObject({
      id: "spot-2",
      slug: "perpustakaan-cikini",
      category: "library",
      isPartner: false,
    });
  });

  it("validates saved localStorage region strictly within Indonesia bounds", () => {
    expect(isWithinIndonesiaBbox(-6.2088, 106.8456)).toBe(true);
    expect(isWithinIndonesiaBbox(35.6762, 139.6503)).toBe(false);

    const serialized = serializeSavedSpotRegion({
      city: "Bandung",
      lat: -6.9175,
      lng: 107.6191,
      zoom: 12,
      source: "preset",
    });
    expect(parseSavedSpotRegion(serialized)).toEqual({
      city: "Bandung",
      lat: -6.9175,
      lng: 107.6191,
      zoom: 12,
      source: "preset",
    });

    expect(parseSavedSpotRegion("{corrupt")).toBeNull();
    expect(
      parseSavedSpotRegion(
        JSON.stringify({
          city: "Tokyo",
          lat: 35.67,
          lng: 139.65,
          zoom: 11,
          source: "geolocation",
        }),
      ),
    ).toBeNull();
  });

  it("projects spots onto SVG preview canvas safely without NaN or overflow", () => {
    expect(
      projectSpotsToPreviewCanvas([], { lat: -6.2088, lng: 106.8456 }),
    ).toEqual([]);

    const identicalSpots = [
      makeSpot({ id: "a", slug: "a", latitude: -6.2, longitude: 106.8 }),
    ];
    const single = projectSpotsToPreviewCanvas(identicalSpots, {
      lat: -6.2,
      lng: 106.8,
    });
    expect(single).toHaveLength(1);
    expect(single[0]?.x).toBe(50);
    expect(single[0]?.y).toBe(50);

    const spread = projectSpotsToPreviewCanvas(
      [
        makeSpot({ id: "a", slug: "a", latitude: -6.15, longitude: 106.79 }),
        makeSpot({ id: "b", slug: "b", latitude: -6.25, longitude: 106.89 }),
      ],
      { lat: -6.2, lng: 106.84 },
    );
    expect(spread[0]!.x).toBeGreaterThanOrEqual(12);
    expect(spread[0]!.x).toBeLessThanOrEqual(88);
    expect(spread[1]!.y).toBeGreaterThanOrEqual(18);
    expect(spread[1]!.y).toBeLessThanOrEqual(82);
  });

  it("calculates distance and detects significant map viewport pans", () => {
    const meters = calculateDistanceMeters(
      -6.2088,
      106.8456,
      -6.1904,
      106.8396,
    );
    expect(meters).toBeGreaterThan(2000);
    expect(meters).toBeLessThan(2500);

    expect(
      hasViewportShiftedSignificantly(
        { lat: -6.2088, lng: 106.8456, zoom: 12 },
        { lat: -6.2091, lng: 106.8458, zoom: 12 },
      ),
    ).toBe(false);

    expect(
      hasViewportShiftedSignificantly(
        { lat: -6.2088, lng: 106.8456, zoom: 12 },
        { lat: -6.245, lng: 106.8456, zoom: 12 },
      ),
    ).toBe(true);
  });

  it("exposes colorblind-safe styles for all 5 spot categories", () => {
    expect(Object.keys(SPOT_CATEGORY_STYLES)).toEqual([
      "book_cafe",
      "library",
      "tbm",
      "indie_bookstore",
      "reading_lounge",
    ]);
  });

  it("resolves city camera targets for presets and non-preset Indonesian cities", () => {
    const presetTarget = resolveCityCameraTarget("bandung");
    expect(presetTarget).toEqual({
      city: "Bandung",
      lat: -6.9175,
      lng: 107.6191,
      zoom: 12,
    });

    const cities = [
      { city: "Malang", latitude: -7.9666, longitude: 112.6326 },
      { city: "Kota Tanpa Koordinat", latitude: null, longitude: null },
      { city: "Tokyo", latitude: 35.6762, longitude: 139.6503 },
    ];

    expect(resolveCityCameraTarget("malang", cities)).toEqual({
      city: "Malang",
      lat: -7.9666,
      lng: 112.6326,
      zoom: 12,
    });
    expect(resolveCityCameraTarget("Kota Tanpa Koordinat", cities)).toBeNull();
    expect(resolveCityCameraTarget("Tokyo", cities)).toBeNull();
    expect(resolveCityCameraTarget("Tidak Ada", cities)).toBeNull();
    expect(resolveCityCameraTarget("   ", cities)).toBeNull();
  });
});

describe("Issue #23 reviews, submission & moderation helpers", () => {
  it("provides Indonesian labels for all vibe tags, report reasons, statuses, and options", () => {
    expect(Object.keys(SPOT_REVIEW_TAG_LABELS)).toEqual([
      ...spotReviewTagValues,
    ]);
    expect(SPOT_REVIEW_TAG_LABELS.colokan_banyak).toBe("Colokan banyak");
    expect(SPOT_REVIEW_TAG_LABELS.wifi_stabil).toBe("Wi-Fi stabil");
    expect(SPOT_REVIEW_TAG_LABELS.tenang_fokus).toBe("Tenang untuk fokus");
    expect(SPOT_REVIEW_TAG_LABELS.koleksi_bagus).toBe("Banyak koleksi buku");
    expect(SPOT_REVIEW_TAG_LABELS.kopi_enak).toBe("Kopi/minuman enak");
    expect(SPOT_REVIEW_TAG_LABELS.gratis_masuk).toBe("Gratis masuk");
    expect(SPOT_REVIEW_TAG_LABELS.nyaman_lama).toBe("Nyaman berlama-lama");

    expect(Object.keys(SPOT_REPORT_REASON_LABELS)).toEqual([
      ...spotReportReasonValues,
    ]);
    expect(Object.keys(SPOT_STATUS_META)).toEqual([...spotStatusValues]);
    expect(SPOT_PRICE_RANGE_OPTIONS.map((o) => o.value)).toEqual([
      "free",
      "budget",
      "moderate",
      "premium",
    ]);
    expect(SPOT_NOISE_LEVEL_OPTIONS.map((o) => o.value)).toEqual([
      "quiet",
      "moderate",
      "lively",
    ]);
  });

  it("toggles reading vibe tags with a strict maximum of 3 unique selections", () => {
    let tags = toggleVibeTagSelection([], "colokan_banyak");
    expect(tags).toEqual(["colokan_banyak"]);

    tags = toggleVibeTagSelection(tags, "wifi_stabil");
    tags = toggleVibeTagSelection(tags, "tenang_fokus");
    expect(tags).toEqual(["colokan_banyak", "wifi_stabil", "tenang_fokus"]);

    // 4th tag ignored while 3 are selected
    expect(toggleVibeTagSelection(tags, "kopi_enak")).toEqual([
      "colokan_banyak",
      "wifi_stabil",
      "tenang_fokus",
    ]);

    // Existing tag can still be toggled off
    tags = toggleVibeTagSelection(tags, "wifi_stabil");
    expect(tags).toEqual(["colokan_banyak", "tenang_fokus"]);
  });

  it("calculates rating distribution percentages safely including zero totals", () => {
    expect(calculateRatingPercent(0, 0)).toBe(0);
    expect(calculateRatingPercent(3, 4)).toBe(75);
    expect(calculateRatingPercent(5, 3)).toBe(100);
  });

  it("clamps coordinates strictly within INDONESIA_BBOX", () => {
    expect(clampIndonesiaCoordinate(-6.2, 106.8)).toEqual({
      lat: -6.2,
      lng: 106.8,
      wasClamped: false,
    });

    const clamped = clampIndonesiaCoordinate(35.6762, 139.6503);
    expect(clamped.wasClamped).toBe(true);
    expect(clamped.lat).toBe(6.5);
    expect(clamped.lng).toBe(139.6503);

    const westClamped = clampIndonesiaCoordinate(-20, 80);
    expect(westClamped).toEqual({
      lat: -11.5,
      lng: 94.5,
      wasClamped: true,
    });
  });

  it("formats ApiError 429 rate-limit, 409 duplicate report, and 400 validation errors cleanly", () => {
    expect(
      formatSpotApiError({
        status: 429,
        code: "RATE_LIMIT_EXCEEDED",
        message: "Batas maksimal 5 usulan per hari tercapai.",
      }),
    ).toBe("Batas maksimal 5 usulan per hari tercapai.");

    expect(
      formatSpotApiError({
        status: 409,
        code: "DUPLICATE_OPEN_REPORT",
        message:
          "Anda sudah mengirimkan laporan serupa yang masih dalam peninjauan.",
      }),
    ).toBe(
      "Anda sudah mengirimkan laporan serupa yang masih dalam peninjauan.",
    );

    expect(
      formatSpotApiError({
        status: 400,
        code: "VALIDATION_ERROR",
        message: "Invalid input",
        details: [
          {
            field: "googleMapsUrl",
            message: "Tautan harus berupa URL Google Maps resmi.",
          },
        ],
      }),
    ).toBe("Tautan harus berupa URL Google Maps resmi.");

    expect(formatSpotApiError(null, "Gagal memuat data.")).toBe(
      "Gagal memuat data.",
    );
  });

  it("builds valid submission payloads and rejects malicious or non-Maps Google URLs", () => {
    const validPayload = buildSpotSubmissionPayload({
      name: "  Kafe Baca Merdeka  ",
      category: "book_cafe",
      description: "  Nyaman untuk membaca novel sore hari.  ",
      address: "  Jl. Braga No. 42, Sumur Bandung  ",
      district: "  Sumur Bandung ",
      city: "  Bandung ",
      province: "  Jawa Barat ",
      latitude: -6.9175,
      longitude: 107.6098,
      googleMapsUrl: "  https://maps.app.goo.gl/abc123  ",
      instagramHandle: "  @kafebacamerdeka  ",
      websiteUrl: "   ",
      openingHoursText: "  Sen-Min 09:00-21:00 ",
      priceRange: "budget",
      noiseLevel: "quiet",
      facilities: { wifi: true, powerOutlets: true },
    });

    const parsedValid = createSpotSubmissionSchema.safeParse(validPayload);
    expect(parsedValid.success).toBe(true);
    if (parsedValid.success) {
      expect(parsedValid.data.instagramHandle).toBe("kafebacamerdeka");
      expect(parsedValid.data.websiteUrl).toBeUndefined();
      expect(parsedValid.data.googleMapsUrl).toBe(
        "https://maps.app.goo.gl/abc123",
      );
    }

    const badPayloadJs = buildSpotSubmissionPayload({
      name: "Spot Uji XSS",
      category: "library",
      description: "",
      address: "Jl. Sudirman No. 10",
      district: "",
      city: "Jakarta",
      province: "DKI Jakarta",
      latitude: -6.2088,
      longitude: 106.8456,
      googleMapsUrl: "javascript:alert(1)",
      instagramHandle: "",
      websiteUrl: "",
      openingHoursText: "",
      priceRange: "free",
      noiseLevel: "quiet",
      facilities: {},
    });
    expect(createSpotSubmissionSchema.safeParse(badPayloadJs).success).toBe(
      false,
    );

    const badPayloadDocs = buildSpotSubmissionPayload({
      name: "Spot Uji Domain Asing",
      category: "library",
      description: "",
      address: "Jl. Sudirman No. 10",
      district: "",
      city: "Jakarta",
      province: "DKI Jakarta",
      latitude: -6.2088,
      longitude: 106.8456,
      googleMapsUrl: "https://docs.google.com/document/d/123",
      instagramHandle: "",
      websiteUrl: "",
      openingHoursText: "",
      priceRange: "free",
      noiseLevel: "quiet",
      facilities: {},
    });
    expect(createSpotSubmissionSchema.safeParse(badPayloadDocs).success).toBe(
      false,
    );
  });
});
