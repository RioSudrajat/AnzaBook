import { useState } from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  Filter,
  MapPin,
  RefreshCw,
} from "lucide-react";
import type { PartnerType, StoreStockItemDto } from "@starter/shared/types";
import { Button } from "@/components/ui/button";
import { useBookStock } from "../hooks";

type LiveStockTrackerProps = {
  slug: string;
  initialStocks?: StoreStockItemDto[];
};

const CITY_OPTIONS = ["Semua Kota", "Jakarta", "Bandung", "Yogyakarta"];
const PARTNER_OPTIONS: { label: string; value: "all" | PartnerType }[] = [
  { label: "Semua Mitra", value: "all" },
  { label: "Gramedia", value: "gramedia" },
  { label: "Gudang Komunitas", value: "komunitas" },
];

export function LiveStockTracker({ slug, initialStocks }: LiveStockTrackerProps) {
  const [selectedCity, setSelectedCity] = useState("Semua Kota");
  const [selectedPartner, setSelectedPartner] = useState<"all" | PartnerType>("all");
  const [reservedBranchId, setReservedBranchId] = useState<string | null>(null);

  const queryCity = selectedCity === "Semua Kota" ? undefined : selectedCity;
  const { data: stockItems, isLoading, isError, refetch } = useBookStock(slug, {
    city: queryCity,
    partner: selectedPartner,
  });

  const displayItems = stockItems ?? initialStocks ?? [];

  const handleReserve = (branchId: string) => {
    setReservedBranchId(branchId);
    setTimeout(() => {
      // Clear after 8 seconds
      setReservedBranchId((curr) => (curr === branchId ? null : curr));
    }, 8000);
  };

  return (
    <div className="bg-background border border-border rounded-[10px] p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <h3 className="font-serif text-lg font-bold tracking-tight">
              Ketersediaan Fisik di Toko Rekanan
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Data tersinkronisasi langsung dari rak Gramedia dan gudang komunitas baca.
          </p>
        </div>

        {/* Quick Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* City Filter */}
          <div className="flex items-center gap-1.5 bg-muted/40 border border-border rounded-[6px] px-2.5 py-1 text-xs">
            <MapPin className="size-3.5 text-muted-foreground" />
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="bg-transparent text-foreground font-medium text-xs focus:outline-none cursor-pointer"
              aria-label="Filter Kota"
            >
              {CITY_OPTIONS.map((city) => (
                <option key={city} value={city} className="bg-background text-foreground">
                  {city}
                </option>
              ))}
            </select>
          </div>

          {/* Partner Filter */}
          <div className="flex items-center gap-1.5 bg-muted/40 border border-border rounded-[6px] px-2.5 py-1 text-xs">
            <Filter className="size-3.5 text-muted-foreground" />
            <select
              value={selectedPartner}
              onChange={(e) => setSelectedPartner(e.target.value as "all" | PartnerType)}
              className="bg-transparent text-foreground font-medium text-xs focus:outline-none cursor-pointer"
              aria-label="Filter Mitra Toko"
            >
              {PARTNER_OPTIONS.map((partner) => (
                <option
                  key={partner.value}
                  value={partner.value}
                  className="bg-background text-foreground"
                >
                  {partner.label}
                </option>
              ))}
            </select>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            className="h-8 px-2 text-xs"
            title="Segarkan Stok"
          >
            <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span className="sr-only">Segarkan</span>
          </Button>
        </div>
      </div>

      {/* Stock Table or State Views */}
      <div className="mt-4">
        {isLoading && displayItems.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <RefreshCw className="size-6 text-muted-foreground animate-spin mb-2" />
            <p className="text-sm font-medium text-muted-foreground">
              Memeriksa stok cabang terdekat...
            </p>
          </div>
        ) : isError ? (
          <div className="py-8 flex flex-col items-center justify-center text-center">
            <AlertCircle className="size-6 text-destructive mb-2" />
            <p className="text-sm font-medium text-foreground">
              Gagal memuat status stok toko rekanan.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="mt-3 text-xs"
            >
              Coba Lagi
            </Button>
          </div>
        ) : displayItems.length === 0 ? (
          <div className="py-10 flex flex-col items-center justify-center text-center bg-muted/20 rounded-[8px] border border-dashed border-border p-6">
            <Building2 className="size-8 text-muted-foreground/60 mb-2" />
            <h4 className="font-serif font-bold text-sm text-foreground">
              Stok Belum Tersedia di Lokasi Ini
            </h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              Cobalah ubah filter kota ke &quot;Semua Kota&quot; atau Anda dapat membaca edisi digital dwibahasa secara instan melalui web reader.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/70 text-muted-foreground font-mono uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Toko & Lokasi</th>
                  <th className="py-2.5 px-3">Edisi Rakyat</th>
                  <th className="py-2.5 px-3 hidden md:table-cell">Edisi Standar</th>
                  <th className="py-2.5 px-3 hidden sm:table-cell">Sinkronisasi</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-sans">
                {displayItems.map((item) => {
                  const isReserved = reservedBranchId === item.id;
                  const hasRakyatStock = item.rakyatStock > 0;
                  const isLowRakyatStock = item.rakyatStock > 0 && item.rakyatStock <= 5;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-muted/30 transition-colors group"
                    >
                      {/* Store & Location */}
                      <td className="py-3 px-3 align-top">
                        <div className="flex items-start gap-2">
                          <Building2 className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                          <div>
                            <div className="font-semibold text-foreground flex items-center gap-1.5 flex-wrap">
                              <span>{item.branchName}</span>
                              <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 bg-muted rounded-[3px] text-muted-foreground">
                                {item.partnerType === "gramedia"
                                  ? "Gramedia"
                                  : "Gudang Komunitas"}
                              </span>
                            </div>
                            <p className="text-muted-foreground text-[11px] mt-0.5">
                              {item.address}, {item.city}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Rakyat Edition Stock Badge */}
                      <td className="py-3 px-3 align-top whitespace-nowrap">
                        {hasRakyatStock ? (
                          <div className="inline-flex items-center gap-1.5">
                            <span
                              className={`size-2 rounded-full ${
                                isLowRakyatStock ? "bg-amber-500" : "bg-emerald-500"
                              }`}
                            />
                            <span
                              className={`font-mono text-xs font-semibold ${
                                isLowRakyatStock
                                  ? "text-amber-700 dark:text-amber-400"
                                  : "text-emerald-700 dark:text-emerald-400"
                              }`}
                            >
                              {item.rakyatStock} eks{" "}
                              <span className="font-normal opacity-80 text-[10px]">
                                ({isLowRakyatStock ? "Menipis" : "Tersedia"})
                              </span>
                            </span>
                          </div>
                        ) : (
                          <span className="font-mono text-xs text-muted-foreground opacity-60">
                            Habis di rak
                          </span>
                        )}
                      </td>

                      {/* Standard Edition Stock */}
                      <td className="py-3 px-3 align-top whitespace-nowrap hidden md:table-cell font-mono text-xs text-muted-foreground">
                        {item.standardStock > 0 ? (
                          <span>{item.standardStock} eks</span>
                        ) : (
                          <span className="opacity-60">Kosong</span>
                        )}
                      </td>

                      {/* Last Sync */}
                      <td className="py-3 px-3 align-top whitespace-nowrap hidden sm:table-cell font-mono text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="size-3 opacity-60" />
                          <span>
                            {new Date(item.lastStockCheck).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-3 align-top text-right whitespace-nowrap">
                        {isReserved ? (
                          <div className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-[4px] border border-emerald-500/20">
                            <CheckCircle2 className="size-3.5" />
                            <span>Reservasi #AZ-{item.id.slice(0, 4)}</span>
                          </div>
                        ) : hasRakyatStock ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReserve(item.id)}
                            className="h-7 text-[11px] font-mono px-2.5"
                          >
                            Simpan 1 Eks
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled
                            className="h-7 text-[11px] font-mono px-2.5 opacity-50"
                          >
                            Stok Habis
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
