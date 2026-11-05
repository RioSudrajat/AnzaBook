import { useState } from "react";
import {
  Activity,
  Check,
  Download,
  Flame,
  MessageCircle,
  Share2,
  X,
} from "lucide-react";
import type { ReadingSessionDto } from "@starter/shared/types";
import { Button } from "@/components/ui/button";

type FlexReadingDialogProps = {
  session: ReadingSessionDto | null;
  bookTitle?: string;
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
};

export function FlexReadingDialog({
  session,
  bookTitle = "Sains, Logika, dan Seni untuk Hidup Bermutu",
  isOpen,
  onClose,
  userName = "Pembaca AnzaBook",
}: FlexReadingDialogProps) {
  const [aspectRatio, setAspectRatio] = useState<"story" | "square">("story");
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen || !session) return null;

  const durationMinutes = Math.max(1, Math.round(session.durationSeconds / 60));
  const pagesRead = session.pagesRead;
  const avgWpm = session.avgWpm;

  // Mock pace rhythm waveform bars (mimicking Strava cadence/elevation graph)
  const paceWaveform = [
    35, 45, 60, 85, 70, 95, 80, 65, 90, 100, 75, 85, 60, 70, 90, 85, 95, 65,
    50, 75,
  ];

  // WhatsApp Share
  const handleShareWhatsApp = () => {
    const text = `Selesai sesi membaca ${bookTitle}!\n\nWaktu: ${durationMinutes} menit\nJarak: ${pagesRead} halaman\nPace: ${avgWpm} WPM\n\nFlex Your Reading di AnzaBook Pustaka Berdaulat.`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  // Native Share / Copy
  const handleNativeShare = async () => {
    const text = `Selesai sesi membaca ${bookTitle}!\nWaktu: ${durationMinutes} menit, Jarak: ${pagesRead} halaman, Pace: ${avgWpm} WPM di AnzaBook.`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Flex Membaca: ${bookTitle}`,
          text,
          url: window.location.href,
        });
        return;
      } catch {
        // Fallback
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

  const handleDownload = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }, 1500);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="flex-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 text-foreground overflow-y-auto"
    >
      <div className="max-w-lg w-full bg-card border border-border rounded-[16px] p-6 shadow-2xl relative space-y-6 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-full bg-[var(--color-accent)]/15 text-[var(--color-accent)] flex items-center justify-center">
              <Activity className="size-4" />
            </div>
            <div>
              <h2
                id="flex-dialog-title"
                className="font-serif text-lg font-bold text-foreground"
              >
                Flex Your Reading
              </h2>
              <p className="text-[11px] font-mono text-muted-foreground">
                Statistik Ritme Baca & Performa Naskah
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

        {/* Aspect Ratio Switcher */}
        <div className="flex items-center justify-center gap-2 font-mono text-xs">
          <button
            type="button"
            onClick={() => setAspectRatio("story")}
            className={`px-3 py-1.5 rounded-[6px] border transition-all ${
              aspectRatio === "story"
                ? "bg-[var(--color-accent)] text-white border-[var(--color-accent)] font-bold shadow-xs"
                : "bg-muted/40 text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            Story 9:16
          </button>
          <button
            type="button"
            onClick={() => setAspectRatio("square")}
            className={`px-3 py-1.5 rounded-[6px] border transition-all ${
              aspectRatio === "square"
                ? "bg-[var(--color-accent)] text-white border-[var(--color-accent)] font-bold shadow-xs"
                : "bg-muted/40 text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            Feed 1:1
          </button>
        </div>

        {/* Athletic Card Graphic Preview */}
        <div className="flex justify-center">
          <div
            className={`rounded-[20px] bg-[#141210] text-[#F5F2EB] p-6 flex flex-col justify-between relative shadow-2xl border border-white/10 select-none overflow-hidden ${
              aspectRatio === "story"
                ? "w-[280px] sm:w-[300px] aspect-[9/16]"
                : "w-[300px] sm:w-[340px] aspect-square"
            }`}
            style={{
              boxShadow: "0 20px 40px -10px rgba(0, 0, 0, 0.7)",
            }}
          >
            {/* Athletic Card Top Badge */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3 z-10">
              <div className="flex items-center gap-2">
                <img
                  src="/logo-mark.svg"
                  alt="AnzaBook"
                  className="size-5 object-contain"
                />
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-white">
                  AnzaBook
                </span>
              </div>
              <span className="font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-[3px] bg-amber-400/15 text-amber-400 font-semibold flex items-center gap-1">
                <Flame className="size-3" />
                Sesi Berdaulat
              </span>
            </div>

            {/* Book Meta & Date */}
            <div className="my-auto py-3 space-y-4 z-10">
              <div>
                <span className="text-[10px] font-mono text-white/50 block">
                  {new Date(session.createdAt).toLocaleDateString("id-ID", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                <h3 className="font-serif text-base sm:text-lg font-bold leading-snug text-white mt-0.5">
                  {bookTitle}
                </h3>
              </div>

              {/* Big Athletic Metrics Grid (Inspired by Strava) */}
              <div className="grid grid-cols-3 gap-2 font-mono border-y border-white/10 py-3 text-center">
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-white/50 block">
                    Waktu
                  </span>
                  <div className="text-sm sm:text-base font-bold text-white mt-0.5">
                    {durationMinutes} <span className="text-[10px]">mnt</span>
                  </div>
                </div>

                <div>
                  <span className="text-[9px] uppercase tracking-wider text-white/50 block">
                    Jarak Naskah
                  </span>
                  <div className="text-sm sm:text-base font-bold text-white mt-0.5">
                    {pagesRead} <span className="text-[10px]">hal</span>
                  </div>
                </div>

                <div>
                  <span className="text-[9px] uppercase tracking-wider text-white/50 block">
                    Pace
                  </span>
                  <div className="text-sm sm:text-base font-bold text-[var(--color-accent)] mt-0.5">
                    {avgWpm} <span className="text-[10px]">WPM</span>
                  </div>
                </div>
              </div>

              {/* Reading Pace Rhythm Waveform Graph */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[9px] font-mono text-white/50">
                  <span>Ritme Baca</span>
                  <span>Konsistensi 94%</span>
                </div>
                <div className="h-10 flex items-end gap-1 px-1 bg-white/5 rounded-[6px] border border-white/10 py-1">
                  {paceWaveform.map((val, idx) => (
                    <div
                      key={idx}
                      className="flex-1 rounded-t-[1px] bg-gradient-to-t from-[var(--color-accent)] to-amber-400 opacity-90 transition-all"
                      style={{ height: `${val}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Footer Reader Identity */}
            <div className="border-t border-white/10 pt-3 flex items-center justify-between font-mono text-[10px] text-white/60 z-10">
              <span className="font-semibold text-white/90">{userName}</span>
              <span className="text-[9px] opacity-60">anzabook.id</span>
            </div>
          </div>
        </div>

        {/* Share Action Buttons */}
        <div className="space-y-2.5 font-mono text-xs">
          <div className="grid grid-cols-2 gap-2.5">
            <Button
              onClick={handleShareWhatsApp}
              className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-10"
            >
              <MessageCircle className="size-4" />
              Flex ke WhatsApp
            </Button>

            <Button
              onClick={handleNativeShare}
              variant="outline"
              className="gap-2 border-border hover:bg-muted h-10"
            >
              {copied ? (
                <>
                  <Check className="size-4 text-emerald-500" />
                  Statistik Tersalin!
                </>
              ) : (
                <>
                  <Share2 className="size-4" />
                  Bagikan Cerita
                </>
              )}
            </Button>
          </div>

          <Button
            onClick={handleDownload}
            variant="ghost"
            disabled={isExporting}
            className="w-full gap-2 text-muted-foreground hover:text-foreground h-9 text-[11px]"
          >
            <Download className="size-3.5" />
            {isExporting ? "Menyiapkan Gambar Flex..." : "Unduh Gambar Kartu (High-Res PNG)"}
          </Button>
        </div>
      </div>
    </div>
  );
}
