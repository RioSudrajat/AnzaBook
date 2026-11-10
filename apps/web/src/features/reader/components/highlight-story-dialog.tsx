import { useState } from "react";
import {
  Check,
  Download,
  MessageCircle,
  Share2,
  X,
} from "lucide-react";
import type { HighlightColor } from "@starter/shared/types";
import { Button } from "@/components/ui/button";

type HighlightStoryDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  bookTitle: string;
  bookAuthor: string;
  chapterNumber: number;
  highlightText: string;
  color: HighlightColor;
  note?: string;
  readerName?: string;
};

export function HighlightStoryDialog({
  isOpen,
  onClose,
  bookTitle,
  bookAuthor,
  chapterNumber,
  highlightText,
  color,
  note,
  readerName = "Pembaca AnzaBook",
}: HighlightStoryDialogProps) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  if (!isOpen) return null;

  const colorStyles: Record<
    HighlightColor,
    { bg: string; border: string; text: string; glow: string }
  > = {
    yellow: {
      bg: "bg-amber-300/30 dark:bg-amber-400/25",
      border: "border-amber-400",
      text: "text-amber-950 dark:text-amber-200",
      glow: "rgba(251, 191, 36, 0.4)",
    },
    green: {
      bg: "bg-emerald-300/30 dark:bg-emerald-400/25",
      border: "border-emerald-400",
      text: "text-emerald-950 dark:text-emerald-200",
      glow: "rgba(52, 211, 153, 0.4)",
    },
    coral: {
      bg: "bg-rose-300/30 dark:bg-rose-400/25",
      border: "border-rose-400",
      text: "text-rose-950 dark:text-rose-200",
      glow: "rgba(251, 113, 133, 0.4)",
    },
    blue: {
      bg: "bg-sky-300/30 dark:bg-sky-400/25",
      border: "border-sky-400",
      text: "text-sky-950 dark:text-sky-200",
      glow: "rgba(96, 165, 250, 0.4)",
    },
  };

  const activeColor = colorStyles[color] || colorStyles.yellow;

  // Background mock text that appears blurred around the highlight
  const mockBlurredBackground = `
    Dunia gagasan adalah ruang terbuka di mana akal budi diuji dan ditempa secara terus-menerus.
    Pengetahuan manusia tidak pernah selesai dalam satu dogma melainkan tumbuh lewat pembacaan kritis,
    keberanian mempertanyakan kepastian semu, dan pengujian empiris tanpa henti.
    Ketika sebuah teks dibaca dengan penuh kesadaran, batas antara pembaca dan penulis meluruh,
    menghasilkan percikan pemikiran yang mandiri dan berdaulat bagi peradaban masa depan.
  `;

  // Share to WhatsApp
  const handleShareWhatsApp = () => {
    const text = `"${highlightText}"\n\n- ${bookTitle} (${bookAuthor}, Bab ${chapterNumber})\nDibaca di AnzaBook Pustaka Berdaulat.`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  // Web Share API or Copy
  const handleNativeShare = async () => {
    const text = `"${highlightText}"\n\n- ${bookTitle} (${bookAuthor}, Bab ${chapterNumber})`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Kutipan ${bookTitle}`,
          text,
          url: window.location.href,
        });
        return;
      } catch {
        // Fallback to copy
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback
    }
  };

  const handleDownloadMock = () => {
    setDownloading(true);
    setTimeout(() => {
      setDownloading(false);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }, 1200);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="story-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 text-foreground overflow-y-auto"
    >
      <div className="max-w-lg w-full bg-card border border-border rounded-[16px] p-6 shadow-2xl relative space-y-6 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-full bg-[var(--color-accent)]/15 text-[var(--color-accent)] flex items-center justify-center">
              <Share2 className="size-4" />
            </div>
            <div>
              <h2
                id="story-dialog-title"
                className="font-serif text-lg font-bold text-foreground"
              >
                Flex Your Reading
              </h2>
              <p className="text-[11px] font-mono text-muted-foreground">
                Templat Instagram Story & WhatsApp 9:16
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors"
            aria-label="Tutup"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* 9:16 Story Card Mockup Preview */}
        <div className="flex justify-center">
          <div
            id="story-canvas"
            className="w-[280px] sm:w-[310px] aspect-[9/16] rounded-[24px] bg-[#161412] text-[#F4EFE6] p-6 flex flex-col justify-between relative overflow-hidden shadow-2xl border-4 border-black/40 select-none"
            style={{
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
            }}
          >
            {/* Top Phone Sensor Notch */}
            <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-20 h-3.5 bg-black/80 rounded-full" />

            {/* Story Card Header */}
            <div className="pt-4 flex items-center justify-between z-10 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <img
                  src="/icon.svg"
                  alt="AnzaBook Logo"
                  className="size-5 rounded-[4px] object-contain border border-white/20 shadow-xs"
                />
                <span className="font-mono text-[10px] tracking-wider uppercase font-bold text-white/90">
                  AnzaBook
                </span>
              </div>
              <span className="font-mono text-[9px] uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-[3px]">
                Bab {chapterNumber}
              </span>
            </div>

            {/* Book Page Content with Soft Blur Background & Crisp Highlight */}
            <div className="relative my-auto py-4 z-10">
              {/* Blurred surrounding book text */}
              <div
                className="font-serif text-[11px] leading-relaxed text-white/30 filter blur-[2px] select-none pointer-events-none line-clamp-3 mb-3 text-justify"
                aria-hidden="true"
              >
                {mockBlurredBackground}
              </div>

              {/* Crisp Selected Highlight with Stabilo Effect */}
              <div
                className={`p-4 rounded-[10px] border relative backdrop-blur-xs transition-all ${activeColor.bg} ${activeColor.border}`}
                style={{
                  boxShadow: `0 4px 20px ${activeColor.glow}`,
                }}
              >
                <span className="font-serif text-3xl font-bold opacity-30 leading-none absolute -top-1 left-2">
                  &ldquo;
                </span>
                <p className="font-serif text-sm sm:text-base font-semibold leading-relaxed text-white pl-4 drop-shadow-sm">
                  {highlightText}
                </p>
                <span className="font-serif text-3xl font-bold opacity-30 leading-none absolute -bottom-4 right-3">
                  &rdquo;
                </span>

                {note && (
                  <div className="mt-3 pt-2 border-t border-white/15 text-[11px] font-sans italic text-white/85">
                    Catatan: {note}
                  </div>
                )}
              </div>

              {/* Blurred surrounding book text continuation */}
              <div
                className="font-serif text-[11px] leading-relaxed text-white/30 filter blur-[2px] select-none pointer-events-none line-clamp-3 mt-3 text-justify"
                aria-hidden="true"
              >
                {mockBlurredBackground}
              </div>
            </div>

            {/* Story Card Footer: Book title, author, and reader badge */}
            <div className="pt-3 border-t border-white/10 flex items-end justify-between z-10 font-mono text-[10px]">
              <div>
                <div className="font-serif text-xs font-bold text-white truncate max-w-[170px]">
                  {bookTitle}
                </div>
                <div className="text-white/60 text-[9px] font-sans truncate max-w-[170px]">
                  {bookAuthor}
                </div>
              </div>

              <div className="text-right">
                <span className="text-[9px] text-amber-400/90 block">
                  {readerName}
                </span>
                <span className="text-[8px] text-white/40">anzabook.id</span>
              </div>
            </div>
          </div>
        </div>

        {/* Share Action Buttons */}
        <div className="space-y-2.5 font-mono text-xs">
          <div className="grid grid-cols-2 gap-2.5">
            {/* WhatsApp Share */}
            <Button
              onClick={handleShareWhatsApp}
              className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-10"
            >
              <MessageCircle className="size-4" />
              Flex ke WhatsApp
            </Button>

            {/* Native Share / Copy */}
            <Button
              onClick={handleNativeShare}
              variant="outline"
              className="gap-2 border-border hover:bg-muted h-10"
            >
              {copied ? (
                <>
                  <Check className="size-4 text-emerald-500" />
                  Kutipan Tersalin!
                </>
              ) : (
                <>
                  <Share2 className="size-4" />
                  Bagikan / Salin
                </>
              )}
            </Button>
          </div>

          {/* Download Image Button */}
          <Button
            onClick={handleDownloadMock}
            variant="ghost"
            disabled={downloading}
            className="w-full gap-2 text-muted-foreground hover:text-foreground h-9 text-[11px]"
          >
            <Download className="size-3.5" />
            {downloading
              ? "Menyiapkan Kartu 9:16..."
              : "Unduh Gambar 9:16 (High-Res PNG)"}
          </Button>
        </div>
      </div>
    </div>
  );
}
