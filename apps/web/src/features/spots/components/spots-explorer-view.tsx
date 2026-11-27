import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  MapPin,
  Navigation,
  RotateCcw,
  Search,
  Star,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSpotCities, useSpotDetail, useSpots } from "../hooks";
import {
  FACILITY_CHIP_ORDER,
  SPOT_CATEGORY_LABELS,
  buildGoogleMapsDirectionsUrl,
  formatDistanceMeters,
  formatSpotCategory,
  formatVerifiedBadge,
  getActiveFacilityChips,
  hasViewportShiftedSignificantly,
  isWithinIndonesiaBbox,
} from "../spots-helpers";
import {
  INDONESIA_CITY_PRESETS,
  INDONESIA_DEFAULT_VIEW,
  spotCategoryValues,
  type ListSpotsQueryInput,
  type ReadingSpotSummaryDto,
  type SpotCategory,
  type SpotFacilitiesDto,
} from "../types";
import { useSpotRegion } from "../use-spot-region";
import {
  ReadingSpotsMap,
  type MapBoundsPayload,
  type MapCameraRequest,
} from "./reading-spots-map";
import { SpotDetailPanel } from "./spot-detail-panel";

export type SpotsSearchParams = {
  lat?: number;
  lng?: number;
  z?: number;
  spot?: string;
  category?: SpotCategory;
  city?: string;
  facility?: keyof SpotFacilitiesDto;
  q?: string;
};

type SpotsExplorerViewProps = {
  search: SpotsSearchParams;
  onUpdateSearch: (
    patch: Partial<SpotsSearchParams>,
    options?: { replace?: boolean },
  ) => void;
};

type MobileSheetState = "collapsed" | "half" | "expanded";

export function SpotsExplorerView({
  search,
  onUpdateSearch,
}: SpotsExplorerViewProps) {
  const [savedRegion, setSavedRegion] = useSpotRegion();
  const [searchDraft, setSearchDraft] = useState(search.q ?? "");
  const [appliedBbox, setAppliedBbox] = useState<{
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  } | null>(null);
  const [pendingViewport, setPendingViewport] =
    useState<MapBoundsPayload | null>(null);
  const [cameraRequest, setCameraRequest] = useState<MapCameraRequest | null>(
    null,
  );
  const [sheetState, setSheetState] = useState<MobileSheetState>(
    search.spot ? "half" : "collapsed",
  );
  const [isLocating, setIsLocating] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<{
    tone: "info" | "error";
    text: string;
  } | null>(null);

  const initialCenter = useMemo(
    () => ({
      lat:
        typeof search.lat === "number" && Number.isFinite(search.lat)
          ? search.lat
          : savedRegion.lat,
      lng:
        typeof search.lng === "number" && Number.isFinite(search.lng)
          ? search.lng
          : savedRegion.lng,
      zoom:
        typeof search.z === "number" && Number.isFinite(search.z)
          ? search.z
          : savedRegion.zoom,
    }),
    // Intentional mount-only baseline for uncontrolled MapLibre viewport initialization.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [lastQueriedCenter, setLastQueriedCenter] = useState(initialCenter);

  const queryParams: ListSpotsQueryInput = useMemo(
    () => ({
      lat: search.lat ?? savedRegion.lat,
      lng: search.lng ?? savedRegion.lng,
      minLat: appliedBbox?.minLat,
      maxLat: appliedBbox?.maxLat,
      minLng: appliedBbox?.minLng,
      maxLng: appliedBbox?.maxLng,
      city: search.city,
      category: search.category,
      facility: search.facility,
      q: search.q,
      sort: appliedBbox ? "rating" : "nearest",
      limit: 60,
    }),
    [
      appliedBbox,
      savedRegion.lat,
      savedRegion.lng,
      search.category,
      search.city,
      search.facility,
      search.lat,
      search.lng,
      search.q,
    ],
  );

  const { data: spotsResponse, isLoading, isFetching } = useSpots(queryParams);
  const { data: citiesData } = useSpotCities();
  const { data: detailSpot, isLoading: isDetailLoading } = useSpotDetail(
    search.spot ?? "",
  );

  const spots = useMemo(() => spotsResponse?.data ?? [], [spotsResponse?.data]);
  const totalSpots = spotsResponse?.meta?.total ?? spots.length;

  const selectedSlug = search.spot ?? "";
  const listMatchedSpot = useMemo(
    () => spots.find((item) => item.slug === selectedSlug) ?? null,
    [selectedSlug, spots],
  );
  const activeSpot = detailSpot ?? listMatchedSpot;

  const showSearchAreaButton = Boolean(
    pendingViewport &&
    hasViewportShiftedSignificantly(lastQueriedCenter, {
      lat: pendingViewport.centerLat,
      lng: pendingViewport.centerLng,
      zoom: pendingViewport.zoom,
    }),
  );

  const hasActiveFilters = Boolean(
    search.q ||
    search.category ||
    search.city ||
    search.facility ||
    appliedBbox,
  );

  const requestCameraMove = (lat: number, lng: number, zoom: number) => {
    setCameraRequest((prev) => ({
      lat,
      lng,
      zoom,
      seq: (prev?.seq ?? 0) + 1,
    }));
  };

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = searchDraft.trim();
    onUpdateSearch({ q: trimmed || undefined }, { replace: true });
  };

  const handleSelectCity = (cityName: string | undefined) => {
    setGpsStatus(null);
    setAppliedBbox(null);
    setPendingViewport(null);

    if (!cityName) {
      onUpdateSearch({ city: undefined, spot: undefined }, { replace: true });
      return;
    }

    const preset = INDONESIA_CITY_PRESETS.find(
      (item) => item.city.toLowerCase() === cityName.toLowerCase(),
    );
    if (preset) {
      setSavedRegion({
        city: preset.city,
        lat: preset.lat,
        lng: preset.lng,
        zoom: preset.zoom,
        source: "preset",
      });
      setLastQueriedCenter({
        lat: preset.lat,
        lng: preset.lng,
        zoom: preset.zoom,
      });
      requestCameraMove(preset.lat, preset.lng, preset.zoom);
      onUpdateSearch(
        {
          city: preset.city,
          lat: preset.lat,
          lng: preset.lng,
          z: preset.zoom,
          spot: undefined,
        },
        { replace: true },
      );
      return;
    }

    onUpdateSearch({ city: cityName, spot: undefined }, { replace: true });
  };

  const handleSelectSpot = (slug: string) => {
    const matched = spots.find((item) => item.slug === slug);
    if (matched) {
      requestCameraMove(matched.latitude, matched.longitude, 15);
    }
    setSheetState("half");
    onUpdateSearch({ spot: slug });
  };

  const handleCloseDetail = () => {
    onUpdateSearch({ spot: undefined });
  };

  const handleSearchThisArea = () => {
    if (!pendingViewport) return;
    setAppliedBbox({
      minLat: pendingViewport.minLat,
      maxLat: pendingViewport.maxLat,
      minLng: pendingViewport.minLng,
      maxLng: pendingViewport.maxLng,
    });
    setLastQueriedCenter({
      lat: pendingViewport.centerLat,
      lng: pendingViewport.centerLng,
      zoom: pendingViewport.zoom,
    });
    setPendingViewport(null);
    onUpdateSearch(
      {
        lat: Number(pendingViewport.centerLat.toFixed(5)),
        lng: Number(pendingViewport.centerLng.toFixed(5)),
        z: Math.round(pendingViewport.zoom),
        city: undefined,
      },
      { replace: true },
    );
  };

  const handleResetFilters = () => {
    setSearchDraft("");
    setAppliedBbox(null);
    setPendingViewport(null);
    setGpsStatus(null);
    setLastQueriedCenter(INDONESIA_DEFAULT_VIEW);
    requestCameraMove(
      INDONESIA_DEFAULT_VIEW.lat,
      INDONESIA_DEFAULT_VIEW.lng,
      INDONESIA_DEFAULT_VIEW.zoom,
    );
    onUpdateSearch(
      {
        q: undefined,
        category: undefined,
        city: undefined,
        facility: undefined,
        spot: undefined,
        lat: INDONESIA_DEFAULT_VIEW.lat,
        lng: INDONESIA_DEFAULT_VIEW.lng,
        z: INDONESIA_DEFAULT_VIEW.zoom,
      },
      { replace: true },
    );
  };

  const handleRequestMyLocation = () => {
    if (
      typeof navigator === "undefined" ||
      !("geolocation" in navigator) ||
      typeof navigator.geolocation.getCurrentPosition !== "function"
    ) {
      setGpsStatus({
        tone: "error",
        text: "Peramban ini tidak mendukung geolokasi.",
      });
      return;
    }

    setIsLocating(true);
    setGpsStatus(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const lat = Number(position.coords.latitude.toFixed(5));
        const lng = Number(position.coords.longitude.toFixed(5));
        if (!isWithinIndonesiaBbox(lat, lng)) {
          setGpsStatus({
            tone: "info",
            text: "Lokasi di luar wilayah Indonesia. Menampilkan Jakarta.",
          });
          requestCameraMove(
            INDONESIA_DEFAULT_VIEW.lat,
            INDONESIA_DEFAULT_VIEW.lng,
            INDONESIA_DEFAULT_VIEW.zoom,
          );
          return;
        }
        setAppliedBbox(null);
        setSavedRegion({
          city: "Lokasiku",
          lat,
          lng,
          zoom: 14,
          source: "geolocation",
        });
        setLastQueriedCenter({ lat, lng, zoom: 14 });
        requestCameraMove(lat, lng, 14);
        onUpdateSearch(
          { lat, lng, z: 14, city: undefined, spot: undefined },
          { replace: true },
        );
        setGpsStatus({
          tone: "info",
          text: `Dipusatkan ke ${lat.toFixed(3)}, ${lng.toFixed(3)}.`,
        });
      },
      () => {
        setIsLocating(false);
        setGpsStatus({
          tone: "error",
          text: "Izin lokasi ditolak atau timeout. Pilih kota secara manual.",
        });
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    );
  };

  const cycleSheetState = () => {
    setSheetState((prev) =>
      prev === "collapsed"
        ? "half"
        : prev === "half"
          ? "expanded"
          : "collapsed",
    );
  };

  const cityChoices = useMemo(() => {
    const presetNames = new Set(
      INDONESIA_CITY_PRESETS.map((preset) => preset.city.toLowerCase()),
    );
    const extras = (citiesData ?? [])
      .filter((item) => !presetNames.has(item.city.toLowerCase()))
      .map((item) => item.city);
    return [...INDONESIA_CITY_PRESETS.map((p) => p.city), ...extras];
  }, [citiesData]);

  const sheetTranslateClass =
    sheetState === "expanded"
      ? "translate-y-0"
      : sheetState === "half"
        ? "translate-y-[38dvh]"
        : "translate-y-[calc(78dvh-72px)]";

  return (
    <div className="flex-1 min-h-0 flex flex-col lg:grid lg:grid-cols-[410px_minmax(0,1fr)] relative overflow-hidden">
      <aside
        aria-label="Daftar dan penyaring sudut baca"
        className="hidden lg:flex lg:flex-col min-h-0 border-r border-border bg-background"
      >
        {!selectedSlug ? (
          <>
            <div className="p-4 border-b border-border space-y-3 shrink-0">
              <form
                onSubmit={handleSearchSubmit}
                role="search"
                aria-label="Cari sudut baca"
                className="flex items-center gap-2"
              >
                <div className="relative flex-1 min-w-0">
                  <label htmlFor="spots-search-desktop" className="sr-only">
                    Cari sudut baca, kota, atau alamat
                  </label>
                  <Search
                    className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id="spots-search-desktop"
                    type="search"
                    value={searchDraft}
                    onChange={(event) => {
                      const next = event.target.value;
                      setSearchDraft(next);
                      if (next === "") {
                        onUpdateSearch({ q: undefined }, { replace: true });
                      }
                    }}
                    placeholder="Cari kafe buku, perpus, kota..."
                    className="w-full min-h-11 rounded-lg border border-border bg-[var(--color-paper-2)] pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
                  />
                </div>
                <Button
                  type="submit"
                  variant="outline"
                  className="min-h-11 px-3"
                >
                  Cari
                </Button>
              </form>

              <div
                className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none"
                role="group"
                aria-label="Filter kategori sudut baca"
              >
                <button
                  type="button"
                  onClick={() =>
                    onUpdateSearch({ category: undefined }, { replace: true })
                  }
                  aria-pressed={!search.category}
                  className={`min-h-11 shrink-0 rounded-lg border px-3 text-xs font-medium cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-ring ${
                    !search.category
                      ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-foreground font-semibold"
                      : "border-border bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Semua
                </button>
                {spotCategoryValues.map((cat) => {
                  const active = search.category === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() =>
                        onUpdateSearch(
                          { category: active ? undefined : cat },
                          { replace: true },
                        )
                      }
                      aria-pressed={active}
                      className={`min-h-11 shrink-0 rounded-lg border px-3 text-xs font-medium cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-ring ${
                        active
                          ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-foreground font-semibold"
                          : "border-border bg-background text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {SPOT_CATEGORY_LABELS[cat]}
                    </button>
                  );
                })}
              </div>

              <div
                className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none"
                role="group"
                aria-label="Filter fasilitas kenyamanan"
              >
                {FACILITY_CHIP_ORDER.map(({ key, label }) => {
                  const active = search.facility === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() =>
                        onUpdateSearch(
                          { facility: active ? undefined : key },
                          { replace: true },
                        )
                      }
                      aria-pressed={active}
                      className={`min-h-11 shrink-0 rounded-md border px-2.5 text-xs cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-ring ${
                        active
                          ? "border-foreground bg-foreground text-background font-semibold"
                          : "border-border bg-[var(--color-paper-2)] text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <label
                    htmlFor="spots-city-select"
                    className="text-xs font-mono text-muted-foreground shrink-0"
                  >
                    Kota:
                  </label>
                  <select
                    id="spots-city-select"
                    value={search.city ?? ""}
                    onChange={(event) =>
                      handleSelectCity(event.target.value || undefined)
                    }
                    className="h-11 flex-1 min-w-0 rounded-lg border border-border bg-background px-2.5 text-xs font-medium text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <option value="">Sekitar tampilan peta</option>
                    {cityChoices.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                </div>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="min-h-11 inline-flex items-center gap-1 px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer rounded-lg focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <RotateCcw className="size-3.5" aria-hidden="true" />
                    Reset
                  </button>
                )}
              </div>

              {gpsStatus && (
                <p
                  role={gpsStatus.tone === "error" ? "alert" : "status"}
                  className={`text-xs font-medium ${
                    gpsStatus.tone === "error"
                      ? "text-[var(--color-error)]"
                      : "text-muted-foreground"
                  }`}
                >
                  {gpsStatus.text}
                </p>
              )}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
              <div className="flex items-center justify-between gap-2 pb-2.5">
                <h2 className="font-serif text-base font-bold text-foreground">
                  {search.city
                    ? `Sudut Baca di ${search.city}`
                    : "Daftar Sudut Baca"}
                </h2>
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  {isFetching ? "Menyegarkan..." : `${totalSpots} hasil`}
                </span>
              </div>

              <SpotListBody
                spots={spots}
                isLoading={isLoading}
                selectedSlug={selectedSlug}
                hasActiveFilters={hasActiveFilters}
                onSelectSpot={handleSelectSpot}
                onResetFilters={handleResetFilters}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto p-4">
            {activeSpot ? (
              <SpotDetailPanel spot={activeSpot} onClose={handleCloseDetail} />
            ) : isDetailLoading ? (
              <div
                className="space-y-3 py-4"
                aria-label="Memuat detail sudut baca"
              >
                <div className="h-11 w-36 rounded-lg bg-muted animate-pulse" />
                <div className="h-44 rounded-xl bg-muted animate-pulse" />
                <div className="h-24 rounded-xl bg-muted animate-pulse" />
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border p-5 space-y-3 text-center">
                <p className="text-sm font-medium text-foreground">
                  Detail sudut baca belum tersedia atau sudah dipindahkan.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDetail}
                  className="min-h-11"
                >
                  Kembali ke daftar
                </Button>
              </div>
            )}
          </div>
        )}
      </aside>

      <div className="relative flex-1 min-h-0 h-full">
        <div className="lg:hidden absolute top-3 inset-x-3 z-20 flex flex-col gap-2 pointer-events-none">
          <div className="pointer-events-auto rounded-xl border border-border bg-background/95 p-2 shadow-md backdrop-blur-md space-y-2">
            <form
              onSubmit={handleSearchSubmit}
              role="search"
              aria-label="Cari sudut baca di ponsel"
              className="flex items-center gap-1.5"
            >
              <div className="relative flex-1 min-w-0">
                <label htmlFor="spots-search-mobile" className="sr-only">
                  Cari sudut baca atau kota
                </label>
                <Search
                  className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="spots-search-mobile"
                  type="search"
                  value={searchDraft}
                  onChange={(event) => {
                    const next = event.target.value;
                    setSearchDraft(next);
                    if (next === "") {
                      onUpdateSearch({ q: undefined }, { replace: true });
                    }
                  }}
                  placeholder="Cari sudut baca, kota..."
                  className="w-full min-h-11 rounded-lg border border-border bg-[var(--color-paper-2)] pl-9 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
                />
                {searchDraft && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchDraft("");
                      onUpdateSearch({ q: undefined }, { replace: true });
                    }}
                    aria-label="Bersihkan kata kunci"
                    className="size-11 absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                )}
              </div>
              <Button type="submit" size="sm" className="min-h-11 px-3">
                Cari
              </Button>
            </form>

            <div
              className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none"
              role="group"
              aria-label="Filter cepat kategori"
            >
              <button
                type="button"
                onClick={() =>
                  onUpdateSearch({ category: undefined }, { replace: true })
                }
                aria-pressed={!search.category}
                className={`min-h-11 shrink-0 rounded-lg border px-3 text-xs font-medium cursor-pointer ${
                  !search.category
                    ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-foreground font-semibold"
                    : "border-border bg-background text-muted-foreground"
                }`}
              >
                Semua
              </button>
              {spotCategoryValues.map((cat) => {
                const active = search.category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() =>
                      onUpdateSearch(
                        { category: active ? undefined : cat },
                        { replace: true },
                      )
                    }
                    aria-pressed={active}
                    className={`min-h-11 shrink-0 rounded-lg border px-3 text-xs font-medium cursor-pointer ${
                      active
                        ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-foreground font-semibold"
                        : "border-border bg-background text-muted-foreground"
                    }`}
                  >
                    {SPOT_CATEGORY_LABELS[cat]}
                  </button>
                );
              })}
            </div>
          </div>

          {showSearchAreaButton && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleSearchThisArea}
                className="pointer-events-auto min-h-11 inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/95 px-4 py-2 text-xs font-semibold text-foreground shadow-md backdrop-blur-sm cursor-pointer"
              >
                <Search
                  className="size-3.5 text-[var(--color-accent)]"
                  aria-hidden="true"
                />
                <span>Cari di area ini</span>
              </button>
            </div>
          )}
        </div>

        <ReadingSpotsMap
          spots={spots}
          selectedSpotSlug={selectedSlug}
          initialCenter={initialCenter}
          cameraRequest={cameraRequest}
          onSelectSpot={handleSelectSpot}
          onViewportChange={setPendingViewport}
          showSearchAreaButton={showSearchAreaButton}
          onSearchThisArea={handleSearchThisArea}
          onRequestMyLocation={handleRequestMyLocation}
          isLocating={isLocating}
          isFetching={isFetching}
          bottomControlsOffsetClass={
            sheetState === "collapsed"
              ? "bottom-24 lg:bottom-4"
              : "bottom-[42dvh] lg:bottom-4"
          }
        />

        <section
          aria-label="Panel daftar dan detail sudut baca"
          className={`lg:hidden absolute inset-x-0 bottom-0 z-20 h-[78dvh] flex flex-col rounded-t-2xl border-t border-border bg-background shadow-2xl pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] transition-transform duration-200 ease-out ${sheetTranslateClass}`}
        >
          <div className="h-[72px] shrink-0 px-4 flex items-center justify-between gap-2 border-b border-border">
            <button
              type="button"
              onClick={cycleSheetState}
              aria-expanded={sheetState !== "collapsed"}
              className="min-h-11 flex-1 min-w-0 flex flex-col justify-center text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-ring rounded-lg px-1"
            >
              <span
                className="w-10 h-1 rounded-full bg-border mx-auto mb-1.5"
                aria-hidden="true"
              />
              <span className="font-serif text-sm font-bold text-foreground truncate">
                {activeSpot
                  ? activeSpot.name
                  : `${totalSpots} sudut baca${search.city ? ` di ${search.city}` : ""}`}
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                setSheetState((prev) =>
                  prev === "collapsed" ? "half" : "collapsed",
                )
              }
              aria-label={
                sheetState === "collapsed"
                  ? "Buka panel daftar sudut baca"
                  : "Tutup panel daftar sudut baca"
              }
              className="size-11 shrink-0 rounded-lg border border-border bg-[var(--color-paper-2)] flex items-center justify-center text-foreground cursor-pointer focus-visible:outline-2 focus-visible:outline-ring"
            >
              {sheetState === "collapsed" ? (
                <ChevronUp className="size-4" aria-hidden="true" />
              ) : (
                <ChevronDown className="size-4" aria-hidden="true" />
              )}
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
            {selectedSlug && activeSpot ? (
              <SpotDetailPanel spot={activeSpot} onClose={handleCloseDetail} />
            ) : (
              <SpotListBody
                spots={spots}
                isLoading={isLoading}
                selectedSlug={selectedSlug}
                hasActiveFilters={hasActiveFilters}
                onSelectSpot={handleSelectSpot}
                onResetFilters={handleResetFilters}
              />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

type SpotListBodyProps = {
  spots: ReadingSpotSummaryDto[];
  isLoading: boolean;
  selectedSlug: string;
  hasActiveFilters: boolean;
  onSelectSpot: (slug: string) => void;
  onResetFilters: () => void;
};

function SpotListBody({
  spots,
  isLoading,
  selectedSlug,
  hasActiveFilters,
  onSelectSpot,
  onResetFilters,
}: SpotListBodyProps) {
  if (isLoading) {
    return (
      <div className="space-y-3" aria-label="Memuat sudut baca">
        {[0, 1, 2, 3].map((idx) => (
          <div
            key={idx}
            className="h-24 rounded-xl border border-border bg-card animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (spots.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-[var(--color-paper-2)] p-5 text-center space-y-3">
        <MapPin
          className="size-6 text-muted-foreground mx-auto"
          aria-hidden="true"
        />
        <div className="space-y-1">
          <p className="font-serif text-base font-bold text-foreground">
            Belum ada sudut baca pada filter ini
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Coba ganti kota Indonesia di atas, hapus kata kunci, atau geser peta
            ke area lain.
          </p>
        </div>
        {hasActiveFilters && (
          <Button
            type="button"
            variant="outline"
            onClick={onResetFilters}
            className="min-h-11"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            Reset Semua Filter
          </Button>
        )}
      </div>
    );
  }

  return (
    <ul className="ruled-index" aria-label="Hasil sudut baca">
      {spots.map((spot) => {
        const isSelected = spot.slug === selectedSlug;
        const verifiedLabel = formatVerifiedBadge(spot.verifiedBadge);
        const distanceLabel = formatDistanceMeters(spot.distanceMeters);
        const facilities = getActiveFacilityChips(spot.facilities).slice(0, 3);
        const directionsUrl = buildGoogleMapsDirectionsUrl(spot);

        return (
          <li key={spot.id} className="py-3">
            <div
              className={`rounded-xl border p-3.5 transition-colors space-y-2.5 ${
                isSelected
                  ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]/50"
                  : "border-border bg-card hover:border-foreground/30"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onSelectSpot(spot.slug)}
                  className="min-h-11 flex-1 min-w-0 text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-ring rounded-xs"
                >
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <span className="rounded border border-border bg-[var(--color-paper-2)] px-2 py-0.5 font-mono text-[10px] font-semibold text-foreground">
                      {formatSpotCategory(spot.category)}
                    </span>
                    {verifiedLabel && (
                      <span
                        className={`rounded px-2 py-0.5 font-mono text-[10px] font-semibold ${
                          spot.verifiedBadge === "partner"
                            ? "bg-[var(--color-accent-soft)] text-foreground border border-[var(--color-accent)]/40"
                            : "bg-[var(--color-green-soft)] text-[var(--color-green)] border border-[var(--color-green)]/30"
                        }`}
                      >
                        {verifiedLabel}
                      </span>
                    )}
                  </div>
                  <h3 className="font-serif text-base font-bold text-foreground leading-snug">
                    {spot.name}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                    {spot.address} · {spot.city}
                  </p>
                </button>

                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Buka rute Google Maps ke ${spot.name}`}
                  title="Buka di Google Maps"
                  className="size-11 shrink-0 rounded-lg border border-border bg-background flex items-center justify-center text-foreground hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <ExternalLink className="size-4" aria-hidden="true" />
                </a>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                <div className="flex flex-wrap gap-1.5">
                  {facilities.map((fac) => (
                    <span
                      key={fac.key}
                      className="rounded border border-border/80 bg-background px-2 py-0.5 text-[11px] text-muted-foreground"
                    >
                      {fac.label}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2.5 font-mono text-xs tabular-nums text-muted-foreground ml-auto">
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
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
