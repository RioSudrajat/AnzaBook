import {
  googleMapsUrlSchema,
  haversineDistanceMeters,
} from "@starter/shared/validators/spots";
import { safeExternalHref } from "../../lib/safe-url";
import {
  INDONESIA_BBOX,
  INDONESIA_CITY_PRESETS,
  type CreateSpotSubmissionInput,
  type ReadingSpotSummaryDto,
  type SavedSpotRegion,
  type SpotCategory,
  type SpotFacilitiesDto,
  type SpotNoiseLevel,
  type SpotPriceRange,
  type SpotReportReason,
  type SpotReviewTag,
  type SpotStatus,
  type SpotSubmissionFormDraft,
  type SpotVerifiedBadge,
} from "./types";

export const SPOT_REGION_STORAGE_KEY = "anzabook_spot_region";

export const SPOT_CATEGORY_LABELS: Record<SpotCategory, string> = {
  book_cafe: "Kafe Buku",
  library: "Perpustakaan",
  tbm: "TBM",
  indie_bookstore: "Toko Buku Indie",
  reading_lounge: "Ruang Baca",
};

export const SPOT_CATEGORY_STYLES: Record<
  SpotCategory,
  {
    label: string;
    shortLabel: string;
    colorHex: string;
    symbol: string;
  }
> = {
  book_cafe: {
    label: "Kafe Buku",
    shortLabel: "Kafe",
    colorHex: "#D97706",
    symbol: "coffee",
  },
  library: {
    label: "Perpustakaan",
    shortLabel: "Perpus",
    colorHex: "#2563EB",
    symbol: "library",
  },
  tbm: {
    label: "TBM",
    shortLabel: "TBM",
    colorHex: "#0D9488",
    symbol: "tbm",
  },
  indie_bookstore: {
    label: "Toko Buku Indie",
    shortLabel: "Toko Indie",
    colorHex: "#C2410C",
    symbol: "store",
  },
  reading_lounge: {
    label: "Ruang Baca",
    shortLabel: "Lounge",
    colorHex: "#4F46E5",
    symbol: "lounge",
  },
};

export const PARTNER_SPOT_COLOR_HEX = "#F06A24";

const PRICE_RANGE_LABELS: Record<SpotPriceRange, string> = {
  free: "Gratis",
  budget: "Terjangkau",
  moderate: "Menengah",
  premium: "Premium",
};

const NOISE_LEVEL_LABELS: Record<SpotNoiseLevel, string> = {
  quiet: "Tenang",
  moderate: "Sedang",
  lively: "Ramai",
};

export const FACILITY_CHIP_ORDER: ReadonlyArray<{
  key: keyof SpotFacilitiesDto;
  label: string;
}> = [
  { key: "wifi", label: "Wi-Fi" },
  { key: "powerOutlets", label: "Colokan" },
  { key: "airConditioned", label: "AC" },
  { key: "quietZone", label: "Zona Tenang" },
  { key: "hasBookCollection", label: "Koleksi Buku" },
  { key: "outdoorSeating", label: "Outdoor" },
  { key: "prayerRoom", label: "Mushola" },
  { key: "parking", label: "Parkir" },
];

export function sanitizeExternalHttpUrl(
  rawUrl: string | null | undefined,
): string | null {
  return safeExternalHref(rawUrl);
}

export function buildGoogleMapsDirectionsUrl(
  spot: Pick<ReadingSpotSummaryDto, "latitude" | "longitude" | "googlePlaceId">,
): string {
  const base = `https://www.google.com/maps/dir/?api=1&destination=${spot.latitude},${spot.longitude}`;
  if (spot.googlePlaceId && spot.googlePlaceId.trim().length > 0) {
    return `${base}&destination_place_id=${encodeURIComponent(spot.googlePlaceId.trim())}`;
  }
  return base;
}

export function buildGoogleMapsPlaceUrl(
  spot: Pick<ReadingSpotSummaryDto, "googleMapsUrl" | "name" | "city">,
): string {
  if (spot.googleMapsUrl) {
    const parsed = googleMapsUrlSchema.safeParse(spot.googleMapsUrl);
    if (parsed.success) {
      return parsed.data;
    }
  }
  const query = `${spot.name} ${spot.city}`.trim();
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function clampMapBounds(bounds: {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}): {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
} {
  const minLat = Math.max(-90, Math.min(90, bounds.minLat));
  const maxLat = Math.max(-90, Math.min(90, bounds.maxLat));
  const lngSpan = bounds.maxLng - bounds.minLng;
  const minLng =
    lngSpan >= 360 ? -180 : Math.max(-180, Math.min(180, bounds.minLng));
  const maxLng =
    lngSpan >= 360 ? 180 : Math.max(-180, Math.min(180, bounds.maxLng));
  return {
    minLat: Math.min(minLat, maxLat),
    maxLat: Math.max(minLat, maxLat),
    minLng: Math.min(minLng, maxLng),
    maxLng: Math.max(minLng, maxLng),
  };
}

export function formatDistanceMeters(
  meters: number | null | undefined,
): string | null {
  if (meters == null || !Number.isFinite(meters) || meters < 0) {
    return null;
  }
  if (meters < 1000) {
    const rounded =
      meters >= 20 ? Math.round(meters / 10) * 10 : Math.round(meters);
    return `${rounded} m`;
  }
  const km = (meters / 1000).toFixed(1).replace(".", ",");
  return `${km} km`;
}

export function formatSpotCategory(category: SpotCategory): string {
  return SPOT_CATEGORY_LABELS[category];
}

export function formatPriceRange(priceRange: SpotPriceRange): string {
  return PRICE_RANGE_LABELS[priceRange];
}

export function formatNoiseLevel(noiseLevel: SpotNoiseLevel): string {
  return NOISE_LEVEL_LABELS[noiseLevel];
}

export function formatVerifiedBadge(badge: SpotVerifiedBadge): string | null {
  if (badge === "partner") return "Mitra AnzaBook";
  if (badge === "curated") return "Terkurasi";
  return null;
}

export function getActiveFacilityChips(
  facilities: SpotFacilitiesDto | null | undefined,
): Array<{ key: keyof SpotFacilitiesDto; label: string }> {
  if (!facilities) {
    return [];
  }
  return FACILITY_CHIP_ORDER.filter(({ key }) => facilities[key] === true);
}

export type SpotGeoJsonFeature = {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
  properties: {
    id: string;
    slug: string;
    name: string;
    category: SpotCategory;
    isPartner: boolean;
    verifiedBadge: SpotVerifiedBadge;
    ratingAvg: number;
    markerColor: string;
  };
};

export type SpotGeoJsonCollection = {
  type: "FeatureCollection";
  features: SpotGeoJsonFeature[];
};

export function spotsToGeoJson(
  spots: readonly ReadingSpotSummaryDto[],
): SpotGeoJsonCollection {
  return {
    type: "FeatureCollection",
    features: spots.map((spot) => {
      const isPartner =
        spot.verifiedBadge === "partner" || Boolean(spot.linkedBranchId);
      const markerColor = isPartner
        ? PARTNER_SPOT_COLOR_HEX
        : SPOT_CATEGORY_STYLES[spot.category].colorHex;
      return {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [spot.longitude, spot.latitude],
        },
        properties: {
          id: spot.id,
          slug: spot.slug,
          name: spot.name,
          category: spot.category,
          isPartner,
          verifiedBadge: spot.verifiedBadge,
          ratingAvg: spot.ratingAvg,
          markerColor,
        },
      };
    }),
  };
}

export function isWithinIndonesiaBbox(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= INDONESIA_BBOX.minLat &&
    lat <= INDONESIA_BBOX.maxLat &&
    lng >= INDONESIA_BBOX.minLng &&
    lng <= INDONESIA_BBOX.maxLng
  );
}

export function serializeSavedSpotRegion(region: SavedSpotRegion): string {
  return JSON.stringify(region);
}

export function parseSavedSpotRegion(
  raw: string | null | undefined,
): SavedSpotRegion | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<SavedSpotRegion>;
    if (
      !parsed ||
      typeof parsed.city !== "string" ||
      !parsed.city.trim() ||
      typeof parsed.lat !== "number" ||
      typeof parsed.lng !== "number" ||
      typeof parsed.zoom !== "number" ||
      (parsed.source !== "preset" && parsed.source !== "geolocation") ||
      !isWithinIndonesiaBbox(parsed.lat, parsed.lng)
    ) {
      return null;
    }
    return {
      city: parsed.city.trim(),
      lat: parsed.lat,
      lng: parsed.lng,
      zoom: Math.min(18, Math.max(4, parsed.zoom)),
      source: parsed.source,
    };
  } catch {
    return null;
  }
}

export function findNearestIndonesianCityPreset(lat: number, lng: number) {
  let nearest = INDONESIA_CITY_PRESETS[0]!;
  let minDistance = Number.POSITIVE_INFINITY;
  for (const preset of INDONESIA_CITY_PRESETS) {
    const distance = haversineDistanceMeters(lat, lng, preset.lat, preset.lng);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = preset;
    }
  }
  return { preset: nearest, distanceMeters: minDistance };
}

export type CityCameraTarget = {
  city: string;
  lat: number;
  lng: number;
  zoom: number;
};

export function resolveCityCameraTarget(
  cityName: string,
  citiesData?: ReadonlyArray<{
    city: string;
    latitude: number | null;
    longitude: number | null;
  }>,
): CityCameraTarget | null {
  const normalized = cityName.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const preset = INDONESIA_CITY_PRESETS.find(
    (item) => item.city.toLowerCase() === normalized,
  );
  if (preset) {
    return {
      city: preset.city,
      lat: preset.lat,
      lng: preset.lng,
      zoom: preset.zoom,
    };
  }

  const cityMatch = (citiesData ?? []).find(
    (item) => item.city.toLowerCase() === normalized,
  );
  if (
    cityMatch &&
    typeof cityMatch.latitude === "number" &&
    typeof cityMatch.longitude === "number" &&
    isWithinIndonesiaBbox(cityMatch.latitude, cityMatch.longitude)
  ) {
    return {
      city: cityMatch.city,
      lat: cityMatch.latitude,
      lng: cityMatch.longitude,
      zoom: 12,
    };
  }

  return null;
}

export function calculateDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  return haversineDistanceMeters(lat1, lng1, lat2, lng2);
}

export function hasViewportShiftedSignificantly(
  prev: { lat: number; lng: number; zoom: number },
  next: { lat: number; lng: number; zoom: number },
): boolean {
  if (Math.abs(prev.zoom - next.zoom) >= 1.5) {
    return true;
  }
  const distanceMeters = haversineDistanceMeters(
    prev.lat,
    prev.lng,
    next.lat,
    next.lng,
  );
  return distanceMeters >= 1500;
}

export type PreviewCanvasPin = {
  id: string;
  slug: string;
  name: string;
  category: SpotCategory;
  isPartner: boolean;
  x: number;
  y: number;
};

export function projectSpotsToPreviewCanvas(
  spots: readonly ReadingSpotSummaryDto[],
  center: { lat: number; lng: number },
): PreviewCanvasPin[] {
  if (spots.length === 0) {
    return [];
  }

  let minLat = center.lat;
  let maxLat = center.lat;
  let minLng = center.lng;
  let maxLng = center.lng;

  for (const spot of spots) {
    if (spot.latitude < minLat) minLat = spot.latitude;
    if (spot.latitude > maxLat) maxLat = spot.latitude;
    if (spot.longitude < minLng) minLng = spot.longitude;
    if (spot.longitude > maxLng) maxLng = spot.longitude;
  }

  const latSpan = maxLat - minLat;
  const lngSpan = maxLng - minLng;
  const effectiveSpan = Math.max(latSpan, lngSpan);

  if (effectiveSpan < 1e-6) {
    return spots.map((spot, index) => {
      const offset = index === 0 ? 0 : ((index % 5) - 2) * 4;
      return {
        id: spot.id,
        slug: spot.slug,
        name: spot.name,
        category: spot.category,
        isPartner:
          spot.verifiedBadge === "partner" || Boolean(spot.linkedBranchId),
        x: Math.min(88, Math.max(12, 50 + offset)),
        y: Math.min(82, Math.max(18, 50 - offset)),
      };
    });
  }

  const midLat = (minLat + maxLat) / 2;
  const midLng = (minLng + maxLng) / 2;

  return spots.map((spot) => {
    const normalizedX = (spot.longitude - midLng) / effectiveSpan;
    const normalizedY = (midLat - spot.latitude) / effectiveSpan;
    const x = Math.min(
      88,
      Math.max(12, Math.round((50 + normalizedX * 68) * 10) / 10),
    );
    const y = Math.min(
      82,
      Math.max(18, Math.round((50 + normalizedY * 56) * 10) / 10),
    );
    return {
      id: spot.id,
      slug: spot.slug,
      name: spot.name,
      category: spot.category,
      isPartner:
        spot.verifiedBadge === "partner" || Boolean(spot.linkedBranchId),
      x,
      y,
    };
  });
}

export const SPOT_REVIEW_TAG_LABELS: Record<SpotReviewTag, string> = {
  colokan_banyak: "Colokan banyak",
  wifi_stabil: "Wi-Fi stabil",
  tenang_fokus: "Tenang untuk fokus",
  koleksi_bagus: "Banyak koleksi buku",
  kopi_enak: "Kopi/minuman enak",
  gratis_masuk: "Gratis masuk",
  nyaman_lama: "Nyaman berlama-lama",
};

export const SPOT_REPORT_REASON_LABELS: Record<SpotReportReason, string> = {
  permanently_closed: "Tempat tutup permanen",
  wrong_location: "Pin atau alamat tidak sesuai",
  wrong_info: "Jam buka / informasi salah",
  duplicate: "Duplikat sudut baca lain",
  spam: "Spam atau bukan ruang baca",
  review_abuse: "Ulasan tidak pantas / spam",
};

export const SPOT_STATUS_META: Record<
  SpotStatus,
  {
    label: string;
    tone: "pending" | "published" | "rejected" | "closed";
  }
> = {
  pending_review: { label: "Menunggu Kurasi", tone: "pending" },
  published: { label: "Tayang", tone: "published" },
  rejected: { label: "Ditolak", tone: "rejected" },
  closed: { label: "Tutup", tone: "closed" },
};

export const SPOT_PRICE_RANGE_OPTIONS: ReadonlyArray<{
  value: SpotPriceRange;
  label: string;
  hint: string;
}> = [
  { value: "free", label: "Gratis", hint: "Tanpa biaya masuk" },
  { value: "budget", label: "Terjangkau", hint: "< Rp50rb" },
  { value: "moderate", label: "Menengah", hint: "Rp50rb–Rp100rb" },
  { value: "premium", label: "Premium", hint: "> Rp100rb" },
];

export const SPOT_NOISE_LEVEL_OPTIONS: ReadonlyArray<{
  value: SpotNoiseLevel;
  label: string;
  hint: string;
}> = [
  { value: "quiet", label: "Tenang", hint: "Cocok untuk fokus penuh" },
  { value: "moderate", label: "Sedang", hint: "Nyaman dengan obrolan ringan" },
  { value: "lively", label: "Ramai", hint: "Hidup dan sosial" },
];

export function toggleVibeTagSelection(
  current: readonly SpotReviewTag[],
  tag: SpotReviewTag,
  maxTags = 3,
): SpotReviewTag[] {
  if (current.includes(tag)) {
    return current.filter((item) => item !== tag);
  }
  if (current.length >= maxTags) {
    return [...current];
  }
  return [...current, tag];
}

export function calculateRatingPercent(count: number, total: number): number {
  if (!Number.isFinite(count) || !Number.isFinite(total) || total <= 0) {
    return 0;
  }
  return Math.min(100, Math.max(0, Math.round((count / total) * 100)));
}

export function clampIndonesiaCoordinate(
  lat: number,
  lng: number,
): { lat: number; lng: number; wasClamped: boolean } {
  const safeLat = Number.isFinite(lat) ? lat : -6.2088;
  const safeLng = Number.isFinite(lng) ? lng : 106.8456;
  const clampedLat = Math.min(
    INDONESIA_BBOX.maxLat,
    Math.max(INDONESIA_BBOX.minLat, safeLat),
  );
  const clampedLng = Math.min(
    INDONESIA_BBOX.maxLng,
    Math.max(INDONESIA_BBOX.minLng, safeLng),
  );
  return {
    lat: Number(clampedLat.toFixed(6)),
    lng: Number(clampedLng.toFixed(6)),
    wasClamped: clampedLat !== safeLat || clampedLng !== safeLng,
  };
}

type ApiErrorLike = {
  status?: unknown;
  code?: unknown;
  message?: unknown;
  details?: unknown;
};

export function formatSpotApiError(
  error: unknown,
  fallback = "Terjadi kendala saat menghubungi server. Silakan coba lagi.",
): string {
  if (error && typeof error === "object") {
    const candidate = error as ApiErrorLike;
    if (Array.isArray(candidate.details) && candidate.details.length > 0) {
      const firstDetail = candidate.details[0] as
        { field?: unknown; message?: unknown } | undefined;
      if (
        firstDetail &&
        typeof firstDetail.message === "string" &&
        firstDetail.message.trim().length > 0
      ) {
        return firstDetail.message.trim();
      }
    }
    if (
      typeof candidate.message === "string" &&
      candidate.message.trim().length > 0
    ) {
      return candidate.message.trim();
    }
  }
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message.trim();
  }
  return fallback;
}

export function buildSpotSubmissionPayload(
  draft: SpotSubmissionFormDraft,
): CreateSpotSubmissionInput {
  const trimOptional = (value: string): string | undefined => {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  };

  const normalizedInstagram = trimOptional(draft.instagramHandle)?.replace(
    /^@+/,
    "",
  );
  const googleMapsUrl = trimOptional(draft.googleMapsUrl);
  const websiteUrl = trimOptional(draft.websiteUrl);

  return {
    name: draft.name.trim(),
    category: draft.category,
    description: trimOptional(draft.description),
    address: draft.address.trim(),
    district: trimOptional(draft.district),
    city: draft.city.trim(),
    province: draft.province.trim(),
    latitude: Number(draft.latitude),
    longitude: Number(draft.longitude),
    ...(googleMapsUrl !== undefined ? { googleMapsUrl } : {}),
    ...(normalizedInstagram ? { instagramHandle: normalizedInstagram } : {}),
    ...(websiteUrl !== undefined ? { websiteUrl } : {}),
    openingHoursText: trimOptional(draft.openingHoursText),
    priceRange: draft.priceRange,
    noiseLevel: draft.noiseLevel,
    facilities: draft.facilities,
  };
}
