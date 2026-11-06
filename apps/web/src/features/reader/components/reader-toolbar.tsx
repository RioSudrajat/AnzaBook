import { useState } from "react";
import {
  Check,
  Headphones,
  Languages,
  Moon,
  MoveRight,
  ShieldCheck,
  ShieldOff,
  Smartphone,
  Sun,
  Type,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FlagIcon } from "@/components/ui/flag-icon";
import {
  IosArrowLeft,
  IosHighlighter,
  IosList,
  IosShare,
} from "@/components/ui/ios-icons";

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
  onFinishSession?: () => void;
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
    <header className="w-full px-4 py-2 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Left: Back & Title & AnzaBook Logo */}
        <div className="flex items-center gap-3 min-w-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onExit}
            disabled={isSaving}
            className="min-h-9 px-2.5 rounded-full hover:bg-muted/60"
            aria-label="Keluar ke Home"
          >
            <IosArrowLeft className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline font-sans text-xs">
              {isSaving ? "Menyimpan…" : "Keluar"}
            </span>
          </Button>

          <img
            src="/icon.svg"
            alt="AnzaBook"
            className="size-6 rounded-[6px] object-contain hidden sm:block shrink-0 border border-border/40 shadow-xs"
          />

          <div className="min-w-0">
            <h1 className="font-serif text-sm font-bold text-foreground truncate max-w-[180px] sm:max-w-xs md:max-w-sm">
              {bookTitle}
            </h1>
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground">
              <span>Bab {currentChapter}</span>
              <span>&bull;</span>
              <span>{allChapters.length} Bab</span>
            </div>
          </div>
        </div>

        {/* Center: Scroll vs Slide Layout Toggle */}
        <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-full border border-border/50 text-xs font-mono">
          <button
            type="button"
            onClick={() => onReadingLayoutChange("scroll")}
            className={`px-3 py-1 rounded-full font-medium transition-all flex items-center gap-1.5 ${
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
            className={`px-3 py-1 rounded-full font-medium transition-all flex items-center gap-1.5 ${
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

        {/* Right: Unified Modern Fluid Pill Wrapper for Controls */}
        <div className="flex items-center gap-2">
          {/* DRM On/Off Toggle */}
          {onToggleDrm && (
            <button
              type="button"
              onClick={onToggleDrm}
              className={`h-8 text-[11px] font-mono gap-1 px-2.5 rounded-full border transition-all inline-flex items-center ${
                isDrmEnabled
                  ? "text-emerald-600 dark:text-emerald-400 border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20"
                  : "text-amber-600 dark:text-amber-400 border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20"
              }`}
              title={
                isDrmEnabled
                  ? "Perlindungan Hak Cipta Aktif (Klik untuk screenshot)"
                  : "DRM Nonaktif (Mode Bebas Tangkapan Layar)"
              }
            >
              {isDrmEnabled ? (
                <ShieldCheck className="size-3.5 text-emerald-500" />
              ) : (
                <ShieldOff className="size-3.5 text-amber-500" />
              )}
              <span className="hidden sm:inline">
                DRM {isDrmEnabled ? "ON" : "OFF"}
              </span>
            </button>
          )}

          {/* Audio Player Toggle */}
          {onToggleAudio && (
            <button
              type="button"
              onClick={onToggleAudio}
              className={`h-8 text-xs font-mono gap-1.5 px-3 rounded-full border transition-all inline-flex items-center ${
                isAudioOpen
                  ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)] border-[var(--color-accent)]/40"
                  : "border-border/60 text-muted-foreground hover:text-foreground"
              }`}
              title="Buka Audio Book"
            >
              <Headphones className="size-3.5" />
              <span className="hidden sm:inline">Audio</span>
            </button>
          )}

          {/* Unified Fluid iOS-Style Pill Wrapper: [Bab Icon, Stabilo, Aa, Flag, Share] */}
          <div className="inline-flex items-center gap-1 bg-muted/60 dark:bg-muted/30 p-1 rounded-full border border-border/50 shadow-xs backdrop-blur-md">
            {/* 1. TOC (Daftar Bab) - Icon Only */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  const next = !isTocOpen;
                  closeAllMenus();
                  setIsTocOpen(next);
                }}
                className={`size-8 rounded-full flex items-center justify-center transition-all ${
                  isTocOpen
                    ? "bg-background text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                }`}
                title="Daftar Bab"
                aria-label="Daftar Bab"
              >
                <IosList className="size-4" />
              </button>

              {isTocOpen && (
                <div className="absolute right-0 top-10 w-64 bg-card border border-border rounded-[14px] shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
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
                        className={`w-full text-left px-2.5 py-1.5 rounded-[6px] text-xs font-sans transition-colors flex items-center justify-between ${
                          ch.chapterNumber === currentChapter
                            ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)] font-semibold"
                            : "text-foreground hover:bg-muted/50"
                        }`}
                      >
                        <span className="truncate pr-2">
                          {ch.chapterNumber}. {ch.title}
                        </span>
                        {ch.isSample && (
                          <span className="shrink-0 text-[9px] font-mono uppercase px-1 py-0.2 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 rounded-[3px]">
                            Sampel
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Highlights / Stabilo */}
            {onToggleHighlights && (
              <button
                type="button"
                onClick={onToggleHighlights}
                className={`size-8 rounded-full flex items-center justify-center transition-all ${
                  isHighlightsOpen
                    ? "bg-amber-500/20 text-amber-500 font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                }`}
                title="Buka Catatan & Stabilo"
                aria-label="Catatan & Stabilo"
              >
                <IosHighlighter className="size-4 text-amber-500" />
                {highlightCount > 0 && (
                  <span className="sr-only">({highlightCount})</span>
                )}
              </button>
            )}

            {/* 3. Typography & Appearance Settings (Aa) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  const next = !isSettingsOpen;
                  closeAllMenus();
                  setIsSettingsOpen(next);
                }}
                className={`size-8 rounded-full flex items-center justify-center transition-all ${
                  isSettingsOpen
                    ? "bg-background text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                }`}
                title="Pengaturan Tipografi"
                aria-label="Pengaturan Tipografi dan Tampilan"
              >
                <span className="font-serif font-bold text-xs leading-none">
                  Aa
                </span>
              </button>

              {isSettingsOpen && (
                <div className="absolute right-0 top-10 w-72 bg-card border border-border rounded-[14px] shadow-2xl p-4 z-50 space-y-4 animate-in fade-in zoom-in-95">
                  {/* Theme Mode */}
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block mb-2">
                      Kertas & Pencahayaan
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => onThemeChange("manila")}
                        className={`p-2 rounded-[8px] border text-xs flex flex-col items-center gap-1 transition-all ${
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
                        className={`p-2 rounded-[8px] border text-xs flex flex-col items-center gap-1 transition-all ${
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
                        className={`p-2 rounded-[8px] border text-xs flex flex-col items-center gap-1 transition-all ${
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
                        className={`px-2 py-1.5 rounded-[6px] border text-xs font-serif ${
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
                        className={`px-2 py-1.5 rounded-[6px] border text-xs font-sans ${
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
                        className={`px-2 py-1.5 rounded-[6px] border text-[11px] font-sans ${
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
                        onClick={() =>
                          onFontSizeChange(Math.max(14, fontSize - 1))
                        }
                        className="flex-1 h-8 text-xs font-mono rounded-[8px]"
                      >
                        A-
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onFontSizeChange(18)}
                        className="flex-1 h-8 text-xs font-mono rounded-[8px]"
                      >
                        Reset
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          onFontSizeChange(Math.min(26, fontSize + 1))
                        }
                        className="flex-1 h-8 text-xs font-mono rounded-[8px]"
                      >
                        A+
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 4. Flag Language Switcher Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  const next = !isLanguageOpen;
                  closeAllMenus();
                  setIsLanguageOpen(next);
                }}
                className={`size-8 rounded-full flex items-center justify-center transition-all overflow-hidden ${
                  isLanguageOpen
                    ? "ring-2 ring-[var(--color-accent)] bg-background"
                    : "hover:bg-background/50"
                }`}
                title="Pilih Bahasa Naskah"
                aria-label="Pilih Bahasa Naskah"
              >
                {languageView === "id" ? (
                  <FlagIcon
                    lang="id"
                    size="sm"
                    className="rounded-full overflow-hidden w-4.5 h-4.5 object-cover"
                  />
                ) : languageView === "en" ? (
                  <FlagIcon
                    lang="en"
                    size="sm"
                    className="rounded-full overflow-hidden w-4.5 h-4.5 object-cover"
                  />
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
                    {languageView === "id" && (
                      <Check className="size-3.5 text-white" />
                    )}
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
                    {languageView === "en" && (
                      <Check className="size-3.5 text-white" />
                    )}
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
                    {languageView === "split" && (
                      <Check className="size-3.5 text-white" />
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* 5. Share Action Button */}
            {onShare && (
              <button
                type="button"
                onClick={onShare}
                className="size-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background/50 transition-all"
                title="Flex & Bagikan Naskah"
                aria-label="Flex & Bagikan Naskah"
              >
                <IosShare className="size-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
