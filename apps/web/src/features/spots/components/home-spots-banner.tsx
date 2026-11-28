import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Crosshair, Loader2, MapPin, Navigation, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSpotCities, useSpots } from "../hooks";
import {
  PARTNER_SPOT_COLOR_HEX,
  SPOT_CATEGORY_STYLES,
  findNearestIndonesianCityPreset,
  formatDistanceMeters,
  formatSpotCategory,
  formatVerifiedBadge,
  isWithinIndonesiaBbox,
  projectSpotsToPreviewCanvas,
} from "../spots-helpers";
import {
  INDONESIA_CITY_PRESETS,
  INDONESIA_DEFAULT_VIEW,
  expandSpotCityFilterValues,
} from "../types";
import { useSpotRegion } from "../use-spot-region";

export function HomeSpotsBanner() {
  const [region, setRegion] = useSpotRegion();
  const [isLocating, setIsLocating] = useState(false);
  const [locationNotice, setLocationNotice] = useState<{
    tone: "info" | "error";
    text: string;
  } | null>(null);

  const { data: citiesData } = useSpotCities();
  const { data: spotsData, isLoading } = useSpots({
    lat: region.lat,
    lng: region.lng,
    radiusKm: region.source === "geolocation" ? 25 : undefined,
    city: region.source === "preset" ? region.city : undefined,
    sort: "nearest",
    limit: 5,
  });

  const spots = spotsData?.data ?? [];
  const totalSpots = spotsData?.meta?.total ?? spots.length;
  const previewPins = projectSpotsToPreviewCanvas(spots, {
    lat: region.lat,
    lng: region.lng,
  });

  const cityCounts = new Map<string, number>();
  for (const preset of INDONESIA_CITY_PRESETS) {
    const aliasSet = new Set(
      expandSpotCityFilterValues(preset.city).map((name) => name.toLowerCase()),
    );
    let totalForPreset = 0;
    for (const item of citiesData ?? []) {
      if (
        aliasSet.has(item.city.toLowerCase()) ||
        (item.province && aliasSet.has(item.province.toLowerCase()))
      ) {
        totalForPreset += item.count;
      }
    }
    cityCounts.set(preset.city.toLowerCase(), totalForPreset);
  }

  const handleSelectCityPreset = (
    preset: (typeof INDONESIA_CITY_PRESETS)[number],
  ) => {
    setLocationNotice(null);
    setRegion({
      city: preset.city,
      lat: preset.lat,
      lng: preset.lng,
      zoom: preset.zoom,
      source: "preset",
    });
  };

  const handleUseMyLocation = () => {
    if (
      typeof navigator === "undefined" ||
      !("geolocation" in navigator) ||
      typeof navigator.geolocation.getCurrentPosition !== "function"
    ) {
      setLocationNotice({
        tone: "error",
        text: "Peramban ini belum mendukung geolokasi. Pilih salah satu kota di atas.",
      });
      return;
    }

    setIsLocating(true);
    setLocationNotice(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const lat = Number(position.coords.latitude.toFixed(5));
        const lng = Number(position.coords.longitude.toFixed(5));

        if (!isWithinIndonesiaBbox(lat, lng)) {
          setRegion({
            city: INDONESIA_DEFAULT_VIEW.city,
            lat: INDONESIA_DEFAULT_VIEW.lat,
            lng: INDONESIA_DEFAULT_VIEW.lng,
            zoom: INDONESIA_DEFAULT_VIEW.zoom,
            source: "preset",
          });
          setLocationNotice({
            tone: "info",
            text: "Lokasi di luar jangkauan Indonesia. Menampilkan area default Jakarta.",
          });
          return;
        }

        const { preset, distanceMeters } = findNearestIndonesianCityPreset(
          lat,
          lng,
        );
        const cityLabel =
          distanceMeters <= 45_000
            ? `${preset.city} (Lokasimu)`
            : "Sekitar Lokasimu";

        setRegion({
          city: cityLabel,
          lat,
          lng,
          zoom: 13,
          source: "geolocation",
        });
        setLocationNotice({
          tone: "info",
          text: `Koordinat diperbarui ke ${lat.toFixed(3)}, ${lng.toFixed(3)}.`,
        });
      },
      (err) => {
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationNotice({
            tone: "error",
            text: "Izin lokasi ditolak. Pilih kota di atas untuk melihat sudut baca.",
          });
        } else {
          setLocationNotice({
            tone: "error",
            text: "Lokasi gagal dideteksi tepat waktu. Pilih kota secara manual.",
          });
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 60_000,
      },
    );
  };

  return (
    <section
      aria-labelledby="spots-banner-heading"
      className="rounded-xl border border-border bg-card overflow-hidden"
    >
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="p-5 sm:p-6 flex flex-col justify-between gap-5">
          <div className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2.5">
              <h2
                id="spots-banner-heading"
                className="font-serif text-xl sm:text-2xl font-bold text-foreground leading-tight"
              >
                Sudut Baca di sekitar {region.city}
              </h2>
              <span className="inline-flex items-center rounded-md border border-border bg-[var(--color-paper-2)] px-2.5 py-1 font-mono text-xs tabular-nums text-foreground shrink-0">
                {isLoading
                  ? "Memuat area..."
                  : totalSpots > 0
                    ? `${totalSpots} sudut baca`
                    : "Peta siap dibuka"}
              </span>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">
              Temukan kafe buku, perpustakaan umum, taman bacaan masyarakat, dan
              toko buku independen dengan rute langsung ke Google Maps.
            </p>

            <div
              className="flex flex-wrap gap-2 pt-1"
              role="group"
              aria-label="Pilih kota Indonesia"
            >
              {INDONESIA_CITY_PRESETS.map((preset) => {
                const isSelected =
                  region.source === "preset" &&
                  region.city.toLowerCase() === preset.city.toLowerCase();
                const count = cityCounts.get(preset.city.toLowerCase());
                return (
                  <button
                    key={preset.city}
                    type="button"
                    onClick={() => handleSelectCityPreset(preset)}
                    aria-pressed={isSelected}
                    className={`min-h-11 inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring ${
                      isSelected
                        ? "border-foreground bg-foreground text-background font-semibold"
                        : "border-border bg-background text-muted-foreground hover:text-foreground hover:border-foreground/30"
                    }`}
                  >
                    <span>{preset.city}</span>
                    {typeof count === "number" && count > 0 && (
                      <span className="font-mono text-[11px] tabular-nums opacity-75">
                        ({count})
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                asChild
                className="min-h-11 bg-[var(--color-accent)] text-[var(--color-accent-ink)] hover:opacity-90 font-semibold"
              >
                <Link
                  to="/spots"
                  search={{
                    lat: region.lat,
                    lng: region.lng,
                    z: region.zoom,
                    city: region.source === "preset" ? region.city : undefined,
                  }}
                >
                  <MapPin className="size-4" aria-hidden="true" />
                  Buka Peta Sudut Baca
                </Link>
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleUseMyLocation}
                disabled={isLocating}
                aria-busy={isLocating}
                className="min-h-11"
              >
                {isLocating ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Crosshair className="size-4" aria-hidden="true" />
                )}
                <span>
                  {isLocating ? "Mendeteksi lokasi..." : "Gunakan Lokasi Saya"}
                </span>
              </Button>
            </div>

            {locationNotice && (
              <p
                role={locationNotice.tone === "error" ? "alert" : "status"}
                className={`text-xs font-medium ${
                  locationNotice.tone === "error"
                    ? "text-[var(--color-error)]"
                    : "text-muted-foreground"
                }`}
              >
                {locationNotice.text}
              </p>
            )}
          </div>
        </div>

        <div className="border-t lg:border-t-0 lg:border-l border-border bg-[var(--color-paper-2)] p-4 sm:p-5 flex flex-col justify-between gap-4">
          <div
            className="relative h-44 w-full rounded-lg border border-border overflow-hidden bg-background"
            aria-label={`Pratinjau sebaran sudut baca ${region.city}`}
          >
            <svg
              className="absolute inset-0 size-full text-[var(--color-grid)]"
              aria-hidden="true"
            >
              <defs>
                <pattern
                  id="anzabook-map-grid"
                  width="28"
                  height="28"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 28 0 L 0 0 0 28"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="0.75"
                  />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#anzabook-map-grid)" />
              <line
                x1="50%"
                y1="0"
                x2="50%"
                y2="100%"
                stroke="var(--color-rule)"
                strokeDasharray="3 4"
                strokeWidth="1"
              />
              <line
                x1="0"
                y1="50%"
                x2="100%"
                y2="50%"
                stroke="var(--color-rule)"
                strokeDasharray="3 4"
                strokeWidth="1"
              />
            </svg>

            <div className="absolute top-2.5 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
              <span className="rounded bg-background/90 border border-border px-2 py-0.5 font-mono text-[11px] tabular-nums text-foreground">
                {region.lat.toFixed(2)}, {region.lng.toFixed(2)}
              </span>
              <span className="rounded bg-background/90 border border-border px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                Pratinjau Peta
              </span>
            </div>

            {previewPins.length > 0 ? (
              previewPins.map((pin) => {
                const colorHex = pin.isPartner
                  ? PARTNER_SPOT_COLOR_HEX
                  : SPOT_CATEGORY_STYLES[pin.category].colorHex;
                return (
                  <Link
                    key={pin.id}
                    to="/spots"
                    search={{
                      spot: pin.slug,
                      lat: region.lat,
                      lng: region.lng,
                      z: region.zoom,
                      city:
                        region.source === "preset" ? region.city : undefined,
                    }}
                    aria-label={`Lihat ${pin.name} di peta`}
                    title={pin.name}
                    style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                    className="group absolute -translate-x-1/2 -translate-y-1/2 size-11 flex items-center justify-center focus-visible:outline-2 focus-visible:outline-ring rounded-full"
                  >
                    <span
                      className="size-4 rounded-full border-2 border-background shadow-sm transition-transform group-hover:scale-125"
                      style={{ backgroundColor: colorHex }}
                    />
                  </Link>
                );
              })
            ) : (
              <div className="absolute inset-0 flex items-center justify-center p-4 text-center">
                <div className="rounded-lg border border-dashed border-border bg-background/90 px-3.5 py-2.5 max-w-xs">
                  <p className="text-xs font-medium text-foreground">
                    {isLoading
                      ? `Mencari sudut baca di ${region.city}...`
                      : `Peta interaktif siap dibuka untuk ${region.city}`}
                  </p>
                </div>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-2" aria-label="Memuat daftar sudut baca">
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="h-11 rounded-lg border border-border/70 bg-background animate-pulse"
                />
              ))}
            </div>
          ) : spots.length > 0 ? (
            <ul className="ruled-index" aria-label="Sudut baca terdekat">
              {spots.slice(0, 4).map((spot) => {
                const distanceLabel = formatDistanceMeters(spot.distanceMeters);
                const verifiedLabel = formatVerifiedBadge(spot.verifiedBadge);
                return (
                  <li key={spot.id}>
                    <Link
                      to="/spots"
                      search={{
                        spot: spot.slug,
                        lat: spot.latitude,
                        lng: spot.longitude,
                        z: 14,
                        city: spot.city,
                      }}
                      className="min-h-11 py-2.5 flex items-center justify-between gap-3 group hover:text-[var(--color-accent-text)] focus-visible:outline-2 focus-visible:outline-ring rounded-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-serif text-sm font-bold text-foreground truncate group-hover:text-[var(--color-accent-text)]">
                            {spot.name}
                          </span>
                          {verifiedLabel && (
                            <span
                              className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                                spot.verifiedBadge === "partner"
                                  ? "bg-[var(--color-accent-soft)] text-foreground border border-[var(--color-accent)]/40"
                                  : "bg-[var(--color-green-soft)] text-[var(--color-green)] border border-[var(--color-green)]/30"
                              }`}
                            >
                              {verifiedLabel}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {formatSpotCategory(spot.category)} ·{" "}
                          {spot.district ? `${spot.district}, ` : ""}
                          {spot.city}
                        </p>
                      </div>

                      <div className="shrink-0 flex items-center gap-2.5 font-mono text-xs tabular-nums text-muted-foreground">
                        {spot.ratingCount > 0 && (
                          <span className="inline-flex items-center gap-1 text-foreground">
                            <Star
                              className="size-3.5 text-[var(--color-accent)]"
                              aria-hidden="true"
                            />
                            {spot.ratingAvg.toFixed(1)}
                          </span>
                        )}
                        {distanceLabel && (
                          <span className="inline-flex items-center gap-1">
                            <Navigation className="size-3" aria-hidden="true" />
                            {distanceLabel}
                          </span>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-border bg-background/70 px-3.5 py-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Belum ada data sudut baca tersinkronisasi untuk{" "}
                <span className="font-semibold text-foreground">
                  {region.city}
                </span>
                . Kamu tetap bisa membuka peta penuh.
              </p>
              <Link
                to="/spots"
                search={{
                  lat: region.lat,
                  lng: region.lng,
                  z: region.zoom,
                  city: region.source === "preset" ? region.city : undefined,
                }}
                className="shrink-0 min-h-11 inline-flex items-center px-2.5 text-xs font-semibold text-[var(--color-accent-text)] hover:underline focus-visible:outline-2 focus-visible:outline-ring rounded-sm"
              >
                Lihat Peta
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
