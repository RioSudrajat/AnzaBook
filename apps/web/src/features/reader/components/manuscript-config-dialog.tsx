import {
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  Check,
  Globe,
  Layers,
  LoaderCircle,
  MapPin,
  Printer,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import type {
  BookDistributionModel,
  ManuscriptSourceLanguage,
  ManuscriptTargetAudience,
} from "@starter/shared/types";
import { DEFAULT_DIGITAL_BOOK_PRICE_IDR } from "@starter/shared/validators/publisher";
import { calculatePrintEconomics } from "@starter/shared/print-economics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { isOfficialAnzaBookPublisher } from "@/features/publisher/publisher-helpers";
import { useSubmissionTargets } from "@/features/social/hooks";

export interface ManuscriptConfigData {
  title: string;
  synopsis: string;
  category: string;
  sourceLanguage: ManuscriptSourceLanguage;
  availableLanguages: string[];
  accessTier: "free" | "premium" | "premium_physical";
  digitalPolicy: BookDistributionModel;
  proposedDigitalPriceIdr: number | null;
  hasPhysicalPrint: boolean;
  targetAudience: ManuscriptTargetAudience;
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

const DISTRIBUTION_MODELS: ReadonlyArray<{
  policy: BookDistributionModel;
  title: string;
  description: string;
  accessTier: "free" | "premium" | "premium_physical";
  hasPhysical: boolean;
}> = [
  {
    policy: "nakama_or_purchase",
    title: "Nakama & Beli Satuan",
    description:
      "Bisa dibaca anggota Nakama sekaligus tersedia untuk pembelian satuan.",
    accessTier: "premium_physical",
    hasPhysical: true,
  },
  {
    policy: "single_purchase",
    title: "Beli Satuan",
    description:
      "Pembaca membeli akses digital selamanya (tidak masuk paket Nakama).",
    accessTier: "premium",
    hasPhysical: false,
  },
  {
    policy: "nakama_subscription",
    title: "Khusus Anggota Nakama",
    description:
      "Eksklusif bagi pelanggan aktif Nakama dengan sistem bagi hasil.",
    accessTier: "premium",
    hasPhysical: false,
  },
  {
    policy: "print_code_only",
    title: "Eksklusif Pembeli Buku Cetak",
    description: "Akses digital dibuka lewat kode klaim pada buku fisik.",
    accessTier: "premium_physical",
    hasPhysical: true,
  },
  {
    policy: "free_open",
    title: "Gratis Terbuka",
    description: "Gratis dan terbuka untuk seluruh pembaca AnzaBook.",
    accessTier: "free",
    hasPhysical: false,
  },
];

function ManuscriptConfigFormContent({
  onClose,
  initialData,
  onSubmit,
  isSubmitting = false,
}: Omit<ManuscriptConfigDialogProps, "isOpen">) {
  const titleId = useId();
  const headingId = `${titleId}-heading`;

  const [title, setTitle] = useState(initialData?.title || "");
  const [synopsis, setSynopsis] = useState(initialData?.synopsis || "");
  const [category, setCategory] = useState(
    initialData?.category || "Fiksi Sastra",
  );
  const [sourceLanguage, setSourceLanguage] =
    useState<ManuscriptSourceLanguage>(initialData?.sourceLanguage || "id");
  const [hasCompanionEnglish, setHasCompanionEnglish] = useState(
    Boolean(initialData?.availableLanguages?.includes("en")),
  );
  const [digitalPolicy, setDigitalPolicy] = useState<BookDistributionModel>(
    initialData?.digitalPolicy || "nakama_or_purchase",
  );
  const [proposedDigitalPriceIdr, setProposedDigitalPriceIdr] =
    useState<string>(
      initialData?.proposedDigitalPriceIdr != null
        ? String(initialData.proposedDigitalPriceIdr)
        : String(DEFAULT_DIGITAL_BOOK_PRICE_IDR),
    );
  const [hasPhysicalPrint, setHasPhysicalPrint] = useState(
    initialData?.hasPhysicalPrint ??
      (digitalPolicy === "print_code_only" ||
        digitalPolicy === "nakama_or_purchase"),
  );
  const [targetAudience, setTargetAudience] =
    useState<ManuscriptTargetAudience>(
      initialData?.targetAudience || "general",
    );
  const [estimatedPages, setEstimatedPages] = useState<number>(
    initialData?.estimatedPages || 180,
  );
  const [isbn, setIsbn] = useState(initialData?.isbn || "");
  const [publisherId, setPublisherId] = useState(
    initialData?.publisherId || "",
  );
  const [authorNotes, setAuthorNotes] = useState(
    initialData?.authorNotes || "",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [useTopicRanking, setUseTopicRanking] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  const deferredSearch = useDeferredValue(searchQuery.trim());
  const {
    data: submissionTargets = [],
    isLoading: isTargetsLoading,
    isError: isTargetsError,
  } = useSubmissionTargets(
    {
      q: deferredSearch || undefined,
      topic: useTopicRanking ? category : undefined,
      limit: 50,
    },
    true,
  );

  const selectedPublisherId = useMemo(() => {
    if (
      publisherId &&
      submissionTargets.some((target) => target.id === publisherId)
    ) {
      return publisherId;
    }
    if (publisherId && isTargetsLoading) return publisherId;
    return submissionTargets[0]?.id || publisherId || "";
  }, [publisherId, submissionTargets, isTargetsLoading]);

  const printCalc = calculatePrintEconomics({
    pageCount: estimatedPages,
    printRun: 1000,
    authorRoyaltyPct: 12,
  });
  const standardTier = printCalc.tiers.find(
    (t) => t.editionTier === "standard_trade",
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (title.trim().length < 2) {
      setValidationError("Judul naskah minimal 2 karakter.");
      return;
    }
    if (!selectedPublisherId) {
      setValidationError(
        "Pilih mitra penerbit tujuan yang terverifikasi terlebih dahulu.",
      );
      return;
    }
    if (synopsis.trim().length < 10) {
      setValidationError(
        "Sinopsis naskah minimal 10 karakter agar editor redaksi dapat meninjaunya.",
      );
      return;
    }

    const availableLanguages =
      sourceLanguage === "en"
        ? ["en", "id"]
        : hasCompanionEnglish
          ? ["id", "en"]
          : ["id"];

    const requiresPrice =
      digitalPolicy === "single_purchase" ||
      digitalPolicy === "nakama_or_purchase";
    const parsedPrice = requiresPrice
      ? Number.parseInt(proposedDigitalPriceIdr.trim(), 10)
      : null;

    if (
      requiresPrice &&
      (Number.isNaN(parsedPrice ?? Number.NaN) ||
        (parsedPrice ?? 0) < 0 ||
        (parsedPrice ?? 0) > 10_000_000)
    ) {
      setValidationError(
        "Usulan harga beli satuan harus antara Rp0 - Rp10.000.000.",
      );
      return;
    }

    const selectedModel =
      DISTRIBUTION_MODELS.find((m) => m.policy === digitalPolicy) ??
      DISTRIBUTION_MODELS[0];

    try {
      await onSubmit({
        title: title.trim(),
        synopsis: synopsis.trim(),
        category,
        sourceLanguage,
        availableLanguages,
        accessTier: selectedModel.accessTier,
        digitalPolicy,
        proposedDigitalPriceIdr: parsedPrice,
        hasPhysicalPrint,
        targetAudience,
        estimatedPages: Math.min(
          3000,
          Math.max(1, Number(estimatedPages) || 180),
        ),
        isbn: isbn.trim() || undefined,
        publisherId: selectedPublisherId,
        authorNotes: authorNotes.trim() || undefined,
      });
    } catch (error) {
      setValidationError(
        error instanceof Error
          ? error.message
          : "Gagal mengajukan naskah ke penerbit.",
      );
    }
  };

  return (
    <div className="p-5 sm:p-7 space-y-6 text-[var(--color-ink)]">
      {/* Dialog Header */}
      <div className="flex items-start justify-between gap-4 border-b border-[var(--color-rule)] pb-4">
        <div className="space-y-1">
          <h1
            id={headingId}
            className="font-serif text-lg sm:text-xl font-bold flex items-center gap-2"
          >
            <Sparkles
              className="size-5 text-[var(--color-accent)] shrink-0"
              aria-hidden="true"
            />
            <span>Konfigurasi &amp; Pengajuan Naskah</span>
          </h1>
          <p className="text-xs text-[var(--color-muted)] leading-relaxed">
            Cari penerbit berdasarkan fokus topik kurasi, lengkapi metadata, dan
            ajukan draf Anda ke redaksi resmi.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup dialog pengajuan naskah"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-[var(--color-muted)] hover:bg-[var(--color-paper-3)] hover:text-[var(--color-ink)] cursor-pointer shrink-0"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>

      {validationError && (
        <div
          role="alert"
          className="rounded-xl border border-[var(--color-error)]/40 bg-[var(--color-error-soft)] p-3.5 text-xs text-[var(--color-ink)]"
        >
          {validationError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 text-xs" noValidate>
        {/* 1. Metadata: Judul & Kategori */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="ms-config-title" className="text-xs font-semibold">
              Judul Naskah
            </Label>
            <Input
              id="ms-config-title"
              name="title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (validationError) setValidationError(null);
              }}
              placeholder="Judul buku..."
              required
              autoFocus
              className="min-h-11 text-xs font-serif bg-[var(--color-paper)]"
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="ms-config-category"
              className="text-xs font-semibold"
            >
              Kategori / Genre Utama
            </Label>
            <select
              id="ms-config-category"
              name="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-11 px-3 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] text-xs text-[var(--color-ink)]"
            >
              <option value="Fiksi Sastra">Fiksi Sastra &amp; Roman</option>
              <option value="Filsafat & Pemikiran">
                Filsafat &amp; Pemikiran
              </option>
              <option value="Sejarah & Arsip">Sejarah &amp; Arsip</option>
              <option value="Sosial Politik">Sosial Politik</option>
              <option value="Sains Populer">Sains Populer</option>
              <option value="Puisi & Prosa">Puisi &amp; Prosa</option>
              <option value="Esai Kritis">Esai Kritis</option>
            </select>
          </div>
        </div>

        {/* 2. Searchable Topic-Ranked Publisher Picker (Path 2) */}
        <fieldset className="space-y-3 rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] p-4">
          <legend className="px-1 text-xs font-semibold text-[var(--color-ink)]">
            Mitra Penerbit Tujuan (Terverifikasi IKAPI)
          </legend>

          <search className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="relative flex-1">
              <Label htmlFor="publisher-target-search" className="sr-only">
                Cari nama penerbit, kota, atau topik kurasi
              </Label>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--color-muted)]"
                aria-hidden="true"
              />
              <Input
                id="publisher-target-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari penerbit atau topik (misal: sastra, sejarah, jogja)..."
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                className="min-h-11 pl-9 text-xs bg-[var(--color-paper-2)]"
              />
            </div>

            <button
              type="button"
              aria-pressed={useTopicRanking}
              onClick={() => setUseTopicRanking((prev) => !prev)}
              className={`min-h-11 shrink-0 rounded-lg border px-3 text-[11px] font-medium cursor-pointer transition-colors ${
                useTopicRanking
                  ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-ink)] font-semibold"
                  : "border-[var(--color-rule)] bg-[var(--color-paper-2)] text-[var(--color-muted)] hover:text-[var(--color-ink)]"
              }`}
            >
              Cocokkan Topik: {category}
            </button>
          </search>

          {isTargetsLoading ? (
            <div className="flex min-h-28 items-center justify-center">
              <LoaderCircle
                className="size-5 animate-spin text-[var(--color-muted)]"
                aria-hidden="true"
              />
            </div>
          ) : isTargetsError ? (
            <p
              role="alert"
              className="rounded-lg border border-[var(--color-error)]/40 bg-[var(--color-error-soft)] p-3 text-xs"
            >
              Gagal memuat daftar mitra penerbit. Coba muat ulang dialog ini.
            </p>
          ) : submissionTargets.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[var(--color-rule)] p-5 text-center space-y-2 text-[var(--color-muted)]">
              <p>Tidak ada penerbit aktif yang cocok dengan pencarian ini.</p>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="min-h-9 px-3 rounded-lg border border-[var(--color-rule)] text-xs font-medium text-[var(--color-ink)] hover:bg-[var(--color-paper-3)] cursor-pointer"
                >
                  Reset Pencarian
                </button>
              )}
            </div>
          ) : (
            <div
              role="radiogroup"
              aria-label="Daftar pilihan mitra penerbit"
              className="max-h-60 overflow-y-auto space-y-2 pr-1"
            >
              {submissionTargets.map((pub) => {
                const isSelected = pub.id === selectedPublisherId;
                const isOfficial = isOfficialAnzaBookPublisher(pub);
                const matchedSet = new Set(
                  (pub.matchedTopics ?? []).map((t) => t.toLowerCase()),
                );
                const allTopics = pub.topics ?? [];

                return (
                  <button
                    key={pub.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => {
                      setPublisherId(pub.id);
                      if (validationError) setValidationError(null);
                    }}
                    className={`w-full min-h-11 text-left rounded-xl border p-3.5 transition-colors cursor-pointer flex items-start justify-between gap-3 ${
                      isSelected
                        ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]/70"
                        : "border-[var(--color-rule)] bg-[var(--color-paper-2)] hover:bg-[var(--color-paper-3)]"
                    }`}
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-serif text-sm font-bold text-[var(--color-ink)]">
                          {pub.name}
                        </span>
                        {isOfficial && (
                          <span className="inline-flex items-center gap-1 rounded-md border border-[var(--color-accent)]/50 bg-[var(--color-accent-soft)] px-2 py-0.5 font-mono text-[10px] font-semibold text-[var(--color-ink)]">
                            <ShieldCheck
                              className="size-3"
                              aria-hidden="true"
                            />
                            Penerbit Resmi AnzaBook
                          </span>
                        )}
                        {pub.city && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[var(--color-muted)]">
                            <MapPin className="size-3" aria-hidden="true" />
                            {pub.city}
                          </span>
                        )}
                      </div>

                      {allTopics.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {allTopics.slice(0, 5).map((topic) => {
                            const isMatched = matchedSet.has(
                              topic.toLowerCase(),
                            );
                            return (
                              <span
                                key={topic}
                                className={`rounded px-2 py-0.5 text-[10px] font-medium border ${
                                  isMatched
                                    ? "border-[var(--color-accent)] bg-[var(--color-paper-2)] font-semibold text-[var(--color-ink)]"
                                    : "border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-muted)]"
                                }`}
                              >
                                {topic}
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {pub.submissionGuidelines && (
                        <p className="text-[11px] text-[var(--color-muted)] line-clamp-1">
                          {pub.submissionGuidelines}
                        </p>
                      )}
                    </div>

                    <span
                      aria-hidden="true"
                      className={`mt-1 flex size-5 shrink-0 items-center justify-center rounded-full border ${
                        isSelected
                          ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-ink)]"
                          : "border-[var(--color-rule)] bg-[var(--color-paper)]"
                      }`}
                    >
                      {isSelected && <Check className="size-3" />}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </fieldset>

        {/* 3. Bahasa, Target Pembaca & Data Fisik */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] p-3.5">
          <div className="space-y-1.5">
            <Label
              htmlFor="ms-config-language"
              className="text-xs font-semibold flex items-center gap-1.5"
            >
              <Globe
                className="size-3.5 text-[var(--color-ink-2)]"
                aria-hidden="true"
              />
              <span>Bahasa Utama Naskah</span>
            </Label>
            <select
              id="ms-config-language"
              name="sourceLanguage"
              value={sourceLanguage}
              onChange={(e) =>
                setSourceLanguage(e.target.value as ManuscriptSourceLanguage)
              }
              className="w-full h-11 px-3 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper-2)] text-xs text-[var(--color-ink)]"
            >
              <option value="id">Bahasa Indonesia</option>
              <option value="en">Bahasa Inggris</option>
            </select>
            <label className="flex items-center gap-2 pt-1 text-[11px] text-[var(--color-ink-2)] cursor-pointer">
              <input
                type="checkbox"
                checked={hasCompanionEnglish}
                onChange={(e) => setHasCompanionEnglish(e.target.checked)}
                className="size-4 accent-[var(--color-accent)]"
              />
              <span>Sertakan dukungan dwibahasa (ID &amp; EN)</span>
            </label>
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="ms-config-audience"
              className="text-xs font-semibold"
            >
              Target Pembaca
            </Label>
            <select
              id="ms-config-audience"
              name="targetAudience"
              value={targetAudience}
              onChange={(e) =>
                setTargetAudience(e.target.value as ManuscriptTargetAudience)
              }
              className="w-full h-11 px-3 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper-2)] text-xs text-[var(--color-ink)]"
            >
              <option value="general">Umum (Semua Kalangan)</option>
              <option value="young_adult">Remaja (13+)</option>
              <option value="mature_academic">Dewasa &amp; Akademik</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ms-config-pages" className="text-xs font-semibold">
              Perkiraan Jumlah Halaman
            </Label>
            <Input
              id="ms-config-pages"
              name="estimatedPages"
              type="number"
              min={1}
              max={3000}
              value={estimatedPages}
              onChange={(e) =>
                setEstimatedPages(Number.parseInt(e.target.value || "180", 10))
              }
              className="min-h-11 text-xs bg-[var(--color-paper-2)]"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ms-config-isbn" className="text-xs font-semibold">
              ISBN (Opsional)
            </Label>
            <Input
              id="ms-config-isbn"
              name="isbn"
              value={isbn}
              onChange={(e) => setIsbn(e.target.value)}
              placeholder="Contoh: 978-602-..."
              className="min-h-11 text-xs font-mono bg-[var(--color-paper-2)]"
            />
          </div>
        </div>

        {/* 4. Model Distribusi & Harga */}
        <fieldset className="space-y-2.5">
          <legend className="text-xs font-semibold flex items-center gap-1.5 pb-1">
            <Layers
              className="size-3.5 text-[var(--color-accent)]"
              aria-hidden="true"
            />
            <span>Model Distribusi Buku</span>
          </legend>

          <div
            role="radiogroup"
            aria-label="Model distribusi buku"
            className="grid grid-cols-1 sm:grid-cols-2 gap-2.5"
          >
            {DISTRIBUTION_MODELS.map((model) => {
              const isSelected = digitalPolicy === model.policy;
              return (
                <button
                  key={model.policy}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => {
                    setDigitalPolicy(model.policy);
                    setHasPhysicalPrint(model.hasPhysical);
                  }}
                  className={`min-h-11 text-left p-3 rounded-xl border transition-colors cursor-pointer ${
                    isSelected
                      ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
                      : "border-[var(--color-rule)] bg-[var(--color-paper)] hover:bg-[var(--color-paper-3)]"
                  }`}
                >
                  <div className="font-bold text-xs flex items-center justify-between gap-2">
                    <span>{model.title}</span>
                    {isSelected && (
                      <Check
                        className="size-3.5 text-[var(--color-ink)] shrink-0"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                  <p className="text-[11px] text-[var(--color-muted)] mt-1 leading-relaxed">
                    {model.description}
                  </p>
                </button>
              );
            })}
          </div>

          {(digitalPolicy === "single_purchase" ||
            digitalPolicy === "nakama_or_purchase") && (
            <div className="pt-2 space-y-1.5">
              <Label
                htmlFor="ms-config-price"
                className="text-xs font-semibold"
              >
                Usulan Harga Beli Satuan Digital (IDR)
              </Label>
              <Input
                id="ms-config-price"
                name="proposedDigitalPriceIdr"
                type="number"
                min={0}
                max={10000000}
                step={1000}
                value={proposedDigitalPriceIdr}
                onChange={(e) => setProposedDigitalPriceIdr(e.target.value)}
                className="min-h-11 text-xs font-mono bg-[var(--color-paper)]"
              />
            </div>
          )}
        </fieldset>

        {/* 5. Cetak Fisik */}
        {hasPhysicalPrint && (
          <div className="p-3.5 rounded-xl border border-[var(--color-green)]/40 bg-[var(--color-green-soft)] space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-xs flex items-center gap-1.5">
                <Printer className="size-3.5" aria-hidden="true" />
                <span>Simulasi Cetak Fisik (1.000 Eks)</span>
              </span>
              <span className="text-[11px] font-mono text-[var(--color-ink-2)]">
                Book Paper 72gsm
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
              <div>
                <span className="text-[var(--color-ink-2)] block text-[10px]">
                  Perkiraan Hal:
                </span>
                <strong>{estimatedPages} hal</strong>
              </div>
              <div>
                <span className="text-[var(--color-ink-2)] block text-[10px]">
                  HPP / Eks:
                </span>
                <strong>
                  Rp{" "}
                  {standardTier?.hppPerUnitIdr.toLocaleString("id-ID") ||
                    "18.500"}
                </strong>
              </div>
              <div>
                <span className="text-[var(--color-ink-2)] block text-[10px]">
                  Royalti Penulis:
                </span>
                <strong>12% / terjual</strong>
              </div>
            </div>
          </div>
        )}

        {/* 6. Sinopsis & Catatan */}
        <div className="space-y-1.5">
          <Label htmlFor="ms-config-synopsis" className="text-xs font-semibold">
            Sinopsis Naskah (minimal 10 karakter)
          </Label>
          <Textarea
            id="ms-config-synopsis"
            name="synopsis"
            value={synopsis}
            onChange={(e) => {
              setSynopsis(e.target.value);
              if (validationError) setValidationError(null);
            }}
            placeholder="Tuliskan sinopsis singkat atau intisari naskah Anda..."
            rows={3}
            required
            className="text-xs bg-[var(--color-paper)]"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ms-config-notes" className="text-xs font-semibold">
            Catatan Pengantar untuk Redaksi (Opsional)
          </Label>
          <Textarea
            id="ms-config-notes"
            name="authorNotes"
            value={authorNotes}
            onChange={(e) => setAuthorNotes(e.target.value)}
            placeholder="Pesan khusus untuk editor penerbit..."
            rows={2}
            className="text-xs bg-[var(--color-paper)]"
          />
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-[var(--color-rule)] flex flex-wrap items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="min-h-11 px-4 text-xs font-medium cursor-pointer"
          >
            Batal
          </Button>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="min-h-11 px-6 text-xs font-semibold bg-[var(--color-accent)] hover:brightness-95 text-[var(--color-accent-ink)] cursor-pointer inline-flex items-center gap-1.5"
          >
            <Send className="size-3.5" aria-hidden="true" />
            <span>
              {isSubmitting ? "Mengajukan..." : "Kirim Naskah ke Penerbit"}
            </span>
          </Button>
        </div>
      </form>
    </div>
  );
}

export function ManuscriptConfigDialog({
  isOpen,
  onClose,
  initialData,
  onSubmit,
  isSubmitting = false,
}: ManuscriptConfigDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (isOpen && !el.open) {
      el.showModal();
    } else if (!isOpen && el.open) {
      el.close();
    }
  }, [isOpen]);

  const handleClose = () => {
    if (dialogRef.current) {
      dialogRef.current.returnValue = "";
    }
    if (isOpen) onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      aria-label="Konfigurasi dan Pengajuan Naskah"
      onClose={handleClose}
      className="m-auto w-[min(95vw,44rem)] max-h-[90vh] overflow-y-auto overscroll-contain rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-0 shadow-2xl backdrop:bg-black/65 backdrop:overflow-hidden backdrop:overscroll-contain"
    >
      {isOpen && (
        <ManuscriptConfigFormContent
          key={`${initialData?.publisherId ?? ""}-${initialData?.title ?? ""}`}
          onClose={onClose}
          initialData={initialData}
          onSubmit={onSubmit}
          isSubmitting={isSubmitting}
        />
      )}
    </dialog>
  );
}
