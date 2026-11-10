import { useState, useRef, type ChangeEvent } from "react";
import {
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  FileText,
  HelpCircle,
  Loader2,
  Plus,
  Trash2,
  UploadCloud,
  X,
  AlertCircle,
  Coins,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { calculatePrintEconomics } from "@starter/shared/print-economics";
import type { DigitalPolicy } from "@starter/shared/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSubmitManuscript, useVerifiedPublishers } from "../hooks";
import {
  extractManuscriptFromFile,
  type ExtractedChapter,
} from "../utils/client-manuscript-extractor";

type ManuscriptStudioDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  defaultPenName?: string | null;
  onSuccess?: () => void;
};

export function ManuscriptStudioDialog({
  isOpen,
  onClose,
  defaultPenName,
  onSuccess,
}: ManuscriptStudioDialogProps) {
  const { data: publishers = [] } = useVerifiedPublishers();
  const submitMutation = useSubmitManuscript();

  // Form states
  const [title, setTitle] = useState("");
  const [synopsis, setSynopsis] = useState("");
  const [selectedPublisherId, setSelectedPublisherId] = useState<string>("");
  const [digitalPolicy, setDigitalPolicy] =
    useState<DigitalPolicy>("sample_only");
  const [alacartePrice, setAlacartePrice] = useState<number>(35000);

  // Chapters & Extraction
  const [chapters, setChapters] = useState<ExtractedChapter[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [extractedFileName, setExtractedFileName] = useState<string | null>(
    null,
  );

  // Manual Chapter Add Modal/Form
  const [isManualAdding, setIsManualAdding] = useState(false);
  const [manualTitle, setManualTitle] = useState("");
  const [manualContent, setManualContent] = useState("");

  // Print simulation (optional helper)
  const [showSim, setShowSim] = useState(false);
  const [pageCount, setPageCount] = useState<number>(180);
  const [printRun, setPrintRun] = useState<number>(1000);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);

  if (!isOpen) return null;

  const simResult = calculatePrintEconomics({
    pageCount,
    printRun,
    authorRoyaltyPct: 12,
  });
  const rakyatTier = simResult.tiers.find(
    (t) => t.editionTier === "rakyat_economy",
  );

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    setExtractionError(null);
    try {
      const result = await extractManuscriptFromFile(file);
      setChapters(result.chapters);
      setExtractedFileName(file.name);
      if (!title && result.titleCandidate) {
        setTitle(result.titleCandidate);
      }
    } catch (err) {
      setExtractionError(
        err instanceof Error
          ? err.message
          : "Gagal mengekstrak berkas naskah di peramban.",
      );
    } finally {
      setIsExtracting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleAddManualChapter = () => {
    if (!manualTitle.trim() || !manualContent.trim()) return;
    const words = manualContent.trim().split(/\s+/).filter(Boolean).length;
    const newChapter: ExtractedChapter = {
      chapterNumber: chapters.length + 1,
      titleId: manualTitle.trim().slice(0, 255),
      contentId: manualContent.trim(),
      estimatedMinutes: Math.max(1, Math.round(words / 200)),
    };
    setChapters((prev) => [...prev, newChapter]);
    setManualTitle("");
    setManualContent("");
    setIsManualAdding(false);
  };

  const handleDeleteChapter = (idx: number) => {
    setChapters((prev) =>
      prev
        .filter((_, i) => i !== idx)
        .map((ch, i) => ({ ...ch, chapterNumber: i + 1 })),
    );
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    if (!title.trim() || title.trim().length < 2) {
      setSubmitError("Judul naskah minimal 2 karakter.");
      return;
    }
    if (!synopsis.trim() || synopsis.trim().length < 20) {
      setSubmitError("Sinopsis naskah minimal 20 karakter.");
      return;
    }
    if (chapters.length === 0) {
      setSubmitError(
        "Sertakan minimal 1 bab naskah (unggah .docx/.txt atau input manual).",
      );
      return;
    }

    try {
      await submitMutation.mutateAsync({
        title: title.trim(),
        synopsis: synopsis.trim(),
        publisherId: selectedPublisherId ? selectedPublisherId : null,
        proposedDigitalPolicy: digitalPolicy,
        proposedAlacartePriceIdr:
          digitalPolicy === "alacarte_only" ? alacartePrice : null,
        printSimJson: {
          pageCount,
          printRun,
          estimatedHppRakyatIdr: rakyatTier?.hppPerUnitIdr,
          suggestedPriceRakyatIdr: rakyatTier?.recommendedPriceIdr,
        },
        chapters: chapters.map((ch) => ({
          chapterNumber: ch.chapterNumber,
          titleId: ch.titleId,
          contentId: ch.contentId,
          estimatedMinutes: ch.estimatedMinutes,
        })),
      });

      setIsSubmittedSuccess(true);
      onSuccess?.();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Gagal mengajukan naskah.",
      );
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="manuscript-studio-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xs overflow-y-auto"
    >
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-card border border-border rounded-[16px] shadow-2xl overflow-hidden text-foreground my-auto">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-[var(--color-accent)]/10 text-[var(--color-accent)] flex items-center justify-center">
              <BookOpen className="size-4" />
            </div>
            <div>
              <h2
                id="manuscript-studio-title"
                className="font-serif text-lg sm:text-xl font-bold tracking-tight"
              >
                Studio Naskah Penulis
              </h2>
              <p className="text-xs text-muted-foreground font-mono">
                Pengajuan Naskah Multi-Bab &amp; Skema Monetisasi B2B2C
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 min-w-11 inline-flex items-center justify-center text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring"
            aria-label="Tutup Dialog"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Success View */}
        {isSubmittedSuccess ? (
          <div className="p-8 text-center space-y-4 my-auto">
            <div className="size-14 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle2 className="size-8" />
            </div>
            <h3 className="font-serif text-2xl font-bold">
              Naskah Berhasil Diajukan!
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              Naskah <strong>&ldquo;{title}&rdquo;</strong> dengan{" "}
              {chapters.length} bab telah berhasil disimpan ke sistem AnzaBook
              dan masuk dalam antrean kurasi penerbit / tim editorial.
            </p>
            <div className="pt-4">
              <Button
                type="button"
                onClick={onClose}
                className="bg-[var(--color-accent)] hover:opacity-90 text-white min-h-11 px-6 font-semibold cursor-pointer"
              >
                Kembali ke Dashboard
              </Button>
            </div>
          </div>
        ) : (
          /* Main Form Content */
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {submitError && (
              <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Section 1: Metadata Naskah */}
            <div className="space-y-4">
              <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                <FileText className="size-3.5 text-[var(--color-accent)]" />
                <span>1. Metadata Naskah</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="manuscript-title" className="text-xs">
                    Judul Naskah Buku <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="manuscript-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Contoh: Filosofi Kopi di Era Algoritma"
                    className="min-h-11"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="author-penname" className="text-xs">
                    Nama Pena Penulis
                  </Label>
                  <Input
                    id="author-penname"
                    defaultValue={defaultPenName || ""}
                    disabled
                    className="min-h-11 bg-muted/50 cursor-not-allowed text-xs font-mono"
                    title="Disesuaikan otomatis dengan profil penulis Anda"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="target-publisher" className="text-xs">
                    Tujuan Mitra Penerbit (Opsional)
                  </Label>
                  <select
                    id="target-publisher"
                    value={selectedPublisherId}
                    onChange={(e) => setSelectedPublisherId(e.target.value)}
                    className="w-full min-h-11 rounded-md border border-input bg-background px-3 py-2 text-xs focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <option value="">
                      Terbit Mandiri / Kurasi Terbuka AnzaBook
                    </option>
                    {publishers.map((pub) => (
                      <option key={pub.id} value={pub.id}>
                        {pub.name} ({pub.city || "Nasional"})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="manuscript-synopsis" className="text-xs">
                    Sinopsis Ringkas Naskah{" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="manuscript-synopsis"
                    rows={3}
                    value={synopsis}
                    onChange={(e) => setSynopsis(e.target.value)}
                    placeholder="Tuliskan latar belakang ide, argumen utama, dan kebaruan wacana buku ini (minimal 20 karakter)..."
                    className="text-xs leading-relaxed"
                  />
                  <p className="text-[11px] text-muted-foreground text-right font-mono">
                    {synopsis.length} / 5000 karakter
                  </p>
                </div>
              </div>
            </div>

            {/* Section 2: Pilihan Skema Monetisasi B2B2C */}
            <div className="space-y-3 pt-2 border-t border-border">
              <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                <Coins className="size-3.5 text-[var(--color-accent)]" />
                <span>2. Pilihan Skema Akses &amp; Monetisasi B2B2C</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Skema A: Phygital */}
                <button
                  type="button"
                  onClick={() => setDigitalPolicy("print_claim_only")}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    digitalPolicy === "print_claim_only"
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)]/5 ring-1 ring-[var(--color-accent)]"
                      : "border-border hover:bg-muted/40"
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-[var(--color-accent)] uppercase">
                        Skema A
                      </span>
                      {digitalPolicy === "print_claim_only" && (
                        <Check className="size-4 text-[var(--color-accent)]" />
                      )}
                    </div>
                    <p className="font-serif font-bold text-sm">
                      Phygital Cetak Asli
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      Akses digital eksklusif hanya untuk pembeli buku fisik
                      asli lewat serial code. Royalti cetak terjamin 100%.
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-border/40 text-[10px] font-mono text-muted-foreground">
                    Kebijakan: <code className="text-foreground">print_claim_only</code>
                  </div>
                </button>

                {/* Skema B: Nakama Creator Pool */}
                <button
                  type="button"
                  onClick={() => setDigitalPolicy("sample_only")}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    digitalPolicy === "sample_only"
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)]/5 ring-1 ring-[var(--color-accent)]"
                      : "border-border hover:bg-muted/40"
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-[var(--color-accent)] uppercase">
                        Skema B
                      </span>
                      {digitalPolicy === "sample_only" && (
                        <Check className="size-4 text-[var(--color-accent)]" />
                      )}
                    </div>
                    <p className="font-serif font-bold text-sm">
                      Nakama Creator Pool
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      Sampel bab awal terbuka. Bab lanjutan dibayar transparan
                      dari pool iuran Nakama berdasarkan menit baca riil.
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-border/40 text-[10px] font-mono text-muted-foreground">
                    Kebijakan: <code className="text-foreground">sample_only</code>
                  </div>
                </button>

                {/* Skema C: Ala Carte */}
                <button
                  type="button"
                  onClick={() => setDigitalPolicy("alacarte_only")}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    digitalPolicy === "alacarte_only"
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)]/5 ring-1 ring-[var(--color-accent)]"
                      : "border-border hover:bg-muted/40"
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-[var(--color-accent)] uppercase">
                        Skema C
                      </span>
                      {digitalPolicy === "alacarte_only" && (
                        <Check className="size-4 text-[var(--color-accent)]" />
                      )}
                    </div>
                    <p className="font-serif font-bold text-sm">
                      Beli Putus Ala Carte
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      Lisensi digital mandiri. Bagi hasil 70% penulis / penerbit,
                      20% AnzaBook, 10% komisi afiliasi kalender komunitas.
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-border/40 text-[10px] font-mono text-muted-foreground">
                    Kebijakan: <code className="text-foreground">alacarte_only</code>
                  </div>
                </button>
              </div>

              {/* Ala Carte Price Input if Selected */}
              {digitalPolicy === "alacarte_only" && (
                <div className="p-3.5 rounded-xl bg-muted/30 border border-border flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold">
                      Usulan Harga Lisensi Digital Ala Carte
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Bagi hasil otomatis: Penulis/Penerbit Rp{" "}
                      {Math.round(alacartePrice * 0.7).toLocaleString("id-ID")} (70%)
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 max-w-[180px]">
                    <span className="text-xs font-mono text-muted-foreground">
                      Rp
                    </span>
                    <Input
                      type="number"
                      step={1000}
                      min={5000}
                      max={1000000}
                      value={alacartePrice}
                      onChange={(e) =>
                        setAlacartePrice(Number(e.target.value) || 0)
                      }
                      className="min-h-9 font-mono text-xs"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Section 3: Bab & Client-Side Extraction */}
            <div className="space-y-3 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-[var(--color-accent)]" />
                  <span>3. Berkas &amp; Bab Naskah ({chapters.length} Bab)</span>
                </h3>

                <button
                  type="button"
                  onClick={() => setIsManualAdding(true)}
                  className="text-xs font-medium text-[var(--color-accent)] hover:underline inline-flex items-center gap-1 cursor-pointer focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <Plus className="size-3.5" />
                  <span>Tambah Bab Manual</span>
                </button>
              </div>

              {/* Extractor Dropzone */}
              <div className="border-2 border-dashed border-border rounded-xl p-5 text-center bg-muted/10 hover:bg-muted/20 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".docx,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="manuscript-file-input"
                />

                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="size-11 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                    {isExtracting ? (
                      <Loader2 className="size-5 animate-spin text-[var(--color-accent)]" />
                    ) : (
                      <UploadCloud className="size-5" />
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="manuscript-file-input"
                      className="text-xs font-semibold text-foreground underline underline-offset-4 cursor-pointer hover:text-[var(--color-accent)]"
                    >
                      Unggah Berkas .docx atau .txt
                    </label>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Ekstraksi bab berlangsung aman murni di memori browser
                      tanpa mengunggah berkas mentah ke server.
                    </p>
                  </div>

                  {extractedFileName && (
                    <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md">
                      ✓ Berkas berhasil diproses: {extractedFileName}
                    </span>
                  )}

                  {extractionError && (
                    <span className="text-[11px] font-mono text-red-600 dark:text-red-400 bg-red-500/10 px-2.5 py-1 rounded-md">
                      ✕ {extractionError}
                    </span>
                  )}
                </div>
              </div>

              {/* Form Input Bab Manual */}
              {isManualAdding && (
                <div className="p-4 rounded-xl border border-[var(--color-accent)]/30 bg-card space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold font-serif">
                      Tambah Bab #{chapters.length + 1}
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsManualAdding(false)}
                      className="text-muted-foreground hover:text-foreground text-xs"
                    >
                      Batal
                    </button>
                  </div>
                  <Input
                    placeholder="Judul Bab (contoh: Bab 1: Titik Temu)"
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                    className="min-h-10 text-xs"
                  />
                  <Textarea
                    placeholder="Isi teks bab naskah..."
                    rows={4}
                    value={manualContent}
                    onChange={(e) => setManualContent(e.target.value)}
                    className="text-xs"
                  />
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddManualChapter}
                      className="bg-[var(--color-accent)] text-white text-xs min-h-9"
                    >
                      Simpan Bab
                    </Button>
                  </div>
                </div>
              )}

              {/* Chapter List Preview */}
              {chapters.length > 0 && (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {chapters.map((ch, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-border bg-card/60 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="size-6 rounded-md bg-muted font-mono font-bold text-[11px] flex items-center justify-center shrink-0">
                          {ch.chapterNumber}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">
                            {ch.titleId}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-mono">
                            ~{ch.estimatedMinutes} menit baca (
                            {ch.contentId.slice(0, 50)}...)
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteChapter(idx)}
                        className="text-muted-foreground hover:text-red-500 p-1.5 transition-colors cursor-pointer"
                        title="Hapus Bab"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 4: Simulasi Cetak Rakyat (Collapsible Helper) */}
            <div className="pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setShowSim(!showSim)}
                className="flex items-center justify-between w-full text-xs font-mono text-muted-foreground hover:text-foreground py-1 cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-emerald-500" />
                  <span>Simulasi HPP Cetak Rakyat Transparan (Opsional)</span>
                </span>
                <ChevronDown
                  className={`size-4 transition-transform ${showSim ? "rotate-180" : ""}`}
                />
              </button>

              {showSim && (
                <div className="mt-3 p-4 rounded-xl bg-muted/20 border border-border space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-muted-foreground">
                        Estimasi Halaman:
                      </span>{" "}
                      <strong>{pageCount} Hal</strong>
                      <input
                        type="range"
                        min={48}
                        max={600}
                        step={12}
                        value={pageCount}
                        onChange={(e) => setPageCount(Number(e.target.value))}
                        className="w-full mt-1.5 accent-[var(--color-accent)]"
                      />
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Oplah Cetak:
                      </span>{" "}
                      <strong>{printRun} Eksemplar</strong>
                      <input
                        type="range"
                        min={100}
                        max={5000}
                        step={100}
                        value={printRun}
                        onChange={(e) => setPrintRun(Number(e.target.value))}
                        className="w-full mt-1.5 accent-[var(--color-accent)]"
                      />
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-background border border-border flex flex-wrap items-center justify-between gap-3 font-mono text-[11px]">
                    <div>
                      <span className="text-muted-foreground">HPP Satuan:</span>{" "}
                      <strong className="text-foreground">
                        Rp {rakyatTier?.hppPerUnitIdr.toLocaleString("id-ID")}
                      </strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Saran Jual Rakyat:
                      </span>{" "}
                      <strong className="text-emerald-600 dark:text-emerald-400">
                        Rp{" "}
                        {rakyatTier?.recommendedPriceIdr.toLocaleString("id-ID")}
                      </strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Royalti 12%:</span>{" "}
                      <strong>
                        Rp {rakyatTier?.authorRoyaltyPerUnitIdr.toLocaleString("id-ID")}
                      </strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        {!isSubmittedSuccess && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/10">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="min-h-11 px-5 text-xs font-semibold cursor-pointer"
            >
              Batal
            </Button>

            <Button
              type="button"
              onClick={handleSubmit}
              disabled={submitMutation.isPending || isExtracting}
              className="bg-[var(--color-accent)] hover:opacity-90 text-white min-h-11 px-6 text-xs font-semibold cursor-pointer inline-flex items-center gap-2"
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Mengirimkan Naskah...</span>
                </>
              ) : (
                <>
                  <span>Ajukan Naskah Buku</span>
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
