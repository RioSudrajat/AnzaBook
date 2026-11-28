import { useEffect, useRef, useState } from "react";
import type {
  GeoJSONSource,
  Map as MapLibreMap,
  MapMouseEvent,
} from "maplibre-gl";
import {
  Crosshair,
  Loader2,
  LocateFixed,
  Minus,
  Plus,
  Search,
} from "lucide-react";
import {
  PARTNER_SPOT_COLOR_HEX,
  SPOT_CATEGORY_STYLES,
  spotsToGeoJson,
} from "../spots-helpers";
import type { ReadingSpotSummaryDto } from "../types";

export type MapBoundsPayload = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
  centerLat: number;
  centerLng: number;
  zoom: number;
};

export type MapCameraRequest = {
  lat: number;
  lng: number;
  zoom: number;
  seq: number;
};

type ReadingSpotsMapProps = {
  spots: ReadingSpotSummaryDto[];
  selectedSpotSlug?: string;
  initialCenter: { lat: number; lng: number; zoom: number };
  cameraRequest?: MapCameraRequest | null;
  onSelectSpot: (slug: string) => void;
  onViewportChange?: (bounds: MapBoundsPayload) => void;
  showSearchAreaButton?: boolean;
  onSearchThisArea?: () => void;
  onRequestMyLocation?: () => void;
  isLocating?: boolean;
  isFetching?: boolean;
  bottomControlsOffsetClass?: string;
};

const SOURCE_ID = "reading-spots";
const LAYER_CLUSTER_ID = "reading-spots-clusters";
const LAYER_CLUSTER_COUNT_ID = "reading-spots-cluster-count";
const LAYER_SELECTED_RING_ID = "reading-spots-selected-ring";
const LAYER_POINT_ID = "reading-spots-points";

const OPENFREEMAP_LIGHT_STYLE = "https://tiles.openfreemap.org/styles/positron";
const OPENFREEMAP_DARK_STYLE = "https://tiles.openfreemap.org/styles/dark";

function getBasemapStyleUrl(isDark: boolean): string {
  return isDark ? OPENFREEMAP_DARK_STYLE : OPENFREEMAP_LIGHT_STYLE;
}

function prefersReducedMotion(): boolean {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function moveCamera(
  map: MapLibreMap,
  target: { center: [number, number]; zoom: number },
) {
  if (prefersReducedMotion()) {
    map.jumpTo({ center: target.center, zoom: target.zoom });
    return;
  }
  map.flyTo({
    center: target.center,
    zoom: target.zoom,
    duration: 480,
    essential: true,
  });
}

function syncSpotsSourceAndLayers(
  map: MapLibreMap,
  spots: readonly ReadingSpotSummaryDto[],
  selectedSlug: string,
  isDark: boolean,
  forceStyleReady = false,
) {
  if (!forceStyleReady && !map.isStyleLoaded()) {
    return;
  }

  const geojson = spotsToGeoJson(spots);
  const existingSource = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;

  if (existingSource) {
    existingSource.setData(geojson);
  } else {
    map.addSource(SOURCE_ID, {
      type: "geojson",
      data: geojson,
      cluster: true,
      clusterMaxZoom: 9,
      clusterRadius: 48,
    });
  }

  const strokeColor = isDark ? "#161412" : "#FAF6EE";
  const clusterFill = isDark ? "#F06A24" : "#221E1A";
  const clusterText = isDark ? "#161412" : "#FAF6EE";

  if (!map.getLayer(LAYER_CLUSTER_ID)) {
    map.addLayer({
      id: LAYER_CLUSTER_ID,
      type: "circle",
      source: SOURCE_ID,
      filter: ["has", "point_count"],
      paint: {
        "circle-color": clusterFill,
        "circle-radius": ["step", ["get", "point_count"], 18, 10, 22, 30, 26],
        "circle-stroke-width": 2,
        "circle-stroke-color": strokeColor,
      },
    });
  }

  if (!map.getLayer(LAYER_CLUSTER_COUNT_ID)) {
    map.addLayer({
      id: LAYER_CLUSTER_COUNT_ID,
      type: "symbol",
      source: SOURCE_ID,
      filter: ["has", "point_count"],
      layout: {
        "text-field": ["get", "point_count_abbreviated"],
        "text-font": ["Noto Sans Regular"],
        "text-size": 12,
      },
      paint: {
        "text-color": clusterText,
      },
    });
  }

  if (!map.getLayer(LAYER_SELECTED_RING_ID)) {
    map.addLayer({
      id: LAYER_SELECTED_RING_ID,
      type: "circle",
      source: SOURCE_ID,
      filter: [
        "all",
        ["!", ["has", "point_count"]],
        ["==", ["get", "slug"], selectedSlug],
      ],
      paint: {
        "circle-radius": 16,
        "circle-color": "transparent",
        "circle-stroke-width": 3,
        "circle-stroke-color": PARTNER_SPOT_COLOR_HEX,
      },
    });
  } else {
    map.setFilter(LAYER_SELECTED_RING_ID, [
      "all",
      ["!", ["has", "point_count"]],
      ["==", ["get", "slug"], selectedSlug],
    ]);
  }

  if (!map.getLayer(LAYER_POINT_ID)) {
    map.addLayer({
      id: LAYER_POINT_ID,
      type: "circle",
      source: SOURCE_ID,
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-color": ["get", "markerColor"],
        "circle-radius": [
          "case",
          ["==", ["get", "slug"], selectedSlug],
          11,
          ["==", ["get", "isPartner"], true],
          10,
          8,
        ],
        "circle-stroke-width": 2,
        "circle-stroke-color": strokeColor,
      },
    });
  } else {
    map.setPaintProperty(LAYER_POINT_ID, "circle-radius", [
      "case",
      ["==", ["get", "slug"], selectedSlug],
      11,
      ["==", ["get", "isPartner"], true],
      10,
      8,
    ]);
  }
}

export function ReadingSpotsMap({
  spots,
  selectedSpotSlug = "",
  initialCenter,
  cameraRequest,
  onSelectSpot,
  onViewportChange,
  showSearchAreaButton = false,
  onSearchThisArea,
  onRequestMyLocation,
  isLocating = false,
  isFetching = false,
  bottomControlsOffsetClass = "bottom-4",
}: ReadingSpotsMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [mapState, setMapState] = useState<"loading" | "ready" | "fallback">(
    "loading",
  );
  const [isDark, setIsDark] = useState<boolean>(() =>
    typeof document !== "undefined"
      ? document.documentElement.classList.contains("dark")
      : false,
  );

  const spotsRef = useRef(spots);
  const selectedSlugRef = useRef(selectedSpotSlug);
  const onSelectSpotRef = useRef(onSelectSpot);
  const onViewportChangeRef = useRef(onViewportChange);
  const isDarkRef = useRef(isDark);
  const prevIsDarkRef = useRef(isDark);

  useEffect(() => {
    spotsRef.current = spots;
    selectedSlugRef.current = selectedSpotSlug;
    onSelectSpotRef.current = onSelectSpot;
    onViewportChangeRef.current = onViewportChange;
    isDarkRef.current = isDark;
  }, [spots, selectedSpotSlug, onSelectSpot, onViewportChange, isDark]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const observer = new MutationObserver(() => {
      const nextDark = document.documentElement.classList.contains("dark");
      setIsDark(nextDark);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    let moveEndTimer: ReturnType<typeof setTimeout> | null = null;

    async function initMap() {
      const testCanvas = document.createElement("canvas");
      const hasWebGL = Boolean(
        testCanvas.getContext("webgl2") || testCanvas.getContext("webgl"),
      );

      if (!hasWebGL) {
        await Promise.resolve();
        if (!cancelled) {
          setMapState("fallback");
        }
        return;
      }

      try {
        const [maplibregl, workerUrlModule] = await Promise.all([
          import("maplibre-gl"),
          import("maplibre-gl/dist/maplibre-gl-worker.mjs?url"),
          import("maplibre-gl/dist/maplibre-gl.css"),
        ]);

        if (cancelled || !containerRef.current) return;

        if (workerUrlModule?.default) {
          maplibregl.setWorkerUrl(workerUrlModule.default);
        }

        const map = new maplibregl.Map({
          container: containerRef.current,
          style: getBasemapStyleUrl(isDarkRef.current),
          center: [initialCenter.lng, initialCenter.lat],
          zoom: initialCenter.zoom,
          minZoom: 4,
          maxZoom: 18,
          attributionControl: { compact: false },
        });

        prevIsDarkRef.current = isDarkRef.current;
        mapRef.current = map;

        const handleSyncLayers = () => {
          if (cancelled) return;
          syncSpotsSourceAndLayers(
            map,
            spotsRef.current,
            selectedSlugRef.current,
            isDarkRef.current,
            true,
          );
        };

        map.on("load", () => {
          if (cancelled) return;
          handleSyncLayers();
          setMapState("ready");
        });

        map.on("style.load", handleSyncLayers);

        map.on("click", LAYER_CLUSTER_ID, (event: MapMouseEvent) => {
          const features = map.queryRenderedFeatures(event.point, {
            layers: [LAYER_CLUSTER_ID],
          });
          const cluster = features[0];
          if (!cluster) return;
          const clusterId = cluster.properties?.cluster_id as
            number | undefined;
          if (clusterId === undefined) return;
          const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
          if (!source) return;

          void source.getClusterExpansionZoom(clusterId).then((zoom) => {
            if (cluster.geometry.type !== "Point") return;
            const [lng, lat] = cluster.geometry.coordinates as [number, number];
            moveCamera(map, { center: [lng, lat], zoom });
          });
        });

        map.on("click", LAYER_POINT_ID, (event: MapMouseEvent) => {
          const features = map.queryRenderedFeatures(event.point, {
            layers: [LAYER_POINT_ID],
          });
          const slug = features[0]?.properties?.slug;
          if (typeof slug === "string" && slug.length > 0) {
            onSelectSpotRef.current(slug);
          }
        });

        for (const interactiveLayer of [LAYER_CLUSTER_ID, LAYER_POINT_ID]) {
          map.on("mouseenter", interactiveLayer, () => {
            map.getCanvas().style.cursor = "pointer";
          });
          map.on("mouseleave", interactiveLayer, () => {
            map.getCanvas().style.cursor = "";
          });
        }

        map.on("moveend", () => {
          if (moveEndTimer) clearTimeout(moveEndTimer);
          moveEndTimer = setTimeout(() => {
            const bounds = map.getBounds();
            const center = map.getCenter();
            onViewportChangeRef.current?.({
              minLat: bounds.getSouth(),
              maxLat: bounds.getNorth(),
              minLng: bounds.getWest(),
              maxLng: bounds.getEast(),
              centerLat: center.lat,
              centerLng: center.lng,
              zoom: map.getZoom(),
            });
          }, 300);
        });
      } catch {
        if (!cancelled) {
          setMapState("fallback");
        }
      }
    }

    void initMap();

    return () => {
      cancelled = true;
      if (moveEndTimer) clearTimeout(moveEndTimer);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [initialCenter.lat, initialCenter.lng, initialCenter.zoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    syncSpotsSourceAndLayers(map, spots, selectedSpotSlug, isDark);
  }, [spots, selectedSpotSlug, isDark]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || mapState !== "ready") return;
    if (prevIsDarkRef.current === isDark) return;
    prevIsDarkRef.current = isDark;
    map.setStyle(getBasemapStyleUrl(isDark));
  }, [isDark, mapState]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !cameraRequest || mapState !== "ready") return;
    moveCamera(map, {
      center: [cameraRequest.lng, cameraRequest.lat],
      zoom: cameraRequest.zoom,
    });
  }, [cameraRequest, mapState]);

  const handleZoomIn = () => {
    const map = mapRef.current;
    if (!map) return;
    const nextZoom = Math.min(18, map.getZoom() + 1);
    if (prefersReducedMotion()) {
      map.jumpTo({ zoom: nextZoom });
    } else {
      map.zoomTo(nextZoom, { duration: 220 });
    }
  };

  const handleZoomOut = () => {
    const map = mapRef.current;
    if (!map) return;
    const nextZoom = Math.max(4, map.getZoom() - 1);
    if (prefersReducedMotion()) {
      map.jumpTo({ zoom: nextZoom });
    } else {
      map.zoomTo(nextZoom, { duration: 220 });
    }
  };

  return (
    <div
      data-lenis-prevent
      className="relative size-full overflow-hidden bg-[var(--color-paper-2)]"
    >
      <div
        ref={containerRef}
        role="region"
        aria-label="Peta interaktif sudut baca"
        tabIndex={0}
        className="size-full focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-[-2px]"
      />

      {mapState === "loading" && (
        <div
          aria-live="polite"
          className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[var(--color-paper-2)]/85"
        >
          <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-xs font-mono text-foreground shadow-sm">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            <span>Memuat peta interaktif...</span>
          </div>
        </div>
      )}

      {mapState === "fallback" && (
        <div
          role="region"
          aria-label="Fallback daftar sudut baca"
          className="absolute inset-0 flex items-center justify-center p-6 bg-[var(--color-paper-2)]"
        >
          <div className="max-w-md rounded-xl border border-border bg-background p-5 space-y-2.5 text-center shadow-sm">
            <h2 className="font-serif text-lg font-bold text-foreground">
              Peta WebGL tidak tersedia
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Perangkat atau peramban ini membatasi akselerasi WebGL. Kamu tetap
              dapat menjelajahi seluruh sudut baca lewat panel daftar dan
              membuka rute Google Maps secara langsung.
            </p>
            <p className="font-mono text-xs text-muted-foreground">
              © OpenStreetMap contributors · OpenFreeMap
            </p>
          </div>
        </div>
      )}

      {showSearchAreaButton && mapState === "ready" && (
        <div className="pointer-events-none absolute top-4 inset-x-0 z-10 hidden lg:flex justify-center px-4">
          <button
            type="button"
            onClick={onSearchThisArea}
            className="pointer-events-auto min-h-11 inline-flex items-center gap-2 rounded-lg border border-border bg-background/95 px-4 py-2 text-xs font-semibold text-foreground shadow-md backdrop-blur-sm hover:border-[var(--color-accent)] cursor-pointer focus-visible:outline-2 focus-visible:outline-ring"
          >
            <Search
              className="size-3.5 text-[var(--color-accent)]"
              aria-hidden="true"
            />
            <span>{isFetching ? "Memuat area..." : "Cari di area ini"}</span>
          </button>
        </div>
      )}

      <div
        className={`hidden md:flex absolute left-4 ${bottomControlsOffsetClass} z-10 flex-wrap items-center gap-2 rounded-lg border border-border bg-background/90 px-3 py-2 text-[11px] font-mono text-foreground backdrop-blur-sm max-w-md`}
        aria-label="Legenda kategori sudut baca"
      >
        {Object.entries(SPOT_CATEGORY_STYLES).map(([key, meta]) => (
          <span key={key} className="inline-flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-full shrink-0"
              style={{ backgroundColor: meta.colorHex }}
              aria-hidden="true"
            />
            <span>{meta.shortLabel}</span>
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5 pl-1 border-l border-border">
          <span
            className="size-2.5 rounded-full shrink-0"
            style={{ backgroundColor: PARTNER_SPOT_COLOR_HEX }}
            aria-hidden="true"
          />
          <span>Mitra</span>
        </span>
      </div>

      <div
        className={`absolute right-4 ${bottomControlsOffsetClass} z-10 flex flex-col gap-2`}
      >
        {onRequestMyLocation && (
          <button
            type="button"
            onClick={onRequestMyLocation}
            disabled={isLocating}
            aria-busy={isLocating}
            aria-label="Pusatkan ke lokasiku"
            title="Lokasiku"
            className="size-11 rounded-lg border border-border bg-background/95 text-foreground shadow-md backdrop-blur-sm flex items-center justify-center hover:border-[var(--color-accent)] cursor-pointer focus-visible:outline-2 focus-visible:outline-ring"
          >
            {isLocating ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <LocateFixed className="size-4" aria-hidden="true" />
            )}
          </button>
        )}

        {mapState === "ready" && (
          <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-background/95 shadow-md backdrop-blur-sm">
            <button
              type="button"
              onClick={handleZoomIn}
              aria-label="Perbesar peta"
              title="Perbesar peta"
              className="size-11 flex items-center justify-center text-foreground hover:bg-muted/70 border-b border-border cursor-pointer focus-visible:outline-2 focus-visible:outline-ring"
            >
              <Plus className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              aria-label="Perkecil peta"
              title="Perkecil peta"
              className="size-11 flex items-center justify-center text-foreground hover:bg-muted/70 cursor-pointer focus-visible:outline-2 focus-visible:outline-ring"
            >
              <Minus className="size-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      {mapState === "ready" && (
        <div className="pointer-events-none sr-only">
          © OpenStreetMap contributors · OpenFreeMap
        </div>
      )}

      {isLocating && (
        <div className="pointer-events-none absolute bottom-16 right-4 z-10 rounded-md border border-border bg-background/95 px-2.5 py-1 text-[11px] font-mono text-foreground shadow-xs">
          <Crosshair className="inline size-3 mr-1" aria-hidden="true" />
          Mendeteksi GPS...
        </div>
      )}
    </div>
  );
}
