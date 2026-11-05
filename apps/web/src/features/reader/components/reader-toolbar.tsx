import { useState } from "react";
import {
  ArrowLeft,
  Check,
  CheckCircle,
  Headphones,
  Highlighter,
  Languages,
  List,
  Moon,
  MoveRight,
  Share2,
  ShieldCheck,
  ShieldOff,
  Smartphone,
  Sun,
  Type,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FlagIcon } from "@/components/ui/flag-icon";

export type ReaderTheme = "manila" | "sepia" | "night";
export type ReaderFont = "serif" | "sans" | "dyslexia";
export type LanguageView = "id" | "en" | "split";
export type ReadingLayout = "scroll" | "slide";

type ReaderToolbarProps = {
  bookTitle: string;
  readingLayout: ReadingLayout;
  onReadingLayoutChange: (l: ReadingLayout) => void;
  languageView: LanguageView;
  onLanguageViewChange: (l: LanguageView) => void;
  theme: ReaderTheme;
  onThemeChange: (t: ReaderTheme) => void;
  fontFamily: ReaderFont;
  onFontFamilyChange: (f: ReaderFont) => void;
  fontSize: number;
  onFontSizeChange: (s: number) => void;
  currentChapter: number;
  allChapters: {
    id: string;
    chapterNumber: number;
    title: string;
    isSample: boolean;
  }[];
  onSelectChapter: (ch: number) => void;
  onFinishSession: () => void;
  onExit: () => void;
  isSaving: boolean;
  isAudioOpen?: boolean;
  onToggleAudio?: () => void;
  isDrmEnabled?: boolean;
  onToggleDrm?: () => void;
  isHighlightsOpen?: boolean;
  onToggleHighlights?: () => void;
  highlightCount?: number;
  onShare?: () => void;
};

export function ReaderToolbar({
  bookTitle,
  readingLayout,
  onReadingLayoutChange,
  languageView,
  onLanguageViewChange,
  theme,
  onThemeChange,
  fontFamily,
  onFontFamilyChange,
  fontSize,
  onFontSizeChange,
  currentChapter,
  allChapters,
  onSelectChapter,
  onFinishSession,
  onExit,
  isSaving,
  isAudioOpen,
  onToggleAudio,
  isDrmEnabled = false,
  onToggleDrm,
  isHighlightsOpen = false,
  onToggleHighlights,
  highlightCount = 0,
  onShare,
}: ReaderToolbarProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);

  const closeAllMenus = () => {
    setIsSettingsOpen(false);
    setIsTocOpen(false);
    setIsLanguageOpen(false);
  };

  return (
    <header className="w-full px-4 py-2.5 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Left: Back & Title & AnzaBook Logo */}
        <div className="flex items-center gap-3 min-w-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onExit}
            disabled={isSaving}
            className="min-h-11 min-w-11 px-2"
            aria-label="Keluar ke Home"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">{isSaving ? "Menyimpan…" : "Keluar"}</span>
          </Button>

          <img
            src="/logo-mark.svg"
            alt="AnzaBook"
            className="size-6 object-contain hidden sm:block shrink-0"
          />

          <div className="min-w-0">
            <h1 className="font-serif text-sm font-bold text-foreground truncate max-w-[200px] sm:max-w-xs md:max-w-sm">
              {bookTitle}
            </h1>
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground">
              <span>Bab {currentChapter}</span>
              <span>&bull;</span>
              <span>{allChapters.length} Bab</span>
            </div>
          </div>
        </div>

        {/* Center: Scroll vs Slide Layout Toggle per Screenshot 2 */}
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-[10px] border border-border text-xs font-mono">
          <button
            type="button"
            onClick={() => onReadingLayoutChange("scroll")}
            className={`px-3 py-1 rounded-[7px] font-medium transition-all flex items-center gap-1.5 ${
              readingLayout === "scroll"
                ? "bg-background text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Mode Baca Gulir Bebas (Continuous Scroll)"
          >
            <Smartphone className="size-3.5" />
            <span>Scroll</span>
          </button>
          <button
            type="button"
            onClick={() => onReadingLayoutChange("slide")}
            className={`px-3 py-1 rounded-[7px] font-medium transition-all flex items-center gap-1.5 ${
              readingLayout === "slide"
                ? "bg-background text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Mode Baca Halaman Geser (Slide Paginated)"
          >
            <MoveRight className="size-3.5" />
            <span>Slide</span>
          </button>
        </div>

        {/* Right: Actions, Bab, Stabilo, Aa, Flag Language Menu, DRM, Finish CTA */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* DRM On/Off Toggle for Development & Screenshots */}
          {onToggleDrm && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onToggleDrm}
              className={`h-8 text-[11px] font-mono gap-1 px-2 transition-colors ${
                isDrmEnabled
                  ? "text-emerald-600 dark:text-emerald-400 border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20"
                  : "text-amber-600 dark:text-amber-400 border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20"
              }`}
              title={
                isDrmEnabled
                  ? "Perlindungan Hak Cipta Aktif (Klik untuk matikan sementara agar bebas screenshot)"
                  : "DRM Nonaktif (Mode Pengembang: Bebas tangkapan layar & salin naskah)"
              }
            >
              {isDrmEnabled ? (
                <ShieldCheck className="size-3.5 text-emerald-500" />
              ) : (
                <ShieldOff className="size-3.5 text-amber-500" />
              )}
              <span className="hidden sm:inline">DRM {isDrmEnabled ? "ON" : "OFF"}</span>
            </Button>
          )}

          {/* Audio Player Toggle */}
          {onToggleAudio && (
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleAudio}
              className={`h-8 text-xs font-mono gap-1.5 px-2.5 ${
                isAudioOpen
                  ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)] border-[var(--color-accent)]/40"
                  : ""
              }`}
              title="Buka Audio Book"
            >
              <Headphones className="size-3.5" />
              <span className="hidden sm:inline">Audio</span>
            </Button>
          )}

          {/* Bab / TOC Menu */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const next = !isTocOpen;
                closeAllMenus();
                setIsTocOpen(next);
              }}
              className={`size-8 p-0 sm:w-auto sm:px-2.5 sm:h-8 text-xs font-mono gap-1.5 ${
                isTocOpen ? "bg-muted" : ""
              }`}
              title="Daftar Bab"
            >
              <List className="size-4" />
              <span className="hidden sm:inline">Bab</span>
            </Button>

            {isTocOpen && (
              <div className="absolute right-0 top-10 w-64 bg-card border border-border rounded-[10px] shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
                <div className="px-2 py-1 text-[11px] font-mono uppercase tracking-wider text-muted-foreground border-b border-border/60">
                  Daftar Bab & Sampel
                </div>
                <div className="mt-1 max-h-60 overflow-y-auto space-y-1">
                  {allChapters.map((ch) => (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => {
                        onSelectChapter(ch.chapterNumber);
                        setIsTocOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-[4px] text-xs font-sans transition-colors flex items-center justify-between ${
                        ch.chapterNumber === currentChapter
                          ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)] font-semibold"
                          : "text-foreground hover:bg-muted/50"
                      }`}
                    >
                      <span className="truncate pr-2">
                        {ch.chapterNumber}. {ch.title}
                      </span>
                      {ch.isSample && (
                        <span className="shrink-0 text-[9px] font-mono uppercase px-1 py-0.2 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 rounded-[2px]">
                          Sampel
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Highlights (Stabilo) Sidebar Toggle matching Screenshot */}
          {onToggleHighlights && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onToggleHighlights}
              className={`size-8 p-0 sm:w-auto sm:px-2.5 sm:h-8 text-xs font-mono gap-1.5 transition-colors ${
                isHighlightsOpen
                  ? "bg-amber-500/15 text-amber-500 border-amber-500/40 font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Buka Catatan & Stabilo"
            >
              <Highlighter className="size-4 text-amber-500" />
              {highlightCount > 0 && (
                <span className="text-[11px] font-bold text-amber-500">
                  {highlightCount}
                </span>
              )}
            </Button>
          )}

          {/* Typography & Appearance Settings (Aa) */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const next = !isSettingsOpen;
                closeAllMenus();
                setIsSettingsOpen(next);
              }}
              className={`size-8 p-0 sm:w-auto sm:px-2.5 sm:h-8 text-xs font-mono gap-1.5 ${
                isSettingsOpen ? "bg-muted" : ""
              }`}
              aria-label="Pengaturan Tipografi dan Tampilan"
              title="Pengaturan Tampilan"
            >
              <span className="font-serif font-bold text-sm leading-none">Aa</span>
            </Button>

            {isSettingsOpen && (
              <div className="absolute right-0 top-10 w-72 bg-card border border-border rounded-[12px] shadow-2xl p-4 z-50 space-y-4 animate-in fade-in zoom-in-95">
                {/* Theme Mode */}
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block mb-2">
                    Kertas & Pencahayaan
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => onThemeChange("manila")}
                      className={`p-2 rounded-[6px] border text-xs flex flex-col items-center gap-1 transition-all ${
                        theme === "manila"
                          ? "border-[var(--color-accent)] bg-[#FAF6EE] text-[#1C1917] font-bold"
                          : "border-border bg-[#FAF6EE] text-[#1C1917]"
                      }`}
                    >
                      <Sun className="size-3.5" />
                      <span>Manila</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onThemeChange("sepia")}
                      className={`p-2 rounded-[6px] border text-xs flex flex-col items-center gap-1 transition-all ${
                        theme === "sepia"
                          ? "border-[var(--color-accent)] bg-[#F4ECD8] text-[#2A2218] font-bold"
                          : "border-border bg-[#F4ECD8] text-[#2A2218]"
                      }`}
                    >
                      <Type className="size-3.5" />
                      <span>Sepia</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onThemeChange("night")}
                      className={`p-2 rounded-[6px] border text-xs flex flex-col items-center gap-1 transition-all ${
                        theme === "night"
                          ? "border-[var(--color-accent)] bg-[#13110F] text-[#EDE8DF] font-bold"
                          : "border-border bg-[#13110F] text-[#EDE8DF]"
                      }`}
                    >
                      <Moon className="size-3.5" />
                      <span>Malam</span>
                    </button>
                  </div>
                </div>

                {/* Font Selection */}
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block mb-2">
                    Tipografi Naskah
                  </span>
                  <div className="grid grid-cols-3 gap-1.5 font-sans">
                    <button
                      type="button"
                      onClick={() => onFontFamilyChange("serif")}
                      className={`px-2 py-1.5 rounded-[4px] border text-xs font-serif ${
                        fontFamily === "serif"
                          ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-foreground font-bold"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Literata
                    </button>
                    <button
                      type="button"
                      onClick={() => onFontFamilyChange("sans")}
                      className={`px-2 py-1.5 rounded-[4px] border text-xs font-sans ${
                        fontFamily === "sans"
                          ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-foreground font-bold"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Jakarta
                    </button>
                    <button
                      type="button"
                      onClick={() => onFontFamilyChange("dyslexia")}
                      className={`px-2 py-1.5 rounded-[4px] border text-[11px] font-sans ${
                        fontFamily === "dyslexia"
                          ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-foreground font-bold"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Disleksia
                    </button>
                  </div>
                </div>

                {/* Font Size Stepper */}
                <div>
                  <div className="flex items-center justify-between text-xs font-mono text-muted-foreground mb-2">
                    <span>Ukuran Huruf</span>
                    <span>{fontSize}px</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onFontSizeChange(Math.max(14, fontSize - 1))}
                      className="flex-1 h-8 text-xs font-mono"
                    >
                      A-
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onFontSizeChange(18)}
                      className="flex-1 h-8 text-xs font-mono"
                    >
                      Reset
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onFontSizeChange(Math.min(26, fontSize + 1))}
                      className="flex-1 h-8 text-xs font-mono"
                    >
                      A+
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Flag Language Switcher Dropdown (Matches Screenshot media_1793820171043_9eab4cb5.png) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                const next = !isLanguageOpen;
                closeAllMenus();
                setIsLanguageOpen(next);
              }}
              className={`size-8 rounded-full border border-border flex items-center justify-center transition-all shadow-xs ${
                isLanguageOpen
                  ? "bg-muted ring-2 ring-primary/20"
                  : "bg-muted/40 hover:bg-muted"
              }`}
              title="Pilih Bahasa Naskah"
              aria-label="Pilih Bahasa Naskah"
            >
              {languageView === "id" ? (
                <FlagIcon lang="id" size="sm" className="rounded-full overflow-hidden w-5 h-5 object-cover" />
              ) : languageView === "en" ? (
                <FlagIcon lang="en" size="sm" className="rounded-full overflow-hidden w-5 h-5 object-cover" />
              ) : (
                <Languages className="size-4 text-foreground" />
              )}
            </button>

            {isLanguageOpen && (
              <div className="absolute right-0 top-10 w-48 bg-[#161413]/95 text-[#EDE8DF] border border-white/10 rounded-[14px] shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 backdrop-blur-md">
                <button
                  type="button"
                  onClick={() => {
                    onLanguageViewChange("id");
                    setIsLanguageOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-[8px] text-xs font-sans transition-colors ${
                    languageView === "id"
                      ? "bg-white/15 text-white font-semibold"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <FlagIcon lang="id" size="sm" />
                    <span>Indonesian</span>
                  </span>
                  {languageView === "id" && <Check className="size-3.5 text-white" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onLanguageViewChange("en");
                    setIsLanguageOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-[8px] text-xs font-sans transition-colors ${
                    languageView === "en"
                      ? "bg-white/15 text-white font-semibold"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <FlagIcon lang="en" size="sm" />
                    <span>English</span>
                  </span>
                  {languageView === "en" && <Check className="size-3.5 text-white" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onLanguageViewChange("split");
                    setIsLanguageOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-[8px] text-xs font-sans transition-colors ${
                    languageView === "split"
                      ? "bg-white/15 text-white font-semibold"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Languages className="size-3.5 opacity-80" />
                    <span>Bilingual Mode</span>
                  </span>
                  {languageView === "split" && <Check className="size-3.5 text-white" />}
                </button>
              </div>
            )}
          </div>

          {/* Share Action Button */}
          {onShare && (
            <Button
              variant="outline"
              size="sm"
              onClick={onShare}
              className="size-8 p-0"
              title="Flex & Bagikan Naskah"
            >
              <Share2 className="size-4" />
              <span className="sr-only">Flex</span>
            </Button>
          )}

          {/* Selesai Membaca CTA */}
          <Button
            size="sm"
            onClick={onFinishSession}
            disabled={isSaving}
            className="h-8 text-xs font-mono gap-1.5 px-3 bg-[var(--color-accent)] text-[var(--color-accent-foreground)] hover:brightness-110"
          >
            <CheckCircle className="size-3.5" />
            <span className="hidden sm:inline">Selesai Baca</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
