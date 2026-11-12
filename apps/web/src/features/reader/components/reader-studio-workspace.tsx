import * as React from "react";
import {
  ArrowLeft,
  BookOpen,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  FileText,
  Menu,
  Moon,
  PenTool,
  Plus,
  RotateCcw,
  Save,
  Send,
  Sparkles,
  Sun,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import type {
  DigitalPolicy,
  ManuscriptChapterDto,
  ManuscriptSubmissionDto,
  PublisherDto,
} from "@starter/shared/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useManuscript,
  useReviewManuscript,
  useSubmitManuscriptDraft,
  useUpdateManuscript,
  useVerifiedPublishers,
} from "@/features/social/hooks";

interface ReaderStudioWorkspaceProps {
  manuscriptIdOrSlug: string;
  mode?: "write" | "review";
  onBack: () => void;
  onPublished?: (bookId?: string) => void;
}

type ReaderTheme = "manila" | "sepia" | "night";

const THEME_STYLES: Record<
  ReaderTheme,
  {
    bg: string;
    text: string;
    border: string;
    cardBg: string;
    accent: string;
    mutedText: string;
    canvasBg: string;
  }
> = {
  manila: {
    bg: "#f7f1e5",
    text: "#2b251d",
    border: "#dfd6c4",
    cardBg: "#f2ebd9",
    accent: "#b45309",
    mutedText: "#746957",
    canvasBg: "#fffdf9",
  },
  sepia: {
    bg: "#eee5d3",
    text: "#362a1e",
    border: "#d8cbb5",
    cardBg: "#e6dcbe",
    accent: "#92400e",
    mutedText: "#6e5d4b",
    canvasBg: "#fbf6ec",
  },
  night: {
    bg: "#141517",
    text: "#dcd7cd",
    border: "#282a2e",
    cardBg: "#1c1e22",
    accent: "#f59e0b",
    mutedText: "#8a8f98",
    canvasBg: "#181a1d",
  },
};

export function ReaderStudioWorkspace({
  manuscriptIdOrSlug,
  mode = "write",
  onBack,
  onPublished,
}: ReaderStudioWorkspaceProps) {
  const { data: manuscript, isLoading, refetch } = useManuscript(manuscriptIdOrSlug);
  const { data: verifiedPublishers = [] } = useVerifiedPublishers();

  const updateMutation = useUpdateManuscript();
  const submitDraftMutation = useSubmitManuscriptDraft();
  const reviewMutation = useReviewManuscript();

  const [theme, setTheme] = React.useState<ReaderTheme>("manila");
  const [fontSize, setFontSize] = React.useState<number>(18);
  const [fontFamily, setFontFamily] = React.useState<"serif" | "sans">("serif");

  // Editorial workspace state
  const [title, setTitle] = React.useState("");
  const [synopsis, setSynopsis] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [proposedPolicy, setProposedPolicy] = React.useState<DigitalPolicy>("hybrid_nakama_alacarte");
  const [chapters, setChapters] = React.useState<ManuscriptChapterDto[]>([]);
  const [activeChapterIndex, setActiveChapterIndex] = React.useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const [isSubmittingToPublisherOpen, setIsSubmittingToPublisherOpen] = React.useState(false);
  const [selectedPublisherId, setSelectedPublisherId] = React.useState<string>("");

  // Review mode actions state
  const [isReviewActionOpen, setIsReviewActionOpen] = React.useState(false);
  const [reviewAction, setReviewAction] = React.useState<"approve" | "request_revision" | "reject">("approve");
  const [reviewNotes, setReviewNotes] = React.useState("");
  const [isEditingInReviewMode, setIsEditingInReviewMode] = React.useState(false);

  // Auto-save tracker
  const [saveStatus, setSaveStatus] = React.useState<"saved" | "saving" | "unsaved">("saved");
  const saveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Initialize data
  React.useEffect(() => {
    if (manuscript) {
      setTitle(manuscript.title || "");
      setSynopsis(manuscript.synopsis || "");
      setCategory(manuscript.category || "Fiksi Sastra");
      setProposedPolicy(manuscript.proposedDigitalPolicy || "hybrid_nakama_alacarte");
      setSelectedPublisherId(manuscript.publisherId || "");
      const loadedChapters =
        manuscript.chapters && manuscript.chapters.length > 0
          ? manuscript.chapters
          : [
              {
                id: "initial",
                manuscriptId: manuscript.id,
                chapterNumber: 1,
                titleId: "Bab 1: Awal Mula",
                contentId: "<p>Mulai menulis karyamu di sini...</p>",
                contentEn: null,
                blueprintContent: null,
                estimatedMinutes: 5,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ];
      setChapters(loadedChapters);
      setSaveStatus("saved");
    }
  }, [manuscript]);

  const activeChapter = chapters[activeChapterIndex] || chapters[0];

  // Auto-save logic
  const triggerAutoSave = React.useCallback(
    (
      currentTitle: string,
      currentSynopsis: string,
      currentCategory: string,
      currentChapters: ManuscriptChapterDto[],
    ) => {
      setSaveStatus("unsaved");
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

      saveTimeoutRef.current = setTimeout(async () => {
        try {
          setSaveStatus("saving");
          await updateMutation.mutateAsync({
            idOrSlug: manuscriptIdOrSlug,
            input: {
              title: currentTitle,
              synopsis: currentSynopsis,
              category: currentCategory,
              chapters: currentChapters.map((ch) => ({
                chapterNumber: ch.chapterNumber,
                titleId: ch.titleId,
                contentId: ch.contentId,
                contentEn: ch.contentEn,
                blueprintContent: ch.blueprintContent,
                estimatedMinutes: ch.estimatedMinutes,
              })),
            },
          });
          setSaveStatus("saved");
        } catch (err) {
          console.error("Auto-save failed", err);
          setSaveStatus("unsaved");
        }
      }, 1200);
    },
    [manuscriptIdOrSlug, updateMutation],
  );

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    triggerAutoSave(newTitle, synopsis, category, chapters);
  };

  const handleChapterTitleChange = (newTitle: string) => {
    const updated = chapters.map((ch, idx) =>
      idx === activeChapterIndex ? { ...ch, titleId: newTitle } : ch,
    );
    setChapters(updated);
    triggerAutoSave(title, synopsis, category, updated);
  };

  const handleChapterContentChange = (newContent: string) => {
    const words = newContent.replace(/<[^>]*>/g, " ").trim().split(/\s+/).filter(Boolean).length;
    const estimatedMinutes = Math.max(1, Math.round(words / 180));

    const updated = chapters.map((ch, idx) =>
      idx === activeChapterIndex
        ? { ...ch, contentId: newContent, estimatedMinutes }
        : ch,
    );
    setChapters(updated);
    triggerAutoSave(title, synopsis, category, updated);
  };

  const handleAddChapter = () => {
    const nextNumber = chapters.length + 1;
    const newChapter: ManuscriptChapterDto = {
      id: `new-${Date.now()}`,
      manuscriptId: manuscript?.id || "",
      chapterNumber: nextNumber,
      titleId: `Bab ${nextNumber}: Bagian Baru`,
      contentId: "<p>Lanjutkan perjalanan ceritamu di sini...</p>",
      contentEn: null,
      blueprintContent: null,
      estimatedMinutes: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [...chapters, newChapter];
    setChapters(updated);
    setActiveChapterIndex(updated.length - 1);
    triggerAutoSave(title, synopsis, category, updated);
  };

  const handleDeleteChapter = (indexToDelete: number) => {
    if (chapters.length <= 1) return;
    const updated = chapters
      .filter((_, idx) => idx !== indexToDelete)
      .map((ch, idx) => ({ ...ch, chapterNumber: idx + 1 }));
    setChapters(updated);
    if (activeChapterIndex >= updated.length) {
      setActiveChapterIndex(updated.length - 1);
    }
    triggerAutoSave(title, synopsis, category, updated);
  };

  const handleManualSave = async () => {
    try {
      setSaveStatus("saving");
      await updateMutation.mutateAsync({
        idOrSlug: manuscriptIdOrSlug,
        input: {
          title,
          synopsis,
          category,
          chapters: chapters.map((ch) => ({
            chapterNumber: ch.chapterNumber,
            titleId: ch.titleId,
            contentId: ch.contentId,
            contentEn: ch.contentEn,
            blueprintContent: ch.blueprintContent,
            estimatedMinutes: ch.estimatedMinutes,
          })),
        },
      });
      setSaveStatus("saved");
    } catch (err) {
      console.error("Save failed", err);
      setSaveStatus("unsaved");
    }
  };

  const handleSubmitToPublisher = async () => {
    try {
      await submitDraftMutation.mutateAsync({
        idOrSlug: manuscriptIdOrSlug,
        publisherId: selectedPublisherId || null,
      });
      setIsSubmittingToPublisherOpen(false);
      refetch();
    } catch (err) {
      console.error("Submit to publisher failed", err);
    }
  };

  const handleReviewDecision = async () => {
    try {
      await reviewMutation.mutateAsync({
        idOrSlug: manuscriptIdOrSlug,
        input: {
          action: reviewAction,
          notes: reviewNotes.trim() || undefined,
        },
      });
      setIsReviewActionOpen(false);
      refetch();
      if (reviewAction === "approve" && onPublished) {
        onPublished(manuscript?.publishedBookId || undefined);
      }
    } catch (err) {
      console.error("Review decision failed", err);
    }
  };

  const currentTheme = THEME_STYLES[theme];

  if (isLoading || !manuscript) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <BookOpen className="size-8 animate-pulse text-amber-500" />
          <span className="text-xs font-mono text-muted-foreground">
            Menyiapkan Kanvas E-Reader Studio...
          </span>
        </div>
      </div>
    );
  }

  const isAuthor = mode === "write";
  const isReadOnly =
    !isAuthor && !isEditingInReviewMode && manuscript.status !== "draft";

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-hidden transition-colors duration-200 select-text"
      style={{
        backgroundColor: currentTheme.bg,
        color: currentTheme.text,
      }}
    >
      {/* ================= TOP STUDIO BAR ================= */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between border-b px-4 py-2.5 backdrop-blur-md"
        style={{
          borderColor: currentTheme.border,
          backgroundColor: currentTheme.bg,
        }}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title="Keluar dari Studio"
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">Kembali</span>
          </button>

          <div className="h-4 w-px bg-border/40" />

          <button
            type="button"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title="Daftar Bab Naskah"
          >
            <Menu className="size-4" />
            <span className="font-mono text-[11px]">
              Bab {activeChapterIndex + 1}/{chapters.length}
            </span>
          </button>

          <div className="hidden md:flex items-center gap-2 pl-2">
            <span
              className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border"
              style={{
                borderColor: currentTheme.border,
                backgroundColor: currentTheme.cardBg,
              }}
            >
              {manuscript.status.replace("_", " ")}
            </span>
            <span
              className="text-xs font-mono"
              style={{ color: currentTheme.mutedText }}
            >
              {saveStatus === "saving"
                ? "Menyimpan draft..."
                : saveStatus === "saved"
                ? "Draft tersimpan"
                : "Perubahan belum disimpan"}
            </span>
          </div>
        </div>

        {/* Center: Manuscript Status or Reading Mode */}
        <div className="hidden lg:flex items-center gap-3">
          <span className="text-xs font-serif font-medium truncate max-w-xs">
            {title || "Naskah Tanpa Judul"}
          </span>
        </div>

        {/* Right Tools: Theme & Submit Actions */}
        <div className="flex items-center gap-2">
          {/* Theme switcher */}
          <div
            className="flex items-center rounded-lg border p-0.5"
            style={{ borderColor: currentTheme.border }}
          >
            <button
              type="button"
              onClick={() => setTheme("manila")}
              className={`size-6 rounded text-xs flex items-center justify-center font-serif cursor-pointer ${
                theme === "manila" ? "ring-1 ring-amber-600 bg-amber-100/60" : ""
              }`}
              title="Kertas Manila"
            >
              M
            </button>
            <button
              type="button"
              onClick={() => setTheme("sepia")}
              className={`size-6 rounded text-xs flex items-center justify-center font-serif cursor-pointer ${
                theme === "sepia" ? "ring-1 ring-amber-800 bg-amber-200/60" : ""
              }`}
              title="Kertas Sepia"
            >
              S
            </button>
            <button
              type="button"
              onClick={() => setTheme("night")}
              className={`size-6 rounded text-xs flex items-center justify-center font-serif cursor-pointer ${
                theme === "night" ? "ring-1 ring-amber-400 bg-zinc-800 text-white" : ""
              }`}
              title="Tema Malam"
            >
              <Moon className="size-3" />
            </button>
          </div>

          {/* Typography switch */}
          <button
            type="button"
            onClick={() => setFontFamily(fontFamily === "serif" ? "sans" : "serif")}
            className="hidden sm:flex size-7 items-center justify-center rounded-lg border text-xs font-semibold cursor-pointer"
            style={{ borderColor: currentTheme.border }}
            title="Ganti Font"
          >
            {fontFamily === "serif" ? "Aa" : "Tt"}
          </button>

          {/* Save Button */}
          {isAuthor && (
            <button
              type="button"
              onClick={handleManualSave}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              style={{ borderColor: currentTheme.border }}
            >
              <Save className="size-3.5" />
              <span>Simpan</span>
            </button>
          )}

          {/* Action Button: Kirim ke Penerbit (Author) OR Review Actions (Publisher) */}
          {isAuthor ? (
            <button
              type="button"
              onClick={() => setIsSubmittingToPublisherOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-transform active:scale-95"
              style={{
                backgroundColor: currentTheme.accent,
                color: "#ffffff",
              }}
            >
              <Send className="size-3.5" />
              <span>Kirim ke Penerbit</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditingInReviewMode(!isEditingInReviewMode)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                  isEditingInReviewMode ? "bg-amber-500 text-black font-bold" : ""
                }`}
                style={{ borderColor: currentTheme.border }}
              >
                <PenTool className="size-3.5" />
                <span>{isEditingInReviewMode ? "Selesai Koreksi" : "Koreksi Teks"}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setReviewAction("approve");
                  setIsReviewActionOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-xs"
              >
                <CheckCircle2 className="size-3.5" />
                <span>Terbitkan</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setReviewAction("request_revision");
                  setIsReviewActionOpen(true);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border text-amber-500 hover:bg-amber-500/10 cursor-pointer"
                style={{ borderColor: currentTheme.border }}
              >
                <span>Revisi</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ================= WORKSPACE BODY ================= */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* TOC Sidebar */}
        {isSidebarOpen && (
          <aside
            className="w-72 sm:w-80 border-r flex flex-col justify-between shrink-0 z-30 transition-all overflow-hidden"
            style={{
              borderColor: currentTheme.border,
              backgroundColor: currentTheme.cardBg,
            }}
          >
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: currentTheme.border }}>
              <div className="space-y-0.5">
                <h4 className="font-serif text-sm font-bold flex items-center gap-2">
                  <BookOpen className="size-4 text-amber-600" />
                  <span>Struktur Bab Naskah</span>
                </h4>
                <p className="text-[11px] font-mono" style={{ color: currentTheme.mutedText }}>
                  {chapters.length} Bab • ±{chapters.reduce((acc, c) => acc + (c.estimatedMinutes || 5), 0)} mnt baca
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Chapters list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {chapters.map((ch, idx) => {
                const isActive = idx === activeChapterIndex;
                return (
                  <div
                    key={ch.id || idx}
                    onClick={() => setActiveChapterIndex(idx)}
                    className={`group flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      isActive
                        ? "shadow-xs border-amber-600/40 bg-amber-500/10 font-semibold"
                        : "border-transparent hover:bg-black/5 dark:hover:bg-white/5 opacity-80 hover:opacity-100"
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-mono text-[10px] text-amber-700 dark:text-amber-400">
                        Bab {ch.chapterNumber}
                      </div>
                      <div className="truncate text-xs">{ch.titleId}</div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] font-mono" style={{ color: currentTheme.mutedText }}>
                        {ch.estimatedMinutes}m
                      </span>
                      {isAuthor && chapters.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteChapter(idx);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-opacity"
                          title="Hapus Bab"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Add Chapter Button */}
              {isAuthor && (
                <button
                  type="button"
                  onClick={handleAddChapter}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed text-xs font-medium hover:border-amber-500 hover:text-amber-500 transition-colors mt-3 cursor-pointer"
                  style={{ borderColor: currentTheme.border }}
                >
                  <Plus className="size-3.5" />
                  <span>Tambah Bab Baru</span>
                </button>
              )}
            </div>

            {/* Target Publisher Info */}
            <div className="p-3 border-t text-xs space-y-1" style={{ borderColor: currentTheme.border }}>
              <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: currentTheme.mutedText }}>
                Penerbit Tujuan:
              </span>
              <p className="font-serif font-bold text-xs truncate">
                {manuscript.publisherName || "AnzaBook Official Publishing"}
              </p>
            </div>
          </aside>
        )}

        {/* E-Reader WYSIWYG Canvas */}
        <main
          className="flex-1 overflow-y-auto flex flex-col items-center px-4 sm:px-8 py-10"
          style={{ backgroundColor: currentTheme.bg }}
        >
          {/* The Paper Sheet */}
          <article
            className="w-full max-w-2xl min-h-[85vh] rounded-2xl p-6 sm:p-14 shadow-md border space-y-8 transition-all"
            style={{
              backgroundColor: currentTheme.canvasBg,
              borderColor: currentTheme.border,
            }}
          >
            {/* Book & Chapter Header */}
            <header className="space-y-4 border-b pb-6" style={{ borderColor: currentTheme.border }}>
              {/* Editable Book Title */}
              {isAuthor ? (
                <input
                  type="text"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Ketik Judul Naskah / Buku..."
                  className={`w-full bg-transparent font-serif font-bold text-2xl sm:text-3xl outline-none placeholder:text-muted-foreground/40 ${
                    fontFamily === "serif" ? "font-serif" : "font-sans"
                  }`}
                />
              ) : (
                <h1 className="font-serif font-bold text-2xl sm:text-3xl">{title}</h1>
              )}

              {/* Editable Chapter Title */}
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  Bab {activeChapter?.chapterNumber || 1}
                </span>

                {isAuthor || isEditingInReviewMode ? (
                  <input
                    type="text"
                    value={activeChapter?.titleId || ""}
                    onChange={(e) => handleChapterTitleChange(e.target.value)}
                    placeholder="Judul Bab Ini..."
                    className="flex-1 bg-transparent font-serif font-semibold text-lg outline-none border-b border-dashed border-border/40 focus:border-amber-500"
                  />
                ) : (
                  <h2 className="font-serif font-semibold text-lg">{activeChapter?.titleId}</h2>
                )}
              </div>
            </header>

            {/* In-Canvas WYSIWYG Content */}
            <div className="space-y-4">
              {isAuthor || isEditingInReviewMode ? (
                <Textarea
                  value={activeChapter?.contentId || ""}
                  onChange={(e) => handleChapterContentChange(e.target.value)}
                  placeholder="Tuliskan naskah Anda langsung di kanvas E-Reader ini (mendukung paragraf, dialog, kutipan)..."
                  className={`w-full min-h-[500px] bg-transparent border-none focus-visible:ring-0 resize-none p-0 leading-relaxed outline-none ${
                    fontFamily === "serif" ? "font-serif" : "font-sans"
                  }`}
                  style={{
                    fontSize: `${fontSize}px`,
                    lineHeight: "1.8",
                    color: currentTheme.text,
                  }}
                />
              ) : (
                <div
                  className={`leading-relaxed space-y-4 ${
                    fontFamily === "serif" ? "font-serif" : "font-sans"
                  }`}
                  style={{
                    fontSize: `${fontSize}px`,
                    lineHeight: "1.8",
                    color: currentTheme.text,
                  }}
                  dangerouslySetInnerHTML={{
                    __html: activeChapter?.contentId || "<p>Belum ada isi naskah.</p>",
                  }}
                />
              )}
            </div>

            {/* Chapter Footer Navigation */}
            <footer
              className="pt-8 border-t flex items-center justify-between text-xs font-mono"
              style={{ borderColor: currentTheme.border, color: currentTheme.mutedText }}
            >
              <button
                type="button"
                disabled={activeChapterIndex === 0}
                onClick={() => setActiveChapterIndex((i) => Math.max(0, i - 1))}
                className="flex items-center gap-1.5 disabled:opacity-30 hover:text-foreground cursor-pointer"
              >
                <ChevronLeft className="size-4" />
                <span>Bab Sebelumnya</span>
              </button>

              <span>
                Bab {activeChapterIndex + 1} dari {chapters.length}
              </span>

              <button
                type="button"
                disabled={activeChapterIndex >= chapters.length - 1}
                onClick={() => setActiveChapterIndex((i) => Math.min(chapters.length - 1, i + 1))}
                className="flex items-center gap-1.5 disabled:opacity-30 hover:text-foreground cursor-pointer"
              >
                <span>Bab Selanjutnya</span>
                <ChevronRight className="size-4" />
              </button>
            </footer>
          </article>
        </main>
      </div>

      {/* ================= MODAL: SUBMIT TO PUBLISHER ================= */}
      {isSubmittingToPublisherOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs text-foreground">
          <div className="max-w-md w-full rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="size-5 text-amber-500" />
                <h3 className="font-serif font-bold text-base">Ajukan Naskah ke Penerbit</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSubmittingToPublisherOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Naskah akan dikirim langsung ke meja redaksi penerbit untuk ditinjau bab demi bab di dalam E-Reader.
            </p>

            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Pilih Penerbit Tujuan</Label>
                <select
                  value={selectedPublisherId}
                  onChange={(e) => setSelectedPublisherId(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background p-2.5 text-xs outline-none"
                >
                  <option value="">AnzaBook Official Publishing (Standar)</option>
                  {verifiedPublishers.map((pub) => (
                    <option key={pub.id} value={pub.id}>
                      {pub.name} ({pub.city || "Indonesia"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Sinopsis Ringkas</Label>
                <Textarea
                  rows={3}
                  value={synopsis}
                  onChange={(e) => setSynopsis(e.target.value)}
                  placeholder="Ringkasan premis atau inti gagasan buku..."
                  className="text-xs rounded-xl resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Skema Distribusi Digital</Label>
                <select
                  value={proposedPolicy}
                  onChange={(e) => setProposedPolicy(e.target.value as DigitalPolicy)}
                  className="w-full rounded-xl border border-border bg-background p-2.5 text-xs outline-none"
                >
                  <option value="hybrid_nakama_alacarte">Hybrid: Nakama Pool + Ala Carte</option>
                  <option value="free_open">Bebas Akses (Free Open Literasi)</option>
                  <option value="print_claim_only">Eksklusif Klaim Cetak (Phygital)</option>
                  <option value="alacarte_only">Hanya Penjualan Satuan (Ala Carte)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button
                type="button"
                onClick={handleSubmitToPublisher}
                disabled={submitDraftMutation.isPending}
                className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs py-2.5 rounded-xl cursor-pointer"
              >
                {submitDraftMutation.isPending ? "Mengirimkan..." : "Kirim Naskah Sekarang"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsSubmittingToPublisherOpen(false)}
                className="text-xs py-2.5 rounded-xl"
              >
                Batal
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: PUBLISHER REVIEW ACTION ================= */}
      {isReviewActionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs text-foreground">
          <div className="max-w-md w-full rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-serif font-bold text-base">
                {reviewAction === "approve"
                  ? "Setujui & Terbitkan Buku"
                  : reviewAction === "request_revision"
                  ? "Minta Revisi kepada Penulis"
                  : "Tolak Pengajuan Naskah"}
              </h3>
              <button
                type="button"
                onClick={() => setIsReviewActionOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <Label className="text-xs font-semibold">
                {reviewAction === "approve"
                  ? "Catatan Terbit / Editorial (Opsional)"
                  : "Catatan & Alasan untuk Penulis"}
              </Label>
              <Textarea
                rows={4}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder={
                  reviewAction === "approve"
                    ? "Contoh: Naskah disetujui untuk terbit dan masuk katalog AnzaBook."
                    : "Jelaskan bagian bab atau paragraf mana yang memerlukan perbaikan..."
                }
                className="text-xs rounded-xl resize-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button
                type="button"
                onClick={handleReviewDecision}
                disabled={reviewMutation.isPending}
                className={`flex-1 font-bold text-xs py-2.5 rounded-xl cursor-pointer text-white ${
                  reviewAction === "approve"
                    ? "bg-emerald-600 hover:bg-emerald-500"
                    : reviewAction === "request_revision"
                    ? "bg-amber-600 hover:bg-amber-500"
                    : "bg-red-600 hover:bg-red-500"
                }`}
              >
                {reviewMutation.isPending
                  ? "Memproses..."
                  : reviewAction === "approve"
                  ? "Konfirmasi Terbitkan"
                  : reviewAction === "request_revision"
                  ? "Kirim Permintaan Revisi"
                  : "Konfirmasi Tolak"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsReviewActionOpen(false)}
                className="text-xs py-2.5 rounded-xl"
              >
                Batal
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
