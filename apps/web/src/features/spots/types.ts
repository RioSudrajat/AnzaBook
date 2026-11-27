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

export const spotVerifiedBadgeValues = ["none", "curated", "partner"] as const;
export type SpotVerifiedBadge = (typeof spotVerifiedBadgeValues)[number];

export const INDONESIA_BBOX = {
  minLat: -11.5,
  maxLat: 6.5,
  minLng: 94.5,
  maxLng: 141.5,
} as const;

export const INDONESIA_DEFAULT_VIEW = {
  lat: -6.2088,
  lng: 106.8456,
  zoom: 11,
  city: "Jakarta",
} as const;

export type SpotCityPreset = {
  city: string;
  province: string;
  lat: number;
  lng: number;
  zoom: number;
};

export const INDONESIA_CITY_PRESETS: readonly SpotCityPreset[] = [
  {
    city: "Jakarta",
    province: "DKI Jakarta",
    lat: -6.2088,
    lng: 106.8456,
    zoom: 11,
  },
  {
    city: "Bandung",
    province: "Jawa Barat",
    lat: -6.9175,
    lng: 107.6191,
    zoom: 12,
  },
  {
    city: "Yogyakarta",
    province: "DI Yogyakarta",
    lat: -7.7956,
    lng: 110.3695,
    zoom: 12,
  },
  {
    city: "Surabaya",
    province: "Jawa Timur",
    lat: -7.2575,
    lng: 112.7521,
    zoom: 11,
  },
  {
    city: "Bali",
    province: "Bali",
    lat: -8.6705,
    lng: 115.2126,
    zoom: 11,
  },
  {
    city: "Medan",
    province: "Sumatera Utara",
    lat: 3.5952,
    lng: 98.6722,
    zoom: 11,
  },
  {
    city: "Makassar",
    province: "Sulawesi Selatan",
    lat: -5.1477,
    lng: 119.4327,
    zoom: 11,
  },
] as const;

export type SpotFacilitiesDto = {
  wifi?: boolean;
  powerOutlets?: boolean;
  airConditioned?: boolean;
  quietZone?: boolean;
  hasBookCollection?: boolean;
  outdoorSeating?: boolean;
  prayerRoom?: boolean;
  parking?: boolean;
};

export type ReadingSpotSummaryDto = {
  id: string;
  slug: string;
  name: string;
  category: SpotCategory;
  description: string | null;
  address: string;
  district: string | null;
  city: string;
  province: string | null;
  latitude: number;
  longitude: number;
  googleMapsUrl: string | null;
  googlePlaceId: string | null;
  instagramHandle: string | null;
  websiteUrl: string | null;
  openingHoursText: string | null;
  priceRange: SpotPriceRange;
  noiseLevel: SpotNoiseLevel;
  facilities: SpotFacilitiesDto;
  coverUrl: string | null;
  verifiedBadge: SpotVerifiedBadge;
  linkedBranchId: string | null;
  linkedCalendarId: string | null;
  ratingAvg: number;
  ratingCount: number;
  bookmarkCount: number;
  distanceMeters?: number | null;
  isBookmarked?: boolean;
};

export type ReadingSpotUpcomingEventDto = {
  id: string;
  slug: string;
  title: string;
  startAt: string;
};

export type ReadingSpotDetailDto = ReadingSpotSummaryDto & {
  linkedBranchName?: string | null;
  linkedCalendarSlug?: string | null;
  linkedCalendarName?: string | null;
  upcomingEvents?: ReadingSpotUpcomingEventDto[];
};

export type SpotCitySummaryDto = {
  city: string;
  province?: string | null;
  count: number;
  latitude?: number;
  longitude?: number;
};

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
  facility?: keyof SpotFacilitiesDto;
  q?: string;
  sort?: "nearest" | "rating" | "popular";
  limit?: number;
  offset?: number;
};

export type ListSpotsResponseDto = {
  data: ReadingSpotSummaryDto[];
  meta: {
    total: number;
    limit?: number;
    offset?: number;
  };
};

export type SavedSpotRegion = {
  city: string;
  lat: number;
  lng: number;
  zoom: number;
  source: "preset" | "geolocation";
};
