import * as React from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Check,
  CheckCircle,
  ChevronRight,
  Clock,
  Coins,
  Copy,
  Edit3,
  MapPin,
  Plus,
  Share2,
  Shield,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SmartBackButton } from "@/components/smart-back-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useCalendar,
  useCalendarMembers,
  useCommunityWallet,
  useEvents,
  useJoinCalendar,
  useLeaveCalendar,
  useToggleFollowCalendar,
} from "../hooks";
import { useUpdateCalendarProfile } from "@/features/social/hooks";
import { EventDetailDrawer } from "./event-detail-drawer";
import { CreateEventDialog } from "./create-event-dialog";

export type CommunityHubViewProps = {
  slug: string;
  isInsideApp?: boolean;
  onBack?: () => void;
};

function formatIdr(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function CommunityHubView({
  slug,
  isInsideApp = false,
  onBack,
}: CommunityHubViewProps) {
  const { data: calendar, isLoading: isCalendarLoading } = useCalendar(slug);
  const { data: eventsData, isLoading: isEventsLoading } = useEvents({
    calendarSlug: slug,
  });
  const toggleFollowMutation = useToggleFollowCalendar(slug);
  const joinMutation = useJoinCalendar(slug);
  const leaveMutation = useLeaveCalendar(slug);
  const updateProfileMutation = useUpdateCalendarProfile();

  const [activeTab, setActiveTab] = React.useState<"agenda" | "anggota" | "kas">("agenda");
  const [selectedEventSlug, setSelectedEventSlug] = React.useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [copiedLink, setCopiedLink] = React.useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = React.useState(false);

  // Edit Profil Komunitas States
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [editName, setEditName] = React.useState("");
  const [editDescription, setEditDescription] = React.useState("");
  const [editCity, setEditCity] = React.useState("");
  const [editContactEmail, setEditContactEmail] = React.useState("");
  const [editInstagram, setEditInstagram] = React.useState("");
  const [editTwitter, setEditTwitter] = React.useState("");
  const [editWebsite, setEditWebsite] = React.useState("");
  const [editError, setEditError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (calendar) {
      setEditName(calendar.name);
      setEditDescription(calendar.description || "");
      setEditCity(calendar.city || "");
      setEditContactEmail(calendar.contactEmail || "");
      setEditInstagram(calendar.socialLinks?.instagram || "");
      setEditTwitter(calendar.socialLinks?.twitter || "");
      setEditWebsite(calendar.socialLinks?.website || "");
    }
  }, [calendar]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);
    try {
      await updateProfileMutation.mutateAsync({
        slug,
        input: {
          name: editName.trim(),
          description: editDescription.trim() || undefined,
          city: editCity.trim() || undefined,
          contactEmail: editContactEmail.trim() || undefined,
          socialLinks: {
            instagram: editInstagram.trim() || undefined,
            twitter: editTwitter.trim() || undefined,
            website: editWebsite.trim() || undefined,
          },
        },
      });
      setIsEditOpen(false);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setEditError(err.message);
      } else {
        setEditError("Gagal memperbarui profil komunitas.");
      }
    }
  };

  const isManager = Boolean(
    calendar?.isManager ||
      calendar?.memberRole === "owner" ||
      calendar?.memberRole === "admin",
  );

  const { data: members = [] } = useCalendarMembers(slug);
  const { data: wallet } = useCommunityWallet(slug);

  const handleCopyLink = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const affiliateUrl = `${origin}/c/${slug}?ref=cal_${slug}`;
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(affiliateUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  if (isCalendarLoading) {
    return (
      <div className="py-24 text-center text-muted-foreground text-xs space-y-2">
        <div className="size-6 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent mx-auto" />
        <p>Memuat profil komunitas...</p>
      </div>
    );
  }

  if (!calendar) {
    return (
      <div className="py-20 text-center space-y-3">
        <p className="text-sm font-semibold text-foreground">
          Komunitas tidak ditemukan.
        </p>
        {onBack && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onBack}
            className="text-xs"
          >
            Kembali
          </Button>
        )}
      </div>
    );
  }

  const events = eventsData?.data || [];
  const selectedEvent = events.find((e) => e.slug === selectedEventSlug) || null;
  const leaders = members.filter((m) => m.role === "owner" || m.role === "admin");
  const regularMembers = members.filter(
    (m) => m.role === "member" || m.role === "checkin_staff",
  );

  return (
    <div className="w-full space-y-6">
      {/* 1. Navigation Header Bar (Breadcrumb / Back) */}
      <div className="flex items-center justify-between gap-3">
        <SmartBackButton
          fallbackTo={isInsideApp ? "/app" : "/"}
          label="Kembali"
          className="-ml-2"
        />

        <div className="flex items-center gap-2">
          {/* Share / Copy Link Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            className="text-xs rounded-xl inline-flex items-center gap-1.5 cursor-pointer border-border/80 bg-card hover:bg-muted"
            title="Salin tautan komunitas"
          >
            {copiedLink ? (
              <>
                <Check className="size-3.5 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Tautan Disalin!</span>
              </>
            ) : (
              <>
                <Share2 className="size-3.5" />
                <span>Bagikan</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 2. Main Community Profile Card */}
      <section
        aria-labelledby="calendar-heading"
        className="rounded-2xl border border-border/80 bg-card p-6 sm:p-7 space-y-5 shadow-xs"
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
          <div className="flex items-start gap-4">
            {calendar.avatarUrl ? (
              <img
                src={calendar.avatarUrl}
                alt={calendar.name}
                className="size-16 sm:size-20 rounded-2xl object-cover border border-border/80 shadow-xs shrink-0"
              />
            ) : (
              <div className="size-16 sm:size-20 rounded-2xl bg-muted text-foreground font-serif font-bold text-2xl sm:text-3xl border border-border/80 flex items-center justify-center shrink-0 shadow-xs select-none">
                {calendar.name.slice(0, 1)}
              </div>
            )}

            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1
                  id="calendar-heading"
                  className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-foreground"
                >
                  {calendar.name}
                </h1>

                {calendar.verificationStatus === "verified" && (
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold"
                    title="Komunitas Resmi Terverifikasi"
                  >
                    <CheckCircle className="size-3 text-emerald-500" />
                    <span>Terverifikasi</span>
                  </span>
                )}

                {calendar.isMember && (
                  <span className="px-2.5 py-0.5 rounded-md bg-muted text-foreground border border-border/80 text-[11px] font-medium">
                    {calendar.memberRole === "owner"
                      ? "Pemilik Komunitas"
                      : calendar.memberRole === "admin"
                        ? "Pengurus"
                        : "Anggota"}
                  </span>
                )}
              </div>

              {/* Clean Human Metadata: City & Followers */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-0.5">
                <span className="flex items-center gap-1">
                  <MapPin className="size-3.5 text-muted-foreground/80" />
                  <span>{calendar.city || "Indonesia"}</span>
                </span>
                <span className="text-muted-foreground/40">•</span>
                <span className="flex items-center gap-1">
                  <Users className="size-3.5 text-muted-foreground/80" />
                  <span>{calendar.followerCount} Pengikut</span>
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons with Clear Hierarchy */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start">
            {isManager ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditOpen(true)}
                  className="text-xs rounded-xl inline-flex items-center gap-1.5 cursor-pointer border-border/80 hover:bg-muted"
                >
                  <Edit3 className="size-3.5" />
                  <span>Edit Profil</span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => setIsCreateOpen(true)}
                  className="bg-foreground text-background hover:opacity-90 text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="size-4" />
                  <span>Buat Acara</span>
                </Button>
              </>
            ) : calendar.isMember ? (
              showLeaveConfirm ? (
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={leaveMutation.isPending}
                    onClick={() => {
                      leaveMutation.mutate(undefined, {
                        onSuccess: () => setShowLeaveConfirm(false),
                      });
                    }}
                    className="text-xs font-semibold rounded-xl px-3"
                  >
                    Konfirmasi Keluar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setShowLeaveConfirm(false)}
                    className="text-xs rounded-xl px-3 border-border/80"
                  >
                    Batal
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowLeaveConfirm(true)}
                  className="text-xs rounded-xl border-border/80 bg-muted/50 text-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Klik untuk keluar dari komunitas"
                >
                  <UserCheck className="size-3.5 text-emerald-500" />
                  <span>Anggota Terdaftar</span>
                </Button>
              )
            ) : (
              <>
                <Button
                  type="button"
                  size="sm"
                  disabled={joinMutation.isPending}
                  onClick={() => joinMutation.mutate()}
                  className="bg-foreground text-background hover:opacity-90 text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <UserPlus className="size-3.5" />
                  <span>Gabung Komunitas</span>
                </Button>

                <Button
                  type="button"
                  variant={calendar.isFollowing ? "outline" : "default"}
                  size="sm"
                  disabled={toggleFollowMutation.isPending}
                  onClick={() => toggleFollowMutation.mutate()}
                  className={`text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 cursor-pointer ${
                    calendar.isFollowing
                      ? "bg-muted text-foreground border-border hover:bg-muted/80"
                      : "bg-[var(--color-accent)] text-white hover:opacity-90"
                  }`}
                >
                  {calendar.isFollowing ? (
                    <>
                      <Check className="size-3.5" />
                      <span>Mengikuti</span>
                    </>
                  ) : (
                    <>
                      <CalendarIcon className="size-3.5" />
                      <span>Ikuti Agenda</span>
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>

        {calendar.description && (
          <p className="text-xs sm:text-sm text-foreground/85 max-w-3xl leading-relaxed pt-3 border-t border-border/70 font-sans">
            {calendar.description}
          </p>
        )}
      </section>

      {/* 3. Tab Bar Navigation */}
      <div className="border-b border-border flex items-center gap-2 overflow-x-auto pb-px">
        <button
          type="button"
          onClick={() => setActiveTab("agenda")}
          className={`min-h-11 px-4 text-xs font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap inline-flex items-center gap-2 ${
            activeTab === "agenda"
              ? "border-[var(--color-accent)] text-[var(--color-accent)] font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <CalendarIcon className="size-4" />
          <span>Agenda Acara ({events.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("anggota")}
          className={`min-h-11 px-4 text-xs font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap inline-flex items-center gap-2 ${
            activeTab === "anggota"
              ? "border-[var(--color-accent)] text-[var(--color-accent)] font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="size-4" />
          <span>Pengurus &amp; Anggota ({members.length})</span>
        </button>

        {isManager && (
          <button
            type="button"
            onClick={() => setActiveTab("kas")}
            className={`min-h-11 px-4 text-xs font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap inline-flex items-center gap-2 ${
              activeTab === "kas"
                ? "border-[var(--color-accent)] text-[var(--color-accent)] font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Coins className="size-4" />
            <span>Kas Komunitas</span>
          </button>
        )}
      </div>

      {/* TAB 1: AGENDA ACARA */}
      {activeTab === "agenda" && (
        <div className="space-y-4">
          {isEventsLoading ? (
            <div className="py-12 text-center text-xs text-muted-foreground space-y-2">
              <div className="size-5 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent mx-auto" />
              <p>Memuat agenda acara...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-10 text-center space-y-2.5">
              <CalendarIcon className="size-8 text-muted-foreground/40 mx-auto" />
              <p className="text-xs text-muted-foreground">
                Belum ada agenda acara mendatang dari komunitas ini.
              </p>
              {isManager && (
                <div className="pt-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setIsCreateOpen(true)}
                    className="min-h-10 text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 bg-foreground text-background hover:opacity-90 cursor-pointer"
                  >
                    <Plus className="size-4" />
                    <span>Buat Acara Pertama</span>
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((ev) => {
                const eventDate = new Date(ev.startsAt);
                const shortMonth = eventDate
                  .toLocaleDateString("id-ID", { month: "short" })
                  .toUpperCase();
                const dayNumber = eventDate.getDate();
                const dayName = eventDate.toLocaleDateString("id-ID", {
                  weekday: "long",
                });
                const timeStr = eventDate
                  .toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                  .replace(".", ":");

                return (
                  <article
                    key={ev.id}
                    onClick={() => setSelectedEventSlug(ev.slug)}
                    className="p-4 sm:p-5 rounded-2xl border border-border/80 bg-card hover:border-foreground/30 hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group"
                  >
                    <div className="flex items-start gap-4 min-w-0 flex-1">
                      {/* Date Badge Box */}
                      <div className="size-14 rounded-xl border border-border/80 bg-muted/40 flex flex-col items-center justify-center shrink-0 text-center font-mono select-none">
                        <span className="text-[10px] uppercase font-bold text-[var(--color-accent)]">
                          {shortMonth}
                        </span>
                        <span className="font-serif text-xl font-bold text-foreground leading-none">
                          {dayNumber}
                        </span>
                      </div>

                      {/* Event Details */}
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span className="px-2 py-0.5 rounded-md bg-muted text-foreground border border-border/80 font-medium text-[11px]">
                            #{ev.categoryTag || "Literasi"}
                          </span>
                          <span>•</span>
                          <span>{dayName}</span>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="size-3 text-muted-foreground" />
                            <span>{timeStr} WIB</span>
                          </span>
                          {ev.format === "online" && (
                            <>
                              <span>•</span>
                              <span className="font-medium text-foreground">
                                Daring (Online)
                              </span>
                            </>
                          )}
                        </div>

                        <h3 className="font-serif text-base sm:text-lg font-bold text-foreground group-hover:text-[var(--color-accent)] transition-colors line-clamp-2 leading-snug">
                          {ev.title}
                        </h3>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1.5 truncate">
                            <MapPin className="size-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate">
                              {ev.isAddressHidden
                                ? ev.city
                                : ev.venueName || "Lokasi Acara"}
                            </span>
                          </span>

                          <span className="flex items-center gap-1.5 shrink-0">
                            <Users className="size-3.5 text-muted-foreground shrink-0" />
                            <span>{ev.attendeeCount} peserta</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right Thumbnail & Arrow */}
                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                      {ev.coverUrl && (
                        <img
                          src={ev.coverUrl}
                          alt=""
                          className="size-16 rounded-xl object-cover border border-border/80 shadow-xs"
                        />
                      )}
                      <div className="hidden sm:flex size-8 rounded-full border border-border/80 bg-muted/30 items-center justify-center text-muted-foreground group-hover:text-foreground group-hover:border-foreground/30 transition-colors">
                        <ChevronRight className="size-4" />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PENGURUS & ANGGOTA */}
      {activeTab === "anggota" && (
        <div className="space-y-8">
          {/* Pengurus Inti */}
          <div className="space-y-3">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-semibold">
              <Shield className="size-3.5 text-[var(--color-accent)]" />
              <span>Pengurus Inti Komunitas</span>
            </h3>
            {leaders.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                Belum ada data pengurus terdaftar.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {leaders.map((leader) => (
                  <div
                    key={leader.id}
                    className="flex items-center gap-3.5 rounded-xl border border-border/80 bg-card p-4 shadow-xs"
                  >
                    {leader.image ? (
                      <img
                        src={leader.image}
                        alt={leader.name}
                        className="size-11 rounded-full object-cover border border-border/80"
                      />
                    ) : (
                      <div className="size-11 rounded-full bg-muted text-foreground font-serif font-bold text-sm flex items-center justify-center border border-border/80">
                        {leader.name.slice(0, 1)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-foreground truncate">
                        {leader.name}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] px-2 py-0.5 rounded-md border border-border/80 bg-muted text-foreground font-medium">
                          {leader.role === "owner"
                            ? "Pemilik Komunitas"
                            : "Pengurus / Admin"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Anggota Komunitas */}
          <div className="space-y-3 pt-4 border-t border-border/80">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-semibold">
              <Users className="size-3.5" />
              <span>Anggota Komunitas ({regularMembers.length})</span>
            </h3>
            {regularMembers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
                Belum ada anggota umum yang bergabung. Jadilah anggota pertama dengan menekan tombol &ldquo;Gabung Komunitas&rdquo;!
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {regularMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 rounded-xl border border-border/80 bg-card p-3.5 shadow-xs"
                  >
                    {member.image ? (
                      <img
                        src={member.image}
                        alt={member.name}
                        className="size-10 rounded-full object-cover border border-border/80"
                      />
                    ) : (
                      <div className="size-10 rounded-full bg-muted text-foreground font-serif font-bold text-xs flex items-center justify-center border border-border/80">
                        {member.name.slice(0, 1)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-foreground truncate">
                        {member.name}
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        Bergabung {new Date(member.createdAt).toLocaleDateString("id-ID")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: KAS KOMUNITAS (MANAGERS ONLY) */}
      {activeTab === "kas" && isManager && (
        <div className="space-y-6">
          {/* Dana Gotong Royong Kas Afiliasi 10% Info Box */}
          <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-3 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-foreground">
                  <Coins className="size-4 text-[var(--color-accent)]" />
                  <h4 className="font-serif font-bold text-sm">
                    Tautan Kas Afiliasi Komunitas 10%
                  </h4>
                </div>
                <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
                  Bagikan tautan ini ke anggota atau media sosial. Setiap transaksi buku digital atau aktivasi langganan dari tautan ini otomatis menyumbang komisi 10% ke kas komunitas.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="text-xs rounded-xl inline-flex items-center gap-1.5 cursor-pointer shrink-0 border-border/80"
              >
                {copiedLink ? (
                  <>
                    <Check className="size-3.5 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">Tautan Disalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5" />
                    <span>Salin Tautan Afiliasi</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Wallet Overview Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Card 1: Saldo Kas */}
            <div className="rounded-2xl border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/5 p-5 space-y-2 shadow-xs">
              <div className="flex items-center justify-between text-xs text-foreground font-semibold">
                <span>Saldo Kas Aktif</span>
                <Wallet className="size-4 text-[var(--color-accent)]" />
              </div>
              <div className="font-serif text-2xl font-bold text-foreground">
                {formatIdr(wallet?.balanceIdr || 0)}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Dana siap dipakai untuk agenda literasi &amp; kegiatan temu.
              </p>
            </div>

            {/* Card 2: Afiliasi Nakama */}
            <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-2 shadow-xs">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Komisi Langganan (10%)</span>
                <Coins className="size-4 text-foreground" />
              </div>
              <div className="font-serif text-xl font-bold text-foreground">
                {formatIdr(wallet?.totalAffiliateNakamaIdr || 0)}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Dari langganan bulanan/tahunan via referral.
              </p>
            </div>

            {/* Card 3: Komisi Buku Ala Carte */}
            <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-2 shadow-xs">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Komisi Buku (10%)</span>
                <TrendingUp className="size-4 text-foreground" />
              </div>
              <div className="font-serif text-xl font-bold text-foreground">
                {formatIdr(wallet?.totalAffiliateBookPurchasesIdr || 0)}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Dari pembelian buku digital pembaca.
              </p>
            </div>

            {/* Card 4: Tiket & Payout */}
            <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-2 shadow-xs">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Tiket &amp; Pencairan</span>
                <Shield className="size-4 text-foreground" />
              </div>
              <div className="font-serif text-xl font-bold text-foreground">
                {formatIdr(wallet?.totalPaidEventTicketsIdr || 0)}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Penarikan dana: {formatIdr(wallet?.totalPayoutsWithdrawnIdr || 0)}
              </p>
            </div>
          </div>

          {/* Mutasi Riwayat Ledgers Transparan */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Coins className="size-4 text-[var(--color-accent)]" />
              <span>Buku Kas &amp; Riwayat Mutasi Transparan</span>
            </h4>

            {!wallet?.recentLedgers || wallet.recentLedgers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
                Belum ada transaksi tercatat di kas kalender ini.
              </div>
            ) : (
              <div className="divide-y divide-border/80 rounded-xl border border-border/80 bg-card overflow-hidden shadow-xs">
                {wallet.recentLedgers.map((ledger) => {
                  const isWithdrawal = ledger.entryType === "payout_withdrawal";
                  return (
                    <div
                      key={ledger.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium border border-border/80 bg-muted text-foreground">
                            {ledger.entryType === "affiliate_nakama"
                              ? "Afiliasi Langganan 10%"
                              : ledger.entryType === "affiliate_book_purchase"
                                ? "Afiliasi Buku 10%"
                                : ledger.entryType === "paid_event_ticket"
                                  ? "Tiket Acara"
                                  : "Pencairan Kas"}
                          </span>
                          <span className="text-muted-foreground text-[11px]">
                            {new Date(ledger.createdAt).toLocaleString("id-ID", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </span>
                        </div>
                        <p className="text-foreground/90 font-medium">{ledger.description}</p>
                      </div>

                      <div
                        className={`text-sm font-bold sm:text-right shrink-0 ${
                          isWithdrawal ? "text-destructive" : "text-foreground"
                        }`}
                      >
                        {isWithdrawal ? "-" : "+"}
                        {formatIdr(ledger.amountIdr)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Drawer: Detail Acara */}
      <EventDetailDrawer
        open={Boolean(selectedEventSlug)}
        onClose={() => setSelectedEventSlug(null)}
        event={selectedEvent}
      />

      {/* Dialog: Buat Acara Baru */}
      <CreateEventDialog
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={(eventSlug) => setSelectedEventSlug(eventSlug)}
      />

      {/* Dialog: Edit Profil Komunitas */}
      {isEditOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs text-foreground overflow-y-auto"
        >
          <div className="max-w-md w-full bg-card border border-border rounded-2xl p-6 shadow-2xl relative space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-serif text-lg font-bold">
                Edit Profil Komunitas
              </h3>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div className="space-y-1">
                <Label htmlFor="edit-comm-name" className="text-xs">
                  Nama Komunitas <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-comm-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="edit-comm-desc" className="text-xs">
                  Deskripsi / Visi Komunitas
                </Label>
                <Textarea
                  id="edit-comm-desc"
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Ceritakan kegiatan dan fokus literasi komunitas..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="edit-comm-city" className="text-xs">
                    Kota / Wilayah
                  </Label>
                  <Input
                    id="edit-comm-city"
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    placeholder="Contoh: Bandung"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-comm-email" className="text-xs">
                    Email Kontak
                  </Label>
                  <Input
                    id="edit-comm-email"
                    type="email"
                    value={editContactEmail}
                    onChange={(e) => setEditContactEmail(e.target.value)}
                    placeholder="kontak@komunitas.id"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-border/60">
                <Label className="text-xs font-semibold">Tautan Media Sosial</Label>
                <div className="space-y-2">
                  <Input
                    value={editInstagram}
                    onChange={(e) => setEditInstagram(e.target.value)}
                    placeholder="Instagram (contoh: @klubbukumalik)"
                  />
                  <Input
                    value={editTwitter}
                    onChange={(e) => setEditTwitter(e.target.value)}
                    placeholder="X / Twitter (contoh: @klubbukumalik)"
                  />
                  <Input
                    value={editWebsite}
                    onChange={(e) => setEditWebsite(e.target.value)}
                    placeholder="Website (https://...)"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditOpen(false)}
                  className="text-xs min-h-10 px-4 cursor-pointer"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="bg-foreground text-background text-xs min-h-10 px-4 cursor-pointer font-semibold rounded-xl"
                >
                  {updateProfileMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
