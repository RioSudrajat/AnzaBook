import * as React from "react";
import { BookOpen, Camera, Upload, Palette, Check, Sparkles, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BookCover } from "@/features/books/components/book-cover";

export const COVER_PALETTES = [
  { name: "Manila Krem", color: "#E8DFD1", textDark: true },
  { name: "Classic Obsidian", color: "#181614", textDark: false },
  { name: "Burgundy Marun", color: "#4A1521", textDark: false },
  { name: "Emerald Tua", color: "#143829", textDark: false },
  { name: "Amber Hangat", color: "#45260C", textDark: false },
  { name: "Indigo Malam", color: "#1A2540", textDark: false },
  { name: "Slate Abu", color: "#26292E", textDark: false },
  { name: "Terracotta Bata", color: "#5C2818", textDark: false },
];

/** Checks if a cover URL is an actual loaded image (http/https/data:image). Seed placeholders or invalid paths default to the signature AnzaBook BookCover. */
export function isUsableCoverImageUrl(url?: string | null): url is string {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed === "template") return false;
  if (trimmed.startsWith("/covers/")) return false;
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://") && !trimmed.startsWith("data:image/")) {
    return false;
  }
  return true;
}

interface ReaderBookHeaderProps {
  authorOrPublisher: string;
  title: string;
  totalChapters: number;
  coverUrl?: string | null;
  coverColor?: string | null;
  publishedYear?: number;
  genres?: string[];
  pageCount?: number;
  isEditMode?: boolean;
  onTitleChange?: (newTitle: string) => void;
  onCoverUrlChange?: (newCoverUrl: string | null) => void;
  onCoverColorChange?: (newCoverColor: string) => void;
  className?: string;
}

export function ReaderBookHeader({
  authorOrPublisher,
  title,
  totalChapters,
  coverUrl,
  coverColor = "#181614",
  publishedYear,
  genres,
  pageCount,
  isEditMode = false,
  onTitleChange,
  onCoverUrlChange,
  onCoverColorChange,
  className = "",
}: ReaderBookHeaderProps) {
  const [isCoverModalOpen, setIsCoverModalOpen] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDeviceFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      onCoverUrlChange?.(dataUrl);
      setIsCoverModalOpen(false);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSelectPalette = (paletteColor: string) => {
    onCoverColorChange?.(paletteColor);
    onCoverUrlChange?.("template"); // Revert to template cover with chosen color
  };

  const [imgFailedFor, setImgFailedFor] = React.useState<string | null>(null);
  const isCustomImage =
    isUsableCoverImageUrl(coverUrl) && imgFailedFor !== coverUrl;

  return (
    <header
      className={`w-full pt-8 pb-12 mb-8 border-b border-border/60 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-6 transition-all ${className}`}
    >
      {/* Hidden file input for device cover upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleDeviceFileUpload}
        accept="image/*"
        className="hidden"
      />

      {/* Left / Info Section */}
      <div className="flex-1 space-y-3 min-w-0">
        <div className="space-y-1">
          <p className="text-xs sm:text-sm font-sans tracking-wide text-muted-foreground uppercase font-medium">
            {authorOrPublisher || "Penulis Resmi AnzaBook"}
          </p>

          {isEditMode ? (
            <input
              type="text"
              value={title}
              onChange={(e) => onTitleChange?.(e.target.value)}
              placeholder="Ketik Judul Buku / Naskah..."
              className="w-full bg-transparent font-serif font-bold text-2xl sm:text-3xl md:text-4xl text-foreground outline-none border-b border-dashed border-border/80 focus:border-[var(--color-accent)] placeholder:text-muted-foreground/40 py-1 transition-colors"
            />
          ) : (
            <h1 className="font-serif font-bold text-2xl sm:text-3xl md:text-4xl text-foreground leading-tight">
              {title || "Naskah Tanpa Judul"}
            </h1>
          )}
        </div>

        <div className="flex items-center gap-2 pt-1 text-xs font-mono text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/60 border border-border/60">
            <BookOpen className="size-3.5 text-muted-foreground" />
            <span>{totalChapters} {totalChapters === 1 ? "chapter" : "chapters"}</span>
          </span>
          {isEditMode && (
            <span className="text-[11px] font-sans text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
              Mode Edit Aktif
            </span>
          )}
        </div>
      </div>

      {/* Right / Book Cover: Signature AnzaBook Template Cover by default, or Custom Device Image */}
      <div className="shrink-0 self-start sm:self-center">
        <div className="relative group w-24 sm:w-28 md:w-32 aspect-[7/10] rounded-lg overflow-hidden border border-border/80 shadow-md bg-muted/40">
          {isCustomImage ? (
            <img
              src={coverUrl!}
              alt={title || "Cover Buku"}
              onError={() => setImgFailedFor(coverUrl ?? null)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <BookCover
              book={{
                title: title || "Naskah Buku",
                author: authorOrPublisher || "Penulis",
                coverColor: coverColor || "#181614",
                publishedYear: publishedYear ?? new Date().getFullYear(),
                genres: genres && genres.length > 0 ? genres : ["Sastra"],
                pageCount: pageCount ?? 120,
              }}
              className="w-full h-full"
              decorative
            />
          )}

          {isEditMode && (
            <button
              type="button"
              onClick={() => setIsCoverModalOpen(true)}
              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 text-white text-[11px] font-medium transition-opacity cursor-pointer p-2 text-center"
              title="Atur Warna Template atau Unggah dari Device"
            >
              <Camera className="size-4" />
              <span>Ganti Cover</span>
            </button>
          )}
        </div>
      </div>

      {/* In-App Cover Configuration Dialog (Template Palettes + Device Upload) */}
      {isCoverModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs text-foreground animate-in fade-in duration-100"
        >
          <div
            className="fixed inset-0"
            onClick={() => setIsCoverModalOpen(false)}
            aria-hidden="true"
          />
          <div className="relative max-w-md w-full rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 z-10">
            <div className="flex items-start justify-between border-b border-border/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20">
                  <Palette className="size-5" />
                </div>
                <div>
                  <h3 className="font-serif text-base sm:text-lg font-bold">
                    Konfigurasi Sampul Buku
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Gunakan sampul resmi template AnzaBook atau unggah gambar dari perangkat.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCoverModalOpen(false)}
                className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Section 1: Template Color Palette */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  1. Pilih Warna Sampul Template Resmi
                </label>
                {!isCustomImage && (
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                    Template Aktif
                  </span>
                )}
              </div>

              <div className="grid grid-cols-4 gap-2">
                {COVER_PALETTES.map((palette) => {
                  const isSelected = !isCustomImage && (coverColor === palette.color);
                  return (
                    <button
                      key={palette.color}
                      type="button"
                      onClick={() => handleSelectPalette(palette.color)}
                      style={{ backgroundColor: palette.color }}
                      className={`relative aspect-[3/2] rounded-lg border flex flex-col items-center justify-center p-1 text-center transition-all cursor-pointer ${
                        isSelected
                          ? "ring-2 ring-[var(--color-accent)] ring-offset-2 scale-102 shadow-sm border-transparent"
                          : "border-border/40 hover:scale-102"
                      } ${palette.textDark ? "text-neutral-900" : "text-white"}`}
                    >
                      <span className="text-[10px] font-medium leading-tight line-clamp-1">
                        {palette.name}
                      </span>
                      {isSelected && (
                        <Check className="size-3.5 mt-0.5" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 2: Direct Device File Upload */}
            <div className="space-y-2 pt-2 border-t border-border/80">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                2. Atau Unggah Gambar Sampul dari Perangkat
              </label>

              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 h-10 bg-[var(--color-accent)] hover:opacity-90 text-white font-medium text-xs rounded-xl cursor-pointer"
                >
                  <Upload className="size-4" />
                  <span>Pilih File Gambar dari Device (PC / HP)</span>
                </Button>

                {isCustomImage && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      onCoverUrlChange?.("template");
                    }}
                    className="w-full text-xs text-muted-foreground hover:text-foreground h-9 border-border/80 rounded-xl"
                  >
                    Kembalikan ke Sampul Template
                  </Button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-border/80">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCoverModalOpen(false)}
                className="h-9 px-4 text-xs font-medium"
              >
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
