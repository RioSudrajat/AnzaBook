import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Award,
  BookMarked,
  BookOpen,
  Building2,
  Calendar,
  Check,
  CheckCircle,
  CheckCircle2,
  Clock,
  Edit3,
  ExternalLink,
  Flame,
  Layers,
  MapPin,
  MessageSquare,
  PenTool,
  Plus,
  Quote,
  RotateCcw,
  Settings,
  Share2,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import type {
  BookHighlightDto,
  ExplorePostItemDto,
  ReadingSessionDto,
  SocialProfileDto,
} from "@starter/shared/types";
import { EntityDirectoryCard } from "@/components/profile/entity-directory-card";
import { EntityProfileHeader } from "@/components/profile/entity-profile-header";
import {
  ProfileTabs,
  type ProfileTabItem,
} from "@/components/profile/profile-tabs";
import { Button } from "@/components/ui/button";
import { BookCover } from "@/features/books/components/book-cover";
import { useAllHighlights } from "@/features/books/hooks";
import { useReadingSessions, useUserShelves } from "@/features/community/hooks";
import { getManuscriptStatusBadgeClass } from "@/features/publisher/publisher-helpers";
import { HighlightStoryDialog } from "@/features/reader/components/highlight-story-dialog";
import { FlexReadingDialog } from "@/features/share/components/flex-reading-dialog";
import { QuotePostCard } from "@/features/share/components/quote-post-card";
import { SocialRelationsDialog } from "@/features/social/components/social-relations-dialog";
import {
  useCreateManuscriptDraft,
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
import { EditProfileView } from "./edit-profile-view";

type DashboardProfileProps = {
  isOwnProfile?: boolean;
  profile?: SocialProfileDto;
  isEditing?: boolean;
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
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
  const [withdrawFeedback, setWithdrawFeedback] = useState<{
    id: string;
    message: string;
    isError?: boolean;
  } | null>(null);
  const navigate = useNavigate();
  const isPublisher = Boolean(
    profile?.isPublisher ||
    (profile?.managedPublishers && profile.managedPublishers.length > 0),
  );
  const isCommunityOwner = Boolean(
    profile?.isCommunityOwner ||
    (profile?.managedCommunities && profile.managedCommunities.length > 0),
  );

  type ProfileSubTab =
    | "activity"
    | "reviews"
    | "community"
    | "works"
    | "author_studio"
    | "publisher_studio";
  const [activeSubTab, setActiveSubTab] = useState<ProfileSubTab>("activity");

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
    };
  };

  const [fallbackTimestamp] = useState(() => Date.now());
  const [isCopiedLink, setIsCopiedLink] = useState(false);
  const [isCreatingDraft, setIsCreatingDraft] = useState(false);

  const currentlyReading = shelves.filter((s) => s.shelfStatus === "reading");
  const finishedBooks = shelves.filter((s) => s.shelfStatus === "finished");

  const handleCopyProfileLink = async () => {
    const handle = profile?.username || "nakama";
    const profileUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/u/@${handle}`
        : `https://anzabook.id/u/@${handle}`;
    try {
      await navigator.clipboard.writeText(profileUrl);
      setIsCopiedLink(true);
      setTimeout(() => setIsCopiedLink(false), 2000);
    } catch {
      // ignore
    }
  };

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

  const handleStartNewManuscript = async () => {
    try {
      setIsCreatingDraft(true);
      const created = await createDraftMutation.mutateAsync({
        title: "Draf Naskah Baru",
        synopsis: "Sinopsis draf naskah awal.",
        proposedDigitalPolicy: "nakama_or_purchase",
        chapters: [
          {
            chapterNumber: 1,
            titleId: "Bab 1",
            contentId:
              "<p>Mulai menulis bab pertama karya Anda di sini secara langsung...</p>",
            estimatedMinutes: 5,
          },
        ],
      });
      await refetchManuscripts();
      navigate({
        to: "/read/$slug",
        params: { slug: `manuscript-${created.id}` },
        search: { editorial: "edit" },
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

  const profileTabs: ProfileTabItem<ProfileSubTab>[] = [
    {
      id: "activity",
      label: "Aktivitas & Rak Baca",
      icon: <BookOpen className="size-4" aria-hidden="true" />,
    },
    {
      id: "reviews",
      label: "Ulasan & Kutipan",
      icon: <Quote className="size-4" aria-hidden="true" />,
    },
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
    ...(isVerifiedAuthor
      ? [
          {
            id: "works" as const,
            label: "Karya Penulis",
            count: profile?.publishedBooks?.length || null,
            icon: <BookOpen className="size-4" aria-hidden="true" />,
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

  const badges = [
    {
      label: "Anggota Nakama",
      tone: "accent" as const,
      icon: <Award className="size-3.5" aria-hidden="true" />,
    },
    ...(isVerifiedAuthor
      ? [
          {
            label: "Penulis Resmi",
            tone: "success" as const,
            icon: <CheckCircle className="size-3.5" aria-hidden="true" />,
          },
        ]
      : []),
    ...(isPendingAuthor
      ? [
          {
            label: "Penulis: Menunggu Verifikasi Admin",
            tone: "warning" as const,
            icon: <Clock className="size-3.5" aria-hidden="true" />,
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6 pb-12">
      <EntityProfileHeader
        kind="user"
        headingLevel="h2"
        ariaLabel="Informasi Profil Pengguna"
        name={name}
        handleOrSlug={`@${username}`}
        handleHref={`/u/@${username}`}
        avatarUrl={profile?.image}
        bannerUrl={profile?.headerImage || profile?.socialLinks?.headerImage}
        badges={badges}
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
          !isVerifiedAuthor && !isPendingAuthor && isOwnProfile ? (
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

              <Button
                type="button"
                variant="outline"
                onClick={handleCopyProfileLink}
                className="min-h-11 px-3.5 text-xs font-medium cursor-pointer inline-flex items-center gap-1.5 rounded-xl border-[var(--color-rule)] bg-[var(--color-paper)] hover:bg-[var(--color-paper-3)] font-mono"
                title="Salin Tautan Profil Publik"
              >
                {isCopiedLink ? (
                  <>
                    <Check
                      className="size-4 text-[var(--color-green)]"
                      aria-hidden="true"
                    />
                    <span>Tersalin</span>
                  </>
                ) : (
                  <>
                    <Share2 className="size-4" aria-hidden="true" />
                    <span>Bagikan</span>
                  </>
                )}
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
            <>
              <Button
                type="button"
                onClick={handleToggleFollow}
                disabled={
                  followMutation.isPending || unfollowMutation.isPending
                }
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

              <Button
                type="button"
                variant="outline"
                onClick={handleCopyProfileLink}
                className="min-h-11 px-3.5 text-xs font-medium cursor-pointer inline-flex items-center gap-1.5 rounded-xl border-[var(--color-rule)] bg-[var(--color-paper)] hover:bg-[var(--color-paper-3)] font-mono"
              >
                {isCopiedLink ? (
                  <>
                    <Check
                      className="size-4 text-[var(--color-green)]"
                      aria-hidden="true"
                    />
                    <span>Tersalin</span>
                  </>
                ) : (
                  <>
                    <Share2 className="size-4" aria-hidden="true" />
                    <span>Bagikan</span>
                  </>
                )}
              </Button>
            </>
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
        onChange={setActiveSubTab}
        ariaLabel="Navigasi isi profil"
        idPrefix="dash-profile"
      />

      {/* Sub-Tab 1: Aktivitas & Rak Baca */}
      {activeSubTab === "activity" && (
        <div
          role="tabpanel"
          aria-labelledby="dash-profile-tab-activity"
          className="space-y-6"
        >
          <div className="space-y-3">
            <h3 className="font-serif text-lg font-bold flex items-center gap-2">
              <TrendingUp
                className="size-4 text-[var(--color-accent)]"
                aria-hidden="true"
              />
              <span>Sedang Dibaca ({currentlyReading.length})</span>
            </h3>

            {currentlyReading.length === 0 ? (
              <div className="p-6 rounded-xl border border-dashed border-[var(--color-rule)] text-center text-xs text-[var(--color-muted)]">
                Belum ada buku yang sedang dibaca. Telusuri katalog di tab
                Explore untuk mulai membaca.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {currentlyReading.map((shelf) => (
                  <div
                    key={shelf.id}
                    className="p-4 rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] hover:border-[var(--color-ink)]/30 transition-colors flex flex-col justify-between"
                  >
                    <div className="flex gap-3">
                      <Link
                        to="/read/$slug"
                        params={{ slug: shelf.book.slug }}
                        className="shrink-0 focus-visible:outline-2 focus-visible:outline-[var(--color-focus)] rounded-md"
                        title={shelf.book.title}
                      >
                        <BookCover
                          book={shelf.book}
                          className="w-16 shrink-0"
                          decorative
                        />
                      </Link>
                      <div className="min-w-0 flex-1 space-y-1.5 flex flex-col justify-between">
                        <div>
                          <Link
                            to="/read/$slug"
                            params={{ slug: shelf.book.slug }}
                            className="hover:underline"
                          >
                            <p className="font-serif font-bold text-sm text-[var(--color-ink)] line-clamp-2 leading-snug">
                              {shelf.book.title}
                            </p>
                          </Link>
                          <p className="text-xs text-[var(--color-muted)] truncate font-sans mt-0.5">
                            {shelf.book.author}
                          </p>
                        </div>

                        <div className="pt-2">
                          <div className="w-full bg-[var(--color-paper-3)] rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-[var(--color-accent)] h-1.5 rounded-full"
                              style={{
                                width: `${Math.min(100, Math.max(0, shelf.progressPercent))}%`,
                              }}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-[var(--color-muted)] mt-1 inline-block">
                            {shelf.progressPercent}% terbaca
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[var(--color-rule)] flex justify-end">
                      <Link
                        to="/read/$slug"
                        params={{ slug: shelf.book.slug }}
                        className="inline-flex min-h-10 items-center gap-1.5 text-xs font-semibold text-[var(--color-accent)] hover:underline"
                      >
                        <span>Lanjutkan Baca</span>
                        <ArrowRight className="size-3" aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3 pt-4 border-t border-[var(--color-rule)]">
            <h3 className="font-serif text-lg font-bold flex items-center gap-2">
              <CheckCircle2 className="size-4" aria-hidden="true" />
              <span>Buku Tamat ({finishedBooks.length})</span>
            </h3>

            {finishedBooks.length === 0 ? (
              <p className="text-xs text-[var(--color-muted)]">
                Belum ada buku yang ditandai tamat.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {finishedBooks.map((shelf) => (
                  <Link
                    key={shelf.id}
                    to="/books/$slug"
                    params={{ slug: shelf.book.slug }}
                    className="group space-y-2 text-center focus-visible:outline-2 focus-visible:outline-[var(--color-focus)] rounded-lg p-1"
                  >
                    <BookCover
                      book={shelf.book}
                      className="w-full group-hover:scale-[1.03] transition-transform"
                      decorative
                    />
                    <div className="space-y-0.5">
                      <p className="font-serif text-xs font-bold truncate text-[var(--color-ink)] group-hover:text-[var(--color-accent)] transition-colors">
                        {shelf.book.title}
                      </p>
                      <p className="font-sans text-[11px] text-[var(--color-muted)] truncate">
                        {shelf.book.author}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3 pt-4 border-t border-[var(--color-rule)]">
            <h3 className="font-serif text-lg font-bold flex items-center gap-2">
              <Flame
                className="size-4 text-[var(--color-accent)]"
                aria-hidden="true"
              />
              <span>Riwayat Sesi Membaca</span>
            </h3>

            {sessions.length === 0 ? (
              <p className="text-xs text-[var(--color-muted)]">
                Belum ada rekaman sesi baca.
              </p>
            ) : (
              <div className="space-y-2">
                {sessions.slice(0, 5).map((session) => {
                  const minutes = Math.floor(
                    (session.durationSeconds || 0) / 60,
                  );
                  const seconds = (session.durationSeconds || 0) % 60;
                  const durationText =
                    minutes > 0
                      ? `${minutes} menit baca`
                      : `${seconds || 0} detik baca`;
                  const wpmText =
                    session.avgWpm &&
                    session.avgWpm > 0 &&
                    session.avgWpm <= 600
                      ? `${session.avgWpm} WPM`
                      : null;

                  return (
                    <div
                      key={session.id}
                      className="p-3.5 rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] flex items-center justify-between gap-3 text-xs transition-colors"
                    >
                      <div className="space-y-1 min-w-0">
                        <p className="font-serif font-bold text-[var(--color-ink)] text-sm truncate">
                          {session.bookTitle}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--color-muted)] font-mono">
                          <span>{durationText}</span>
                          <span>{session.pagesRead} halaman</span>
                          {wpmText && <span>{wpmText}</span>}
                          <span>({session.mode || "standar"})</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
                        {session.isPosted && (
                          <Link
                            to="/post/$type/$id"
                            params={{ type: "session", id: session.id }}
                            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-[var(--color-rule)] px-3 text-xs font-medium text-[var(--color-ink)] hover:bg-[var(--color-paper-3)] transition-colors"
                          >
                            <ExternalLink
                              className="size-3.5"
                              aria-hidden="true"
                            />
                            <span>Lihat Post</span>
                          </Link>
                        )}
                        {isOwnProfile && (
                          <Button
                            type="button"
                            size="sm"
                            variant={session.isPosted ? "outline" : "default"}
                            onClick={() => {
                              if (onOpenFlexStory) {
                                onOpenFlexStory(session, session.bookTitle);
                                return;
                              }
                              setInternalSessionTarget(session);
                            }}
                            className={`text-xs min-h-11 px-3.5 rounded-xl inline-flex items-center gap-1.5 cursor-pointer shrink-0 ${
                              session.isPosted
                                ? "border-[var(--color-green)]/40 text-[var(--color-ink)] bg-[var(--color-green-soft)]"
                                : "bg-[var(--color-accent)] hover:brightness-95 text-[var(--color-accent-ink)] font-semibold"
                            }`}
                          >
                            <Share2 className="size-3.5" aria-hidden="true" />
                            <span>
                              {session.isPosted
                                ? "Bagikan Ulang"
                                : "Post & Bagikan"}
                            </span>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Ulasan & Kutipan */}
      {activeSubTab === "reviews" && (
        <div
          role="tabpanel"
          aria-labelledby="dash-profile-tab-reviews"
          className="space-y-6"
        >
          <div className="space-y-3">
            <h4 className="font-serif font-bold text-base flex items-center gap-2">
              <Quote
                className="size-4 text-[var(--color-accent)]"
                aria-hidden="true"
              />
              <span>
                Catatan Marjinalia &amp; Kutipan (
                {userHighlights.data?.length || 0})
              </span>
            </h4>
            {userHighlights.data?.length === 0 ? (
              <p className="text-xs text-[var(--color-muted)] p-6 rounded-xl border border-dashed border-[var(--color-rule)] text-center">
                Belum ada kutipan yang disimpan saat membaca buku. Tandai teks
                di E-Reader untuk membuat kutipan.
              </p>
            ) : (
              <div className="space-y-4">
                {userHighlights.data?.map((hl) => {
                  const meta = resolveBookMeta(
                    hl.bookId,
                    hl.bookTitle,
                    hl.bookCoverUrl,
                  );
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
                    author: {
                      id: profile?.id || hl.userId,
                      name: profile?.name || "Pembaca AnzaBook",
                      username: profile?.username ?? null,
                      image: profile?.image ?? null,
                    },
                    book: {
                      id: hl.bookId,
                      slug: hl.bookSlug || meta.slug || hl.bookId,
                      title: hl.bookTitle || meta.title,
                      author: hl.bookAuthor || meta.author || "AnzaBook",
                      coverUrl: hl.bookCoverUrl ?? meta.coverUrl,
                      coverColor: hl.bookCoverColor ?? meta.coverColor,
                      publishedYear: hl.bookPublishedYear ?? undefined,
                      genres: hl.bookGenres ?? undefined,
                      pageCount: hl.bookPageCount ?? undefined,
                    },
                  };

                  return (
                    <div
                      key={hl.id}
                      className="rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-4 sm:p-5 space-y-3"
                    >
                      <QuotePostCard
                        post={quotePost}
                        as="div"
                        footerActions={
                          <>
                            <span
                              className={`inline-flex items-center rounded-md border px-2.5 py-1 font-mono text-[11px] font-medium ${
                                hl.isPosted
                                  ? "border-[var(--color-green)]/40 bg-[var(--color-green-soft)] text-[var(--color-ink)]"
                                  : "border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-muted)]"
                              }`}
                            >
                              {hl.isPosted
                                ? "Dipublikasikan ke Eksplor"
                                : "Catatan Pribadi"}
                            </span>

                            <div className="flex flex-wrap items-center gap-2 ml-auto">
                              {hl.isPosted && (
                                <Link
                                  to="/post/$type/$id"
                                  params={{ type: "quote", id: hl.id }}
                                  className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 text-xs font-medium text-[var(--color-ink)] hover:bg-[var(--color-paper-3)] transition-colors"
                                >
                                  <ExternalLink
                                    className="size-3.5"
                                    aria-hidden="true"
                                  />
                                  <span>Lihat Post</span>
                                </Link>
                              )}
                              {isOwnProfile && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={hl.isPosted ? "outline" : "default"}
                                  onClick={() => {
                                    if (onOpenQuoteStory) {
                                      onOpenQuoteStory(hl);
                                      return;
                                    }
                                    setInternalQuoteTarget(hl);
                                  }}
                                  className={`text-xs min-h-11 px-3.5 rounded-xl inline-flex items-center gap-1.5 cursor-pointer ${
                                    hl.isPosted
                                      ? "border-[var(--color-green)]/40 text-[var(--color-ink)] bg-[var(--color-green-soft)]"
                                      : "bg-[var(--color-accent)] hover:brightness-95 text-[var(--color-accent-ink)] font-semibold"
                                  }`}
                                >
                                  <Share2
                                    className="size-3.5"
                                    aria-hidden="true"
                                  />
                                  <span>
                                    {hl.isPosted
                                      ? "Bagikan Ulang"
                                      : "Post & Bagikan"}
                                  </span>
                                </Button>
                              )}
                            </div>
                          </>
                        }
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-3 pt-4 border-t border-[var(--color-rule)]">
            <h4 className="font-serif font-bold text-base flex items-center gap-2">
              <MessageSquare
                className="size-4 text-[var(--color-accent)]"
                aria-hidden="true"
              />
              <span>Ulasan Buku ({profile?.publicReviews?.length || 0})</span>
            </h4>
            {profile?.publicReviews && profile.publicReviews.length > 0 ? (
              <div className="space-y-3">
                {profile.publicReviews.map((r) => (
                  <div
                    key={r.id}
                    className="p-4 rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-serif font-bold text-sm text-[var(--color-ink)]">
                        {r.book.title}
                      </span>
                      <span className="font-mono text-xs font-semibold text-[var(--color-ink-2)]">
                        {r.rating.toFixed(1)} / 5
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-[var(--color-ink-2)] font-serif leading-relaxed">
                      {r.content}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[var(--color-muted)] p-6 rounded-xl border border-dashed border-[var(--color-rule)] text-center">
                Belum ada ulasan buku yang ditulis.
              </p>
            )}
          </div>
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
                  Buku resmi Anda yang telah diterbitkan dan dapat diakses oleh
                  pembaca AnzaBook.
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

            {!profile?.publishedBooks || profile.publishedBooks.length === 0 ? (
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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {profile.publishedBooks.map((book) => (
                  <Link
                    key={book.id}
                    to="/books/$slug"
                    params={{ slug: book.slug }}
                    className="group space-y-2 text-left focus-visible:outline-2 focus-visible:outline-[var(--color-focus)] rounded-xl p-2.5 border border-[var(--color-rule)] hover:border-[var(--color-ink)]/40 transition-colors bg-[var(--color-paper)]"
                  >
                    <BookCover
                      book={book}
                      className="w-full group-hover:scale-[1.02] transition-transform"
                      decorative
                    />
                    <div className="space-y-0.5 pt-1">
                      <p className="font-serif text-xs font-bold text-[var(--color-ink)] group-hover:text-[var(--color-accent)] transition-colors line-clamp-2">
                        {book.title}
                      </p>
                      <p className="text-[11px] font-mono text-[var(--color-muted)]">
                        {book.categories?.[0] || "Umum"}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
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
                Tulis naskah buku dengan penyunting teks yang bersih dan fokus.
                Simpan draf otomatis, kelola bab di daftar isi, dan ajukan
                langsung ke mitra penerbit untuk diterbitkan.
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
                {manuscripts.map((item) => (
                  <div
                    key={item.id}
                    className="p-5 rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] space-y-3 hover:border-[var(--color-ink)]/30 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h5 className="font-serif font-bold text-base text-[var(--color-ink)]">
                            {item.title}
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
                          {item.synopsis || "Belum ada sinopsis naskah."}
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

                      <div className="flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-auto">
                        {item.status === "pending_review" && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={withdrawingId === item.id}
                            onClick={async () => {
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
                            }}
                            className="min-h-11 text-xs font-medium cursor-pointer inline-flex items-center gap-1.5 rounded-xl border-[var(--color-rule)]"
                          >
                            <RotateCcw
                              className="size-3.5"
                              aria-hidden="true"
                            />
                            <span>
                              {withdrawingId === item.id
                                ? "Menarik..."
                                : "Tarik Kembali"}
                            </span>
                          </Button>
                        )}

                        <Button
                          type="button"
                          size="sm"
                          onClick={() =>
                            navigate({
                              to: "/read/$slug",
                              params: { slug: `manuscript-${item.id}` },
                              search: {
                                editorial:
                                  item.status === "draft" ? "edit" : "preview",
                              },
                            })
                          }
                          className="min-h-11 bg-[var(--color-ink)] text-[var(--color-paper)] hover:opacity-90 text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5 rounded-xl"
                        >
                          <PenTool className="size-3.5" aria-hidden="true" />
                          <span>
                            {item.status === "draft"
                              ? "Lanjutkan Menulis"
                              : "Buka Editor Naskah"}
                          </span>
                        </Button>
                      </div>
                    </div>

                    {withdrawFeedback?.id === item.id && (
                      <p
                        role={withdrawFeedback.isError ? "alert" : "status"}
                        className={`text-xs rounded-lg px-3 py-2 border ${
                          withdrawFeedback.isError
                            ? "border-[var(--color-error)]/40 bg-[var(--color-error-soft)] text-[var(--color-ink)]"
                            : "border-[var(--color-green)]/40 bg-[var(--color-green-soft)] text-[var(--color-ink)]"
                        }`}
                      >
                        {withdrawFeedback.message}
                      </p>
                    )}

                    <div className="pt-2 border-t border-[var(--color-rule)] flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--color-muted)] font-mono">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span>
                          {item.chapters?.length || item.totalChapters || 1} bab
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
                ))}
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
                  Kelola profil penerbit, katalog naskah buku berlisensi IKAPI,
                  dan tinjau naskah masuk dari penulis.
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
