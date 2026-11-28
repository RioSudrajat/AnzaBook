import * as React from "react";
import {
  Calendar as CalendarIcon,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Coins,
  Copy,
  Edit3,
  Mail,
  MapPin,
  Plus,
  Shield,
  Trash2,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import type { CalendarManageableRole } from "@starter/shared/validators/community";
import { authClient } from "@/lib/auth-client";
import { EntityProfileHeader } from "@/components/profile/entity-profile-header";
import {
  ProfileTabs,
  type ProfileTabItem,
} from "@/components/profile/profile-tabs";
import { SmartBackButton } from "@/components/smart-back-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useAddCalendarMember,
  useCalendar,
  useCalendarMembers,
  useCommunityWallet,
  useEvents,
  useJoinCalendar,
  useLeaveCalendar,
  useRemoveCalendarMember,
  useToggleFollowCalendar,
  useUpdateCalendarMemberRole,
} from "../hooks";
import { CreateEventDialog } from "./create-event-dialog";
import { EditCommunityProfileDialog } from "./edit-community-profile-dialog";
import { EventDetailDrawer } from "./event-detail-drawer";

export type CommunityTab = "agenda" | "anggota" | "kas";

export type CommunityHubViewProps = {
  slug: string;
  isInsideApp?: boolean;
  tab?: CommunityTab;
  returnTo?: string | null;
  onTabChange?: (nextTab: CommunityTab) => void;
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
  tab,
  returnTo,
  onTabChange,
  onBack,
}: CommunityHubViewProps) {
  const { data: session } = authClient.useSession();
  const currentUserId = session?.user?.id;
  const { data: calendar, isLoading: isCalendarLoading } = useCalendar(slug);
  const { data: eventsData, isLoading: isEventsLoading } = useEvents({
    calendarSlug: slug,
  });
  const toggleFollowMutation = useToggleFollowCalendar(slug);
  const joinMutation = useJoinCalendar(slug);
  const leaveMutation = useLeaveCalendar(slug);
  const addMemberMutation = useAddCalendarMember(slug);
  const updateMemberRoleMutation = useUpdateCalendarMemberRole(slug);
  const removeMemberMutation = useRemoveCalendarMember(slug);

  const [localTab, setLocalTab] = React.useState<CommunityTab>(tab ?? "agenda");
  const [selectedEventSlug, setSelectedEventSlug] = React.useState<
    string | null
  >(null);
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [copiedAffiliateLink, setCopiedAffiliateLink] = React.useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = React.useState(false);
  const [inviteIdentifier, setInviteIdentifier] = React.useState("");
  const [inviteRole, setInviteRole] =
    React.useState<CalendarManageableRole>("admin");
  const [teamFeedback, setTeamFeedback] = React.useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const isOwner = calendar?.memberRole === "owner";
  const isManager = Boolean(
    calendar?.isManager ||
    calendar?.memberRole === "owner" ||
    calendar?.memberRole === "admin",
  );

  const requestedTab = tab ?? localTab;
  const activeTab: CommunityTab =
    requestedTab === "kas" && calendar && !isManager ? "agenda" : requestedTab;

  const handleTabChange = (nextTab: CommunityTab) => {
    setLocalTab(nextTab);
    onTabChange?.(nextTab);
  };

  const effectiveInviteRole: CalendarManageableRole =
    !isOwner && inviteRole === "admin" ? "checkin_staff" : inviteRole;

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setTeamFeedback(null);
    const clean = inviteIdentifier.trim();
    if (clean.length < 2) {
      setTeamFeedback({
        type: "error",
        text: "Masukkan email atau @username pengguna.",
      });
      return;
    }
    try {
      const added = await addMemberMutation.mutateAsync({
        identifier: clean,
        role: effectiveInviteRole,
      });
      setInviteIdentifier("");
      setTeamFeedback({
        type: "success",
        text: `${added.name} ditambahkan ke tim komunitas.`,
      });
    } catch (err: unknown) {
      setTeamFeedback({
        type: "error",
        text:
          err instanceof Error
            ? err.message
            : "Gagal menambahkan anggota pengurus.",
      });
    }
  };

  const { data: members = [] } = useCalendarMembers(slug);
  const { data: wallet } = useCommunityWallet(slug);

  const handleCopyAffiliateLink = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const affiliateUrl = `${origin}/c/${slug}?ref=cal_${slug}`;
    if (navigator?.clipboard) {
      void navigator.clipboard.writeText(affiliateUrl);
      setCopiedAffiliateLink(true);
      setTimeout(() => setCopiedAffiliateLink(false), 3000);
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
    (m) =>
      m.role === "owner" || m.role === "admin" || m.role === "checkin_staff",
  );
  const regularMembers = members.filter((m) => m.role === "member");

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
        ]
      : []),
  ];

  const isVerified =
    calendar.verificationStatus === "verified" ||
    calendar.verificationStatus === "trusted";

  return (
    <div className="w-full space-y-6 pb-12 text-[var(--color-ink)]">
      {/* Top Bar */}
      <div className="flex items-center">
        <SmartBackButton
          returnTo={returnTo}
          fallbackTo={isInsideApp ? "/app?tab=events" : "/"}
          label="Kembali"
          className="-ml-2"
        />
      </div>

      {/* Unified Community Profile Masthead */}
      <EntityProfileHeader
        kind="community"
        headingId="calendar-heading"
        headingLevel="h2"
        logoFit="cover"
        name={calendar.name}
        handleOrSlug={`@${calendar.slug}`}
        avatarUrl={calendar.avatarUrl}
        bannerUrl={calendar.coverUrl}
        isVerified={isVerified}
        verifiedEntityType="community"
        badges={[]}
        shareConfig={{
          entityType: "community",
          name: calendar.name,
          handle: calendar.slug,
          avatarUrl: calendar.avatarUrl,
          sharePath: `/c/${calendar.slug}`,
          affiliateSlug: calendar.slug,
        }}
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
        affiliations={
          isManager && calendar.verificationStatus === "pending" ? (
            <div className="pt-1">
              <span className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[var(--color-accent)]/40 bg-[var(--color-accent-soft)] px-3 text-xs font-medium text-[var(--color-ink)]">
                <Clock className="size-3.5 shrink-0" aria-hidden="true" />
                <span>
                  Komunitas sedang menunggu verifikasi kurator AnzaBook.
                </span>
              </span>
            </div>
          ) : isManager && calendar.verificationStatus === "rejected" ? (
            <div className="pt-1">
              <span className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[var(--color-error)]/40 bg-[var(--color-error-soft)] px-3 text-xs font-medium text-[var(--color-ink)]">
                <span>
                  Pengajuan verifikasi ditolak
                  {calendar.rejectionReason
                    ? `: ${calendar.rejectionReason}`
                    : "."}
                </span>
              </span>
            </div>
          ) : undefined
        }
        actions={
          isManager ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(true)}
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
        onChange={handleTabChange}
        ariaLabel="Navigasi Komunitas"
        idPrefix="comm-hub"
      />

      <div className="min-h-[55vh]">
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
            {isManager && (
              <form
                onSubmit={handleAddMember}
                className="rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-5 space-y-4"
              >
                <div className="space-y-1">
                  <h3 className="font-serif text-base font-bold">
                    Tambah Pengurus &amp; Host Acara
                  </h3>
                  <p className="text-xs text-[var(--color-muted)] leading-relaxed">
                    Undang rekan menggunakan email atau @username AnzaBook agar
                    mereka dapat membuat acara, menyetujui pendaftar, atau
                    bertugas sebagai petugas check-in.
                  </p>
                </div>

                {teamFeedback && (
                  <div
                    role={teamFeedback.type === "error" ? "alert" : "status"}
                    className={`rounded-xl border px-4 py-2.5 text-xs ${
                      teamFeedback.type === "error"
                        ? "border-[var(--color-error)]/40 bg-[var(--color-error-soft)]"
                        : "border-[var(--color-green)]/40 bg-[var(--color-green-soft)]"
                    }`}
                  >
                    {teamFeedback.text}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-[1fr_13rem_auto] gap-3 items-end">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="invite-cal-member-identifier"
                      className="text-xs font-semibold"
                    >
                      Email atau @username
                    </Label>
                    <Input
                      id="invite-cal-member-identifier"
                      value={inviteIdentifier}
                      onChange={(e) => setInviteIdentifier(e.target.value)}
                      placeholder="teman@domain.id atau @username"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      required
                      className="min-h-11 bg-[var(--color-paper)] text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="invite-cal-member-role"
                      className="text-xs font-semibold"
                    >
                      Peran
                    </Label>
                    <div className="relative">
                      <select
                        id="invite-cal-member-role"
                        value={effectiveInviteRole}
                        onChange={(e) =>
                          setInviteRole(
                            e.target.value as CalendarManageableRole,
                          )
                        }
                        className="appearance-none w-full h-11 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] pl-3 pr-9 py-2.5 text-xs leading-normal text-[var(--color-ink)] cursor-pointer"
                      >
                        {isOwner && (
                          <option value="admin">Host Pengelola (Admin)</option>
                        )}
                        <option value="checkin_staff">Petugas Check-in</option>
                        <option value="member">Anggota Biasa</option>
                      </select>
                      <ChevronDown
                        className="pointer-events-none size-4 text-[var(--color-muted)] absolute right-3 top-1/2 -translate-y-1/2"
                        aria-hidden="true"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={addMemberMutation.isPending}
                    className="min-h-11 px-5 text-xs font-semibold bg-[var(--color-accent)] text-[var(--color-accent-ink)] hover:brightness-95 cursor-pointer"
                  >
                    {addMemberMutation.isPending
                      ? "Menambahkan..."
                      : "Tambahkan"}
                  </Button>
                </div>
              </form>
            )}

            <div className="space-y-3">
              <h3 className="text-xs uppercase tracking-wider text-[var(--color-muted)] flex items-center gap-1.5 font-semibold">
                <Shield
                  className="size-3.5 text-[var(--color-accent)]"
                  aria-hidden="true"
                />
                <span>Pengurus Inti &amp; Tim Acara ({leaders.length})</span>
              </h3>
              {leaders.length === 0 ? (
                <p className="text-xs text-[var(--color-muted)] italic">
                  Belum ada data pengurus terdaftar.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {leaders.map((leader) => {
                    const isSelf = Boolean(
                      currentUserId && leader.userId === currentUserId,
                    );
                    const canManageTarget =
                      isManager &&
                      leader.role !== "owner" &&
                      !isSelf &&
                      (isOwner || leader.role !== "admin");
                    return (
                      <div
                        key={leader.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-4"
                      >
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          {leader.image ? (
                            <img
                              src={leader.image}
                              alt={leader.name}
                              className="size-11 rounded-full object-cover border border-[var(--color-rule)] shrink-0"
                            />
                          ) : (
                            <div className="size-11 rounded-full bg-[var(--color-paper-3)] text-[var(--color-ink)] font-serif font-bold text-sm flex items-center justify-center border border-[var(--color-rule)] shrink-0">
                              {leader.name.slice(0, 1)}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold truncate">
                              {leader.name}
                              {isSelf ? " (Anda)" : ""}
                            </div>
                            {leader.username && (
                              <div className="text-[11px] font-mono text-[var(--color-muted)] truncate">
                                @{leader.username}
                              </div>
                            )}
                            <div className="mt-1">
                              <span className="text-[11px] px-2 py-0.5 rounded-md border border-[var(--color-rule)] bg-[var(--color-paper)] font-medium">
                                {leader.role === "owner"
                                  ? "Pemilik Komunitas"
                                  : leader.role === "admin"
                                    ? "Host Pengelola (Admin)"
                                    : "Petugas Check-in"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {canManageTarget && (
                          <div className="flex items-center gap-2 shrink-0">
                            <select
                              aria-label={`Ubah peran ${leader.name}`}
                              value={leader.role}
                              disabled={updateMemberRoleMutation.isPending}
                              onChange={async (e) => {
                                setTeamFeedback(null);
                                try {
                                  await updateMemberRoleMutation.mutateAsync({
                                    memberId: leader.id,
                                    input: {
                                      role: e.target
                                        .value as CalendarManageableRole,
                                    },
                                  });
                                  setTeamFeedback({
                                    type: "success",
                                    text: `Peran ${leader.name} diperbarui.`,
                                  });
                                } catch (err) {
                                  setTeamFeedback({
                                    type: "error",
                                    text:
                                      err instanceof Error
                                        ? err.message
                                        : "Gagal memperbarui peran.",
                                  });
                                }
                              }}
                              className="h-11 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] px-2.5 text-xs text-[var(--color-ink)]"
                            >
                              {isOwner && (
                                <option value="admin">Host Pengelola</option>
                              )}
                              <option value="checkin_staff">Check-in</option>
                              <option value="member">Anggota</option>
                            </select>
                            <Button
                              type="button"
                              variant="outline"
                              disabled={removeMemberMutation.isPending}
                              aria-label={`Keluarkan ${leader.name}`}
                              onClick={async () => {
                                setTeamFeedback(null);
                                try {
                                  await removeMemberMutation.mutateAsync(
                                    leader.id,
                                  );
                                  setTeamFeedback({
                                    type: "success",
                                    text: `${leader.name} dikeluarkan dari komunitas.`,
                                  });
                                } catch (err) {
                                  setTeamFeedback({
                                    type: "error",
                                    text:
                                      err instanceof Error
                                        ? err.message
                                        : "Gagal mengeluarkan pengurus.",
                                  });
                                }
                              }}
                              className="min-h-11 min-w-11 px-2.5 text-[var(--color-error)] border-[var(--color-rule)] hover:bg-[var(--color-error-soft)] cursor-pointer"
                            >
                              <Trash2 className="size-4" aria-hidden="true" />
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
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
                      className="flex flex-col justify-between gap-3 rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-3.5"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {member.image ? (
                          <img
                            src={member.image}
                            alt={member.name}
                            className="size-10 rounded-full object-cover border border-[var(--color-rule)] shrink-0"
                          />
                        ) : (
                          <div className="size-10 rounded-full bg-[var(--color-paper-3)] text-[var(--color-ink)] font-serif font-bold text-xs flex items-center justify-center border border-[var(--color-rule)] shrink-0">
                            {member.name.slice(0, 1)}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold truncate">
                            {member.name}
                          </div>
                          <span className="text-[11px] text-[var(--color-muted)] block truncate">
                            {member.username ? `@${member.username} · ` : ""}
                            Bergabung{" "}
                            {new Date(member.createdAt).toLocaleDateString(
                              "id-ID",
                            )}
                          </span>
                        </div>
                      </div>

                      {isManager && member.userId !== currentUserId && (
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--color-rule)]">
                          <select
                            aria-label={`Ubah peran ${member.name}`}
                            value={member.role}
                            disabled={updateMemberRoleMutation.isPending}
                            onChange={async (e) => {
                              setTeamFeedback(null);
                              try {
                                await updateMemberRoleMutation.mutateAsync({
                                  memberId: member.id,
                                  input: {
                                    role: e.target
                                      .value as CalendarManageableRole,
                                  },
                                });
                                setTeamFeedback({
                                  type: "success",
                                  text: `Peran ${member.name} diperbarui.`,
                                });
                              } catch (err) {
                                setTeamFeedback({
                                  type: "error",
                                  text:
                                    err instanceof Error
                                      ? err.message
                                      : "Gagal mengubah peran anggota.",
                                });
                              }
                            }}
                            className="h-10 flex-1 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] px-2.5 text-xs text-[var(--color-ink)]"
                          >
                            <option value="member">Anggota</option>
                            <option value="checkin_staff">
                              Petugas Check-in
                            </option>
                            {isOwner && (
                              <option value="admin">Host Pengelola</option>
                            )}
                          </select>
                          <Button
                            type="button"
                            variant="outline"
                            disabled={removeMemberMutation.isPending}
                            aria-label={`Keluarkan ${member.name}`}
                            onClick={async () => {
                              setTeamFeedback(null);
                              try {
                                await removeMemberMutation.mutateAsync(
                                  member.id,
                                );
                                setTeamFeedback({
                                  type: "success",
                                  text: `${member.name} dikeluarkan dari komunitas.`,
                                });
                              } catch (err) {
                                setTeamFeedback({
                                  type: "error",
                                  text:
                                    err instanceof Error
                                      ? err.message
                                      : "Gagal mengeluarkan anggota.",
                                });
                              }
                            }}
                            className="min-h-10 min-w-10 px-2.5 text-[var(--color-error)] border-[var(--color-rule)] hover:bg-[var(--color-error-soft)] cursor-pointer"
                          >
                            <Trash2 className="size-3.5" aria-hidden="true" />
                          </Button>
                        </div>
                      )}
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
                    transaksi buku digital atau aktivasi langganan dari tautan
                    ini otomatis menyumbang komisi 10% ke kas komunitas.
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCopyAffiliateLink}
                  className="min-h-11 px-4 text-xs rounded-xl inline-flex items-center gap-1.5 cursor-pointer shrink-0 border-[var(--color-rule)]"
                >
                  {copiedAffiliateLink ? (
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
                    const isWithdrawal =
                      ledger.entryType === "payout_withdrawal";
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
      </div>

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
      {isManager && (
        <EditCommunityProfileDialog
          open={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          calendar={calendar}
        />
      )}
    </div>
  );
}
