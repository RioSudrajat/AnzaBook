import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  BookMarked,
  BookOpen,
  Building2,
  Calendar,
  Clock,
  Edit3,
  Layers,
  MapPin,
  PenTool,
  Plus,
  Quote,
  RotateCcw,
  Settings,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import type {
  BookHighlightDto,
  ExplorePostItemDto,
  ManuscriptSubmissionDto,
  ReadingSessionDto,
  SocialProfileDto,
} from "@starter/shared/types";
import { EntityDirectoryCard } from "@/components/profile/entity-directory-card";
import { EntityProfileHeader } from "@/components/profile/entity-profile-header";
import {
  ProfileActivityFeed,
  type ProfileActivityEntry,
} from "@/components/profile/profile-activity-feed";
import { ProfileReadingShelf } from "@/components/profile/profile-reading-shelf";
import {
  ProfileTabs,
  type ProfileTabItem,
} from "@/components/profile/profile-tabs";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import {
  ItemActionDrawer,
  type ItemActionOption,
} from "@/components/ui/item-action-drawer";
import { BookCard } from "@/features/books/components/book-card";
import { BookCover } from "@/features/books/components/book-cover";
import { ManuscriptCoverPlaceholder } from "@/features/books/components/manuscript-cover-placeholder";
import { useAllHighlights } from "@/features/books/hooks";
import { useReadingSessions, useUserShelves } from "@/features/community/hooks";
import { getManuscriptStatusBadgeClass } from "@/features/publisher/publisher-helpers";
import { HighlightStoryDialog } from "@/features/reader/components/highlight-story-dialog";
import { FlexReadingDialog } from "@/features/share/components/flex-reading-dialog";
import { SocialRelationsDialog } from "@/features/social/components/social-relations-dialog";
import {
  useCreateManuscriptDraft,
  useDeleteAuthorManuscript,
  useFollowUser,
  useMyManuscripts,
  useMySocialProfile,
  useUnfollowUser,
  useWithdrawManuscript,
} from "@/features/social/hooks";
import {
  formatDigitalPolicy,
  formatManuscriptStatus,
  formatRoleName,
} from "@/lib/formatters";
import { isUsableAssetUrl } from "@/lib/media-url";
import { EditProfileView } from "./edit-profile-view";

export type ProfileSubTab =
  | "activity"
  | "reviews"
  | "community"
  | "works"
  | "author_studio"
  | "publisher_studio";

type DashboardProfileProps = {
  isOwnProfile?: boolean;
  profile?: SocialProfileDto;
  isEditing?: boolean;
  subtab?: ProfileSubTab;
  onSubTabChange?: (nextSubTab: ProfileSubTab) => void;
  onStartEdit?: () => void;
  onFinishEdit?: () => void;
  onNavigateSettings?: () => void;
  onOpenFlexStory?: (session: ReadingSessionDto, bookTitle: string) => void;
  onOpenQuoteStory?: (highlight: BookHighlightDto) => void;
};

export function DashboardProfile(props: DashboardProfileProps) {
  if (props.isEditing) {
    return (
      <EditProfileView
        onBack={() => {
          props.onFinishEdit?.();
        }}
      />
    );
  }

  return <DashboardProfileContent {...props} />;
}

function DashboardProfileContent({
  isOwnProfile = true,
  profile: externalProfile,
  subtab,
  onSubTabChange,
  onStartEdit,
  onNavigateSettings,
  onOpenFlexStory,
  onOpenQuoteStory,
}: DashboardProfileProps) {
  const { data: myProfile, isLoading: isMyProfileLoading } =
    useMySocialProfile();
  const profile = externalProfile || myProfile;

  const isVerifiedAuthor = profile?.authorStatus === "verified";
  const isPendingAuthor = profile?.authorStatus === "pending";
  const canAccessAuthorStudio =
    isVerifiedAuthor || Boolean(profile?.isApprovedWriter);

  const { data: shelves = [] } = useUserShelves();
  const { data: sessionsData } = useReadingSessions();
  const sessions = sessionsData?.data || [];
  const telemetrySummary = sessionsData?.summary;
  const { data: manuscripts = [], refetch: refetchManuscripts } =
    useMyManuscripts(isOwnProfile && canAccessAuthorStudio);
  const userHighlights = useAllHighlights();

  const followMutation = useFollowUser();
  const unfollowMutation = useUnfollowUser();
  const createDraftMutation = useCreateManuscriptDraft();
  const withdrawMutation = useWithdrawManuscript();
  const deleteManuscriptMutation = useDeleteAuthorManuscript();
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
  const [withdrawFeedback, setWithdrawFeedback] = useState<{
    id: string;
    message: string;
    isError?: boolean;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<ManuscriptSubmissionDto | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const navigate = useNavigate();
  const isPublisher = Boolean(
    profile?.isPublisher ||
    (profile?.managedPublishers && profile.managedPublishers.length > 0),
  );
  const isCommunityOwner = Boolean(
    profile?.isCommunityOwner ||
    (profile?.managedCommunities && profile.managedCommunities.length > 0),
  );

  const [localSubTab, setLocalSubTab] = useState<ProfileSubTab>(
    subtab ?? "activity",
  );
  const requestedSubTab = subtab ?? localSubTab;

  const [relationsDialogState, setRelationsDialogState] = useState<{
    isOpen: boolean;
    initialTab: "followers" | "following";
  }>({
    isOpen: false,
    initialTab: "followers",
  });

  const [internalSessionTarget, setInternalSessionTarget] =
    useState<ReadingSessionDto | null>(null);
  const [internalQuoteTarget, setInternalQuoteTarget] =
    useState<BookHighlightDto | null>(null);

  const resolveBookMeta = (
    bookId?: string | null,
    fallbackTitle?: string | null,
    fallbackCoverUrl?: string | null,
  ) => {
    const matched = bookId
      ? (shelves.find((item) => item.bookId === bookId)?.book ?? null)
      : null;

    return {
      title: matched?.title || fallbackTitle?.trim() || "AnzaBook",
      author: matched?.author ?? null,
      slug: matched?.slug ?? null,
      coverUrl: matched?.coverUrl ?? fallbackCoverUrl ?? null,
      coverColor: matched?.coverColor ?? null,
      publishedYear: matched?.publishedYear,
      genres: matched?.genres,
      pageCount: matched?.pageCount,
    };
  };

  const [fallbackTimestamp] = useState(() => Date.now());
  const [isCreatingDraft, setIsCreatingDraft] = useState(false);

  const finishedBooks = shelves.filter((s) => s.shelfStatus === "finished");

  const handleToggleFollow = async () => {
    if (!profile) return;
    if (profile.isFollowing) {
      await unfollowMutation.mutateAsync(profile.id);
    } else {
      await followMutation.mutateAsync({
        targetUserId: profile.id,
        isSubscribedUpdates: true,
      });
    }
  };

  const authorStudioReturnTo = "/app?tab=profile&subtab=author_studio";

  const handleStartNewManuscript = async () => {
    try {
      setIsCreatingDraft(true);
      const created = await createDraftMutation.mutateAsync({
        title: "",
        synopsis: "",
        proposedDigitalPolicy: "nakama_subscription",
        chapters: [
          {
            chapterNumber: 1,
            titleId: "",
            contentId: "",
            estimatedMinutes: 5,
          },
        ],
      });
      await refetchManuscripts();
      void navigate({
        to: "/read/$slug",
        params: { slug: `manuscript-${created.id}` },
        search: {
          editorial: "edit",
          returnTo: authorStudioReturnTo,
        } as never,
      });
    } catch {
      // handled
    } finally {
      setIsCreatingDraft(false);
    }
  };

  if (!profile && isMyProfileLoading) {
    return (
      <div className="py-20 text-center text-muted-foreground animate-pulse text-xs font-mono">
        Memuat data profil sosial AnzaBook...
      </div>
    );
  }

  const name = profile?.name || "Pembaca AnzaBook";
  const username = profile?.username || "nakama";
  const bio =
    profile?.bio ||
    "Pembaca setia AnzaBook. Menikmati perjumpaan gagasan, catatan marjinalia, dan buku berkualitas.";

  const totalMinutesRead =
    profile?.totalReadingMinutes ||
    telemetrySummary?.totalMinutesRead ||
    Math.round(
      sessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0) / 60,
    );

  const ownerAuthorSummary = {
    id: profile?.id || "me",
    name,
    username: profile?.username ?? null,
    image: profile?.image ?? null,
  };

  const activityEntries: ProfileActivityEntry[] = [
    ...(userHighlights.data ?? []).map((hl): ProfileActivityEntry => {
      const meta = resolveBookMeta(hl.bookId, hl.bookTitle, hl.bookCoverUrl);
      const quotePost: ExplorePostItemDto = {
        id: hl.id,
        type: "quote",
        content: hl.selectedText,
        note: hl.note,
        postCaption: hl.postCaption ?? null,
        postConfig: hl.postConfig ?? null,
        color: hl.color,
        chapterNumber: hl.chapterNumber,
        pageNumber: hl.pageNumber,
        createdAt: hl.postedAt || hl.createdAt,
        author: ownerAuthorSummary,
        book: {
          id: hl.bookId,
          slug: hl.bookSlug || meta.slug || hl.bookId,
          title: hl.bookTitle || meta.title,
          author: hl.bookAuthor || meta.author || "AnzaBook",
          coverUrl: hl.bookCoverUrl ?? meta.coverUrl,
          coverColor: hl.bookCoverColor ?? meta.coverColor,
          publishedYear: hl.bookPublishedYear ?? meta.publishedYear,
          genres: hl.bookGenres ?? meta.genres,
          pageCount: hl.bookPageCount ?? meta.pageCount,
        },
      };

      return {
        post: quotePost,
        isPosted: Boolean(hl.isPosted),
        onOwnerShare: isOwnProfile
          ? () => {
              if (onOpenQuoteStory) {
                onOpenQuoteStory(hl);
                return;
              }
              setInternalQuoteTarget(hl);
            }
          : undefined,
      };
    }),
    ...sessions.map((session): ProfileActivityEntry => {
      const meta = resolveBookMeta(
        session.bookId,
        session.bookTitle,
        session.bookCoverUrl,
      );
      const sessionPost: ExplorePostItemDto = {
        id: session.id,
        type: "session",
        title: session.title ?? null,
        content: session.note?.trim() || "Menyelesaikan sesi membaca.",
        note: session.note ?? null,
        postConfig: session.postConfig ?? null,
        pagesRead: session.pagesRead,
        wordsRead: session.wordsRead ?? null,
        durationSeconds: session.durationSeconds,
        avgWpm: session.avgWpm,
        startProgressPercent: session.startProgressPercent ?? null,
        endProgressPercent: session.endProgressPercent ?? null,
        startChapterNumber: session.startChapterNumber ?? null,
        endChapterNumber: session.endChapterNumber ?? null,
        highlightsCount: session.highlightsCount ?? 0,
        createdAt: session.postedAt || session.createdAt,
        author: ownerAuthorSummary,
        book: {
          id: session.bookId,
          slug: meta.slug || session.bookId,
          title: session.bookTitle || meta.title,
          author: meta.author || "AnzaBook",
          coverUrl: session.bookCoverUrl ?? meta.coverUrl,
          coverColor: meta.coverColor,
          publishedYear: meta.publishedYear,
          genres: meta.genres,
          pageCount: meta.pageCount,
        },
      };

      return {
        post: sessionPost,
        isPosted: Boolean(session.isPosted),
        onOwnerShare: isOwnProfile
          ? () => {
              if (onOpenFlexStory) {
                onOpenFlexStory(session, session.bookTitle);
                return;
              }
              setInternalSessionTarget(session);
            }
          : undefined,
      };
    }),
    ...(profile?.publicReviews ?? []).map((review): ProfileActivityEntry => ({
      post: {
        id: review.id,
        type: "review",
        content: review.content,
        rating: review.rating,
        createdAt: review.createdAt,
        author: ownerAuthorSummary,
        book: review.book,
      },
      isPosted: true,
    })),
  ].sort(
    (a, b) =>
      new Date(b.post.createdAt).getTime() -
      new Date(a.post.createdAt).getTime(),
  );

  const profileTabs: ProfileTabItem<ProfileSubTab>[] = [
    {
      id: "activity",
      label: "Rak Bacaan",
      count: shelves.length,
      icon: <BookMarked className="size-4" aria-hidden="true" />,
    },
    {
      id: "reviews",
      label: "Aktivitas",
      count: activityEntries.length,
      icon: <Quote className="size-4" aria-hidden="true" />,
    },
    ...(isVerifiedAuthor || (profile?.publishedBooks?.length ?? 0) > 0
      ? [
          {
            id: "works" as const,
            label: "Karya",
            count: profile?.publishedBooks?.length || null,
            icon: <BookOpen className="size-4" aria-hidden="true" />,
          },
        ]
      : []),
    ...(isOwnProfile &&
    (isCommunityOwner ||
      (profile?.managedCommunities && profile.managedCommunities.length > 0))
      ? [
          {
            id: "community" as const,
            label: "Komunitas Saya",
            count: profile?.managedCommunities?.length || null,
            icon: <Calendar className="size-4" aria-hidden="true" />,
          },
        ]
      : []),
    ...(isOwnProfile && canAccessAuthorStudio
      ? [
          {
            id: "author_studio" as const,
            label: "Studio Penulis",
            count: manuscripts.length > 0 ? manuscripts.length : null,
            icon: <PenTool className="size-4" aria-hidden="true" />,
          },
        ]
      : []),
    ...(isOwnProfile &&
    (isPublisher ||
      (profile?.managedPublishers && profile.managedPublishers.length > 0))
      ? [
          {
            id: "publisher_studio" as const,
            label: "Studio Penerbit",
            count: profile?.managedPublishers?.length || null,
            icon: <Layers className="size-4" aria-hidden="true" />,
          },
        ]
      : []),
  ];

  const activeSubTab: ProfileSubTab =
    !profile || profileTabs.some((t) => t.id === requestedSubTab)
      ? requestedSubTab
      : "activity";

  const handleSubTabChange = (nextTab: ProfileSubTab) => {
    setLocalSubTab(nextTab);
    onSubTabChange?.(nextTab);
  };

  const rawUsername = profile?.username?.trim() || "";

  return (
    <div className="space-y-6 pb-12">
      <EntityProfileHeader
        kind="user"
        headingLevel="h2"
        ariaLabel="Informasi Profil Pengguna"
        name={name}
        handleOrSlug={`@${username}`}
        handleHref={rawUsername ? `/u/${rawUsername}` : undefined}
        avatarUrl={profile?.image}
        bannerUrl={profile?.headerImage || profile?.socialLinks?.headerImage}
        isVerified={isVerifiedAuthor}
        verifiedEntityType="author"
        shareConfig={
          rawUsername
            ? {
                entityType: isVerifiedAuthor ? "author" : "user",
                name,
                handle: rawUsername,
                avatarUrl: profile?.image,
                sharePath: `/u/${rawUsername}`,
              }
            : undefined
        }
        metaItems={
          profile?.locationCity
            ? [
                {
                  icon: <MapPin className="size-3.5" aria-hidden="true" />,
                  label: profile.locationCity,
                },
              ]
            : []
        }
        bio={bio}
        socialLinks={profile?.socialLinks}
        affiliations={
          isOwnProfile && isPendingAuthor ? (
            <div className="pt-1">
              <span className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[var(--color-accent)]/40 bg-[var(--color-accent-soft)] px-3 text-xs font-medium text-[var(--color-ink)]">
                <Clock className="size-3.5 shrink-0" aria-hidden="true" />
                <span>
                  Pengajuan Penulis Resmi sedang ditinjau oleh kurator AnzaBook.
                </span>
              </span>
            </div>
          ) : !isVerifiedAuthor && !isPendingAuthor && isOwnProfile ? (
            <div className="pt-1">
              <Link
                to="/partner-program"
                className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 text-xs font-medium text-[var(--color-ink-2)] hover:border-[var(--color-ink)] hover:text-[var(--color-ink)] transition-colors"
              >
                <span>Daftar Program Penulis Resmi</span>
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </div>
          ) : undefined
        }
        actions={
          isOwnProfile ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => onStartEdit?.()}
                className="min-h-11 px-4 text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5 rounded-xl border-[var(--color-rule)] bg-[var(--color-paper)] hover:bg-[var(--color-paper-3)] text-[var(--color-ink)] transition-colors"
              >
                <Edit3 className="size-4" aria-hidden="true" />
                <span>Sunting Profil</span>
              </Button>

              {onNavigateSettings && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onNavigateSettings}
                  className="min-h-11 px-4 text-xs font-medium cursor-pointer inline-flex items-center gap-1.5 rounded-xl border-[var(--color-rule)] bg-[var(--color-paper)] hover:bg-[var(--color-paper-3)]"
                  title="Buka Pengaturan Akun"
                >
                  <Settings className="size-4" aria-hidden="true" />
                  <span>Pengaturan</span>
                </Button>
              )}
            </>
          ) : (
            <Button
              type="button"
              onClick={handleToggleFollow}
              disabled={followMutation.isPending || unfollowMutation.isPending}
              className={`min-h-11 px-5 text-xs font-semibold cursor-pointer inline-flex items-center gap-2 rounded-xl ${
                profile?.isFollowing
                  ? "bg-[var(--color-paper)] text-[var(--color-ink)] border border-[var(--color-rule)] hover:bg-[var(--color-paper-3)]"
                  : "bg-[var(--color-accent)] text-[var(--color-accent-ink)] hover:brightness-95"
              }`}
            >
              {profile?.isFollowing ? (
                <>
                  <UserCheck className="size-4" aria-hidden="true" />
                  <span>Mengikuti</span>
                </>
              ) : (
                <>
                  <UserPlus className="size-4" aria-hidden="true" />
                  <span>Ikuti Penulis</span>
                </>
              )}
            </Button>
          )
        }
        metrics={[
          {
            label: "Pengikut",
            value: profile?.followersCount || 0,
            icon: <Users className="size-3.5" aria-hidden="true" />,
            title: "Lihat daftar pengikut",
            onClick: () =>
              setRelationsDialogState({
                isOpen: true,
                initialTab: "followers",
              }),
          },
          {
            label: "Mengikuti",
            value: profile?.followingCount || 0,
            icon: <UserCheck className="size-3.5" aria-hidden="true" />,
            title: "Lihat daftar akun yang diikuti",
            onClick: () =>
              setRelationsDialogState({
                isOpen: true,
                initialTab: "following",
              }),
          },
          {
            label: "Buku Tamat",
            value: finishedBooks.length,
            icon: <BookMarked className="size-3.5" aria-hidden="true" />,
          },
          {
            label: "Total Menit Baca",
            value: totalMinutesRead,
            unit: "menit",
            icon: <Clock className="size-3.5" aria-hidden="true" />,
          },
        ]}
      />

      <ProfileTabs
        tabs={profileTabs}
        activeTab={activeSubTab}
        onChange={handleSubTabChange}
        ariaLabel="Navigasi isi profil"
        idPrefix="dash-profile"
      />

      <div className="min-h-[55vh]">
        {/* Sub-Tab 1: Rak Bacaan */}
        {activeSubTab === "activity" && (
          <div role="tabpanel" aria-labelledby="dash-profile-tab-activity">
            <ProfileReadingShelf
              shelves={shelves}
              isOwner={isOwnProfile}
              ownerName={name}
            />
          </div>
        )}

        {/* Sub-Tab 2: Aktivitas */}
        {activeSubTab === "reviews" && (
          <div role="tabpanel" aria-labelledby="dash-profile-tab-reviews">
            <ProfileActivityFeed
              entries={activityEntries}
              isOwner={isOwnProfile}
              ownerName={name}
            />
          </div>
        )}

        {/* Sub-Tab 3: Komunitas Saya */}
        {activeSubTab === "community" && (
          <div
            role="tabpanel"
            aria-labelledby="dash-profile-tab-community"
            className="space-y-6"
          >
            <div className="rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-rule)] pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Calendar
                      className="size-5 text-[var(--color-accent)]"
                      aria-hidden="true"
                    />
                    <h3 className="font-serif text-lg font-bold">
                      Komunitas Literasi yang Anda Kelola
                    </h3>
                  </div>
                  <p className="text-xs text-[var(--color-muted)]">
                    Kelola ruang baca, kalender agenda temu literasi, dan kas
                    afiliasi 10% untuk keberlanjutan komunitas.
                  </p>
                </div>

                <Link
                  to="/partner-program"
                  className="inline-flex min-h-11 items-center gap-1.5 px-4 rounded-xl bg-[var(--color-ink)] text-[var(--color-paper)] text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer self-start sm:self-auto shrink-0"
                >
                  <Plus className="size-3.5" aria-hidden="true" />
                  <span>Daftarkan Komunitas Baru</span>
                </Link>
              </div>

              {!profile?.managedCommunities ||
              profile.managedCommunities.length === 0 ? (
                <div className="p-8 rounded-xl border border-dashed border-[var(--color-rule)] text-center space-y-3">
                  <p className="text-xs text-[var(--color-muted)]">
                    Anda belum memiliki komunitas terdaftar atau pengajuan Anda
                    masih diproses.
                  </p>
                  <Link
                    to="/partner-program"
                    className="inline-flex min-h-11 items-center gap-1.5 px-4 rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] hover:bg-[var(--color-paper-3)] text-xs font-medium"
                  >
                    <Plus className="size-3.5" aria-hidden="true" />
                    <span>Ajukan Pendaftaran Komunitas</span>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {profile.managedCommunities.map((c) => {
                    const isVerified =
                      c.verificationStatus === "verified" ||
                      c.verificationStatus === "trusted";
                    const isPending = c.verificationStatus === "pending";
                    return (
                      <EntityDirectoryCard
                        key={c.id}
                        kind="community"
                        name={c.name}
                        to="/c/$slug"
                        params={{ slug: c.slug }}
                        avatarUrl={c.avatarUrl}
                        bannerUrl={c.coverUrl}
                        city={c.city}
                        description={c.description}
                        verificationStatus={c.verificationStatus}
                        rejectionReason={c.rejectionReason}
                        footerMeta={`Peran: ${formatRoleName(c.role)}`}
                        notice={
                          isPending ? (
                            <p className="mt-2 text-xs text-[var(--color-muted)] bg-[var(--color-paper)] border border-[var(--color-rule)] p-2.5 rounded-lg leading-relaxed">
                              Pengajuan komunitas sedang ditinjau kurator
                              AnzaBook. Anda dapat membuat agenda publik setelah
                              disetujui.
                            </p>
                          ) : undefined
                        }
                        actions={
                          isVerified ? (
                            <>
                              <Link
                                to="/c/$slug"
                                params={{ slug: c.slug }}
                                className="inline-flex min-h-11 items-center rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 text-xs font-medium hover:bg-[var(--color-paper-3)]"
                              >
                                Halaman Publik
                              </Link>
                              <Link
                                to="/app"
                                search={{ tab: "community", slug: c.slug }}
                                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-[var(--color-accent)] px-3.5 text-xs font-semibold text-[var(--color-accent-ink)] hover:brightness-95"
                              >
                                <span>Kelola Komunitas</span>
                                <ArrowRight
                                  className="size-3.5"
                                  aria-hidden="true"
                                />
                              </Link>
                            </>
                          ) : (
                            <span className="text-xs text-[var(--color-muted)] italic">
                              Verifikasi dibutuhkan
                            </span>
                          )
                        }
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sub-Tab 4: Karya Penulis Resmi */}
        {activeSubTab === "works" && (
          <div
            role="tabpanel"
            aria-labelledby="dash-profile-tab-works"
            className="space-y-6"
          >
            <div className="p-6 rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-rule)] pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <BookOpen
                      className="size-5 text-[var(--color-accent)]"
                      aria-hidden="true"
                    />
                    <h3 className="font-serif text-lg font-bold">
                      Katalog Karya Resmi Terbitan
                    </h3>
                  </div>
                  <p className="text-xs text-[var(--color-muted)]">
                    Buku resmi Anda yang telah diterbitkan dan dapat diakses
                    oleh pembaca AnzaBook.
                  </p>
                </div>

                {isVerifiedAuthor && (
                  <Button
                    type="button"
                    onClick={handleStartNewManuscript}
                    disabled={isCreatingDraft}
                    className="bg-[var(--color-ink)] text-[var(--color-paper)] hover:opacity-90 text-xs font-semibold min-h-11 px-4 rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="size-3.5" aria-hidden="true" />
                    <span>
                      {isCreatingDraft
                        ? "Menyiapkan Draf..."
                        : "Tulis Karya Baru"}
                    </span>
                  </Button>
                )}
              </div>

              {!profile?.publishedBooks ||
              profile.publishedBooks.length === 0 ? (
                <div className="p-10 rounded-xl border border-dashed border-[var(--color-rule)] text-center space-y-2">
                  <BookOpen
                    className="size-8 mx-auto text-[var(--color-muted)]"
                    aria-hidden="true"
                  />
                  <p className="text-xs text-[var(--color-muted)]">
                    Belum ada buku resmi yang diterbitkan atas nama profil Anda.
                  </p>
                  <p className="text-xs text-[var(--color-muted)]">
                    Gunakan Studio Penulis untuk menyusun draf naskah dan
                    mengajukannya ke mitra penerbit resmi AnzaBook.
                  </p>
                </div>
              ) : (
                <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                  {profile.publishedBooks.map((book) => (
                    <li key={book.id}>
                      <BookCard book={book} variant="catalog" />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* Sub-Tab 5: Studio Penulis */}
        {activeSubTab === "author_studio" && (
          <div
            role="tabpanel"
            aria-labelledby="dash-profile-tab-author_studio"
            className="space-y-6"
          >
            <div className="p-6 rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <PenTool
                    className="size-5 text-[var(--color-accent)]"
                    aria-hidden="true"
                  />
                  <h3 className="font-serif text-lg font-bold">
                    Studio Penulis AnzaBook
                  </h3>
                </div>
                <p className="text-xs text-[var(--color-muted)] max-w-xl leading-relaxed">
                  Tulis naskah buku dengan penyunting teks yang bersih dan
                  fokus. Simpan draf otomatis, kelola chapter di daftar isi, dan
                  ajukan langsung ke mitra penerbit untuk diterbitkan.
                </p>
              </div>

              <Button
                type="button"
                onClick={handleStartNewManuscript}
                disabled={isCreatingDraft}
                className="bg-[var(--color-ink)] text-[var(--color-paper)] hover:opacity-90 min-h-11 px-5 text-xs font-semibold cursor-pointer shrink-0 inline-flex items-center gap-2 rounded-xl"
              >
                <Plus className="size-4" aria-hidden="true" />
                <span>
                  {isCreatingDraft ? "Membuka Studio..." : "Tulis Naskah Baru"}
                </span>
              </Button>
            </div>

            <div className="space-y-3">
              <h4 className="font-serif text-base font-bold flex items-center gap-2">
                <BookOpen
                  className="size-4 text-[var(--color-accent)]"
                  aria-hidden="true"
                />
                <span>Naskah &amp; Draf Saya ({manuscripts.length})</span>
              </h4>

              {manuscripts.length === 0 ? (
                <div className="p-10 rounded-xl border border-dashed border-[var(--color-rule)] text-center space-y-3">
                  <p className="text-xs text-[var(--color-muted)]">
                    Anda belum memiliki draf atau naskah buku di studio.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleStartNewManuscript}
                    disabled={isCreatingDraft}
                    className="min-h-11 text-xs cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Plus className="size-3.5" aria-hidden="true" />
                    <span>Mulai Tulis Naskah Baru</span>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {manuscripts.map((item) => {
                    const hasTitle = item.title.trim().length > 0;
                    const displayTitle = hasTitle
                      ? item.title
                      : "Naskah Tanpa Judul";
                    const hasRealCover =
                      item.coverUrl === "template" ||
                      isUsableAssetUrl(item.coverUrl);
                    const isLockedByPublisher =
                      item.status === "in_editing" ||
                      item.status === "published";
                    const editorialMode =
                      item.status === "draft" ? "edit" : "preview";

                    const actionItems: ItemActionOption[] = [
                      {
                        id: "edit",
                        label: "Edit Naskah",
                        icon: <PenTool className="size-4" aria-hidden="true" />,
                        onSelect: () => {
                          void navigate({
                            to: "/read/$slug",
                            params: { slug: `manuscript-${item.id}` },
                            search: {
                              editorial: editorialMode,
                              returnTo: authorStudioReturnTo,
                            } as never,
                          });
                        },
                      },
                      ...(item.status === "pending_review"
                        ? [
                            {
                              id: "withdraw",
                              label:
                                withdrawingId === item.id
                                  ? "Menarik Pengajuan..."
                                  : "Tarik Pengajuan",
                              icon: (
                                <RotateCcw
                                  className="size-4"
                                  aria-hidden="true"
                                />
                              ),
                              disabled: withdrawingId === item.id,
                              onSelect: () => {
                                void (async () => {
                                  setWithdrawFeedback(null);
                                  setWithdrawingId(item.id);
                                  try {
                                    await withdrawMutation.mutateAsync(item.id);
                                    setWithdrawFeedback({
                                      id: item.id,
                                      message:
                                        "Naskah berhasil ditarik kembali ke draf.",
                                    });
                                  } catch (error) {
                                    setWithdrawFeedback({
                                      id: item.id,
                                      isError: true,
                                      message:
                                        error instanceof Error
                                          ? error.message
                                          : "Gagal menarik kembali naskah.",
                                    });
                                  } finally {
                                    setWithdrawingId(null);
                                  }
                                })();
                              },
                            } satisfies ItemActionOption,
                          ]
                        : []),
                      {
                        id: "delete",
                        label: "Hapus Naskah",
                        variant: "destructive",
                        icon: <Trash2 className="size-4" aria-hidden="true" />,
                        disabled: isLockedByPublisher,
                        description:
                          item.status === "in_editing"
                            ? "Sedang disunting penerbit. Tidak dapat dihapus."
                            : item.status === "published"
                              ? "Sudah terbit menjadi buku resmi."
                              : item.status === "pending_review"
                                ? "Pengajuan akan ditarik dulu sebelum dihapus."
                                : undefined,
                        onSelect: () => {
                          setDeleteError(null);
                          setDeleteTarget(item);
                        },
                      },
                    ];

                    return (
                      <div
                        key={item.id}
                        className="relative rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-4 sm:p-5 hover:border-[var(--color-ink)]/40 hover:z-20 focus-within:z-20 transition-colors"
                      >
                        <Link
                          to="/read/$slug"
                          params={{ slug: `manuscript-${item.id}` }}
                          search={
                            {
                              editorial: editorialMode,
                              returnTo: authorStudioReturnTo,
                            } as never
                          }
                          aria-label={`Buka naskah ${displayTitle}`}
                          className="absolute inset-0 z-[1] rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
                        />

                        <div className="relative z-[3] pointer-events-none flex items-start gap-4">
                          {hasRealCover ? (
                            <BookCover
                              book={{
                                title: displayTitle,
                                author:
                                  item.authorPenName || item.authorName || name,
                                coverUrl: item.coverUrl,
                                coverColor: item.coverColor,
                                genres: item.category
                                  ? [item.category]
                                  : undefined,
                              }}
                              className="w-16 shrink-0"
                              decorative
                            />
                          ) : (
                            <ManuscriptCoverPlaceholder
                              title={item.title}
                              compact
                              className="w-16 shrink-0"
                            />
                          )}

                          <div className="min-w-0 flex-1 space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <h5
                                className={
                                  hasTitle
                                    ? "font-serif text-base font-bold text-[var(--color-ink)]"
                                    : "font-serif text-base font-normal italic text-[var(--color-muted)]"
                                }
                              >
                                {displayTitle}
                              </h5>
                              <span
                                className={`px-2.5 py-0.5 rounded-md text-[10px] font-semibold uppercase border ${getManuscriptStatusBadgeClass(
                                  item.status,
                                )}`}
                              >
                                {formatManuscriptStatus(item.status)}
                              </span>
                            </div>

                            <p className="text-xs text-[var(--color-muted)] line-clamp-2">
                              {item.synopsis.trim() ||
                                "Belum ada sinopsis naskah."}
                            </p>

                            {item.editorialNotes && (
                              <div className="mt-2 p-2.5 rounded-lg bg-[var(--color-paper)] border border-[var(--color-rule)] text-xs text-[var(--color-ink-2)]">
                                <span className="font-semibold text-xs block text-[var(--color-ink)] mb-0.5">
                                  Catatan Redaksi Penerbit:
                                </span>
                                {item.editorialNotes}
                              </div>
                            )}
                          </div>

                          <div className="pointer-events-auto shrink-0">
                            <ItemActionDrawer
                              ariaLabel={`Tindakan untuk ${displayTitle}`}
                              title={displayTitle}
                              iconVariant="vertical"
                              items={actionItems}
                            />
                          </div>
                        </div>

                        {withdrawFeedback?.id === item.id && (
                          <p
                            role={withdrawFeedback.isError ? "alert" : "status"}
                            className={`relative z-[2] mt-3 text-xs rounded-lg px-3 py-2 border ${
                              withdrawFeedback.isError
                                ? "border-[var(--color-error)]/40 bg-[var(--color-error-soft)] text-[var(--color-ink)]"
                                : "border-[var(--color-green)]/40 bg-[var(--color-green-soft)] text-[var(--color-ink)]"
                            }`}
                          >
                            {withdrawFeedback.message}
                          </p>
                        )}

                        <div className="relative z-[2] pointer-events-none mt-3 pt-2.5 border-t border-[var(--color-rule)] flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--color-muted)] font-mono">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span>
                              {item.chapters?.length || item.totalChapters || 1}{" "}
                              chapter
                            </span>
                            <span>
                              Diperbarui{" "}
                              {new Date(
                                item.updatedAt || fallbackTimestamp,
                              ).toLocaleDateString("id-ID")}
                            </span>
                          </div>
                          <div>
                            Skema:{" "}
                            <strong className="text-[var(--color-ink)] font-sans font-semibold">
                              {formatDigitalPolicy(item.proposedDigitalPolicy)}
                            </strong>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sub-Tab 6: Studio Penerbit */}
        {activeSubTab === "publisher_studio" && (
          <div
            role="tabpanel"
            aria-labelledby="dash-profile-tab-publisher_studio"
            className="space-y-6"
          >
            <div className="p-6 rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-rule)] pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Building2
                      className="size-5 text-[var(--color-accent)]"
                      aria-hidden="true"
                    />
                    <h3 className="font-serif text-lg font-bold">
                      Mitra Penerbit yang Anda Kelola
                    </h3>
                  </div>
                  <p className="text-xs text-[var(--color-muted)]">
                    Kelola profil penerbit, katalog naskah buku berlisensi
                    IKAPI, dan tinjau naskah masuk dari penulis.
                  </p>
                </div>

                <Link
                  to="/publishers/new"
                  className="inline-flex min-h-11 items-center gap-1.5 px-4 rounded-xl bg-[var(--color-ink)] text-[var(--color-paper)] text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer self-start sm:self-auto shrink-0"
                >
                  <Plus className="size-3.5" aria-hidden="true" />
                  <span>Daftarkan Penerbit Baru</span>
                </Link>
              </div>

              {!profile?.managedPublishers ||
              profile.managedPublishers.length === 0 ? (
                <div className="p-8 rounded-xl border border-dashed border-[var(--color-rule)] text-center space-y-3">
                  <p className="text-xs text-[var(--color-muted)]">
                    Anda belum memiliki penerbit terdaftar atau pengajuan Anda
                    masih diproses.
                  </p>
                  <Link
                    to="/publishers/new"
                    className="inline-flex min-h-11 items-center gap-1.5 px-4 rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] hover:bg-[var(--color-paper-3)] text-xs font-medium"
                  >
                    <Plus className="size-3.5" aria-hidden="true" />
                    <span>Ajukan Pendaftaran Penerbit</span>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {profile.managedPublishers.map((p) => {
                    const isVerified = p.verificationStatus === "verified";
                    const isPending = p.verificationStatus === "pending";
                    return (
                      <EntityDirectoryCard
                        key={p.id}
                        kind="publisher"
                        name={p.name}
                        to="/p/$slug"
                        params={{ slug: p.slug }}
                        avatarUrl={p.logoUrl}
                        bannerUrl={p.headerImageUrl}
                        city={p.city}
                        description={p.description}
                        topics={p.topics}
                        verificationStatus={p.verificationStatus}
                        rejectionReason={p.rejectionReason}
                        footerMeta={`Peran: ${formatRoleName(p.role)}`}
                        notice={
                          isPending ? (
                            <p className="mt-2 text-xs text-[var(--color-muted)] bg-[var(--color-paper)] border border-[var(--color-rule)] p-2.5 rounded-lg leading-relaxed">
                              Pengajuan penerbit sedang diverifikasi nomor IKAPI
                              dan legalitasnya oleh tim AnzaBook.
                            </p>
                          ) : undefined
                        }
                        actions={
                          <>
                            <Link
                              to="/p/$slug"
                              params={{ slug: p.slug }}
                              className="inline-flex min-h-11 items-center rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 text-xs font-medium hover:bg-[var(--color-paper-3)]"
                            >
                              Halaman Publik
                            </Link>
                            {isVerified ? (
                              <Link
                                to="/p/$slug/studio"
                                params={{ slug: p.slug }}
                                search={{
                                  returnTo:
                                    "/app?tab=profile&subtab=publisher_studio",
                                }}
                                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-[var(--color-accent)] px-3.5 text-xs font-semibold text-[var(--color-accent-ink)] hover:brightness-95"
                              >
                                <span>Buka Studio Penerbit</span>
                                <ArrowRight
                                  className="size-3.5"
                                  aria-hidden="true"
                                />
                              </Link>
                            ) : (
                              <span className="text-xs text-[var(--color-muted)] italic">
                                Verifikasi dibutuhkan
                              </span>
                            )}
                          </>
                        }
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        title={
          deleteTarget?.title.trim()
            ? `Hapus "${deleteTarget.title}"?`
            : "Hapus Naskah Tanpa Judul?"
        }
        description={
          deleteTarget?.status === "pending_review"
            ? "Naskah ini sedang menunggu peninjauan penerbit. Menghapus akan menarik pengajuan terlebih dahulu lalu menghapus seluruh isi naskah secara permanen."
            : "Naskah dan seluruh chapter di dalamnya akan dihapus permanen dan tidak dapat dikembalikan."
        }
        warningNote={
          deleteTarget?.status === "pending_review"
            ? "Status saat ini: Menunggu Peninjauan. Pengajuan ke penerbit akan dibatalkan otomatis."
            : undefined
        }
        confirmLabel="Hapus Naskah"
        isPending={deleteManuscriptMutation.isPending}
        errorMessage={deleteError}
        onConfirm={async () => {
          if (!deleteTarget) return;
          setDeleteError(null);
          try {
            await deleteManuscriptMutation.mutateAsync({
              idOrSlug: deleteTarget.id,
              withdrawFirst: deleteTarget.status === "pending_review",
            });
            setDeleteTarget(null);
          } catch (error) {
            setDeleteError(
              error instanceof Error
                ? error.message
                : "Gagal menghapus naskah. Silakan coba lagi.",
            );
          }
        }}
        onClose={() => {
          if (!deleteManuscriptMutation.isPending) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
      />

      <SocialRelationsDialog
        isOpen={relationsDialogState.isOpen}
        onClose={() =>
          setRelationsDialogState((prev) => ({ ...prev, isOpen: false }))
        }
        targetUsername={username}
        initialTab={relationsDialogState.initialTab}
        currentUserId={myProfile?.id}
      />

      {!onOpenFlexStory &&
        internalSessionTarget &&
        (() => {
          const sessionMeta = resolveBookMeta(
            internalSessionTarget.bookId,
            internalSessionTarget.bookTitle,
            internalSessionTarget.bookCoverUrl,
          );
          return (
            <FlexReadingDialog
              isOpen={Boolean(internalSessionTarget)}
              onClose={() => setInternalSessionTarget(null)}
              session={internalSessionTarget}
              bookTitle={sessionMeta.title}
              bookAuthor={sessionMeta.author}
              bookSlug={sessionMeta.slug}
              bookCoverUrl={sessionMeta.coverUrl}
              bookCoverColor={sessionMeta.coverColor}
              streakDays={telemetrySummary?.currentStreakDays ?? null}
              recentSessions={sessions}
              userName={profile?.name || "Pembaca AnzaBook"}
            />
          );
        })()}

      {!onOpenQuoteStory &&
        internalQuoteTarget &&
        (() => {
          const quoteMeta = resolveBookMeta(
            internalQuoteTarget.bookId,
            internalQuoteTarget.bookTitle,
            internalQuoteTarget.bookCoverUrl,
          );
          return (
            <HighlightStoryDialog
              isOpen={Boolean(internalQuoteTarget)}
              onClose={() => setInternalQuoteTarget(null)}
              highlightId={internalQuoteTarget.id}
              bookTitle={quoteMeta.title}
              bookAuthor={quoteMeta.author}
              bookSlug={quoteMeta.slug}
              bookCoverUrl={
                internalQuoteTarget.bookCoverUrl ?? quoteMeta.coverUrl
              }
              bookCoverColor={quoteMeta.coverColor}
              chapterNumber={internalQuoteTarget.chapterNumber}
              pageNumber={internalQuoteTarget.pageNumber}
              highlightText={internalQuoteTarget.selectedText}
              color={internalQuoteTarget.color}
              note={internalQuoteTarget.note || undefined}
              isPosted={internalQuoteTarget.isPosted}
              postCaption={internalQuoteTarget.postCaption}
              postConfig={internalQuoteTarget.postConfig}
              readerName={profile?.name || "Pembaca AnzaBook"}
            />
          );
        })()}
    </div>
  );
}
