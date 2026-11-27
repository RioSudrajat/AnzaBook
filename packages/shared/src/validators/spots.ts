import { z } from "zod";
import { haversineDistanceMeters } from "./community";
import { safeAssetUrlSchema } from "./publisher";

export { haversineDistanceMeters };

export const INDONESIA_BBOX = {
  minLat: -11.5,
  maxLat: 6.5,
  minLng: 94.5,
  maxLng: 141.5,
} as const;

export const spotCategoryValues = [
  "book_cafe",
  "library",
  "tbm",
  "indie_bookstore",
  "reading_lounge",
] as const;
export type SpotCategory = (typeof spotCategoryValues)[number];

export const spotPriceRangeValues = [
  "free",
  "budget",
  "moderate",
  "premium",
] as const;
export type SpotPriceRange = (typeof spotPriceRangeValues)[number];

export const spotNoiseLevelValues = ["quiet", "moderate", "lively"] as const;
export type SpotNoiseLevel = (typeof spotNoiseLevelValues)[number];

export const spotStatusValues = [
  "pending_review",
  "published",
  "rejected",
  "closed",
] as const;
export type SpotStatus = (typeof spotStatusValues)[number];

export const spotSourceValues = [
  "curated",
  "osm",
  "perpusnas",
  "community_submission",
  "store_branch",
] as const;
export type SpotSource = (typeof spotSourceValues)[number];

export const spotVerifiedBadgeValues = ["none", "curated", "partner"] as const;
export type SpotVerifiedBadge = (typeof spotVerifiedBadgeValues)[number];

export const spotReviewTagValues = [
  "colokan_banyak",
  "wifi_stabil",
  "tenang_fokus",
  "koleksi_bagus",
  "kopi_enak",
  "gratis_masuk",
  "nyaman_lama",
] as const;
export type SpotReviewTag = (typeof spotReviewTagValues)[number];

export const spotReportReasonValues = [
  "permanently_closed",
  "wrong_location",
  "wrong_info",
  "duplicate",
  "spam",
  "review_abuse",
] as const;
export type SpotReportReason = (typeof spotReportReasonValues)[number];

export const spotFacilityKeyValues = [
  "wifi",
  "powerOutlets",
  "airConditioned",
  "quietZone",
  "hasBookCollection",
  "outdoorSeating",
  "prayerRoom",
  "parking",
] as const;
export type SpotFacilityKey = (typeof spotFacilityKeyValues)[number];

export const SPOT_CITY_FILTER_ALIASES: Record<string, readonly string[]> = {
  jakarta: [
    "Jakarta",
    "Jakarta Pusat",
    "Jakarta Selatan",
    "Jakarta Timur",
    "Jakarta Barat",
    "Jakarta Utara",
    "DKI Jakarta",
    "Daerah Khusus Ibukota Jakarta",
  ],
  bali: [
    "Bali",
    "Denpasar",
    "Ubud",
    "Gianyar",
    "Badung",
    "Kuta",
    "Canggu",
    "Sanur",
    "Tabanan",
  ],
  yogyakarta: [
    "Yogyakarta",
    "Sleman",
    "Bantul",
    "DI Yogyakarta",
    "Daerah Istimewa Yogyakarta",
  ],
  tangerang: ["Tangerang", "Tangerang Selatan", "BSD", "Serpong"],
};

/**
 * Expands preset region names (such as "Jakarta" and "Bali" from HomeSpotsBanner)
 * into matching Indonesian city/regency names without breaking exact city filters.
 */
export function expandSpotCityFilterValues(city: string): string[] {
  const trimmed = city.trim();
  if (!trimmed) {
    return [];
  }
  const aliases = SPOT_CITY_FILTER_ALIASES[trimmed.toLowerCase()];
  if (!aliases) {
    return [trimmed];
  }
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const candidate of [trimmed, ...aliases]) {
    const key = candidate.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(candidate);
    }
  }
  return merged;
}

export const spotFacilitiesSchema = z
  .object({
    wifi: z.boolean().optional(),
    powerOutlets: z.boolean().optional(),
    airConditioned: z.boolean().optional(),
    quietZone: z.boolean().optional(),
    hasBookCollection: z.boolean().optional(),
    outdoorSeating: z.boolean().optional(),
    prayerRoom: z.boolean().optional(),
    parking: z.boolean().optional(),
  })
  .strict();

const DIRECT_MAPS_HOSTS = new Set([
  "maps.google.com",
  "maps.google.co.id",
  "maps.app.goo.gl",
]);

const PATH_SCOPED_MAPS_HOSTS = new Set([
  "google.com",
  "www.google.com",
  "google.co.id",
  "www.google.co.id",
  "goo.gl",
]);

/**
 * Validates external Google Maps links supplied by community contributors.
 * Strictly prevents SSRF, open redirects, non-Maps Google subdomains, and protocol hijacking.
 * Zero server-side outbound HTTP requests must ever be performed against this URL.
 */
export const googleMapsUrlSchema = z
  .string()
  .trim()
  .max(1000, "Tautan Google Maps terlalu panjang.")
  .url("Tautan harus berupa URL yang valid.")
  .refine(
    (val) => {
      try {
        const parsed = new URL(val);
        if (parsed.protocol !== "https:") {
          return false;
        }

        const hostname = parsed.hostname.toLowerCase();
        if (DIRECT_MAPS_HOSTS.has(hostname)) {
          return true;
        }

        if (PATH_SCOPED_MAPS_HOSTS.has(hostname)) {
          return (
            parsed.pathname === "/maps" || parsed.pathname.startsWith("/maps/")
          );
        }

        return false;
      } catch {
        return false;
      }
    },
    {
      message:
        "Tautan harus berupa URL Google Maps resmi (misal: https://maps.google.com/... atau https://maps.app.goo.gl/...).",
    },
  );

const optionalWebsiteUrlSchema = z
  .string()
  .trim()
  .max(500, "Tautan situs web maksimal 500 karakter.")
  .refine(
    (val) => {
      if (val === "") return true;
      try {
        const parsed = new URL(val);
        return parsed.protocol === "https:" || parsed.protocol === "http:";
      } catch {
        return false;
      }
    },
    { message: "Tautan situs web harus berupa URL HTTP/HTTPS yang valid." },
  );

const optionalTrimmedText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} maksimal ${max} karakter`)
    .transform((val) => (val === "" ? undefined : val))
    .optional();

function normalizeQueryNumberInput(val: unknown): unknown {
  if (val === undefined) {
    return undefined;
  }
  if (val === null || typeof val === "boolean") {
    return Number.NaN;
  }
  if (typeof val === "string") {
    const trimmed = val.trim();
    return trimmed === "" ? undefined : trimmed;
  }
  return val;
}

const optionalQueryNumber = (schema: z.ZodType<number, unknown>) =>
  z.preprocess(normalizeQueryNumberInput, schema.optional());

const defaultedQueryNumber = (
  schema: z.ZodType<number, unknown>,
  defaultValue: number,
) => z.preprocess(normalizeQueryNumberInput, schema.default(defaultValue));

const requiredQueryNumber = (schema: z.ZodType<number, unknown>) =>
  z.preprocess(normalizeQueryNumberInput, schema);

export const listSpotsQuerySchema = z
  .object({
    minLat: optionalQueryNumber(z.coerce.number().min(-90).max(90)),
    maxLat: optionalQueryNumber(z.coerce.number().min(-90).max(90)),
    minLng: optionalQueryNumber(z.coerce.number().min(-180).max(180)),
    maxLng: optionalQueryNumber(z.coerce.number().min(-180).max(180)),
    lat: optionalQueryNumber(z.coerce.number().min(-90).max(90)),
    lng: optionalQueryNumber(z.coerce.number().min(-180).max(180)),
    radiusKm: optionalQueryNumber(z.coerce.number().min(0.5).max(500)),
    city: optionalTrimmedText(100, "Nama kota"),
    province: optionalTrimmedText(100, "Nama provinsi"),
    category: z.enum(spotCategoryValues).optional(),
    facility: z.enum(spotFacilityKeyValues).optional(),
    q: optionalTrimmedText(120, "Kata kunci"),
    sort: z.enum(["nearest", "rating", "popular"]).default("nearest"),
    limit: defaultedQueryNumber(z.coerce.number().int().min(1).max(200), 60),
    offset: defaultedQueryNumber(z.coerce.number().int().min(0), 0),
  })
  .strict()
  .superRefine((data, ctx) => {
    const bboxFields = [data.minLat, data.maxLat, data.minLng, data.maxLng];
    const bboxCount = bboxFields.filter((val) => val !== undefined).length;
    if (bboxCount > 0 && bboxCount < 4) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["minLat"],
        message:
          "Parameter bounding box (minLat, maxLat, minLng, maxLng) harus lengkap.",
      });
    }
    if (
      bboxCount === 4 &&
      (data.minLat! > data.maxLat! || data.minLng! > data.maxLng!)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["minLat"],
        message: "Batas koordinat bounding box tidak valid.",
      });
    }

    if ((data.lat === undefined) !== (data.lng === undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lat"],
        message: "Koordinat lat dan lng harus dikirim berpasangan.",
      });
    }
  });

export const nearbyCheckQuerySchema = z
  .object({
    lat: requiredQueryNumber(z.coerce.number().min(-90).max(90)),
    lng: requiredQueryNumber(z.coerce.number().min(-180).max(180)),
    name: optionalTrimmedText(120, "Nama lokasi"),
    radiusMeters: defaultedQueryNumber(
      z.coerce.number().int().min(20).max(500),
      100,
    ),
  })
  .strict();

export const geocodeSpotsQuerySchema = z
  .object({
    q: z
      .string()
      .trim()
      .min(2, "Kata kunci pencarian lokasi minimal 2 karakter")
      .max(120, "Kata kunci pencarian lokasi maksimal 120 karakter"),
  })
  .strict();

export const createSpotSubmissionSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Nama sudut baca minimal 2 karakter")
      .max(180, "Nama sudut baca maksimal 180 karakter"),
    category: z.enum(spotCategoryValues),
    description: optionalTrimmedText(2000, "Deskripsi"),
    address: z
      .string()
      .trim()
      .min(5, "Alamat lengkap minimal 5 karakter")
      .max(500, "Alamat lengkap maksimal 500 karakter"),
    district: optionalTrimmedText(120, "Kecamatan/kawasan"),
    city: z
      .string()
      .trim()
      .min(2, "Nama kota minimal 2 karakter")
      .max(100, "Nama kota maksimal 100 karakter"),
    province: z
      .string()
      .trim()
      .min(2, "Nama provinsi minimal 2 karakter")
      .max(100, "Nama provinsi maksimal 100 karakter"),
    latitude: z
      .number()
      .min(
        INDONESIA_BBOX.minLat,
        "Koordinat lintang berada di luar wilayah Indonesia",
      )
      .max(
        INDONESIA_BBOX.maxLat,
        "Koordinat lintang berada di luar wilayah Indonesia",
      ),
    longitude: z
      .number()
      .min(
        INDONESIA_BBOX.minLng,
        "Koordinat bujur berada di luar wilayah Indonesia",
      )
      .max(
        INDONESIA_BBOX.maxLng,
        "Koordinat bujur berada di luar wilayah Indonesia",
      ),
    googleMapsUrl: googleMapsUrlSchema.optional().or(z.literal("")),
    googlePlaceId: optionalTrimmedText(128, "Google Place ID"),
    instagramHandle: optionalTrimmedText(80, "Username Instagram"),
    websiteUrl: optionalWebsiteUrlSchema.optional(),
    openingHoursText: optionalTrimmedText(160, "Jam operasional"),
    priceRange: z.enum(spotPriceRangeValues).default("budget"),
    noiseLevel: z.enum(spotNoiseLevelValues).default("moderate"),
    facilities: spotFacilitiesSchema.default({}),
  })
  .strict();

export const upsertSpotReviewSchema = z
  .object({
    rating: z
      .number()
      .int("Rating harus berupa bilangan bulat 1 sampai 5")
      .min(1, "Rating minimal 1 bintang")
      .max(5, "Rating maksimal 5 bintang"),
    content: z
      .string()
      .trim()
      .min(10, "Ulasan minimal 10 karakter")
      .max(1500, "Ulasan maksimal 1500 karakter"),
    tags: z
      .array(z.enum(spotReviewTagValues))
      .max(3, "Pilih maksimal 3 tag suasana baca")
      .refine((arr) => new Set(arr).size === arr.length, {
        message: "Tag suasana baca tidak boleh duplikat",
      })
      .default([]),
  })
  .strict();

export const createSpotReportSchema = z
  .object({
    reasonType: z.enum(spotReportReasonValues),
    reviewId: z.string().uuid("ID ulasan tidak valid").optional(),
    details: z
      .string()
      .trim()
      .min(5, "Detail laporan minimal 5 karakter")
      .max(1000, "Detail laporan maksimal 1000 karakter"),
  })
  .strict();

export const spotModerationActionValues = [
  "approve",
  "reject",
  "mark_closed",
  "reopen",
] as const;
export type SpotModerationAction = (typeof spotModerationActionValues)[number];

export const moderateSpotSchema = z
  .object({
    action: z.enum(spotModerationActionValues),
    rejectionReason: z
      .string()
      .trim()
      .max(1000, "Alasan penolakan maksimal 1000 karakter")
      .optional(),
    verifiedBadge: z.enum(spotVerifiedBadgeValues).optional(),
    name: z.string().trim().min(2).max(180).optional(),
    category: z.enum(spotCategoryValues).optional(),
    description: z.string().trim().max(2000).optional().nullable(),
    address: z.string().trim().min(5).max(500).optional(),
    district: z.string().trim().max(120).optional().nullable(),
    city: z.string().trim().min(2).max(100).optional(),
    province: z.string().trim().min(2).max(100).optional(),
    openingHoursText: z.string().trim().max(160).optional().nullable(),
    priceRange: z.enum(spotPriceRangeValues).optional(),
    noiseLevel: z.enum(spotNoiseLevelValues).optional(),
    facilities: spotFacilitiesSchema.optional(),
    googleMapsUrl: googleMapsUrlSchema.optional().or(z.literal("")).nullable(),
    coverUrl: safeAssetUrlSchema("URL sampul tidak valid")
      .optional()
      .nullable(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (
      data.action === "reject" &&
      (!data.rejectionReason || data.rejectionReason.trim().length < 5)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rejectionReason"],
        message: "Alasan penolakan wajib diisi minimal 5 karakter",
      });
    }
  });

const optionalBooleanQuery = z.preprocess((val) => {
  if (typeof val === "string") {
    const trimmed = val.trim().toLowerCase();
    if (trimmed === "") return undefined;
    if (trimmed === "true") return true;
    if (trimmed === "false") return false;
  }
  return val;
}, z.boolean().optional());

export const listAdminSpotsQuerySchema = z
  .object({
    status: z.enum(spotStatusValues).optional(),
    hasOpenReports: optionalBooleanQuery,
    q: optionalTrimmedText(120, "Kata kunci"),
    limit: defaultedQueryNumber(z.coerce.number().int().min(1).max(100), 50),
    offset: defaultedQueryNumber(z.coerce.number().int().min(0), 0),
  })
  .strict();

export type SpotSortOption = "nearest" | "rating" | "popular";
export type SpotFacilitiesInput = z.infer<typeof spotFacilitiesSchema>;
export type ListSpotsQueryInput = {
  minLat?: number;
  maxLat?: number;
  minLng?: number;
  maxLng?: number;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  city?: string;
  province?: string;
  category?: SpotCategory;
  facility?: SpotFacilityKey;
  q?: string;
  sort?: SpotSortOption;
  limit?: number;
  offset?: number;
};
export type ListSpotsQuery = z.infer<typeof listSpotsQuerySchema>;
export type NearbyCheckQueryInput = {
  lat: number;
  lng: number;
  name?: string;
  radiusMeters?: number;
};
export type NearbyCheckQuery = z.infer<typeof nearbyCheckQuerySchema>;
export type GeocodeSpotsQuery = z.infer<typeof geocodeSpotsQuerySchema>;
export type CreateSpotSubmissionInput = z.input<
  typeof createSpotSubmissionSchema
>;
export type CreateSpotSubmission = z.infer<typeof createSpotSubmissionSchema>;
export type UpsertSpotReviewInput = z.input<typeof upsertSpotReviewSchema>;
export type UpsertSpotReview = z.infer<typeof upsertSpotReviewSchema>;
export type CreateSpotReportInput = z.infer<typeof createSpotReportSchema>;
export type ModerateSpotInput = z.infer<typeof moderateSpotSchema>;
export type ListAdminSpotsQueryInput = {
  status?: SpotStatus;
  hasOpenReports?: boolean;
  q?: string;
  limit?: number;
  offset?: number;
};
export type ListAdminSpotsQuery = z.infer<typeof listAdminSpotsQuerySchema>;
