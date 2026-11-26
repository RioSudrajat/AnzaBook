import * as React from "react";
import {
  Calendar as CalendarIcon,
  Check,
  CheckCircle,
  ChevronRight,
  Clock,
  Coins,
  Copy,
  Edit3,
  Mail,
  MapPin,
  Plus,
  Settings2,
  Share2,
  Shield,
  TrendingUp,
  Upload,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { EntityProfileHeader } from "@/components/profile/entity-profile-header";
import {
  ProfileTabs,
  type ProfileTabItem,
} from "@/components/profile/profile-tabs";
import { SmartBackButton } from "@/components/smart-back-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useUpdateCalendarProfile,
  useUploadMediaImage,
} from "@/features/social/hooks";
import {
  useCalendar,
  useCalendarMembers,
  useCommunityWallet,
  useEvents,
  useJoinCalendar,
  useLeaveCalendar,
  useToggleFollowCalendar,
} from "../hooks";
import { CreateEventDialog } from "./create-event-dialog";
import { EventDetailDrawer } from "./event-detail-drawer";

export type CommunityHubViewProps = {
  slug: string;
  isInsideApp?: boolean;
  onBack?: () => void;
};

type CommunityTab = "agenda" | "anggota" | "kas" | "pengaturan";

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
  const uploadMediaMutation = useUploadMediaImage();

  const [activeTab, setActiveTab] = React.useState<CommunityTab>("agenda");
  const [selectedEventSlug, setSelectedEventSlug] = React.useState<
    string | null
  >(null);
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [copiedLink, setCopiedLink] = React.useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = React.useState(false);

  const avatarFileRef = React.useRef<HTMLInputElement>(null);
  const bannerFileRef = React.useRef<HTMLInputElement>(null);

  // Edit Profil Komunitas Form States (rendered inline in Pengaturan Profil tab)
  const [editName, setEditName] = React.useState("");
  const [editAvatarUrl, setEditAvatarUrl] = React.useState("");
  const [editCoverUrl, setEditCoverUrl] = React.useState("");
  const [editDescription, setEditDescription] = React.useState("");
  const [editCity, setEditCity] = React.useState("");
  const [editContactEmail, setEditContactEmail] = React.useState("");
  const [editInstagram, setEditInstagram] = React.useState("");
  const [editTwitter, setEditTwitter] = React.useState("");
  const [editWebsite, setEditWebsite] = React.useState("");
  const [editFeedback, setEditFeedback] = React.useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  React.useEffect(() => {
    if (calendar) {
      queueMicrotask(() => {
        setEditName(calendar.name);
        setEditAvatarUrl(calendar.avatarUrl || "");
        setEditCoverUrl(calendar.coverUrl || "");
        setEditDescription(calendar.description || "");
        setEditCity(calendar.city || "");
        setEditContactEmail(calendar.contactEmail || "");
        setEditInstagram(calendar.socialLinks?.instagram || "");
        setEditTwitter(calendar.socialLinks?.twitter || "");
        setEditWebsite(calendar.socialLinks?.website || "");
      });
    }
  }, [calendar]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditFeedback(null);
    if (editName.trim().length < 3) {
      setEditFeedback({
        type: "error",
        text: "Nama komunitas minimal 3 karakter.",
      });
      return;
    }
    try {
      await updateProfileMutation.mutateAsync({
        slug,
        input: {
          name: editName.trim(),
          avatarUrl: editAvatarUrl.trim() || undefined,
          coverUrl: editCoverUrl.trim() || undefined,
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
      setEditFeedback({
        type: "success",
        text: "Profil dan identitas komunitas berhasil diperbarui.",
      });
    } catch (err: unknown) {
      setEditFeedback({
        type: "error",
        text:
          err instanceof Error
            ? err.message
            : "Gagal memperbarui profil komunitas.",
      });
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
      <div className="py-24 text-center text-[var(--color-muted)] text-xs space-y-2">
        <div className="size-6 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent mx-auto" />
        <p>Memuat profil komunitas...</p>
      </div>
    );
  }

  if (!calendar) {
    return (
      <div className="py-20 text-center space-y-3">
        <p className="text-sm font-semibold text-[var(--color-ink)]">
          Komunitas tidak ditemukan.
        </p>
        {onBack && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onBack}
            className="min-h-11 text-xs"
          >
            Kembali
          </Button>
        )}
      </div>
    );
  }

  const events = eventsData?.data || [];
  const selectedEvent =
    events.find((e) => e.slug === selectedEventSlug) || null;
  const leaders = members.filter(
    (m) => m.role === "owner" || m.role === "admin",
  );
  const regularMembers = members.filter(
    (m) => m.role === "member" || m.role === "checkin_staff",
  );

  const tabs: ProfileTabItem<CommunityTab>[] = [
    {
      id: "agenda",
      label: "Agenda Acara",
      count: events.length,
      icon: <CalendarIcon className="size-4" aria-hidden="true" />,
    },
    {
      id: "anggota",
      label: "Pengurus & Anggota",
      count: members.length,
      icon: <Users className="size-4" aria-hidden="true" />,
    },
    ...(isManager
      ? [
          {
            id: "kas" as const,
            label: "Kas Komunitas",
            icon: <Coins className="size-4" aria-hidden="true" />,
          },
          {
            id: "pengaturan" as const,
            label: "Pengaturan Profil",
            icon: <Settings2 className="size-4" aria-hidden="true" />,
          },
        ]
      : []),
  ];

  const isVerified =
    calendar.verificationStatus === "verified" ||
    calendar.verificationStatus === "trusted";

  const badges = [
    ...(isVerified
      ? [
          {
            label: "Komunitas Terverifikasi",
            tone: "success" as const,
            icon: <CheckCircle className="size-3.5" aria-hidden="true" />,
          },
        ]
      : []),
    ...(calendar.isMember
      ? [
          {
            label:
              calendar.memberRole === "owner"
                ? "Pemilik Komunitas"
                : calendar.memberRole === "admin"
                  ? "Pengurus"
                  : "Anggota",
            tone: "neutral" as const,
          },
        ]
      : []),
  ];

  return (
    <div className="w-full space-y-6 pb-12 text-[var(--color-ink)]">
      {/* Top Breadcrumb Bar */}
      <div className="flex items-center justify-between gap-3">
        <SmartBackButton
          fallbackTo={isInsideApp ? "/app" : "/"}
          label="Kembali"
          className="-ml-2"
        />

        <Button
          type="button"
          variant="outline"
          onClick={handleCopyLink}
          className="min-h-11 px-4 text-xs rounded-xl inline-flex items-center gap-1.5 cursor-pointer border-[var(--color-rule)] bg-[var(--color-paper-2)] hover:bg-[var(--color-paper-3)]"
          title="Salin tautan komunitas"
        >
          {copiedLink ? (
            <>
              <Check
                className="size-3.5 text-[var(--color-green)]"
                aria-hidden="true"
              />
              <span className="font-semibold">Tautan Disalin</span>
            </>
          ) : (
            <>
              <Share2 className="size-3.5" aria-hidden="true" />
              <span>Bagikan</span>
            </>
          )}
        </Button>
      </div>

      {/* Unified Community Profile Masthead */}
      <EntityProfileHeader
        kind="community"
        headingId="calendar-heading"
        headingLevel="h2"
        logoFit="cover"
        name={calendar.name}
        handleOrSlug={`/c/${calendar.slug}`}
        avatarUrl={calendar.avatarUrl}
        bannerUrl={calendar.coverUrl}
        badges={badges}
        metaItems={[
          {
            icon: <MapPin className="size-3.5" aria-hidden="true" />,
            label: calendar.city || "Indonesia",
          },
          ...(calendar.contactEmail
            ? [
                {
                  icon: <Mail className="size-3.5" aria-hidden="true" />,
                  label: calendar.contactEmail,
                },
              ]
            : []),
        ]}
        bio={calendar.description}
        socialLinks={calendar.socialLinks}
        actions={
          isManager ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveTab("pengaturan")}
                className="min-h-11 px-4 text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 cursor-pointer border-[var(--color-rule)] bg-[var(--color-paper)] hover:bg-[var(--color-paper-3)]"
              >
                <Edit3 className="size-3.5" aria-hidden="true" />
                <span>Sunting Profil</span>
              </Button>

              <Button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="min-h-11 px-4 bg-[var(--color-accent)] text-[var(--color-accent-ink)] hover:brightness-95 text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="size-4" aria-hidden="true" />
                <span>Buat Acara</span>
              </Button>
            </>
          ) : calendar.isMember ? (
            showLeaveConfirm ? (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  disabled={leaveMutation.isPending}
                  onClick={() => {
                    leaveMutation.mutate(undefined, {
                      onSuccess: () => setShowLeaveConfirm(false),
                    });
                  }}
                  className="min-h-11 text-xs font-semibold rounded-xl px-4 cursor-pointer"
                >
                  Konfirmasi Keluar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowLeaveConfirm(false)}
                  className="min-h-11 text-xs rounded-xl px-4 border-[var(--color-rule)] cursor-pointer"
                >
                  Batal
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowLeaveConfirm(true)}
                className="min-h-11 px-4 text-xs rounded-xl border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink)] hover:bg-[var(--color-error-soft)] hover:text-[var(--color-error)] font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Klik untuk keluar dari komunitas"
              >
                <UserCheck
                  className="size-3.5 text-[var(--color-green)]"
                  aria-hidden="true"
                />
                <span>Anggota Terdaftar</span>
              </Button>
            )
          ) : (
            <>
              <Button
                type="button"
                disabled={joinMutation.isPending}
                onClick={() => joinMutation.mutate()}
                className="min-h-11 px-4 bg-[var(--color-ink)] text-[var(--color-paper)] hover:opacity-90 text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
              >
                <UserPlus className="size-3.5" aria-hidden="true" />
                <span>Gabung Komunitas</span>
              </Button>

              <Button
                type="button"
                variant={calendar.isFollowing ? "outline" : "default"}
                disabled={toggleFollowMutation.isPending}
                onClick={() => toggleFollowMutation.mutate()}
                className={`min-h-11 px-4 text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 cursor-pointer ${
                  calendar.isFollowing
                    ? "bg-[var(--color-paper)] text-[var(--color-ink)] border border-[var(--color-rule)] hover:bg-[var(--color-paper-3)]"
                    : "bg-[var(--color-accent)] text-[var(--color-accent-ink)] hover:brightness-95"
                }`}
              >
                {calendar.isFollowing ? (
                  <>
                    <Check className="size-3.5" aria-hidden="true" />
                    <span>Mengikuti</span>
                  </>
                ) : (
                  <>
                    <CalendarIcon className="size-3.5" aria-hidden="true" />
                    <span>Ikuti Agenda</span>
                  </>
                )}
              </Button>
            </>
          )
        }
        metrics={[
          {
            label: "Pengikut",
            value: calendar.followerCount,
            icon: <Users className="size-3.5" aria-hidden="true" />,
          },
          {
            label: "Anggota",
            value: members.length,
            icon: <UserCheck className="size-3.5" aria-hidden="true" />,
          },
          {
            label: "Agenda Acara",
            value: events.length,
            icon: <CalendarIcon className="size-3.5" aria-hidden="true" />,
          },
          isManager
            ? {
                label: "Saldo Kas",
                value: formatIdr(wallet?.balanceIdr || 0),
                icon: <Wallet className="size-3.5" aria-hidden="true" />,
              }
            : {
                label: "Kota Basis",
                value: calendar.city || "Indonesia",
                icon: <MapPin className="size-3.5" aria-hidden="true" />,
              },
        ]}
      />

      <ProfileTabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
        ariaLabel="Navigasi Komunitas"
        idPrefix="comm-hub"
      />

      {/* TAB 1: AGENDA ACARA */}
      {activeTab === "agenda" && (
        <div
          role="tabpanel"
          aria-labelledby="comm-hub-tab-agenda"
          className="space-y-4"
        >
          {isEventsLoading ? (
            <div className="py-12 text-center text-xs text-[var(--color-muted)] space-y-2">
              <div className="size-5 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent mx-auto" />
              <p>Memuat agenda acara...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--color-rule)] p-10 text-center space-y-2.5">
              <CalendarIcon
                className="size-8 text-[var(--color-muted)]/60 mx-auto"
                aria-hidden="true"
              />
              <p className="text-xs text-[var(--color-muted)]">
                Belum ada agenda acara mendatang dari komunitas ini.
              </p>
              {isManager && (
                <div className="pt-2">
                  <Button
                    type="button"
                    onClick={() => setIsCreateOpen(true)}
                    className="min-h-11 text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 bg-[var(--color-ink)] text-[var(--color-paper)] hover:opacity-90 cursor-pointer"
                  >
                    <Plus className="size-4" aria-hidden="true" />
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
                    className="p-4 sm:p-5 rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] hover:border-[var(--color-ink)]/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group"
                  >
                    <div className="flex items-start gap-4 min-w-0 flex-1">
                      <div className="size-14 rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] flex flex-col items-center justify-center shrink-0 text-center font-mono select-none">
                        <span className="text-[10px] uppercase font-bold text-[var(--color-accent)]">
                          {shortMonth}
                        </span>
                        <span className="font-serif text-xl font-bold text-[var(--color-ink)] leading-none">
                          {dayNumber}
                        </span>
                      </div>

                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-muted)]">
                          <span className="px-2 py-0.5 rounded-md bg-[var(--color-paper)] text-[var(--color-ink)] border border-[var(--color-rule)] font-medium text-[11px]">
                            #{ev.categoryTag || "Literasi"}
                          </span>
                          <span>{dayName}</span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="size-3" aria-hidden="true" />
                            <span>{timeStr} WIB</span>
                          </span>
                          {ev.format === "online" && (
                            <span className="font-medium text-[var(--color-ink)]">
                              Daring (Online)
                            </span>
                          )}
                        </div>

                        <h3 className="font-serif text-base sm:text-lg font-bold text-[var(--color-ink)] group-hover:text-[var(--color-accent)] transition-colors line-clamp-2 leading-snug">
                          {ev.title}
                        </h3>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--color-muted)]">
                          <span className="flex items-center gap-1.5 truncate">
                            <MapPin
                              className="size-3.5 shrink-0"
                              aria-hidden="true"
                            />
                            <span className="truncate">
                              {ev.isAddressHidden
                                ? ev.city
                                : ev.venueName || "Lokasi Acara"}
                            </span>
                          </span>

                          <span className="flex items-center gap-1.5 shrink-0">
                            <Users
                              className="size-3.5 shrink-0"
                              aria-hidden="true"
                            />
                            <span>{ev.attendeeCount} peserta</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                      {ev.coverUrl && (
                        <img
                          src={ev.coverUrl}
                          alt=""
                          className="size-16 rounded-xl object-cover border border-[var(--color-rule)]"
                        />
                      )}
                      <div className="hidden sm:flex size-9 rounded-full border border-[var(--color-rule)] bg-[var(--color-paper)] items-center justify-center text-[var(--color-muted)] group-hover:text-[var(--color-ink)] transition-colors">
                        <ChevronRight className="size-4" aria-hidden="true" />
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
        <div
          role="tabpanel"
          aria-labelledby="comm-hub-tab-anggota"
          className="space-y-8"
        >
          <div className="space-y-3">
            <h3 className="text-xs uppercase tracking-wider text-[var(--color-muted)] flex items-center gap-1.5 font-semibold">
              <Shield
                className="size-3.5 text-[var(--color-accent)]"
                aria-hidden="true"
              />
              <span>Pengurus Inti Komunitas</span>
            </h3>
            {leaders.length === 0 ? (
              <p className="text-xs text-[var(--color-muted)] italic">
                Belum ada data pengurus terdaftar.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {leaders.map((leader) => (
                  <div
                    key={leader.id}
                    className="flex items-center gap-3.5 rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-4"
                  >
                    {leader.image ? (
                      <img
                        src={leader.image}
                        alt={leader.name}
                        className="size-11 rounded-full object-cover border border-[var(--color-rule)]"
                      />
                    ) : (
                      <div className="size-11 rounded-full bg-[var(--color-paper-3)] text-[var(--color-ink)] font-serif font-bold text-sm flex items-center justify-center border border-[var(--color-rule)]">
                        {leader.name.slice(0, 1)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold truncate">
                        {leader.name}
                      </div>
                      <div className="mt-1">
                        <span className="text-[11px] px-2 py-0.5 rounded-md border border-[var(--color-rule)] bg-[var(--color-paper)] font-medium">
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

          <div className="space-y-3 pt-4 border-t border-[var(--color-rule)]">
            <h3 className="text-xs uppercase tracking-wider text-[var(--color-muted)] flex items-center gap-1.5 font-semibold">
              <Users className="size-3.5" aria-hidden="true" />
              <span>Anggota Komunitas ({regularMembers.length})</span>
            </h3>
            {regularMembers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--color-rule)] p-8 text-center text-xs text-[var(--color-muted)]">
                Belum ada anggota umum yang bergabung. Jadilah anggota pertama
                dengan menekan tombol &ldquo;Gabung Komunitas&rdquo;.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {regularMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-3.5"
                  >
                    {member.image ? (
                      <img
                        src={member.image}
                        alt={member.name}
                        className="size-10 rounded-full object-cover border border-[var(--color-rule)]"
                      />
                    ) : (
                      <div className="size-10 rounded-full bg-[var(--color-paper-3)] text-[var(--color-ink)] font-serif font-bold text-xs flex items-center justify-center border border-[var(--color-rule)]">
                        {member.name.slice(0, 1)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold truncate">
                        {member.name}
                      </div>
                      <span className="text-[11px] text-[var(--color-muted)]">
                        Bergabung{" "}
                        {new Date(member.createdAt).toLocaleDateString("id-ID")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: KAS KOMUNITAS */}
      {activeTab === "kas" && isManager && (
        <div
          role="tabpanel"
          aria-labelledby="comm-hub-tab-kas"
          className="space-y-6"
        >
          <div className="rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Coins
                    className="size-4 text-[var(--color-accent)]"
                    aria-hidden="true"
                  />
                  <h4 className="font-serif font-bold text-sm">
                    Tautan Kas Afiliasi Komunitas 10%
                  </h4>
                </div>
                <p className="text-xs text-[var(--color-muted)] max-w-xl leading-relaxed">
                  Bagikan tautan ini ke anggota atau media sosial. Setiap
                  transaksi buku digital atau aktivasi langganan dari tautan ini
                  otomatis menyumbang komisi 10% ke kas komunitas.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleCopyLink}
                className="min-h-11 px-4 text-xs rounded-xl inline-flex items-center gap-1.5 cursor-pointer shrink-0 border-[var(--color-rule)]"
              >
                {copiedLink ? (
                  <>
                    <Check
                      className="size-3.5 text-[var(--color-green)]"
                      aria-hidden="true"
                    />
                    <span className="font-semibold">Tautan Disalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5" aria-hidden="true" />
                    <span>Salin Tautan Afiliasi</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-[var(--color-accent)]/40 bg-[var(--color-accent-soft)]/50 p-5 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span>Saldo Kas Aktif</span>
                <Wallet
                  className="size-4 text-[var(--color-accent)]"
                  aria-hidden="true"
                />
              </div>
              <div className="font-serif text-2xl font-bold">
                {formatIdr(wallet?.balanceIdr || 0)}
              </div>
              <p className="text-[11px] text-[var(--color-ink-2)]">
                Dana siap dipakai untuk agenda literasi &amp; kegiatan temu.
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-5 space-y-2">
              <div className="flex items-center justify-between text-xs text-[var(--color-muted)]">
                <span>Komisi Langganan (10%)</span>
                <Coins className="size-4" aria-hidden="true" />
              </div>
              <div className="font-serif text-xl font-bold">
                {formatIdr(wallet?.totalAffiliateNakamaIdr || 0)}
              </div>
              <p className="text-[11px] text-[var(--color-muted)]">
                Dari langganan bulanan/tahunan via rujukan komunitas.
              </p>
            </div>

            {/* Komisi Pembelian Buku Satuan (10%) */}
            <div className="rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-5 space-y-2">
              <div className="flex items-center justify-between text-xs text-[var(--color-muted)]">
                <span>Komisi Buku (10%)</span>
                <TrendingUp className="size-4" aria-hidden="true" />
              </div>
              <div className="font-serif text-xl font-bold">
                {formatIdr(wallet?.totalAffiliateBookPurchasesIdr || 0)}
              </div>
              <p className="text-[11px] text-[var(--color-muted)]">
                Dari pembelian buku digital satuan pembaca.
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-5 space-y-2">
              <div className="flex items-center justify-between text-xs text-[var(--color-muted)]">
                <span>Tiket &amp; Pencairan</span>
                <Shield className="size-4" aria-hidden="true" />
              </div>
              <div className="font-serif text-xl font-bold">
                {formatIdr(wallet?.totalPaidEventTicketsIdr || 0)}
              </div>
              <p className="text-[11px] text-[var(--color-muted)]">
                Penarikan dana:{" "}
                {formatIdr(wallet?.totalPayoutsWithdrawnIdr || 0)}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-bold flex items-center gap-2">
              <Coins
                className="size-4 text-[var(--color-accent)]"
                aria-hidden="true"
              />
              <span>Buku Kas &amp; Riwayat Mutasi Transparan</span>
            </h4>

            {!wallet?.recentLedgers || wallet.recentLedgers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--color-rule)] p-8 text-center text-xs text-[var(--color-muted)]">
                Belum ada transaksi tercatat di kas kalender ini.
              </div>
            ) : (
              <div className="divide-y divide-[var(--color-rule)] rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] overflow-hidden">
                {wallet.recentLedgers.map((ledger) => {
                  const isWithdrawal = ledger.entryType === "payout_withdrawal";
                  return (
                    <div
                      key={ledger.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium border border-[var(--color-rule)] bg-[var(--color-paper)]">
                            {ledger.entryType === "affiliate_nakama"
                              ? "Afiliasi Langganan 10%"
                              : ledger.entryType === "affiliate_book_purchase"
                                ? "Afiliasi Buku 10%"
                                : ledger.entryType === "paid_event_ticket"
                                  ? "Tiket Acara"
                                  : "Pencairan Kas"}
                          </span>
                          <span className="text-[var(--color-muted)] text-[11px]">
                            {new Date(ledger.createdAt).toLocaleString(
                              "id-ID",
                              {
                                dateStyle: "medium",
                                timeStyle: "short",
                              },
                            )}
                          </span>
                        </div>
                        <p className="text-[var(--color-ink-2)] font-medium">
                          {ledger.description}
                        </p>
                      </div>

                      <div
                        className={`text-sm font-bold sm:text-right shrink-0 ${
                          isWithdrawal
                            ? "text-[var(--color-error)]"
                            : "text-[var(--color-ink)]"
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

      {/* TAB 4: PENGATURAN PROFIL (MANAGERS ONLY — Inline like Publisher Studio) */}
      {activeTab === "pengaturan" && isManager && (
        <section
          role="tabpanel"
          aria-labelledby="comm-hub-tab-pengaturan"
          className="rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-5 sm:p-8"
        >
          <form onSubmit={handleSaveProfile} className="space-y-6">
            <div className="border-b border-[var(--color-rule)] pb-4 space-y-1">
              <h3 className="font-serif text-lg font-bold">
                Pengaturan Profil &amp; Visual Komunitas
              </h3>
              <p className="text-xs text-[var(--color-muted)]">
                Lengkapi foto profil, gambar banner header 3:1, deskripsi visi
                komunitas, serta tautan kanal media sosial.
              </p>
            </div>

            {editFeedback && (
              <div
                role={editFeedback.type === "error" ? "alert" : "status"}
                className={`rounded-xl border px-4 py-3 text-xs ${
                  editFeedback.type === "error"
                    ? "border-[var(--color-error)]/40 bg-[var(--color-error-soft)]"
                    : "border-[var(--color-green)]/40 bg-[var(--color-green-soft)]"
                }`}
              >
                {editFeedback.text}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="edit-comm-avatar"
                  className="text-xs font-semibold"
                >
                  Logo / Foto Profil Komunitas
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="edit-comm-avatar"
                    value={editAvatarUrl}
                    onChange={(e) => setEditAvatarUrl(e.target.value)}
                    placeholder="https://... atau unggah berkas"
                    className="min-h-11 flex-1 font-mono text-xs bg-[var(--color-paper)]"
                  />
                  <input
                    ref={avatarFileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;
                      try {
                        const uploaded =
                          await uploadMediaMutation.mutateAsync(file);
                        setEditAvatarUrl(uploaded.url);
                      } catch (err) {
                        setEditFeedback({
                          type: "error",
                          text:
                            err instanceof Error
                              ? err.message
                              : "Gagal mengunggah avatar komunitas.",
                        });
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={uploadMediaMutation.isPending}
                    onClick={() => avatarFileRef.current?.click()}
                    className="min-h-11 px-3 text-xs font-semibold cursor-pointer"
                  >
                    <Upload className="size-3.5 mr-1" aria-hidden="true" />
                    Unggah
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="edit-comm-banner"
                  className="text-xs font-semibold"
                >
                  Banner Header Komunitas (Rasio 3:1)
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="edit-comm-banner"
                    value={editCoverUrl}
                    onChange={(e) => setEditCoverUrl(e.target.value)}
                    placeholder="https://... atau unggah banner"
                    className="min-h-11 flex-1 font-mono text-xs bg-[var(--color-paper)]"
                  />
                  <input
                    ref={bannerFileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;
                      try {
                        const uploaded =
                          await uploadMediaMutation.mutateAsync(file);
                        setEditCoverUrl(uploaded.url);
                      } catch (err) {
                        setEditFeedback({
                          type: "error",
                          text:
                            err instanceof Error
                              ? err.message
                              : "Gagal mengunggah banner komunitas.",
                        });
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={uploadMediaMutation.isPending}
                    onClick={() => bannerFileRef.current?.click()}
                    className="min-h-11 px-3 text-xs font-semibold cursor-pointer"
                  >
                    <Upload className="size-3.5 mr-1" aria-hidden="true" />
                    Unggah
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="edit-comm-name"
                  className="text-xs font-semibold"
                >
                  Nama Komunitas
                </Label>
                <Input
                  id="edit-comm-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="min-h-11 bg-[var(--color-paper)]"
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="edit-comm-city"
                  className="text-xs font-semibold"
                >
                  Kota / Wilayah
                </Label>
                <Input
                  id="edit-comm-city"
                  value={editCity}
                  onChange={(e) => setEditCity(e.target.value)}
                  placeholder="Contoh: Bandung"
                  className="min-h-11 bg-[var(--color-paper)]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-comm-desc" className="text-xs font-semibold">
                Deskripsi &amp; Visi Komunitas
              </Label>
              <Textarea
                id="edit-comm-desc"
                rows={4}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Ceritakan kegiatan, jadwal baca bersama, dan fokus literasi komunitas..."
                className="text-sm bg-[var(--color-paper)]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[var(--color-rule)]">
              <div className="space-y-1.5">
                <Label
                  htmlFor="edit-comm-email"
                  className="text-xs font-semibold"
                >
                  Email Kontak
                </Label>
                <Input
                  id="edit-comm-email"
                  type="email"
                  value={editContactEmail}
                  onChange={(e) => setEditContactEmail(e.target.value)}
                  placeholder="kontak@komunitas.id"
                  className="min-h-11 bg-[var(--color-paper)]"
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="edit-comm-website"
                  className="text-xs font-semibold"
                >
                  Situs Web
                </Label>
                <Input
                  id="edit-comm-website"
                  value={editWebsite}
                  onChange={(e) => setEditWebsite(e.target.value)}
                  placeholder="https://..."
                  className="min-h-11 font-mono text-xs bg-[var(--color-paper)]"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-comm-ig" className="text-xs font-semibold">
                  Instagram
                </Label>
                <Input
                  id="edit-comm-ig"
                  value={editInstagram}
                  onChange={(e) => setEditInstagram(e.target.value)}
                  placeholder="@klubbukumalik"
                  className="min-h-11 font-mono text-xs bg-[var(--color-paper)]"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-comm-x" className="text-xs font-semibold">
                  X / Twitter
                </Label>
                <Input
                  id="edit-comm-x"
                  value={editTwitter}
                  onChange={(e) => setEditTwitter(e.target.value)}
                  placeholder="@klubbukumalik"
                  className="min-h-11 font-mono text-xs bg-[var(--color-paper)]"
                />
              </div>
            </div>

            <div className="flex justify-end border-t border-[var(--color-rule)] pt-4">
              <Button
                type="submit"
                disabled={
                  updateProfileMutation.isPending ||
                  uploadMediaMutation.isPending
                }
                className="min-h-11 px-6 bg-[var(--color-accent)] text-[var(--color-accent-ink)] text-xs font-semibold rounded-xl hover:brightness-95 cursor-pointer"
              >
                {updateProfileMutation.isPending
                  ? "Menyimpan..."
                  : "Simpan Pengaturan Komunitas"}
              </Button>
            </div>
          </form>
        </section>
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
    </div>
  );
}
