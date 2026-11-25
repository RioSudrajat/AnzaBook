import { useEffect, useRef, useState } from "react";
import {
  createFileRoute,
  Link,
  notFound,
  useNavigate,
} from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  Building2,
  FileText,
  Globe,
  Mail,
  MapPin,
  PenTool,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BookCatalogCard } from "@/features/books/components/book-catalog-card";
import { useBooks } from "@/features/books/hooks";
import { booksListQuery } from "@/features/books/queries";
import { PageFrame } from "@/features/dashboard/components/page-frame";
import { canAccessPublisherStudio } from "@/features/publisher/publisher-helpers";
import {
  useCreateManuscriptDraft,
  useMyManuscripts,
  usePublisher,
  useSubmitManuscriptDraft,
} from "@/features/social/hooks";
import { publisherDetailQuery } from "@/features/social/queries";
import { ApiError } from "@/lib/api/client";

export const Route = createFileRoute("/p/$slug")({
  loader: async ({ context, params }) => {
    try {
      const publisher = await context.queryClient.ensureQueryData(
        publisherDetailQuery(params.slug),
      );
      const booksData = await context.queryClient.ensureQueryData(
        booksListQuery({ publisher: params.slug }),
      );
      return { publisher, booksData };
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) throw notFound();
      throw error;
    }
  },
  head: ({ loaderData }) => {
    const name = loaderData?.publisher?.name;
    const title = name
      ? `${name} — Mitra Penerbit Resmi | AnzaBook`
      : "Mitra Penerbit | AnzaBook";
    return { meta: [{ title }] };
  },
  component: PublisherPublicProfilePage,
});

function DraftPickerDialog({
  isOpen,
  onClose,
  publisherId,
  publisherName,
}: {
  isOpen: boolean;
  onClose: () => void;
  publisherId: string;
  publisherName: string;
}) {
  const navigate = useNavigate();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { data: myManuscripts = [] } = useMyManuscripts(isOpen);
  const submitDraftMutation = useSubmitManuscriptDraft();
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (isOpen && !el.open) {
      el.showModal();
    } else if (!isOpen && el.open) {
      el.close();
    }
  }, [isOpen]);

  const eligibleDrafts = myManuscripts.filter(
    (item) => item.status === "draft" || item.status === "revision_requested",
  );

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="draft-picker-title"
      onClose={() => {
        if (dialogRef.current) dialogRef.current.returnValue = "";
        if (isOpen) onClose();
      }}
      className="m-auto w-[min(94vw,34rem)] max-h-[85vh] overflow-y-auto overscroll-contain rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-0 shadow-2xl backdrop:bg-black/65 backdrop:overflow-hidden backdrop:overscroll-contain"
    >
      {isOpen && (
        <div className="p-6 space-y-5 text-[var(--color-ink)]">
          <div className="flex items-start justify-between gap-4 border-b border-[var(--color-rule)] pb-4">
            <div className="space-y-1">
              <h1
                id="draft-picker-title"
                className="font-serif text-lg font-bold"
              >
                Pilih Draf untuk Redaksi {publisherName}
              </h1>
              <p className="text-xs text-[var(--color-muted)]">
                Lanjutkan menyunting draf Anda dengan tujuan penerbit ini atau
                kirim langsung ke inbox redaksi.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup pemilih draf"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-[var(--color-muted)] hover:bg-[var(--color-paper-3)] hover:text-[var(--color-ink)] cursor-pointer"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>

          {feedback && (
            <div
              role={feedback.type === "error" ? "alert" : "status"}
              className={`rounded-xl border px-3.5 py-2.5 text-xs ${
                feedback.type === "error"
                  ? "border-[var(--color-error)]/40 bg-[var(--color-error-soft)]"
                  : "border-[var(--color-green)]/40 bg-[var(--color-green-soft)]"
              }`}
            >
              {feedback.text}
            </div>
          )}

          {eligibleDrafts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--color-rule)] p-6 text-center space-y-2 text-xs text-[var(--color-muted)]">
              <p>Anda belum memiliki draf siap kirim.</p>
              <p>Gunakan tombol &ldquo;Tulis Draf Baru&rdquo; untuk memulai.</p>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {eligibleDrafts.map((draft) => (
                <li
                  key={draft.id}
                  className="rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] p-4 space-y-3"
                >
                  <div>
                    <h2 className="font-serif text-sm font-bold">
                      {draft.title || "Draf Tanpa Judul"}
                    </h2>
                    <p className="text-xs text-[var(--color-muted)] line-clamp-2 mt-0.5">
                      {draft.synopsis || "Sinopsis belum diisi."}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        onClose();
                        void navigate({
                          to: "/read/$slug",
                          params: { slug: `manuscript-${draft.id}` },
                          search: {
                            editorial: "edit",
                            targetPublisherId: publisherId,
                          },
                        });
                      }}
                      className="min-h-11 px-3.5 text-xs cursor-pointer"
                    >
                      <PenTool className="size-3.5 mr-1.5" aria-hidden="true" />
                      Buka Editor
                    </Button>
                    <Button
                      type="button"
                      disabled={submitDraftMutation.isPending}
                      onClick={async () => {
                        setFeedback(null);
                        try {
                          await submitDraftMutation.mutateAsync({
                            idOrSlug: draft.id,
                            publisherId,
                          });
                          setFeedback({
                            type: "success",
                            text: `Draf "${draft.title}" berhasil dikirim ke redaksi ${publisherName}.`,
                          });
                        } catch (error) {
                          setFeedback({
                            type: "error",
                            text:
                              error instanceof Error
                                ? error.message
                                : "Gagal mengirim draf. Pastikan judul dan sinopsis sudah lengkap.",
                          });
                        }
                      }}
                      className="min-h-11 px-4 text-xs font-semibold bg-[var(--color-accent)] text-[var(--color-accent-ink)] hover:brightness-95 cursor-pointer"
                    >
                      <Send className="size-3.5 mr-1.5" aria-hidden="true" />
                      Kirim Langsung
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </dialog>
  );
}

export default function PublisherPublicProfilePage() {
  const { slug } = Route.useParams();
  const sessionUser = Route.useRouteContext().session?.user;
  const { data: publisher } = usePublisher(slug);
  const { data: booksResponse } = useBooks({ publisher: slug });
  const { data: myManuscripts = [] } = useMyManuscripts(Boolean(sessionUser));
  const createDraftMutation = useCreateManuscriptDraft();

  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"books" | "about">("books");
  const [isDraftPickerOpen, setIsDraftPickerOpen] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);

  if (!publisher) return null;

  const publishedBooks = booksResponse?.data || [];
  const hasStudioAccess = canAccessPublisherStudio(publisher.currentUserRole);
  const isAccepting =
    publisher.verificationStatus === "verified" &&
    publisher.isAcceptingSubmissions !== false;
  const isApprovedWriterFastTrack =
    publisher.verificationStatus === "verified" &&
    !isAccepting &&
    Boolean(publisher.isCurrentUserApprovedWriter);
  const canSubmitToPublisher = isAccepting || isApprovedWriterFastTrack;
  const approvedWritersShowcase = publisher.approvedWriters ?? [];
  const eligibleDraftCount = myManuscripts.filter(
    (item) => item.status === "draft" || item.status === "revision_requested",
  ).length;

  const handleStartNewDraftForPublisher = async () => {
    setDraftError(null);
    try {
      const created = await createDraftMutation.mutateAsync({
        publisherId: publisher.id,
        title: `Draf untuk ${publisher.name}`,
        synopsis: "",
        proposedDigitalPolicy: "nakama_or_purchase",
      });
      await navigate({
        to: "/read/$slug",
        params: { slug: `manuscript-${created.id}` },
        search: {
          editorial: "edit",
          targetPublisherId: publisher.id,
        },
      });
    } catch (error) {
      setDraftError(
        error instanceof Error
          ? error.message
          : "Gagal membuat draf naskah baru.",
      );
    }
  };

  return (
    <PageFrame
      user={sessionUser}
      activeTab={hasStudioAccess ? "profile" : "explore"}
      title={publisher.name}
    >
      <div className="space-y-8 pb-12 text-[var(--color-ink)]">
        {/* Publisher Hero Banner */}
        <section
          aria-labelledby="publisher-heading"
          className="rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-6 sm:p-9 space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              {publisher.logoUrl ? (
                <img
                  src={publisher.logoUrl}
                  alt={publisher.name}
                  className="size-20 rounded-2xl object-contain bg-[var(--color-paper)] p-2 border border-[var(--color-rule)] shrink-0"
                />
              ) : (
                <div className="flex size-20 items-center justify-center rounded-2xl bg-[var(--color-accent-soft)] text-[var(--color-ink)] font-serif font-bold text-3xl border border-[var(--color-accent)]/40 shrink-0">
                  {publisher.name.slice(0, 1).toUpperCase()}
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h1
                    id="publisher-heading"
                    className="font-serif text-2xl sm:text-3xl font-bold tracking-tight"
                  >
                    {publisher.name}
                  </h1>
                  {publisher.verificationStatus === "verified" ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-[var(--color-green-soft)] text-[var(--color-ink)] border border-[var(--color-green)]/40">
                      <ShieldCheck className="size-3.5" aria-hidden="true" />
                      Mitra Penerbit Terverifikasi IKAPI
                    </span>
                  ) : publisher.verificationStatus === "rejected" ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-[var(--color-error-soft)] text-[var(--color-ink)] border border-[var(--color-error)]/40">
                      Verifikasi Ditolak
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-[var(--color-accent-soft)] text-[var(--color-ink)] border border-[var(--color-accent)]/40">
                      Menunggu Verifikasi
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-[var(--color-muted)]">
                  {publisher.ikapiNumber && (
                    <span className="font-semibold text-[var(--color-ink-2)]">
                      IKAPI: {publisher.ikapiNumber}
                    </span>
                  )}
                  {publisher.city && (
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3.5" aria-hidden="true" />
                      {publisher.city}
                    </span>
                  )}
                  {publisher.contactEmail && (
                    <span className="flex items-center gap-1">
                      <Mail className="size-3.5" aria-hidden="true" />
                      {publisher.contactEmail}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {hasStudioAccess && (
                <Link
                  to="/p/$slug/studio"
                  params={{ slug: publisher.slug }}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 text-xs font-semibold text-[var(--color-accent-ink)] hover:brightness-95"
                >
                  <Building2 className="size-4" aria-hidden="true" />
                  <span>Buka Studio Penerbit</span>
                </Link>
              )}

              <Link
                to="/app"
                search={{ tab: "explore" }}
                className="inline-flex min-h-11 items-center rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] px-4 text-xs font-mono text-[var(--color-ink)] hover:bg-[var(--color-paper-3)]"
              >
                Jelajahi Katalog
              </Link>
            </div>
          </div>

          {publisher.description && (
            <p className="font-serif text-sm text-[var(--color-ink-2)] max-w-3xl leading-relaxed">
              {publisher.description}
            </p>
          )}

          {publisher.topics && publisher.topics.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {publisher.topics.map((topic) => (
                <span
                  key={topic}
                  className="rounded-full border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 py-1 text-xs font-medium text-[var(--color-ink-2)]"
                >
                  {topic}
                </span>
              ))}
            </div>
          )}
        </section>

        {/* Path 1: Editorial Submission CTA Banner (Open or Approved Writer Fast-Track) */}
        {canSubmitToPublisher ? (
          <section
            aria-labelledby="submit-to-publisher-heading"
            className="rounded-2xl border border-[var(--color-accent)]/50 bg-[var(--color-accent-soft)]/50 p-6 sm:p-7 space-y-4"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
              <div className="space-y-2 max-w-2xl">
                {isApprovedWriterFastTrack && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-accent)] bg-[var(--color-paper)] px-3 py-1 text-[11px] font-semibold text-[var(--color-ink)]">
                    <Sparkles
                      className="size-3.5 text-[var(--color-accent)]"
                      aria-hidden="true"
                    />
                    <span>Jalur Prioritas Penulis Rekanan</span>
                  </span>
                )}
                <h2
                  id="submit-to-publisher-heading"
                  className="font-serif text-xl font-bold text-[var(--color-ink)]"
                >
                  Kirim Naskah ke Redaksi {publisher.name}
                </h2>
                <p className="text-xs sm:text-sm text-[var(--color-ink-2)] leading-relaxed">
                  {publisher.submissionGuidelines ||
                    `Redaksi ${publisher.name} terbuka menerima naskah buku digital dan cetak dari penulis.`}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                {sessionUser ? (
                  <>
                    <Button
                      type="button"
                      disabled={createDraftMutation.isPending}
                      onClick={handleStartNewDraftForPublisher}
                      className="min-h-11 rounded-xl bg-[var(--color-accent)] px-5 text-xs font-semibold text-[var(--color-accent-ink)] hover:brightness-95 cursor-pointer"
                    >
                      <PenTool className="size-4 mr-1.5" aria-hidden="true" />
                      <span>
                        {createDraftMutation.isPending
                          ? "Membuka Editor..."
                          : "Tulis Draf Baru"}
                      </span>
                    </Button>

                    {eligibleDraftCount > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsDraftPickerOpen(true)}
                        className="min-h-11 rounded-xl border-[var(--color-rule)] bg-[var(--color-paper-2)] px-4 text-xs font-semibold text-[var(--color-ink)] hover:bg-[var(--color-paper-3)] cursor-pointer"
                      >
                        <FileText
                          className="size-4 mr-1.5"
                          aria-hidden="true"
                        />
                        <span>Kirim dari Draf Saya ({eligibleDraftCount})</span>
                      </Button>
                    )}
                  </>
                ) : (
                  <Link
                    to="/sign-in"
                    search={{ redirect: `/p/${publisher.slug}` }}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--color-accent)] px-5 text-xs font-semibold text-[var(--color-accent-ink)] hover:brightness-95"
                  >
                    <span>Masuk untuk Mengirim Naskah</span>
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                )}
              </div>
            </div>

            {draftError && (
              <p
                role="alert"
                className="rounded-lg border border-[var(--color-error)]/40 bg-[var(--color-error-soft)] px-3 py-2 text-xs"
              >
                {draftError}
              </p>
            )}
          </section>
        ) : (
          publisher.verificationStatus === "verified" && (
            <div
              role="status"
              className="rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] px-5 py-3.5 text-xs text-[var(--color-muted)]"
            >
              Redaksi {publisher.name} saat ini sedang menutup penerimaan naskah
              baru. Anda tetap dapat membaca katalog buku yang sudah terbit di
              bawah ini.
            </div>
          )
        )}

        {/* Public Navigation Tabs */}
        <div
          role="tablist"
          aria-label="Informasi Publik Penerbit"
          className="flex items-center gap-2 overflow-x-auto border-b border-[var(--color-rule)]"
        >
          <button
            id="pub-public-tab-books"
            type="button"
            role="tab"
            aria-selected={activeTab === "books"}
            onClick={() => setActiveTab("books")}
            className={`relative flex-none min-h-11 px-4 text-xs sm:text-sm font-medium whitespace-nowrap cursor-pointer inline-flex items-center gap-2 ${
              activeTab === "books"
                ? "text-[var(--color-ink)] font-semibold after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:border-b-3 after:border-[var(--color-accent)]"
                : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
            }`}
          >
            <BookOpen className="size-4" aria-hidden="true" />
            <span>Katalog Buku ({publishedBooks.length})</span>
          </button>

          <button
            id="pub-public-tab-about"
            type="button"
            role="tab"
            aria-selected={activeTab === "about"}
            onClick={() => setActiveTab("about")}
            className={`relative flex-none min-h-11 px-4 text-xs sm:text-sm font-medium whitespace-nowrap cursor-pointer inline-flex items-center gap-2 ${
              activeTab === "about"
                ? "text-[var(--color-ink)] font-semibold after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:border-b-3 after:border-[var(--color-accent)]"
                : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
            }`}
          >
            <Building2 className="size-4" aria-hidden="true" />
            <span>Tentang &amp; Ketentuan</span>
          </button>
        </div>

        {/* Published Books Catalog */}
        {activeTab === "books" && (
          <section
            role="tabpanel"
            aria-labelledby="pub-public-tab-books"
            className="space-y-6"
          >
            {publishedBooks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--color-rule)] p-12 text-center space-y-3">
                <BookOpen
                  className="size-8 mx-auto text-[var(--color-muted)]"
                  aria-hidden="true"
                />
                <p className="text-sm text-[var(--color-muted)]">
                  Belum ada buku dari penerbit ini di katalog digital AnzaBook.
                </p>
              </div>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {publishedBooks.map((book) => (
                  <li key={book.id}>
                    <BookCatalogCard book={book} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* About & Guidelines */}
        {activeTab === "about" && (
          <section
            role="tabpanel"
            aria-labelledby="pub-public-tab-about"
            className="rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-6 sm:p-8 space-y-5"
          >
            <div className="space-y-2">
              <h2 className="font-serif text-lg font-bold">
                Profil Redaksi &amp; Panduan Naskah
              </h2>
              <p className="text-sm text-[var(--color-ink-2)] leading-relaxed">
                {publisher.description ||
                  `${publisher.name} adalah mitra penerbit resmi AnzaBook.`}
              </p>
            </div>

            {publisher.submissionGuidelines && (
              <div className="space-y-1.5 border-t border-[var(--color-rule)] pt-4">
                <h3 className="text-xs font-mono uppercase tracking-wider text-[var(--color-muted)]">
                  Panduan Pengiriman Naskah
                </h3>
                <p className="text-sm text-[var(--color-ink)] leading-relaxed whitespace-pre-line">
                  {publisher.submissionGuidelines}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-[var(--color-rule)] pt-4 text-xs">
              {publisher.address && (
                <div>
                  <span className="font-mono text-[var(--color-muted)] block">
                    Alamat Kantor
                  </span>
                  <span className="font-medium">{publisher.address}</span>
                </div>
              )}
              {publisher.socialLinks?.website && (
                <div>
                  <span className="font-mono text-[var(--color-muted)] block">
                    Situs Web
                  </span>
                  <a
                    href={publisher.socialLinks.website}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-medium underline underline-offset-4 hover:text-[var(--color-accent)]"
                  >
                    <Globe className="size-3.5" aria-hidden="true" />
                    <span>{publisher.socialLinks.website}</span>
                  </a>
                </div>
              )}
            </div>

            {approvedWritersShowcase.length > 0 && (
              <div className="space-y-3 border-t border-[var(--color-rule)] pt-5">
                <div className="flex items-center gap-2">
                  <Users
                    className="size-4 text-[var(--color-accent)]"
                    aria-hidden="true"
                  />
                  <h3 className="text-sm font-serif font-bold text-[var(--color-ink)]">
                    Penulis Rekanan ({approvedWritersShowcase.length})
                  </h3>
                </div>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {approvedWritersShowcase.map((writer) => (
                    <li
                      key={writer.id}
                      className="flex items-start gap-3 rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] p-3.5"
                    >
                      {writer.image ? (
                        <img
                          src={writer.image}
                          alt={writer.name}
                          className="size-10 rounded-full object-cover border border-[var(--color-rule)] shrink-0"
                        />
                      ) : (
                        <div className="flex size-10 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-sm font-serif font-bold text-[var(--color-ink)] shrink-0">
                          {writer.name.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 space-y-0.5">
                        <p className="font-semibold text-xs text-[var(--color-ink)] truncate">
                          {writer.name}
                        </p>
                        {writer.username && (
                          <p className="font-mono text-[11px] text-[var(--color-muted)] truncate">
                            @{writer.username}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}
      </div>

      {sessionUser && (
        <DraftPickerDialog
          isOpen={isDraftPickerOpen}
          onClose={() => setIsDraftPickerOpen(false)}
          publisherId={publisher.id}
          publisherName={publisher.name}
        />
      )}
    </PageFrame>
  );
}
