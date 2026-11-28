export {
  INDONESIA_BBOX,
  expandSpotCityFilterValues,
  googleMapsUrlSchema,
  spotCategoryValues,
  spotFacilityKeyValues,
  spotNoiseLevelValues,
  spotPriceRangeValues,
  spotStatusValues,
  spotVerifiedBadgeValues,
  type ListSpotsQueryInput,
  type SpotCategory,
  type SpotFacilityKey,
  type SpotNoiseLevel,
  type SpotPriceRange,
  type SpotStatus,
  type SpotVerifiedBadge,
} from "@starter/shared/validators/spots";

export type {
  ListSpotsResponseDto,
  ReadingSpotDetailDto,
  ReadingSpotReviewDto,
  ReadingSpotSummaryDto,
  ReadingSpotUpcomingEventDto,
  SpotCitySummaryDto,
  SpotFacilitiesDto,
} from "@starter/shared/types";

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
