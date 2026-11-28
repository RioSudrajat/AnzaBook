import { useDeferredValue, useMemo, useState, type FormEvent } from "react";
import {
  AlertCircle,
  Check,
  Globe,
  Layers,
  LoaderCircle,
  MapPin,
  PenTool,
  Search,
  Send,
  ShieldCheck,
} from "lucide-react";
import { StudioDrawer } from "@/components/profile/studio-drawer";
import type {
  BookDistributionModel,
  ManuscriptSourceLanguage,
  ManuscriptTargetAudience,
} from "@starter/shared/types";
import { DEFAULT_DIGITAL_BOOK_PRICE_IDR } from "@starter/shared/validators/publisher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BookCover } from "@/features/books/components/book-cover";
import { ManuscriptCoverPlaceholder } from "@/features/books/components/manuscript-cover-placeholder";
import { isOfficialAnzaBookPublisher } from "@/features/publisher/publisher-helpers";
import { useSubmissionTargets } from "@/features/social/hooks";
import { isUsableAssetUrl } from "@/lib/media-url";

export interface ManuscriptConfigData {
  title: string;
  synopsis: string;
  authorName?: string;
  coverUrl?: string | null;
  coverColor?: string | null;
  chapterCount?: number;
  hasBodyContent?: boolean;
  category: string;
  sourceLanguage: ManuscriptSourceLanguage;
  availableLanguages: string[];
  accessTier: "free" | "premium";
  digitalPolicy: BookDistributionModel;
  proposedDigitalPriceIdr: number | null;
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
  accessTier: "free" | "premium";
}> = [
  {
    policy: "nakama_subscription",
    title: "Langganan Nakama",
    description:
      "Eksklusif bagi anggota Nakama dengan pembagian royalti berbasis baca.",
    accessTier: "premium",
  },
  {
    policy: "single_purchase",
    title: "Beli Satuan Digital",
    description:
      "Pembaca membeli akses digital permanen dengan harga satuan (IDR).",
    accessTier: "premium",
  },
  {
    policy: "free_open",
    title: "Gratis Terbuka",
    description: "Gratis dan terbuka untuk seluruh pembaca AnzaBook.",
    accessTier: "free",
  },
];

function ManuscriptConfigFormContent({
  onClose,
  initialData,
  onSubmit,
  isSubmitting = false,
}: Omit<ManuscriptConfigDialogProps, "isOpen">) {
  const title = initialData?.title || "";
  const synopsis = initialData?.synopsis || "";
  const authorName = initialData?.authorName || "Penulis AnzaBook";
  const coverUrl = initialData?.coverUrl ?? null;
  const coverColor = initialData?.coverColor || "#181614";
  const chapterCount = initialData?.chapterCount ?? 1;
  const hasBodyContent = Boolean(initialData?.hasBodyContent);

  const [category, setCategory] = useState(
    initialData?.category || "Fiksi Sastra",
  );
  const [sourceLanguage, setSourceLanguage] =
    useState<ManuscriptSourceLanguage>(initialData?.sourceLanguage || "id");
  const [hasCompanionEnglish, setHasCompanionEnglish] = useState(
    Boolean(initialData?.availableLanguages?.includes("en")),
  );
  const [digitalPolicy, setDigitalPolicy] = useState<BookDistributionModel>(
    initialData?.digitalPolicy || "nakama_subscription",
  );
  const [proposedDigitalPriceIdr, setProposedDigitalPriceIdr] =
    useState<string>(
      initialData?.proposedDigitalPriceIdr != null
        ? String(initialData.proposedDigitalPriceIdr)
        : String(DEFAULT_DIGITAL_BOOK_PRICE_IDR),
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

  const readinessItems = [
    {
      label: "Judul naskah terisi (minimal 2 karakter)",
      ready: title.trim().length >= 2,
    },
    {
      label: "Sinopsis terisi (minimal 10 karakter)",
      ready: synopsis.trim().length >= 10,
    },
    {
      label: "Isi chapter naskah sudah ditulis",
      ready: hasBodyContent,
    },
  ];
  const isManuscriptReady = readinessItems.every((item) => item.ready);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!isManuscriptReady) {
      setValidationError(
        "Lengkapi judul, sinopsis, dan isi chapter di Editor sebelum mengajukan naskah.",
      );
      return;
    }
    if (!selectedPublisherId) {
      setValidationError(
        "Pilih mitra penerbit tujuan yang terverifikasi terlebih dahulu.",
      );
      return;
    }

    const availableLanguages =
      sourceLanguage === "en"
        ? ["en", "id"]
        : hasCompanionEnglish
          ? ["id", "en"]
          : ["id"];

    const requiresPrice = digitalPolicy === "single_purchase";
    const parsedPrice = requiresPrice
      ? Number.parseInt(proposedDigitalPriceIdr.trim(), 10)
      : null;

    if (
      requiresPrice &&
      (Number.isNaN(parsedPrice ?? Number.NaN) ||
        (parsedPrice ?? 0) <= 0 ||
        (parsedPrice ?? 0) > 10_000_000)
    ) {
      setValidationError(
        "Usulan harga beli satuan harus antara Rp1 hingga Rp10.000.000.",
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

  const selectedTarget = useMemo(
    () =>
      submissionTargets.find((target) => target.id === selectedPublisherId) ??
      null,
    [submissionTargets, selectedPublisherId],
  );

  const selectedModel =
    DISTRIBUTION_MODELS.find((m) => m.policy === digitalPolicy) ??
    DISTRIBUTION_MODELS[0];

  const hasCover = isUsableAssetUrl(coverUrl) || coverUrl === "template";
  const isDirty =
    category !== (initialData?.category || "Fiksi Sastra") ||
    sourceLanguage !== (initialData?.sourceLanguage || "id") ||
    digitalPolicy !== (initialData?.digitalPolicy || "nakama_subscription") ||
    authorNotes !== (initialData?.authorNotes || "") ||
    isbn !== (initialData?.isbn || "");

  return (
    <StudioDrawer
      isOpen
      onClose={onClose}
      title="Konfigurasi & Pengajuan Naskah"
      subtitle="Periksa pratinjau buku dari Editor, pilih penerbit tujuan, dan tentukan model distribusi digital."
      titleId="ms-config-drawer-title"
      widthClass="max-w-2xl"
      isDirty={isDirty}
    >
      <div className="space-y-5 text-[var(--color-ink)]">
        {/* Top Section: Read-Only Book Card Preview + Readiness Checklist */}
        <section
          aria-label="Pratinjau dan kesiapan naskah"
          className="rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper)] p-4 space-y-4"
        >
          <div className="flex items-start gap-4">
            <div className="w-20 shrink-0 aspect-[2/3]">
              {hasCover ? (
                <BookCover
                  book={{
                    title: title.trim() || "Naskah Tanpa Judul",
                    author: authorName,
                    coverUrl,
                    coverColor,
                    genres: [category],
                    pageCount: estimatedPages,
                  }}
                  className="w-full h-full aspect-[2/3]"
                  decorative
                />
              ) : (
                <ManuscriptCoverPlaceholder
                  title={title}
                  compact
                  className="size-full"
                />
              )}
            </div>

            <div className="min-w-0 flex-1 space-y-1.5">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-muted)]">
                Pratinjau Kartu Buku (Dari Editor)
              </p>
              <h2 className="font-serif text-base font-bold text-[var(--color-ink)] break-words">
                {title.trim() || (
                  <span className="italic font-normal text-[var(--color-muted)]">
                    Naskah Tanpa Judul
                  </span>
                )}
              </h2>
              <p className="font-mono text-[11px] text-[var(--color-muted)]">
                {authorName} &bull; {chapterCount} chapter &bull;{" "}
                {selectedTarget ? selectedTarget.name : "Pilih penerbit"} —{" "}
                {selectedModel.title}
              </p>
              <p className="text-xs leading-relaxed text-[var(--color-ink-2)] line-clamp-3">
                {synopsis.trim() || (
                  <span className="italic text-[var(--color-muted)]">
                    Sinopsis belum diisi di Editor.
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Checklist Kesiapan Naskah */}
          <div className="border-t border-[var(--color-rule)] pt-3 space-y-2.5">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-muted)]">
              Checklist Kesiapan Naskah
            </p>
            <ul className="space-y-1.5 text-xs">
              {readinessItems.map((item) => (
                <li key={item.label} className="flex items-center gap-2">
                  <span
                    className={`inline-flex size-4 shrink-0 items-center justify-center rounded-full border ${
                      item.ready
                        ? "border-[var(--color-green)] bg-[var(--color-green-soft)] text-[var(--color-green)]"
                        : "border-[var(--color-error)]/50 bg-[var(--color-error-soft)] text-[var(--color-error)]"
                    }`}
                  >
                    {item.ready ? (
                      <Check className="size-2.5" aria-hidden="true" />
                    ) : (
                      <AlertCircle className="size-2.5" aria-hidden="true" />
                    )}
                  </span>
                  <span
                    className={
                      item.ready
                        ? "text-[var(--color-ink)]"
                        : "text-[var(--color-ink-2)] font-medium"
                    }
                  >
                    {item.label}
                  </span>
                </li>
              ))}
            </ul>

            {!isManuscriptReady && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--color-accent)]/40 bg-[var(--color-accent-soft)] px-3.5 py-2.5 text-xs">
                <span className="text-[var(--color-ink)]">
                  Judul, sinopsis, dan isi chapter hanya disunting di Editor.
                </span>
                <Button
                  type="button"
                  onClick={onClose}
                  className="min-h-10 px-3.5 text-xs font-semibold bg-[var(--color-ink)] text-[var(--color-paper)] hover:opacity-90 cursor-pointer inline-flex items-center gap-1.5"
                >
                  <PenTool className="size-3.5" aria-hidden="true" />
                  <span>Lengkapi di Editor</span>
                </Button>
              </div>
            )}
          </div>
        </section>

        {validationError && (
          <div
            role="alert"
            className="rounded-xl border border-[var(--color-error)]/40 bg-[var(--color-error-soft)] p-3.5 text-xs text-[var(--color-ink)]"
          >
            {validationError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 text-xs" noValidate>
          {/* 1. Kategori */}
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

          {/* 2. Searchable Topic-Ranked Publisher Picker */}
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
                  const visibleTopics = allTopics.slice(0, 3);
                  const remainingTopicsCount = Math.max(
                    0,
                    allTopics.length - 3,
                  );

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

                        {visibleTopics.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {visibleTopics.map((topic) => {
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
                            {remainingTopicsCount > 0 && (
                              <span className="rounded px-2 py-0.5 text-[10px] font-mono border border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-muted)]">
                                +{remainingTopicsCount}
                              </span>
                            )}
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

          {/* 3. Model Distribusi & Harga (3 Digital Models) */}
          <fieldset className="space-y-2.5">
            <legend className="text-xs font-semibold flex items-center gap-1.5 pb-1">
              <Layers
                className="size-3.5 text-[var(--color-accent)]"
                aria-hidden="true"
              />
              <span>Model Distribusi Digital</span>
            </legend>

            <div
              role="radiogroup"
              aria-label="Model distribusi buku"
              className="grid grid-cols-1 sm:grid-cols-3 gap-2.5"
            >
              {DISTRIBUTION_MODELS.map((model) => {
                const isSelected = digitalPolicy === model.policy;
                return (
                  <button
                    key={model.policy}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setDigitalPolicy(model.policy)}
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

            {digitalPolicy === "single_purchase" && (
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
                  type="text"
                  inputMode="numeric"
                  value={proposedDigitalPriceIdr}
                  onChange={(e) =>
                    setProposedDigitalPriceIdr(
                      e.target.value.replace(/[^0-9]/g, ""),
                    )
                  }
                  placeholder="45000"
                  className="min-h-11 text-xs font-mono bg-[var(--color-paper)]"
                />
              </div>
            )}
          </fieldset>

          {/* 4. Pengaturan Lanjutan */}
          <details className="editorial-disclosure rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] p-3.5 text-xs">
            <summary className="cursor-pointer font-semibold text-[var(--color-ink)] select-none py-1">
              Pengaturan Lanjutan (Bahasa, Target Pembaca, Halaman, ISBN &amp;
              Catatan)
            </summary>
            <div className="mt-3 space-y-4 border-t border-[var(--color-rule)] pt-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      setSourceLanguage(
                        e.target.value as ManuscriptSourceLanguage,
                      )
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
                      setTargetAudience(
                        e.target.value as ManuscriptTargetAudience,
                      )
                    }
                    className="w-full h-11 px-3 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper-2)] text-xs text-[var(--color-ink)]"
                  >
                    <option value="general">Umum (Semua Kalangan)</option>
                    <option value="young_adult">Remaja (13+)</option>
                    <option value="mature_academic">
                      Dewasa &amp; Akademik
                    </option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="ms-config-pages"
                    className="text-xs font-semibold"
                  >
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
                      setEstimatedPages(
                        Number.parseInt(e.target.value || "180", 10),
                      )
                    }
                    className="min-h-11 text-xs bg-[var(--color-paper-2)]"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="ms-config-isbn"
                    className="text-xs font-semibold"
                  >
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

              <div className="space-y-1.5">
                <Label
                  htmlFor="ms-config-notes"
                  className="text-xs font-semibold"
                >
                  Catatan Pengantar untuk Redaksi (Opsional)
                </Label>
                <Textarea
                  id="ms-config-notes"
                  name="authorNotes"
                  value={authorNotes}
                  onChange={(e) => setAuthorNotes(e.target.value)}
                  placeholder="Pesan khusus untuk editor penerbit..."
                  rows={2}
                  className="text-xs bg-[var(--color-paper-2)]"
                />
              </div>
            </div>
          </details>

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
              disabled={!isManuscriptReady || isSubmitting}
              className="min-h-11 px-6 text-xs font-semibold bg-[var(--color-accent)] hover:brightness-95 text-[var(--color-accent-ink)] cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <Send className="size-3.5" aria-hidden="true" />
              <span>
                {isSubmitting ? "Mengajukan..." : "Kirim Naskah ke Penerbit"}
              </span>
            </Button>
          </div>
        </form>
      </div>
    </StudioDrawer>
  );
}

export function ManuscriptConfigDialog({
  isOpen,
  onClose,
  initialData,
  onSubmit,
  isSubmitting = false,
}: ManuscriptConfigDialogProps) {
  if (!isOpen) return null;
  return (
    <ManuscriptConfigFormContent
      key={`${initialData?.publisherId ?? ""}-${initialData?.title ?? ""}`}
      onClose={onClose}
      initialData={initialData}
      onSubmit={onSubmit}
      isSubmitting={isSubmitting}
    />
  );
}
