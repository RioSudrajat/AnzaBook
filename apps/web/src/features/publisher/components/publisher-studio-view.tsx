import { useState, useRef, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Award,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  Inbox,
  LoaderCircle,
  PenTool,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Store,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import { EntityProfileHeader } from "@/components/profile/entity-profile-header";
import { ProfileTabs } from "@/components/profile/profile-tabs";
import { StudioDrawer } from "@/components/profile/studio-drawer";
import { TranslationFieldsSection } from "@/components/profile/translation-fields-section";
import type {
  BookDistributionModel,
  BookSummaryDto,
  PublisherDto,
  PublisherMemberRole,
} from "@starter/shared/types";
import { DEFAULT_DIGITAL_BOOK_PRICE_IDR } from "@starter/shared/validators/publisher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BookCover } from "@/features/books/components/book-cover";
import {
  useAddPublisherApprovedWriter,
  useAddPublisherMember,
  usePublisherApprovedWriters,
  usePublisherBookInventory,
  usePublisherBooks,
  usePublisherManuscripts,
  usePublisherMembers,
  useRemovePublisherApprovedWriter,
  useRemovePublisherMember,
  useUpdatePublisherBook,
  useUpdatePublisherBookInventory,
  useUpdatePublisherMember,
  useUpdatePublisherProfile,
  useUploadMediaImage,
} from "@/features/social/hooks";
import { ApiError } from "@/lib/api/client";
import {
  formatDigitalPolicy,
  formatManuscriptStatus,
  formatRoleName,
  formatSourceLanguage,
  formatTargetAudience,
} from "@/lib/formatters";
import {
  MAX_PUBLISHER_TOPICS,
  canEditPublishedBooks,
  canManagePublisherProfile,
  canManagePublisherTeam,
  canReviewManuscripts,
  getManuscriptStatusBadgeClass,
  normalizePublisherTopics,
  normalizeSocialLinks,
} from "../publisher-helpers";

export type PublisherStudioTab = "inbox" | "catalog" | "team" | "profile";

const STUDIO_TABS: ReadonlyArray<{
  id: PublisherStudioTab;
  label: string;
}> = [
  { id: "inbox", label: "Inbox Naskah" },
  { id: "catalog", label: "Katalog Terbit" },
  { id: "team", label: "Tim & Penulis" },
  { id: "profile", label: "Profil & Topik Kurasi" },
];

const INBOX_STATUS_FILTERS = [
  { id: "all", label: "Semua" },
  { id: "pending_review", label: "Menunggu Kurasi" },
  { id: "in_editing", label: "Sedang Disunting" },
  { id: "revision_requested", label: "Perlu Revisi" },
  { id: "published", label: "Diterbitkan" },
  { id: "rejected", label: "Ditolak" },
] as const;

const SUGGESTED_TOPICS = [
  "Sastra & Fiksi",
  "Filsafat & Pemikiran",
  "Sejarah & Arsip",
  "Sains Populer",
  "Sosial Politik",
  "Puisi & Prosa",
  "Esai Kritis",
  "Ekonomi Politik",
  "Seni & Budaya",
  "Kajian Agraria",
];

const DISTRIBUTION_MODELS: BookDistributionModel[] = [
  "nakama_or_purchase",
  "nakama_subscription",
  "single_purchase",
  "print_code_only",
  "free_open",
];

function extractErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.status === 404) {
      return "Endpoint studio penerbit belum tersedia di server API. Pastikan pembaruan backend terbaru sudah berjalan.";
    }
    const detail = error.details?.[0];
    return detail?.field ? `${detail.field}: ${detail.message}` : error.message;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

function formatPriceIdr(amount?: number | null): string {
  if (amount == null || amount <= 0) return "Termasuk Nakama / Gratis";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function EditPublishedBookForm({
  publisherSlug,
  book,
  onClose,
}: {
  publisherSlug: string;
  book: BookSummaryDto;
  onClose: () => void;
}) {
  const updateBookMutation = useUpdatePublisherBook();
  const uploadMutation = useUploadMediaImage();
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(book.title);
  const [synopsis, setSynopsis] = useState(book.synopsis || "");
  const [coverUrl, setCoverUrl] = useState(book.coverUrl || "");
  const [coverColor, setCoverColor] = useState(book.coverColor || "#3D2B1F");
  const [digitalPolicy, setDigitalPolicy] = useState<BookDistributionModel>(
    book.digitalPolicy,
  );
  const [digitalPriceIdr, setDigitalPriceIdr] = useState(
    book.digitalPriceIdr != null ? String(book.digitalPriceIdr) : "",
  );
  const [categoriesText, setCategoriesText] = useState(
    (book.categories ?? []).join(", "),
  );
  const [publishedYear, setPublishedYear] = useState(
    book.publishedYear ? String(book.publishedYear) : "",
  );
  const [isTranslation, setIsTranslation] = useState(
    Boolean(book.originalTitle?.trim() || book.translator?.trim()),
  );
  const [originalTitle, setOriginalTitle] = useState(book.originalTitle || "");
  const [translator, setTranslator] = useState(book.translator || "");
  const [collectionName, setCollectionName] = useState(
    book.collectionName || "",
  );
  const [hasPhysical, setHasPhysical] = useState(Boolean(book.hasPhysical));
  const [rakyatPriceIdr, setRakyatPriceIdr] = useState("45000");
  const [standardPriceIdr, setStandardPriceIdr] = useState("75000");
  const [formError, setFormError] = useState<string | null>(null);

  const isDirty =
    title !== book.title ||
    synopsis !== (book.synopsis || "") ||
    coverUrl !== (book.coverUrl || "") ||
    coverColor !== (book.coverColor || "#3D2B1F") ||
    digitalPolicy !== book.digitalPolicy ||
    digitalPriceIdr !==
      (book.digitalPriceIdr != null ? String(book.digitalPriceIdr) : "") ||
    categoriesText !== (book.categories ?? []).join(", ") ||
    publishedYear !== (book.publishedYear ? String(book.publishedYear) : "") ||
    isTranslation !==
      Boolean(book.originalTitle?.trim() || book.translator?.trim()) ||
    originalTitle !== (book.originalTitle || "") ||
    translator !== (book.translator || "") ||
    collectionName !== (book.collectionName || "") ||
    hasPhysical !== Boolean(book.hasPhysical);

  const handleCoverUpload = async (file: File) => {
    setFormError(null);
    try {
      const uploaded = await uploadMutation.mutateAsync(file);
      setCoverUrl(uploaded.url);
    } catch (error) {
      setFormError(extractErrorMessage(error, "Gagal mengunggah sampul buku."));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (title.trim().length < 2) {
      setFormError("Judul buku minimal 2 karakter.");
      return;
    }
    if (synopsis.trim().length < 10) {
      setFormError("Sinopsis minimal 10 karakter.");
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
      setFormError("Harga beli satuan harus antara 0 hingga 10.000.000.");
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

    const categories = categoriesText
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean)
      .slice(0, 10);

    try {
      await updateBookMutation.mutateAsync({
        slug: publisherSlug,
        bookId: book.id,
        input: {
          title: title.trim(),
          synopsis: synopsis.trim(),
          coverUrl: coverUrl.trim() || null,
          coverColor: /^#[0-9a-f]{3,8}$/i.test(coverColor.trim())
            ? coverColor.trim()
            : undefined,
          digitalPolicy,
          digitalPriceIdr: parsedPrice,
          categories,
          publishedYear:
            parsedYear && Number.isFinite(parsedYear) ? parsedYear : undefined,
          originalTitle: isTranslation ? originalTitle.trim() || null : null,
          translator: isTranslation ? translator.trim() || null : null,
          collectionName: collectionName.trim() || null,
          hasPhysical,
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
      onClose();
    } catch (error) {
      setFormError(
        extractErrorMessage(error, "Gagal menyimpan perubahan buku."),
      );
    }
  };

  const previewCategories = categoriesText
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

  return (
    <StudioDrawer
      isOpen
      onClose={onClose}
      title="Edit Metadata Buku Terbit"
      subtitle={book.title}
      titleId="edit-book-dialog-title"
      widthClass="max-w-2xl"
      isDirty={isDirty}
    >
      <div className="space-y-5 text-[var(--color-ink)]">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] p-4">
          <div className="w-20 shrink-0">
            <BookCover
              book={{
                title: title.trim() || book.title,
                author: book.author,
                coverUrl: coverUrl.trim() || null,
                coverColor,
                genres:
                  previewCategories.length > 0
                    ? previewCategories
                    : book.genres,
                pageCount: book.pageCount,
                publishedYear:
                  Number.parseInt(publishedYear, 10) || book.publishedYear,
              }}
              decorative
            />
          </div>
          <div className="min-w-0 flex-1 space-y-1 text-center sm:text-left">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-muted)]">
              Pratinjau Katalog
            </p>
            <p className="font-serif text-base font-bold text-[var(--color-ink)] break-words">
              {title.trim() || book.title}
            </p>
            <p className="text-xs text-[var(--color-muted)]">{book.author}</p>
            <p className="text-xs font-mono text-[var(--color-ink-2)]">
              {formatDigitalPolicy(digitalPolicy)}
              {digitalPriceIdr.trim()
                ? ` — Rp ${Number.parseInt(digitalPriceIdr, 10).toLocaleString("id-ID")}`
                : ""}
            </p>
          </div>
        </div>

        {formError && (
          <div
            role="alert"
            className="rounded-xl border border-[var(--color-error)]/40 bg-[var(--color-error-soft)] p-3 text-xs text-[var(--color-ink)]"
          >
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-book-title" className="text-xs font-semibold">
              Judul Buku
            </Label>
            <Input
              id="edit-book-title"
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="min-h-11 bg-[var(--color-paper)]"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="edit-book-synopsis"
              className="text-xs font-semibold"
            >
              Sinopsis
            </Label>
            <Textarea
              id="edit-book-synopsis"
              name="synopsis"
              rows={4}
              value={synopsis}
              onChange={(e) => setSynopsis(e.target.value)}
              required
              className="text-sm bg-[var(--color-paper)]"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-book-cover" className="text-xs font-semibold">
              Sampul Buku (URL atau Unggah Berkas)
            </Label>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                id="edit-book-cover"
                name="coverUrl"
                value={coverUrl}
                onChange={(e) => setCoverUrl(e.target.value)}
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="https://... atau unggah sampul"
                className="min-h-11 flex-1 font-mono text-xs bg-[var(--color-paper)]"
              />
              <input
                ref={coverInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleCoverUpload(file);
                  e.target.value = "";
                }}
              />
              <Button
                type="button"
                variant="outline"
                disabled={uploadMutation.isPending}
                onClick={() => coverInputRef.current?.click()}
                className="min-h-11 px-3 text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5"
              >
                <Upload className="size-3.5" aria-hidden="true" />
                <span>
                  {uploadMutation.isPending ? "Mengunggah..." : "Unggah"}
                </span>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label
                htmlFor="edit-book-policy"
                className="text-xs font-semibold"
              >
                Model Distribusi
              </Label>
              <select
                id="edit-book-policy"
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
                    setDigitalPriceIdr(String(DEFAULT_DIGITAL_BOOK_PRICE_IDR));
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
                htmlFor="edit-book-price"
                className="text-xs font-semibold"
              >
                Harga Beli Satuan (IDR)
              </Label>
              <Input
                id="edit-book-price"
                name="digitalPriceIdr"
                type="text"
                inputMode="numeric"
                value={digitalPriceIdr}
                onChange={(e) => setDigitalPriceIdr(e.target.value)}
                placeholder="45000"
                className="min-h-11 font-mono text-xs bg-[var(--color-paper)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label
                htmlFor="edit-book-categories"
                className="text-xs font-semibold"
              >
                Kategori (pisahkan dengan koma)
              </Label>
              <Input
                id="edit-book-categories"
                name="categories"
                value={categoriesText}
                onChange={(e) => setCategoriesText(e.target.value)}
                placeholder="Sastra & Fiksi, Filsafat"
                className="min-h-11 text-xs bg-[var(--color-paper)]"
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="edit-book-color"
                className="text-xs font-semibold"
              >
                Warna Sampul
              </Label>
              <div className="flex items-center gap-2">
                <input
                  id="edit-book-color"
                  type="color"
                  value={coverColor}
                  onChange={(e) => setCoverColor(e.target.value)}
                  className="h-11 w-14 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] p-1 cursor-pointer"
                />
                <Input
                  value={coverColor}
                  onChange={(e) => setCoverColor(e.target.value)}
                  className="min-h-11 font-mono text-xs bg-[var(--color-paper)]"
                />
              </div>
            </div>
          </div>

          <details className="editorial-disclosure rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] p-3.5 text-xs">
            <summary className="cursor-pointer font-semibold text-[var(--color-ink)] select-none py-1">
              Bibliografi &amp; Edisi Cetak Fisik
            </summary>
            <div className="mt-3 space-y-3 border-t border-[var(--color-rule)] pt-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label
                    htmlFor="edit-book-year"
                    className="text-xs font-semibold"
                  >
                    Tahun Terbit
                  </Label>
                  <Input
                    id="edit-book-year"
                    type="number"
                    value={publishedYear}
                    onChange={(e) => setPublishedYear(e.target.value)}
                    className="min-h-11 font-mono text-xs bg-[var(--color-paper-2)]"
                  />
                </div>
                <div className="space-y-1">
                  <Label
                    htmlFor="edit-book-coll"
                    className="text-xs font-semibold"
                  >
                    Seri / Koleksi
                  </Label>
                  <Input
                    id="edit-book-coll"
                    value={collectionName}
                    onChange={(e) => setCollectionName(e.target.value)}
                    className="min-h-11 text-xs bg-[var(--color-paper-2)]"
                  />
                </div>
              </div>

              <TranslationFieldsSection
                isTranslation={isTranslation}
                onIsTranslationChange={setIsTranslation}
                originalTitle={originalTitle}
                onOriginalTitleChange={setOriginalTitle}
                translator={translator}
                onTranslatorChange={setTranslator}
                idPrefix="edit-book"
                inputClassName="min-h-11 text-xs bg-[var(--color-paper-2)]"
              />

              <div className="flex items-center gap-2 pt-1">
                <input
                  id="edit-book-physical"
                  type="checkbox"
                  checked={hasPhysical}
                  onChange={(e) => setHasPhysical(e.target.checked)}
                  className="size-4 accent-[var(--color-accent)]"
                />
                <Label
                  htmlFor="edit-book-physical"
                  className="text-xs font-semibold cursor-pointer"
                >
                  Tersedia dalam edisi cetak fisik
                </Label>
              </div>
              {hasPhysical && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label
                      htmlFor="edit-book-rakyat"
                      className="text-xs font-semibold"
                    >
                      Harga Edisi Rakyat (IDR)
                    </Label>
                    <Input
                      id="edit-book-rakyat"
                      type="number"
                      min={5000}
                      value={rakyatPriceIdr}
                      onChange={(e) => setRakyatPriceIdr(e.target.value)}
                      className="min-h-11 font-mono text-xs bg-[var(--color-paper-2)]"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label
                      htmlFor="edit-book-std"
                      className="text-xs font-semibold"
                    >
                      Harga Edisi Standar (IDR)
                    </Label>
                    <Input
                      id="edit-book-std"
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

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--color-rule)]">
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
              disabled={updateBookMutation.isPending}
              className="min-h-11 px-5 text-xs font-semibold bg-[var(--color-accent)] text-[var(--color-accent-ink)] hover:brightness-95 cursor-pointer"
            >
              {updateBookMutation.isPending
                ? "Menyimpan..."
                : "Simpan Metadata"}
            </Button>
          </div>
        </form>
      </div>
    </StudioDrawer>
  );
}

function EditPublishedBookDialog({
  publisherSlug,
  book,
  onClose,
}: {
  publisherSlug: string;
  book: BookSummaryDto | null;
  onClose: () => void;
}) {
  if (!book) return null;
  return (
    <EditPublishedBookForm
      key={book.id}
      publisherSlug={publisherSlug}
      book={book}
      onClose={onClose}
    />
  );
}

function BookInventoryForm({
  publisherSlug,
  book,
  onClose,
}: {
  publisherSlug: string;
  book: BookSummaryDto;
  onClose: () => void;
}) {
  const { data: branches = [], isLoading } = usePublisherBookInventory(
    publisherSlug,
    book.id,
    true,
  );
  const saveInventoryMutation = useUpdatePublisherBookInventory();
  const [draftCounts, setDraftCounts] = useState<
    Record<string, { rakyatStock: number; standardStock: number }>
  >({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const getCounts = (
    branchId: string,
    fallbackRakyat: number,
    fallbackStd: number,
  ) =>
    draftCounts[branchId] ?? {
      rakyatStock: fallbackRakyat,
      standardStock: fallbackStd,
    };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setErrorMsg(null);
    try {
      await saveInventoryMutation.mutateAsync({
        slug: publisherSlug,
        bookId: book.id,
        input: {
          items: branches.map((b) => {
            const counts = getCounts(
              b.branchId,
              b.rakyatStock,
              b.standardStock,
            );
            return {
              branchId: b.branchId,
              rakyatStock: Math.max(0, Number(counts.rakyatStock) || 0),
              standardStock: Math.max(0, Number(counts.standardStock) || 0),
            };
          }),
        },
      });
      setFeedback("Stok buku fisik di seluruh cabang berhasil diperbarui.");
    } catch (error) {
      setErrorMsg(extractErrorMessage(error, "Gagal menyimpan stok toko."));
    }
  };

  const isDirty = Object.keys(draftCounts).length > 0;

  return (
    <StudioDrawer
      isOpen
      onClose={onClose}
      title="Stok Buku Cetak di Toko Mitra"
      subtitle={book.title}
      titleId="inventory-dialog-title"
      widthClass="max-w-xl"
      isDirty={isDirty}
    >
      <div className="space-y-5 text-[var(--color-ink)]">
        {errorMsg && (
          <div
            role="alert"
            className="rounded-xl border border-[var(--color-error)]/40 bg-[var(--color-error-soft)] p-3 text-xs"
          >
            {errorMsg}
          </div>
        )}
        {feedback && (
          <div
            role="status"
            className="rounded-xl border border-[var(--color-green)]/40 bg-[var(--color-green-soft)] p-3 text-xs"
          >
            {feedback}
          </div>
        )}

        {isLoading ? (
          <div className="flex min-h-36 items-center justify-center">
            <LoaderCircle className="size-6 animate-spin text-[var(--color-muted)]" />
          </div>
        ) : branches.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--color-rule)] p-6 text-center text-xs text-[var(--color-muted)]">
            Belum ada cabang toko fisik terdaftar dalam sistem.
          </p>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <ul className="space-y-3">
              {branches.map((branch) => {
                const counts = getCounts(
                  branch.branchId,
                  branch.rakyatStock,
                  branch.standardStock,
                );
                return (
                  <li
                    key={branch.branchId}
                    className="rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] p-3.5 space-y-2.5"
                  >
                    <div>
                      <p className="font-semibold text-xs text-[var(--color-ink)]">
                        {branch.branchName} — {branch.city}
                      </p>
                      <p className="text-[11px] text-[var(--color-muted)]">
                        {branch.address}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label
                          htmlFor={`inv-rakyat-${branch.branchId}`}
                          className="text-[11px] font-semibold"
                        >
                          Stok Edisi Rakyat
                        </Label>
                        <Input
                          id={`inv-rakyat-${branch.branchId}`}
                          type="number"
                          min={0}
                          max={100000}
                          value={counts.rakyatStock}
                          onChange={(e) =>
                            setDraftCounts((prev) => ({
                              ...prev,
                              [branch.branchId]: {
                                rakyatStock: Number.parseInt(
                                  e.target.value || "0",
                                  10,
                                ),
                                standardStock: counts.standardStock,
                              },
                            }))
                          }
                          className="min-h-11 font-mono text-xs bg-[var(--color-paper-2)]"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label
                          htmlFor={`inv-std-${branch.branchId}`}
                          className="text-[11px] font-semibold"
                        >
                          Stok Edisi Standar
                        </Label>
                        <Input
                          id={`inv-std-${branch.branchId}`}
                          type="number"
                          min={0}
                          max={100000}
                          value={counts.standardStock}
                          onChange={(e) =>
                            setDraftCounts((prev) => ({
                              ...prev,
                              [branch.branchId]: {
                                rakyatStock: counts.rakyatStock,
                                standardStock: Number.parseInt(
                                  e.target.value || "0",
                                  10,
                                ),
                              },
                            }))
                          }
                          className="min-h-11 font-mono text-xs bg-[var(--color-paper-2)]"
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--color-rule)]">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="min-h-11 px-4 text-xs cursor-pointer"
              >
                Tutup
              </Button>
              <Button
                type="submit"
                disabled={saveInventoryMutation.isPending}
                className="min-h-11 px-5 text-xs font-semibold bg-[var(--color-accent)] text-[var(--color-accent-ink)] hover:brightness-95 cursor-pointer"
              >
                {saveInventoryMutation.isPending
                  ? "Menyimpan..."
                  : "Simpan Stok"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </StudioDrawer>
  );
}

function BookInventoryDialog({
  publisherSlug,
  book,
  onClose,
}: {
  publisherSlug: string;
  book: BookSummaryDto | null;
  onClose: () => void;
}) {
  if (!book) return null;
  return (
    <BookInventoryForm
      key={book.id}
      publisherSlug={publisherSlug}
      book={book}
      onClose={onClose}
    />
  );
}

function PublisherProfileForm({ publisher }: { publisher: PublisherDto }) {
  const updateMutation = useUpdatePublisherProfile();
  const uploadMutation = useUploadMediaImage();
  const logoFileRef = useRef<HTMLInputElement>(null);
  const headerFileRef = useRef<HTMLInputElement>(null);
  const canEdit = canManagePublisherProfile(publisher.currentUserRole);

  const [name, setName] = useState(publisher.name);
  const [logoUrl, setLogoUrl] = useState(publisher.logoUrl || "");
  const [headerImageUrl, setHeaderImageUrl] = useState(
    publisher.headerImageUrl || "",
  );
  const [city, setCity] = useState(publisher.city || "");
  const [address, setAddress] = useState(publisher.address || "");
  const [contactEmail, setContactEmail] = useState(
    publisher.contactEmail || "",
  );
  const [description, setDescription] = useState(publisher.description || "");
  const [website, setWebsite] = useState(publisher.socialLinks?.website || "");
  const [instagram, setInstagram] = useState(
    publisher.socialLinks?.instagram || "",
  );
  const [twitter, setTwitter] = useState(publisher.socialLinks?.twitter || "");
  const [whatsapp, setWhatsapp] = useState(
    publisher.socialLinks?.whatsapp || "",
  );
  const [topics, setTopics] = useState<string[]>(() =>
    normalizePublisherTopics(publisher.topics ?? []),
  );
  const [topicInput, setTopicInput] = useState("");
  const [isAcceptingSubmissions, setIsAcceptingSubmissions] = useState(
    publisher.isAcceptingSubmissions ?? true,
  );
  const [submissionGuidelines, setSubmissionGuidelines] = useState(
    publisher.submissionGuidelines || "",
  );
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleAddTopic = (raw: string) => {
    if (!canEdit) return;
    const next = normalizePublisherTopics([...topics, raw]);
    setTopics(next);
    setTopicInput("");
  };

  const handleRemoveTopic = (topicToRemove: string) => {
    if (!canEdit) return;
    setTopics((prev) => prev.filter((item) => item !== topicToRemove));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    setFeedback(null);

    if (name.trim().length < 2) {
      setFeedback({ type: "error", text: "Nama penerbit minimal 2 karakter." });
      return;
    }

    try {
      await updateMutation.mutateAsync({
        slug: publisher.slug,
        input: {
          name: name.trim(),
          logoUrl: logoUrl.trim() || null,
          headerImageUrl: headerImageUrl.trim() || null,
          city: city.trim() || null,
          address: address.trim() || null,
          contactEmail: contactEmail.trim() || null,
          description: description.trim() || null,
          socialLinks:
            normalizeSocialLinks({ website, instagram, twitter, whatsapp }) ??
            null,
          topics: normalizePublisherTopics(topics),
          isAcceptingSubmissions,
          submissionGuidelines: submissionGuidelines.trim() || null,
        },
      });
      setFeedback({
        type: "success",
        text: "Profil, topik kurasi, dan pengaturan redaksi berhasil disimpan.",
      });
    } catch (error) {
      setFeedback({
        type: "error",
        text: extractErrorMessage(error, "Gagal memperbarui profil penerbit."),
      });
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-8 rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-5 sm:p-8"
    >
      {!canEdit && (
        <div
          role="status"
          className="rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper-3)] px-4 py-3 text-xs text-[var(--color-ink-2)]"
        >
          Hanya pemilik penerbit yang dapat mengubah profil dan pengaturan topik
          kurasi. Anda sedang melihat mode baca.
        </div>
      )}

      {feedback && (
        <div
          role={feedback.type === "error" ? "alert" : "status"}
          className={`rounded-xl border px-4 py-3 text-xs ${
            feedback.type === "error"
              ? "border-[var(--color-error)]/40 bg-[var(--color-error-soft)] text-[var(--color-ink)]"
              : "border-[var(--color-green)]/40 bg-[var(--color-green-soft)] text-[var(--color-ink)]"
          }`}
        >
          {feedback.text}
        </div>
      )}

      <fieldset disabled={!canEdit} className="space-y-5">
        <legend className="font-serif text-lg font-bold text-[var(--color-ink)]">
          Identitas &amp; Status Pengajuan
        </legend>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="studio-pub-name" className="text-xs font-semibold">
              Nama Penerbit
            </Label>
            <Input
              id="studio-pub-name"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="min-h-11 bg-[var(--color-paper)]"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="studio-pub-city" className="text-xs font-semibold">
              Kota / Basis Redaksi
            </Label>
            <Input
              id="studio-pub-city"
              name="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Contoh: Yogyakarta"
              className="min-h-11 bg-[var(--color-paper)]"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="studio-pub-email" className="text-xs font-semibold">
              Email Redaksi
            </Label>
            <Input
              id="studio-pub-email"
              name="contactEmail"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="redaksi@penerbit.id"
              className="min-h-11 bg-[var(--color-paper)]"
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="studio-pub-address"
              className="text-xs font-semibold"
            >
              Alamat Kantor
            </Label>
            <Input
              id="studio-pub-address"
              name="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Alamat lengkap penerbit"
              className="min-h-11 bg-[var(--color-paper)]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="studio-pub-logo" className="text-xs font-semibold">
              Logo Penerbit
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="studio-pub-logo"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://... atau unggah berkas"
                className="min-h-11 flex-1 font-mono text-xs bg-[var(--color-paper)]"
              />
              <input
                ref={logoFileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    try {
                      const uploaded = await uploadMutation.mutateAsync(file);
                      setLogoUrl(uploaded.url);
                    } catch (err) {
                      setFeedback({
                        type: "error",
                        text: extractErrorMessage(
                          err,
                          "Gagal mengunggah logo.",
                        ),
                      });
                    }
                  }
                  e.target.value = "";
                }}
              />
              <Button
                type="button"
                variant="outline"
                disabled={!canEdit || uploadMutation.isPending}
                onClick={() => logoFileRef.current?.click()}
                className="min-h-11 px-3 text-xs font-semibold cursor-pointer"
              >
                <Upload className="size-3.5 mr-1" aria-hidden="true" />
                Unggah
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="studio-pub-header"
              className="text-xs font-semibold"
            >
              Gambar Banner Profil
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="studio-pub-header"
                value={headerImageUrl}
                onChange={(e) => setHeaderImageUrl(e.target.value)}
                placeholder="https://... atau unggah berkas"
                className="min-h-11 flex-1 font-mono text-xs bg-[var(--color-paper)]"
              />
              <input
                ref={headerFileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    try {
                      const uploaded = await uploadMutation.mutateAsync(file);
                      setHeaderImageUrl(uploaded.url);
                    } catch (err) {
                      setFeedback({
                        type: "error",
                        text: extractErrorMessage(
                          err,
                          "Gagal mengunggah banner.",
                        ),
                      });
                    }
                  }
                  e.target.value = "";
                }}
              />
              <Button
                type="button"
                variant="outline"
                disabled={!canEdit || uploadMutation.isPending}
                onClick={() => headerFileRef.current?.click()}
                className="min-h-11 px-3 text-xs font-semibold cursor-pointer"
              >
                <Upload className="size-3.5 mr-1" aria-hidden="true" />
                Unggah
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="studio-pub-desc" className="text-xs font-semibold">
            Profil &amp; Misi Editorial
          </Label>
          <Textarea
            id="studio-pub-desc"
            name="description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="text-sm bg-[var(--color-paper)]"
          />
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] p-4">
          <input
            id="studio-accept-submissions"
            name="isAcceptingSubmissions"
            type="checkbox"
            checked={isAcceptingSubmissions}
            onChange={(e) => setIsAcceptingSubmissions(e.target.checked)}
            className="mt-1 size-4 cursor-pointer accent-[var(--color-accent)]"
          />
          <Label
            htmlFor="studio-accept-submissions"
            className="flex flex-col items-start gap-0.5 cursor-pointer font-normal"
          >
            <span className="text-sm font-semibold text-[var(--color-ink)]">
              Menerima Pengajuan Naskah Baru
            </span>
            <span className="text-xs text-[var(--color-muted)] leading-relaxed">
              Ketika aktif, penulis dapat memilih penerbit Anda di halaman
              profil publik maupun saat mengajukan draf dari Studio Menulis.
            </span>
          </Label>
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="studio-submission-guidelines"
            className="text-xs font-semibold"
          >
            Panduan Kirim Naskah (Ditampilkan ke Penulis)
          </Label>
          <Textarea
            id="studio-submission-guidelines"
            name="submissionGuidelines"
            rows={3}
            value={submissionGuidelines}
            onChange={(e) => setSubmissionGuidelines(e.target.value)}
            placeholder="Contoh: Sertakan sinopsis lengkap, minimal 3 bab contoh, dan sebutkan target pembaca buku Anda."
            className="text-sm bg-[var(--color-paper)]"
          />
        </div>
      </fieldset>

      <fieldset
        disabled={!canEdit}
        className="space-y-3 pt-2 border-t border-[var(--color-rule)]"
      >
        <legend className="font-serif text-lg font-bold text-[var(--color-ink)] pt-3">
          Topik Kurasi ({topics.length} / {MAX_PUBLISHER_TOPICS})
        </legend>
        <p className="text-xs text-[var(--color-muted)]">
          Topik kurasi memengaruhi peringkat pencarian saat penulis memilih
          penerbit tujuan berdasarkan kategori naskahnya.
        </p>

        <div className="flex flex-wrap gap-2">
          {topics.map((topic) => (
            <span
              key={topic}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-rule)] bg-[var(--color-paper-3)] px-3 py-1.5 text-xs font-medium text-[var(--color-ink)]"
            >
              <span>{topic}</span>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => handleRemoveTopic(topic)}
                  aria-label={`Hapus topik ${topic}`}
                  className="inline-flex size-5 items-center justify-center rounded-full hover:bg-[var(--color-paper)] hover:text-[var(--color-error)] cursor-pointer"
                >
                  <X className="size-3" aria-hidden="true" />
                </button>
              )}
            </span>
          ))}
        </div>

        {canEdit && topics.length < MAX_PUBLISHER_TOPICS && (
          <div className="space-y-3 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <Label htmlFor="studio-new-topic" className="sr-only">
                Tambah topik kurasi
              </Label>
              <Input
                id="studio-new-topic"
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (topicInput.trim()) handleAddTopic(topicInput);
                  }
                }}
                placeholder="Tambah topik kurasi baru..."
                className="min-h-11 max-w-xs text-xs bg-[var(--color-paper)]"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (topicInput.trim()) handleAddTopic(topicInput);
                }}
                className="min-h-11 px-4 text-xs cursor-pointer"
              >
                <Plus className="size-3.5 mr-1.5" aria-hidden="true" />
                Tambah Topik
              </Button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_TOPICS.filter(
                (preset) =>
                  !topics.some(
                    (existing) =>
                      existing.toLowerCase() === preset.toLowerCase(),
                  ),
              ).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleAddTopic(preset)}
                  className="min-h-11 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 text-xs text-[var(--color-muted)] hover:border-[var(--color-ink)] hover:text-[var(--color-ink)] cursor-pointer"
                >
                  + {preset}
                </button>
              ))}
            </div>
          </div>
        )}
      </fieldset>

      <fieldset
        disabled={!canEdit}
        className="space-y-4 pt-2 border-t border-[var(--color-rule)]"
      >
        <legend className="font-serif text-lg font-bold text-[var(--color-ink)] pt-3">
          Tautan Sosial &amp; Situs Web
        </legend>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label
              htmlFor="studio-social-website"
              className="text-xs font-semibold"
            >
              Situs Web
            </Label>
            <Input
              id="studio-social-website"
              name="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://penerbit.id"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              className="min-h-11 font-mono text-xs bg-[var(--color-paper)]"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="studio-social-ig" className="text-xs font-semibold">
              Instagram
            </Label>
            <Input
              id="studio-social-ig"
              name="instagram"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="@penerbit.id atau https://instagram.com/..."
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              className="min-h-11 font-mono text-xs bg-[var(--color-paper)]"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="studio-social-x" className="text-xs font-semibold">
              X / Twitter
            </Label>
            <Input
              id="studio-social-x"
              name="twitter"
              value={twitter}
              onChange={(e) => setTwitter(e.target.value)}
              placeholder="@penerbit atau https://x.com/..."
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              className="min-h-11 font-mono text-xs bg-[var(--color-paper)]"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="studio-social-wa" className="text-xs font-semibold">
              WhatsApp Redaksi
            </Label>
            <Input
              id="studio-social-wa"
              name="whatsapp"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="https://wa.me/628..."
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              className="min-h-11 font-mono text-xs bg-[var(--color-paper)]"
            />
          </div>
        </div>
      </fieldset>

      {canEdit && (
        <div className="flex justify-end pt-4 border-t border-[var(--color-rule)]">
          <Button
            type="submit"
            disabled={updateMutation.isPending}
            className="min-h-11 px-6 text-xs font-semibold bg-[var(--color-accent)] text-[var(--color-accent-ink)] hover:brightness-95 cursor-pointer"
          >
            {updateMutation.isPending
              ? "Menyimpan Profil..."
              : "Simpan Pengaturan Penerbit"}
          </Button>
        </div>
      )}
    </form>
  );
}

export function PublisherStudioView({
  publisher,
  activeTab: controlledTab,
  onTabChange,
  currentUserId,
}: {
  publisher: PublisherDto;
  activeTab?: PublisherStudioTab;
  onTabChange?: (tab: PublisherStudioTab) => void;
  currentUserId?: string;
}) {
  const navigate = useNavigate();
  const [internalTab, setInternalTab] = useState<PublisherStudioTab>("inbox");
  const activeTab = controlledTab ?? internalTab;

  const setActiveTab = (tab: PublisherStudioTab) => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setInternalTab(tab);
    }
  };

  // Inbox filters
  const [inboxQuery, setInboxQuery] = useState("");
  const [inboxStatus, setInboxStatus] = useState<string>("all");

  // Catalog edit & inventory modals
  const [editingBook, setEditingBook] = useState<BookSummaryDto | null>(null);
  const [inventoryBook, setInventoryBook] = useState<BookSummaryDto | null>(
    null,
  );

  // Team & approved writers state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<PublisherMemberRole>("editor");
  const [writerIdentifier, setWriterIdentifier] = useState("");
  const [writerFastTrack, setWriterFastTrack] = useState(true);
  const [teamFeedback, setTeamFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const role = publisher.currentUserRole ?? null;
  const canReview = canReviewManuscripts(role);
  const canEditBooks = canEditPublishedBooks(role);
  const canManageTeam = canManagePublisherTeam(role);

  // Role-gated queries so editor/finance trigger zero unauthorized background requests.
  const { data: manuscripts = [], isLoading: isInboxLoading } =
    usePublisherManuscripts(publisher.slug, canReview);
  const { data: books = [], isLoading: isCatalogLoading } = usePublisherBooks(
    publisher.slug,
    canEditBooks,
  );
  const { data: members = [], isLoading: isTeamLoading } = usePublisherMembers(
    publisher.slug,
    canManageTeam,
  );
  const { data: approvedWriters = [], isLoading: isWritersLoading } =
    usePublisherApprovedWriters(publisher.slug, canReview);

  const addMemberMutation = useAddPublisherMember();
  const updateMemberMutation = useUpdatePublisherMember();
  const removeMemberMutation = useRemovePublisherMember();
  const addWriterMutation = useAddPublisherApprovedWriter();
  const removeWriterMutation = useRemovePublisherApprovedWriter();

  const filteredManuscripts = manuscripts.filter((item) => {
    const matchesStatus = inboxStatus === "all" || item.status === inboxStatus;
    if (!matchesStatus) return false;
    const q = inboxQuery.trim().toLowerCase();
    if (!q) return true;
    return [
      item.title,
      item.authorName ?? "",
      item.authorPenName ?? "",
      item.category ?? "",
      item.synopsis ?? "",
    ]
      .join(" ")
      .toLowerCase()
      .includes(q);
  });

  const studioTabs = STUDIO_TABS.map((tab) => {
    const count =
      tab.id === "inbox"
        ? canReview
          ? manuscripts.length
          : null
        : tab.id === "catalog"
          ? canEditBooks
            ? books.length
            : null
          : tab.id === "team"
            ? canManageTeam
              ? members.length + approvedWriters.length
              : canReview
                ? approvedWriters.length
                : null
            : null;

    const icon =
      tab.id === "inbox" ? (
        <Inbox className="size-4" aria-hidden="true" />
      ) : tab.id === "catalog" ? (
        <BookOpen className="size-4" aria-hidden="true" />
      ) : tab.id === "team" ? (
        <Users className="size-4" aria-hidden="true" />
      ) : (
        <Settings2 className="size-4" aria-hidden="true" />
      );

    return { ...tab, count, icon };
  });

  const handleAddMember = async (e: FormEvent) => {
    e.preventDefault();
    setTeamFeedback(null);
    const cleanedEmail = inviteEmail.trim().toLowerCase();
    if (!cleanedEmail || !cleanedEmail.includes("@")) {
      setTeamFeedback({
        type: "error",
        text: "Masukkan alamat email pengguna AnzaBook yang valid.",
      });
      return;
    }

    try {
      await addMemberMutation.mutateAsync({
        slug: publisher.slug,
        input: { email: cleanedEmail, role: inviteRole },
      });
      setInviteEmail("");
      setTeamFeedback({
        type: "success",
        text: `Anggota ${cleanedEmail} berhasil ditambahkan ke tim redaksi.`,
      });
    } catch (error) {
      setTeamFeedback({
        type: "error",
        text: extractErrorMessage(error, "Gagal menambahkan anggota tim."),
      });
    }
  };

  const handleAddApprovedWriter = async (e: FormEvent) => {
    e.preventDefault();
    setTeamFeedback(null);
    const cleaned = writerIdentifier.trim();
    if (cleaned.length < 2) {
      setTeamFeedback({
        type: "error",
        text: "Masukkan email atau username penulis rekanan yang valid.",
      });
      return;
    }

    try {
      await addWriterMutation.mutateAsync({
        slug: publisher.slug,
        input: { identifier: cleaned, canFastTrack: writerFastTrack },
      });
      setWriterIdentifier("");
      setTeamFeedback({
        type: "success",
        text: `Penulis rekanan ${cleaned} berhasil ditambahkan.`,
      });
    } catch (error) {
      setTeamFeedback({
        type: "error",
        text: extractErrorMessage(error, "Gagal menambahkan penulis rekanan."),
      });
    }
  };

  return (
    <div className="space-y-6 pb-12 text-[var(--color-ink)]">
      {/* Studio Identity Header */}
      <EntityProfileHeader
        kind="publisher"
        headingLevel="h2"
        logoFit="contain"
        name={publisher.name}
        handleOrSlug={`/p/${publisher.slug}`}
        handleHref={`/p/${publisher.slug}`}
        avatarUrl={publisher.logoUrl}
        bannerUrl={publisher.headerImageUrl}
        bio={publisher.description}
        topics={publisher.topics ?? undefined}
        socialLinks={normalizeSocialLinks(publisher.socialLinks)}
        ariaLabel="Identitas Studio Penerbit"
        badges={[
          {
            label:
              publisher.verificationStatus === "verified"
                ? "Terverifikasi IKAPI"
                : publisher.verificationStatus,
            tone:
              publisher.verificationStatus === "verified"
                ? "success"
                : "neutral",
            icon: <ShieldCheck className="size-3.5" aria-hidden="true" />,
          },
          {
            label: `Peran Anda: ${formatRoleName(role)}`,
            tone: "accent",
          },
        ]}
        modeSwitcher={
          <div className="inline-flex items-center rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] p-1 text-xs">
            <Link
              to="/p/$slug"
              params={{ slug: publisher.slug }}
              className="inline-flex min-h-9 items-center rounded-lg px-3 font-medium text-[var(--color-muted)] hover:text-[var(--color-ink)]"
            >
              Halaman Publik
            </Link>
            <span className="inline-flex min-h-9 items-center rounded-lg bg-[var(--color-accent)] px-3 font-semibold text-[var(--color-accent-ink)]">
              Studio Redaksi
            </span>
          </div>
        }
        actions={
          <Link
            to="/p/$slug"
            params={{ slug: publisher.slug }}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] px-4 text-xs font-semibold text-[var(--color-ink)] hover:bg-[var(--color-paper-3)] focus-visible:outline-2 focus-visible:outline-[var(--color-focus)]"
          >
            <span>Lihat Halaman Publik</span>
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </Link>
        }
        metrics={[
          {
            label: "Naskah Masuk",
            value: canReview ? manuscripts.length : "—",
          },
          {
            label: "Buku Terbit",
            value: canEditBooks ? books.length : "—",
          },
          {
            label: "Penulis Rekanan",
            value: canReview ? approvedWriters.length : "—",
          },
          {
            label: "Anggota Tim",
            value: canManageTeam ? members.length : "—",
          },
        ]}
      />

      {/* Accessible Single-Row Horizontal Scrollable Tablist */}
      <ProfileTabs
        tabs={studioTabs}
        activeTab={activeTab}
        onChange={setActiveTab}
        ariaLabel="Navigasi Studio Penerbit"
        idPrefix="studio"
      />

      {/* Tab 1: Inbox Naskah */}
      {activeTab === "inbox" && (
        <section
          role="tabpanel"
          aria-labelledby="studio-tab-inbox"
          className="space-y-5"
        >
          <search className="flex flex-col gap-3 rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Label htmlFor="studio-inbox-search" className="sr-only">
                Cari naskah masuk berdasarkan judul atau penulis
              </Label>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--color-muted)]"
                aria-hidden="true"
              />
              <Input
                id="studio-inbox-search"
                type="search"
                value={inboxQuery}
                onChange={(e) => setInboxQuery(e.target.value)}
                placeholder="Cari judul naskah atau penulis..."
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                className="min-h-11 pl-9 text-xs bg-[var(--color-paper)]"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {INBOX_STATUS_FILTERS.map((filter) => {
                const isActive = inboxStatus === filter.id;
                return (
                  <button
                    key={filter.id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setInboxStatus(filter.id)}
                    className={`flex-none min-h-11 rounded-lg border px-3 text-xs font-medium cursor-pointer transition-colors ${
                      isActive
                        ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-paper)] font-semibold"
                        : "border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                    }`}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </search>

          {isInboxLoading ? (
            <div className="flex min-h-48 items-center justify-center rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper-2)]">
              <LoaderCircle
                className="size-6 animate-spin text-[var(--color-muted)]"
                aria-hidden="true"
              />
            </div>
          ) : filteredManuscripts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--color-rule)] bg-[var(--color-paper-2)] p-10 text-center space-y-2">
              <Inbox
                className="mx-auto size-8 text-[var(--color-muted)]"
                aria-hidden="true"
              />
              <p className="font-serif text-base font-semibold">
                Belum ada naskah yang cocok dengan filter ini.
              </p>
              <p className="text-xs text-[var(--color-muted)]">
                Naskah yang diajukan penulis ke redaksi {publisher.name} akan
                muncul otomatis di sini.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {filteredManuscripts.map((item) => (
                <li
                  key={item.id}
                  className="rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-5 space-y-3"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-serif text-lg font-bold text-[var(--color-ink)] break-words">
                          {item.title}
                        </h3>
                        <span
                          className={`rounded-md border px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wide ${getManuscriptStatusBadgeClass(
                            item.status,
                          )}`}
                        >
                          {formatManuscriptStatus(item.status)}
                        </span>
                        {item.isApprovedWriter && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-accent)]/50 bg-[var(--color-accent-soft)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--color-ink)]">
                            <Award className="size-3" aria-hidden="true" />
                            Penulis Rekanan
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[var(--color-muted)] font-mono">
                        <span>
                          Penulis:{" "}
                          <strong className="text-[var(--color-ink)]">
                            {item.authorPenName || item.authorName || "Anonim"}
                          </strong>
                        </span>
                        {item.category && <span>{item.category}</span>}
                        {item.sourceLanguage && (
                          <span>
                            {formatSourceLanguage(item.sourceLanguage)}
                          </span>
                        )}
                        {item.targetAudience && (
                          <span>
                            {formatTargetAudience(item.targetAudience)}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-[var(--color-ink-2)] line-clamp-2 leading-relaxed">
                        {item.synopsis || "Belum ada sinopsis naskah."}
                      </p>

                      {item.authorNotes && (
                        <p className="rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 py-2 text-xs text-[var(--color-ink-2)]">
                          <strong className="text-[var(--color-ink)]">
                            Catatan penulis:
                          </strong>{" "}
                          {item.authorNotes}
                        </p>
                      )}

                      {item.editorialNotes && (
                        <p className="rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 py-2 text-xs text-[var(--color-ink-2)]">
                          <strong className="text-[var(--color-ink)]">
                            Catatan redaksi:
                          </strong>{" "}
                          {item.editorialNotes}
                        </p>
                      )}
                    </div>

                    <Button
                      type="button"
                      onClick={() =>
                        navigate({
                          to: "/read/$slug",
                          params: { slug: `manuscript-${item.id}` },
                          search: {
                            editorial: canReview ? "edit" : "preview",
                            publisherSlug: publisher.slug,
                          },
                        })
                      }
                      className="min-h-11 shrink-0 rounded-xl bg-[var(--color-ink)] px-4 text-xs font-semibold text-[var(--color-paper)] hover:opacity-90 cursor-pointer"
                    >
                      <PenTool className="size-3.5 mr-1.5" aria-hidden="true" />
                      <span>
                        {canReview ? "Buka Editor Naskah" : "Lihat Naskah"}
                      </span>
                    </Button>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-rule)] pt-2.5 text-xs text-[var(--color-muted)] font-mono">
                    <span>
                      {item.chapters?.length || item.totalChapters || 1} bab,
                      diperbarui{" "}
                      {new Date(item.updatedAt).toLocaleDateString("id-ID")}
                    </span>
                    <span>
                      Skema:{" "}
                      <strong className="text-[var(--color-ink)] font-sans">
                        {formatDigitalPolicy(item.proposedDigitalPolicy)}
                      </strong>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Tab 2: Katalog Terbit */}
      {activeTab === "catalog" && (
        <section
          role="tabpanel"
          aria-labelledby="studio-tab-catalog"
          className="space-y-4"
        >
          {isCatalogLoading ? (
            <div className="flex min-h-48 items-center justify-center rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper-2)]">
              <LoaderCircle
                className="size-6 animate-spin text-[var(--color-muted)]"
                aria-hidden="true"
              />
            </div>
          ) : books.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--color-rule)] bg-[var(--color-paper-2)] p-10 text-center space-y-2">
              <BookOpen
                className="mx-auto size-8 text-[var(--color-muted)]"
                aria-hidden="true"
              />
              <p className="font-serif text-base font-semibold">
                Belum ada buku terbit di katalog penerbit ini.
              </p>
              <p className="text-xs text-[var(--color-muted)]">
                Naskah yang disetujui dan diterbitkan dari Inbox akan muncul di
                katalog resmi.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {books.map((book) => (
                <li
                  key={book.id}
                  className="rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="w-16 shrink-0">
                      <BookCover book={book} decorative />
                    </div>
                    <div className="space-y-1 min-w-0">
                      <h2 className="font-serif text-base font-bold text-[var(--color-ink)] truncate">
                        {book.title}
                      </h2>
                      <p className="text-xs text-[var(--color-muted)]">
                        {book.author} — {book.totalChapters} bab
                      </p>
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-mono">
                        <span className="rounded border border-[var(--color-rule)] bg-[var(--color-paper)] px-2 py-0.5 text-[var(--color-ink-2)]">
                          {formatDigitalPolicy(book.digitalPolicy)}
                        </span>
                        <span className="text-[var(--color-muted)]">
                          {formatPriceIdr(book.digitalPriceIdr)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Link
                      to="/books/$slug"
                      params={{ slug: book.slug }}
                      className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] px-3.5 text-xs font-semibold text-[var(--color-ink)] hover:bg-[var(--color-paper-3)]"
                    >
                      Halaman Buku
                    </Link>
                    {canEditBooks && (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setInventoryBook(book)}
                          className="min-h-11 rounded-xl border-[var(--color-rule)] bg-[var(--color-paper)] px-3.5 text-xs font-semibold text-[var(--color-ink)] hover:bg-[var(--color-paper-3)] cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <Store className="size-3.5" aria-hidden="true" />
                          <span>Stok Toko</span>
                        </Button>
                        <Button
                          type="button"
                          onClick={() => setEditingBook(book)}
                          className="min-h-11 rounded-xl bg-[var(--color-accent)] px-4 text-xs font-semibold text-[var(--color-accent-ink)] hover:brightness-95 cursor-pointer"
                        >
                          Edit Metadata
                        </Button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <EditPublishedBookDialog
            publisherSlug={publisher.slug}
            book={editingBook}
            onClose={() => setEditingBook(null)}
          />
          <BookInventoryDialog
            publisherSlug={publisher.slug}
            book={inventoryBook}
            onClose={() => setInventoryBook(null)}
          />
        </section>
      )}

      {/* Tab 3: Tim Redaksi */}
      {activeTab === "team" && (
        <section
          role="tabpanel"
          aria-labelledby="studio-tab-team"
          className="space-y-6"
        >
          {teamFeedback && (
            <div
              role={teamFeedback.type === "error" ? "alert" : "status"}
              className={`rounded-xl border px-4 py-3 text-xs ${
                teamFeedback.type === "error"
                  ? "border-[var(--color-error)]/40 bg-[var(--color-error-soft)] text-[var(--color-ink)]"
                  : "border-[var(--color-green)]/40 bg-[var(--color-green-soft)] text-[var(--color-ink)]"
              }`}
            >
              {teamFeedback.text}
            </div>
          )}

          {canManageTeam ? (
            <form
              onSubmit={handleAddMember}
              className="rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-5 space-y-4"
            >
              <div className="space-y-1">
                <h2 className="font-serif text-lg font-bold">
                  Tambah Anggota Tim Redaksi
                </h2>
                <p className="text-xs text-[var(--color-muted)]">
                  Berikan peran Editor Redaksi untuk menyunting &amp;
                  menerbitkan naskah, atau Staf Keuangan untuk laporan
                  penjualan.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-[1fr_11rem_auto] gap-3 items-end">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="invite-member-email"
                    className="text-xs font-semibold"
                  >
                    Email Anggota
                  </Label>
                  <Input
                    id="invite-member-email"
                    name="email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="editor@domain.id"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    required
                    className="min-h-11 bg-[var(--color-paper)] text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="invite-member-role"
                    className="text-xs font-semibold"
                  >
                    Peran
                  </Label>
                  <select
                    id="invite-member-role"
                    name="role"
                    value={inviteRole}
                    onChange={(e) =>
                      setInviteRole(e.target.value as PublisherMemberRole)
                    }
                    className="w-full h-11 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 text-xs text-[var(--color-ink)]"
                  >
                    <option value="editor">Editor Redaksi</option>
                    <option value="finance">Staf Keuangan</option>
                  </select>
                </div>

                <Button
                  type="submit"
                  disabled={addMemberMutation.isPending}
                  className="min-h-11 px-5 text-xs font-semibold bg-[var(--color-accent)] text-[var(--color-accent-ink)] hover:brightness-95 cursor-pointer"
                >
                  {addMemberMutation.isPending
                    ? "Menambahkan..."
                    : "Tambah Anggota"}
                </Button>
              </div>
            </form>
          ) : (
            <div
              role="status"
              className="rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] px-4 py-3 text-xs text-[var(--color-muted)]"
            >
              Hanya pemilik penerbit yang dapat menambah atau mengubah peran tim
              redaksi.
            </div>
          )}

          {isTeamLoading ? (
            <div className="flex min-h-40 items-center justify-center rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper-2)]">
              <LoaderCircle
                className="size-6 animate-spin text-[var(--color-muted)]"
                aria-hidden="true"
              />
            </div>
          ) : members.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--color-rule)] bg-[var(--color-paper-2)] p-8 text-center text-xs text-[var(--color-muted)]">
              Belum ada data anggota redaksi yang ditampilkan.
            </div>
          ) : (
            <ul className="divide-y divide-[var(--color-rule)] rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper-2)]">
              {members.map((member) => {
                const isSelf = Boolean(
                  currentUserId && member.userId === currentUserId,
                );
                return (
                  <li
                    key={member.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:px-5"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {member.image ? (
                        <img
                          src={member.image}
                          alt={member.name}
                          className="size-10 rounded-full object-cover border border-[var(--color-rule)] shrink-0"
                        />
                      ) : (
                        <div className="size-10 rounded-full border border-[var(--color-rule)] bg-[var(--color-paper-3)] flex items-center justify-center font-serif font-bold text-sm shrink-0">
                          {member.name.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">
                          {member.name}
                          {isSelf ? " (Anda)" : ""}
                        </p>
                        <p className="text-xs text-[var(--color-muted)] font-mono truncate">
                          {member.email ||
                            (member.username ? `@${member.username}` : "Tim")}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {canManageTeam && !isSelf ? (
                        <>
                          <Label
                            htmlFor={`member-role-${member.id}`}
                            className="sr-only"
                          >
                            Ubah peran {member.name}
                          </Label>
                          <select
                            id={`member-role-${member.id}`}
                            value={member.role}
                            disabled={updateMemberMutation.isPending}
                            onChange={async (e) => {
                              setTeamFeedback(null);
                              try {
                                await updateMemberMutation.mutateAsync({
                                  slug: publisher.slug,
                                  memberId: member.id,
                                  input: {
                                    role: e.target.value as PublisherMemberRole,
                                  },
                                });
                                setTeamFeedback({
                                  type: "success",
                                  text: `Peran ${member.name} diperbarui.`,
                                });
                              } catch (error) {
                                setTeamFeedback({
                                  type: "error",
                                  text: extractErrorMessage(
                                    error,
                                    "Gagal mengubah peran anggota.",
                                  ),
                                });
                              }
                            }}
                            className="h-11 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 text-xs text-[var(--color-ink)]"
                          >
                            <option value="owner">Pemilik</option>
                            <option value="editor">Editor Redaksi</option>
                            <option value="finance">Staf Keuangan</option>
                          </select>
                          <Button
                            type="button"
                            variant="outline"
                            disabled={removeMemberMutation.isPending}
                            aria-label={`Keluarkan ${member.name}`}
                            onClick={async () => {
                              setTeamFeedback(null);
                              try {
                                await removeMemberMutation.mutateAsync({
                                  slug: publisher.slug,
                                  memberId: member.id,
                                });
                                setTeamFeedback({
                                  type: "success",
                                  text: `${member.name} dihapus dari tim redaksi.`,
                                });
                              } catch (error) {
                                setTeamFeedback({
                                  type: "error",
                                  text: extractErrorMessage(
                                    error,
                                    "Gagal mengeluarkan anggota.",
                                  ),
                                });
                              }
                            }}
                            className="min-h-11 min-w-11 px-3 text-xs text-[var(--color-error)] hover:bg-[var(--color-error-soft)] cursor-pointer"
                          >
                            <Trash2 className="size-4" aria-hidden="true" />
                          </Button>
                        </>
                      ) : (
                        <span className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 text-xs font-mono font-medium">
                          <CheckCircle2
                            className="size-3.5 text-[var(--color-green)]"
                            aria-hidden="true"
                          />
                          {formatRoleName(member.role)}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Section B: Penulis Rekanan (Owner & Editor) */}
          {canReview && (
            <div className="space-y-4 border-t border-[var(--color-rule)] pt-6">
              <form
                onSubmit={handleAddApprovedWriter}
                className="rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-5 space-y-4"
              >
                <div className="space-y-1">
                  <h2 className="font-serif text-lg font-bold flex items-center gap-2">
                    <Award
                      className="size-4 text-[var(--color-accent)]"
                      aria-hidden="true"
                    />
                    <span>Penulis Rekanan ({approvedWriters.length})</span>
                  </h2>
                  <p className="text-xs text-[var(--color-muted)] leading-relaxed">
                    Penulis rekanan tetap dapat mengajukan naskah lewat jalur
                    prioritas meskipun penerimaan publik sedang ditutup, serta
                    ditampilkan di halaman profil penerbit.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3 items-end">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="approved-writer-identifier"
                      className="text-xs font-semibold"
                    >
                      Email atau Username Penulis
                    </Label>
                    <Input
                      id="approved-writer-identifier"
                      name="identifier"
                      value={writerIdentifier}
                      onChange={(e) => setWriterIdentifier(e.target.value)}
                      placeholder="penulis@domain.id atau @username"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      className="min-h-11 bg-[var(--color-paper)] text-xs"
                    />
                  </div>

                  <label className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={writerFastTrack}
                      onChange={(e) => setWriterFastTrack(e.target.checked)}
                      className="size-4 accent-[var(--color-accent)]"
                    />
                    <span>Jalur Prioritas</span>
                  </label>

                  <Button
                    type="submit"
                    disabled={addWriterMutation.isPending}
                    className="min-h-11 px-5 text-xs font-semibold bg-[var(--color-accent)] text-[var(--color-accent-ink)] hover:brightness-95 cursor-pointer"
                  >
                    {addWriterMutation.isPending
                      ? "Menambahkan..."
                      : "Tambah Penulis"}
                  </Button>
                </div>
              </form>

              {isWritersLoading ? (
                <div className="flex min-h-32 items-center justify-center rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper-2)]">
                  <LoaderCircle
                    className="size-5 animate-spin text-[var(--color-muted)]"
                    aria-hidden="true"
                  />
                </div>
              ) : approvedWriters.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--color-rule)] bg-[var(--color-paper-2)] p-8 text-center text-xs text-[var(--color-muted)]">
                  Belum ada penulis rekanan terdaftar.
                </div>
              ) : (
                <ul className="divide-y divide-[var(--color-rule)] rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper-2)]">
                  {approvedWriters.map((writer) => {
                    const displayName =
                      writer.name || writer.invitedEmail || "Penulis Rekanan";
                    return (
                      <li
                        key={writer.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:px-5"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {writer.image ? (
                            <img
                              src={writer.image}
                              alt={displayName}
                              className="size-10 rounded-full object-cover border border-[var(--color-rule)] shrink-0"
                            />
                          ) : (
                            <div className="size-10 rounded-full border border-[var(--color-rule)] bg-[var(--color-paper-3)] flex items-center justify-center font-serif font-bold text-sm shrink-0">
                              {displayName.slice(0, 1).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold truncate">
                                {displayName}
                              </p>
                              {writer.canFastTrack && (
                                <span className="rounded-full border border-[var(--color-accent)]/50 bg-[var(--color-accent-soft)] px-2 py-0.5 text-[10px] font-semibold">
                                  Jalur Prioritas
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-muted)] font-mono truncate">
                              <span>{writer.invitedEmail || "Terdaftar"}</span>
                              {writer.username && (
                                <span>@{writer.username}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          disabled={removeWriterMutation.isPending}
                          aria-label={`Hapus ${displayName} dari penulis rekanan`}
                          onClick={async () => {
                            setTeamFeedback(null);
                            try {
                              await removeWriterMutation.mutateAsync({
                                slug: publisher.slug,
                                writerId: writer.id,
                              });
                              setTeamFeedback({
                                type: "success",
                                text: `${displayName} dihapus dari daftar penulis rekanan.`,
                              });
                            } catch (error) {
                              setTeamFeedback({
                                type: "error",
                                text: extractErrorMessage(
                                  error,
                                  "Gagal menghapus penulis rekanan.",
                                ),
                              });
                            }
                          }}
                          className="min-h-11 min-w-11 px-3 text-xs text-[var(--color-error)] hover:bg-[var(--color-error-soft)] cursor-pointer self-end sm:self-auto"
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </section>
      )}

      {/* Tab 4: Profil & Topik Kurasi */}
      {activeTab === "profile" && (
        <section role="tabpanel" aria-labelledby="studio-tab-profile">
          <PublisherProfileForm key={publisher.id} publisher={publisher} />
        </section>
      )}
    </div>
  );
}
