export type {
  ListSpotsResponseDto,
  ReadingSpotDetailDto,
  ReadingSpotReportDto,
  ReadingSpotReviewDto,
  ReadingSpotSummaryDto,
  ReadingSpotUpcomingEventDto,
  SpotCategory,
  SpotCitySummaryDto,
  SpotFacilitiesDto,
  SpotGeocodeResultDto,
  SpotNearbyMatchDto,
  SpotNoiseLevel,
  SpotPriceRange,
  SpotReportReason,
  SpotReviewTag,
  SpotSource,
  SpotStatus,
  SpotVerifiedBadge,
} from "@starter/shared/types";

export {
  INDONESIA_BBOX,
  spotCategoryValues,
  spotFacilityKeyValues,
  spotModerationActionValues,
  spotNoiseLevelValues,
  spotPriceRangeValues,
  spotReportReasonValues,
  spotReviewTagValues,
  spotStatusValues,
  spotVerifiedBadgeValues,
  type CreateSpotReportInput,
  type CreateSpotSubmissionInput,
  type ListSpotsQueryInput,
  type NearbyCheckQueryInput,
  type SpotFacilityKey,
  type SpotModerationAction,
  type UpsertSpotReviewInput,
} from "@starter/shared/validators/spots";

import type {
  ReadingSpotDetailDto,
  ReadingSpotReviewDto,
  ReadingSpotSummaryDto,
  SpotCategory,
  SpotFacilitiesDto,
  SpotNoiseLevel,
  SpotPriceRange,
  SpotReviewTag,
} from "@starter/shared/types";

export type SpotReviewsSummaryDto = {
  ratingAvg: number;
  ratingCount: number;
  distribution: Record<number, number>;
  tagCounts: Partial<Record<SpotReviewTag, number>>;
};

export type SpotReviewsResponseDto = {
  data: ReadingSpotReviewDto[];
  meta: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  summary: SpotReviewsSummaryDto;
};

export type UpsertSpotReviewResponseDto = {
  review: ReadingSpotReviewDto;
  ratingAvg: number;
  ratingCount: number;
};

export type MySpotActivityDto = {
  submissions: ReadingSpotDetailDto[];
  bookmarks: ReadingSpotSummaryDto[];
};

export type SpotSubmissionFormDraft = {
  name: string;
  category: SpotCategory;
  description: string;
  address: string;
  district: string;
  city: string;
  province: string;
  latitude: number;
  longitude: number;
  googleMapsUrl: string;
  instagramHandle: string;
  websiteUrl: string;
  openingHoursText: string;
  priceRange: SpotPriceRange;
  noiseLevel: SpotNoiseLevel;
  facilities: SpotFacilitiesDto;
};

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

export type SavedSpotRegion = {
  city: string;
  lat: number;
  lng: number;
  zoom: number;
  source: "preset" | "geolocation";
};
