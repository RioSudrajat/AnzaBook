import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { AlertCircle, Check, CheckCircle2, PenTool } from "lucide-react";
import type {
  BookDistributionModel,
  ManuscriptSubmissionDto,
  PublishManuscriptResultDto,
} from "@starter/shared/types";
import { DEFAULT_DIGITAL_BOOK_PRICE_IDR } from "@starter/shared/validators/publisher";
import { StudioDrawer } from "@/components/profile/studio-drawer";
import { BookCover } from "@/features/books/components/book-cover";
import { ManuscriptCoverPlaceholder } from "@/features/books/components/manuscript-cover-placeholder";
import { hasManuscriptBodyContent } from "@/features/reader/editor/manuscript-json";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePublishPublisherManuscript } from "@/features/social/hooks";
import { ApiError } from "@/lib/api/client";
import { formatDigitalPolicy } from "@/lib/formatters";
import { isUsableAssetUrl } from "@/lib/media-url";

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
  initialHasBodyContent?: boolean;
  onEditInEditor?: () => void;
  onPublished?: (result: PublishManuscriptResultDto) => void;
}

const DISTRIBUTION_MODELS: ReadonlyArray<{
  policy: BookDistributionModel;
  title: string;
  description: string;
}> = [
  {
    policy: "nakama_subscription",
    title: "Langganan Nakama",
    description: "Tersedia eksklusif untuk pelanggan aktif paket Nakama.",
  },
  {
    policy: "single_purchase",
    title: "Beli Satuan Digital",
    description: "Pembaca membeli akses digital permanen dengan harga satuan.",
  },
  {
    policy: "free_open",
    title: "Gratis Terbuka",
    description: "Seluruh chapter terbuka gratis untuk semua pembaca AnzaBook.",
  },
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
  initialHasBodyContent,
  onEditInEditor,
  onPublished,
}: Omit<PublishManuscriptDialogProps, "isOpen">) {
  const publishMutation = usePublishPublisherManuscript();

  const resolvedTitle = (initialTitle ?? manuscript.title ?? "").trim();
  const resolvedSynopsis = (
    initialSynopsis ??
    manuscript.synopsis ??
    ""
  ).trim();
  const resolvedCoverUrl = (() => {
    const candidate = initialCoverUrl ?? manuscript.coverUrl ?? "";
    return candidate === "template" ? "template" : candidate || null;
  })();
  const resolvedCoverColor =
    initialCoverColor || manuscript.coverColor || "#181614";

  const [authorOverride, setAuthorOverride] = useState(
    manuscript.authorPenName || manuscript.authorName || "",
  );
  const [digitalPolicy, setDigitalPolicy] = useState<BookDistributionModel>(
    manuscript.proposedDigitalPolicy || "nakama_subscription",
  );
  const [digitalPriceIdr, setDigitalPriceIdr] = useState(() => {
    if (manuscript.proposedDigitalPriceIdr != null) {
      return String(manuscript.proposedDigitalPriceIdr);
    }
    return String(DEFAULT_DIGITAL_BOOK_PRICE_IDR);
  });
  const [categoriesInput, setCategoriesInput] = useState(
    manuscript.category || "",
  );
  const [isbn, setIsbn] = useState(manuscript.isbn || "");
  const [publishedYear, setPublishedYear] = useState(
    String(new Date().getFullYear()),
  );
  const [collectionName, setCollectionName] = useState("");

  const [formError, setFormError] = useState<string | null>(null);
  const [publishedResult, setPublishedResult] =
    useState<PublishManuscriptResultDto | null>(null);

  const chapterCount =
    manuscript.chapters?.length || manuscript.totalChapters || 1;
  const hasBodyContent =
    initialHasBodyContent ??
    (manuscript.chapters
      ? hasManuscriptBodyContent(manuscript.chapters)
      : (manuscript.totalChapters ?? 0) > 0);

  const previewCategories = categoriesInput
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const readinessItems = [
    {
      label: "Judul naskah terisi (minimal 2 karakter)",
      ready: resolvedTitle.length >= 2,
    },
    {
      label: "Sinopsis terisi (minimal 10 karakter)",
      ready: resolvedSynopsis.length >= 10,
    },
    {
      label: "Isi chapter naskah sudah ditulis",
      ready: hasBodyContent,
    },
  ];
  const isManuscriptReady = readinessItems.every((item) => item.ready);

  const isDirty =
    !publishedResult &&
    (digitalPolicy !==
      (manuscript.proposedDigitalPolicy || "nakama_subscription") ||
      authorOverride !==
        (manuscript.authorPenName || manuscript.authorName || "") ||
      categoriesInput !== (manuscript.category || "") ||
      Boolean(collectionName.trim()));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!isManuscriptReady) {
      setFormError(
        "Judul, sinopsis, dan isi chapter harus dilengkapi di Editor sebelum menerbitkan buku.",
      );
      return;
    }

    const requiresPrice = digitalPolicy === "single_purchase";
    const parsedPrice = requiresPrice
      ? Number.parseInt(digitalPriceIdr.trim(), 10)
      : null;

    if (
      requiresPrice &&
      (Number.isNaN(parsedPrice ?? Number.NaN) ||
        (parsedPrice ?? 0) <= 0 ||
        (parsedPrice ?? 0) > 10_000_000)
    ) {
      setFormError(
        "Harga beli satuan digital harus antara Rp1 hingga Rp10.000.000.",
      );
      return;
    }

    const parsedYear = publishedYear.trim()
      ? Number.parseInt(publishedYear.trim(), 10)
      : undefined;
    const categories = previewCategories.slice(0, 10);

    try {
      const result = await publishMutation.mutateAsync({
        slug: publisherSlug,
        idOrSlug: manuscript.id,
        input: {
          title: resolvedTitle,
          synopsis: resolvedSynopsis,
          coverUrl:
            resolvedCoverUrl === "template" ? null : resolvedCoverUrl || null,
          coverColor: /^#[0-9a-f]{3,8}$/i.test(resolvedCoverColor.trim())
            ? resolvedCoverColor.trim()
            : undefined,
          author: authorOverride.trim() || undefined,
          digitalPolicy,
          digitalPriceIdr: parsedPrice,
          hasPhysical: false,
          categories: categories.length > 0 ? categories : undefined,
          publishedYear:
            parsedYear && Number.isFinite(parsedYear) ? parsedYear : undefined,
          collectionName: collectionName.trim() || null,
          isbn: isbn.trim() || null,
        },
      });
      setPublishedResult(result);
      onPublished?.(result);
    } catch (error) {
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
        subtitle={`Naskah "${resolvedTitle}" telah masuk ke katalog resmi${publisherName ? ` ${publisherName}` : " AnzaBook"}.`}
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
                {publishedResult.book.title} ({chapterCount} chapter) siap
                dibaca di AnzaBook.
              </span>
            </p>
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

  const hasCover =
    isUsableAssetUrl(resolvedCoverUrl) || resolvedCoverUrl === "template";
  const displayAuthor =
    authorOverride.trim() ||
    manuscript.authorPenName ||
    manuscript.authorName ||
    "Penulis AnzaBook";

  return (
    <StudioDrawer
      isOpen
      onClose={onClose}
      title="Konfirmasi Penerbitan Naskah"
      subtitle={`Periksa pratinjau kartu buku dari Editor dan atur skema distribusi digital untuk ${publisherName || publisherSlug}.`}
      titleId="publish-dialog-title"
      widthClass="max-w-3xl"
      isDirty={isDirty}
    >
      <div className="space-y-5 text-[var(--color-ink)]">
        {/* Top Section: Read-Only Book Card Preview + Readiness Checklist */}
        <section
          aria-label="Pratinjau buku dan kesiapan terbit"
          className="rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper)] p-4 sm:p-5 space-y-4"
        >
          <div className="flex items-start gap-4">
            <div className="w-24 shrink-0 aspect-[2/3]">
              {hasCover ? (
                <BookCover
                  book={{
                    title: resolvedTitle || "Naskah Tanpa Judul",
                    author: displayAuthor,
                    coverUrl:
                      resolvedCoverUrl === "template" ? null : resolvedCoverUrl,
                    coverColor: resolvedCoverColor,
                    genres: previewCategories,
                    pageCount: manuscript.estimatedPages || 180,
                    publishedYear:
                      Number.parseInt(publishedYear, 10) ||
                      new Date().getFullYear(),
                  }}
                  className="w-full h-full aspect-[2/3]"
                  decorative
                />
              ) : (
                <ManuscriptCoverPlaceholder
                  title={resolvedTitle}
                  compact
                  className="size-full"
                />
              )}
            </div>

            <div className="min-w-0 flex-1 space-y-1.5">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-muted)]">
                Pratinjau Kartu Buku (Read-Only)
              </p>
              <h2 className="font-serif text-lg font-bold text-[var(--color-ink)] break-words">
                {resolvedTitle || (
                  <span className="italic font-normal text-[var(--color-muted)]">
                    Naskah Tanpa Judul
                  </span>
                )}
              </h2>
              <p className="font-mono text-[11px] text-[var(--color-muted)]">
                {displayAuthor} &bull; {chapterCount} chapter &bull;{" "}
                {formatDigitalPolicy(digitalPolicy)}
                {digitalPolicy === "single_purchase" && digitalPriceIdr.trim()
                  ? ` — Rp${Number.parseInt(digitalPriceIdr, 10).toLocaleString("id-ID")}`
                  : ""}
              </p>
              <p className="text-xs leading-relaxed text-[var(--color-ink-2)] line-clamp-3">
                {resolvedSynopsis || (
                  <span className="italic text-[var(--color-muted)]">
                    Sinopsis belum diisi di Editor.
                  </span>
                )}
              </p>
            </div>
          </div>

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
                <span>
                  Lengkapi judul, sinopsis, dan isi chapter di Editor terlebih
                  dahulu.
                </span>
                <Button
                  type="button"
                  onClick={() => {
                    if (onEditInEditor) {
                      onEditInEditor();
                    } else {
                      onClose();
                    }
                  }}
                  className="min-h-10 px-3.5 text-xs font-semibold bg-[var(--color-ink)] text-[var(--color-paper)] hover:opacity-90 cursor-pointer inline-flex items-center gap-1.5"
                >
                  <PenTool className="size-3.5" aria-hidden="true" />
                  <span>Lengkapi di Editor</span>
                </Button>
              </div>
            )}
          </div>
        </section>

        {formError && (
          <div
            role="alert"
            className="rounded-xl border border-[var(--color-error)]/40 bg-[var(--color-error-soft)] p-3.5 text-xs text-[var(--color-ink)]"
          >
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="publish-author" className="text-xs font-semibold">
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

          {/* 3 Distribution Models */}
          <fieldset className="space-y-2.5">
            <legend className="text-xs font-semibold text-[var(--color-ink)]">
              Model Distribusi Digital
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
                    onClick={() => {
                      setDigitalPolicy(model.policy);
                      if (
                        model.policy === "single_purchase" &&
                        !digitalPriceIdr.trim()
                      ) {
                        setDigitalPriceIdr(
                          String(DEFAULT_DIGITAL_BOOK_PRICE_IDR),
                        );
                      }
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
          </fieldset>

          {digitalPolicy === "single_purchase" && (
            <div className="space-y-1.5">
              <Label htmlFor="publish-price" className="text-xs font-semibold">
                Harga Beli Satuan Digital (IDR)
              </Label>
              <Input
                id="publish-price"
                name="digitalPriceIdr"
                type="text"
                inputMode="numeric"
                value={digitalPriceIdr}
                onChange={(e) =>
                  setDigitalPriceIdr(e.target.value.replace(/[^0-9]/g, ""))
                }
                placeholder="Contoh: 45000"
                className="min-h-11 font-mono text-xs bg-[var(--color-paper)]"
              />
            </div>
          )}

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
              Metadata Bibliografi (Opsional)
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
            </div>
          </details>

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
              disabled={!isManuscriptReady || publishMutation.isPending}
              className="min-h-11 px-5 text-xs font-semibold bg-[var(--color-accent)] text-[var(--color-accent-ink)] hover:brightness-95 cursor-pointer disabled:opacity-50"
            >
              {publishMutation.isPending
                ? "Menerbitkan Naskah..."
                : "Terbitkan Sekarang"}
            </Button>
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
      initialHasBodyContent={props.initialHasBodyContent}
      onEditInEditor={props.onEditInEditor}
      onPublished={props.onPublished}
    />
  );
}
