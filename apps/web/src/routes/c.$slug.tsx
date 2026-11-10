import * as React from "react";
import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Check,
  CheckCircle,
  Coins,
  Copy,
  Plus,
  Share2,
  Shield,
  TrendingUp,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import {
  useCalendar,
  useCalendarMembers,
  useCommunityWallet,
  useEvents,
  useJoinCalendar,
  useLeaveCalendar,
  useToggleFollowCalendar,
} from "@/features/events/hooks";
import {
  calendarDetailQuery,
  eventsQuery,
} from "@/features/events/queries";
import { EventDetailDrawer } from "@/features/events/components/event-detail-drawer";
import { CreateEventDialog } from "@/features/events/components/create-event-dialog";

export const Route = createFileRoute("/c/$slug")({
  loader: async ({ context, params }) => {
    try {
      const calendar = await context.queryClient.ensureQueryData(
        calendarDetailQuery(params.slug),
      );
      await context.queryClient.ensureQueryData(
        eventsQuery({ calendarSlug: params.slug }),
      );
      return { calendar };
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) throw notFound();
      throw error;
    }
  },
  head: ({ loaderData }) => {
    const title = loaderData?.calendar?.name
      ? `${loaderData.calendar.name} | Kalender Komunitas AnzaBook`
      : "Kalender Komunitas | AnzaBook";
    return { meta: [{ title }] };
  },
  component: CalendarHubPage,
});

function formatIdr(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function CalendarHubPage() {
  const { slug } = Route.useParams();
  const { data: calendar } = useCalendar(slug);
  const { data: eventsData } = useEvents({ calendarSlug: slug });
  const toggleFollowMutation = useToggleFollowCalendar(slug);
  const joinMutation = useJoinCalendar(slug);
  const leaveMutation = useLeaveCalendar(slug);

  const [activeTab, setActiveTab] = React.useState<"agenda" | "anggota" | "kas">("agenda");
  const [selectedEventSlug, setSelectedEventSlug] = React.useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [copiedAffiliate, setCopiedAffiliate] = React.useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = React.useState(false);

  const isManager = Boolean(
    calendar?.isManager ||
      calendar?.memberRole === "owner" ||
      calendar?.memberRole === "admin",
  );

  const { data: members = [] } = useCalendarMembers(slug);
  const { data: wallet } = useCommunityWallet(slug);

  if (!calendar) return null;

  const events = eventsData?.data || [];
  const selectedEvent = events.find((e) => e.slug === selectedEventSlug) || null;

  const handleCopyAffiliate = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const affiliateUrl = `${origin}/c/${slug}?ref=cal_${slug}`;
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(affiliateUrl);
      setCopiedAffiliate(true);
      setTimeout(() => setCopiedAffiliate(false), 3000);
    }
  };

  const leaders = members.filter((m) => m.role === "owner" || m.role === "admin");
  const regularMembers = members.filter(
    (m) => m.role === "member" || m.role === "checkin_staff",
  );

  return (
    <div className="min-h-screen bg-[#0e0f12] text-white flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0e0f12]/90 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <Link
          to="/app"
          search={{ tab: "events" }}
          className="flex items-center gap-2 text-xs font-medium text-white/70 hover:text-white transition-colors"
        >
          <ArrowLeft className="size-4" />
          <span>Kembali ke Agenda</span>
        </Link>

        <Link
          to="/app"
          search={{ tab: "home" }}
          className="flex items-center gap-2 text-xs font-semibold text-white"
        >
          <img src="/icon.svg" alt="AnzaBook" className="size-6 rounded" />
          <span>AnzaBook</span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 sm:py-12 space-y-8">
        {/* Calendar Profile Banner & Actions */}
        <div className="relative rounded-2xl border border-white/10 bg-[#16171b] p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-300 font-bold text-2xl border border-amber-500/30">
                {calendar.name[0]}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold text-white">
                    {calendar.name}
                  </h1>
                  {calendar.verificationStatus === "verified" && (
                    <CheckCircle className="size-5 text-amber-400" />
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-white/50">
                  <span>{calendar.city || "Indonesia"}</span>
                  <span>•</span>
                  <span>{calendar.followerCount} Pengikut</span>
                  {calendar.isMember && (
                    <>
                      <span>•</span>
                      <span className="text-amber-400 font-medium font-mono">
                        {calendar.memberRole === "owner"
                          ? "Pemilik Komunitas"
                          : calendar.memberRole === "admin"
                            ? "Pengurus"
                            : "Anggota Terdaftar"}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons Row */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Salin Link Afiliasi 10% */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyAffiliate}
                className="rounded-lg border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-medium text-xs gap-1.5"
              >
                {copiedAffiliate ? (
                  <>
                    <Check className="size-3.5 text-emerald-400" />
                    <span>Link 10% Disalin!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="size-3.5" />
                    <span>Salin Link Afiliasi 10%</span>
                  </>
                )}
              </Button>

              {/* Gabung / Keluar Komunitas */}
              {calendar.isMember ? (
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
                      className="rounded-lg text-xs h-8"
                    >
                      Konfirmasi Keluar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setShowLeaveConfirm(false)}
                      className="rounded-lg border-white/20 text-xs h-8 text-white/70"
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
                    className="rounded-lg border-white/20 bg-white/5 text-white/80 hover:bg-red-500/20 hover:text-red-300 text-xs"
                  >
                    <UserCheck className="size-3.5 mr-1 text-emerald-400" />
                    Anggota Komunitas ✓
                  </Button>
                )
              ) : (
                <Button
                  type="button"
                  size="sm"
                  disabled={joinMutation.isPending}
                  onClick={() => joinMutation.mutate()}
                  className="rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs"
                >
                  <UserPlus className="size-3.5 mr-1" />
                  Gabung Komunitas
                </Button>
              )}

              {/* Follow / Unfollow */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={toggleFollowMutation.isPending}
                onClick={() => toggleFollowMutation.mutate()}
                className={`rounded-lg border text-xs font-medium ${
                  calendar.isFollowing
                    ? "border-white/20 bg-white/10 text-white"
                    : "border-white/30 bg-white text-black hover:bg-white/90"
                }`}
              >
                {calendar.isFollowing ? "Mengikuti ✓" : "Ikuti Kalender"}
              </Button>

              {/* Buat Acara (Leader Only) */}
              {calendar.isManager && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setIsCreateOpen(true)}
                  className="rounded-lg bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs"
                >
                  <Plus className="size-4 mr-1" />
                  Buat Acara
                </Button>
              )}
            </div>
          </div>

          {calendar.description && (
            <p className="text-xs text-white/70 max-w-2xl leading-relaxed">
              {calendar.description}
            </p>
          )}

          {/* Affiliate info pill */}
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-amber-200">
              <Coins className="size-4 text-amber-400 shrink-0" />
              <span>
                Kas Afiliasi 10%: Bagikan link kalender komunitas ini. Setiap pembelian naskah atau keanggotaan Nakama via tautan kalender akan menyetorkan 10% komisi kas.
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopyAffiliate}
              className="text-amber-400 font-mono hover:underline inline-flex items-center gap-1 shrink-0"
            >
              <Copy className="size-3" />
              <span>/c/{slug}?ref=cal_{slug}</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation: Agenda, Pengurus & Anggota, Kas Komunitas */}
        <div className="flex items-center gap-2 border-b border-white/10 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab("agenda")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeTab === "agenda"
                ? "bg-white/10 text-white font-semibold"
                : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            <CalendarIcon className="size-3.5 text-amber-400" />
            <span>Agenda Mendatang ({events.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("anggota")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeTab === "anggota"
                ? "bg-white/10 text-white font-semibold"
                : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            <Users className="size-3.5 text-amber-400" />
            <span>Pengurus & Anggota ({members.length})</span>
          </button>

          {isManager && (
            <button
              type="button"
              onClick={() => setActiveTab("kas")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                activeTab === "kas"
                  ? "bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30"
                  : "text-white/60 hover:text-amber-300 hover:bg-white/5"
              }`}
            >
              <Wallet className="size-3.5 text-amber-400" />
              <span>Kelola & Kas Komunitas (10% Afiliasi)</span>
            </button>
          )}
        </div>

        {/* TAB 1: AGENDA ACARA */}
        {activeTab === "agenda" && (
          <div className="space-y-4">
            {events.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-xs text-white/50">
                Belum ada acara mendatang yang diterbitkan oleh kalender ini.
              </div>
            ) : (
              <div className="space-y-3">
                {events.map((ev) => (
                  <article
                    key={ev.id}
                    onClick={() => setSelectedEventSlug(ev.slug)}
                    className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#16171b] p-4 hover:border-white/25 hover:bg-white/5 transition-all"
                  >
                    <div className="space-y-1">
                      <div className="text-xs text-amber-400 font-medium">
                        {new Date(ev.startsAt).toLocaleDateString("id-ID", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        })}
                      </div>
                      <h3 className="text-sm font-semibold text-white">{ev.title}</h3>
                      <div className="text-xs text-white/50">
                        {ev.isAddressHidden ? ev.city : ev.venueName || "Lokasi Acara"}
                      </div>
                    </div>

                    <img
                      src={ev.coverUrl}
                      alt=""
                      className="size-16 rounded-lg object-cover border border-white/10 shrink-0"
                    />
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PENGURUS & ANGGOTA */}
        {activeTab === "anggota" && (
          <div className="space-y-8">
            {/* Pengurus Inti */}
            <div className="space-y-3">
              <h3 className="text-xs font-mono uppercase tracking-wider text-amber-400 flex items-center gap-1.5 font-semibold">
                <Shield className="size-3.5" />
                <span>Pengurus Inti Komunitas</span>
              </h3>
              {leaders.length === 0 ? (
                <p className="text-xs text-white/50 italic">
                  Belum ada data pengurus terdaftar.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {leaders.map((leader) => (
                    <div
                      key={leader.id}
                      className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#16171b] p-4"
                    >
                      {leader.image ? (
                        <img
                          src={leader.image}
                          alt={leader.name}
                          className="size-11 rounded-full object-cover border border-white/10"
                        />
                      ) : (
                        <div className="size-11 rounded-full bg-amber-500/20 text-amber-300 font-bold text-sm flex items-center justify-center border border-amber-500/30">
                          {leader.name.slice(0, 1)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-white truncate">
                          {leader.name}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium">
                            {leader.role === "owner" ? "Pemilik Komunitas" : "Admin / Pengurus"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Anggota Komunitas */}
            <div className="space-y-3 pt-4 border-t border-white/10">
              <h3 className="text-xs font-mono uppercase tracking-wider text-white/60 flex items-center gap-1.5 font-semibold">
                <Users className="size-3.5" />
                <span>Anggota Komunitas ({regularMembers.length})</span>
              </h3>
              {regularMembers.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-xs text-white/50">
                  Belum ada anggota umum yang bergabung. Jadilah anggota pertama dengan menekan tombol "Gabung Komunitas"!
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {regularMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#16171b] p-3.5"
                    >
                      {member.image ? (
                        <img
                          src={member.image}
                          alt={member.name}
                          className="size-10 rounded-full object-cover border border-white/10"
                        />
                      ) : (
                        <div className="size-10 rounded-full bg-white/10 text-white/80 font-bold text-xs flex items-center justify-center border border-white/10">
                          {member.name.slice(0, 1)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-white truncate">
                          {member.name}
                        </div>
                        <span className="text-[10px] font-mono text-white/40">
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

        {/* TAB 3: KAS KOMUNITAS (10% AFILIASI) */}
        {activeTab === "kas" && isManager && (
          <div className="space-y-6">
            {/* Wallet Overview Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Card 1: Saldo Kas */}
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-amber-300">
                  <span>Saldo Kas Aktif</span>
                  <Wallet className="size-4 text-amber-400" />
                </div>
                <div className="font-serif text-2xl font-bold text-white">
                  {formatIdr(wallet?.balanceIdr || 0)}
                </div>
                <p className="text-[11px] text-amber-200/70">
                  Dana tersedia untuk kegiatan komunitas & operasional.
                </p>
              </div>

              {/* Card 2: Afiliasi Nakama */}
              <div className="rounded-2xl border border-white/10 bg-[#16171b] p-5 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-white/50">
                  <span>Komisi Nakama 10%</span>
                  <Coins className="size-4 text-emerald-400" />
                </div>
                <div className="font-serif text-xl font-bold text-white">
                  {formatIdr(wallet?.totalAffiliateNakamaIdr || 0)}
                </div>
                <p className="text-[11px] text-white/40">
                  Dari langganan bulanan & tahunan anggota via referral.
                </p>
              </div>

              {/* Card 3: Komisi Buku Ala Carte */}
              <div className="rounded-2xl border border-white/10 bg-[#16171b] p-5 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-white/50">
                  <span>Komisi Buku 10%</span>
                  <TrendingUp className="size-4 text-sky-400" />
                </div>
                <div className="font-serif text-xl font-bold text-white">
                  {formatIdr(wallet?.totalAffiliateBookPurchasesIdr || 0)}
                </div>
                <p className="text-[11px] text-white/40">
                  Dari penjualan akses naskah digital B2B2C.
                </p>
              </div>

              {/* Card 4: Tiket & Payout */}
              <div className="rounded-2xl border border-white/10 bg-[#16171b] p-5 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-white/50">
                  <span>Tiket & Pencairan</span>
                  <Shield className="size-4 text-purple-400" />
                </div>
                <div className="font-serif text-xl font-bold text-white">
                  {formatIdr(wallet?.totalPaidEventTicketsIdr || 0)}
                </div>
                <p className="text-[11px] text-white/40">
                  Penarikan dana: {formatIdr(wallet?.totalPayoutsWithdrawnIdr || 0)}
                </p>
              </div>
            </div>

            {/* Mutasi Riwayat Ledgers Transparan */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Coins className="size-4 text-amber-400" />
                <span>Buku Kas & Riwayat Mutasi Transparan</span>
              </h3>

              {!wallet?.recentLedgers || wallet.recentLedgers.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-xs text-white/50">
                  Belum ada mutasi transaksi yang tercatat di kas kalender ini.
                </div>
              ) : (
                <div className="divide-y divide-white/10 rounded-xl border border-white/10 bg-[#16171b] overflow-hidden">
                  {wallet.recentLedgers.map((ledger) => {
                    const isWithdrawal = ledger.entryType === "payout_withdrawal";
                    return (
                      <div
                        key={ledger.id}
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded font-mono text-[10px] font-semibold ${
                                ledger.entryType === "affiliate_nakama"
                                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                  : ledger.entryType === "affiliate_book_purchase"
                                    ? "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                                    : ledger.entryType === "paid_event_ticket"
                                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                      : "bg-red-500/20 text-red-400 border border-red-500/30"
                              }`}
                            >
                              {ledger.entryType === "affiliate_nakama"
                                ? "Afiliasi Nakama 10%"
                                : ledger.entryType === "affiliate_book_purchase"
                                  ? "Afiliasi Buku 10%"
                                  : ledger.entryType === "paid_event_ticket"
                                    ? "Tiket Acara"
                                    : "Pencairan Kas"}
                            </span>
                            <span className="text-white/40 font-mono text-[11px]">
                              {new Date(ledger.createdAt).toLocaleString("id-ID", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}
                            </span>
                          </div>
                          <p className="text-white/80">{ledger.description}</p>
                        </div>

                        <div
                          className={`font-mono text-sm font-bold sm:text-right shrink-0 ${
                            isWithdrawal ? "text-red-400" : "text-emerald-400"
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
      </main>

      {/* Drawer */}
      <EventDetailDrawer
        open={Boolean(selectedEventSlug)}
        onClose={() => setSelectedEventSlug(null)}
        event={selectedEvent}
      />

      <CreateEventDialog
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={(eventSlug) => setSelectedEventSlug(eventSlug)}
      />

      {/* Footer */}
      <div className="border-t border-white/10 mt-12">
        <SiteFooter />
      </div>
    </div>
  );
}
