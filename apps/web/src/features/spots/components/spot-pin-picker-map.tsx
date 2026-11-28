import { useEffect, useId, useRef, useState } from "react";
import type { Map as MapLibreMap, Marker as MapLibreMarker } from "maplibre-gl";
import { Compass, MapPin } from "lucide-react";
import {
  PARTNER_SPOT_COLOR_HEX,
  clampIndonesiaCoordinate,
  parseCoordinateDraft,
} from "../spots-helpers";
import { INDONESIA_BBOX, INDONESIA_CITY_PRESETS } from "../types";

type SpotPinPickerMapProps = {
  lat: number;
  lng: number;
  onChange: (
    lat: number,
    lng: number,
    meta?: { city?: string; province?: string },
  ) => void;
};

const OPENFREEMAP_LIGHT_STYLE = "https://tiles.openfreemap.org/styles/positron";
const OPENFREEMAP_DARK_STYLE = "https://tiles.openfreemap.org/styles/dark";

function detectIsDark(): boolean {
  if (typeof document === "undefined") return false;
  return (
    document.documentElement.classList.contains("dark") ||
    document.documentElement.getAttribute("data-theme") === "night"
  );
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

export function SpotPinPickerMap({
  lat,
  lng,
  onChange,
}: SpotPinPickerMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<MapLibreMarker | null>(null);
  const onChangeRef = useRef(onChange);
  const initialCoordsRef = useRef({ lat, lng });

  const [mapState, setMapState] = useState<"loading" | "ready" | "fallback">(
    "loading",
  );
  const [clampedNotice, setClampedNotice] = useState<string | null>(null);
  const [latDraftState, setLatDraftState] = useState<{
    source: number;
    text: string;
  }>({ source: lat, text: String(lat) });
  const [lngDraftState, setLngDraftState] = useState<{
    source: number;
    text: string;
  }>({ source: lng, text: String(lng) });

  const latText =
    latDraftState.source === lat ? latDraftState.text : String(lat);
  const lngText =
    lngDraftState.source === lng ? lngDraftState.text : String(lng);

  const latInputId = useId();
  const lngInputId = useId();

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;

    async function initPickerMap() {
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

        const startCoords = clampIndonesiaCoordinate(
          initialCoordsRef.current.lat,
          initialCoordsRef.current.lng,
        );

        const map = new maplibregl.Map({
          container: containerRef.current,
          style: detectIsDark()
            ? OPENFREEMAP_DARK_STYLE
            : OPENFREEMAP_LIGHT_STYLE,
          center: [startCoords.lng, startCoords.lat],
          zoom: 15,
          minZoom: 4,
          maxZoom: 18,
          maxBounds: [
            [INDONESIA_BBOX.minLng, INDONESIA_BBOX.minLat],
            [INDONESIA_BBOX.maxLng, INDONESIA_BBOX.maxLat],
          ],
          attributionControl: { compact: true },
        });

        const marker = new maplibregl.Marker({
          color: PARTNER_SPOT_COLOR_HEX,
          draggable: true,
        })
          .setLngLat([startCoords.lng, startCoords.lat])
          .addTo(map);

        marker.on("dragend", () => {
          const pos = marker.getLngLat();
          const clamped = clampIndonesiaCoordinate(pos.lat, pos.lng);
          marker.setLngLat([clamped.lng, clamped.lat]);
          setClampedNotice(
            clamped.wasClamped
              ? "Pin dibatasi ke dalam wilayah Indonesia."
              : null,
          );
          onChangeRef.current(clamped.lat, clamped.lng);
        });

        map.on("click", (event) => {
          const clamped = clampIndonesiaCoordinate(
            event.lngLat.lat,
            event.lngLat.lng,
          );
          marker.setLngLat([clamped.lng, clamped.lat]);
          setClampedNotice(
            clamped.wasClamped
              ? "Pin dibatasi ke dalam wilayah Indonesia."
              : null,
          );
          onChangeRef.current(clamped.lat, clamped.lng);
        });

        map.on("load", () => {
          if (!cancelled) {
            setMapState("ready");
          }
        });

        map.on("error", () => {
          if (!cancelled) {
            setMapState((prev) => (prev === "loading" ? "fallback" : prev));
          }
        });

        mapRef.current = map;
        markerRef.current = marker;
      } catch {
        if (!cancelled) {
          setMapState("fallback");
        }
      }
    }

    void initPickerMap();

    return () => {
      cancelled = true;
      markerRef.current?.remove();
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;

    const clamped = clampIndonesiaCoordinate(lat, lng);
    const current = marker.getLngLat();
    if (
      Math.abs(current.lat - clamped.lat) < 1e-6 &&
      Math.abs(current.lng - clamped.lng) < 1e-6
    ) {
      return;
    }

    marker.setLngLat([clamped.lng, clamped.lat]);
    if (prefersReducedMotion()) {
      map.jumpTo({ center: [clamped.lng, clamped.lat] });
    } else {
      map.easeTo({ center: [clamped.lng, clamped.lat], duration: 350 });
    }
  }, [lat, lng]);

  const commitManualCoordinate = (axis: "lat" | "lng", rawValue: string) => {
    const parsed = parseCoordinateDraft(rawValue);
    if (parsed.kind === "incomplete") {
      if (axis === "lat") {
        setLatDraftState({ source: lat, text: String(lat) });
      } else {
        setLngDraftState({ source: lng, text: String(lng) });
      }
      return;
    }

    const nextLat = axis === "lat" ? parsed.value : lat;
    const nextLng = axis === "lng" ? parsed.value : lng;
    const clamped = clampIndonesiaCoordinate(nextLat, nextLng);
    setClampedNotice(
      clamped.wasClamped
        ? "Koordinat otomatis dibatasi ke wilayah Indonesia."
        : null,
    );
    setLatDraftState({ source: clamped.lat, text: String(clamped.lat) });
    setLngDraftState({ source: clamped.lng, text: String(clamped.lng) });
    onChange(clamped.lat, clamped.lng);
  };

  return (
    <div className="space-y-3">
      {mapState !== "fallback" ? (
        <div
          data-lenis-prevent
          className="relative h-56 sm:h-64 w-full rounded-xl border border-border bg-[var(--color-paper-2)] overflow-hidden"
        >
          <div
            ref={containerRef}
            className="size-full"
            aria-label="Peta penempatan pin sudut baca"
          />
          {mapState === "loading" && (
            <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-paper-2)]/90 text-xs font-mono text-muted-foreground">
              Memuat peta penempatan pin...
            </div>
          )}
          <div className="pointer-events-none absolute top-2.5 left-2.5 rounded-lg border border-border bg-background/90 px-2.5 py-1 text-[11px] font-medium text-foreground backdrop-blur-xs shadow-xs flex items-center gap-1.5">
            <MapPin
              className="size-3.5 text-[var(--color-accent)]"
              aria-hidden="true"
            />
            <span>Klik peta atau geser pin ke lokasi tepat</span>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-[var(--color-paper-2)] p-3.5 text-xs text-muted-foreground flex items-start gap-2.5">
          <Compass
            className="size-4 text-[var(--color-accent-text)] shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <p className="leading-relaxed">
            Pratinjau peta WebGL tidak aktif di peramban ini. Pilih kota preset
            atau masukkan koordinat lintang &amp; bujur wilayah Indonesia di
            bawah.
          </p>
        </div>
      )}

      {/* Quick Indonesia City Presets */}
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">
          Lompat cepat ke kota Indonesia:
        </p>
        <div className="flex flex-wrap gap-1.5">
          {INDONESIA_CITY_PRESETS.slice(0, 6).map((preset) => (
            <button
              key={preset.city}
              type="button"
              onClick={() => {
                setClampedNotice(null);
                onChange(preset.lat, preset.lng, {
                  city: preset.city,
                  province: preset.province,
                });
              }}
              className="min-h-11 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground hover:border-[var(--color-accent)] cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-ring"
            >
              {preset.city}
            </button>
          ))}
        </div>
      </div>

      {/* Exact Coordinate Inputs (always keyboard-accessible) */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label
            htmlFor={latInputId}
            className="block text-xs font-mono text-muted-foreground"
          >
            Lintang (Latitude)
          </label>
          <input
            id={latInputId}
            type="text"
            inputMode="decimal"
            value={latText}
            onChange={(event) => {
              const raw = event.target.value;
              const parsed = parseCoordinateDraft(raw);
              if (
                parsed.kind === "valid" &&
                parsed.value >= INDONESIA_BBOX.minLat &&
                parsed.value <= INDONESIA_BBOX.maxLat
              ) {
                setClampedNotice(null);
                setLatDraftState({ source: parsed.value, text: raw });
                onChange(parsed.value, lng);
              } else {
                setLatDraftState({ source: lat, text: raw });
              }
            }}
            onBlur={(event) =>
              commitManualCoordinate("lat", event.target.value)
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commitManualCoordinate("lat", event.currentTarget.value);
              }
            }}
            className="w-full min-h-11 rounded-lg border border-border bg-background px-3 font-mono text-base sm:text-sm tabular-nums text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor={lngInputId}
            className="block text-xs font-mono text-muted-foreground"
          >
            Bujur (Longitude)
          </label>
          <input
            id={lngInputId}
            type="text"
            inputMode="decimal"
            value={lngText}
            onChange={(event) => {
              const raw = event.target.value;
              const parsed = parseCoordinateDraft(raw);
              if (
                parsed.kind === "valid" &&
                parsed.value >= INDONESIA_BBOX.minLng &&
                parsed.value <= INDONESIA_BBOX.maxLng
              ) {
                setClampedNotice(null);
                setLngDraftState({ source: parsed.value, text: raw });
                onChange(lat, parsed.value);
              } else {
                setLngDraftState({ source: lng, text: raw });
              }
            }}
            onBlur={(event) =>
              commitManualCoordinate("lng", event.target.value)
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commitManualCoordinate("lng", event.currentTarget.value);
              }
            }}
            className="w-full min-h-11 rounded-lg border border-border bg-background px-3 font-mono text-base sm:text-sm tabular-nums text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          />
        </div>
      </div>

      {clampedNotice && (
        <p role="status" className="text-xs font-medium text-muted-foreground">
          {clampedNotice}
        </p>
      )}
    </div>
  );
}
