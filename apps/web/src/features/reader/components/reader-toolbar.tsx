import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle,
  Columns2,
  FileText,
  Languages,
  ListOrdered,
  Moon,
  Settings2,
  Sun,
  Type,
} from "lucide-react";
import type { ReadingMode } from "@starter/shared/types";
import { Button } from "@/components/ui/button";

export type ReaderTheme = "manila" | "sepia" | "night";
export type ReaderFont = "serif" | "sans" | "dyslexia";
export type LanguageView = "id" | "en" | "split";

type ReaderToolbarProps = {
  slug: string;
  bookTitle: string;
  mode: ReadingMode;
  onModeChange: (m: ReadingMode) => void;
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
};

export function ReaderToolbar({
  slug,
  bookTitle,
  mode,
  onModeChange,
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
}: ReaderToolbarProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTocOpen, setIsTocOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/95 backdrop-blur-sm px-4 py-2.5 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Left: Back & Title */}
        <div className="flex items-center gap-3 min-w-0">
          <Button asChild variant="ghost" size="sm" className="h-8 px-2">
            <Link to="/books/$slug" params={{ slug }} title="Kembali ke Detail Buku">
              <ArrowLeft className="size-4" />
              <span className="sr-only">Kembali</span>
            </Link>
          </Button>

          <div className="min-w-0">
            <h1 className="font-serif text-sm font-bold text-foreground truncate">
              {bookTitle}
            </h1>
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground">
              <span>Bab {currentChapter}</span>
              <span>&bull;</span>
              <span className="capitalize">
                {mode === "blueprint" ? "Intisari 20 Menit" : "Teks Lengkap"}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Mode & Language Controls (Hidden on very narrow mobile, visible sm+) */}
        <div className="hidden md:flex items-center gap-2">
          {/* Mode Switcher */}
          <div className="bg-muted/60 p-0.5 rounded-[6px] border border-border flex items-center text-xs">
            <button
              type="button"
              onClick={() => onModeChange("full")}
              className={`px-2.5 py-1 rounded-[4px] font-medium transition-all ${
                mode === "full"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="flex items-center gap-1">
                <FileText className="size-3.5" />
                Lengkap
              </span>
            </button>
            <button
              type="button"
              onClick={() => onModeChange("blueprint")}
              className={`px-2.5 py-1 rounded-[4px] font-medium transition-all ${
                mode === "blueprint"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="flex items-center gap-1">
                <BookOpen className="size-3.5 text-[var(--color-accent)]" />
                Intisari 20 Menit
              </span>
            </button>
          </div>

          {/* Language View Switcher */}
          <div className="bg-muted/60 p-0.5 rounded-[6px] border border-border flex items-center text-xs font-mono">
            <button
              type="button"
              onClick={() => onLanguageViewChange("id")}
              className={`px-2 py-1 rounded-[4px] transition-all ${
                languageView === "id"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Bahasa Indonesia"
            >
              ID
            </button>
            <button
              type="button"
              onClick={() => onLanguageViewChange("split")}
              className={`px-2 py-1 rounded-[4px] transition-all flex items-center gap-1 ${
                languageView === "split"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Tampilan Dwibahasa Split"
            >
              <Columns2 className="size-3" />
              <span>Split</span>
            </button>
            <button
              type="button"
              onClick={() => onLanguageViewChange("en")}
              className={`px-2 py-1 rounded-[4px] transition-all ${
                languageView === "en"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Bahasa Asli (Inggris)"
            >
              EN
            </button>
          </div>
        </div>

        {/* Right: Appearance Popover, Chapter Menu, Finish Session CTA */}
        <div className="flex items-center gap-2">
          {/* Chapter TOC Dropdown */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsTocOpen(!isTocOpen);
                setIsSettingsOpen(false);
              }}
              className="h-8 text-xs font-mono gap-1.5 px-2.5"
            >
              <ListOrdered className="size-3.5" />
              <span className="hidden sm:inline">Bab</span>
            </Button>

            {isTocOpen && (
              <div className="absolute right-0 top-10 w-64 bg-card border border-border rounded-[8px] shadow-xl p-2 z-50 animate-in fade-in zoom-in-95">
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

          {/* Typography & Appearance Settings */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsSettingsOpen(!isSettingsOpen);
                setIsTocOpen(false);
              }}
              className="h-8 text-xs font-mono gap-1.5 px-2.5"
              aria-label="Pengaturan Tampilan"
            >
              <Settings2 className="size-3.5" />
              <span className="hidden sm:inline">Aa</span>
            </Button>

            {isSettingsOpen && (
              <div className="absolute right-0 top-10 w-72 bg-card border border-border rounded-[10px] shadow-xl p-4 z-50 space-y-4 animate-in fade-in zoom-in-95">
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

                {/* Mobile Mode / Language Quick Switch inside settings */}
                <div className="md:hidden pt-2 border-t border-border space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
                    Mode & Bahasa
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant={mode === "blueprint" ? "default" : "outline"}
                      size="sm"
                      onClick={() => onModeChange(mode === "blueprint" ? "full" : "blueprint")}
                      className="flex-1 h-8 text-xs"
                    >
                      {mode === "blueprint" ? "Teks Lengkap" : "Intisari 20 Menit"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        onLanguageViewChange(
                          languageView === "split"
                            ? "id"
                            : languageView === "id"
                              ? "en"
                              : "split",
                        )
                      }
                      className="h-8 text-xs font-mono"
                    >
                      <Languages className="size-3.5 mr-1" />
                      {languageView.toUpperCase()}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Selesai Membaca Button */}
          <Button
            size="sm"
            onClick={onFinishSession}
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
