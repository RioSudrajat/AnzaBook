import { useRef, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { Check, CheckCircle2, Upload } from "lucide-react";
import type {
  BookDistributionModel,
  ManuscriptSubmissionDto,
  PublishManuscriptResultDto,
} from "@starter/shared/types";
import { DEFAULT_DIGITAL_BOOK_PRICE_IDR } from "@starter/shared/validators/publisher";
import { StudioDrawer } from "@/components/profile/studio-drawer";
import { BookCover } from "@/features/books/components/book-cover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  usePublishPublisherManuscript,
  useUploadMediaImage,
} from "@/features/social/hooks";
import { ApiError } from "@/lib/api/client";
import { formatDigitalPolicy } from "@/lib/formatters";

export interface PublishManuscriptDialogProps {
  isOpen: boolean;
  onClose: () => void;
  publisherSlug: string;
  publisherName?: string | null;
  manuscript: ManuscriptSubmissionDto;
  initialTitle?: string;
  initialSynopsis?: string;
  initialCoverUrl?: string | null;
  initialCoverColor?: string | null;
  onPublished?: (result: PublishManuscriptResultDto) => void;
}

const DISTRIBUTION_MODELS: BookDistributionModel[] = [
  "nakama_or_purchase",
  "nakama_subscription",
  "single_purchase",
  "print_code_only",
  "free_open",
];

function PublishDialogFormContent({
  onClose,
  publisherSlug,
  publisherName,
  manuscript,
  initialTitle,
  initialSynopsis,
  initialCoverUrl,
  initialCoverColor,
  onPublished,
}: Omit<PublishManuscriptDialogProps, "isOpen">) {
  const publishMutation = usePublishPublisherManuscript();
  const uploadMutation = useUploadMediaImage();
  const coverFileInputRef = useRef<HTMLInputElement>(null);

  const [titleOverride, setTitleOverride] = useState(
    initialTitle?.trim() || manuscript.title,
  );
  const [synopsisOverride, setSynopsisOverride] = useState(
    initialSynopsis?.trim() || manuscript.synopsis || "",
  );
  const [authorOverride, setAuthorOverride] = useState(
    manuscript.authorPenName || manuscript.authorName || "",
  );
  const [coverUrl, setCoverUrl] = useState(() => {
    const candidate = initialCoverUrl ?? manuscript.coverUrl ?? "";
    return candidate === "template" ? "" : candidate;
  });
  const [coverColor, setCoverColor] = useState(
    initialCoverColor || manuscript.coverColor || "#3D2B1F",
  );
  const [digitalPolicy, setDigitalPolicy] = useState<BookDistributionModel>(
    manuscript.proposedDigitalPolicy || "nakama_or_purchase",
  );
  const [digitalPriceIdr, setDigitalPriceIdr] = useState(() => {
    const policy = manuscript.proposedDigitalPolicy || "nakama_or_purchase";
    if (manuscript.proposedDigitalPriceIdr != null) {
      return String(manuscript.proposedDigitalPriceIdr);
    }
    return policy === "single_purchase" || policy === "nakama_or_purchase"
      ? String(DEFAULT_DIGITAL_BOOK_PRICE_IDR)
      : "";
  });
  const [categoriesInput, setCategoriesInput] = useState(
    manuscript.category || "",
  );
  const [isbn, setIsbn] = useState(manuscript.isbn || "");
  const [publishedYear, setPublishedYear] = useState(
    String(new Date().getFullYear()),
  );
  const [collectionName, setCollectionName] = useState("");
  const [hasPhysical, setHasPhysical] = useState(
    (manuscript.proposedDigitalPolicy || "nakama_or_purchase") ===
      "print_code_only" ||
      (manuscript.proposedDigitalPolicy || "nakama_or_purchase") ===
        "nakama_or_purchase",
  );
  const [rakyatPriceIdr, setRakyatPriceIdr] = useState("45000");
  const [standardPriceIdr, setStandardPriceIdr] = useState("75000");

  const [formError, setFormError] = useState<string | null>(null);
  const [publishedResult, setPublishedResult] =
    useState<PublishManuscriptResultDto | null>(null);

  const chapterCount =
    manuscript.chapters?.length || manuscript.totalChapters || 1;
  const displayTitle = titleOverride.trim() || manuscript.title;
  const previewCategories = categoriesInput
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const isDirty =
    !publishedResult &&
    (titleOverride !== (initialTitle?.trim() || manuscript.title) ||
      synopsisOverride !==
        (initialSynopsis?.trim() || manuscript.synopsis || "") ||
      coverUrl !==
        ((initialCoverUrl ?? manuscript.coverUrl ?? "") === "template"
          ? ""
          : (initialCoverUrl ?? manuscript.coverUrl ?? "")) ||
      coverColor !==
        (initialCoverColor || manuscript.coverColor || "#3D2B1F") ||
      digitalPolicy !==
        (manuscript.proposedDigitalPolicy || "nakama_or_purchase") ||
      Boolean(collectionName.trim()));

  const readinessItems = [
    {
      label: "Judul resmi terisi",
      ready: titleOverride.trim().length >= 2,
    },
    {
      label: "Sinopsis minimal 10 karakter",
      ready: synopsisOverride.trim().length >= 10,
    },
    {
      label: "Sampul atau warna aksen siap",
      ready: Boolean(coverUrl.trim() || coverColor.trim()),
    },
    {
      label: "Model distribusi & harga valid",
      ready:
        (digitalPolicy !== "single_purchase" &&
          digitalPolicy !== "nakama_or_purchase") ||
        Number.parseInt(digitalPriceIdr.trim(), 10) >= 0,
    },
  ];

  const handleUploadCover = async (file: File) => {
    setFormError(null);
    try {
      const uploaded = await uploadMutation.mutateAsync(file);
      setCoverUrl(uploaded.url);
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Gagal mengunggah sampul.",
      );
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (titleOverride.trim().length < 2) {
      setFormError("Judul buku minimal 2 karakter.");
      return;
    }
    if (synopsisOverride.trim().length < 10) {
      setFormError("Sinopsis buku minimal 10 karakter.");
      return;
    }

    const requiresPrice =
      digitalPolicy === "single_purchase" ||
      digitalPolicy === "nakama_or_purchase";
    const parsedPrice = digitalPriceIdr.trim()
      ? Number.parseInt(digitalPriceIdr.trim(), 10)
      : requiresPrice
        ? DEFAULT_DIGITAL_BOOK_PRICE_IDR
        : null;

    if (
      parsedPrice !== null &&
      (!Number.isFinite(parsedPrice) ||
        parsedPrice < 0 ||
        parsedPrice > 10_000_000)
    ) {
      setFormError("Harga beli satuan harus antara Rp0 hingga Rp10.000.000.");
      return;
    }

    const parsedYear = publishedYear.trim()
      ? Number.parseInt(publishedYear.trim(), 10)
      : undefined;
    const parsedRakyat =
      hasPhysical && rakyatPriceIdr.trim()
        ? Number.parseInt(rakyatPriceIdr.trim(), 10)
        : undefined;
    const parsedStandard =
      hasPhysical && standardPriceIdr.trim()
        ? Number.parseInt(standardPriceIdr.trim(), 10)
        : undefined;

    const categories = categoriesInput
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 10);

    try {
      const result = await publishMutation.mutateAsync({
        slug: publisherSlug,
        idOrSlug: manuscript.id,
        input: {
          title: titleOverride.trim(),
          synopsis: synopsisOverride.trim(),
          coverUrl: coverUrl.trim() || null,
          coverColor: /^#[0-9a-f]{3,8}$/i.test(coverColor.trim())
            ? coverColor.trim()
            : undefined,
          author: authorOverride.trim() || undefined,
          digitalPolicy,
          digitalPriceIdr: parsedPrice,
          hasPhysical,
          categories: categories.length > 0 ? categories : undefined,
          publishedYear:
            parsedYear && Number.isFinite(parsedYear) ? parsedYear : undefined,
          collectionName: collectionName.trim() || null,
          isbn: isbn.trim() || null,
          rakyatPriceIdr:
            parsedRakyat && Number.isFinite(parsedRakyat)
              ? parsedRakyat
              : undefined,
          standardPriceIdr:
            parsedStandard && Number.isFinite(parsedStandard)
              ? parsedStandard
              : undefined,
        },
      });
      setPublishedResult(result);
      onPublished?.(result);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setFormError(
          "Endpoint penerbitan khusus studio penerbit belum aktif di API server. Pastikan pembaruan backend penerbit sudah terpasang.",
        );
        return;
      }
      if (error instanceof ApiError) {
        setFormError(error.message);
        return;
      }
      setFormError(
        error instanceof Error
          ? error.message
          : "Gagal menerbitkan naskah ke katalog.",
      );
    }
  };

  if (publishedResult) {
    return (
      <StudioDrawer
        isOpen
        onClose={onClose}
        title="Buku Resmi Diterbitkan"
        subtitle={`Naskah "${displayTitle}" telah masuk ke katalog resmi${publisherName ? ` ${publisherName}` : " AnzaBook"}.`}
        titleId="publish-dialog-title"
        widthClass="max-w-xl"
      >
        <div className="space-y-5 text-[var(--color-ink)]">
          <div
            role="status"
            className="rounded-xl border border-[var(--color-green)]/40 bg-[var(--color-green-soft)] p-4 text-sm space-y-2"
          >
            <p className="font-semibold flex items-center gap-2">
              <CheckCircle2
                className="size-4 text-[var(--color-green)] shrink-0"
                aria-hidden="true"
              />
              <span>
                {publishedResult.book.title} ({chapterCount} bab) siap dibaca di
                AnzaBook.
              </span>
            </p>
            {publishedResult.claimBatch && (
              <p className="text-xs font-mono">
                Batch klaim phygital otomatis dibuat:{" "}
                <strong>{publishedResult.claimBatch.totalCodes} kode</strong> (
                {publishedResult.claimBatch.batchName}).
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-[var(--color-rule)]">
            <Link
              to="/p/$slug/studio"
              params={{ slug: publisherSlug }}
              search={{ tab: "catalog" }}
              onClick={onClose}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--color-rule)] px-4 text-xs font-semibold hover:bg-[var(--color-paper-3)]"
            >
              Lihat di Studio Penerbit
            </Link>
            <Link
              to="/books/$slug"
              params={{ slug: publishedResult.book.slug }}
              onClick={onClose}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--color-accent)] px-5 text-xs font-semibold text-[var(--color-accent-ink)] hover:brightness-95"
            >
              Buka Halaman Buku
            </Link>
          </div>
        </div>
      </StudioDrawer>
    );
  }

  return (
    <StudioDrawer
      isOpen
      onClose={onClose}
      title="Konfirmasi Penerbitan Naskah"
      subtitle={`Seluruh ${chapterCount} bab dari "${displayTitle}" akan disalin ke katalog terbitan ${publisherName || publisherSlug}.`}
      titleId="publish-dialog-title"
      widthClass="max-w-4xl"
      isDirty={isDirty}
    >
      <div className="space-y-5 text-[var(--color-ink)]">
        {formError && (
          <div
            role="alert"
            className="rounded-xl border border-[var(--color-error)]/40 bg-[var(--color-error-soft)] p-3.5 text-xs text-[var(--color-ink)]"
          >
            {formError}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 lg:grid-cols-[15rem_minmax(0,1fr)] gap-6 items-start"
        >
          {/* Sticky Live Preview & Readiness Column */}
          <aside className="lg:sticky lg:top-4 rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper)] p-4 space-y-4">
            <div className="w-36 mx-auto">
              <BookCover
                book={{
                  title: displayTitle,
                  author:
                    authorOverride.trim() ||
                    manuscript.authorPenName ||
                    manuscript.authorName ||
                    "Penulis AnzaBook",
                  coverUrl: coverUrl.trim() || null,
                  coverColor,
                  genres: previewCategories,
                  pageCount: manuscript.estimatedPages || 180,
                  publishedYear:
                    Number.parseInt(publishedYear, 10) ||
                    new Date().getFullYear(),
                }}
                decorative
              />
            </div>

            <div className="space-y-1 text-center border-t border-[var(--color-rule)] pt-3">
              <p className="font-serif text-sm font-bold text-[var(--color-ink)] break-words">
                {displayTitle}
              </p>
              <p className="text-[11px] font-mono text-[var(--color-muted)]">
                {chapterCount} bab siap terbit
              </p>
            </div>

            <div className="space-y-2 border-t border-[var(--color-rule)] pt-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-muted)]">
                Kesiapan Katalog
              </p>
              <ul className="space-y-1.5 text-[11px]">
                {readinessItems.map((item) => (
                  <li key={item.label} className="flex items-center gap-2">
                    <span
                      className={`inline-flex size-4 shrink-0 items-center justify-center rounded-full border ${
                        item.ready
                          ? "border-[var(--color-green)] bg-[var(--color-green-soft)] text-[var(--color-green)]"
                          : "border-[var(--color-rule)] text-[var(--color-muted)]"
                      }`}
                    >
                      {item.ready && (
                        <Check className="size-2.5" aria-hidden="true" />
                      )}
                    </span>
                    <span
                      className={
                        item.ready
                          ? "text-[var(--color-ink)]"
                          : "text-[var(--color-muted)]"
                      }
                    >
                      {item.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          {/* Main Publication Form Column */}
          <div className="space-y-4 min-w-0">
            <div className="space-y-1.5">
              <Label htmlFor="publish-title" className="text-xs font-semibold">
                Judul Buku di Katalog
              </Label>
              <Input
                id="publish-title"
                name="title"
                value={titleOverride}
                onChange={(e) => setTitleOverride(e.target.value)}
                required
                className="min-h-11 bg-[var(--color-paper)]"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="publish-synopsis"
                className="text-xs font-semibold"
              >
                Sinopsis Resmi Buku
              </Label>
              <Textarea
                id="publish-synopsis"
                name="synopsis"
                rows={3}
                value={synopsisOverride}
                onChange={(e) => setSynopsisOverride(e.target.value)}
                required
                className="text-xs bg-[var(--color-paper)]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor="publish-author"
                  className="text-xs font-semibold"
                >
                  Nama Penulis di Katalog
                </Label>
                <Input
                  id="publish-author"
                  name="author"
                  value={authorOverride}
                  onChange={(e) => setAuthorOverride(e.target.value)}
                  placeholder="Nama penulis atau nama pena"
                  className="min-h-11 bg-[var(--color-paper)]"
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="publish-cover-color"
                  className="text-xs font-semibold"
                >
                  Warna Aksen Sampul
                </Label>
                <div className="flex items-center gap-2">
                  <input
                    id="publish-cover-color"
                    type="color"
                    value={coverColor}
                    onChange={(e) => setCoverColor(e.target.value)}
                    className="h-11 w-14 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] p-1 cursor-pointer"
                  />
                  <Input
                    value={coverColor}
                    onChange={(e) => setCoverColor(e.target.value)}
                    aria-label="Kode hex warna sampul"
                    className="min-h-11 font-mono text-xs bg-[var(--color-paper)]"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="publish-cover-url"
                className="text-xs font-semibold"
              >
                Sampul Buku (Unggah Gambar atau URL)
              </Label>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  id="publish-cover-url"
                  name="coverUrl"
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  placeholder="https://... atau unggah berkas sampul"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  className="min-h-11 flex-1 font-mono text-xs bg-[var(--color-paper)]"
                />
                <input
                  ref={coverFileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleUploadCover(file);
                    e.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploadMutation.isPending}
                  onClick={() => coverFileInputRef.current?.click()}
                  className="min-h-11 px-3 text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Upload className="size-3.5" aria-hidden="true" />
                  <span>
                    {uploadMutation.isPending
                      ? "Mengunggah..."
                      : "Unggah Sampul"}
                  </span>
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor="publish-policy"
                  className="text-xs font-semibold"
                >
                  Model Distribusi Buku
                </Label>
                <select
                  id="publish-policy"
                  name="digitalPolicy"
                  value={digitalPolicy}
                  onChange={(e) => {
                    const next = e.target.value as BookDistributionModel;
                    setDigitalPolicy(next);
                    if (
                      (next === "single_purchase" ||
                        next === "nakama_or_purchase") &&
                      !digitalPriceIdr.trim()
                    ) {
                      setDigitalPriceIdr(
                        String(DEFAULT_DIGITAL_BOOK_PRICE_IDR),
                      );
                    }
                    if (next === "print_code_only") {
                      setHasPhysical(true);
                    }
                  }}
                  className="w-full h-11 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 text-xs text-[var(--color-ink)]"
                >
                  {DISTRIBUTION_MODELS.map((policy) => (
                    <option key={policy} value={policy}>
                      {formatDigitalPolicy(policy)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="publish-price"
                  className="text-xs font-semibold"
                >
                  Harga Beli Satuan Digital (IDR)
                </Label>
                <Input
                  id="publish-price"
                  name="digitalPriceIdr"
                  type="text"
                  inputMode="numeric"
                  value={digitalPriceIdr}
                  onChange={(e) => setDigitalPriceIdr(e.target.value)}
                  placeholder="Contoh: 45000"
                  className="min-h-11 font-mono text-xs bg-[var(--color-paper)]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="publish-categories"
                className="text-xs font-semibold"
              >
                Kategori Katalog (pisahkan dengan koma)
              </Label>
              <Input
                id="publish-categories"
                name="categories"
                value={categoriesInput}
                onChange={(e) => setCategoriesInput(e.target.value)}
                placeholder="Sastra & Fiksi, Humaniora"
                className="min-h-11 text-xs bg-[var(--color-paper)]"
              />
            </div>

            <details className="editorial-disclosure rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] p-3.5 text-xs">
              <summary className="cursor-pointer font-semibold text-[var(--color-ink)] select-none py-1">
                Metadata Bibliografi &amp; Edisi Cetak Fisik (Opsional)
              </summary>
              <div className="mt-3 space-y-3 border-t border-[var(--color-rule)] pt-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label
                      htmlFor="publish-isbn"
                      className="text-xs font-semibold"
                    >
                      ISBN
                    </Label>
                    <Input
                      id="publish-isbn"
                      value={isbn}
                      onChange={(e) => setIsbn(e.target.value)}
                      placeholder="978-602-..."
                      className="min-h-11 font-mono text-xs bg-[var(--color-paper-2)]"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label
                      htmlFor="publish-year"
                      className="text-xs font-semibold"
                    >
                      Tahun Terbit
                    </Label>
                    <Input
                      id="publish-year"
                      type="number"
                      value={publishedYear}
                      onChange={(e) => setPublishedYear(e.target.value)}
                      className="min-h-11 font-mono text-xs bg-[var(--color-paper-2)]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label
                    htmlFor="publish-collection"
                    className="text-xs font-semibold"
                  >
                    Seri / Koleksi Kurasi
                  </Label>
                  <Input
                    id="publish-collection"
                    value={collectionName}
                    onChange={(e) => setCollectionName(e.target.value)}
                    placeholder="Pustaka Klasik, Seri Esai Nusantara, dll."
                    className="min-h-11 text-xs bg-[var(--color-paper-2)]"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    id="publish-has-physical"
                    type="checkbox"
                    checked={hasPhysical}
                    onChange={(e) => setHasPhysical(e.target.checked)}
                    className="size-4 accent-[var(--color-accent)]"
                  />
                  <Label
                    htmlFor="publish-has-physical"
                    className="text-xs font-semibold cursor-pointer"
                  >
                    Terbitkan juga edisi cetak fisik (Rakyat &amp; Standar)
                  </Label>
                </div>

                {hasPhysical && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label
                        htmlFor="publish-rakyat-price"
                        className="text-xs font-semibold"
                      >
                        Harga Edisi Rakyat (IDR)
                      </Label>
                      <Input
                        id="publish-rakyat-price"
                        type="number"
                        min={5000}
                        value={rakyatPriceIdr}
                        onChange={(e) => setRakyatPriceIdr(e.target.value)}
                        className="min-h-11 font-mono text-xs bg-[var(--color-paper-2)]"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label
                        htmlFor="publish-std-price"
                        className="text-xs font-semibold"
                      >
                        Harga Edisi Standar (IDR)
                      </Label>
                      <Input
                        id="publish-std-price"
                        type="number"
                        min={5000}
                        value={standardPriceIdr}
                        onChange={(e) => setStandardPriceIdr(e.target.value)}
                        className="min-h-11 font-mono text-xs bg-[var(--color-paper-2)]"
                      />
                    </div>
                  </div>
                )}
              </div>
            </details>

            {digitalPolicy === "print_code_only" && (
              <div
                role="status"
                className="rounded-xl border border-[var(--color-accent)]/40 bg-[var(--color-accent-soft)] p-3.5 text-xs leading-relaxed"
              >
                Mode Eksklusif Pembeli Buku Cetak aktif: sistem akan otomatis
                membuat batch <strong>500 kode klaim cetak gratis</strong> saat
                buku diterbitkan.
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-3 border-t border-[var(--color-rule)]">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="min-h-11 px-4 text-xs cursor-pointer"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={publishMutation.isPending}
                className="min-h-11 px-5 text-xs font-semibold bg-[var(--color-accent)] text-[var(--color-accent-ink)] hover:brightness-95 cursor-pointer"
              >
                {publishMutation.isPending
                  ? "Menerbitkan Naskah..."
                  : "Terbitkan Sekarang"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </StudioDrawer>
  );
}

export function PublishManuscriptDialog(props: PublishManuscriptDialogProps) {
  if (!props.isOpen) return null;
  return (
    <PublishDialogFormContent
      key={props.manuscript.id}
      onClose={props.onClose}
      publisherSlug={props.publisherSlug}
      publisherName={props.publisherName}
      manuscript={props.manuscript}
      initialTitle={props.initialTitle}
      initialSynopsis={props.initialSynopsis}
      initialCoverUrl={props.initialCoverUrl}
      initialCoverColor={props.initialCoverColor}
      onPublished={props.onPublished}
    />
  );
}
