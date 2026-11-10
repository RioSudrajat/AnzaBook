import { useState } from "react";
import {
  Calculator,
  CheckCircle2,
  Printer,
  TrendingUp,
} from "lucide-react";
import { calculatePrintEconomics } from "@starter/shared/print-economics";

export function PublisherStudioPanel() {
  const [pageCount, setPageCount] = useState<number>(240);
  const [printRun, setPrintRun] = useState<number>(1000);
  const [royaltyPct, setRoyaltyPct] = useState<number>(12);

  const simulation = calculatePrintEconomics({
    pageCount,
    printRun,
    authorRoyaltyPct: royaltyPct,
  });

  const rakyatTier = simulation.tiers.find(
    (t) => t.editionTier === "rakyat_economy",
  );
  const standardTier = simulation.tiers.find(
    (t) => t.editionTier === "standard_trade",
  );
  const kolektorTier = simulation.tiers.find(
    (t) => t.editionTier === "kolektor_hardcover",
  );

  return (
    <div className="bg-background border border-border rounded-[10px] p-6 shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <Calculator className="size-5 text-[var(--color-accent)]" />
            <h3 className="font-serif text-xl font-bold tracking-tight">
              Studio Penerbit: Simulasi HPP Cetak Transparan
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Hitung biaya riil cetak buku per eksemplar, royalti penulis, titik
            impas (break-even), dan pemangkasan margin distributor 55%.
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-xs font-mono font-semibold">
          <CheckCircle2 className="size-3.5" />
          <span>Formula Cetak Terbuka (Open Ledger)</span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Input Sliders */}
        <div className="lg:col-span-4 p-5 rounded-[8px] bg-muted/20 border border-border space-y-5">
          <h4 className="font-serif font-bold text-sm text-foreground flex items-center gap-2">
            <Printer className="size-4 text-[var(--color-accent)]" />
            <span>Parameter Spesifikasi Buku</span>
          </h4>

          {/* Page Count */}
          <div>
            <div className="flex items-center justify-between text-xs font-mono mb-1.5">
              <span className="text-muted-foreground">Jumlah Halaman</span>
              <span className="font-bold text-foreground">
                {pageCount} Halaman
              </span>
            </div>
            <input
              type="range"
              min={60}
              max={600}
              step={10}
              value={pageCount}
              onChange={(e) => setPageCount(Number(e.target.value))}
              className="w-full accent-[var(--color-accent)] cursor-pointer"
              aria-label="Jumlah Halaman"
            />
            <div className="flex justify-between text-[10px] font-mono text-muted-foreground mt-1">
              <span>60 Hal (Risalah)</span>
              <span>600 Hal (Tebal)</span>
            </div>
          </div>

          {/* Print Run / Oplah */}
          <div>
            <div className="flex items-center justify-between text-xs font-mono mb-1.5">
              <span className="text-muted-foreground">Oplah Cetak</span>
              <span className="font-bold text-foreground">
                {printRun.toLocaleString("id-ID")} Eks
              </span>
            </div>
            <input
              type="range"
              min={100}
              max={10000}
              step={100}
              value={printRun}
              onChange={(e) => setPrintRun(Number(e.target.value))}
              className="w-full accent-[var(--color-accent)] cursor-pointer"
              aria-label="Oplah Cetak"
            />
            <div className="flex justify-between text-[10px] font-mono text-muted-foreground mt-1">
              <span>100 Eks (POD)</span>
              <span>10.000 Eks (Massal)</span>
            </div>
          </div>

          {/* Author Royalty Percentage */}
          <div>
            <div className="flex items-center justify-between text-xs font-mono mb-1.5">
              <span className="text-muted-foreground">Royalti Penulis</span>
              <span className="font-bold text-[var(--color-accent)]">
                {royaltyPct}%
              </span>
            </div>
            <input
              type="range"
              min={5}
              max={25}
              step={1}
              value={royaltyPct}
              onChange={(e) => setRoyaltyPct(Number(e.target.value))}
              className="w-full accent-[var(--color-accent)] cursor-pointer"
              aria-label="Persentase Royalti Penulis"
            />
            <p className="text-[11px] font-mono text-muted-foreground mt-1">
              Standar industri penerbit umum hanya memberikan 7% hingga 10%.
            </p>
          </div>

          {/* Summary Callout */}
          <div className="pt-3 border-t border-border text-xs text-muted-foreground leading-relaxed">
            <span className="font-bold text-foreground block mb-1">
              Tesis Biaya AnzaBook:
            </span>
            Kertas newsprint 48.8 gsm menekan ongkos bahan baku hingga 58% tanpa
            mengorbankan keterbacaan tipografi dan kontras naskah.
          </div>
        </div>

        {/* Right: Comparative Breakdown Matrix */}
        <div className="lg:col-span-8 space-y-6">
          {/* 3-Tier Comparison Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Edisi Rakyat (Featured) */}
            {rakyatTier && (
              <div className="p-4 rounded-[8px] border-2 border-[var(--color-accent)] bg-[var(--color-accent)]/5 relative flex flex-col justify-between">
                <div>
                  <div className="inline-flex items-center gap-1 font-mono text-[10px] uppercase font-bold text-[var(--color-accent)] px-2 py-0.5 bg-[var(--color-accent)]/15 rounded-[3px] mb-2">
                    <CheckCircle2 className="size-3" />
                    Pilihan Rakyat
                  </div>
                  <h4 className="font-serif font-bold text-base text-foreground">
                    Edisi Rakyat
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Newsprint 48.8 gsm
                  </p>

                  <div className="mt-4 space-y-2 font-mono text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">HPP Cetak:</span>
                      <span className="font-semibold text-foreground">
                        Rp{rakyatTier.hppPerUnitIdr.toLocaleString("id-ID")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Royalti ({royaltyPct}%):
                      </span>
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                        Rp
                        {rakyatTier.authorRoyaltyPerUnitIdr.toLocaleString(
                          "id-ID",
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Titik Impas:
                      </span>
                      <span className="font-semibold text-foreground">
                        {rakyatTier.breakEvenUnits} Eks
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-[var(--color-accent)]/30">
                  <div className="text-[10px] font-mono text-muted-foreground uppercase">
                    Harga Jual Eceran
                  </div>
                  <div className="font-mono text-xl font-bold text-[var(--color-accent)]">
                    Rp{rakyatTier.recommendedPriceIdr.toLocaleString("id-ID")}
                  </div>
                  <div className="mt-1 text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-semibold">
                    Hemat {rakyatTier.savingsPercentVsTraditional}% vs Toko
                    Konvensional (Rp
                    {rakyatTier.traditionalRetailPriceIdr.toLocaleString(
                      "id-ID",
                    )}
                    )
                  </div>
                </div>
              </div>
            )}

            {/* Edisi Standar */}
            {standardTier && (
              <div className="p-4 rounded-[8px] border border-border bg-card flex flex-col justify-between">
                <div>
                  <div className="font-mono text-[10px] uppercase text-muted-foreground mb-2">
                    Standar Pasar
                  </div>
                  <h4 className="font-serif font-bold text-base text-foreground">
                    Edisi Standar
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Bookpaper Krem 72 gsm
                  </p>

                  <div className="mt-4 space-y-2 font-mono text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">HPP Cetak:</span>
                      <span className="font-semibold text-foreground">
                        Rp{standardTier.hppPerUnitIdr.toLocaleString("id-ID")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Royalti ({royaltyPct}%):
                      </span>
                      <span className="font-semibold text-foreground">
                        Rp
                        {standardTier.authorRoyaltyPerUnitIdr.toLocaleString(
                          "id-ID",
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Titik Impas:
                      </span>
                      <span className="font-semibold text-foreground">
                        {standardTier.breakEvenUnits} Eks
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-border">
                  <div className="text-[10px] font-mono text-muted-foreground uppercase">
                    Harga Jual Eceran
                  </div>
                  <div className="font-mono text-lg font-bold text-foreground">
                    Rp{standardTier.recommendedPriceIdr.toLocaleString("id-ID")}
                  </div>
                  <div className="mt-1 text-[11px] font-mono text-muted-foreground">
                    Hemat {standardTier.savingsPercentVsTraditional}%
                  </div>
                </div>
              </div>
            )}

            {/* Edisi Kolektor */}
            {kolektorTier && (
              <div className="p-4 rounded-[8px] border border-border bg-card flex flex-col justify-between">
                <div>
                  <div className="font-mono text-[10px] uppercase text-amber-500 mb-2">
                    Eksklusif Koleksi
                  </div>
                  <h4 className="font-serif font-bold text-base text-foreground">
                    Edisi Kolektor
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Hardcover Board + Foil
                  </p>

                  <div className="mt-4 space-y-2 font-mono text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">HPP Cetak:</span>
                      <span className="font-semibold text-foreground">
                        Rp{kolektorTier.hppPerUnitIdr.toLocaleString("id-ID")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Royalti ({royaltyPct}%):
                      </span>
                      <span className="font-semibold text-foreground">
                        Rp
                        {kolektorTier.authorRoyaltyPerUnitIdr.toLocaleString(
                          "id-ID",
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Titik Impas:
                      </span>
                      <span className="font-semibold text-foreground">
                        {kolektorTier.breakEvenUnits} Eks
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-border">
                  <div className="text-[10px] font-mono text-muted-foreground uppercase">
                    Harga Jual Eceran
                  </div>
                  <div className="font-mono text-lg font-bold text-foreground">
                    Rp{kolektorTier.recommendedPriceIdr.toLocaleString("id-ID")}
                  </div>
                  <div className="mt-1 text-[11px] font-mono text-muted-foreground">
                    Kolektor Hardcover No. 30
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Educational Economic Manifesto Callout */}
          <div className="p-4 rounded-[8px] bg-muted/30 border border-border flex items-start gap-3">
            <TrendingUp className="size-5 text-[var(--color-accent)] shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-serif font-bold text-foreground block mb-0.5">
                Mengapa Buku Konvensional di Indonesia Sangat Mahal?
              </span>
              Di toko buku besar biasa, harga jual ritel dibebani potongan
              konsinyasi distributor sebesar 50% hingga 55%, ditambah biaya
              retur gudang dan margin distributor bertingkat. AnzaBook memotong
              seluruh mata rantai perantara ini dan menyalurkan buku langsung
              melalui toko rekanan dan komunitas pembaca berdaulat.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
