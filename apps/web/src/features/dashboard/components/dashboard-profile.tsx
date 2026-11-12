import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowRight,
  BookMarked,
  BookOpen,
  Building2,
  Calendar,
  Check,
  CheckCircle,
  CheckCircle2,
  Clock,
  Copy,
  Edit3,
  Flame,
  Globe,
  ImageIcon,
  Layers,
  MapPin,
  MessageSquare,
  PenTool,
  Plus,
  Quote,
  Settings,
  Share2,
  Sparkles,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import type {
  ReadingSessionDto,
  SocialProfileDto,
} from "@starter/shared/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUserShelves } from "@/features/community/hooks";
import { useReadingSessions } from "@/features/community/hooks";
import {
  useApplyAuthor,
  useCreateManuscriptDraft,
  useFollowUser,
  useMyManuscripts,
  useMySocialProfile,
  useTogglePostHighlight,
  useTogglePostSession,
  useUnfollowUser,
} from "@/features/social/hooks";
import { useAllHighlights } from "@/features/books/hooks";
import { BookCover } from "@/features/books/components/book-cover";
import { SocialRelationsDialog } from "@/features/social/components/social-relations-dialog";
import { EditProfileView } from "./edit-profile-view";
import { ApiError } from "@/lib/api/client";
import {
  formatRoleName,
  formatManuscriptStatus,
  formatDigitalPolicy,
} from "@/lib/formatters";

function InstagramIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function XTwitterIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedInIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.64 1.64 0 1 0 0-3.28 1.64 1.64 0 0 0 0 3.28m1.39 9.74v-8.37H5.07v8.37h2.78z" />
    </svg>
  );
}

type DashboardProfileProps = {
  isOwnProfile?: boolean;
  profile?: SocialProfileDto;
  isEditing?: boolean;
  onStartEdit?: () => void;
  onFinishEdit?: () => void;
  onNavigateSettings?: () => void;
  onOpenFlexStory?: (session: ReadingSessionDto, bookTitle: string) => void;
};

export function DashboardProfile({
  isOwnProfile = true,
  profile: externalProfile,
  isEditing = false,
  onStartEdit,
  onFinishEdit,
  onNavigateSettings,
  onOpenFlexStory,
}: DashboardProfileProps) {
  // If in edit mode, render dedicated EditProfileView inside the app canvas
  if (isEditing) {
    return (
      <EditProfileView
        onBack={() => {
          if (onFinishEdit) {
            onFinishEdit();
          }
        }}
      />
    );
  }

  // Queries
  const { data: myProfile, isLoading: isMyProfileLoading } =
    useMySocialProfile();
  const profile = externalProfile || myProfile;

  const { data: shelves = [] } = useUserShelves();
  const { data: sessionsData } = useReadingSessions();
  const sessions = sessionsData?.data || [];
  const telemetrySummary = sessionsData?.summary;
  const { data: manuscripts = [], refetch: refetchManuscripts } = useMyManuscripts();
  const userHighlights = useAllHighlights();

  // Mutations
  const followMutation = useFollowUser();
  const unfollowMutation = useUnfollowUser();
  const createDraftMutation = useCreateManuscriptDraft();
  const togglePostHighlightMutation = useTogglePostHighlight();
  const togglePostSessionMutation = useTogglePostSession();
  const navigate = useNavigate();

  // Role checks for tabs
  const isVerifiedAuthor = profile?.authorStatus === "verified";
  const isPendingAuthor = profile?.authorStatus === "pending";
  const isPublisher = Boolean(
    profile?.isPublisher ||
      (profile?.managedPublishers && profile.managedPublishers.length > 0),
  );
  const isCommunityOwner = Boolean(
    profile?.isCommunityOwner ||
      (profile?.managedCommunities && profile.managedCommunities.length > 0),
  );

  // Sub-tabs
  type ProfileSubTab =
    | "activity"
    | "reviews"
    | "community"
    | "works"
    | "author_studio"
    | "publisher_studio";
  const [activeSubTab, setActiveSubTab] = useState<ProfileSubTab>("activity");

  // Relations Dialog (Followers / Following Substack modal)
  const [relationsDialogState, setRelationsDialogState] = useState<{
    isOpen: boolean;
    initialTab: "followers" | "following";
  }>({
    isOpen: false,
    initialTab: "followers",
  });

  // E-Reader Studio & Modal states
  const [activeStudioManuscriptId, setActiveStudioManuscriptId] = useState<
    string | null
  >(null);
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
        proposedDigitalPolicy: "hybrid_nakama_alacarte",
        chapters: [
          {
            chapterNumber: 1,
            titleId: "Bab 1",
            contentId:
              "<p>Mulai menulis bab pertama karya Anda di sini secara langsung layaknya Medium atau Substack...</p>",
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
  const avatarLetter = name.slice(0, 1).toUpperCase();
  const bio =
    profile?.bio ||
    "Pembaca setia AnzaBook. Menikmati perjumpaan gagasan, catatan marjinalia, dan buku berkualitas.";

  return (
    <div className="space-y-6">
      {/* 1. Header Profil Sosial (Substack Aesthetic) */}
      <section
        aria-label="Informasi Profil Pengguna"
        className="rounded-[16px] border border-border bg-card shadow-xs relative overflow-hidden"
      >
        {/* Banner Header Image */}
        <div className="w-full h-36 sm:h-52 bg-muted relative overflow-hidden">
          {profile?.headerImage && profile.headerImage.trim() !== "" ? (
            <img
              src={profile.headerImage}
              alt="Header Profil"
              className="size-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = "none";
              }}
            />
          ) : (
            <div className="size-full bg-gradient-to-r from-stone-900 via-stone-800 to-zinc-900 text-stone-200 flex items-center justify-center relative overflow-hidden select-none">
              <div
                className="absolute inset-0 opacity-15 pointer-events-none"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
                  backgroundSize: "24px 24px",
                }}
              />
              <div className="flex items-center gap-2 text-stone-400 select-none z-10">
                <img src="/icon.svg" alt="" className="size-5 opacity-60" />
                <span className="font-serif italic text-sm tracking-tight text-stone-300">
                  AnzaBook Pustaka &amp; Cetak Rakyat
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Profile Content */}
        <div className="p-6 sm:p-8 pt-0 relative">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 -mt-12 sm:-mt-14 mb-4">
            {/* Avatar & Identitas */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
              <div className="size-24 sm:size-28 rounded-full bg-zinc-800 border-4 border-card flex items-center justify-center font-bold text-3xl text-foreground shrink-0 overflow-hidden shadow-md ring-1 ring-border/50">
                {profile?.image ? (
                  <img
                    src={profile.image}
                    alt={name}
                    className="size-full object-cover"
                  />
                ) : (
                  <span>{avatarLetter}</span>
                )}
              </div>

              <div className="space-y-2 pt-2 sm:pt-4">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight">
                    {name}
                  </h2>
                  {isVerifiedAuthor && (
                    <span
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-muted text-foreground border border-border/80 text-xs font-mono font-semibold"
                      title="Penulis Resmi Terverifikasi"
                    >
                      <CheckCircle className="size-3.5" />
                      <span>Penulis Resmi</span>
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-muted-foreground font-mono">
                  <Link
                    to="/u/$username"
                    params={{ username: `@${username}` }}
                    className="text-foreground hover:underline font-semibold"
                    title="Buka Halaman Profil Publik"
                  >
                    @{username}
                  </Link>
                  {profile?.locationCity && (
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3.5" />
                      <span>{profile.locationCity}</span>
                    </span>
                  )}
                </div>

                {/* Badges Bar */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 pt-1">
                  <span className="px-2.5 py-0.5 rounded-md bg-[var(--color-accent)]/10 text-foreground text-[11px] font-mono font-semibold border border-[var(--color-accent)]/30">
                    ⚓ Nakama Member
                  </span>
                  {isVerifiedAuthor && (
                    <span className="px-2.5 py-0.5 rounded-md bg-muted text-foreground text-[11px] font-mono font-semibold border border-border/80">
                      ✓ Penulis Terbitan
                    </span>
                  )}
                  {isPendingAuthor && (
                    <span className="px-2.5 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-[11px] font-mono font-medium">
                      ⏳ Penulis: Menunggu Review Admin
                    </span>
                  )}
                  {!isVerifiedAuthor && !isPendingAuthor && isOwnProfile && (
                    <Link
                      to="/partner-program"
                      className="px-2.5 py-0.5 rounded-md bg-muted hover:bg-muted/80 text-foreground text-[11px] font-mono font-medium border border-border/80 inline-flex items-center gap-1 transition-colors"
                      title="Daftar Program Kemitraan Penulis AnzaBook"
                    >
                      <span>Daftar Penulis Resmi →</span>
                    </Link>
                  )}
                  <span className="px-2.5 py-0.5 rounded-md bg-muted text-muted-foreground text-[11px] font-mono font-medium border border-border/80">
                    Komunitas Penggerak
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-foreground/80 max-w-xl leading-relaxed pt-1 whitespace-pre-line">
                  {bio}
                </p>

                {/* Social Links Bar */}
                {profile?.socialLinks && (
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-2">
                    {profile.socialLinks.instagram && (
                      <a
                        href={
                          profile.socialLinks.instagram.startsWith("http")
                            ? profile.socialLinks.instagram
                            : `https://instagram.com/${profile.socialLinks.instagram.replace(/^@/, "")}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/60 hover:bg-muted text-foreground/80 hover:text-foreground text-xs font-mono transition-colors border border-border/60"
                        title="Instagram"
                      >
                        <InstagramIcon className="size-3.5" />
                        <span>
                          {profile.socialLinks.instagram.startsWith("http")
                            ? "@" +
                              profile.socialLinks.instagram
                                .split("/")
                                .filter(Boolean)
                                .pop()
                            : profile.socialLinks.instagram.startsWith("@")
                            ? profile.socialLinks.instagram
                            : `@${profile.socialLinks.instagram}`}
                        </span>
                      </a>
                    )}
                    {profile.socialLinks.twitter && (
                      <a
                        href={
                          profile.socialLinks.twitter.startsWith("http")
                            ? profile.socialLinks.twitter
                            : `https://x.com/${profile.socialLinks.twitter.replace(/^@/, "")}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/60 hover:bg-muted text-foreground/80 hover:text-foreground text-xs font-mono transition-colors border border-border/60"
                        title="X / Twitter"
                      >
                        <XTwitterIcon className="size-3.5" />
                        <span>
                          {profile.socialLinks.twitter.startsWith("http")
                            ? "@" +
                              profile.socialLinks.twitter
                                .split("/")
                                .filter(Boolean)
                                .pop()
                            : profile.socialLinks.twitter.startsWith("@")
                            ? profile.socialLinks.twitter
                            : `@${profile.socialLinks.twitter}`}
                        </span>
                      </a>
                    )}
                    {profile.socialLinks.linkedin && (
                      <a
                        href={
                          profile.socialLinks.linkedin.startsWith("http")
                            ? profile.socialLinks.linkedin
                            : `https://linkedin.com/in/${profile.socialLinks.linkedin.replace(/^@/, "")}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/60 hover:bg-muted text-foreground/80 hover:text-foreground text-xs font-mono transition-colors border border-border/60"
                        title="LinkedIn"
                      >
                        <LinkedInIcon className="size-3.5" />
                        <span>LinkedIn</span>
                      </a>
                    )}
                    {profile.socialLinks.website && (
                      <a
                        href={
                          profile.socialLinks.website.startsWith("http")
                            ? profile.socialLinks.website
                            : `https://${profile.socialLinks.website}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/60 hover:bg-muted text-foreground/80 hover:text-foreground text-xs font-mono transition-colors border border-border/60"
                        title="Website Pribadi"
                      >
                        <Globe className="size-3.5" />
                        <span>
                          {profile.socialLinks.website
                            .replace(/^https?:\/\//, "")
                            .replace(/\/$/, "")}
                        </span>
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Aksi Profil (Edit / Follow / Share) */}
            <div className="flex flex-row md:flex-col items-center justify-center gap-2.5 shrink-0 pt-2 sm:pt-4">
              {isOwnProfile ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (onStartEdit) {
                        onStartEdit();
                      }
                    }}
                    className="min-h-10 px-4 text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-background hover:bg-muted text-foreground transition-colors"
                  >
                    <Edit3 className="size-4" />
                    <span>Edit Profile</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCopyProfileLink}
                    className="min-h-10 px-3 text-xs font-medium cursor-pointer inline-flex items-center gap-1.5 rounded-xl border-border/80 hover:bg-muted font-mono"
                    title="Salin Tautan Profil Publik"
                  >
                    {isCopiedLink ? (
                      <>
                        <Check className="size-4 text-emerald-600" />
                        <span>Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="size-4" />
                        <span>@{username}</span>
                      </>
                    )}
                  </Button>

                  {onNavigateSettings && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onNavigateSettings}
                      className="min-h-10 px-4 text-xs font-medium cursor-pointer inline-flex items-center gap-1.5 rounded-xl border-border/80 hover:bg-muted"
                      title="Buka Pengaturan Akun"
                    >
                      <Settings className="size-4" />
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
                    className={`min-h-10 px-5 text-xs font-semibold cursor-pointer inline-flex items-center gap-2 rounded-xl ${
                      profile?.isFollowing
                        ? "bg-muted text-foreground border border-border hover:bg-muted/80"
                        : "bg-foreground text-background hover:opacity-90"
                    }`}
                  >
                    {profile?.isFollowing ? (
                      <>
                        <UserCheck className="size-4" />
                        <span>Mengikuti</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="size-4" />
                        <span>Ikuti Penulis</span>
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCopyProfileLink}
                    className="min-h-10 px-3 text-xs font-medium cursor-pointer inline-flex items-center gap-1.5 rounded-xl border-border/80 hover:bg-muted font-mono"
                  >
                    {isCopiedLink ? (
                      <>
                        <Check className="size-4 text-emerald-600" />
                        <span>Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="size-4" />
                        <span>Bagikan</span>
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Statistik Sosial & Membaca (4 Grid metrics) */}
        <div className="mt-8 pt-6 border-t border-border grid grid-cols-2 sm:grid-cols-4 gap-4 text-center sm:text-left">
          <button
            type="button"
            onClick={() =>
              setRelationsDialogState({
                isOpen: true,
                initialTab: "followers",
              })
            }
            className="p-3.5 rounded-xl bg-muted/30 border border-border/70 hover:border-foreground/40 hover:bg-muted/50 transition-all text-left cursor-pointer group"
            title="Lihat daftar pengikut"
          >
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono group-hover:text-foreground transition-colors">
              <Users className="size-3.5 text-foreground" />
              <span>Pengikut</span>
            </div>
            <p className="font-serif text-xl sm:text-2xl font-bold mt-1 text-foreground">
              {profile?.followersCount || 0}
            </p>
          </button>

          <button
            type="button"
            onClick={() =>
              setRelationsDialogState({
                isOpen: true,
                initialTab: "following",
              })
            }
            className="p-3.5 rounded-xl bg-muted/30 border border-border/70 hover:border-foreground/40 hover:bg-muted/50 transition-all text-left cursor-pointer group"
            title="Lihat daftar akun yang diikuti"
          >
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono group-hover:text-foreground transition-colors">
              <UserCheck className="size-3.5 text-foreground" />
              <span>Mengikuti</span>
            </div>
            <p className="font-serif text-xl sm:text-2xl font-bold mt-1 text-foreground">
              {profile?.followingCount || 0}
            </p>
          </button>

          <div className="p-3.5 rounded-xl bg-muted/30 border border-border/70">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
              <BookMarked className="size-3.5 text-foreground" />
              <span>Buku Tamat</span>
            </div>
            <p className="font-serif text-xl sm:text-2xl font-bold mt-1 text-foreground">
              {finishedBooks.length}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-muted/30 border border-border/70">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
              <Clock className="size-3.5 text-foreground" />
              <span>Total Menit Baca</span>
            </div>
            <p className="font-serif text-xl sm:text-2xl font-bold mt-1 text-foreground">
              {profile?.totalReadingMinutes ||
                telemetrySummary?.totalMinutesRead ||
                Math.round(
                  sessions.reduce(
                    (acc, s) => acc + (s.durationSeconds || 0),
                    0,
                  ) / 60,
                )}{" "}
              <span className="text-xs font-mono font-normal text-muted-foreground">
                menit
              </span>
            </p>
          </div>
        </div>
      </div>
    </section>

      {/* 2. Sub-Tabs Navigasi Profil (Selective by Role) */}
      <div className="border-b border-border flex items-center gap-2 overflow-x-auto no-scrollbar scrollbar-none pb-px">
        <button
          type="button"
          onClick={() => setActiveSubTab("activity")}
          className={`min-h-11 px-4 text-xs font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap inline-flex items-center gap-2 ${
            activeSubTab === "activity"
              ? "border-[var(--color-accent)] text-[var(--color-accent)] font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <BookOpen className="size-4" />
          <span>Aktivitas &amp; Rak Baca</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("reviews")}
          className={`min-h-11 px-4 text-xs font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap inline-flex items-center gap-2 ${
            activeSubTab === "reviews"
              ? "border-[var(--color-accent)] text-[var(--color-accent)] font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Quote className="size-4" />
          <span>Ulasan &amp; Kutipan</span>
        </button>

        {isOwnProfile &&
          (isCommunityOwner ||
            (profile?.managedCommunities &&
              profile.managedCommunities.length > 0)) && (
          <button
            type="button"
            onClick={() => setActiveSubTab("community")}
            className={`min-h-11 px-4 text-xs font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap inline-flex items-center gap-2 ${
              activeSubTab === "community"
                ? "border-[var(--color-accent)] text-[var(--color-accent)] font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Calendar className="size-4" />
            <span>
              Komunitas Saya
              {profile?.managedCommunities &&
              profile.managedCommunities.length > 0
                ? ` (${profile.managedCommunities.length})`
                : ""}
            </span>
          </button>
        )}

        {isVerifiedAuthor && (
          <>
            <button
              type="button"
              onClick={() => setActiveSubTab("works")}
              className={`min-h-11 px-4 text-xs font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap inline-flex items-center gap-2 ${
                activeSubTab === "works"
                  ? "border-[var(--color-accent)] text-[var(--color-accent)] font-bold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <BookOpen className="size-4" />
              <span>
                Karya Penulis
                {profile?.publishedBooks && profile.publishedBooks.length > 0
                  ? ` (${profile.publishedBooks.length})`
                  : ""}
              </span>
            </button>

            {isOwnProfile && (
              <button
                type="button"
                onClick={() => setActiveSubTab("author_studio")}
                className={`min-h-11 px-4 text-xs font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap inline-flex items-center gap-2 ${
                  activeSubTab === "author_studio"
                    ? "border-[var(--color-accent)] text-[var(--color-accent)] font-bold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <PenTool className="size-4" />
                <span>
                  Studio Penulis
                  {manuscripts.length > 0 ? ` (${manuscripts.length})` : ""}
                </span>
              </button>
            )}
          </>
        )}

        {isOwnProfile &&
          (isPublisher ||
            (profile?.managedPublishers &&
              profile.managedPublishers.length > 0)) && (
          <button
            type="button"
            onClick={() => setActiveSubTab("publisher_studio")}
            className={`min-h-11 px-4 text-xs font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap inline-flex items-center gap-2 ${
              activeSubTab === "publisher_studio"
                ? "border-[var(--color-accent)] text-[var(--color-accent)] font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="size-4" />
            <span>
              Studio Penerbit
              {profile?.managedPublishers &&
              profile.managedPublishers.length > 0
                ? ` (${profile.managedPublishers.length})`
                : ""}
            </span>
          </button>
        )}
      </div>

      {/* 3. Sub-Tab 1: Aktivitas & Rak Baca */}
      {activeSubTab === "activity" && (
        <div className="space-y-6">
          {/* Sedang Dibaca */}
          <div className="space-y-3">
            <h3 className="font-serif text-lg font-bold flex items-center gap-2">
              <TrendingUp className="size-4 text-[var(--color-accent)]" />
              <span>Sedang Dibaca ({currentlyReading.length})</span>
            </h3>

            {currentlyReading.length === 0 ? (
              <div className="p-6 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground">
                Belum ada buku yang sedang dibaca. Telusuri katalog di tab
                Explore untuk mulai membaca.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {currentlyReading.map((shelf) => (
                  <div
                    key={shelf.id}
                    className="p-4 rounded-xl border border-border/80 bg-card hover:border-foreground/30 transition-all flex flex-col justify-between"
                  >
                    <div className="flex gap-3">
                      <Link
                        to="/read/$slug"
                        params={{ slug: shelf.book.slug }}
                        className="shrink-0 focus-visible:outline-2 focus-visible:outline-ring rounded-md"
                        title={shelf.book.title}
                      >
                        <BookCover
                          book={shelf.book}
                          className="w-16 shrink-0 shadow-sm rounded-md"
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
                            <p className="font-serif font-bold text-sm text-foreground line-clamp-2 leading-snug">
                              {shelf.book.title}
                            </p>
                          </Link>
                          <p className="text-xs text-muted-foreground truncate font-sans mt-0.5">
                            {shelf.book.author}
                          </p>
                        </div>

                        <div className="pt-2">
                          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-[var(--color-accent)] h-1.5 rounded-full"
                              style={{ width: `${Math.min(100, Math.max(0, shelf.progressPercent))}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-muted-foreground mt-1 inline-block">
                            {shelf.progressPercent}% terbaca
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border/70 flex justify-end">
                      <Link
                        to="/read/$slug"
                        params={{ slug: shelf.book.slug }}
                        className="text-xs font-semibold text-[var(--color-accent)] hover:underline inline-flex items-center gap-1.5"
                      >
                        <span>Lanjutkan Baca</span>
                        <ArrowRight className="size-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selesai Dibaca */}
          <div className="space-y-3 pt-4 border-t border-border/80">
            <h3 className="font-serif text-lg font-bold flex items-center gap-2 text-foreground">
              <CheckCircle2 className="size-4" />
              <span>Buku Tamat ({finishedBooks.length})</span>
            </h3>

            {finishedBooks.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Belum ada buku yang ditandai tamat.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {finishedBooks.map((shelf) => (
                  <Link
                    key={shelf.id}
                    to="/books/$slug"
                    params={{ slug: shelf.book.slug }}
                    className="group space-y-2 text-center focus-visible:outline-2 focus-visible:outline-ring rounded-lg p-1"
                  >
                    <BookCover
                      book={shelf.book}
                      className="w-full shadow-sm rounded-md group-hover:scale-[1.03] transition-transform"
                      decorative
                    />
                    <div className="space-y-0.5">
                      <p className="font-serif text-xs font-bold truncate text-foreground group-hover:text-[var(--color-accent)] transition-colors">
                        {shelf.book.title}
                      </p>
                      <p className="font-sans text-[11px] text-muted-foreground truncate">
                        {shelf.book.author}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Riwayat Sesi Baca Terkini */}
          <div className="space-y-3 pt-4 border-t border-border/80">
            <h3 className="font-serif text-lg font-bold flex items-center gap-2 text-foreground">
              <Flame className="size-4 text-[var(--color-accent)]" />
              <span>Riwayat Sesi Membaca</span>
            </h3>

            {sessions.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Belum ada rekaman sesi baca.
              </p>
            ) : (
              <div className="space-y-2">
                {sessions.slice(0, 5).map((session) => {
                  const minutes = Math.floor((session.durationSeconds || 0) / 60);
                  const seconds = (session.durationSeconds || 0) % 60;
                  const durationText =
                    minutes > 0
                      ? `${minutes} menit baca`
                      : `${seconds || 0} detik baca`;
                  const wpmText =
                    session.avgWpm && session.avgWpm > 0 && session.avgWpm <= 600
                      ? ` • ${session.avgWpm} WPM`
                      : "";

                  return (
                    <div
                      key={session.id}
                      className="p-3.5 rounded-xl border border-border/80 bg-card/70 hover:bg-card flex items-center justify-between gap-3 text-xs transition-colors"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <p className="font-serif font-bold text-foreground text-sm truncate">
                          {session.bookTitle}
                        </p>
                        <p className="text-[11px] text-muted-foreground font-mono">
                          {durationText} • {session.pagesRead} halaman{wpmText} ({session.mode || "standar"})
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isOwnProfile && (
                          <Button
                            type="button"
                            size="sm"
                            variant={session.isPosted ? "outline" : "default"}
                            disabled={togglePostSessionMutation.isPending}
                            onClick={() =>
                              togglePostSessionMutation.mutate({
                                sessionId: session.id,
                                isPosted: !session.isPosted,
                              })
                            }
                            className={`text-xs min-h-9 px-3 inline-flex items-center gap-1.5 cursor-pointer ${
                              session.isPosted
                                ? "border-emerald-600/30 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10"
                                : "bg-orange-600 hover:bg-orange-700 text-white"
                            }`}
                          >
                            <Sparkles className="size-3.5" />
                            <span>{session.isPosted ? "Tersiar (Tarik)" : "Post Sesi"}</span>
                          </Button>
                        )}
                        {onOpenFlexStory && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              onOpenFlexStory(session, session.bookTitle)
                            }
                            className="text-xs min-h-9 px-3 inline-flex items-center gap-1.5 cursor-pointer shrink-0 border-border/80"
                          >
                            <Share2 className="size-3.5" />
                            <span>Flex Story</span>
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

      {/* 4. Sub-Tab 2: Ulasan & Kutipan */}
      {activeSubTab === "reviews" && (
        <div className="space-y-6">
          {/* Kutipan & Highlight */}
          <div className="space-y-3">
            <h4 className="font-serif font-bold text-base flex items-center gap-2">
              <Quote className="size-4 text-orange-600" />
              <span>Catatan Marjinalia &amp; Kutipan ({userHighlights.data?.length || 0})</span>
            </h4>
            {userHighlights.data?.length === 0 ? (
              <p className="text-xs text-muted-foreground p-6 rounded-xl border border-dashed border-border text-center">
                Belum ada kutipan yang disimpan saat membaca buku. Tandai teks di E-Reader untuk membuat kutipan.
              </p>
            ) : (
              <div className="space-y-3">
                {userHighlights.data?.map((hl) => (
                  <div
                    key={hl.id}
                    className="p-4 rounded-xl border border-border/80 bg-card space-y-2.5 shadow-xs"
                  >
                    <blockquote className="border-l-2 border-orange-500 pl-3.5 italic text-xs sm:text-sm text-foreground/90 font-serif leading-relaxed">
                      &ldquo;{hl.selectedText}&rdquo;
                    </blockquote>
                    {hl.note && (
                      <p className="text-xs text-muted-foreground font-mono">
                        Catatan: {hl.note}
                      </p>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
                      <span className="text-[11px] font-mono text-muted-foreground">
                        Bab {hl.chapterNumber} · Halaman {hl.pageNumber}
                      </span>
                      {isOwnProfile && (
                        <Button
                          size="sm"
                          variant={hl.isPosted ? "outline" : "default"}
                          disabled={togglePostHighlightMutation.isPending}
                          onClick={() =>
                            togglePostHighlightMutation.mutate({
                              highlightId: hl.id,
                              isPosted: !hl.isPosted,
                            })
                          }
                          className={`text-xs h-8 px-3 ${
                            hl.isPosted
                              ? "border-emerald-600/30 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10"
                              : "bg-orange-600 hover:bg-orange-700 text-white"
                          }`}
                        >
                          {hl.isPosted ? "Tersiar ke Publik (Tarik)" : "Post ke Linimasa"}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ulasan */}
          <div className="space-y-3 pt-4 border-t border-border/80">
            <h4 className="font-serif font-bold text-base flex items-center gap-2">
              <MessageSquare className="size-4 text-orange-600" />
              <span>Ulasan Buku ({profile?.publicReviews?.length || 0})</span>
            </h4>
            {profile?.publicReviews && profile.publicReviews.length > 0 ? (
              <div className="space-y-3">
                {profile.publicReviews.map((r) => (
                  <div
                    key={r.id}
                    className="p-4 rounded-xl border border-border/80 bg-card space-y-2.5 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-serif font-bold text-sm text-foreground">
                        {r.book.title}
                      </span>
                      <span className="text-xs text-amber-500">
                        {"★".repeat(Math.round(r.rating))}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-foreground/90 font-serif leading-relaxed">
                      {r.content}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground p-6 rounded-xl border border-dashed border-border text-center">
                Belum ada ulasan buku yang ditulis.
              </p>
            )}
          </div>
        </div>
      )}

      {/* 5. Sub-Tab 3: Komunitas Saya */}
      {activeSubTab === "community" && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl border border-border bg-card space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-foreground">
                  <Calendar className="size-5 text-[var(--color-accent)]" />
                  <h3 className="font-serif text-lg font-bold">
                    Komunitas Literasi yang Anda Kelola
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Kelola ruang baca, kalender agenda temu literasi, dan kas afiliasi 10% untuk keberlanjutan komunitas.
                </p>
              </div>

              <Link
                to="/partner-program"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-foreground text-background text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer self-start sm:self-auto shrink-0"
              >
                <Plus className="size-3.5" />
                <span>Daftarkan Komunitas Baru</span>
              </Link>
            </div>

            {(!profile?.managedCommunities || profile.managedCommunities.length === 0) ? (
              <div className="p-8 rounded-xl border border-dashed border-border text-center space-y-3">
                <p className="text-xs text-muted-foreground">
                  Anda belum memiliki komunitas terdaftar atau pengajuan Anda masih diproses.
                </p>
                <Link
                  to="/partner-program"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted text-xs font-medium"
                >
                  <Plus className="size-3.5" />
                  <span>Ajukan Pendaftaran Komunitas</span>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profile.managedCommunities.map((c) => {
                  const isVerified =
                    c.verificationStatus === "verified" ||
                    c.verificationStatus === "trusted";
                  const isRejected = c.verificationStatus === "rejected";
                  const isPending = c.verificationStatus === "pending";

                  return (
                    <div
                      key={c.id}
                      className="p-5 rounded-xl border border-border bg-card space-y-4 flex flex-col justify-between hover:border-foreground/30 transition-colors"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {c.avatarUrl ? (
                              <img
                                src={c.avatarUrl}
                                alt={c.name}
                                className="size-12 rounded-xl object-cover border border-border shrink-0"
                              />
                            ) : (
                              <div className="size-12 rounded-xl bg-muted border border-border flex items-center justify-center font-serif font-bold text-lg text-foreground shrink-0">
                                {c.name.slice(0, 1)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <h4 className="font-serif font-bold text-sm text-foreground truncate">
                                {c.name}
                              </h4>
                              {c.city ? (
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <MapPin className="size-3 text-muted-foreground/70 shrink-0" />
                                  <span>{c.city}</span>
                                </p>
                              ) : (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Komunitas Literasi
                                </p>
                              )}
                            </div>
                          </div>

                          <span
                            className={`px-2.5 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider shrink-0 border ${
                              isVerified
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                : isRejected
                                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                            }`}
                          >
                            {isVerified
                              ? "Terverifikasi"
                              : isRejected
                              ? "Ditolak"
                              : "Menunggu Verifikasi"}
                          </span>
                        </div>

                        {isRejected && (
                          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-700 dark:text-rose-300 space-y-1">
                            <p className="font-bold flex items-center gap-1.5">
                              <AlertCircle className="size-3.5" />
                              <span>Catatan Penolakan:</span>
                            </p>
                            <p className="text-[11px] leading-relaxed">
                              {c.rejectionReason || "Pengajuan belum memenuhi kelengkapan berkas legalitas atau kurasi komunitas."}
                            </p>
                          </div>
                        )}

                        {isPending && (
                          <p className="text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-lg leading-relaxed">
                            Pengajuan komunitas sedang ditinjau kurator AnzaBook. Anda akan dapat membuat agenda publik segera setelah disetujui.
                          </p>
                        )}
                      </div>

                      <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
                        <span className="text-xs text-muted-foreground">
                          Peran: <strong className="text-foreground font-medium">{formatRoleName(c.role)}</strong>
                        </span>

                        {isVerified ? (
                          <Link
                            to="/app"
                            search={{ tab: "community", slug: c.slug }}
                            className="inline-flex items-center gap-1.5 font-semibold text-[var(--color-accent)] hover:underline"
                          >
                            <span>Kelola Komunitas &amp; Acara</span>
                            <ArrowRight className="size-3.5" />
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">
                            Verifikasi dibutuhkan
                          </span>
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

      {/* 6. Sub-Tab 4: Karya Penulis Resmi */}
      {activeSubTab === "works" && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl border border-border bg-card space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-foreground">
                  <BookOpen className="size-5 text-[var(--color-accent)]" />
                  <h3 className="font-serif text-lg font-bold">
                    Katalog Karya Resmi Terbitan
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Buku resmi Anda yang telah diterbitkan dan dapat diakses oleh pembaca AnzaBook.
                </p>
              </div>

              {isVerifiedAuthor && (
                <Button
                  type="button"
                  onClick={handleStartNewManuscript}
                  disabled={isCreatingDraft}
                  className="bg-foreground text-background hover:opacity-90 text-xs font-semibold px-4 py-2 rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="size-3.5" />
                  <span>{isCreatingDraft ? "Menyiapkan Draf..." : "Tulis Karya Baru"}</span>
                </Button>
              )}
            </div>

            {(!profile?.publishedBooks || profile.publishedBooks.length === 0) ? (
              <div className="p-10 rounded-xl border border-dashed border-border text-center space-y-2">
                <BookOpen className="size-8 mx-auto text-muted-foreground/60" />
                <p className="text-xs text-muted-foreground">
                  Belum ada buku resmi yang diterbitkan atas nama profil Anda.
                </p>
                <p className="text-xs text-muted-foreground">
                  Gunakan Studio Penulis untuk menyusun draf naskah dan mengajukannya ke mitra penerbit resmi AnzaBook.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {profile.publishedBooks.map((book) => (
                  <Link
                    key={book.id}
                    to="/read/$slug"
                    params={{ slug: book.slug }}
                    className="group space-y-2 text-left focus-visible:outline-2 focus-visible:outline-ring rounded-lg p-2 border border-border/60 hover:border-foreground/30 transition-all bg-card/50"
                  >
                    <BookCover
                      book={book}
                      className="w-full shadow-sm rounded-md group-hover:scale-[1.02] transition-transform"
                      decorative
                    />
                    <div className="space-y-0.5 pt-1">
                      <p className="font-serif text-xs font-bold text-foreground group-hover:text-[var(--color-accent)] transition-colors line-clamp-2">
                        {book.title}
                      </p>
                      <p className="text-[11px] font-mono text-muted-foreground">
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

      {/* 7. Sub-Tab 5: Studio Penulis */}
      {activeSubTab === "author_studio" && (
        <div className="space-y-6">
          {/* Header Action: Ajukan / Tulis Naskah Baru */}
          <div className="p-6 rounded-2xl border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-foreground">
                <PenTool className="size-5 text-[var(--color-accent)]" />
                <h3 className="font-serif text-lg font-bold">
                  Studio Penulis AnzaBook
                </h3>
              </div>
              <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
                Tulis naskah buku dengan penyunting teks yang bersih dan fokus. Simpan draf otomatis, kelola bab di daftar isi, dan ajukan langsung ke mitra penerbit untuk diterbitkan.
              </p>
            </div>

            <Button
              type="button"
              onClick={handleStartNewManuscript}
              disabled={isCreatingDraft}
              className="bg-foreground text-background hover:opacity-90 min-h-11 px-5 text-xs font-semibold cursor-pointer shrink-0 inline-flex items-center gap-2 rounded-xl shadow-xs"
            >
              <Plus className="size-4" />
              <span>{isCreatingDraft ? "Membuka Studio..." : "Tulis Naskah Baru"}</span>
            </Button>
          </div>

          {/* Daftar Naskah Saya */}
          <div className="space-y-3">
            <h4 className="font-serif text-base font-bold flex items-center gap-2">
              <BookOpen className="size-4 text-[var(--color-accent)]" />
              <span>Naskah &amp; Draf Saya ({manuscripts.length})</span>
            </h4>

            {manuscripts.length === 0 ? (
              <div className="p-10 rounded-xl border border-dashed border-border text-center space-y-3">
                <p className="text-xs text-muted-foreground">
                  Anda belum memiliki draf atau naskah buku di studio.
                </p>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleStartNewManuscript}
                  disabled={isCreatingDraft}
                  className="text-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Plus className="size-3.5" />
                  <span>Mulai Tulis Naskah Baru</span>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {manuscripts.map((item) => {
                  const statusColors: Record<string, string> = {
                    draft: "bg-muted text-foreground border-border",
                    submitted: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
                    under_review: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
                    revision_requested: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
                    accepted: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
                    published: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40",
                    rejected: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
                  };

                  return (
                    <div
                      key={item.id}
                      className="p-5 rounded-xl border border-border bg-card space-y-3 hover:border-foreground/30 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h5 className="font-serif font-bold text-base text-foreground">
                              {item.title}
                            </h5>
                            <span
                              className={`px-2.5 py-0.5 rounded-md text-[10px] font-semibold uppercase border ${
                                statusColors[item.status] || "bg-muted text-foreground"
                              }`}
                            >
                              {formatManuscriptStatus(item.status)}
                            </span>
                          </div>

                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {item.synopsis || "Belum ada sinopsis naskah."}
                          </p>

                          {item.editorialNotes && (
                            <div className="mt-2 p-2.5 rounded-lg bg-muted/60 border border-border text-xs text-foreground/90 font-sans">
                              <span className="font-semibold text-xs block text-foreground mb-0.5">
                                Catatan Redaksi Penerbit:
                              </span>
                              {item.editorialNotes}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
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
                            className="bg-foreground text-background hover:opacity-90 text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5 rounded-xl"
                          >
                            <PenTool className="size-3.5" />
                            <span>{item.status === "draft" ? "Lanjutkan Menulis" : "Buka Editor Naskah"}</span>
                          </Button>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                        <div>
                          {item.chapters?.length || item.totalChapters || 1} Bab • Terakhir diperbarui{" "}
                          {new Date(item.updatedAt || Date.now()).toLocaleDateString("id-ID")}
                        </div>
                        <div>
                          Skema: <strong className="text-foreground font-medium">{formatDigitalPolicy(item.proposedDigitalPolicy)}</strong>
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

      {/* 8. Sub-Tab 6: Studio Penerbit */}
      {activeSubTab === "publisher_studio" && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl border border-border bg-card space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-foreground">
                  <Building2 className="size-5 text-[var(--color-accent)]" />
                  <h3 className="font-serif text-lg font-bold">
                    Mitra Penerbit yang Anda Kelola
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Kelola profil penerbit, katalog naskah buku berlisensi IKAPI, dan tinjau naskah masuk dari penulis.
                </p>
              </div>

              <Link
                to="/partner-program"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-foreground text-background text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer self-start sm:self-auto shrink-0"
              >
                <Plus className="size-3.5" />
                <span>Daftarkan Penerbit Baru</span>
              </Link>
            </div>

            {(!profile?.managedPublishers || profile.managedPublishers.length === 0) ? (
              <div className="p-8 rounded-xl border border-dashed border-border text-center space-y-3">
                <p className="text-xs text-muted-foreground">
                  Anda belum memiliki penerbit terdaftar atau pengajuan Anda masih diproses.
                </p>
                <Link
                  to="/partner-program"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted text-xs font-medium"
                >
                  <Plus className="size-3.5" />
                  <span>Ajukan Pendaftaran Penerbit</span>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profile.managedPublishers.map((p) => {
                  const isVerified = p.verificationStatus === "verified";
                  const isRejected = p.verificationStatus === "rejected";
                  const isPending = p.verificationStatus === "pending";

                  return (
                    <div
                      key={p.id}
                      className="p-5 rounded-xl border border-border bg-card space-y-4 flex flex-col justify-between hover:border-foreground/30 transition-colors"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {p.logoUrl ? (
                              <img
                                src={p.logoUrl}
                                alt={p.name}
                                className="size-12 rounded-xl object-cover border border-border shrink-0"
                              />
                            ) : (
                              <div className="size-12 rounded-xl bg-muted border border-border flex items-center justify-center font-serif font-bold text-lg text-foreground shrink-0">
                                {p.name.slice(0, 1)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <h4 className="font-serif font-bold text-sm text-foreground truncate">
                                {p.name}
                              </h4>
                              {p.city ? (
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <MapPin className="size-3 text-muted-foreground/70 shrink-0" />
                                  <span>{p.city}</span>
                                </p>
                              ) : (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Penerbit Buku
                                </p>
                              )}
                            </div>
                          </div>

                          <span
                            className={`px-2.5 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider shrink-0 border ${
                              isVerified
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                : isRejected
                                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                            }`}
                          >
                            {isVerified
                              ? "Terverifikasi"
                              : isRejected
                              ? "Ditolak"
                              : "Menunggu Verifikasi"}
                          </span>
                        </div>

                        {isRejected && (
                          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-700 dark:text-rose-300 space-y-1">
                            <p className="font-bold flex items-center gap-1.5">
                              <AlertCircle className="size-3.5" />
                              <span>Catatan Penolakan:</span>
                            </p>
                            <p className="text-[11px] leading-relaxed">
                              {p.rejectionReason || "Legalitas atau berkas keanggotaan IKAPI belum lengkap."}
                            </p>
                          </div>
                        )}

                        {isPending && (
                          <p className="text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-lg leading-relaxed">
                            Pengajuan penerbit sedang diverifikasi nomor IKAPI dan legalitasnya oleh tim AnzaBook.
                          </p>
                        )}
                      </div>

                      <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
                        <span className="text-xs text-muted-foreground">
                          Peran: <strong className="text-foreground font-medium">{formatRoleName(p.role)}</strong>
                        </span>

                        {isVerified ? (
                          <Link
                            to="/p/$slug"
                            params={{ slug: p.slug }}
                            className="inline-flex items-center gap-1.5 font-semibold text-[var(--color-accent)] hover:underline"
                          >
                            <span>Buka Halaman Redaksi</span>
                            <ArrowRight className="size-3.5" />
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">
                            Verifikasi dibutuhkan
                          </span>
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



      {/* Dialog: Relasi Sosial (Pengikut / Mengikuti Substack-Style) */}
      <SocialRelationsDialog
        isOpen={relationsDialogState.isOpen}
        onClose={() =>
          setRelationsDialogState((prev) => ({ ...prev, isOpen: false }))
        }
        targetUsername={username}
        initialTab={relationsDialogState.initialTab}
        currentUserId={myProfile?.id}
      />
    </div>
  );
}
