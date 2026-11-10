import { useState } from "react";
import { MapPin, Navigation, Phone, Store } from "lucide-react";
import type { StoreStockItemDto } from "@starter/shared/types";

interface StoreMapProps {
  stocks: StoreStockItemDto[];
  selectedBranchId?: string | null;
  onSelectBranch?: (branchId: string) => void;
}

export function StoreMap({
  stocks,
  selectedBranchId,
  onSelectBranch,
}: StoreMapProps) {
  const [activeBranchId, setActiveBranchId] = useState<string>(
    selectedBranchId || stocks[0]?.id || "",
  );

  const currentBranch =
    stocks.find((s) => s.id === activeBranchId) || stocks[0];

  // Map center coordinates (defaults to Jakarta if current branch selected)
  const lat = currentBranch ? currentBranch.latitude : -6.2088;
  const lon = currentBranch ? currentBranch.longitude : 106.8456;

  // OpenStreetMap embed URL with marker bounding box
  const osmUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.03}%2C${lat - 0.02}%2C${lon + 0.03}%2C${lat + 0.02}&layer=mapnik&marker=${lat}%2C${lon}`;

  return (
    <div className="bg-background border border-border/80 rounded-[10px] overflow-hidden shadow-xs">
      {/* Map Header */}
      <div className="p-4 border-b border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="size-4 text-[var(--color-accent)]" />
            <h3 className="font-serif text-base font-semibold text-foreground">
              Peta Sebaran Titik Stok Buku Fisik
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pilih cabang rekanan untuk melihat ketersediaan stok buku fisik
            secara langsung.
          </p>
        </div>

        {/* Quick Branch Switcher Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {stocks.map((stock) => {
            const isSelected =
              (selectedBranchId || activeBranchId) === stock.id;
            return (
              <button
                key={stock.id}
                type="button"
                onClick={() => {
                  setActiveBranchId(stock.id);
                  onSelectBranch?.(stock.id);
                }}
                className={`cursor-pointer px-2.5 py-1 rounded-[5px] text-xs font-mono whitespace-nowrap transition-all border ${
                  isSelected
                    ? "bg-[var(--color-ink)] text-[var(--color-paper)] font-semibold border-[var(--color-ink)]"
                    : "bg-background border-border/80 text-muted-foreground hover:bg-muted"
                }`}
              >
                {stock.branchName
                  .replace("Gramedia ", "")
                  .replace(" & Kolektif Buku", "")}
              </button>
            );
          })}
        </div>
      </div>

      {/* Map Viewport Area */}
      <div className="relative w-full h-[320px] sm:h-[380px] bg-muted/40">
        <iframe
          title={`Peta Lokasi ${currentBranch?.branchName || "Toko Mitra"}`}
          src={osmUrl}
          className="w-full h-full border-0 grayscale-[20%] contrast-[105%]"
          loading="lazy"
        />

        {/* Floating Active Store Info Card Overlay */}
        {currentBranch && (
          <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:max-w-md bg-background/95 backdrop-blur-md border border-border/80 rounded-[8px] p-3.5 shadow-lg">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-[var(--color-accent)] font-bold uppercase tracking-wider">
                  <Store className="size-3" />
                  <span>
                    {currentBranch.partnerType} &bull; {currentBranch.city}
                  </span>
                </div>
                <h4 className="font-serif text-sm font-semibold text-foreground mt-0.5">
                  {currentBranch.branchName}
                </h4>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {currentBranch.address}
                </p>
              </div>

              {/* Direct Google Maps Navigation */}
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(
                  currentBranch.branchName + " " + currentBranch.address,
                )}`}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 p-2 rounded-[6px] border border-border/80 bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="Buka rute navigasi di Google Maps"
              >
                <Navigation className="size-4" />
              </a>
            </div>

            {/* Live Stock Numbers */}
            <div className="mt-2.5 pt-2 border-t border-border/60 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-3">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  Edisi Rakyat: {currentBranch.rakyatStock} eks
                </span>
                <span className="text-muted-foreground">
                  Standar: {currentBranch.standardStock} eks
                </span>
              </div>

              {currentBranch.phone && (
                <div className="hidden sm:flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Phone className="size-3" />
                  <span>{currentBranch.phone}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
