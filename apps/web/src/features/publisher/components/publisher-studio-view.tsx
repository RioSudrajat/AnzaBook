import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
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
  Trash2,
  Users,
  X,
} from "lucide-react";
import type {
  BookSummaryDto,
  DigitalPolicy,
  PublisherDto,
  PublisherMemberRole,
} from "@starter/shared/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BookCover } from "@/features/books/components/book-cover";
import {
  useAddPublisherMember,
  usePublisherBooks,
  usePublisherManuscripts,
  usePublisherMembers,
  useRemovePublisherMember,
  useUpdatePublisherBook,
  useUpdatePublisherMember,
  useUpdatePublisherProfile,
} from "@/features/social/hooks";
import { ApiError } from "@/lib/api/client";
import {
  formatDigitalPolicy,
  formatManuscriptStatus,
  formatRoleName,
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
  { id: "team", label: "Tim Redaksi" },
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

const DIGITAL_POLICIES: DigitalPolicy[] = [
  "hybrid_nakama_alacarte",
  "sample_only",
  "alacarte_only",
  "print_claim_only",
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

  const [title, setTitle] = useState(book.title);
  const [synopsis, setSynopsis] = useState(book.synopsis || "");
  const [coverUrl, setCoverUrl] = useState(book.coverUrl || "");
  const [digitalPolicy, setDigitalPolicy] = useState<DigitalPolicy>(
    book.digitalPolicy,
  );
  const [alacartePriceIdr, setAlacartePriceIdr] = useState(
    book.alacartePriceIdr != null ? String(book.alacartePriceIdr) : "",
  );
  const [categoriesText, setCategoriesText] = useState(
    (book.categories ?? []).join(", "),
  );
  const [formError, setFormError] = useState<string | null>(null);

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

    const parsedPrice = alacartePriceIdr.trim()
      ? Number.parseInt(alacartePriceIdr.trim(), 10)
      : null;

    if (
      parsedPrice !== null &&
      (!Number.isFinite(parsedPrice) ||
        parsedPrice < 0 ||
        parsedPrice > 10_000_000)
    ) {
      setFormError("Harga a la carte harus antara 0 hingga 10.000.000.");
      return;
    }

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
          digitalPolicy,
          alacartePriceIdr: parsedPrice,
          categories,
        },
      });
      onClose();
    } catch (error) {
      setFormError(
        extractErrorMessage(error, "Gagal menyimpan perubahan buku."),
      );
    }
  };

  return (
    <div className="space-y-5 p-6 text-[var(--color-ink)]">
      <div className="flex items-start justify-between gap-4 border-b border-[var(--color-rule)] pb-4">
        <div className="space-y-1">
          <h1
            id="edit-book-dialog-title"
            className="font-serif text-lg font-bold"
          >
            Edit Metadata Buku Terbit
          </h1>
          <p className="text-xs text-[var(--color-muted)]">{book.title}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup editor metadata buku"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-[var(--color-muted)] hover:bg-[var(--color-paper-3)] hover:text-[var(--color-ink)] cursor-pointer shrink-0"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
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
          <Label htmlFor="edit-book-synopsis" className="text-xs font-semibold">
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
            URL Sampul Buku
          </Label>
          <Input
            id="edit-book-cover"
            name="coverUrl"
            value={coverUrl}
            onChange={(e) => setCoverUrl(e.target.value)}
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="https://... atau /covers/sampul.jpg"
            className="min-h-11 font-mono text-xs bg-[var(--color-paper)]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="edit-book-policy" className="text-xs font-semibold">
              Skema Distribusi
            </Label>
            <select
              id="edit-book-policy"
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
            <Label htmlFor="edit-book-price" className="text-xs font-semibold">
              Harga A La Carte (IDR)
            </Label>
            <Input
              id="edit-book-price"
              name="alacartePriceIdr"
              type="text"
              inputMode="numeric"
              value={alacartePriceIdr}
              onChange={(e) => setAlacartePriceIdr(e.target.value)}
              placeholder="49000"
              className="min-h-11 font-mono text-xs bg-[var(--color-paper)]"
            />
          </div>
        </div>

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
            {updateBookMutation.isPending ? "Menyimpan..." : "Simpan Metadata"}
          </Button>
        </div>
      </form>
    </div>
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
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (book && !el.open) {
      el.showModal();
    } else if (!book && el.open) {
      el.close();
    }
  }, [book]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="edit-book-dialog-title"
      onClose={() => {
        if (dialogRef.current) dialogRef.current.returnValue = "";
        if (book) onClose();
      }}
      className="m-auto w-[min(94vw,34rem)] max-h-[90vh] overflow-y-auto overscroll-contain rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-0 shadow-2xl backdrop:bg-black/65 backdrop:overflow-hidden backdrop:overscroll-contain"
    >
      {book && (
        <EditPublishedBookForm
          key={book.id}
          publisherSlug={publisherSlug}
          book={book}
          onClose={onClose}
        />
      )}
    </dialog>
  );
}

function PublisherProfileForm({ publisher }: { publisher: PublisherDto }) {
  const updateMutation = useUpdatePublisherProfile();
  const canEdit = canManagePublisherProfile(publisher.currentUserRole);

  const [name, setName] = useState(publisher.name);
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

  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Inbox filters
  const [inboxQuery, setInboxQuery] = useState("");
  const [inboxStatus, setInboxStatus] = useState<string>("all");

  // Catalog edit modal
  const [editingBook, setEditingBook] = useState<BookSummaryDto | null>(null);

  // Team management state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<PublisherMemberRole>("editor");
  const [teamFeedback, setTeamFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const { data: manuscripts = [], isLoading: isInboxLoading } =
    usePublisherManuscripts(publisher.slug);
  const { data: books = [], isLoading: isCatalogLoading } = usePublisherBooks(
    publisher.slug,
  );
  const { data: members = [], isLoading: isTeamLoading } = usePublisherMembers(
    publisher.slug,
  );

  const addMemberMutation = useAddPublisherMember();
  const updateMemberMutation = useUpdatePublisherMember();
  const removeMemberMutation = useRemovePublisherMember();

  const role = publisher.currentUserRole ?? null;
  const canReview = canReviewManuscripts(role);
  const canEditBooks = canEditPublishedBooks(role);
  const canManageTeam = canManagePublisherTeam(role);

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

  const handleTabKeyDown = (
    e: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    let nextIndex: number | null = null;
    if (e.key === "ArrowRight") nextIndex = (index + 1) % STUDIO_TABS.length;
    if (e.key === "ArrowLeft")
      nextIndex = (index - 1 + STUDIO_TABS.length) % STUDIO_TABS.length;
    if (e.key === "Home") nextIndex = 0;
    if (e.key === "End") nextIndex = STUDIO_TABS.length - 1;

    if (nextIndex !== null) {
      e.preventDefault();
      const targetTab = STUDIO_TABS[nextIndex];
      setActiveTab(targetTab.id);
      const btn = tabRefs.current[targetTab.id];
      btn?.focus();
      btn?.scrollIntoView({
        block: "nearest",
        inline: "nearest",
      });
    }
  };

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

  return (
    <div className="space-y-6 pb-12 text-[var(--color-ink)]">
      {/* Studio Identity Header */}
      <header className="rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-5 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-start sm:items-center gap-4 min-w-0">
          {publisher.logoUrl ? (
            <img
              src={publisher.logoUrl}
              alt={publisher.name}
              className="size-16 rounded-xl object-contain border border-[var(--color-rule)] bg-[var(--color-paper)] p-1.5 shrink-0"
            />
          ) : (
            <div className="size-16 rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper-3)] flex items-center justify-center font-serif text-2xl font-bold shrink-0">
              {publisher.name.slice(0, 1).toUpperCase()}
            </div>
          )}

          <div className="space-y-1.5 min-w-0">
            <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight truncate">
              {publisher.name}
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              <span className="inline-flex items-center gap-1 rounded-md border border-[var(--color-rule)] bg-[var(--color-paper)] px-2.5 py-0.5 text-[var(--color-ink-2)]">
                <ShieldCheck
                  className="size-3.5 text-[var(--color-green)]"
                  aria-hidden="true"
                />
                {publisher.verificationStatus === "verified"
                  ? "Terverifikasi IKAPI"
                  : publisher.verificationStatus}
              </span>
              <span className="inline-flex items-center rounded-md border border-[var(--color-accent)]/40 bg-[var(--color-accent-soft)] px-2.5 py-0.5 font-semibold text-[var(--color-ink)]">
                Peran Anda: {formatRoleName(role)}
              </span>
              <span className="text-[var(--color-muted)]">
                /p/{publisher.slug}
              </span>
            </div>
          </div>
        </div>

        <Link
          to="/p/$slug"
          params={{ slug: publisher.slug }}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] px-4 text-xs font-semibold text-[var(--color-ink)] hover:bg-[var(--color-paper-3)] focus-visible:outline-2 focus-visible:outline-[var(--color-focus)]"
        >
          <span>Lihat Halaman Publik</span>
          <ExternalLink className="size-3.5" aria-hidden="true" />
        </Link>
      </header>

      {/* Accessible Single-Row Horizontal Scrollable Tablist */}
      <div
        role="tablist"
        aria-label="Navigasi Studio Penerbit"
        className="flex items-center gap-1 overflow-x-auto border-b border-[var(--color-rule)]"
      >
        {STUDIO_TABS.map((tab, index) => {
          const isSelected = activeTab === tab.id;
          const countBadge =
            tab.id === "inbox"
              ? manuscripts.length
              : tab.id === "catalog"
                ? books.length
                : tab.id === "team"
                  ? members.length
                  : null;

          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[tab.id] = el;
              }}
              id={`studio-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={isSelected}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(e) => handleTabKeyDown(e, index)}
              className={`relative flex-none min-h-11 px-4 text-xs sm:text-sm font-medium whitespace-nowrap cursor-pointer inline-flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-[var(--color-focus)] ${
                isSelected
                  ? "text-[var(--color-ink)] font-semibold after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:border-b-3 after:border-[var(--color-accent)]"
                  : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
              }`}
            >
              {tab.id === "inbox" && (
                <Inbox className="size-4" aria-hidden="true" />
              )}
              {tab.id === "catalog" && (
                <BookOpen className="size-4" aria-hidden="true" />
              )}
              {tab.id === "team" && (
                <Users className="size-4" aria-hidden="true" />
              )}
              {tab.id === "profile" && (
                <Settings2 className="size-4" aria-hidden="true" />
              )}
              <span>{tab.label}</span>
              {countBadge !== null && (
                <span className="rounded-md bg-[var(--color-paper-3)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--color-ink-2)]">
                  {countBadge}
                </span>
              )}
            </button>
          );
        })}
      </div>

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
                      </div>

                      <p className="text-xs text-[var(--color-muted)] font-mono">
                        Penulis:{" "}
                        <strong className="text-[var(--color-ink)]">
                          {item.authorPenName || item.authorName || "Anonim"}
                        </strong>
                        {item.category ? ` · ${item.category}` : ""}
                      </p>

                      <p className="text-xs text-[var(--color-ink-2)] line-clamp-2 leading-relaxed">
                        {item.synopsis || "Belum ada sinopsis naskah."}
                      </p>

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
                      {item.chapters?.length || item.totalChapters || 1} bab ·
                      Diperbarui{" "}
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
                        {book.author} · {book.totalChapters} bab
                      </p>
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-mono">
                        <span className="rounded border border-[var(--color-rule)] bg-[var(--color-paper)] px-2 py-0.5 text-[var(--color-ink-2)]">
                          {formatDigitalPolicy(book.digitalPolicy)}
                        </span>
                        <span className="text-[var(--color-muted)]">
                          {formatPriceIdr(book.alacartePriceIdr)}
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
                      <Button
                        type="button"
                        onClick={() => setEditingBook(book)}
                        className="min-h-11 rounded-xl bg-[var(--color-accent)] px-4 text-xs font-semibold text-[var(--color-accent-ink)] hover:brightness-95 cursor-pointer"
                      >
                        Edit Metadata
                      </Button>
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
