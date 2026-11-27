import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  calculateNameSimilarity,
  deduplicateSpots,
  normalizeOverpassElement,
} from "../../../../scripts/import-reading-spots.mjs";
import { roleHasPermission } from "@starter/shared/permissions";
import type {
  AdminOverviewDto,
  AdminSpotModerationItemDto,
  ListSpotsResponseDto,
  ReadingSpotDetailDto,
  ReadingSpotReportDto,
  ReadingSpotReviewDto,
  ReadingSpotSummaryDto,
  ReadingSpotUpcomingEventDto,
  SpotCitySummaryDto,
  SpotFacilitiesDto,
  SpotGeocodeResultDto,
  SpotNearbyMatchDto,
} from "@starter/shared/types";
import {
  INDONESIA_BBOX,
  type ListAdminSpotsQueryInput,
  type ListSpotsQueryInput,
  type NearbyCheckQueryInput,
  createSpotReportSchema,
  createSpotSubmissionSchema,
  expandSpotCityFilterValues,
  geocodeSpotsQuerySchema,
  googleMapsUrlSchema,
  haversineDistanceMeters,
  listAdminSpotsQuerySchema,
  listSpotsQuerySchema,
  moderateSpotSchema,
  nearbyCheckQuerySchema,
  spotCategoryValues,
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
      listSpotsQuerySchema.safeParse({ minLat: "-7.0", maxLat: "-6.0" })
        .success,
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

    expect(moderateSpotSchema.safeParse({ action: "reject" }).success).toBe(
      false,
    );

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

  it("ignores empty query strings instead of coercing to (0, 0) and exposes typed *Input interfaces", () => {
    const emptyList = listSpotsQuerySchema.safeParse({
      lat: "",
      lng: "",
      minLat: "",
      maxLat: "",
      minLng: "",
      maxLng: "",
      radiusKm: "",
      limit: "",
      offset: "",
      city: "",
      q: "",
    });
    expect(emptyList.success).toBe(true);
    if (emptyList.success) {
      expect(emptyList.data).toEqual({
        sort: "nearest",
        limit: 60,
        offset: 0,
        lat: undefined,
        lng: undefined,
        minLat: undefined,
        maxLat: undefined,
        minLng: undefined,
        maxLng: undefined,
        radiusKm: undefined,
        city: undefined,
        q: undefined,
      });
    }

    const whitespaceCoords = listSpotsQuerySchema.safeParse({
      lat: "   ",
      lng: "   ",
    });
    expect(whitespaceCoords.success).toBe(true);
    if (whitespaceCoords.success) {
      expect(whitespaceCoords.data.lat).toBeUndefined();
      expect(whitespaceCoords.data.lng).toBeUndefined();
    }

    expect(nearbyCheckQuerySchema.safeParse({ lat: "", lng: "" }).success).toBe(
      false,
    );

    const nearbyDefaultRadius = nearbyCheckQuerySchema.safeParse({
      lat: "-6.2",
      lng: "106.8",
      radiusMeters: "",
    });
    expect(nearbyDefaultRadius.success).toBe(true);
    if (nearbyDefaultRadius.success) {
      expect(nearbyDefaultRadius.data.radiusMeters).toBe(100);
    }

    const adminEmpty = listAdminSpotsQuerySchema.safeParse({
      hasOpenReports: "",
      limit: "",
      offset: "",
    });
    expect(adminEmpty.success).toBe(true);
    if (adminEmpty.success) {
      expect(adminEmpty.data).toEqual({
        limit: 50,
        offset: 0,
        hasOpenReports: undefined,
      });
    }

    const sampleListInput: ListSpotsQueryInput = {
      lat: -6.2,
      lng: 106.8,
      limit: 20,
    };
    const typedLimit: number | undefined = sampleListInput.limit;
    const typedNearbyLat: number = (
      { lat: -6.2, lng: 106.8 } satisfies NearbyCheckQueryInput
    ).lat;
    const typedAdminReports: boolean | undefined = (
      { hasOpenReports: true } satisfies ListAdminSpotsQueryInput
    ).hasOpenReports;
    expect([typedLimit, typedNearbyLat, typedAdminReports]).toEqual([
      20,
      -6.2,
      true,
    ]);
  });
});

describe("Reading Spots RBAC & Shared DTO Contracts (Issue #19)", () => {
  it("grants spots:manage-any strictly to admin role and denies regular user", () => {
    expect(roleHasPermission("user", { spots: ["manage-any"] })).toBe(false);
    expect(roleHasPermission("admin", { spots: ["manage-any"] })).toBe(true);
  });

  it("aligns shared Reading Spots DTO shapes with PR #37 (#22) and staged AdminOverviewDto", () => {
    const facilities: SpotFacilitiesDto = {
      wifi: true,
      powerOutlets: true,
      quietZone: true,
      hasBookCollection: true,
      outdoorSeating: false,
      airConditioned: true,
      prayerRoom: true,
      parking: false,
    };

    const summary: ReadingSpotSummaryDto = {
      id: "spot-1",
      slug: "kineruku-bandung",
      name: "Kineruku",
      category: "book_cafe",
      description: "Perpustakaan dan kedai buku independen.",
      address: "Jl. Hegarmanah No. 52",
      district: "Cidadap",
      city: "Bandung",
      province: "Jawa Barat",
      latitude: -6.8832,
      longitude: 107.6054,
      googleMapsUrl: null,
      googlePlaceId: null,
      instagramHandle: "kineruku",
      websiteUrl: "https://kineruku.com",
      openingHoursText: "Sel-Min 11:30-17:30",
      priceRange: "budget",
      noiseLevel: "quiet",
      facilities,
      coverUrl: null,
      verifiedBadge: "partner",
      linkedBranchId: "branch-1",
      linkedCalendarId: null,
      ratingAvg: 4.8,
      ratingCount: 12,
      bookmarkCount: 5,
      distanceMeters: 1420,
      isBookmarked: false,
    };

    const upcomingEvent: ReadingSpotUpcomingEventDto = {
      id: "evt-1",
      slug: "diskusi-buku-senja",
      title: "Diskusi Buku Senja",
      startAt: "2026-12-01T10:00:00.000Z",
    };

    const review: ReadingSpotReviewDto = {
      id: "rev-1",
      spotId: "spot-1",
      userId: "user-1",
      userName: "Pembaca",
      userUsername: "pembaca",
      userImage: null,
      rating: 5,
      content: "Nyaman sekali untuk membaca berjam-jam.",
      tags: ["tenang_fokus", "koleksi_bagus"],
      helpfulCount: 3,
      createdAt: "2026-11-27T10:00:00.000Z",
      updatedAt: "2026-11-27T10:00:00.000Z",
    };

    const detail: ReadingSpotDetailDto = {
      ...summary,
      linkedBranchName: "Kineruku & Kolektif Buku Hegarmanah",
      linkedCalendarSlug: "lingkar-aksara-bandung",
      linkedCalendarName: "Lingkar Aksara",
      upcomingEvents: [upcomingEvent],
      myReview: review,
      status: "published",
      source: "curated",
    };

    const listResponse: ListSpotsResponseDto = {
      data: [summary],
      meta: { total: 1, limit: 60, offset: 0 },
    };

    const citySummary: SpotCitySummaryDto = {
      city: "Jakarta",
      province: "DKI Jakarta",
      count: 24,
      latitude: -6.2088,
      longitude: 106.8456,
    };

    const nearbyMatch: SpotNearbyMatchDto = {
      id: summary.id,
      slug: summary.slug,
      name: summary.name,
      category: summary.category,
      address: summary.address,
      city: summary.city,
      latitude: summary.latitude,
      longitude: summary.longitude,
      distanceMeters: 42,
      status: "published",
    };

    const geocode: SpotGeocodeResultDto = {
      displayName: "Jl. Hegarmanah, Bandung",
      address: "Jl. Hegarmanah",
      district: "Cidadap",
      city: "Bandung",
      province: "Jawa Barat",
      latitude: -6.8832,
      longitude: 107.6054,
    };

    const report: ReadingSpotReportDto = {
      id: "rep-1",
      spotId: "spot-1",
      reviewId: null,
      reporterUserId: "user-1",
      reporterName: "Pelapor",
      reasonType: "wrong_info",
      details: "Jam buka berubah pada hari Senin.",
      status: "open",
      createdAt: "2026-11-27T10:00:00.000Z",
    };

    const adminItem: AdminSpotModerationItemDto = {
      ...detail,
      submittedByUserId: "user-1",
      submitterName: "Pengusul",
      submitterEmail: "pengusul@example.com",
      openReportsCount: 1,
      recentReports: [report],
      createdAt: "2026-11-27T10:00:00.000Z",
      updatedAt: "2026-11-27T10:00:00.000Z",
    };

    // Staged AdminOverviewDto keeps existing non-spot producers compiling while exposing optional spot counters
    const existingOverview: AdminOverviewDto = {
      pendingCalendarsCount: 1,
      pendingAuthorsCount: 2,
      pendingPublishersCount: 0,
      highRiskDrmEvents24hCount: 0,
      estimatedNakamaRoyaltyPoolIdr: 0,
      totalSinglePurchaseSalesIdr: 0,
      totalPublisherShareIdr: 0,
      totalAffiliateCommissionsIdr: 0,
      totalNetAnzabookIdr: 0,
    };

    expect(detail.upcomingEvents?.[0]?.startAt).toBe(
      "2026-12-01T10:00:00.000Z",
    );
    expect(listResponse.meta.total).toBe(1);
    expect(citySummary.city).toBe("Jakarta");
    expect(nearbyMatch.distanceMeters).toBe(42);
    expect(geocode.city).toBe("Bandung");
    expect(adminItem.openReportsCount).toBe(1);
    expect(existingOverview.pendingSpotsCount).toBeUndefined();
  });
});

describe("OSM Overpass Reading Spots Importer & Deduplicator (Issue #19)", () => {
  it("normalizes valid OSM node and way elements inside Indonesia and rejects outside/unnamed elements", () => {
    const libraryNode = normalizeOverpassElement({
      type: "node",
      id: 123456789,
      lat: -6.9147,
      lon: 107.6098,
      tags: {
        amenity: "library",
        name: "Perpustakaan Daerah Bandung",
        "addr:street": "Jl. Wastukencana",
        "addr:housenumber": "11",
        "addr:city": "Bandung",
        "addr:state": "Jawa Barat",
        internet_access: "wlan",
        opening_hours: "Mo-Fr 08:00-16:00",
        air_conditioning: "yes",
      },
    });

    expect(libraryNode).not.toBeNull();
    expect(libraryNode).toMatchObject({
      slug: "perpustakaan-daerah-bandung-bandung",
      name: "Perpustakaan Daerah Bandung",
      category: "library",
      city: "Bandung",
      province: "Jawa Barat",
      address: "Jl. Wastukencana No. 11",
      source: "osm",
      externalSourceId: "osm:node/123456789",
      priceRange: "free",
      facilities: {
        wifi: true,
        airConditioned: true,
        hasBookCollection: true,
      },
    });

    const bookCafeWay = normalizeOverpassElement({
      type: "way",
      id: 987654321,
      center: { lat: -7.7956, lon: 110.3695 },
      tags: {
        shop: "books",
        cafe: "yes",
        name: "Kedai Aksara Jogja",
        "addr:city": "Yogyakarta",
        "addr:state": "DI Yogyakarta",
      },
    });

    expect(bookCafeWay).not.toBeNull();
    expect(bookCafeWay?.category).toBe("book_cafe");
    expect(bookCafeWay?.externalSourceId).toBe("osm:way/987654321");

    // Outside INDONESIA_BBOX (Tokyo) -> null
    expect(
      normalizeOverpassElement({
        type: "node",
        id: 555,
        lat: 35.6762,
        lon: 139.6503,
        tags: { amenity: "library", name: "Tokyo Library" },
      }),
    ).toBeNull();

    // Missing name -> null
    expect(
      normalizeOverpassElement({
        type: "node",
        id: 556,
        lat: -6.2,
        lon: 106.8,
        tags: { amenity: "library" },
      }),
    ).toBeNull();
  });

  it("deduplicates spots within 50m or within 150m with similar names while preserving distinct spots >= 200m apart", () => {
    expect(
      calculateNameSimilarity("Kineruku", "Kineruku Bookshop"),
    ).toBeGreaterThanOrEqual(0.5);

    const existing = [
      {
        slug: "kineruku-bandung",
        name: "Kineruku",
        latitude: -6.8775,
        longitude: 107.5991,
        city: "Bandung",
      },
    ];

    const incoming = [
      // ~20m away with completely different name -> still duplicate (<50m)
      {
        slug: "spot-dekat-sekali",
        name: "Teras Baca Hegarmanah",
        latitude: -6.8776,
        longitude: 107.5992,
        city: "Bandung",
      },
      // ~110m away with similar name -> duplicate (<=150m + fuzzy name)
      {
        slug: "kineruku-library-bandung",
        name: "Kineruku Library & Bookshop",
        latitude: -6.8784,
        longitude: 107.5991,
        city: "Bandung",
      },
      // ~350m away with different name -> preserved
      {
        slug: "rooma-baca-cidadap",
        name: "Rooma Baca Cidadap",
        latitude: -6.8806,
        longitude: 107.5991,
        city: "Bandung",
      },
    ];

    const { accepted, skipped } = deduplicateSpots(incoming, existing);
    expect(accepted.map((s) => s.slug)).toEqual(["rooma-baca-cidadap"]);
    expect(skipped).toHaveLength(2);
  });

  it("avoids false-positive name similarity on shared Indonesian locality tokens", () => {
    expect(
      calculateNameSimilarity("Kineruku", "Kineruku Library & Bookshop"),
    ).toBeGreaterThanOrEqual(0.6);
    expect(
      calculateNameSimilarity("Kafe Buku Tebet", "Perpustakaan Umum Tebet"),
    ).toBeLessThan(0.6);
    expect(
      calculateNameSimilarity("Toko Buku Bandung", "Taman Baca Bandung"),
    ).toBeLessThan(0.6);
    expect(
      calculateNameSimilarity(
        "Kafe Buku Cibaduyut",
        "Perpustakaan Umum Cibaduyut",
      ),
    ).toBeLessThan(0.6);

    const existing = [
      {
        slug: "kafe-buku-tebet",
        name: "Kafe Buku Tebet",
        latitude: -6.2297,
        longitude: 106.8548,
        city: "Jakarta",
      },
    ];
    const incoming = [
      {
        slug: "perpus-umum-tebet",
        name: "Perpustakaan Umum Tebet",
        latitude: -6.2305, // ~89m away (>= 50m, <= 150m)
        longitude: 106.8548,
        city: "Jakarta",
      },
    ];

    const { accepted, skipped } = deduplicateSpots(incoming, existing);
    expect(accepted.map((s) => s.slug)).toEqual(["perpus-umum-tebet"]);
    expect(skipped).toHaveLength(0);
  });
});

describe("Curated Indonesia Reading Spots Seed Dataset (Issue #19)", () => {
  type RawSeedSpot = {
    slug: string;
    name: string;
    category: string;
    description?: string | null;
    address: string;
    district?: string | null;
    city: string;
    province: string;
    latitude: number;
    longitude: number;
    googleMapsUrl?: string | null;
    googlePlaceId?: string | null;
    instagramHandle?: string | null;
    websiteUrl?: string | null;
    openingHoursText?: string | null;
    priceRange: string;
    noiseLevel: string;
    facilities: Record<string, boolean>;
    source: string;
    externalSourceId?: string | null;
    verifiedBadge: string;
  };

  it("contains >= 100 valid, deduplicated Indonesian reading spots across >= 12 cities and all 5 categories", () => {
    const seedPath = resolve(
      import.meta.dirname,
      "../db/seeds/reading-spots.json",
    );
    const dataset = JSON.parse(readFileSync(seedPath, "utf8")) as RawSeedSpot[];

    expect(dataset.length).toBeGreaterThanOrEqual(100);

    const slugs = new Set<string>();
    const cities = new Set<string>();
    const categories = new Set<string>();

    for (const item of dataset) {
      expect(slugs.has(item.slug), `Duplicate slug: ${item.slug}`).toBe(false);
      slugs.add(item.slug);
      cities.add(item.city);
      categories.add(item.category);

      const parsed = createSpotSubmissionSchema.safeParse({
        name: item.name,
        category: item.category,
        description: item.description ?? undefined,
        address: item.address,
        district: item.district ?? undefined,
        city: item.city,
        province: item.province,
        latitude: item.latitude,
        longitude: item.longitude,
        googleMapsUrl: item.googleMapsUrl ?? undefined,
        googlePlaceId: item.googlePlaceId ?? undefined,
        instagramHandle: item.instagramHandle ?? undefined,
        websiteUrl: item.websiteUrl ?? undefined,
        openingHoursText: item.openingHoursText ?? undefined,
        priceRange: item.priceRange,
        noiseLevel: item.noiseLevel,
        facilities: item.facilities,
      });
      expect(
        parsed.success,
        `Invalid seed entry "${item.slug}": ${parsed.success ? "" : JSON.stringify(parsed.error.issues)}`,
      ).toBe(true);

      if (item.googleMapsUrl) {
        expect(googleMapsUrlSchema.safeParse(item.googleMapsUrl).success).toBe(
          true,
        );
      }
    }

    // Must cover all 7 PR #37 preset cities plus >= 5 more Indonesian cities (>= 12 total)
    expect(cities.size).toBeGreaterThanOrEqual(12);
    for (const presetCity of [
      "Jakarta",
      "Bandung",
      "Yogyakarta",
      "Surabaya",
      "Bali",
      "Medan",
      "Makassar",
    ]) {
      expect(
        cities.has(presetCity),
        `Missing PR #37 preset city: ${presetCity}`,
      ).toBe(true);
    }

    for (const category of spotCategoryValues) {
      expect(categories.has(category), `Missing category: ${category}`).toBe(
        true,
      );
    }

    // Verify no duplicate spots within 50m inside curated dataset itself
    for (let i = 0; i < dataset.length; i++) {
      for (let j = i + 1; j < dataset.length; j++) {
        const a = dataset[i]!;
        const b = dataset[j]!;
        const dist = haversineDistanceMeters(
          a.latitude,
          a.longitude,
          b.latitude,
          b.longitude,
        );
        expect(
          dist,
          `Curated spots "${a.slug}" and "${b.slug}" are only ${dist}m apart`,
        ).toBeGreaterThanOrEqual(50);
      }
    }
  });

  it("imports reading-spots.json statically in seed-spots.ts so tsup bundles dist/migrate.js without ENOENT", () => {
    const seedSpotsSource = readFileSync(
      resolve(import.meta.dirname, "../db/seed-spots.ts"),
      "utf8",
    );
    expect(seedSpotsSource).toMatch(
      /from\s+["']\.\/seeds\/reading-spots\.json["']\s+with\s+\{\s*type:\s*["']json["']\s*\}/,
    );
    expect(seedSpotsSource).not.toMatch(/\breadFileSync\b/);
  });
});
