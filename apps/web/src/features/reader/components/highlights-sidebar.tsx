import { ChevronRight, Maximize2, Minimize2, Share2, Sparkles, Trash2, X } from "lucide-react";
import { useState } from "react";
import type { BookHighlightDto } from "@starter/shared/types";
import { Button } from "@/components/ui/button";

type HighlightsSidebarProps = {
  isOpen: boolean;
  onClose: () => void;
  highlights: BookHighlightDto[];
  allChapters: {
    id: string;
    chapterNumber: number;
    title: string;
  }[];
  onSelectHighlight: (h: BookHighlightDto) => void;
  onFlexHighlight: (h: BookHighlightDto) => void;
  onDeleteHighlight?: (id: string) => void;
};

export function HighlightsSidebar({
  isOpen,
  onClose,
  highlights,
  allChapters,
  onSelectHighlight,
  onFlexHighlight,
  onDeleteHighlight,
}: HighlightsSidebarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isOpen) return null;

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const getChapterTitle = (chapterNum: number) => {
    const chap = allChapters.find((c) => c.chapterNumber === chapterNum);
    return chap ? chap.title : `Bab ${chapterNum}`;
  };

  const getColorClasses = (color: string) => {
    switch (color) {
      case "green":
        return "bg-emerald-950/20 border-emerald-500/30 text-emerald-100";
      case "coral":
        return "bg-rose-950/20 border-rose-500/30 text-rose-100";
      case "blue":
        return "bg-sky-950/20 border-sky-500/30 text-sky-100";
      case "yellow":
      default:
        return "bg-[#383321]/60 border-[#6B5E38]/50 text-[#F5E8C7]";
    }
  };

  return (
    <aside
      className={`fixed right-0 top-0 bottom-0 z-50 bg-[#161413]/95 text-[#EDE8DF] border-l border-white/10 backdrop-blur-md flex flex-col shadow-2xl transition-all duration-300 ${
        isExpanded ? "w-full max-w-xl" : "w-full sm:w-[420px]"
      }`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <h2 className="font-serif text-lg font-bold text-foreground">
            Highlights ({highlights.length})
          </h2>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-[6px] hover:bg-white/5 transition-colors"
            title={isExpanded ? "Perkecil Panel" : "Perluas Panel"}
          >
            {isExpanded ? (
              <Minimize2 className="size-4" />
            ) : (
              <Maximize2 className="size-4" />
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-[6px] hover:bg-white/5 transition-colors"
            title="Tutup Panel Highlights"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* List of Highlights */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
        {highlights.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground space-y-3">
            <div className="size-10 rounded-full bg-white/5 mx-auto flex items-center justify-center text-muted-foreground">
              <Share2 className="size-5" />
            </div>
            <p className="font-serif text-sm">Belum ada kutipan yang distabilo.</p>
            <p className="text-xs font-mono opacity-70 max-w-xs mx-auto">
              Pilih teks di dalam naskah untuk memunculkan warna stabilo dan menyimpannya ke catatan.
            </p>
          </div>
        ) : (
          highlights.map((h, idx) => {
            const chapTitle = getChapterTitle(h.chapterNumber);
            const colorClass = getColorClasses(h.color);

            return (
              <div
                key={h.id}
                className="flex items-start gap-3.5 group animate-in fade-in slide-in-from-right-2 duration-200"
              >
                {/* Index Number Badge */}
                <span className="font-mono text-sm font-bold text-white/50 pt-0.5 shrink-0 select-none">
                  {idx + 1}
                </span>

                <div className="flex-1 min-w-0 space-y-2">
                  {/* Chapter Link */}
                  <button
                    type="button"
                    onClick={() => onSelectHighlight(h)}
                    className="w-full text-left text-xs font-mono text-white/70 hover:text-white flex items-center justify-between gap-1 group/btn transition-colors"
                  >
                    <span className="truncate">
                      Chapter {h.chapterNumber} &bull; {chapTitle}
                    </span>
                    <ChevronRight className="size-3.5 opacity-60 group-hover/btn:translate-x-0.5 group-hover/btn:opacity-100 transition-all shrink-0" />
                  </button>

                  {/* Rounded Quote Box matching SS 5 */}
                  <div
                    onClick={() => onSelectHighlight(h)}
                    className={`p-4 rounded-[10px] border cursor-pointer transition-all hover:brightness-105 shadow-sm space-y-2 ${colorClass}`}
                  >
                    <p className="font-serif text-xs sm:text-[13px] leading-relaxed">
                      &ldquo;{h.selectedText}&rdquo;
                    </p>

                    {h.note && (
                      <p className="text-xs font-sans opacity-85 pt-2 border-t border-current/15">
                        {h.note}
                      </p>
                    )}
                  </div>

                  {/* Footer Row: Date & Action Buttons (Flex, Delete) */}
                  <div className="flex items-center justify-between text-[11px] font-mono text-white/50 pt-0.5 px-0.5">
                    <span>{formatDate(h.createdAt)}</span>

                    <div className="flex items-center gap-1.5">
                      {onDeleteHighlight && (
                        <button
                          type="button"
                          onClick={() => onDeleteHighlight(h.id)}
                          className="p-1 hover:text-red-400 opacity-60 hover:opacity-100 transition-colors"
                          title="Hapus Stabilo"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}

                      <Button
                        type="button"
                        size="xs"
                        variant="secondary"
                        onClick={() => onFlexHighlight(h)}
                        className="h-6 px-2.5 text-[11px] font-mono gap-1 bg-white/10 hover:bg-[var(--color-accent)] hover:text-white text-white/90 border border-white/10 rounded-[6px]"
                        title="Flex kalimat ini ke Instagram Story atau WhatsApp"
                      >
                        <Sparkles className="size-3 text-[var(--color-accent)] group-hover:text-white" />
                        <span>Flex</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
