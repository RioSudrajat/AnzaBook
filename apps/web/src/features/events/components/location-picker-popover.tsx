import * as React from "react";
import {
  MapPin,
  Video,
  Search,
  ExternalLink,
  Store,
  Sliders,
  Check,
  X,
  Lock,
} from "lucide-react";
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
}

export function LocationPickerPopover({
  value,
  onChange,
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
  const [isSearchingOsm, setIsSearchingOsm] = React.useState(false);

  const { data: suggestions = [] } = useLocationSuggestions();

  // Debounced search to OpenStreetMap Nominatim API
  React.useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 3) {
      setOsmResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingOsm(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
            searchQuery,
          )}&format=json&addressdetails=1&limit=5&countrycodes=id`,
          {
            headers: {
              "Accept-Language": "id",
            },
          },
        );
        if (res.ok) {
          const items = await res.json();
          const parsed = items.map((item: any) => ({
            name:
              item.namedetails?.name ||
              item.name ||
              item.display_name.split(",")[0],
            address: item.display_name,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
            city:
              item.address?.city ||
              item.address?.town ||
              item.address?.county ||
              "Jakarta",
            district: item.address?.suburb || item.address?.city_district || "",
          }));
          setOsmResults(parsed);
        }
      } catch {
        // Fallback gracefully on network timeout
      } finally {
        setIsSearchingOsm(false);
      }
    }, 400);

    return () => clearTimeout(timer);
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

  const handleSelectVirtual = (platform: "zoom" | "gmeet" | "custom") => {
    let url = "";
    if (platform === "zoom") {
      url = "https://zoom.us/j/anzabook-session";
    } else if (platform === "gmeet") {
      url = "https://meet.google.com/anzabook-diskusi";
    }
    onChange({
      ...value,
      format: value.venueName ? "hybrid" : "online",
      onlineMeetingUrl: url,
    });
    setIsOpen(false);
  };

  const hasLocation = Boolean(value.venueName || value.onlineMeetingUrl);

  return (
    <div className="relative w-full">
      {/* Trigger Bar matching Luma UI */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="group flex min-h-[46px] w-full cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm transition-all hover:border-white/20 hover:bg-white/10"
      >
        <div className="flex items-center gap-2.5 overflow-hidden">
          {value.format === "online" ? (
            <Video className="size-4 shrink-0 text-blue-400" />
          ) : (
            <MapPin className="size-4 shrink-0 text-amber-400" />
          )}

          {hasLocation ? (
            <div className="truncate text-left">
              <span className="font-medium text-white">
                {value.venueName || value.onlineMeetingUrl}
              </span>
              {value.venueAddress && (
                <span className="ml-2 text-xs text-white/50">
                  {value.district ? `${value.district}, ` : ""}
                  {value.city}
                </span>
              )}
            </div>
          ) : (
            <div className="text-left">
              <div className="text-sm font-medium text-white/90">
                Tambahkan Lokasi Acara
              </div>
              <div className="text-xs text-white/50">
                Lokasi offline atau tautan virtual
              </div>
            </div>
          )}
        </div>

        <span className="text-xs font-medium text-white/40 group-hover:text-white/70">
          {hasLocation ? "Ubah" : "Pilih"}
        </span>
      </div>

      {/* Popover Dropdown matching Luma Screenshot 2 */}
      {isOpen && (
        <div
          className="absolute top-full left-0 z-40 mt-2 w-full min-w-[340px] max-w-full rounded-xl border border-white/15 bg-[#1b1c20] p-3 text-white shadow-2xl backdrop-blur-md animate-in fade-in-50 zoom-in-95 select-none"
          style={{ overscrollBehavior: "contain" }}
        >
          {/* Search Box */}
          <div className="relative mb-3">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Masukkan lokasi atau tautan virtual..."
              className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pr-3 pl-9 text-sm text-white placeholder-white/40 outline-none focus:border-white/30 focus:ring-1 focus:ring-white/30"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute top-1/2 right-2.5 -translate-y-1/2 text-white/40 hover:text-white"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <div
            className="max-h-[300px] overflow-y-auto space-y-4 pr-1 text-xs"
            style={{ overscrollBehavior: "contain" }}
          >
            {/* OSM Search Results */}
            {osmResults.length > 0 && (
              <div>
                <div className="mb-1.5 px-2 font-medium text-white/50 uppercase tracking-wider text-[11px]">
                  Hasil Pencarian Peta
                </div>
                <div className="space-y-1">
                  {osmResults.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectVenue(item)}
                      className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-white/10 transition-colors"
                    >
                      <MapPin className="mt-0.5 size-4 shrink-0 text-amber-400" />
                      <div className="truncate">
                        <div className="font-medium text-white">{item.name}</div>
                        <div className="truncate text-[11px] text-white/50">
                          {item.address}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Offline Recommendations / Toko Rekanan */}
            {suggestions.length > 0 && !searchQuery && (
              <div>
                <div className="mb-1.5 px-2 font-medium text-white/50 uppercase tracking-wider text-[11px]">
                  Lokasi Terbaru & Toko Rekanan
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
                          district: sug.district,
                        })
                      }
                      className="flex w-full items-start justify-between gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-start gap-2.5 truncate">
                        {sug.isStoreBranch ? (
                          <Store className="mt-0.5 size-4 shrink-0 text-amber-400" />
                        ) : (
                          <MapPin className="mt-0.5 size-4 shrink-0 text-blue-400" />
                        )}
                        <div className="truncate">
                          <div className="font-medium text-white">{sug.name}</div>
                          <div className="truncate text-[11px] text-white/50">
                            {sug.address}
                          </div>
                        </div>
                      </div>
                      {sug.isStoreBranch && (
                        <span className="shrink-0 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-300">
                          Toko Rekanan
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Virtual Options */}
            <div>
              <div className="mb-1.5 px-2 font-medium text-white/50 uppercase tracking-wider text-[11px]">
                Opsi Virtual
              </div>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => handleSelectVirtual("zoom")}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-white/10 transition-colors"
                >
                  <Video className="size-4 shrink-0 text-blue-400" />
                  <span className="text-white">Buat rapat Zoom</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectVirtual("gmeet")}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-white/10 transition-colors"
                >
                  <Video className="size-4 shrink-0 text-emerald-400" />
                  <span className="text-white">Buat Google Meet</span>
                </button>
              </div>
            </div>
          </div>

          {/* Close button */}
          <div className="mt-3 flex justify-end border-t border-white/10 pt-2">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs text-white/60 hover:text-white px-2 py-1"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Adjust Pin & Hide Address Controls when Offline Venue is picked */}
      {value.venueName && value.placeSourceLat && value.placeSourceLng && (
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs">
          <div className="flex items-center gap-2 text-white/70">
            <Sliders className="size-3.5 text-amber-400" />
            <span>Pin Peta Lokasi</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsAdjustingPin(true)}
              className="font-medium text-amber-300 hover:text-amber-200 underline underline-offset-2"
            >
              Sesuaikan Pin ↗
            </button>

            <label className="flex items-center gap-1.5 cursor-pointer text-white/70 hover:text-white">
              <input
                type="checkbox"
                checked={value.hideAddressUntilApproved}
                onChange={(e) =>
                  onChange({
                    ...value,
                    hideAddressUntilApproved: e.target.checked,
                  })
                }
                className="size-3.5 rounded border-white/20 bg-black/40 text-amber-500 focus:ring-0"
              />
              <span className="text-[11px]">Sembunyikan alamat sebelum disetujui</span>
            </label>
          </div>
        </div>
      )}

      {/* Pin Adjustment Modal */}
      {value.placeSourceLat && value.placeSourceLng && (
        <AdjustPinMapDialog
          open={isAdjustingPin}
          onClose={() => setIsAdjustingPin(false)}
          sourceLat={value.placeSourceLat}
          sourceLng={value.placeSourceLng}
          currentLat={value.latitude || value.placeSourceLat}
          currentLng={value.longitude || value.placeSourceLng}
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
