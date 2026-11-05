import { useEffect, useRef, useState } from "react";
import { MessageSquare } from "lucide-react";
import type { HighlightColor } from "@starter/shared/types";

type HighlightPopoverProps = {
  containerRef: React.RefObject<HTMLDivElement | null>;
  onSaveHighlight: (data: {
    selectedText: string;
    color: HighlightColor;
    note?: string;
    chapterNumber?: number;
  }) => Promise<void>;
};

export function HighlightPopover({
  containerRef,
  onSaveHighlight,
}: HighlightPopoverProps) {
  const [selectedText, setSelectedText] = useState("");
  const [selectedChapterNumber, setSelectedChapterNumber] = useState<number | undefined>(undefined);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [note, setNote] = useState("");
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseUp = () => {
      // Small timeout to allow selection to finalize
      setTimeout(() => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) {
          return;
        }

        const text = selection.toString().trim();
        if (text.length < 2) {
          return;
        }

        // Check if selection is within the reader container
        if (
          containerRef.current &&
          !containerRef.current.contains(selection.anchorNode)
        ) {
          return;
        }

        // Detect chapter number from the DOM hierarchy
        let detectedChapter: number | undefined;
        let node: Node | null = selection.anchorNode;
        while (node) {
          if (node instanceof HTMLElement && node.dataset.chapterNumber) {
            const num = parseInt(node.dataset.chapterNumber, 10);
            if (!isNaN(num)) {
              detectedChapter = num;
              break;
            }
          }
          node = node.parentNode;
        }

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        setSelectedText(text);
        setSelectedChapterNumber(detectedChapter);
        setPosition({
          x: Math.max(16, rect.left + rect.width / 2),
          y: Math.max(10, rect.top - 10),
        });
      }, 50);
    };

    const handleMouseDown = (e: MouseEvent) => {
      // If clicking inside popover, do nothing
      if (popoverRef.current && popoverRef.current.contains(e.target as Node)) {
        return;
      }
      // If clicking outside, close popover
      setPosition(null);
      setShowNoteInput(false);
      setNote("");
    };

    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mousedown", handleMouseDown);

    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [containerRef]);

  if (!position || !selectedText) return null;

  const handlePickColor = async (color: HighlightColor) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await onSaveHighlight({
        selectedText,
        color,
        note: note.trim() || undefined,
        chapterNumber: selectedChapterNumber,
      });
      setPosition(null);
      setShowNoteInput(false);
      setNote("");
      window.getSelection()?.removeAllRanges();
    } finally {
      setIsSaving(false);
    }
  };

  const colors: { id: HighlightColor; bg: string; label: string }[] = [
    { id: "yellow", bg: "bg-amber-400 hover:bg-amber-300 ring-amber-500", label: "Kuning" },
    { id: "green", bg: "bg-emerald-400 hover:bg-emerald-300 ring-emerald-500", label: "Hijau" },
    { id: "coral", bg: "bg-rose-400 hover:bg-rose-300 ring-rose-500", label: "Karang" },
    { id: "blue", bg: "bg-sky-400 hover:bg-sky-300 ring-sky-500", label: "Biru" },
  ];

  return (
    <div
      ref={popoverRef}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: "translate(-50%, -100%)",
      }}
      className="fixed z-50 bg-[#1C1917] text-[#EDE8DF] border border-white/15 rounded-[12px] p-2 shadow-2xl flex flex-col gap-2 min-w-[200px] animate-in fade-in zoom-in-95 duration-100"
    >
      <div className="flex items-center justify-between gap-3 px-1">
        {/* Color Palette (Clicking directly highlights and saves) */}
        <div className="flex items-center gap-2">
          {colors.map((c) => (
            <button
              key={c.id}
              type="button"
              disabled={isSaving}
              onClick={() => handlePickColor(c.id)}
              className={`size-6 rounded-full ${c.bg} transition-all duration-150 hover:scale-115 active:scale-95 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-white cursor-pointer`}
              title={`Stabilo ${c.label}`}
              aria-label={`Stabilo ${c.label}`}
            />
          ))}
        </div>

        {/* Note button */}
        <button
          type="button"
          onClick={() => setShowNoteInput(!showNoteInput)}
          className={`p-1.5 rounded-[6px] text-xs transition-colors cursor-pointer ${
            showNoteInput
              ? "bg-white/20 text-white"
              : "text-white/60 hover:text-white hover:bg-white/10"
          }`}
          title="Tambah Catatan Pribadi"
          aria-label="Tambah Catatan Pribadi"
        >
          <MessageSquare className="size-3.5" />
        </button>
      </div>

      {/* Note input field if toggled */}
      {showNoteInput && (
        <div className="pt-1.5 border-t border-white/10 px-1">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Tulis catatan kecil..."
            className="w-full text-xs bg-white/5 border border-white/15 rounded-[6px] px-2.5 py-1.5 text-white placeholder:text-white/40 focus:outline-none focus:border-amber-400"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handlePickColor("yellow");
              }
            }}
          />
        </div>
      )}
    </div>
  );
}
