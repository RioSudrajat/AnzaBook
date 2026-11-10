import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import {
  Award,
  BookMarked,
  BookOpen,
  Calendar,
  CheckCircle,
  CheckCircle2,
  Clock,
  Compass,
  Edit3,
  ExternalLink,
  Flame,
  Globe,
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
  DigitalPolicy,
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
  useApplyPublisher,
  useFollowUser,
  useMyManuscripts,
  useMySocialProfile,
  useUnfollowUser,
  useUpdateSocialProfile,
} from "@/features/social/hooks";
import { ManuscriptStudioDialog } from "@/features/social/components/manuscript-studio-dialog";

type DashboardProfileProps = {
  isOwnProfile?: boolean;
  profile?: SocialProfileDto;
  onNavigateSettings?: () => void;
  onOpenFlexStory?: (session: ReadingSessionDto, bookTitle: string) => void;
};

export function DashboardProfile({
  isOwnProfile = true,
  profile: externalProfile,
  onNavigateSettings,
  onOpenFlexStory,
}: DashboardProfileProps) {
  // Queries
  const { data: myProfile, isLoading: isMyProfileLoading } =
    useMySocialProfile();
  const profile = externalProfile || myProfile;

  const { data: shelves = [] } = useUserShelves();
  const { data: sessionsData } = useReadingSessions();
  const sessions = sessionsData?.data || [];
  const telemetrySummary = sessionsData?.summary;
  const { data: manuscripts = [] } = useMyManuscripts();

  // Mutations
  const updateProfileMutation = useUpdateSocialProfile();
  const followMutation = useFollowUser();
  const unfollowMutation = useUnfollowUser();
  const applyAuthorMutation = useApplyAuthor();
  const applyPublisherMutation = useApplyPublisher();

  // Sub-tabs
  type ProfileSubTab = "activity" | "reviews" | "community" | "studio";
  const [activeSubTab, setActiveSubTab] = useState<ProfileSubTab>("activity");

  // Dialog states
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isManuscriptStudioOpen, setIsManuscriptStudioOpen] = useState(false);
  const [isApplyAuthorOpen, setIsApplyAuthorOpen] = useState(false);
  const [isApplyPublisherOpen, setIsApplyPublisherOpen] = useState(false);

  // Edit profile form state
  const [bioInput, setBioInput] = useState(profile?.bio || "");
  const [cityInput, setCityInput] = useState(profile?.locationCity || "");
  const [penNameInput, setPenNameInput] = useState(
    profile?.authorPenName || "",
  );
  const [instagramInput, setInstagramInput] = useState(
    profile?.socialLinks?.instagram || "",
  );
  const [twitterInput, setTwitterInput] = useState(
    profile?.socialLinks?.twitter || "",
  );
  const [websiteInput, setWebsiteInput] = useState(
    profile?.socialLinks?.website || "",
  );
  const [goodreadsInput, setGoodreadsInput] = useState(
    profile?.socialLinks?.goodreads || "",
  );

  // Apply Author form state
  const [authorApplyPenName, setAuthorApplyPenName] = useState("");
  const [authorApplyBio, setAuthorApplyBio] = useState("");
  const [authorApplyPortfolio, setAuthorApplyPortfolio] = useState("");

  // Apply Publisher form state
  const [pubApplyName, setPubApplyName] = useState("");
  const [pubApplySlug, setPubApplySlug] = useState("");
  const [pubApplyCity, setPubApplyCity] = useState("");
  const [pubApplyEmail, setPubApplyEmail] = useState("");

  const currentlyReading = shelves.filter((s) => s.shelfStatus === "reading");
  const finishedBooks = shelves.filter((s) => s.shelfStatus === "finished");

  const isVerifiedAuthor = profile?.authorStatus === "verified";
  const isPendingAuthor = profile?.authorStatus === "pending";

  const handleOpenEdit = () => {
    setBioInput(profile?.bio || "");
    setCityInput(profile?.locationCity || "");
    setPenNameInput(profile?.authorPenName || "");
    setInstagramInput(profile?.socialLinks?.instagram || "");
    setTwitterInput(profile?.socialLinks?.twitter || "");
    setWebsiteInput(profile?.socialLinks?.website || "");
    setGoodreadsInput(profile?.socialLinks?.goodreads || "");
    setIsEditProfileOpen(true);
  };

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    await updateProfileMutation.mutateAsync({
      bio: bioInput.trim(),
      locationCity: cityInput.trim() || null,
      authorPenName: penNameInput.trim() || null,
      socialLinks: {
        instagram: instagramInput.trim() || undefined,
        twitter: twitterInput.trim() || undefined,
        website: websiteInput.trim() || undefined,
        goodreads: goodreadsInput.trim() || undefined,
      },
    });
    setIsEditProfileOpen(false);
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

  const handleApplyAuthor = async (e: FormEvent) => {
    e.preventDefault();
    if (!authorApplyPenName.trim() || !authorApplyBio.trim()) return;
    await applyAuthorMutation.mutateAsync({
      penName: authorApplyPenName.trim(),
      bio: authorApplyBio.trim(),
      portfolioUrl: authorApplyPortfolio.trim() || undefined,
    });
    setIsApplyAuthorOpen(false);
  };

  const handleApplyPublisher = async (e: FormEvent) => {
    e.preventDefault();
    if (!pubApplyName.trim() || !pubApplySlug.trim()) return;
    await applyPublisherMutation.mutateAsync({
      name: pubApplyName.trim(),
      slug: pubApplySlug.trim().toLowerCase(),
      city: pubApplyCity.trim() || undefined,
      contactEmail: pubApplyEmail.trim() || undefined,
    });
    setIsApplyPublisherOpen(false);
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
      {/* 1. Header Profil Sosial */}
      <section
        aria-label="Informasi Profil Pengguna"
        className="rounded-[16px] border border-border bg-card p-6 sm:p-8 shadow-xs relative overflow-hidden"
      >
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          {/* Avatar & Identitas */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
            <div className="size-20 sm:size-24 rounded-full bg-zinc-800 border-2 border-border flex items-center justify-center font-bold text-2xl text-foreground shrink-0 overflow-hidden shadow-xs ring-2 ring-border/50">
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

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight">
                  {name}
                </h2>
                {isVerifiedAuthor && (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-mono font-semibold"
                    title="Penulis Resmi Terverifikasi"
                  >
                    <CheckCircle className="size-3.5" />
                    <span>Penulis Resmi</span>
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-muted-foreground font-mono">
                <span>@{username}</span>
                {profile?.locationCity && (
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3.5" />
                    <span>{profile.locationCity}</span>
                  </span>
                )}
                {profile?.authorPenName && (
                  <span className="flex items-center gap-1 text-[var(--color-accent)] font-semibold">
                    <PenTool className="size-3.5" />
                    <span>Pena: {profile.authorPenName}</span>
                  </span>
                )}
              </div>

              {/* Badges Bar */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 pt-1">
                <span className="px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[11px] font-mono font-medium border border-amber-500/20">
                  ⚓ Nakama Member
                </span>
                {isVerifiedAuthor && (
                  <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[11px] font-mono font-medium border border-emerald-500/20">
                    ✓ Penulis Terbitan
                  </span>
                )}
                <span className="px-2.5 py-0.5 rounded-md bg-muted text-muted-foreground text-[11px] font-mono font-medium border border-border">
                  Komunitas Penggerak
                </span>
              </div>

              <p className="text-xs sm:text-sm text-foreground/80 max-w-xl leading-relaxed pt-1">
                {bio}
              </p>

              {/* Social Links */}
              {profile?.socialLinks && (
                <div className="flex items-center justify-center sm:justify-start gap-3 pt-2 text-muted-foreground">
                  {profile.socialLinks.instagram && (
                    <a
                      href={profile.socialLinks.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-foreground transition-colors"
                      title="Instagram"
                    >
                      <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                        <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
                      </svg>
                    </a>
                  )}
                  {profile.socialLinks.twitter && (
                    <a
                      href={profile.socialLinks.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-foreground transition-colors"
                      title="Twitter / X"
                    >
                      <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/>
                      </svg>
                    </a>
                  )}
                  {profile.socialLinks.website && (
                    <a
                      href={profile.socialLinks.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-foreground transition-colors"
                      title="Situs Web"
                    >
                      <Globe className="size-4" />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-row md:flex-col items-center justify-center gap-2.5 shrink-0">
            {isOwnProfile ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleOpenEdit}
                  className="min-h-11 px-4 text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Edit3 className="size-4" />
                  <span>Edit Bio &amp; Profil</span>
                </Button>

                {onNavigateSettings && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onNavigateSettings}
                    className="min-h-11 px-4 text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5 border-dashed"
                    title="Buka Pengaturan Akun"
                  >
                    <Settings className="size-4" />
                    <span>Pengaturan ⚙️</span>
                  </Button>
                )}
              </>
            ) : (
              <Button
                type="button"
                onClick={handleToggleFollow}
                disabled={followMutation.isPending || unfollowMutation.isPending}
                className={`min-h-11 px-5 text-xs font-semibold cursor-pointer inline-flex items-center gap-2 ${
                  profile?.isFollowing
                    ? "bg-muted text-foreground border border-border hover:bg-muted/80"
                    : "bg-[var(--color-accent)] text-white hover:opacity-90"
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
            )}
          </div>
        </div>

        {/* Statistik Sosial & Membaca (4 Grid metrics) */}
        <div className="mt-8 pt-6 border-t border-border grid grid-cols-2 sm:grid-cols-4 gap-4 text-center sm:text-left">
          <div className="p-3.5 rounded-xl bg-muted/20 border border-border/60">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
              <Users className="size-3.5 text-[var(--color-accent)]" />
              <span>Pengikut</span>
            </div>
            <p className="font-serif text-xl sm:text-2xl font-bold mt-1 text-foreground">
              {profile?.followersCount || 0}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-muted/20 border border-border/60">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
              <UserCheck className="size-3.5 text-blue-500" />
              <span>Mengikuti</span>
            </div>
            <p className="font-serif text-xl sm:text-2xl font-bold mt-1 text-foreground">
              {profile?.followingCount || 0}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-muted/20 border border-border/60">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
              <BookMarked className="size-3.5 text-emerald-500" />
              <span>Buku Tamat</span>
            </div>
            <p className="font-serif text-xl sm:text-2xl font-bold mt-1 text-foreground">
              {finishedBooks.length}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-muted/20 border border-border/60">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
              <Clock className="size-3.5 text-amber-500" />
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
                Mnt
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* 2. 4 Sub-Tabs Navigasi Profil */}
      <div className="border-b border-border flex items-center gap-2 overflow-x-auto pb-px">
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
          <span>Komunitas &amp; Agenda</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("studio")}
          className={`min-h-11 px-4 text-xs font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap inline-flex items-center gap-2 ${
            activeSubTab === "studio"
              ? "border-[var(--color-accent)] text-[var(--color-accent)] font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <PenTool className="size-4" />
          <span>Studio Penulis &amp; Penerbit</span>
        </button>
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
                    className="p-4 rounded-xl border border-border bg-card hover:border-[var(--color-accent)]/40 transition-colors flex flex-col justify-between"
                  >
                    <div className="flex gap-3">
                      <img
                        src={shelf.book.coverUrl}
                        alt={shelf.book.title}
                        className="w-14 h-20 rounded-md object-cover border border-border shadow-xs shrink-0"
                      />
                      <div className="min-w-0 space-y-1">
                        <p className="font-serif font-bold text-sm truncate">
                          {shelf.book.title}
                        </p>
                        <p className="text-xs text-muted-foreground truncate font-mono">
                          {shelf.book.author}
                        </p>
                        <div className="pt-1">
                          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-[var(--color-accent)] h-1.5 rounded-full"
                              style={{ width: `${shelf.progressPercent}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-muted-foreground mt-0.5 inline-block">
                            {shelf.progressPercent}% terbaca
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border flex justify-end">
                      <Link
                        to="/read/$slug"
                        params={{ slug: shelf.book.slug }}
                        className="text-xs font-semibold text-[var(--color-accent)] hover:underline inline-flex items-center gap-1"
                      >
                        <span>Lanjutkan Baca</span>
                        <ExternalLink className="size-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selesai Dibaca */}
          <div className="space-y-3 pt-4 border-t border-border">
            <h3 className="font-serif text-lg font-bold flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-500" />
              <span>Buku Tamat ({finishedBooks.length})</span>
            </h3>

            {finishedBooks.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Belum ada buku yang ditandai tamat.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {finishedBooks.map((shelf) => (
                  <Link
                    key={shelf.id}
                    to="/books/$slug"
                    params={{ slug: shelf.book.slug }}
                    className="group space-y-1.5 text-center"
                  >
                    <img
                      src={shelf.book.coverUrl}
                      alt={shelf.book.title}
                      className="w-full aspect-[2/3] rounded-lg object-cover border border-border group-hover:scale-105 transition-transform"
                    />
                    <p className="font-serif text-xs font-semibold truncate group-hover:text-[var(--color-accent)]">
                      {shelf.book.title}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Riwayat Sesi Baca Terkini */}
          <div className="space-y-3 pt-4 border-t border-border">
            <h3 className="font-serif text-lg font-bold flex items-center gap-2">
              <Flame className="size-4 text-orange-500" />
              <span>Riwayat Sesi Membaca</span>
            </h3>

            {sessions.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Belum ada rekaman sesi baca.
              </p>
            ) : (
              <div className="space-y-2">
                {sessions.slice(0, 5).map((session) => (
                  <div
                    key={session.id}
                    className="p-3 rounded-xl border border-border bg-card/60 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <p className="font-semibold text-foreground">
                        {session.bookTitle}
                      </p>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        {Math.round(session.durationSeconds / 60)} menit baca •{" "}
                        {session.pagesRead} halaman • {session.avgWpm} WPM (
                        {session.mode})
                      </p>
                    </div>

                    {onOpenFlexStory && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          onOpenFlexStory(session, session.bookTitle)
                        }
                        className="text-xs min-h-9 px-3 inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Share2 className="size-3.5" />
                        <span>Flex Story</span>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Sub-Tab 2: Ulasan & Kutipan */}
      {activeSubTab === "reviews" && (
        <div className="space-y-4">
          <div className="p-6 rounded-xl border border-border bg-card/60 space-y-3">
            <div className="flex items-center gap-2 text-[var(--color-accent)]">
              <Quote className="size-5" />
              <h4 className="font-serif font-bold text-base">
                Catatan Marjinalia &amp; Kutipan Favorit
              </h4>
            </div>
            <blockquote className="border-l-2 border-[var(--color-accent)] pl-4 italic text-xs sm:text-sm text-foreground/90 leading-relaxed font-serif">
              &ldquo;Membaca bukan sekadar mengumpulkan kata-kata, melainkan
              menemukan peta untuk berjalan di belantara dunia nyata.&rdquo;
            </blockquote>
            <p className="text-[11px] font-mono text-muted-foreground">
              — Highlight dari <em>Sains, Logika, dan Seni untuk Hidup Bermutu</em>
            </p>
          </div>

          <div className="p-6 rounded-xl border border-border bg-card/60 space-y-3">
            <div className="flex items-center gap-2 text-emerald-500">
              <MessageSquare className="size-5" />
              <h4 className="font-serif font-bold text-base">
                Ulasan Komunitas
              </h4>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              &ldquo;Edisi Cetak Rakyat dari buku ini sangat kokoh dan nyaman
              dibaca. Sinkronisasi digitalnya mulus saat bepergian.&rdquo;
            </p>
            <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground pt-1">
              <span>Rating: ★★★★★</span>
              <span>28 Oktober 2026</span>
            </div>
          </div>
        </div>
      )}

      {/* 5. Sub-Tab 3: Komunitas & Agenda */}
      {activeSubTab === "community" && (
        <div className="space-y-6">
          <div className="space-y-3">
            <h3 className="font-serif text-lg font-bold flex items-center gap-2">
              <Users className="size-4 text-[var(--color-accent)]" />
              <span>Kalender Komunitas yang Diikuti</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-border bg-card space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="size-10 rounded-lg bg-orange-500/10 text-orange-600 flex items-center justify-center font-bold">
                    KL
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-sm">
                      Klub Literasi Jakarta
                    </h4>
                    <p className="text-[11px] text-muted-foreground font-mono">
                      @klub-literasi-jkt • 1.240 Pengikut
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Ruang temu pembaca naskah nonfiksi, sains populer, dan bedah
                  buku bulanan.
                </p>
                <div className="pt-2 flex justify-end">
                  <Link
                    to="/c/$slug"
                    params={{ slug: "klub-literasi-jakarta" }}
                    className="text-xs font-semibold text-[var(--color-accent)] hover:underline inline-flex items-center gap-1"
                  >
                    <span>Buka Kalender</span>
                    <ExternalLink className="size-3" />
                  </Link>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-border bg-card space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="size-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                    PM
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-sm">
                      Pustaka Malam Bandung
                    </h4>
                    <p className="text-[11px] text-muted-foreground font-mono">
                      @pustaka-malam-bdg • 850 Pengikut
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Diskusi sastra dan pembacaan hening (silent reading party) di
                  kedai kopi.
                </p>
                <div className="pt-2 flex justify-end">
                  <Link
                    to="/c/$slug"
                    params={{ slug: "pustaka-malam-bandung" }}
                    className="text-xs font-semibold text-[var(--color-accent)] hover:underline inline-flex items-center gap-1"
                  >
                    <span>Buka Kalender</span>
                    <ExternalLink className="size-3" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Sub-Tab 4: Studio Penulis & Penerbit */}
      {activeSubTab === "studio" && (
        <div className="space-y-6">
          {/* Header Action: Ajukan Naskah Baru */}
          <div className="p-6 rounded-xl border border-[var(--color-accent)]/30 bg-gradient-to-r from-[var(--color-accent)]/5 to-transparent flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-[var(--color-accent)]">
                <Sparkles className="size-4" />
                <h3 className="font-serif text-lg font-bold">
                  Studio Pengajuan Naskah AnzaBook
                </h3>
              </div>
              <p className="text-xs text-muted-foreground max-w-lg leading-relaxed">
                Kirim naskah multi-bab dengan skema B2B2C transparan (Phygital
                Cetak Asli, Nakama Creator Pool, atau Ala Carte). Ekstraksi
                .docx/.txt murni di peramban Anda.
              </p>
            </div>

            <Button
              type="button"
              onClick={() => setIsManuscriptStudioOpen(true)}
              className="bg-[var(--color-accent)] hover:opacity-90 text-white min-h-11 px-5 text-xs font-semibold cursor-pointer shrink-0 inline-flex items-center gap-2"
            >
              <Plus className="size-4" />
              <span>+ Ajukan Naskah Buku Baru</span>
            </Button>
          </div>

          {/* If not yet verified author: Upgrade Cards */}
          {!isVerifiedAuthor && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card 1: Ajukan Penulis Resmi */}
              <div className="p-5 rounded-xl border border-border bg-card space-y-3">
                <div className="flex items-center gap-2 text-blue-500">
                  <PenTool className="size-5" />
                  <h4 className="font-serif font-bold text-base">
                    Gabung Jadi Penulis Resmi AnzaBook
                  </h4>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Dapatkan lencana centang biru, profil direktori publik, dan
                  akses langsung ke pembaca tanpa pemotongan margin 55%
                  distributor konvensional.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsApplyAuthorOpen(true)}
                  disabled={isPendingAuthor}
                  className="w-full min-h-10 text-xs font-semibold cursor-pointer"
                >
                  {isPendingAuthor
                    ? "Pengajuan Penulis Sedang Ditinjau..."
                    : "Daftar Jadi Penulis Resmi"}
                </Button>
              </div>

              {/* Card 2: Ajukan Mitra Penerbit */}
              <div className="p-5 rounded-xl border border-border bg-card space-y-3">
                <div className="flex items-center gap-2 text-emerald-500">
                  <Layers className="size-5" />
                  <h4 className="font-serif font-bold text-base">
                    Daftarkan Badan Usaha Penerbit
                  </h4>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Kelola katalog terbitan, simulasi HPP cetak terbuka, dan
                  manfaatkan kuota kode klaim phygital gratis untuk pembeli buku
                  asli.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsApplyPublisherOpen(true)}
                  className="w-full min-h-10 text-xs font-semibold cursor-pointer"
                >
                  Daftarkan Penerbit Mitra
                </Button>
              </div>
            </div>
          )}

          {/* Daftar Naskah Saya */}
          <div className="space-y-3">
            <h4 className="font-serif text-base font-bold flex items-center gap-2">
              <BookOpen className="size-4 text-[var(--color-accent)]" />
              <span>Naskah yang Telah Diajukan ({manuscripts.length})</span>
            </h4>

            {manuscripts.length === 0 ? (
              <div className="p-8 rounded-xl border border-dashed border-border text-center space-y-2">
                <p className="text-xs text-muted-foreground">
                  Anda belum pernah mengajukan naskah buku.
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setIsManuscriptStudioOpen(true)}
                  className="text-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Plus className="size-3.5" />
                  <span>Mulai Ajukan Naskah</span>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {manuscripts.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl border border-border bg-card space-y-2"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h5 className="font-serif font-bold text-sm text-foreground">
                            {item.title}
                          </h5>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase ${
                              item.status === "published"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : item.status === "in_editing"
                                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                  : item.status === "rejected"
                                    ? "bg-red-500/10 text-red-600 dark:text-red-400"
                                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            {item.status.replace("_", " ")}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {item.synopsis}
                        </p>
                      </div>

                      <div className="text-right text-[11px] font-mono text-muted-foreground shrink-0">
                        <div>
                          Skema:{" "}
                          <strong className="text-foreground">
                            {item.proposedDigitalPolicy}
                          </strong>
                        </div>
                        {item.totalChapters !== undefined && (
                          <div>{item.totalChapters} Bab</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dialog: Edit Profil & Bio */}
      {isEditProfileOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs text-foreground"
        >
          <div className="max-w-md w-full bg-card border border-border rounded-[16px] p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-serif text-lg font-bold">
                Edit Bio &amp; Profil Sosial
              </h3>
              <button
                type="button"
                onClick={() => setIsEditProfileOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div className="space-y-1">
                <Label htmlFor="edit-bio" className="text-xs">
                  Bio Profil (Maks. 1000 karakter)
                </Label>
                <Textarea
                  id="edit-bio"
                  rows={3}
                  value={bioInput}
                  onChange={(e) => setBioInput(e.target.value)}
                  placeholder="Ceritakan minat membaca Anda..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="edit-city" className="text-xs">
                    Kota Domisili
                  </Label>
                  <Input
                    id="edit-city"
                    value={cityInput}
                    onChange={(e) => setCityInput(e.target.value)}
                    placeholder="Jakarta / Bandung"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-penname" className="text-xs">
                    Nama Pena Penulis
                  </Label>
                  <Input
                    id="edit-penname"
                    value={penNameInput}
                    onChange={(e) => setPenNameInput(e.target.value)}
                    placeholder="Pena Anda"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-border">
                <Label className="text-xs text-muted-foreground font-mono">
                  Tautan Media Sosial
                </Label>
                <Input
                  value={instagramInput}
                  onChange={(e) => setInstagramInput(e.target.value)}
                  placeholder="URL Instagram (https://instagram.com/...)"
                  className="text-xs"
                />
                <Input
                  value={twitterInput}
                  onChange={(e) => setTwitterInput(e.target.value)}
                  placeholder="URL Twitter / X (https://x.com/...)"
                  className="text-xs"
                />
                <Input
                  value={websiteInput}
                  onChange={(e) => setWebsiteInput(e.target.value)}
                  placeholder="URL Situs Web Pribadi (https://...)"
                  className="text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditProfileOpen(false)}
                  className="text-xs min-h-10 px-4"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="bg-[var(--color-accent)] text-white text-xs min-h-10 px-4"
                >
                  {updateProfileMutation.isPending
                    ? "Menyimpan..."
                    : "Simpan Perubahan"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dialog: Ajukan Penulis Resmi */}
      {isApplyAuthorOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs text-foreground"
        >
          <div className="max-w-md w-full bg-card border border-border rounded-[16px] p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-serif text-lg font-bold">
                Daftar Jadi Penulis Resmi AnzaBook
              </h3>
              <button
                type="button"
                onClick={() => setIsApplyAuthorOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleApplyAuthor} className="space-y-4 text-xs">
              <div className="space-y-1">
                <Label htmlFor="author-pen-name" className="text-xs">
                  Nama Pena <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="author-pen-name"
                  value={authorApplyPenName}
                  onChange={(e) => setAuthorApplyPenName(e.target.value)}
                  placeholder="Contoh: Raden Kartono"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="author-bio" className="text-xs">
                  Bio Kepenulisan &amp; Rekam Jejak Karya{" "}
                  <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="author-bio"
                  rows={3}
                  value={authorApplyBio}
                  onChange={(e) => setAuthorApplyBio(e.target.value)}
                  placeholder="Ceritakan latar belakang kepenulisan, tema yang digeluti, atau buku terdahulu..."
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="author-portfolio" className="text-xs">
                  URL Portofolio / Tautan Tulisan (Opsional)
                </Label>
                <Input
                  id="author-portfolio"
                  type="url"
                  value={authorApplyPortfolio}
                  onChange={(e) => setAuthorApplyPortfolio(e.target.value)}
                  placeholder="https://..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsApplyAuthorOpen(false)}
                  className="text-xs min-h-10 px-4"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={applyAuthorMutation.isPending}
                  className="bg-[var(--color-accent)] text-white text-xs min-h-10 px-4"
                >
                  {applyAuthorMutation.isPending
                    ? "Mengirim..."
                    : "Kirim Pengajuan"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dialog: Ajukan Mitra Penerbit */}
      {isApplyPublisherOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs text-foreground"
        >
          <div className="max-w-md w-full bg-card border border-border rounded-[16px] p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-serif text-lg font-bold">
                Daftarkan Badan Usaha Penerbit
              </h3>
              <button
                type="button"
                onClick={() => setIsApplyPublisherOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleApplyPublisher} className="space-y-4 text-xs">
              <div className="space-y-1">
                <Label htmlFor="pub-name" className="text-xs">
                  Nama Penerbit <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="pub-name"
                  value={pubApplyName}
                  onChange={(e) => setPubApplyName(e.target.value)}
                  placeholder="Contoh: Penerbit Marjinalia"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="pub-slug" className="text-xs">
                  Slug URL <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="pub-slug"
                  value={pubApplySlug}
                  onChange={(e) => setPubApplySlug(e.target.value)}
                  placeholder="penerbit-marjinalia"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="pub-city" className="text-xs">
                    Kota Operasional
                  </Label>
                  <Input
                    id="pub-city"
                    value={pubApplyCity}
                    onChange={(e) => setPubApplyCity(e.target.value)}
                    placeholder="Yogyakarta"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="pub-email" className="text-xs">
                    Email Kontak
                  </Label>
                  <Input
                    id="pub-email"
                    type="email"
                    value={pubApplyEmail}
                    onChange={(e) => setPubApplyEmail(e.target.value)}
                    placeholder="redaksi@penerbit.id"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsApplyPublisherOpen(false)}
                  className="text-xs min-h-10 px-4"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={applyPublisherMutation.isPending}
                  className="bg-[var(--color-accent)] text-white text-xs min-h-10 px-4"
                >
                  {applyPublisherMutation.isPending
                    ? "Mendaftarkan..."
                    : "Kirim Pendaftaran"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dialog: Studio Pengajuan Naskah Multi-Bab */}
      <ManuscriptStudioDialog
        isOpen={isManuscriptStudioOpen}
        onClose={() => setIsManuscriptStudioOpen(false)}
        defaultPenName={profile?.authorPenName || profile?.name}
      />
    </div>
  );
}
