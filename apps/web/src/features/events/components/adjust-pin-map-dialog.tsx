import * as React from "react";
import { X, MapPin, AlertCircle, Plus, Minus, RotateCcw } from "lucide-react";
import { haversineDistanceMeters } from "@starter/shared/validators/community";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";

interface AdjustPinMapDialogProps {
  open: boolean;
  onClose: () => void;
  sourceLat: number;
  sourceLng: number;
  currentLat: number;
  currentLng: number;
  onSave: (lat: number, lng: number) => void;
}

// Convert coordinates to tile coordinates
function lon2tile(lon: number, zoom: number) {
  return Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
}

function lat2tile(lat: number, zoom: number) {
  return Math.floor(
    ((1 -
      Math.log(
        Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180),
      ) /
        Math.PI) /
      2) *
      Math.pow(2, zoom),
  );
}

function tile2lon(x: number, z: number) {
  return (x / Math.pow(2, z)) * 360 - 180;
}

function tile2lat(y: number, z: number) {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z);
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
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
  useBodyScrollLock(open);

  const [pinLat, setPinLat] = React.useState(currentLat || sourceLat);
  const [pinLng, setPinLng] = React.useState(currentLng || sourceLng);
  const [zoom, setZoom] = React.useState(16);
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState<{ x: number; y: number } | null>(null);

  React.useEffect(() => {
    if (open) {
      setPinLat(currentLat || sourceLat);
      setPinLng(currentLng || sourceLng);
      setZoom(16);
    }
  }, [open, currentLat, currentLng, sourceLat, sourceLng]);

  if (!open) return null;

  const distance = Math.round(
    haversineDistanceMeters(sourceLat, sourceLng, pinLat, pinLng),
  );
  const isOutOfRange = distance > 1000;

  // Compute tile range around current pin coordinates
  const centerTileX = lon2tile(pinLng, zoom);
  const centerTileY = lat2tile(pinLat, zoom);

  // 3x3 grid of tiles around center
  const tiles: { x: number; y: number; url: string; key: string }[] = [];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const tx = centerTileX + dx;
      const ty = centerTileY + dy;
      // Subdomain cycling a/b/c
      const sub = ["a", "b", "c"][Math.abs(tx + ty) % 3];
      // Dark Matter Map Tiles
      const url = `https://${sub}.basemaps.cartocdn.com/rastertiles/dark_all/${zoom}/${tx}/${ty}@2x.png`;
      tiles.push({ x: dx, y: dy, url, key: `${tx}-${ty}` });
    }
  }

  // Handle Dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStart) return;
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
      // Scale pixel delta to coordinates based on zoom level
      // At zoom 16, 256px tile is ~0.0055 deg longitude
      const degPerPxLng = 360 / (Math.pow(2, zoom) * 256);
      const degPerPxLat = degPerPxLng * Math.cos((pinLat * Math.PI) / 180);

      const nextLng = pinLng - deltaX * degPerPxLng;
      const nextLat = pinLat + deltaY * degPerPxLat;

      setPinLng(Number(nextLng.toFixed(6)));
      setPinLat(Number(nextLat.toFixed(6)));
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  const handleResetToSource = () => {
    setPinLat(sourceLat);
    setPinLng(sourceLng);
  };

  const handleSave = () => {
    if (isOutOfRange) return;
    onSave(pinLat, pinLng);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-6 backdrop-blur-xs animate-in fade-in duration-200 select-none"
      style={{ overscrollBehavior: "contain" }}
    >
      <div
        className="relative flex h-[88vh] max-h-[660px] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#121316] text-white shadow-2xl"
        style={{ overscrollBehavior: "contain" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-[#141518]">
          <div className="flex items-center gap-2">
            <MapPin className="size-5 text-amber-400" />
            <h2 className="text-base font-semibold text-white">Sesuaikan Pin</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Real Interactive Map Canvas */}
        <div
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className={`relative flex-1 overflow-hidden bg-[#0e1117] select-none ${
            isDragging ? "cursor-grabbing" : "cursor-grab"
          }`}
          style={{ touchAction: "none" }}
        >
          {/* Tiles Layer */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative size-[768px]">
              {tiles.map((tile) => (
                <img
                  key={tile.key}
                  src={tile.url}
                  alt="Peta"
                  loading="eager"
                  className="absolute size-[256px] object-cover pointer-events-none select-none"
                  style={{
                    left: `${(tile.x + 1) * 256}px`,
                    top: `${(tile.y + 1) * 256}px`,
                  }}
                  onError={(e) => {
                    // Fallback to OSM tile with dark invert filter if cartocdn is blocked
                    const tx = centerTileX + tile.x;
                    const ty = centerTileY + tile.y;
                    (e.target as HTMLImageElement).src = `https://tile.openstreetmap.org/${zoom}/${tx}/${ty}.png`;
                    (e.target as HTMLImageElement).style.filter =
                      "invert(100%) hue-rotate(180deg) brightness(90%) contrast(90%)";
                  }}
                />
              ))}
            </div>
          </div>

          {/* 1 KM Radius Boundary Hint (Circle) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className={`rounded-full border-2 border-dashed transition-colors ${
                isOutOfRange
                  ? "border-red-500/60 bg-red-500/10"
                  : "border-sky-400/40 bg-sky-400/5"
              }`}
              style={{
                width: `${Math.min(500, Math.max(260, 360 * (zoom / 16)))}px`,
                height: `${Math.min(500, Math.max(260, 360 * (zoom / 16)))}px`,
              }}
            />
          </div>

          {/* Center Target (Matching Luma Screenshot 3 `◎`) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative flex items-center justify-center">
              {/* Outer Glow Ring */}
              <div
                className={`size-10 rounded-full border-2 transition-all flex items-center justify-center shadow-lg ${
                  isOutOfRange
                    ? "border-red-400 bg-red-500/20 shadow-red-500/30"
                    : "border-white bg-white/20 shadow-black/80"
                }`}
              >
                {/* Center Core Dot */}
                <div
                  className={`size-3 rounded-full transition-colors ${
                    isOutOfRange ? "bg-red-400" : "bg-white"
                  }`}
                />
              </div>

              {/* Pin Distance Tooltip */}
              <div
                className={`absolute -bottom-8 whitespace-nowrap rounded-md px-2 py-0.5 text-[10px] font-mono font-medium shadow-md ${
                  isOutOfRange
                    ? "bg-red-500 text-white"
                    : "bg-black/90 text-white/90 border border-white/10"
                }`}
              >
                {distance === 0 ? "Alamat Sumber (0 m)" : `${distance} m dari alamat`}
              </div>
            </div>
          </div>

          {/* Top Instruction Pill (Matching Screenshot 1) */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none">
            <div className="rounded-full bg-black/80 border border-white/15 px-4 py-1.5 text-xs text-white/80 backdrop-blur-md shadow-lg flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Geser peta untuk menempatkan titik pintu masuk atau kumpul</span>
            </div>
          </div>

          {/* Floating Zoom & Reset Controls (Matching Screenshot 3 Bottom Right) */}
          <div className="absolute bottom-4 right-4 flex flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={handleResetToSource}
              className="flex size-8 items-center justify-center rounded-lg bg-black/80 border border-white/15 text-white/70 hover:text-white hover:bg-black transition-all shadow-md cursor-pointer"
              title="Kembali ke Titik Awal Alamat"
            >
              <RotateCcw className="size-3.5" />
            </button>
            <div className="flex flex-col rounded-lg bg-black/80 border border-white/15 overflow-hidden shadow-md">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(18, z + 1))}
                className="flex size-8 items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer border-b border-white/10"
                title="Perbesar Peta (+)"
              >
                <Plus className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(14, z - 1))}
                className="flex size-8 items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Perkecil Peta (-)"
              >
                <Minus className="size-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer (Matching Screenshot 3) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-white/10 bg-[#141518] px-6 py-4">
          <div className="text-xs text-white/60">
            {isOutOfRange ? (
              <span className="text-red-400 flex items-center gap-1.5 font-medium">
                <AlertCircle className="size-4 shrink-0" />
                Jarak melebihi batas 1 km ({distance} m). Silakan geser mendekat ke alamat awal.
              </span>
            ) : (
              <span>
                Seret pin atau geser peta untuk menempatkannya, maksimal 1 km dari alamat. ({distance} m dari alamat)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/20 px-4 py-2 text-xs font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isOutOfRange}
              className="rounded-xl bg-white px-5 py-2 text-xs font-semibold text-black shadow-sm transition-all hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Simpan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
