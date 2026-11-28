import * as React from "react";
import { Camera, Check, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BookCover } from "@/features/books/components/book-cover";
import { ManuscriptCoverPlaceholder } from "@/features/books/components/manuscript-cover-placeholder";
import { useUploadMediaImage } from "@/features/social/hooks";
import { isUsableAssetUrl } from "@/lib/media-url";

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

export const isUsableCoverImageUrl = isUsableAssetUrl;

interface ReaderBookHeaderProps {
  authorOrPublisher: string;
  title: string;
  synopsis?: string;
  canEditSynopsis?: boolean;
  isDraftManuscript?: boolean;
  totalChapters?: number;
  coverUrl?: string | null;
  coverColor?: string | null;
  publishedYear?: number;
  genres?: string[];
  pageCount?: number;
  isEditMode?: boolean;
  onTitleChange?: (newTitle: string) => void;
  onSynopsisChange?: (newSynopsis: string) => void;
  onCoverUrlChange?: (newCoverUrl: string | null) => void;
  onCoverColorChange?: (newCoverColor: string) => void;
  onCoverModalClose?: () => void;
  className?: string;
}

export function ReaderBookHeader({
  authorOrPublisher,
  title,
  synopsis = "",
  canEditSynopsis = true,
  isDraftManuscript = false,
  coverUrl,
  coverColor = "#181614",
  publishedYear,
  genres,
  pageCount,
  isEditMode = false,
  onTitleChange,
  onSynopsisChange,
  onCoverUrlChange,
  onCoverColorChange,
  onCoverModalClose,
  className = "",
}: ReaderBookHeaderProps) {
  const [isCoverModalOpen, setIsCoverModalOpen] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [isSynopsisFocused, setIsSynopsisFocused] = React.useState(false);
  const [isSynopsisExpanded, setIsSynopsisExpanded] = React.useState(false);
  const [isSynopsisTruncatable, setIsSynopsisTruncatable] =
    React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const coverDialogRef = React.useRef<HTMLDialogElement>(null);
  const pressedOutsideRef = React.useRef(false);
  const synopsisPreviewRef = React.useRef<HTMLParagraphElement>(null);
  const synopsisId = React.useId();
  const coverTitleId = React.useId();

  const uploadMediaMutation = useUploadMediaImage();
  const isCustomImage = isUsableAssetUrl(coverUrl);
  const hasTemplateCover = coverUrl === "template";
  const hasConfiguredCover = isCustomImage || hasTemplateCover;
  const showBookCover = !isDraftManuscript || hasConfiguredCover;
  const trimmedTitle = title.trim();
  const trimmedSynopsis = synopsis.trim();

  const closeCoverModal = () => {
    setIsCoverModalOpen(false);
    onCoverModalClose?.();
  };

  React.useEffect(() => {
    const dialog = coverDialogRef.current;
    if (!dialog) return;
    if (isCoverModalOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isCoverModalOpen && dialog.open) {
      dialog.close();
    }
  }, [isCoverModalOpen]);

  React.useEffect(() => {
    const el = synopsisPreviewRef.current;
    if (!el || isEditMode || !trimmedSynopsis) {
      setIsSynopsisTruncatable(false);
      return;
    }

    const measure = () => {
      if (!el || isSynopsisExpanded) return;
      setIsSynopsisTruncatable(el.scrollHeight > el.clientHeight + 2);
    };

    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [trimmedSynopsis, isEditMode, isSynopsisExpanded]);

  const handleDeviceFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadError(null);

    if (!file.type.startsWith("image/")) {
      setUploadError("Pilih berkas gambar JPG, PNG, atau WebP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Ukuran berkas melebihi batas maksimal 5 MB.");
      return;
    }

    try {
      const uploaded = await uploadMediaMutation.mutateAsync(file);
      onCoverUrlChange?.(uploaded.url);
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : "Gagal mengunggah sampul ke server media.",
      );
    }
  };

  const handleSelectPalette = (paletteColor: string) => {
    setUploadError(null);
    onCoverColorChange?.(paletteColor);
    onCoverUrlChange?.("template");
  };

  const isPointerOutside = (
    e: React.PointerEvent<HTMLDialogElement>,
    dialog: HTMLDialogElement,
  ) => {
    const rect = dialog.getBoundingClientRect();
    return (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    );
  };

  return (
    <header
      className={`w-full pt-8 pb-10 mb-8 border-b border-[var(--color-rule)] flex flex-col-reverse sm:flex-row sm:items-start justify-between gap-6 ${className}`}
    >
      {/* Hidden file input for device cover upload */}
      <input
        id="reader-cover-upload"
        name="readerCoverFile"
        aria-label="Unggah sampul buku"
        type="file"
        ref={fileInputRef}
        onChange={handleDeviceFileUpload}
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
      />

      {/* Left: Author, Title, and Inline Synopsis */}
      <div className="flex-1 space-y-3 min-w-0">
        <p className="text-xs sm:text-sm font-sans tracking-wide text-[var(--color-muted)] uppercase font-medium">
          {authorOrPublisher || "Penulis Resmi AnzaBook"}
        </p>

        {isEditMode ? (
          <div
            className="editorial-title-grow font-serif font-bold text-2xl sm:text-3xl md:text-4xl leading-tight"
            data-replicated-value={title}
          >
            <textarea
              rows={1}
              aria-label="Judul buku atau naskah"
              value={title}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                }
              }}
              onChange={(e) =>
                onTitleChange?.(e.target.value.replace(/\r?\n/g, " "))
              }
              placeholder="Ketik judul buku atau naskah..."
              className="editorial-title-textarea bg-transparent font-serif font-bold text-2xl sm:text-3xl md:text-4xl leading-tight text-[var(--color-ink)] outline-none border-b border-dashed border-[var(--color-rule)] focus:border-[var(--color-accent)] placeholder:text-[var(--color-muted)]/50 py-1 transition-colors"
            />
          </div>
        ) : (
          <h1 className="font-serif font-bold text-2xl sm:text-3xl md:text-4xl text-[var(--color-ink)] leading-tight">
            {trimmedTitle || (
              <span className="italic text-[var(--color-muted)]">
                Naskah Tanpa Judul
              </span>
            )}
          </h1>
        )}

        {/* Inline Editorial Synopsis directly beneath Title */}
        {isEditMode && canEditSynopsis && onSynopsisChange ? (
          <div className="space-y-1 pt-0.5">
            <label htmlFor={synopsisId} className="sr-only">
              Sinopsis buku
            </label>
            <div
              className="editorial-synopsis-grow text-[15px] sm:text-base leading-relaxed"
              data-replicated-value={synopsis}
            >
              <textarea
                id={synopsisId}
                aria-label="Sinopsis buku"
                value={synopsis}
                maxLength={5000}
                onFocus={() => setIsSynopsisFocused(true)}
                onBlur={() => setIsSynopsisFocused(false)}
                onChange={(e) =>
                  onSynopsisChange(e.target.value.slice(0, 5000))
                }
                placeholder="Tulis sinopsis atau ringkasan buku di sini..."
                className="editorial-synopsis-textarea bg-transparent font-sans text-[15px] sm:text-base leading-relaxed text-[var(--color-ink-2)] placeholder:text-[var(--color-muted)]/60 border-b border-dashed border-[var(--color-rule)] focus:border-[var(--color-accent)] outline-none py-1 transition-colors"
              />
            </div>
            {(isSynopsisFocused || synopsis.length > 0) && (
              <p className="font-mono text-[11px] text-[var(--color-muted)] text-right">
                {synopsis.length} / 5000 karakter
              </p>
            )}
          </div>
        ) : trimmedSynopsis ? (
          <div className="space-y-1 pt-0.5">
            <p
              ref={synopsisPreviewRef}
              className={`font-sans text-[15px] sm:text-base leading-relaxed text-[var(--color-ink-2)] whitespace-pre-line ${
                isSynopsisExpanded ? "" : "line-clamp-3"
              }`}
            >
              {trimmedSynopsis}
            </p>
            {(isSynopsisTruncatable || isSynopsisExpanded) && (
              <button
                type="button"
                aria-expanded={isSynopsisExpanded}
                onClick={() => setIsSynopsisExpanded((prev) => !prev)}
                className="inline-flex min-h-11 items-center text-xs font-semibold text-[var(--color-accent)] hover:underline cursor-pointer"
              >
                {isSynopsisExpanded ? "Ringkas" : "Lihat selengkapnya"}
              </button>
            )}
          </div>
        ) : canEditSynopsis ? (
          <p className="pt-0.5 text-sm italic text-[var(--color-muted)]">
            Sinopsis belum diisi. Aktifkan mode Edit untuk menulis ringkasan
            buku di bawah judul.
          </p>
        ) : null}
      </div>

      {/* Right: 2:3 Book Cover Preview / Clickable Placeholder */}
      <div className="shrink-0 self-start sm:self-center">
        <div className="relative group w-24 sm:w-28 md:w-32 aspect-[2/3]">
          {showBookCover ? (
            <>
              <BookCover
                book={{
                  title: trimmedTitle || "Naskah Tanpa Judul",
                  author: authorOrPublisher || "Penulis",
                  coverUrl,
                  coverColor: coverColor || "#181614",
                  publishedYear: publishedYear ?? new Date().getFullYear(),
                  genres: genres && genres.length > 0 ? genres : ["Sastra"],
                  pageCount: pageCount ?? 120,
                }}
                className="w-full h-full aspect-[2/3]"
                decorative
              />

              {isEditMode && (
                <button
                  type="button"
                  onClick={() => setIsCoverModalOpen(true)}
                  className="absolute inset-0 z-30 rounded-[6px] bg-black/65 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 flex flex-col items-center justify-center gap-1.5 text-white text-xs font-medium transition-opacity cursor-pointer p-2 text-center"
                  title="Atur warna template atau unggah gambar sampul"
                >
                  <Camera className="size-4" aria-hidden="true" />
                  <span>Ganti Sampul</span>
                </button>
              )}
            </>
          ) : isEditMode ? (
            <button
              type="button"
              onClick={() => setIsCoverModalOpen(true)}
              aria-label="Pilih atau unggah sampul buku"
              className="relative block size-full rounded-[6px] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
              title="Klik untuk mengunggah gambar atau memilih warna sampul"
            >
              <ManuscriptCoverPlaceholder
                title={trimmedTitle}
                className="size-full group-hover:border-[var(--color-accent)] group-hover:text-[var(--color-ink)] transition-colors"
              />
              <span className="absolute inset-x-1.5 bottom-2 flex items-center justify-center gap-1 rounded-md bg-[var(--color-paper-2)]/90 px-1.5 py-1 text-[10px] font-medium text-[var(--color-ink)] opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity shadow-xs">
                <Camera className="size-3" aria-hidden="true" />
                <span>Atur Sampul</span>
              </span>
            </button>
          ) : (
            <ManuscriptCoverPlaceholder
              title={trimmedTitle}
              className="size-full"
            />
          )}
        </div>
      </div>

      {/* Native Cover Configuration Dialog */}
      <dialog
        ref={coverDialogRef}
        aria-labelledby={coverTitleId}
        {...({ closedby: "any" } as Record<string, string>)}
        onPointerDown={(e) => {
          const dialog = coverDialogRef.current;
          if (!dialog) return;
          pressedOutsideRef.current = isPointerOutside(e, dialog);
        }}
        onPointerUp={(e) => {
          const dialog = coverDialogRef.current;
          if (!dialog) return;
          if (pressedOutsideRef.current && isPointerOutside(e, dialog)) {
            closeCoverModal();
          }
          pressedOutsideRef.current = false;
        }}
        onClose={() => {
          if (coverDialogRef.current) coverDialogRef.current.returnValue = "";
          setUploadError(null);
          if (isCoverModalOpen) closeCoverModal();
        }}
        className="m-auto w-[min(94vw,30rem)] max-h-[90vh] overflow-y-auto overscroll-contain rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-0 text-[var(--color-ink)] shadow-2xl backdrop:bg-black/65 backdrop:overflow-hidden backdrop:overscroll-contain"
      >
        {isCoverModalOpen && (
          <div className="p-6 space-y-5">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--color-rule)] pb-3">
              <div className="space-y-1">
                <h1
                  id={coverTitleId}
                  className="font-serif text-lg font-bold text-[var(--color-ink)]"
                >
                  Konfigurasi Sampul Buku
                </h1>
                <p className="text-xs text-[var(--color-muted)]">
                  Pilih palet warna template resmi atau unggah gambar sampul
                  dari perangkat.
                </p>
              </div>
              <button
                type="button"
                onClick={closeCoverModal}
                aria-label="Tutup pengaturan sampul"
                className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-[var(--color-muted)] hover:bg-[var(--color-paper-3)] hover:text-[var(--color-ink)] cursor-pointer"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            {uploadError && (
              <p
                role="alert"
                className="rounded-xl border border-[var(--color-error)]/40 bg-[var(--color-error-soft)] px-3.5 py-2.5 text-xs"
              >
                {uploadError}
              </p>
            )}

            <div className="flex items-center gap-4 rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] p-3.5">
              <div className="w-16 shrink-0 aspect-[2/3]">
                {hasConfiguredCover ? (
                  <BookCover
                    book={{
                      title: trimmedTitle || "Naskah Tanpa Judul",
                      author: authorOrPublisher || "Penulis",
                      coverUrl,
                      coverColor: coverColor || "#181614",
                      publishedYear: publishedYear ?? new Date().getFullYear(),
                      genres: genres && genres.length > 0 ? genres : ["Sastra"],
                      pageCount: pageCount ?? 120,
                    }}
                    className="w-full h-full aspect-[2/3]"
                    decorative
                  />
                ) : (
                  <ManuscriptCoverPlaceholder
                    title={trimmedTitle}
                    compact
                    className="size-full"
                  />
                )}
              </div>
              <div className="min-w-0 space-y-1">
                <p className="font-serif text-sm font-bold truncate">
                  {trimmedTitle || (
                    <span className="italic text-[var(--color-muted)]">
                      Naskah Tanpa Judul
                    </span>
                  )}
                </p>
                <p className="font-mono text-[11px] text-[var(--color-muted)]">
                  {isCustomImage
                    ? "Menggunakan gambar sampul unggahan"
                    : hasTemplateCover
                      ? "Menggunakan sampul template AnzaBook"
                      : "Belum ada sampul dipilih"}
                </p>
              </div>
            </div>

            {/* Section 1: Template Color Palette */}
            <div className="space-y-2.5">
              <span className="block text-xs font-semibold text-[var(--color-ink-2)]">
                1. Pilih warna sampul template
              </span>

              <div className="grid grid-cols-4 gap-2">
                {COVER_PALETTES.map((palette) => {
                  const isSelected =
                    !isCustomImage &&
                    hasTemplateCover &&
                    coverColor === palette.color;
                  return (
                    <button
                      key={palette.color}
                      type="button"
                      onClick={() => handleSelectPalette(palette.color)}
                      style={{ backgroundColor: palette.color }}
                      className={`relative aspect-[3/2] min-h-11 rounded-lg border flex flex-col items-center justify-center p-1 text-center transition-transform cursor-pointer ${
                        isSelected
                          ? "ring-2 ring-[var(--color-accent)] ring-offset-2 border-transparent"
                          : "border-[var(--color-rule)] hover:scale-[1.02]"
                      } ${palette.textDark ? "text-neutral-900" : "text-white"}`}
                    >
                      <span className="text-[10px] font-medium leading-tight line-clamp-1">
                        {palette.name}
                      </span>
                      {isSelected && (
                        <Check className="size-3.5 mt-0.5" aria-hidden="true" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 2: Direct Device File Upload */}
            <div className="space-y-2 border-t border-[var(--color-rule)] pt-3">
              <span className="block text-xs font-semibold text-[var(--color-ink-2)]">
                2. Unggah gambar sampul (JPG, PNG, WebP maksimal 5 MB)
              </span>

              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  disabled={uploadMediaMutation.isPending}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 min-h-11 bg-[var(--color-accent)] hover:brightness-95 text-[var(--color-accent-ink)] font-semibold text-xs rounded-xl cursor-pointer"
                >
                  <Upload className="size-4" aria-hidden="true" />
                  <span>
                    {uploadMediaMutation.isPending
                      ? "Mengunggah sampul..."
                      : "Pilih gambar dari perangkat"}
                  </span>
                </Button>

                {hasConfiguredCover && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      onCoverUrlChange?.(null);
                    }}
                    className="w-full text-xs text-[var(--color-muted)] hover:text-[var(--color-ink)] min-h-11 border-[var(--color-rule)] rounded-xl cursor-pointer"
                  >
                    Hapus sampul (kembali ke placeholder)
                  </Button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end border-t border-[var(--color-rule)] pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={closeCoverModal}
                className="min-h-11 px-5 text-xs font-medium cursor-pointer"
              >
                Selesai
              </Button>
            </div>
          </div>
        )}
      </dialog>
    </header>
  );
}
