import * as React from "react";
import {
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  Coins,
  Globe,
  Layers,
  Printer,
  Send,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import type { DigitalPolicy } from "@starter/shared/types";
import { calculatePrintEconomics } from "@starter/shared/print-economics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useVerifiedPublishers } from "@/features/social/hooks";

export interface ManuscriptConfigData {
  title: string;
  synopsis: string;
  category: string;
  availableLanguages: string[];
  accessTier: "free" | "premium" | "premium_physical";
  digitalPolicy: DigitalPolicy;
  hasPhysicalPrint: boolean;
  targetAudience: string;
  estimatedPages: number;
  isbn?: string;
  publisherId: string;
  authorNotes?: string;
}

interface ManuscriptConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Partial<ManuscriptConfigData>;
  onSubmit: (config: ManuscriptConfigData) => Promise<void>;
  isSubmitting?: boolean;
}

export function ManuscriptConfigDialog({
  isOpen,
  onClose,
  initialData,
  onSubmit,
  isSubmitting = false,
}: ManuscriptConfigDialogProps) {
  const { data: verifiedPublishers = [] } = useVerifiedPublishers();

  const [title, setTitle] = React.useState(initialData?.title || "");
  const [synopsis, setSynopsis] = React.useState(initialData?.synopsis || "");
  const [category, setCategory] = React.useState(
    initialData?.category || "Fiksi Sastra",
  );
  const [hasEnglish, setHasEnglish] = React.useState(
    initialData?.availableLanguages?.includes("en") || false,
  );
  const [accessTier, setAccessTier] = React.useState<
    "free" | "premium" | "premium_physical"
  >(initialData?.accessTier || "premium");
  const [digitalPolicy, setDigitalPolicy] = React.useState<DigitalPolicy>(
    initialData?.digitalPolicy || "hybrid_nakama_alacarte",
  );
  const [hasPhysicalPrint, setHasPhysicalPrint] = React.useState(
    initialData?.hasPhysicalPrint ?? true,
  );
  const [targetAudience, setTargetAudience] = React.useState(
    initialData?.targetAudience || "Semua Umur (General)",
  );
  const [estimatedPages, setEstimatedPages] = React.useState(
    initialData?.estimatedPages || 180,
  );
  const [isbn, setIsbn] = React.useState(initialData?.isbn || "");
  const [publisherId, setPublisherId] = React.useState(
    initialData?.publisherId || "",
  );
  const [authorNotes, setAuthorNotes] = React.useState(
    initialData?.authorNotes || "",
  );

  React.useEffect(() => {
    if (initialData) {
      if (initialData.title) setTitle(initialData.title);
      if (initialData.synopsis) setSynopsis(initialData.synopsis);
      if (initialData.category) setCategory(initialData.category);
      if (initialData.publisherId) setPublisherId(initialData.publisherId);
    }
  }, [initialData]);

  // Set default publisher if available
  React.useEffect(() => {
    if (!publisherId && verifiedPublishers.length > 0) {
      setPublisherId(verifiedPublishers[0].id);
    }
  }, [verifiedPublishers, publisherId]);

  if (!isOpen) {
    return null;
  }

  const printCalc = calculatePrintEconomics({
    pageCount: estimatedPages,
    printRun: 1000,
    authorRoyaltyPct: 12,
  });
  const standardTier = printCalc.tiers.find(
    (t) => t.editionTier === "standard_trade",
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const availableLanguages = ["id"];
    if (hasEnglish) availableLanguages.push("en");

    await onSubmit({
      title: title.trim(),
      synopsis: synopsis.trim(),
      category,
      availableLanguages,
      accessTier,
      digitalPolicy,
      hasPhysicalPrint,
      targetAudience,
      estimatedPages: Number(estimatedPages) || 180,
      isbn: isbn.trim() || undefined,
      publisherId,
      authorNotes: authorNotes.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs text-foreground overflow-y-auto">
      <div className="max-w-2xl w-full rounded-2xl border border-border bg-card p-5 sm:p-7 shadow-2xl space-y-6 my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-border pb-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-foreground">
              <Sparkles className="size-5 text-[var(--color-accent)]" />
              <h3 className="font-serif text-lg sm:text-xl font-bold">
                Konfigurasi Penerbitan Naskah
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Atur hak akses bahasa, lisensi distribusi, dan metadata naskah sebelum diajukan ke mitra penerbit resmi.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="space-y-5 text-xs">
          {/* 1. Target Publisher Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center justify-between">
              <span>Mitra Penerbit Tujuan</span>
              <span className="text-[10px] font-mono text-muted-foreground">
                IKAPI Terverifikasi
              </span>
            </Label>
            <select
              value={publisherId}
              onChange={(e) => setPublisherId(e.target.value)}
              required
              className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-serif text-foreground outline-none focus:border-[var(--color-accent)]"
            >
              {verifiedPublishers.map((pub) => (
                <option key={pub.id} value={pub.id}>
                  {pub.name} — {pub.city || "Nasional"} (IKAPI: {pub.ikapiNumber || "Resmi"})
                </option>
              ))}
              {verifiedPublishers.length === 0 && (
                <option value="" disabled>
                  Belum ada penerbit terverifikasi
                </option>
              )}
            </select>
          </div>

          {/* 2. Metadata: Judul & Kategori */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Judul Naskah</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Judul buku..."
                required
                className="h-10 text-xs font-serif"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Kategori / Genre</Label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs text-foreground outline-none"
              >
                <option value="Fiksi Sastra">Fiksi Sastra &amp; Roman</option>
                <option value="Non-Fiksi Populer">Non-Fiksi &amp; Humaniora</option>
                <option value="Sejarah & Sosial">Sejarah &amp; Ilmu Sosial</option>
                <option value="Pengembangan Diri">Pengembangan Diri (Self-Help)</option>
                <option value="Sains Populer">Sains &amp; Filsafat</option>
                <option value="Puisi & Antologi">Puisi &amp; Antologi</option>
              </select>
            </div>
          </div>

          {/* 3. Bahasa & Target Usia */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl border border-border/80 bg-muted/30">
            {/* Bahasa */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Globe className="size-3.5 text-blue-500" />
                <span>Ketersediaan Bahasa</span>
              </Label>
              <div className="space-y-1.5 text-[11px] font-sans">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked
                    disabled
                    className="rounded text-amber-600 size-3.5"
                  />
                  <span>Bahasa Indonesia (Utama / Wajib)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasEnglish}
                    onChange={(e) => setHasEnglish(e.target.checked)}
                    className="rounded text-amber-600 size-3.5 cursor-pointer"
                  />
                  <span>Tersedia Terjemahan Bahasa Inggris (English Edition)</span>
                </label>
              </div>
            </div>

            {/* Target Pembaca */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Target Pembaca</Label>
              <select
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                className="w-full h-9 px-2.5 rounded-lg border border-border bg-background text-xs text-foreground outline-none"
              >
                <option value="Semua Umur (General)">Semua Umur (General Audience)</option>
                <option value="Remaja 13+ (Young Adult)">Remaja 13+ (Young Adult)</option>
                <option value="Dewasa 18+ (Mature/Academic)">Dewasa 18+ (Mature/Akademik)</option>
              </select>
              <p className="text-[10px] text-muted-foreground">
                Membantu redaksi penerbit menentukan target segmen pasar pembaca.
              </p>
            </div>
          </div>

          {/* 4. Model Akses & Lisensi Distribusi */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              <Layers className="size-3.5 text-amber-500" />
              <span>Model Akses &amp; Lisensi Digital</span>
            </Label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Option: Free Open Access */}
              <div
                onClick={() => {
                  setAccessTier("free");
                  setDigitalPolicy("sample_only");
                }}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  accessTier === "free"
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 font-medium"
                    : "border-border hover:bg-muted/40"
                }`}
              >
                <div className="font-bold text-xs flex items-center justify-between">
                  <span>Akses Terbuka</span>
                  {accessTier === "free" && <Check className="size-3.5 text-[var(--color-accent)]" />}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Gratis untuk seluruh pembaca umum di AnzaBook.
                </p>
              </div>

              {/* Option: Nakama Member Subscription */}
              <div
                onClick={() => {
                  setAccessTier("premium");
                  setDigitalPolicy("hybrid_nakama_alacarte");
                }}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  accessTier === "premium"
                    ? "border-amber-500 bg-amber-500/10 font-medium"
                    : "border-border hover:bg-muted/40"
                }`}
              >
                <div className="font-bold text-xs flex items-center justify-between">
                  <span>Premium Nakama</span>
                  {accessTier === "premium" && <Check className="size-3.5 text-amber-500" />}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Hanya anggota Nakama Member + royalti membaca.
                </p>
              </div>

              {/* Option: Premium + Buku Cetak Fisik */}
              <div
                onClick={() => {
                  setAccessTier("premium_physical");
                  setDigitalPolicy("hybrid_nakama_alacarte");
                  setHasPhysicalPrint(true);
                }}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  accessTier === "premium_physical"
                    ? "border-emerald-500 bg-emerald-500/10 font-medium"
                    : "border-border hover:bg-muted/40"
                }`}
              >
                <div className="font-bold text-xs flex items-center justify-between">
                  <span>Digital + Cetak Fisik</span>
                  {accessTier === "premium_physical" && <Check className="size-3.5 text-emerald-500" />}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Didistribusikan digital dan dicetak fisik IKAPI.
                </p>
              </div>
            </div>
          </div>

          {/* 5. Cetak Fisik & Kalkulasi HPP (Jika dipilih) */}
          {hasPhysicalPrint && (
            <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                  <Printer className="size-3.5" />
                  <span>Simulasi Cetak Fisik (1.000 Eks)</span>
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  HPP Book Paper 72gsm
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px] font-mono text-foreground/90">
                <div>
                  <span className="text-muted-foreground block text-[10px]">Perkiraan Hal:</span>
                  <strong>{estimatedPages} Halaman</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">HPP Cetak/Eks:</span>
                  <strong>Rp {standardTier?.hppPerUnitIdr.toLocaleString("id-ID") || "18.500"}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Royalti Penulis:</span>
                  <strong className="text-emerald-600 dark:text-emerald-400">12% / Buku Terjual</strong>
                </div>
              </div>
            </div>
          )}

          {/* 6. Sinopsis & Catatan Redaksi */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Sinopsis Naskah</Label>
            <Textarea
              value={synopsis}
              onChange={(e) => setSynopsis(e.target.value)}
              placeholder="Tuliskan sinopsis singkat atau intisari naskah Anda..."
              rows={3}
              required
              className="text-xs resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Catatan Pengantar untuk Redaksi Penerbit (Opsional)</Label>
            <Textarea
              value={authorNotes}
              onChange={(e) => setAuthorNotes(e.target.value)}
              placeholder="Pesan khusus untuk editor atau redaksi (misal: gaya penulisan, target pembaca khusus)..."
              rows={2}
              className="text-xs resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-border flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-10 px-4 text-xs font-medium cursor-pointer"
            >
              Batal
            </Button>

            <Button
              type="submit"
              disabled={isSubmitting || !title || !synopsis || !publisherId}
              className="h-10 px-6 text-xs font-bold bg-[var(--color-accent)] hover:opacity-90 text-white shadow-xs cursor-pointer inline-flex items-center gap-1.5"
            >
              <Send className="size-3.5" />
              <span>{isSubmitting ? "Mengajukan..." : "Kirim Naskah ke Penerbit"}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
