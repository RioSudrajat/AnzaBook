import { useEffect, useRef, useState } from "react";
import {
  createFileRoute,
  Link,
  notFound,
  useNavigate,
} from "@tanstack/react-router";
import {
  ArrowRight,
  Award,
  BookOpen,
  Building2,
  Compass,
  Feather,
  FileText,
  Globe,
  Mail,
  MapPin,
  PenTool,
  Send,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { EntityProfileHeader } from "@/components/profile/entity-profile-header";
import {
  ProfileTabs,
  type ProfileTabItem,
} from "@/components/profile/profile-tabs";
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

  const publicTabs: ProfileTabItem<"books" | "about">[] = [
    {
      id: "books",
      label: "Katalog Buku",
      count: publishedBooks.length,
      icon: <BookOpen className="size-4" aria-hidden="true" />,
    },
    {
      id: "about",
      label: "Tentang & Ketentuan",
      icon: <Building2 className="size-4" aria-hidden="true" />,
    },
  ];

  const verificationBadge =
    publisher.verificationStatus === "verified"
      ? {
          label: "Mitra Penerbit Terverifikasi IKAPI",
          tone: "success" as const,
          icon: <ShieldCheck className="size-3.5" aria-hidden="true" />,
        }
      : publisher.verificationStatus === "rejected"
        ? { label: "Verifikasi Ditolak", tone: "error" as const }
        : { label: "Menunggu Verifikasi", tone: "warning" as const };

  return (
    <PageFrame
      user={sessionUser}
      activeTab={hasStudioAccess ? "profile" : "explore"}
      title={publisher.name}
      wide
    >
      <div className="space-y-8 pb-12 text-[var(--color-ink)]">
        {/* Unified Publisher Profile Masthead */}
        <EntityProfileHeader
          kind="publisher"
          headingId="publisher-heading"
          headingLevel="h2"
          logoFit="contain"
          name={publisher.name}
          handleOrSlug={`/p/${publisher.slug}`}
          avatarUrl={publisher.logoUrl}
          bannerUrl={publisher.headerImageUrl}
          badges={[verificationBadge]}
          metaItems={[
            ...(publisher.ikapiNumber
              ? [{ label: `IKAPI: ${publisher.ikapiNumber}` }]
              : []),
            ...(publisher.city
              ? [
                  {
                    icon: <MapPin className="size-3.5" aria-hidden="true" />,
                    label: publisher.city,
                  },
                ]
              : []),
            ...(publisher.contactEmail
              ? [
                  {
                    icon: <Mail className="size-3.5" aria-hidden="true" />,
                    label: publisher.contactEmail,
                  },
                ]
              : []),
          ]}
          bio={publisher.description}
          topics={publisher.topics ?? []}
          socialLinks={publisher.socialLinks}
          modeSwitcher={
            hasStudioAccess ? (
              <nav
                aria-label="Mode tampilan penerbit"
                className="inline-flex items-center rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] p-1 text-xs"
              >
                <span className="inline-flex min-h-9 items-center rounded-lg bg-[var(--color-ink)] px-3 font-semibold text-[var(--color-paper)]">
                  Halaman Publik
                </span>
                <Link
                  to="/p/$slug/studio"
                  params={{ slug: publisher.slug }}
                  className="inline-flex min-h-9 items-center rounded-lg px-3 font-medium text-[var(--color-ink-2)] hover:text-[var(--color-ink)] transition-colors"
                >
                  Studio Penerbit
                </Link>
              </nav>
            ) : undefined
          }
          actions={
            <Link
              to="/app"
              search={{ tab: "explore" }}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] px-4 text-xs font-mono text-[var(--color-ink)] hover:bg-[var(--color-paper-3)] transition-colors"
            >
              <Compass className="size-3.5" aria-hidden="true" />
              <span>Jelajahi Katalog</span>
            </Link>
          }
          metrics={[
            {
              label: "Buku Terbit",
              value: publishedBooks.length,
              icon: <BookOpen className="size-3.5" aria-hidden="true" />,
            },
            {
              label: "Penulis Rekanan",
              value: approvedWritersShowcase.length,
              icon: <Users className="size-3.5" aria-hidden="true" />,
            },
            {
              label: "Topik Kurasi",
              value: publisher.topics?.length ?? 0,
              icon: <Feather className="size-3.5" aria-hidden="true" />,
            },
            {
              label: "Status Naskah",
              value: isAccepting
                ? "Terbuka"
                : isApprovedWriterFastTrack
                  ? "Jalur Rekanan"
                  : "Ditutup",
              icon: <FileText className="size-3.5" aria-hidden="true" />,
            },
          ]}
        />

        {/* Editorial Submission CTA Banner */}
        {canSubmitToPublisher ? (
          <section
            aria-labelledby="submit-to-publisher-heading"
            className="rounded-2xl border border-[var(--color-accent)]/50 bg-[var(--color-accent-soft)]/50 p-6 sm:p-7 space-y-4"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
              <div className="space-y-2 max-w-2xl">
                {isApprovedWriterFastTrack && (
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-accent)] bg-[var(--color-paper)] px-3 py-1 text-[11px] font-semibold text-[var(--color-ink)]">
                    <Award
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

        <ProfileTabs
          tabs={publicTabs}
          activeTab={activeTab}
          onChange={setActiveTab}
          ariaLabel="Informasi Publik Penerbit"
          idPrefix="pub-public"
        />

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
