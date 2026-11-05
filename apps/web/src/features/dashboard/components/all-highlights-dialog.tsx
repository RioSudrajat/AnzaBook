import { useState } from "react";
import { Sparkles, Trash2, X } from "lucide-react";
import type { BookHighlightDto, HighlightColor } from "@starter/shared/types";
import { Button } from "@/components/ui/button";
import { useAllHighlights, useDeleteHighlight } from "@/features/books/hooks";

type AllHighlightsDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onOpenStory: (highlight: BookHighlightDto) => void;
};

export function AllHighlightsDialog({
  isOpen,
  onClose,
  onOpenStory,
}: AllHighlightsDialogProps) {
  const { data: highlights = [], isLoading } = useAllHighlights();
  const deleteMutation = useDeleteHighlight();
  const [filterColor, setFilterColor] = useState<"all" | HighlightColor>("all");

  if (!isOpen) return null;

  const colorStyles: Record<
    HighlightColor,
    { bg: string; border: string; text: string }
  > = {
    yellow: {
      bg: "bg-amber-300/15 dark:bg-amber-400/10",
      border: "border-amber-400/40",
      text: "text-amber-800 dark:text-amber-300",
    },
    green: {
      bg: "bg-emerald-300/15 dark:bg-emerald-400/10",
      border: "border-emerald-400/40",
      text: "text-emerald-800 dark:text-emerald-300",
    },
    coral: {
      bg: "bg-rose-300/15 dark:bg-rose-400/10",
      border: "border-rose-400/40",
      text: "text-rose-800 dark:text-rose-300",
    },
    blue: {
      bg: "bg-sky-300/15 dark:bg-sky-400/10",
      border: "border-sky-400/40",
      text: "text-sky-800 dark:text-sky-300",
    },
  };

  const filteredHighlights =
    filterColor === "all"
      ? highlights
      : highlights.filter((h) => h.color === filterColor);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="highlights-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150 text-foreground overflow-y-auto"
    >
      <div className="max-w-2xl w-full bg-card border border-border rounded-[14px] p-6 shadow-2xl relative space-y-5 my-auto max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-full bg-amber-500/15 text-amber-500 flex items-center justify-center">
              <Sparkles className="size-4" />
            </div>
            <div>
              <h2
                id="highlights-title"
                className="font-serif text-lg font-bold text-foreground"
              >
                Koleksi Stabilo & Catatan
              </h2>
              <p className="text-xs text-muted-foreground">
                Kutipan penting yang Anda tandai selama menyelami naskah.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted"
            aria-label="Tutup"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-2 shrink-0 text-xs font-mono">
          <span className="text-muted-foreground text-[11px]">Filter:</span>
          {(["all", "yellow", "green", "coral", "blue"] as const).map((col) => (
            <button
              key={col}
              type="button"
              onClick={() => setFilterColor(col)}
              className={`px-2.5 py-1 rounded-[5px] transition-colors capitalize text-[11px] ${
                filterColor === col
                  ? "bg-foreground text-background font-bold"
                  : "bg-muted/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              {col === "all" ? "Semua" : col}
            </button>
          ))}
          <span className="ml-auto text-[11px] text-muted-foreground">
            {filteredHighlights.length} Kutipan
          </span>
        </div>

        {/* List of Highlights */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {isLoading ? (
            <div className="py-12 text-center text-xs font-mono text-muted-foreground">
              Memuat kutipan stabilo...
            </div>
          ) : filteredHighlights.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground space-y-2">
              <Sparkles className="size-8 mx-auto opacity-40" />
              <p className="text-xs font-sans">
                Belum ada kutipan yang ditandai dengan stabilo.
              </p>
              <p className="text-[11px] font-mono opacity-70">
                Pilih teks saat membaca di reader untuk menandainya dengan warna stabilo.
              </p>
            </div>
          ) : (
            filteredHighlights.map((hl) => {
              const style = colorStyles[hl.color] || colorStyles.yellow;

              return (
                <div
                  key={hl.id}
                  className={`p-4 rounded-[10px] border transition-all ${style.bg} ${style.border} space-y-2 relative group`}
                >
                  <p className="font-serif text-sm leading-relaxed text-foreground/95 italic">
                    &ldquo;{hl.selectedText}&rdquo;
                  </p>

                  {hl.note && (
                    <div className="text-xs font-sans text-muted-foreground pt-1 border-t border-border/40">
                      <span className="font-semibold text-foreground/80 mr-1">
                        Catatan:
                      </span>
                      {hl.note}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 text-[10px] font-mono text-muted-foreground">
                    <span>
                      Bab {hl.chapterNumber} &bull; Hal {hl.pageNumber}
                    </span>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onOpenStory(hl)}
                        className="h-6 px-2 text-[10px] font-mono gap-1 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                      >
                        <Sparkles className="size-3" />
                        Flex Story
                      </Button>

                      <button
                        type="button"
                        onClick={() => deleteMutation.mutate(hl.id)}
                        className="p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Hapus Stabilo"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
