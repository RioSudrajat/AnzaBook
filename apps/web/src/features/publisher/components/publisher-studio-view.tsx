import { useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Award,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  FileEdit,
  Inbox,
  LoaderCircle,
  PenTool,
  Search,
  Send,
  Share2,
  Trash2,
  Users,
} from "lucide-react";
import { EntityProfileHeader } from "@/components/profile/entity-profile-header";
import { ProfileTabs } from "@/components/profile/profile-tabs";
import { SmartBackButton } from "@/components/smart-back-button";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { ItemActionDrawer } from "@/components/ui/item-action-drawer";
import type {
  ManuscriptSubmissionDto,
  PublisherCatalogBookDto,
  PublisherDto,
  PublisherMemberRole,
} from "@starter/shared/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { bookPagePath } from "@/features/books/book-share";
import { BookCover } from "@/features/books/components/book-cover";
import { BookShareDialog } from "@/features/books/components/book-share-dialog";
import { ManuscriptCoverPlaceholder } from "@/features/books/components/manuscript-cover-placeholder";
import {
  useAddPublisherApprovedWriter,
  useAddPublisherMember,
  useCreateBookRevisionDraft,
  useDeletePublisherBook,
  useDeletePublisherManuscript,
  usePublisherApprovedWriters,
  usePublisherBooks,
  usePublisherManuscripts,
  usePublisherMembers,
  useRemovePublisherApprovedWriter,
  useRemovePublisherMember,
  useUpdatePublisherMember,
} from "@/features/social/hooks";
import { ApiError } from "@/lib/api/client";
import {
  formatDigitalPolicy,
  formatManuscriptStatus,
  formatRoleName,
  formatSourceLanguage,
  formatTargetAudience,
} from "@/lib/formatters";
import { isUsableAssetUrl } from "@/lib/media-url";
import {
  canEditPublishedBooks,
  canManagePublisherProfile,
  canManagePublisherTeam,
  canReviewManuscripts,
  getManuscriptStatusBadgeClass,
  normalizeSocialLinks,
} from "../publisher-helpers";
import { EditPublisherProfileDialog } from "./edit-publisher-profile-dialog";
import { PublishManuscriptDialog } from "./publish-manuscript-dialog";

export type PublisherStudioTab = "inbox" | "catalog" | "team";
export type PublisherCatalogView = "publish" | "draft";

const STUDIO_TABS: ReadonlyArray<{
  id: PublisherStudioTab;
  label: string;
}> = [
  { id: "inbox", label: "Kotak Masuk Naskah" },
  { id: "catalog", label: "Katalog Terbit" },
  { id: "team", label: "Tim & Penulis" },
];

const INBOX_STATUS_FILTERS = [
  { id: "all", label: "Semua" },
  { id: "pending_review", label: "Menunggu Kurasi" },
  { id: "in_editing", label: "Sedang Disunting" },
  { id: "revision_requested", label: "Perlu Revisi" },
  { id: "published", label: "Diterbitkan" },
  { id: "rejected", label: "Ditolak" },
] as const;

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

export function PublisherStudioView({
  publisher,
  activeTab: controlledTab,
  onTabChange,
  catalogView: controlledCatalogView,
  onCatalogViewChange,
  returnTo,
  currentUserId,
}: {
  publisher: PublisherDto;
  activeTab?: PublisherStudioTab;
  onTabChange?: (tab: PublisherStudioTab) => void;
  catalogView?: PublisherCatalogView;
  onCatalogViewChange?: (view: PublisherCatalogView) => void;
  returnTo?: string | null;
  currentUserId?: string;
}) {
  const navigate = useNavigate();
  const [internalTab, setInternalTab] = useState<PublisherStudioTab>("inbox");
  const [internalCatalogView, setInternalCatalogView] =
    useState<PublisherCatalogView>("publish");
  const activeTab = controlledTab ?? internalTab;
  const catalogView = controlledCatalogView ?? internalCatalogView;

  const setActiveTab = (tab: PublisherStudioTab) => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setInternalTab(tab);
    }
  };

  const setCatalogView = (view: PublisherCatalogView) => {
    if (onCatalogViewChange) {
      onCatalogViewChange(view);
    } else {
      setInternalCatalogView(view);
    }
  };

  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

  // Inbox state
  const [inboxQuery, setInboxQuery] = useState("");
  const [inboxStatus, setInboxStatus] = useState<string>("all");
  const [publishingManuscript, setPublishingManuscript] =
    useState<ManuscriptSubmissionDto | null>(null);
  const [deletingManuscript, setDeletingManuscript] =
    useState<ManuscriptSubmissionDto | null>(null);
  const [manuscriptDeleteError, setManuscriptDeleteError] = useState<
    string | null
  >(null);

  // Catalog state
  const [shareBook, setShareBook] = useState<{
    book: PublisherCatalogBookDto;
    url: string;
    trigger: HTMLButtonElement;
  } | null>(null);
  const shareTriggerFallbackRef = useRef<HTMLButtonElement | null>(null);
  const [deletingBook, setDeletingBook] =
    useState<PublisherCatalogBookDto | null>(null);
  const [bookDeleteError, setBookDeleteError] = useState<string | null>(null);
  const [discardingDraftBook, setDiscardingDraftBook] =
    useState<PublisherCatalogBookDto | null>(null);
  const [draftDiscardError, setDraftDiscardError] = useState<string | null>(
    null,
  );
  const [catalogFeedback, setCatalogFeedback] = useState<string | null>(null);

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
  const canEditProfile = canManagePublisherProfile(role);

  const currentStudioUrl =
    activeTab === "catalog"
      ? `/p/${publisher.slug}/studio?tab=catalog&catalogView=${catalogView}`
      : `/p/${publisher.slug}/studio?tab=${activeTab}`;

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

  const deleteManuscriptMutation = useDeletePublisherManuscript();
  const createRevisionMutation = useCreateBookRevisionDraft();
  const deleteBookMutation = useDeletePublisherBook();
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

  const draftRevisionBooks = books.filter(
    (b) => b.activeRevisionManuscriptId !== null,
  );

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
      ) : (
        <Users className="size-4" aria-hidden="true" />
      );

    return { ...tab, count, icon };
  });

  const openManuscriptInEditor = (manuscriptId: string) => {
    void navigate({
      to: "/read/$slug",
      params: { slug: `manuscript-${manuscriptId}` },
      search: {
        editorial: canReview ? "edit" : "preview",
        publisherSlug: publisher.slug,
        returnTo: currentStudioUrl,
      },
    });
  };

  const handleEditPublishedBook = async (book: PublisherCatalogBookDto) => {
    setCatalogFeedback(null);
    try {
      const draft = await createRevisionMutation.mutateAsync({
        slug: publisher.slug,
        bookId: book.id,
      });
      await navigate({
        to: "/read/$slug",
        params: { slug: `manuscript-${draft.id}` },
        search: {
          editorial: "edit",
          publisherSlug: publisher.slug,
          returnTo: `/p/${publisher.slug}/studio?tab=catalog&catalogView=draft`,
        },
      });
    } catch (error) {
      setCatalogFeedback(
        extractErrorMessage(error, "Gagal menyiapkan draf revisi buku."),
      );
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
      <div className="flex items-center">
        <SmartBackButton
          returnTo={returnTo}
          fallbackTo={`/p/${publisher.slug}`}
          label="Kembali"
          className="-ml-2"
        />
      </div>

      {/* Studio Identity Header */}
      <EntityProfileHeader
        kind="publisher"
        headingLevel="h2"
        logoFit="contain"
        name={publisher.name}
        handleOrSlug={`@${publisher.slug}`}
        handleHref={`/p/${publisher.slug}`}
        isVerified={publisher.verificationStatus === "verified"}
        verifiedEntityType="publisher"
        avatarUrl={publisher.logoUrl}
        bannerUrl={publisher.headerImageUrl}
        bio={publisher.description}
        topics={publisher.topics ?? undefined}
        socialLinks={normalizeSocialLinks(publisher.socialLinks)}
        ariaLabel="Identitas Studio Penerbit"
        shareConfig={{
          entityType: "publisher",
          name: publisher.name,
          handle: publisher.slug,
          avatarUrl: publisher.logoUrl,
          sharePath: `/p/${publisher.slug}`,
        }}
        actions={
          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            <Link
              to="/p/$slug"
              params={{ slug: publisher.slug }}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] px-4 text-xs font-semibold text-[var(--color-ink)] hover:bg-[var(--color-paper-3)] focus-visible:outline-2 focus-visible:outline-[var(--color-focus)]"
            >
              <span>Lihat Halaman Publik</span>
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </Link>

            {canEditProfile && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditProfileOpen(true)}
                className="min-h-11 shrink-0 rounded-xl border-[var(--color-rule)] bg-[var(--color-paper)] px-4 text-xs font-semibold text-[var(--color-ink)] hover:bg-[var(--color-paper-3)] cursor-pointer inline-flex items-center gap-1.5"
              >
                <PenTool className="size-3.5" aria-hidden="true" />
                <span>Sunting Profil</span>
              </Button>
            )}
          </div>
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

      {/* Hidden fallback focus button for BookShareDialog */}
      <button
        ref={shareTriggerFallbackRef}
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
      />

      {/* Accessible Single-Row Horizontal Scrollable Tablist */}
      <ProfileTabs
        tabs={studioTabs}
        activeTab={activeTab}
        onChange={setActiveTab}
        ariaLabel="Navigasi Studio Penerbit"
        idPrefix="studio"
      />

      <div className="min-h-[55vh]">
        {/* Tab 1: Kotak Masuk Naskah */}
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
                {filteredManuscripts.map((item) => {
                  const trimmedTitle = item.title.trim();
                  const hasCover =
                    item.coverUrl === "template" ||
                    isUsableAssetUrl(item.coverUrl);
                  const canPublishItem =
                    canReview &&
                    (item.status === "pending_review" ||
                      item.status === "in_editing");

                  return (
                    <li
                      key={item.id}
                      onClick={() => openManuscriptInEditor(item.id)}
                      className="group rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-4 sm:p-5 space-y-3 hover:border-[var(--color-ink)]/40 hover:bg-[var(--color-paper)] transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3.5 min-w-0 flex-1">
                          {/* Cover or Placeholder */}
                          <div className="w-14 sm:w-16 shrink-0 aspect-[2/3]">
                            {hasCover ? (
                              <BookCover
                                book={{
                                  title: trimmedTitle || "Naskah Tanpa Judul",
                                  author:
                                    item.authorPenName ||
                                    item.authorName ||
                                    "Penulis",
                                  coverUrl: item.coverUrl,
                                  coverColor: item.coverColor,
                                  genres: item.category ? [item.category] : [],
                                  pageCount: item.estimatedPages ?? 120,
                                }}
                                className="w-full h-full aspect-[2/3]"
                                decorative
                              />
                            ) : (
                              <ManuscriptCoverPlaceholder
                                title={trimmedTitle}
                                compact
                                className="size-full"
                              />
                            )}
                          </div>

                          <div className="space-y-1.5 min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-serif text-base sm:text-lg font-bold text-[var(--color-ink)] break-words group-hover:text-[var(--color-accent)] transition-colors">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openManuscriptInEditor(item.id);
                                  }}
                                  className="text-left focus-visible:outline-2 focus-visible:outline-[var(--color-focus)] rounded-sm cursor-pointer"
                                >
                                  {trimmedTitle ? (
                                    trimmedTitle
                                  ) : (
                                    <span className="italic font-normal text-[var(--color-muted)]">
                                      Naskah Tanpa Judul
                                    </span>
                                  )}
                                </button>
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
                                  <Award
                                    className="size-3"
                                    aria-hidden="true"
                                  />
                                  Penulis Rekanan
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[var(--color-muted)] font-mono">
                              <span>
                                Penulis:{" "}
                                <strong className="text-[var(--color-ink)]">
                                  {item.authorPenName ||
                                    item.authorName ||
                                    "Anonim"}
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
                        </div>

                        <ItemActionDrawer
                          ariaLabel={`Opsi naskah ${trimmedTitle || "Tanpa Judul"}`}
                          title={trimmedTitle || "Opsi Naskah"}
                          items={[
                            {
                              id: "edit",
                              label: canReview
                                ? "Edit di Editor"
                                : "Lihat di Pembaca",
                              description:
                                "Buka naskah lengkap di kanvas editorial.",
                              icon: <PenTool className="size-4" />,
                              onSelect: () => openManuscriptInEditor(item.id),
                            },
                            ...(canPublishItem
                              ? [
                                  {
                                    id: "publish",
                                    label: "Terbitkan",
                                    description:
                                      "Konfirmasi model distribusi dan terbitkan ke katalog.",
                                    icon: <Send className="size-4" />,
                                    onSelect: () =>
                                      setPublishingManuscript(item),
                                  },
                                ]
                              : []),
                            ...(canReview
                              ? [
                                  {
                                    id: "delete",
                                    label: "Hapus / Bersihkan",
                                    description:
                                      "Hapus atau lepaskan naskah dari kotak masuk redaksi.",
                                    icon: <Trash2 className="size-4" />,
                                    variant: "destructive" as const,
                                    onSelect: () => {
                                      setManuscriptDeleteError(null);
                                      setDeletingManuscript(item);
                                    },
                                  },
                                ]
                              : []),
                          ]}
                        />
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-rule)] pt-2.5 text-xs text-[var(--color-muted)] font-mono">
                        <span>
                          {item.chapters?.length || item.totalChapters || 1}{" "}
                          chapter &bull; diperbarui{" "}
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
                  );
                })}
              </ul>
            )}

            {publishingManuscript && (
              <PublishManuscriptDialog
                isOpen={Boolean(publishingManuscript)}
                onClose={() => setPublishingManuscript(null)}
                publisherSlug={publisher.slug}
                publisherName={publisher.name}
                manuscript={publishingManuscript}
                onEditInEditor={() => {
                  const targetId = publishingManuscript.id;
                  setPublishingManuscript(null);
                  openManuscriptInEditor(targetId);
                }}
              />
            )}

            <ConfirmDeleteDialog
              open={Boolean(deletingManuscript)}
              title="Hapus Naskah dari Kotak Masuk?"
              description={`Naskah "${deletingManuscript?.title.trim() || "Naskah Tanpa Judul"}" akan dihapus atau dilepas dari kotak masuk redaksi ${publisher.name}.`}
              warningNote="Tindakan ini tidak membatalkan buku yang sudah terlanjur diterbitkan ke katalog publik."
              confirmLabel="Hapus / Bersihkan"
              isPending={deleteManuscriptMutation.isPending}
              errorMessage={manuscriptDeleteError}
              onClose={() => {
                if (!deleteManuscriptMutation.isPending) {
                  setDeletingManuscript(null);
                  setManuscriptDeleteError(null);
                }
              }}
              onConfirm={async () => {
                if (!deletingManuscript) return;
                setManuscriptDeleteError(null);
                try {
                  await deleteManuscriptMutation.mutateAsync({
                    slug: publisher.slug,
                    idOrSlug: deletingManuscript.id,
                  });
                  setDeletingManuscript(null);
                } catch (error) {
                  setManuscriptDeleteError(
                    extractErrorMessage(error, "Gagal menghapus naskah."),
                  );
                }
              }}
            />
          </section>
        )}

        {/* Tab 2: Katalog Terbit (Publish | Draft) */}
        {activeTab === "catalog" && (
          <section
            role="tabpanel"
            aria-labelledby="studio-tab-catalog"
            className="space-y-4"
          >
            {/* Publish | Draft Segmented Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div
                role="group"
                aria-label="Filter tampilan katalog terbit"
                className="inline-flex items-center rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-1 text-xs"
              >
                <button
                  type="button"
                  aria-pressed={catalogView === "publish"}
                  onClick={() => setCatalogView("publish")}
                  className={`min-h-10 rounded-lg px-4 font-semibold transition-colors cursor-pointer inline-flex items-center gap-2 ${
                    catalogView === "publish"
                      ? "bg-[var(--color-ink)] text-[var(--color-paper)]"
                      : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                  }`}
                >
                  <span>Publish</span>
                  <span className="font-mono text-[11px] opacity-80">
                    {books.length}
                  </span>
                </button>
                <button
                  type="button"
                  aria-pressed={catalogView === "draft"}
                  onClick={() => setCatalogView("draft")}
                  className={`min-h-10 rounded-lg px-4 font-semibold transition-colors cursor-pointer inline-flex items-center gap-2 ${
                    catalogView === "draft"
                      ? "bg-[var(--color-ink)] text-[var(--color-paper)]"
                      : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                  }`}
                >
                  <span>Draft</span>
                  <span className="font-mono text-[11px] opacity-80">
                    {draftRevisionBooks.length}
                  </span>
                </button>
              </div>
            </div>

            {catalogFeedback && (
              <div
                role="alert"
                className="rounded-xl border border-[var(--color-error)]/40 bg-[var(--color-error-soft)] px-4 py-3 text-xs"
              >
                {catalogFeedback}
              </div>
            )}

            {isCatalogLoading ? (
              <div className="flex min-h-48 items-center justify-center rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper-2)]">
                <LoaderCircle
                  className="size-6 animate-spin text-[var(--color-muted)]"
                  aria-hidden="true"
                />
              </div>
            ) : catalogView === "publish" ? (
              books.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--color-rule)] bg-[var(--color-paper-2)] p-10 text-center space-y-2">
                  <BookOpen
                    className="mx-auto size-8 text-[var(--color-muted)]"
                    aria-hidden="true"
                  />
                  <p className="font-serif text-base font-semibold">
                    Belum ada buku terbit di katalog penerbit ini.
                  </p>
                  <p className="text-xs text-[var(--color-muted)]">
                    Naskah yang disetujui dan diterbitkan dari Kotak Masuk akan
                    muncul di sini.
                  </p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {books.map((book) => {
                    const openPublishedBook = () => {
                      void navigate({
                        to: "/books/$slug",
                        params: { slug: book.slug },
                        search: { returnTo: currentStudioUrl },
                      });
                    };

                    return (
                      <li
                        key={book.id}
                        onClick={openPublishedBook}
                        className="group rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-4 sm:p-5 flex items-start justify-between gap-4 hover:border-[var(--color-ink)]/40 hover:bg-[var(--color-paper)] transition-colors cursor-pointer"
                      >
                        <div className="flex items-start gap-4 min-w-0 flex-1">
                          <div className="w-16 shrink-0 aspect-[2/3]">
                            <BookCover
                              book={book}
                              className="w-full h-full aspect-[2/3]"
                              decorative
                            />
                          </div>
                          <div className="space-y-1 min-w-0 flex-1">
                            <h2 className="font-serif text-base font-bold text-[var(--color-ink)] group-hover:text-[var(--color-accent)] transition-colors">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openPublishedBook();
                                }}
                                className="text-left focus-visible:outline-2 focus-visible:outline-[var(--color-focus)] rounded-sm cursor-pointer"
                              >
                                {book.title}
                              </button>
                            </h2>
                            <p className="text-xs text-[var(--color-muted)]">
                              {book.author} &bull; {book.totalChapters} chapter
                            </p>
                            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-mono">
                              <span className="rounded border border-[var(--color-rule)] bg-[var(--color-paper)] px-2 py-0.5 text-[var(--color-ink-2)]">
                                {formatDigitalPolicy(book.digitalPolicy)}
                              </span>
                              <span className="text-[var(--color-muted)]">
                                {formatPriceIdr(book.digitalPriceIdr)}
                              </span>
                              {book.paidPurchaseCount > 0 && (
                                <span className="rounded border border-[var(--color-green)]/40 bg-[var(--color-green-soft)] px-2 py-0.5 text-[11px] text-[var(--color-ink)]">
                                  {book.paidPurchaseCount} terjual
                                </span>
                              )}
                              {book.activeRevisionManuscriptId && (
                                <span className="rounded border border-[var(--color-accent)]/50 bg-[var(--color-accent-soft)] px-2 py-0.5 text-[11px] text-[var(--color-ink)]">
                                  Ada draf revisi
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <ItemActionDrawer
                          ariaLabel={`Opsi buku ${book.title}`}
                          title={book.title}
                          items={[
                            {
                              id: "share",
                              label: "Bagikan Tautan Buku",
                              description:
                                "Salin tautan atau ekspor kartu gambar buku.",
                              icon: <Share2 className="size-4" />,
                              onSelect: () => {
                                const url =
                                  typeof window !== "undefined"
                                    ? new URL(
                                        bookPagePath(book.slug),
                                        window.location.origin,
                                      ).href
                                    : bookPagePath(book.slug);
                                const triggerEl =
                                  shareTriggerFallbackRef.current;
                                if (triggerEl) {
                                  setShareBook({
                                    book,
                                    url,
                                    trigger: triggerEl,
                                  });
                                }
                              },
                            },
                            ...(canEditBooks
                              ? [
                                  {
                                    id: "edit-book",
                                    label: "Edit Buku",
                                    description:
                                      "Buat draf revisi dan sunting isi serta metadata di Editor.",
                                    icon: <FileEdit className="size-4" />,
                                    disabled: createRevisionMutation.isPending,
                                    onSelect: () => {
                                      void handleEditPublishedBook(book);
                                    },
                                  },
                                  {
                                    id: "delete-book",
                                    label:
                                      book.paidPurchaseCount > 0
                                        ? "Arsipkan Buku"
                                        : "Hapus Buku",
                                    description:
                                      book.paidPurchaseCount > 0
                                        ? "Sembunyikan dari katalog publik tanpa memutus akses pembeli."
                                        : "Hapus permanen buku dari katalog penerbit.",
                                    icon: <Trash2 className="size-4" />,
                                    variant: "destructive" as const,
                                    onSelect: () => {
                                      setBookDeleteError(null);
                                      setDeletingBook(book);
                                    },
                                  },
                                ]
                              : []),
                          ]}
                        />
                      </li>
                    );
                  })}
                </ul>
              )
            ) : draftRevisionBooks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--color-rule)] bg-[var(--color-paper-2)] p-10 text-center space-y-2">
                <FileEdit
                  className="mx-auto size-8 text-[var(--color-muted)]"
                  aria-hidden="true"
                />
                <p className="font-serif text-base font-semibold">
                  Belum ada draf revisi katalog yang sedang disunting.
                </p>
                <p className="text-xs text-[var(--color-muted)] max-w-md mx-auto leading-relaxed">
                  Pilih <strong>Edit Buku</strong> pada menu tindakan (⋮) buku
                  di tab Publish untuk menyunting isi chapter atau metadata
                  tanpa mengganggu versi yang sedang tayang.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {draftRevisionBooks.map((book) => {
                  const revisionId = book.activeRevisionManuscriptId!;
                  const openRevisionInEditor = () => {
                    void navigate({
                      to: "/read/$slug",
                      params: { slug: `manuscript-${revisionId}` },
                      search: {
                        editorial: "edit",
                        publisherSlug: publisher.slug,
                        returnTo: currentStudioUrl,
                      },
                    });
                  };

                  return (
                    <li
                      key={book.id}
                      onClick={openRevisionInEditor}
                      className="group rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-4 sm:p-5 flex items-start justify-between gap-4 hover:border-[var(--color-ink)]/40 hover:bg-[var(--color-paper)] transition-colors cursor-pointer"
                    >
                      <div className="flex items-start gap-4 min-w-0 flex-1">
                        <div className="w-16 shrink-0 aspect-[2/3]">
                          {isUsableAssetUrl(book.coverUrl) ||
                          book.coverColor ? (
                            <BookCover
                              book={book}
                              className="w-full h-full aspect-[2/3]"
                              decorative
                            />
                          ) : (
                            <ManuscriptCoverPlaceholder
                              title={book.title}
                              compact
                              className="size-full"
                            />
                          )}
                        </div>
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="font-serif text-base font-bold text-[var(--color-ink)] group-hover:text-[var(--color-accent)] transition-colors">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openRevisionInEditor();
                                }}
                                className="text-left focus-visible:outline-2 focus-visible:outline-[var(--color-focus)] rounded-sm cursor-pointer"
                              >
                                {book.title}
                              </button>
                            </h2>
                            <span className="rounded-md border border-[var(--color-accent)]/50 bg-[var(--color-accent-soft)] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-[var(--color-ink)]">
                              Draf Revisi
                            </span>
                          </div>
                          <p className="text-xs text-[var(--color-muted)]">
                            {book.author} &bull; {book.totalChapters} chapter
                          </p>
                          {book.activeRevisionUpdatedAt && (
                            <p className="font-mono text-[11px] text-[var(--color-muted)]">
                              Diperbarui{" "}
                              {new Date(
                                book.activeRevisionUpdatedAt,
                              ).toLocaleDateString("id-ID")}
                            </p>
                          )}
                        </div>
                      </div>

                      <ItemActionDrawer
                        ariaLabel={`Opsi draf revisi ${book.title}`}
                        title={`Revisi · ${book.title}`}
                        items={[
                          {
                            id: "continue-edit",
                            label: "Lanjutkan Edit di Editor",
                            description:
                              "Lanjutkan menyunting chapter dan metadata revisi.",
                            icon: <PenTool className="size-4" />,
                            onSelect: openRevisionInEditor,
                          },
                          {
                            id: "view-published",
                            label: "Lihat Versi Publish",
                            description:
                              "Buka halaman buku yang sedang tayang saat ini.",
                            icon: <ExternalLink className="size-4" />,
                            onSelect: () => {
                              void navigate({
                                to: "/books/$slug",
                                params: { slug: book.slug },
                                search: { returnTo: currentStudioUrl },
                              });
                            },
                          },
                          {
                            id: "discard-draft",
                            label: "Buang Draf Revisi",
                            description:
                              "Hapus draf revisi ini tanpa mengubah versi tayang.",
                            icon: <Trash2 className="size-4" />,
                            variant: "destructive",
                            onSelect: () => {
                              setDraftDiscardError(null);
                              setDiscardingDraftBook(book);
                            },
                          },
                        ]}
                      />
                    </li>
                  );
                })}
              </ul>
            )}

            {shareBook && (
              <BookShareDialog
                slug={shareBook.book.slug}
                title={shareBook.book.title}
                url={shareBook.url}
                trigger={shareBook.trigger}
                onClose={() => setShareBook(null)}
              />
            )}

            <ConfirmDeleteDialog
              open={Boolean(deletingBook)}
              title={
                deletingBook && deletingBook.paidPurchaseCount > 0
                  ? "Arsipkan Buku Terbit?"
                  : "Hapus Buku Permanen?"
              }
              description={
                deletingBook && deletingBook.paidPurchaseCount > 0
                  ? `Buku "${deletingBook.title}" sudah memiliki ${deletingBook.paidPurchaseCount} pembelian digital lunas.`
                  : `Buku "${deletingBook?.title ?? ""}" belum memiliki pembelian lunas dan akan dihapus permanen dari katalog.`
              }
              warningNote={
                deletingBook && deletingBook.paidPurchaseCount > 0
                  ? "Sistem akan mengarsipkan buku (soft-archive) dari katalog publik sehingga pembeli yang sudah membayar tetap memiliki akses baca penuh."
                  : "Seluruh data buku dan chapter terbitannya akan dihapus permanen."
              }
              confirmLabel={
                deletingBook && deletingBook.paidPurchaseCount > 0
                  ? "Arsipkan Buku"
                  : "Hapus Buku Permanen"
              }
              isPending={deleteBookMutation.isPending}
              errorMessage={bookDeleteError}
              onClose={() => {
                if (!deleteBookMutation.isPending) {
                  setDeletingBook(null);
                  setBookDeleteError(null);
                }
              }}
              onConfirm={async () => {
                if (!deletingBook) return;
                setBookDeleteError(null);
                try {
                  await deleteBookMutation.mutateAsync({
                    slug: publisher.slug,
                    bookId: deletingBook.id,
                  });
                  setDeletingBook(null);
                } catch (error) {
                  setBookDeleteError(
                    extractErrorMessage(error, "Gagal menghapus buku."),
                  );
                }
              }}
            />

            <ConfirmDeleteDialog
              open={Boolean(discardingDraftBook)}
              title="Buang Draf Revisi?"
              description={`Draf revisi untuk "${discardingDraftBook?.title ?? ""}" akan dihapus permanen.`}
              warningNote="Versi buku yang sedang tayang di katalog publik tidak akan berubah."
              confirmLabel="Buang Draf Revisi"
              isPending={deleteManuscriptMutation.isPending}
              errorMessage={draftDiscardError}
              onClose={() => {
                if (!deleteManuscriptMutation.isPending) {
                  setDiscardingDraftBook(null);
                  setDraftDiscardError(null);
                }
              }}
              onConfirm={async () => {
                const revId = discardingDraftBook?.activeRevisionManuscriptId;
                if (!revId) return;
                setDraftDiscardError(null);
                try {
                  await deleteManuscriptMutation.mutateAsync({
                    slug: publisher.slug,
                    idOrSlug: revId,
                  });
                  setDiscardingDraftBook(null);
                } catch (error) {
                  setDraftDiscardError(
                    extractErrorMessage(error, "Gagal membuang draf revisi."),
                  );
                }
              }}
            />
          </section>
        )}

        {/* Tab 3: Tim & Penulis */}
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
                Hanya pemilik penerbit yang dapat menambah atau mengubah peran
                tim redaksi.
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
                                      role: e.target
                                        .value as PublisherMemberRole,
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
                                <span>
                                  {writer.invitedEmail || "Terdaftar"}
                                </span>
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
      </div>

      {/* Edit Publisher Profile Modal */}
      {canEditProfile && (
        <EditPublisherProfileDialog
          isOpen={isEditProfileOpen}
          onClose={() => setIsEditProfileOpen(false)}
          publisher={publisher}
        />
      )}
    </div>
  );
}
