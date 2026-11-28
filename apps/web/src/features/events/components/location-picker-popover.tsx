import * as React from "react";
import { MapPin, Search, Sliders, Store, Video, X } from "lucide-react";
import {
  detectMeetingPlatform,
  getMeetingPlatformMeta,
} from "@starter/shared/validators/community";
import { normalizeOptionalHttpUrl } from "../event-description-doc";
import { useLocationSuggestions } from "../hooks";
import { AdjustPinMapDialog } from "./adjust-pin-map-dialog";

export interface SelectedLocationState {
  format: "offline" | "online" | "hybrid";
  venueName?: string;
  venueAddress?: string;
  district?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  placeSourceLat?: number;
  placeSourceLng?: number;
  onlineMeetingUrl?: string;
  hideAddressUntilApproved: boolean;
}

interface LocationPickerPopoverProps {
  value: SelectedLocationState;
  onChange: (val: SelectedLocationState) => void;
  variant?: "card" | "ruled";
}

export function LocationPickerPopover({
  value,
  onChange,
  variant = "card",
}: LocationPickerPopoverProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isAdjustingPin, setIsAdjustingPin] = React.useState(false);
  const [osmResults, setOsmResults] = React.useState<
    Array<{
      name: string;
      address: string;
      lat: number;
      lng: number;
      city?: string;
      district?: string;
    }>
  >([]);

  const { data: suggestions = [] } = useLocationSuggestions();

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () =>
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [isOpen]);

  React.useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 3) {
      queueMicrotask(() => setOsmResults([]));
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
            searchQuery,
          )}&format=json&addressdetails=1&limit=5&countrycodes=id`,
          {
            signal: controller.signal,
            headers: {
              "Accept-Language": "id",
            },
          },
        );
        if (res.ok && !controller.signal.aborted) {
          interface NominatimItem {
            namedetails?: { name?: string };
            name?: string;
            display_name: string;
            lat: string;
            lon: string;
            address?: {
              city?: string;
              town?: string;
              county?: string;
              suburb?: string;
              city_district?: string;
            };
          }
          const items = (await res.json()) as NominatimItem[];
          const parsed = items
            .map((item) => ({
              name:
                item.namedetails?.name ||
                item.name ||
                item.display_name.split(",")[0],
              address: item.display_name,
              lat: Number.parseFloat(item.lat),
              lng: Number.parseFloat(item.lon),
              city:
                item.address?.city ||
                item.address?.town ||
                item.address?.county ||
                "",
              district:
                item.address?.suburb || item.address?.city_district || "",
            }))
            .filter(
              (item) => Number.isFinite(item.lat) && Number.isFinite(item.lng),
            );
          if (!controller.signal.aborted) {
            setOsmResults(parsed);
          }
        }
      } catch {
        // Fallback gracefully on network timeout or abort
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery]);

  const handleSelectVenue = (venue: {
    name: string;
    address: string;
    lat: number;
    lng: number;
    city?: string;
    district?: string;
  }) => {
    onChange({
      ...value,
      format: value.format === "online" ? "hybrid" : value.format || "offline",
      venueName: venue.name,
      venueAddress: venue.address,
      district: venue.district || "",
      city: venue.city || "Jakarta",
      latitude: venue.lat,
      longitude: venue.lng,
      placeSourceLat: venue.lat,
      placeSourceLng: venue.lng,
    });
    setIsOpen(false);
  };

  const handleSelectVirtual = (platform: "zoom" | "gmeet") => {
    const url =
      platform === "zoom"
        ? "https://zoom.us/j/anzabook-session"
        : "https://meet.google.com/anzabook-diskusi";
    onChange({
      ...value,
      format: value.venueName ? "hybrid" : "online",
      onlineMeetingUrl: url,
    });
    setIsOpen(false);
  };

  const hasLocation = Boolean(value.venueName || value.onlineMeetingUrl);
  const isTemplateMeetingUrl =
    value.onlineMeetingUrl === "https://zoom.us/j/anzabook-session" ||
    value.onlineMeetingUrl === "https://meet.google.com/anzabook-diskusi";
  const hasSourceCoords =
    typeof value.placeSourceLat === "number" &&
    Number.isFinite(value.placeSourceLat) &&
    typeof value.placeSourceLng === "number" &&
    Number.isFinite(value.placeSourceLng);

  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className={`group flex min-h-12 w-full cursor-pointer items-center justify-between rounded-xl border border-border px-4 py-3 text-sm hover:border-[var(--color-accent)] transition-colors focus-visible:outline-2 focus-visible:outline-ring ${
          variant === "ruled" ? "bg-background" : "bg-[var(--color-paper-2)]"
        }`}
      >
        <span className="flex items-center gap-2.5 overflow-hidden">
          {value.format === "online" ? (
            <Video
              className="size-4 shrink-0 text-[var(--color-water)]"
              aria-hidden="true"
            />
          ) : (
            <MapPin
              className="size-4 shrink-0 text-[var(--color-accent)]"
              aria-hidden="true"
            />
          )}

          {hasLocation ? (
            <span className="truncate text-left">
              <span className="font-medium text-foreground">
                {value.venueName ||
                  getMeetingPlatformMeta(
                    detectMeetingPlatform(value.onlineMeetingUrl),
                  ).label}
              </span>
              {value.venueAddress ? (
                <span className="ml-2 text-xs text-muted-foreground">
                  {value.district ? `${value.district}, ` : ""}
                  {value.city}
                </span>
              ) : (
                <span className="ml-2 text-xs text-muted-foreground">
                  {isTemplateMeetingUrl
                    ? "· Tautan contoh (ubah sebelum publikasi)"
                    : "· Tautan tersemat"}
                </span>
              )}
            </span>
          ) : (
            <span className="text-left">
              <span className="block text-sm font-medium text-foreground">
                Tambahkan Lokasi Acara
              </span>
              <span className="block text-xs text-muted-foreground">
                Lokasi offline atau tautan virtual
              </span>
            </span>
          )}
        </span>

        <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground">
          {hasLocation ? "Ubah" : "Pilih"}
        </span>
      </button>

      {isOpen && (
        <div
          className="absolute top-full left-0 z-40 mt-2 w-full min-w-0 max-w-full rounded-xl border border-border bg-card p-3 text-foreground shadow-2xl"
          style={{ overscrollBehavior: "contain" }}
        >
          <div className="relative mb-3">
            <Search
              className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Masukkan lokasi atau tautan virtual..."
              aria-label="Cari lokasi acara"
              className="h-11 w-full rounded-lg border border-border bg-[var(--color-paper-2)] py-2 pr-9 pl-9 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-[var(--color-accent)]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Hapus pencarian lokasi"
                className="size-9 absolute top-1/2 right-1 -translate-y-1/2 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          <div
            className="max-h-[300px] overflow-y-auto space-y-4 pr-1 text-xs"
            style={{ overscrollBehavior: "contain" }}
          >
            {searchQuery.trim().length >= 2 &&
              (() => {
                const rawQuery = searchQuery.trim();
                const looksVirtual =
                  /^https?:\/\//i.test(rawQuery) ||
                  /^(meet\.google\.com|g\.co\/meet|zoom\.us|[a-z0-9-]+\.zoom\.us|teams\.microsoft\.com|teams\.live\.com|discord\.gg|discord\.com|youtu\.be|youtube\.com)\//i.test(
                    rawQuery,
                  );
                const virtualUrl = looksVirtual
                  ? normalizeOptionalHttpUrl(rawQuery)
                  : undefined;

                if (virtualUrl) {
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        onChange({
                          ...value,
                          format: value.venueName ? "hybrid" : "online",
                          onlineMeetingUrl: virtualUrl,
                        });
                        setIsOpen(false);
                      }}
                      className="flex w-full min-h-11 items-center gap-2.5 rounded-lg border border-border bg-[var(--color-paper-2)] px-3 py-2 text-left hover:border-[var(--color-accent)] transition-colors cursor-pointer"
                    >
                      <Video
                        className="size-4 shrink-0 text-[var(--color-water)]"
                        aria-hidden="true"
                      />
                      <span className="truncate">
                        <span className="font-semibold text-foreground">
                          Gunakan sebagai tautan rapat virtual
                        </span>{" "}
                        <span className="text-muted-foreground">
                          (
                          {
                            getMeetingPlatformMeta(
                              detectMeetingPlatform(virtualUrl),
                            ).label
                          }
                          )
                        </span>
                      </span>
                    </button>
                  );
                }

                return (
                  <button
                    type="button"
                    onClick={() => {
                      onChange({
                        ...value,
                        format: value.onlineMeetingUrl ? "hybrid" : "offline",
                        venueName: rawQuery,
                        venueAddress: rawQuery,
                        district: "",
                        city: value.city || "",
                        latitude: undefined,
                        longitude: undefined,
                        placeSourceLat: undefined,
                        placeSourceLng: undefined,
                      });
                      setIsOpen(false);
                    }}
                    className="flex w-full min-h-11 items-center gap-2.5 rounded-lg border border-border bg-[var(--color-paper-2)] px-3 py-2 text-left hover:border-[var(--color-accent)] transition-colors cursor-pointer"
                  >
                    <MapPin
                      className="size-4 shrink-0 text-[var(--color-accent)]"
                      aria-hidden="true"
                    />
                    <span className="truncate">
                      Gunakan{" "}
                      <strong className="font-semibold text-foreground">
                        &ldquo;{rawQuery}&rdquo;
                      </strong>{" "}
                      sebagai lokasi acara
                    </span>
                  </button>
                );
              })()}

            {osmResults.length > 0 && (
              <div>
                <div className="mb-1.5 px-2 font-mono text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Hasil Pencarian Peta
                </div>
                <div className="space-y-1">
                  {osmResults.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectVenue(item)}
                      className="flex w-full min-h-11 items-start gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-muted transition-colors cursor-pointer"
                    >
                      <MapPin
                        className="mt-0.5 size-4 shrink-0 text-[var(--color-accent)]"
                        aria-hidden="true"
                      />
                      <div className="truncate">
                        <div className="font-medium text-foreground">
                          {item.name}
                        </div>
                        <div className="truncate text-[11px] text-muted-foreground">
                          {item.address}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {suggestions.length > 0 && !searchQuery && (
              <div>
                <div className="mb-1.5 px-2 font-mono text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Lokasi Terbaru &amp; Toko Rekanan
                </div>
                <div className="space-y-1">
                  {suggestions.slice(0, 4).map((sug) => (
                    <button
                      key={sug.id}
                      type="button"
                      onClick={() =>
                        handleSelectVenue({
                          name: sug.name,
                          address: sug.address,
                          lat: sug.latitude,
                          lng: sug.longitude,
                          city: sug.city,
                          district: sug.district || undefined,
                        })
                      }
                      className="flex w-full min-h-11 items-start justify-between gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-muted transition-colors cursor-pointer"
                    >
                      <div className="flex items-start gap-2.5 truncate">
                        {sug.isStoreBranch ? (
                          <Store
                            className="mt-0.5 size-4 shrink-0 text-[var(--color-accent)]"
                            aria-hidden="true"
                          />
                        ) : (
                          <MapPin
                            className="mt-0.5 size-4 shrink-0 text-[var(--color-water)]"
                            aria-hidden="true"
                          />
                        )}
                        <div className="truncate">
                          <div className="font-medium text-foreground">
                            {sug.name}
                          </div>
                          <div className="truncate text-[11px] text-muted-foreground">
                            {sug.address}
                          </div>
                        </div>
                      </div>
                      {sug.isStoreBranch && (
                        <span className="shrink-0 rounded bg-[var(--color-accent-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
                          Toko Rekanan
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="mb-1.5 px-2 font-mono text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Opsi Virtual
              </div>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => handleSelectVirtual("zoom")}
                  className="flex w-full min-h-11 items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-muted transition-colors cursor-pointer"
                >
                  <Video
                    className="size-4 shrink-0 text-[var(--color-water)]"
                    aria-hidden="true"
                  />
                  <span className="text-foreground font-medium">
                    Buat rapat Zoom
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectVirtual("gmeet")}
                  className="flex w-full min-h-11 items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-muted transition-colors cursor-pointer"
                >
                  <Video
                    className="size-4 shrink-0 text-[var(--color-green)]"
                    aria-hidden="true"
                  />
                  <span className="text-foreground font-medium">
                    Buat Google Meet
                  </span>
                </button>
              </div>
            </div>
          </div>

          <div className="mt-3 flex justify-end border-t border-border pt-2">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="min-h-11 text-xs font-medium text-muted-foreground hover:text-foreground px-3 cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {value.venueName && (
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-[var(--color-paper-2)] px-3 py-2 text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Sliders
              className="size-3.5 text-[var(--color-accent)]"
              aria-hidden="true"
            />
            <span>
              {hasSourceCoords ? "Pin Peta Lokasi" : "Privasi Lokasi"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {hasSourceCoords && (
              <button
                type="button"
                onClick={() => setIsAdjustingPin(true)}
                className="min-h-11 font-semibold text-[var(--color-accent)] hover:underline underline-offset-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-ring"
              >
                Sesuaikan Pin
              </button>
            )}

            <label className="min-h-11 flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground">
              <input
                type="checkbox"
                checked={value.hideAddressUntilApproved}
                onChange={(e) =>
                  onChange({
                    ...value,
                    hideAddressUntilApproved: e.target.checked,
                  })
                }
                className="size-4 accent-[var(--color-accent)]"
              />
              <span className="text-[11px]">
                Sembunyikan alamat sebelum disetujui
              </span>
            </label>
          </div>
        </div>
      )}

      {hasSourceCoords &&
        typeof value.placeSourceLat === "number" &&
        typeof value.placeSourceLng === "number" && (
          <AdjustPinMapDialog
            open={isAdjustingPin}
            onClose={() => setIsAdjustingPin(false)}
            sourceLat={value.placeSourceLat}
            sourceLng={value.placeSourceLng}
            currentLat={
              typeof value.latitude === "number"
                ? value.latitude
                : value.placeSourceLat
            }
            currentLng={
              typeof value.longitude === "number"
                ? value.longitude
                : value.placeSourceLng
            }
            onSave={(lat, lng) =>
              onChange({
                ...value,
                latitude: lat,
                longitude: lng,
              })
            }
          />
        )}
    </div>
  );
}
