import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, Sparkles, X } from "lucide-react";
import type {
  DigitalPolicy,
  ManuscriptSubmissionDto,
  PublishManuscriptResultDto,
} from "@starter/shared/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePublishPublisherManuscript } from "@/features/social/hooks";
import { ApiError } from "@/lib/api/client";
import { formatDigitalPolicy } from "@/lib/formatters";

export interface PublishManuscriptDialogProps {
  isOpen: boolean;
  onClose: () => void;
  publisherSlug: string;
  publisherName?: string | null;
  manuscript: ManuscriptSubmissionDto;
  initialTitle?: string;
  initialCoverUrl?: string | null;
  onPublished?: (result: PublishManuscriptResultDto) => void;
}

const DIGITAL_POLICIES: DigitalPolicy[] = [
  "hybrid_nakama_alacarte",
  "sample_only",
  "alacarte_only",
  "print_claim_only",
  "free_open",
];

function PublishDialogFormContent({
  onClose,
  publisherSlug,
  publisherName,
  manuscript,
  initialTitle,
  initialCoverUrl,
  onPublished,
}: Omit<PublishManuscriptDialogProps, "isOpen">) {
  const publishMutation = usePublishPublisherManuscript();

  const [authorOverride, setAuthorOverride] = useState(
    manuscript.authorPenName || manuscript.authorName || "",
  );
  const [coverUrl, setCoverUrl] = useState(() => {
    const candidate = initialCoverUrl ?? manuscript.coverUrl ?? "";
    return candidate === "template" ? "" : candidate;
  });
  const [digitalPolicy, setDigitalPolicy] = useState<DigitalPolicy>(
    manuscript.proposedDigitalPolicy || "hybrid_nakama_alacarte",
  );
  const [alacartePriceIdr, setAlacartePriceIdr] = useState(
    manuscript.proposedAlacartePriceIdr != null
      ? String(manuscript.proposedAlacartePriceIdr)
      : "",
  );
  const [categoriesInput, setCategoriesInput] = useState(
    manuscript.category || "",
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [publishedResult, setPublishedResult] =
    useState<PublishManuscriptResultDto | null>(null);

  const chapterCount =
    manuscript.chapters?.length || manuscript.totalChapters || 1;
  const displayTitle = initialTitle?.trim() || manuscript.title;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const parsedPrice = alacartePriceIdr.trim()
      ? Number.parseInt(alacartePriceIdr.trim(), 10)
      : null;

    if (
      parsedPrice !== null &&
      (!Number.isFinite(parsedPrice) ||
        parsedPrice < 0 ||
        parsedPrice > 10_000_000)
    ) {
      setFormError("Harga satuan harus antara Rp0 hingga Rp10.000.000.");
      return;
    }

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
          coverUrl: coverUrl.trim() || undefined,
          author: authorOverride.trim() || undefined,
          digitalPolicy,
          alacartePriceIdr: parsedPrice,
          categories: categories.length > 0 ? categories : undefined,
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
      <div className="space-y-5 p-6 sm:p-7 text-[var(--color-ink)]">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--color-rule)] pb-4">
          <div className="space-y-1">
            <h1
              id="publish-dialog-title"
              className="font-serif text-xl font-bold flex items-center gap-2"
            >
              <CheckCircle2
                className="size-5 text-[var(--color-green)]"
                aria-hidden="true"
              />
              <span>Buku Resmi Diterbitkan</span>
            </h1>
            <p className="text-xs text-[var(--color-muted)]">
              Naskah &ldquo;{displayTitle}&rdquo; telah masuk ke katalog resmi
              {publisherName ? ` ${publisherName}` : " AnzaBook"}.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-3)] cursor-pointer"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div
          role="status"
          className="rounded-xl border border-[var(--color-green)]/40 bg-[var(--color-green-soft)] p-4 text-sm space-y-2"
        >
          <p className="font-semibold">
            {publishedResult.book.title} ({chapterCount} bab) siap dibaca di
            AnzaBook.
          </p>
          {publishedResult.claimBatch && (
            <p className="text-xs font-mono">
              Batch klaim phygital otomatis dibuat:{" "}
              <strong>{publishedResult.claimBatch.totalCodes} kode</strong> (
              {publishedResult.claimBatch.batchName}).
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
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
    );
  }

  return (
    <div className="space-y-5 p-6 sm:p-7 text-[var(--color-ink)]">
      <div className="flex items-start justify-between gap-4 border-b border-[var(--color-rule)] pb-4">
        <div className="space-y-1">
          <h1
            id="publish-dialog-title"
            className="font-serif text-lg sm:text-xl font-bold flex items-center gap-2"
          >
            <Sparkles
              className="size-5 text-[var(--color-accent)]"
              aria-hidden="true"
            />
            <span>Konfirmasi Penerbitan Naskah</span>
          </h1>
          <p className="text-xs text-[var(--color-muted)] leading-relaxed">
            Seluruh {chapterCount} bab dari &ldquo;{displayTitle}&rdquo; akan
            disalin ke katalog terbitan {publisherName || publisherSlug}.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup dialog konfirmasi terbit"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-3)] cursor-pointer shrink-0"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

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
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="publish-cover-url" className="text-xs font-semibold">
            URL Cover Buku (Opsional)
          </Label>
          <Input
            id="publish-cover-url"
            name="coverUrl"
            value={coverUrl}
            onChange={(e) => setCoverUrl(e.target.value)}
            placeholder="https://... atau /covers/sampul.jpg"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            className="min-h-11 font-mono text-xs bg-[var(--color-paper)]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="publish-policy" className="text-xs font-semibold">
              Skema Distribusi Digital
            </Label>
            <select
              id="publish-policy"
              name="digitalPolicy"
              value={digitalPolicy}
              onChange={(e) =>
                setDigitalPolicy(e.target.value as DigitalPolicy)
              }
              className="w-full h-11 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 text-xs text-[var(--color-ink)]"
            >
              {DIGITAL_POLICIES.map((policy) => (
                <option key={policy} value={policy}>
                  {formatDigitalPolicy(policy)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="publish-price" className="text-xs font-semibold">
              Harga A La Carte (IDR)
            </Label>
            <Input
              id="publish-price"
              name="alacartePriceIdr"
              type="text"
              inputMode="numeric"
              value={alacartePriceIdr}
              onChange={(e) => setAlacartePriceIdr(e.target.value)}
              placeholder="Contoh: 49000"
              className="min-h-11 font-mono text-xs bg-[var(--color-paper)]"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="publish-categories" className="text-xs font-semibold">
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

        {digitalPolicy === "print_claim_only" && (
          <div
            role="status"
            className="rounded-xl border border-[var(--color-accent)]/40 bg-[var(--color-accent-soft)] p-3.5 text-xs leading-relaxed"
          >
            Skema A Phygital aktif: sistem akan otomatis membuat batch{" "}
            <strong>500 kode klaim cetak gratis</strong> saat buku diterbitkan.
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
      </form>
    </div>
  );
}

export function PublishManuscriptDialog(props: PublishManuscriptDialogProps) {
  const { isOpen, onClose } = props;
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

  const handleNativeClose = () => {
    if (dialogRef.current) {
      dialogRef.current.returnValue = "";
    }
    if (isOpen) onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="publish-dialog-title"
      onClose={handleNativeClose}
      className="m-auto w-[min(94vw,34rem)] max-h-[90vh] overflow-y-auto overscroll-contain rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-0 shadow-2xl backdrop:bg-black/65 backdrop:overflow-hidden backdrop:overscroll-contain"
    >
      {isOpen && (
        <PublishDialogFormContent
          key={props.manuscript.id}
          onClose={onClose}
          publisherSlug={props.publisherSlug}
          publisherName={props.publisherName}
          manuscript={props.manuscript}
          initialTitle={props.initialTitle}
          initialCoverUrl={props.initialCoverUrl}
          onPublished={props.onPublished}
        />
      )}
    </dialog>
  );
}
