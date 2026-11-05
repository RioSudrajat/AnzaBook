import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  BookOpen,
  Check,
  Feather,
  Layers,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { BookDetailDto, EditionTier } from "@starter/shared/types";
import { BookCover } from "./book-cover";
import { Button } from "@/components/ui/button";

type PaperTierSelectorProps = {
  book: BookDetailDto;
};

export function PaperTierSelector({ book }: PaperTierSelectorProps) {
  const [selectedTier, setSelectedTier] = useState<EditionTier | "digital">(
    "rakyat_economy",
  );

  const rakyatEdition = book.editions.find(
    (e) => e.tier === "rakyat_economy",
  );
  const standardEdition = book.editions.find(
    (e) => e.tier === "standard_trade",
  );
  const kolektorEdition = book.editions.find(
    (e) => e.tier === "kolektor_hardcover",
  );

  // Active edition metrics
  const activeEdition =
    selectedTier === "digital"
      ? null
      : book.editions.find((e) => e.tier === selectedTier) || rakyatEdition;

  const paperEdgeColor =
    selectedTier === "digital"
      ? "#E8E2D4"
      : selectedTier === "rakyat_economy"
        ? "#E8DECB" // newsprint slightly unbleached tint
        : selectedTier === "standard_trade"
          ? "#FBF7EE" // smooth cream bookpaper
          : "#E2D7C3"; // premium heavy bookpaper edge

  return (
    <div className="bg-background border border-border rounded-[10px] p-6 shadow-xs">
      <div className="flex flex-col lg:flex-row gap-8 items-center lg:items-start">
        {/* Left: 3D Paper & Spine Tactile Preview */}
        <div className="flex flex-col items-center shrink-0">
          <BookCover
            book={book}
            className="w-[180px] sm:w-[210px]"
            edition={{
              paperColor: paperEdgeColor,
              label: activeEdition ? `${activeEdition.weightGrams} g` : "Dwibahasa",
              priceIdr: activeEdition?.priceIdr ?? null,
            }}
          />

          {/* Physical specification badge */}
          <div className="mt-4 flex items-center gap-2 text-xs font-mono text-muted-foreground">
            <Feather className="size-3.5" />
            <span>
              {selectedTier === "digital"
                ? "Format: Web Reader & Audio"
                : `Kertas: ${activeEdition?.paperType}`}
            </span>
          </div>
        </div>

        {/* Right: Interactive 4-Tier Selector */}
        <div className="flex-1 w-full flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h4 className="font-serif text-lg font-bold tracking-tight">
                Pilih Format & Jenis Kertas
              </h4>
              <span className="text-xs font-mono text-muted-foreground">
                Sentuh untuk simulasi taktil
              </span>
            </div>

            {/* 4 Options Grid */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup">
              {/* Option 1: Edisi Rakyat Newsprint (Featured) */}
              {rakyatEdition && (
                <button
                  type="button"
                  role="radio"
                  aria-checked={selectedTier === "rakyat_economy"}
                  onClick={() => setSelectedTier("rakyat_economy")}
                  className={`text-left p-3.5 rounded-[8px] border transition-all cursor-pointer relative focus-visible:outline-2 focus-visible:outline-[var(--color-focus)] ${
                    selectedTier === "rakyat_economy"
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 shadow-xs"
                      : "border-border/80 hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-bold text-sm text-foreground flex items-center gap-1.5">
                      <Sparkles className="size-3.5 text-[var(--color-accent)]" />
                      Edisi Rakyat
                    </span>
                    <span className="font-mono text-xs font-bold text-[var(--color-accent)]">
                      Rp{rakyatEdition.priceIdr.toLocaleString("id-ID")}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Newsprint 48.8 gsm buram halus, enteng di mata & tas komuter.
                  </p>
                  <div className="mt-2 text-[11px] font-mono text-emerald-800 dark:text-emerald-300 font-semibold flex items-center gap-1">
                    <Check className="size-3" />
                    <span>Hemat {rakyatEdition.savingsPercent}% (Ritel: Rp{rakyatEdition.traditionalStorePriceIdr.toLocaleString("id-ID")})</span>
                  </div>
                </button>
              )}

              {/* Option 2: Digital SaaS */}
              <button
                type="button"
                role="radio"
                aria-checked={selectedTier === "digital"}
                onClick={() => setSelectedTier("digital")}
                className={`text-left p-3.5 rounded-[8px] border transition-all cursor-pointer relative focus-visible:outline-2 focus-visible:outline-[var(--color-focus)] ${
                  selectedTier === "digital"
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 shadow-xs"
                    : "border-border/80 hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-serif font-bold text-sm text-foreground flex items-center gap-1.5">
                    <BookOpen className="size-3.5 text-[var(--color-accent)]" />
                    Pustaka Digital
                  </span>
                  <span className="font-mono text-xs font-bold text-foreground">
                    Keanggotaan
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Baca dwibahasa split view, audiobook audio sync, dan akses catatan.
                </p>
                <div className="mt-2 text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                  <ShieldCheck className="size-3 text-emerald-600" />
                  <span>Gratis Sampel Bab 1</span>
                </div>
              </button>

              {/* Option 3: Edisi Standar Bookpaper */}
              {standardEdition && (
                <button
                  type="button"
                  role="radio"
                  aria-checked={selectedTier === "standard_trade"}
                  onClick={() => setSelectedTier("standard_trade")}
                  className={`text-left p-3.5 rounded-[8px] border transition-all cursor-pointer relative focus-visible:outline-2 focus-visible:outline-[var(--color-focus)] ${
                    selectedTier === "standard_trade"
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 shadow-xs"
                      : "border-border/80 hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-bold text-sm text-foreground flex items-center gap-1.5">
                      <Layers className="size-3.5 text-muted-foreground" />
                      Edisi Standar
                    </span>
                    <span className="font-mono text-xs font-bold text-foreground">
                      Rp{standardEdition.priceIdr.toLocaleString("id-ID")}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Bookpaper Krem 72 gsm, laminasi doff, jahit benang rapi.
                  </p>
                  <div className="mt-2 text-[11px] font-mono text-muted-foreground">
                    Hemat {standardEdition.savingsPercent}% (Ritel: Rp{standardEdition.traditionalStorePriceIdr.toLocaleString("id-ID")})
                  </div>
                </button>
              )}

              {/* Option 4: Edisi Kolektor Hardcover */}
              {kolektorEdition && (
                <button
                  type="button"
                  role="radio"
                  aria-checked={selectedTier === "kolektor_hardcover"}
                  onClick={() => setSelectedTier("kolektor_hardcover")}
                  className={`text-left p-3.5 rounded-[8px] border transition-all cursor-pointer relative focus-visible:outline-2 focus-visible:outline-[var(--color-focus)] ${
                    selectedTier === "kolektor_hardcover"
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 shadow-xs"
                      : "border-border/80 hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-bold text-sm text-foreground flex items-center gap-1.5">
                      <Sparkles className="size-3.5 text-amber-500" />
                      Edisi Kolektor
                    </span>
                    <span className="font-mono text-xs font-bold text-foreground">
                      Rp{kolektorEdition.priceIdr.toLocaleString("id-ID")}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Hardcover Board No. 30, foil emas, pita pembatas, bookpaper 80 gsm.
                  </p>
                  <div className="mt-2 text-[11px] font-mono text-muted-foreground">
                    Eksklusif &bull; {kolektorEdition.weightGrams}g
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* Action CTAs based on chosen tier */}
          <div className="mt-6 pt-5 border-t border-border flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                Format Terpilih
              </span>
              <span className="font-serif text-lg font-bold text-foreground">
                {selectedTier === "digital"
                  ? "Pustaka Digital Dwibahasa"
                  : activeEdition?.tierName}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Button asChild variant="outline">
                <Link
                  to="/read/$slug"
                  params={{ slug: book.slug }}
                  search={{ chapter: 1 }}
                >
                  <BookOpen className="size-4 mr-1.5" />
                  Baca Bab 1
                </Link>
              </Button>

              <Button asChild>
                <Link
                  to="/read/$slug"
                  params={{ slug: book.slug }}
                  search={{ chapter: 1 }}
                >
                  Baca Sekarang
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
