import * as React from "react";
import { X, MapPin, AlertCircle, Check } from "lucide-react";
import { haversineDistanceMeters } from "@starter/shared/validators/community";
import { Button } from "@/components/ui/button";

interface AdjustPinMapDialogProps {
  open: boolean;
  onClose: () => void;
  sourceLat: number;
  sourceLng: number;
  currentLat: number;
  currentLng: number;
  onSave: (lat: number, lng: number) => void;
}

export function AdjustPinMapDialog({
  open,
  onClose,
  sourceLat,
  sourceLng,
  currentLat,
  currentLng,
  onSave,
}: AdjustPinMapDialogProps) {
  const [pinLat, setPinLat] = React.useState(currentLat || sourceLat);
  const [pinLng, setPinLng] = React.useState(currentLng || sourceLng);

  React.useEffect(() => {
    if (open) {
      setPinLat(currentLat || sourceLat);
      setPinLng(currentLng || sourceLng);
    }
  }, [open, currentLat, currentLng, sourceLat, sourceLng]);

  if (!open) return null;

  const distance = haversineDistanceMeters(sourceLat, sourceLng, pinLat, pinLng);
  const isOutOfRange = distance > 1000;

  // Local coordinate projection to an 800x600 SVG canvas:
  // 1 km is roughly ~0.009 degrees latitude.
  // We map [-0.012, +0.012] deg around source coordinates to [0, 100%].
  const deltaDeg = 0.014;
  const pinXPercent = 50 + ((pinLng - sourceLng) / deltaDeg) * 50;
  const pinYPercent = 50 - ((pinLat - sourceLat) / deltaDeg) * 50;

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pctX = (x / rect.width) * 100;
    const pctY = (y / rect.height) * 100;

    const newLng = sourceLng + ((pctX - 50) / 50) * deltaDeg;
    const newLat = sourceLat - ((pctY - 50) / 50) * deltaDeg;

    setPinLat(Number(newLat.toFixed(6)));
    setPinLng(Number(newLng.toFixed(6)));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative flex h-[90vh] max-h-[640px] w-full max-w-[720px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#121316] text-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-2">
            <MapPin className="size-5 text-amber-400" />
            <h2 className="text-base font-semibold text-white">Sesuaikan Pin</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Map Canvas Area */}
        <div
          onClick={handleMapClick}
          className="relative flex-1 cursor-crosshair overflow-hidden bg-[#181c24] select-none"
        >
          {/* Simulated Dark OpenStreetMap Vector Tile Background */}
          <svg className="absolute inset-0 size-full stroke-white/5 [stroke-width:1]">
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" />
            </pattern>
            <rect width="100%" height="100%" fill="url(#grid)" />
            {/* Simulated Road Lines */}
            <path
              d="M 0 300 Q 300 280, 800 320"
              stroke="#2c3b52"
              strokeWidth="10"
              fill="none"
            />
            <path
              d="M 400 0 L 410 600"
              stroke="#253347"
              strokeWidth="8"
              fill="none"
            />
            <path
              d="M 120 150 Q 500 200, 750 100"
              stroke="#1f2c3e"
              strokeWidth="6"
              fill="none"
            />
            {/* 1 km Allowed Boundary Circle */}
            <circle
              cx="50%"
              cy="50%"
              r="35.7%"
              fill="#3b82f6"
              fillOpacity="0.04"
              stroke="#3b82f6"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
          </svg>

          {/* Source Address Center Marker */}
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
            style={{ left: "50%", top: "50%" }}
          >
            <div className="size-3 rounded-full border-2 border-white bg-blue-500 shadow-md" />
            <span className="mt-1 rounded-sm bg-black/80 px-1.5 py-0.5 text-[10px] font-medium text-white/80">
              Alamat Sumber
            </span>
          </div>

          {/* Interactive Draggable / Clicked Pin Marker */}
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition-all duration-150"
            style={{
              left: `${Math.min(95, Math.max(5, pinXPercent))}%`,
              top: `${Math.min(95, Math.max(5, pinYPercent))}%`,
            }}
          >
            <div className="relative">
              <div
                className={`flex size-8 items-center justify-center rounded-full border-2 shadow-lg ${
                  isOutOfRange
                    ? "border-red-500 bg-red-600/90"
                    : "border-white bg-white text-black"
                }`}
              >
                <div
                  className={`size-3 rounded-full ${
                    isOutOfRange ? "bg-white" : "bg-black"
                  }`}
                />
              </div>
              <div
                className={`absolute inset-0 size-8 animate-ping rounded-full opacity-30 ${
                  isOutOfRange ? "bg-red-500" : "bg-white"
                }`}
              />
            </div>
            <span
              className={`mt-1.5 rounded px-2 py-0.5 text-[11px] font-semibold shadow-md ${
                isOutOfRange
                  ? "bg-red-950 text-red-200 border border-red-500/50"
                  : "bg-black/80 text-white"
              }`}
            >
              {distance} m {isOutOfRange && "(Terlalu jauh)"}
            </span>
          </div>

          {/* Floating Instructions */}
          <div className="absolute top-4 left-4 rounded-lg bg-black/60 px-3 py-1.5 text-xs text-white/80 backdrop-blur-xs border border-white/10">
            Klik pada peta untuk memindahkan pin lokasi pintu/titik kumpul.
          </div>
        </div>

        {/* Footer info & Actions */}
        <div className="flex flex-col gap-3 border-t border-white/10 bg-[#16181d] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs">
            {isOutOfRange ? (
              <div className="flex items-center gap-1.5 text-red-400">
                <AlertCircle className="size-4 shrink-0" />
                <span>
                  Pin berjarak <strong>{distance} m</strong>, melebihi batas 1 km (1.000 m) dari alamat sumber.
                </span>
              </div>
            ) : (
              <p className="text-white/70">
                Seret pin atau klik peta untuk menempatkannya, maksimal 1 km dari alamat.
                <span className="ml-1 text-white/40">({distance} m dari alamat)</span>
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="border-white/20 text-white hover:bg-white/10"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isOutOfRange}
              onClick={() => {
                onSave(pinLat, pinLng);
                onClose();
              }}
              className="bg-white text-black hover:bg-white/90 font-medium"
            >
              <Check className="size-3.5 mr-1" />
              Simpan
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
