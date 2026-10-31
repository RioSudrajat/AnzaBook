import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Flame,
  MessageSquare,
  Share2,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import { z } from "zod";
import type { ReadingMode } from "@starter/shared/types";
import { Button } from "@/components/ui/button";
import { useBookReader } from "@/features/books/hooks";
import { useCreateReadingSession } from "@/features/community/hooks";
import { AudiobookBar } from "@/features/reader/components/audiobook-bar";
import { DrmShield } from "@/features/reader/components/drm-shield";
import { MarginaliaDrawer } from "@/features/reader/components/marginalia-drawer";
import {
  type LanguageView,
  type ReaderFont,
  type ReaderTheme,
  ReaderToolbar,
} from "@/features/reader/components/reader-toolbar";

const readSearchSchema = z.object({
  mode: z.enum(["full", "blueprint", "audio"]).default("full"),
  chapter: z.coerce.number().int().min(1).default(1),
});

export const Route = createFileRoute("/_protected/read/$slug")({
  validateSearch: readSearchSchema,
  component: ReaderPage,
});

function splitParagraphs(text?: string | null): string[] {
  if (!text) return [];
  return text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function ReaderPage() {
  const { slug } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();

  const currentMode = search.mode;
  const currentChapterNumber = search.chapter;

  const { data: payload, isLoading, isError } = useBookReader(slug, {
    mode: currentMode,
    chapter: currentChapterNumber,
  });

  const [theme, setTheme] = useState<ReaderTheme>("manila");
  const [fontFamily, setFontFamily] = useState<ReaderFont>("serif");
  const [fontSize, setFontSize] = useState<number>(18);
  const [languageView, setLanguageView] = useState<LanguageView>("split");
  const [activeParagraphIndex, setActiveParagraphIndex] = useState<number>(0);
  const [marginaliaParagraph, setMarginaliaParagraph] = useState<number | null>(
    null,
  );
  const [isFinishModalOpen, setIsFinishModalOpen] = useState<boolean>(false);
  const [sessionSummary, setSessionSummary] = useState<{
    durationMinutes: number;
    pagesRead: number;
    wpm: number;
  } | null>(null);

  // Track start time for telemetry
  const startTimeRef = useRef<number>(0);
  const createSessionMutation = useCreateReadingSession();

  useEffect(() => {
    startTimeRef.current = Date.now();
  }, [slug, currentChapterNumber, currentMode]);

  // Handle Mode Change
  const handleModeChange = (newMode: ReadingMode) => {
    navigate({
      to: "/read/$slug",
      params: { slug },
      search: { mode: newMode, chapter: currentChapterNumber },
    });
  };

  // Handle Chapter Change
  const handleSelectChapter = (ch: number) => {
    navigate({
      to: "/read/$slug",
      params: { slug },
      search: { mode: currentMode, chapter: ch },
    });
  };

  // Split chapter contents into paragraphs
  const idParagraphs = splitParagraphs(payload?.currentChapter?.contentId);
  const enParagraphs = splitParagraphs(payload?.currentChapter?.contentEn);
  const blueprintSections = splitParagraphs(
    payload?.currentChapter?.blueprintContent,
  );

  // Finish Reading Session
  const handleFinishSession = async () => {
    const elapsedSeconds = Math.max(
      15,
      Math.round((Date.now() - startTimeRef.current) / 1000),
    );
    const durationMinutes = Math.max(1, Math.round(elapsedSeconds / 60));

    // Calculate approximate words in chapter
    const totalWords =
      currentMode === "blueprint"
        ? (payload?.currentChapter?.blueprintContent || "").split(/\s+/).length
        : (payload?.currentChapter?.contentId || "").split(/\s+/).length;

    const estimatedPages = Math.max(1, Math.ceil(totalWords / 280));
    const calculatedWpm = Math.min(
      600,
      Math.max(100, Math.round((totalWords / elapsedSeconds) * 60)),
    );

    setSessionSummary({
      durationMinutes,
      pagesRead: estimatedPages,
      wpm: calculatedWpm,
    });
    setIsFinishModalOpen(true);

    if (payload?.book?.id) {
      try {
        await createSessionMutation.mutateAsync({
          bookId: payload.book.id,
          pagesRead: estimatedPages,
          durationSeconds: elapsedSeconds,
          avgWpm: calculatedWpm,
          mode: currentMode,
        });
      } catch {
        // Silently handle if telemetry fails
      }
    }
  };

  // Color theme variables
  const themeClass =
    theme === "manila"
      ? "bg-[#FAF6EE] text-[#1C1917]"
      : theme === "sepia"
        ? "bg-[#F4ECD8] text-[#2A2218]"
        : "bg-[#13110F] text-[#EDE8DF]";

  const fontClass =
    fontFamily === "serif"
      ? "font-serif"
      : fontFamily === "sans"
        ? "font-sans"
        : "font-['Atkinson_Hyperlegible']";

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground">
        <Sparkles className="size-8 text-[var(--color-accent)] animate-pulse mb-3" />
        <p className="font-serif text-base font-medium">
          Mempersiapkan lembar naskah dwibahasa...
        </p>
        <span className="text-xs font-mono text-muted-foreground mt-1">
          Menyiapkan sidik jari digital DRM
        </span>
      </div>
    );
  }

  if (isError || !payload) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-foreground text-center">
        <h2 className="font-serif text-xl font-bold mb-2">
          Gagal Memuat Naskah Buku
        </h2>
        <p className="text-sm text-muted-foreground max-w-md mb-6">
          Bab yang Anda pilih mungkin membutuhkan akses penuh atau kode buku cetak
          rakyat yang belum terverifikasi.
        </p>
        <Button asChild>
          <Link to="/books/$slug" params={{ slug }}>
            Kembali ke Halaman Buku
          </Link>
        </Button>
      </div>
    );
  }

  const { book, currentChapter, allChapters, watermark } = payload;
  const hasNextChapter = currentChapter.chapterNumber < allChapters.length;
  const hasPrevChapter = currentChapter.chapterNumber > 1;

  return (
    <DrmShield watermarkText={watermark}>
      <div className={`min-h-screen flex flex-col transition-colors duration-300 ${themeClass}`}>
        {/* Sticky Minimalist Toolbar */}
        <ReaderToolbar
          slug={slug}
          bookTitle={book.title}
          mode={currentMode}
          onModeChange={handleModeChange}
          languageView={languageView}
          onLanguageViewChange={setLanguageView}
          theme={theme}
          onThemeChange={setTheme}
          fontFamily={fontFamily}
          onFontFamilyChange={setFontFamily}
          fontSize={fontSize}
          onFontSizeChange={setFontSize}
          currentChapter={currentChapter.chapterNumber}
          allChapters={allChapters}
          onSelectChapter={handleSelectChapter}
          onFinishSession={handleFinishSession}
        />

        {/* Reader Canvas / Document Scroll */}
        <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-8 py-10 pb-32">
          {/* Chapter Heading Banner */}
          <header className="mb-10 text-center pb-8 border-b border-current/15">
            <span className="text-xs font-mono uppercase tracking-widest opacity-70 block mb-2">
              Bab {currentChapter.chapterNumber}
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight">
              {currentChapter.title}
            </h2>
            {currentMode === "blueprint" && (
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-accent)]/15 text-[var(--color-accent)] text-xs font-mono font-semibold">
                <Sparkles className="size-3.5" />
                <span>Format Intisari & Ekstraksi Strategis (20 Menit)</span>
              </div>
            )}
          </header>

          {/* Reader Body Content */}
          {currentMode === "blueprint" ? (
            /* Blueprint Mode View */
            <div
              className={`space-y-6 max-w-3xl mx-auto ${fontClass}`}
              style={{ fontSize: `${fontSize}px`, lineHeight: 1.75 }}
            >
              {blueprintSections.map((sec, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-[8px] bg-black/5 dark:bg-white/5 border border-current/10"
                >
                  <p className="leading-relaxed whitespace-pre-line">{sec}</p>
                </div>
              ))}
            </div>
          ) : languageView === "split" ? (
            /* Bilingual Split View (ID left, EN right) */
            <div className="space-y-6">
              {idParagraphs.map((idText, pIdx) => {
                const enText = enParagraphs[pIdx] || "";
                const isActive = activeParagraphIndex === pIdx;

                return (
                  <div
                    key={pIdx}
                    id={`p-${pIdx}`}
                    onClick={() => setActiveParagraphIndex(pIdx)}
                    className={`grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-[8px] transition-all relative group cursor-pointer ${
                      isActive
                        ? "bg-[var(--color-accent)]/10 ring-1 ring-[var(--color-accent)]/30"
                        : "hover:bg-black/5 dark:hover:bg-white/5"
                    }`}
                  >
                    {/* Paragraph index & marginalia trigger button */}
                    <div className="absolute -left-3 top-3 hidden lg:flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMarginaliaParagraph(pIdx);
                        }}
                        className="p-1 rounded-[4px] bg-background text-muted-foreground hover:text-foreground shadow-xs border border-border"
                        title="Buka Catatan Marjinalia"
                      >
                        <MessageSquare className="size-3" />
                      </button>
                    </div>

                    {/* Left: Bahasa Indonesia translation */}
                    <div
                      className={`${fontClass}`}
                      style={{ fontSize: `${fontSize}px`, lineHeight: 1.75 }}
                    >
                      <span className="text-[10px] font-mono opacity-50 block md:hidden mb-1">
                        ID &bull; #{pIdx + 1}
                      </span>
                      <p className="leading-relaxed">{idText}</p>
                    </div>

                    {/* Right: English original text */}
                    <div
                      className={`border-t md:border-t-0 md:border-l border-current/15 pt-3 md:pt-0 md:pl-6 opacity-85 ${fontClass}`}
                      style={{ fontSize: `${fontSize - 1}px`, lineHeight: 1.7 }}
                    >
                      <span className="text-[10px] font-mono opacity-50 block md:hidden mb-1">
                        EN Original
                      </span>
                      <p className="leading-relaxed italic">{enText}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Single Column View (ID or EN only) */
            <div
              className={`space-y-6 max-w-2xl mx-auto ${fontClass}`}
              style={{ fontSize: `${fontSize}px`, lineHeight: 1.8 }}
            >
              {(languageView === "id" ? idParagraphs : enParagraphs).map(
                (text, pIdx) => {
                  const isActive = activeParagraphIndex === pIdx;
                  return (
                    <div
                      key={pIdx}
                      id={`p-${pIdx}`}
                      onClick={() => setActiveParagraphIndex(pIdx)}
                      className={`p-3 rounded-[6px] transition-all relative group cursor-pointer ${
                        isActive
                          ? "bg-[var(--color-accent)]/10 ring-1 ring-[var(--color-accent)]/30"
                          : "hover:bg-black/5 dark:hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <p className="leading-relaxed flex-1">{text}</p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMarginaliaParagraph(pIdx);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-foreground"
                          title="Buka Marjinalia"
                        >
                          <MessageSquare className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          )}

          {/* Chapter Pagination Navigation */}
          <div className="mt-16 pt-8 border-t border-current/15 flex items-center justify-between gap-4">
            {hasPrevChapter ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSelectChapter(currentChapter.chapterNumber - 1)}
                className="gap-1.5 font-mono text-xs"
              >
                <ChevronLeft className="size-4" />
                Bab Sebelumnya
              </Button>
            ) : (
              <div />
            )}

            <Button
              onClick={handleFinishSession}
              size="sm"
              className="gap-1.5 font-mono text-xs bg-[var(--color-accent)] text-[var(--color-accent-foreground)]"
            >
              <CheckCircle2 className="size-4" />
              Selesai Sesi Baca
            </Button>

            {hasNextChapter ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSelectChapter(currentChapter.chapterNumber + 1)}
                className="gap-1.5 font-mono text-xs"
              >
                Bab Berikutnya
                <ChevronRight className="size-4" />
              </Button>
            ) : (
              <div />
            )}
          </div>
        </main>

        {/* Bottom Floating Audiobook Bar */}
        <AudiobookBar
          audioUrl={currentChapter.audioUrl}
          totalDurationSeconds={currentChapter.audioDurationSeconds || 900}
          activeParagraphIndex={activeParagraphIndex}
          totalParagraphs={idParagraphs.length}
          onParagraphChange={(idx) => {
            setActiveParagraphIndex(idx);
            const el = document.getElementById(`p-${idx}`);
            if (el) {
              el.scrollIntoView({ behavior: "smooth", block: "center" });
            }
          }}
        />

        {/* Marginalia Comments Drawer */}
        <MarginaliaDrawer
          slug={slug}
          chapterId={currentChapter.id}
          paragraphIndex={marginaliaParagraph ?? 0}
          isOpen={marginaliaParagraph !== null}
          onClose={() => setMarginaliaParagraph(null)}
        />

        {/* Finish Session Celebration Modal */}
        {isFinishModalOpen && sessionSummary && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="finish-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200 text-foreground"
          >
            <div className="max-w-md w-full bg-card border border-border rounded-[10px] p-6 shadow-2xl relative">
              <button
                type="button"
                onClick={() => setIsFinishModalOpen(false)}
                className="absolute right-4 top-4 p-1 text-muted-foreground hover:text-foreground"
                aria-label="Tutup"
              >
                <X className="size-4" />
              </button>

              <div className="text-center">
                <div className="size-14 rounded-full bg-[var(--color-accent)]/15 text-[var(--color-accent)] flex items-center justify-center mx-auto mb-3">
                  <Trophy className="size-7" />
                </div>

                <h3 id="finish-title" className="font-serif text-xl font-bold">
                  Sesi Membaca Tercatat!
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Pencapaian membaca Anda untuk <strong>{book.title}</strong> telah
                  tersimpan di linimasa profil.
                </p>

                {/* Telemetry Highlights */}
                <div className="mt-5 grid grid-cols-3 gap-2 p-3 rounded-[8px] bg-muted/40 border border-border font-mono text-center">
                  <div>
                    <span className="text-[10px] uppercase text-muted-foreground block">
                      Durasi
                    </span>
                    <span className="font-bold text-sm text-foreground">
                      {sessionSummary.durationMinutes} mnt
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-muted-foreground block">
                      Halaman
                    </span>
                    <span className="font-bold text-sm text-foreground">
                      {sessionSummary.pagesRead} hal
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-muted-foreground block">
                      Kecepatan
                    </span>
                    <span className="font-bold text-sm text-[var(--color-accent)] flex items-center justify-center gap-0.5">
                      <Flame className="size-3" />
                      {sessionSummary.wpm} WPM
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-6 flex flex-col gap-2.5">
                  <Button asChild className="gap-2 font-mono text-xs">
                    <Link to="/app" search={{ tab: "share" }}>
                      <Share2 className="size-3.5" />
                      Buka Studio Strava Literasi (Unduh Stiker)
                    </Link>
                  </Button>

                  {hasNextChapter ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsFinishModalOpen(false);
                        handleSelectChapter(currentChapter.chapterNumber + 1);
                      }}
                      className="font-mono text-xs"
                    >
                      Lanjut ke Bab {currentChapter.chapterNumber + 1}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      asChild
                      className="font-mono text-xs"
                    >
                      <Link to="/books/$slug" params={{ slug }}>
                        Kembali ke Detail Buku
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DrmShield>
  );
}
