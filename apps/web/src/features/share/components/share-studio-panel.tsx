import { useEffect, useRef, useState } from "react";
import {
  Download,
  Flame,
  Gauge,
  Receipt,
  Quote,
  Sparkles,
  Smartphone,
  Square,
  Check,
} from "lucide-react";
import type { ReadingSessionDto } from "@starter/shared/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  type CardAspect,
  type CardFormat,
  downloadCanvasImage,
  renderLiteracyCanvas,
} from "../canvas-renderer";

type ShareStudioPanelProps = {
  userName: string;
  recentSessions?: ReadingSessionDto[];
};

export function ShareStudioPanel({
  userName,
  recentSessions = [],
}: ShareStudioPanelProps) {
  const latestSession = recentSessions[0];

  const [format, setFormat] = useState<CardFormat>("speed_sticker");
  const [aspect, setAspect] = useState<CardAspect>("square");
  const [bookTitle, setBookTitle] = useState(
    latestSession?.bookTitle || "Bumi Manusia",
  );
  const [author, setAuthor] = useState("Pramoedya Ananta Toer");
  const [quoteText, setQuoteText] = useState(
    "Seorang terpelajar harus sudah berbuat adil sejak dalam pikiran, apalagi dalam perbuatan.",
  );
  const [pagesRead, setPagesRead] = useState(latestSession?.pagesRead || 24);
  const [durationMinutes, setDurationMinutes] = useState(
    latestSession ? Math.round(latestSession.durationSeconds / 60) : 18,
  );
  const [wpm, setWpm] = useState(latestSession?.avgWpm || 285);
  const [streakDays, setStreakDays] = useState(7);
  const [isTransparent, setIsTransparent] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Redraw canvas whenever parameters change
  useEffect(() => {
    if (!canvasRef.current) return;
    renderLiteracyCanvas(canvasRef.current, {
      format,
      aspect,
      userName,
      bookTitle,
      author,
      quoteText,
      pagesRead,
      durationMinutes,
      wpm,
      streakDays,
      totalSavedIdr: 60000,
      isTransparent,
    });
  }, [
    format,
    aspect,
    userName,
    bookTitle,
    author,
    quoteText,
    pagesRead,
    durationMinutes,
    wpm,
    streakDays,
    isTransparent,
  ]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const filename = `anzabook-literasi-${format}-${Date.now()}.png`;
    downloadCanvasImage(canvasRef.current, filename);
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  return (
    <div className="bg-background border border-border rounded-[10px] p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-[var(--color-accent)]" />
            <h3 className="font-serif text-xl font-bold tracking-tight">
              Studio Strava Literasi (Flex Your Reading)
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Ekspor stiker pencapaian baca transparan, kuitansi penghematan rakyat, atau kartu kutipan untuk Instagram Stories dan linimasa sosial.
          </p>
        </div>

        {/* Aspect Ratio Toggle */}
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-[6px] border border-border text-xs font-mono">
          <button
            type="button"
            onClick={() => setAspect("square")}
            className={`px-2.5 py-1 rounded-[4px] flex items-center gap-1.5 transition-all ${
              aspect === "square"
                ? "bg-background text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Square className="size-3.5" />
            <span>Persegi 1:1</span>
          </button>
          <button
            type="button"
            onClick={() => setAspect("story")}
            className={`px-2.5 py-1 rounded-[4px] flex items-center gap-1.5 transition-all ${
              aspect === "story"
                ? "bg-background text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Smartphone className="size-3.5" />
            <span>Cerita 9:16</span>
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Interactive Controls */}
        <div className="lg:col-span-5 space-y-5">
          {/* Format Picker */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">
              Pilih Jenis Stiker
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFormat("speed_sticker")}
                className={`p-3 rounded-[6px] border text-left text-xs transition-all ${
                  format === "speed_sticker"
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 font-bold text-foreground"
                    : "border-border hover:bg-muted/40 text-muted-foreground"
                }`}
              >
                <Gauge className="size-4 text-[var(--color-accent)] mb-1" />
                <span className="block">Kecepatan WPM</span>
              </button>

              <button
                type="button"
                onClick={() => setFormat("receipt")}
                className={`p-3 rounded-[6px] border text-left text-xs transition-all ${
                  format === "receipt"
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 font-bold text-foreground"
                    : "border-border hover:bg-muted/40 text-muted-foreground"
                }`}
              >
                <Receipt className="size-4 text-emerald-600 mb-1" />
                <span className="block">Kuitansi Hemat</span>
              </button>

              <button
                type="button"
                onClick={() => setFormat("quote")}
                className={`p-3 rounded-[6px] border text-left text-xs transition-all ${
                  format === "quote"
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 font-bold text-foreground"
                    : "border-border hover:bg-muted/40 text-muted-foreground"
                }`}
              >
                <Quote className="size-4 text-amber-500 mb-1" />
                <span className="block">Kartu Kutipan</span>
              </button>
            </div>
          </div>

          {/* Book Metadata Controls */}
          <div className="space-y-3">
            <div>
              <label
                htmlFor="inputBookTitle"
                className="block text-xs font-mono text-muted-foreground mb-1"
              >
                Judul Buku
              </label>
              <Input
                id="inputBookTitle"
                value={bookTitle}
                onChange={(e) => setBookTitle(e.target.value)}
                className="text-xs"
              />
            </div>

            <div>
              <label
                htmlFor="inputAuthor"
                className="block text-xs font-mono text-muted-foreground mb-1"
              >
                Penulis
              </label>
              <Input
                id="inputAuthor"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="text-xs"
              />
            </div>

            {format === "quote" && (
              <div>
                <label
                  htmlFor="inputQuote"
                  className="block text-xs font-mono text-muted-foreground mb-1"
                >
                  Kutipan Berkesan
                </label>
                <Textarea
                  id="inputQuote"
                  rows={3}
                  value={quoteText}
                  onChange={(e) => setQuoteText(e.target.value)}
                  className="text-xs font-serif italic"
                />
              </div>
            )}
          </div>

          {/* Metrics Controls */}
          {format === "speed_sticker" && (
            <div className="p-3.5 rounded-[8px] bg-muted/30 border border-border space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span>Kecepatan Membaca ({wpm} WPM)</span>
                <input
                  type="range"
                  min={120}
                  max={550}
                  value={wpm}
                  onChange={(e) => setWpm(Number(e.target.value))}
                  className="w-32 accent-[var(--color-accent)]"
                  aria-label="Kecepatan Membaca WPM"
                />
              </div>

              <div className="flex items-center justify-between">
                <span>Halaman Selesai ({pagesRead} Hal)</span>
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={pagesRead}
                  onChange={(e) => setPagesRead(Number(e.target.value))}
                  className="w-32 accent-[var(--color-accent)]"
                  aria-label="Halaman Selesai"
                />
              </div>

              <div className="flex items-center justify-between">
                <span>Durasi Baca ({durationMinutes} Menit)</span>
                <input
                  type="range"
                  min={5}
                  max={120}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-32 accent-[var(--color-accent)]"
                  aria-label="Durasi Baca Menit"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Flame className="size-3.5 text-amber-500" />
                  Streak ({streakDays} Hari)
                </span>
                <input
                  type="range"
                  min={1}
                  max={60}
                  value={streakDays}
                  onChange={(e) => setStreakDays(Number(e.target.value))}
                  className="w-32 accent-[var(--color-accent)]"
                  aria-label="Streak Hari"
                />
              </div>

              <div className="pt-2 border-t border-border flex items-center justify-between">
                <label
                  htmlFor="checkTransparent"
                  className="text-xs cursor-pointer font-sans"
                >
                  Latar Belakang Transparan (PNG Sticker)
                </label>
                <input
                  id="checkTransparent"
                  type="checkbox"
                  checked={isTransparent}
                  onChange={(e) => setIsTransparent(e.target.checked)}
                  className="size-4 accent-[var(--color-accent)] cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Download Action */}
          <div className="pt-2">
            <Button
              onClick={handleDownload}
              size="lg"
              className="w-full gap-2 font-mono text-xs bg-[var(--color-accent)] text-[var(--color-accent-foreground)] hover:brightness-110"
            >
              {downloadSuccess ? (
                <>
                  <Check className="size-4" />
                  Stiker Berhasil Diunduh!
                </>
              ) : (
                <>
                  <Download className="size-4" />
                  Unduh Stiker PNG Beresolusi Tinggi
                </>
              )}
            </Button>
            <p className="text-[11px] font-mono text-center text-muted-foreground mt-1.5">
              Siap diunggah ke Instagram Story, X, atau status WhatsApp
            </p>
          </div>
        </div>

        {/* Right: Real-Time Canvas Preview */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center bg-muted/20 border border-dashed border-border rounded-[10px] p-4 sm:p-6 min-h-[460px] overflow-hidden">
          <div
            className={`shadow-2xl rounded-[8px] overflow-hidden transition-all duration-300 max-w-full ${
              aspect === "story" ? "w-[260px] sm:w-[320px]" : "w-[300px] sm:w-[380px]"
            }`}
          >
            <canvas
              ref={canvasRef}
              className="w-full h-auto block"
              style={{
                background: isTransparent
                  ? "repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%) 50% / 20px 20px"
                  : "transparent",
              }}
            />
          </div>

          <span className="text-[11px] font-mono text-muted-foreground mt-4">
            Pratinjau Kanvas 1080p ({aspect === "story" ? "9:16 Story" : "1:1 Square"})
          </span>
        </div>
      </div>
    </div>
  );
}
