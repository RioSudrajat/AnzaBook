import * as React from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Plus,
  Users,
  Video,
  Sparkles,
  Search,
  Filter,
  X,
} from "lucide-react";
import type { CommunityEventSummaryDto } from "@starter/shared/types";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { useCalendars, useEvents } from "../hooks";
import { CreateEventDialog } from "./create-event-dialog";
import { EventDetailDrawer } from "./event-detail-drawer";
import { ApplyCalendarDialog } from "./apply-calendar-dialog";

export function DashboardEvents() {
  const [filterTab, setFilterTab] = React.useState<"upcoming" | "past" | "my_rsvps" | "hosting">("upcoming");
  const [selectedFormat, setSelectedFormat] = React.useState<"all" | "offline" | "online">("all");
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [selectedEventSlug, setSelectedEventSlug] = React.useState<string | null>(null);
  const [isHostGateOpen, setIsHostGateOpen] = React.useState(false);
  const [isApplyCalendarOpen, setIsApplyCalendarOpen] = React.useState(false);

  useBodyScrollLock(isHostGateOpen);

  const { data: session } = authClient.useSession();
  const { data: calendars = [] } = useCalendars();

  const canHostEvents = React.useMemo(() => {
    if (!session?.user) return false;
    const role = session.user.role;
    if (role === "admin" || role === "author" || role === "publisher") return true;
    return calendars.some((c) => c.isManager);
  }, [session, calendars]);

  const handleCreateClick = () => {
    if (!session?.user) {
      window.location.href = "/sign-in";
      return;
    }
    if (!canHostEvents) {
      setIsHostGateOpen(true);
      return;
    }
    setIsCreateOpen(true);
  };

  const { data: eventsData, isLoading } = useEvents({
    filter: filterTab,
    format: selectedFormat === "all" ? undefined : selectedFormat,
    limit: 50,
  });

  const events = eventsData?.data || [];

  // Group events by date string (e.g. "Besok Selasa", "12 Nov Kamis")
  const groupedEvents = React.useMemo(() => {
    const groups: { [key: string]: { label: string; date: Date; items: CommunityEventSummaryDto[] } } = {};

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "Mei",
      "Jun",
      "Jul",
      "Agu",
      "Sep",
      "Okt",
      "Nov",
      "Des",
    ];
    const dayNames = [
      "Minggu",
      "Senin",
      "Selasa",
      "Rabu",
      "Kamis",
      "Jumat",
      "Sabtu",
    ];

    for (const ev of events) {
      const d = new Date(ev.startsAt);
      const dayKey = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

      if (!groups[dayKey]) {
        const itemDate = new Date(d);
        itemDate.setHours(0, 0, 0, 0);

        let label = `${itemDate.getDate()} ${monthNames[itemDate.getMonth()]} ${dayNames[itemDate.getDay()]}`;
        if (itemDate.getTime() === today.getTime()) {
          label = `Hari Ini ${dayNames[itemDate.getDay()]}`;
        } else if (itemDate.getTime() === tomorrow.getTime()) {
          label = `Besok ${dayNames[itemDate.getDay()]}`;
        }

        groups[dayKey] = {
          label,
          date: itemDate,
          items: [],
        };
      }

      groups[dayKey].items.push(ev);
    }

    return Object.values(groups);
  }, [events]);

  const selectedEventIndex = events.findIndex((e) => e.slug === selectedEventSlug);
  const selectedEvent = selectedEventIndex >= 0 ? events[selectedEventIndex] : null;

  const handleNextEvent = () => {
    if (selectedEventIndex >= 0 && selectedEventIndex < events.length - 1) {
      setSelectedEventSlug(events[selectedEventIndex + 1].slug);
    }
  };

  const handlePrevEvent = () => {
    if (selectedEventIndex > 0) {
      setSelectedEventSlug(events[selectedEventIndex - 1].slug);
    }
  };

  const formatCardTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).replace(".", ".");
  };

  return (
    <div className="relative flex flex-col space-y-6">
      {/* Top Header & Actions Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <CalendarIcon className="size-6 text-amber-500" />
            Agenda Komunitas
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {filterTab === "hosting"
              ? "Kelola acara yang Anda selenggarakan, tinjau permohonan peserta, dan perbarui detail."
              : filterTab === "my_rsvps"
              ? "Daftar acara yang telah Anda daftarkan dan tiket masuk Anda."
              : filterTab === "past"
              ? "Arsip dan riwayat agenda komunitas yang telah selesai diselenggarakan."
              : "Temukan bedah buku, sesi diskusi film, temu literasi, dan ruang baca bersama."}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            size="sm"
            onClick={handleCreateClick}
            className="h-9 gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs shadow-sm cursor-pointer"
          >
            <Plus className="size-4" />
            Buat Acara
          </Button>
        </div>
      </div>

      {/* Filter Tabs Bar (Mendatang / Dikelola / Pendaftaran Saya / Terlewat) */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1 rounded-xl bg-muted/60 p-1">
          <button
            type="button"
            onClick={() => setFilterTab("upcoming")}
            className={`rounded-lg px-3 py-1.5 font-medium transition-colors cursor-pointer ${
              filterTab === "upcoming"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Acara Terdekat
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("hosting")}
            className={`rounded-lg px-3 py-1.5 font-medium transition-colors cursor-pointer ${
              filterTab === "hosting"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Dikelola Saya
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("my_rsvps")}
            className={`rounded-lg px-3 py-1.5 font-medium transition-colors cursor-pointer ${
              filterTab === "my_rsvps"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Pendaftaran Saya
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("past")}
            className={`rounded-lg px-3 py-1.5 font-medium transition-colors cursor-pointer ${
              filterTab === "past"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Riwayat Acara
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-[11px]">Format:</span>
          <select
            value={selectedFormat}
            onChange={(e) => setSelectedFormat(e.target.value as any)}
            className="rounded-lg border border-border/80 bg-background px-2.5 py-1 text-xs text-foreground outline-none cursor-pointer"
          >
            <option value="all">Semua Format</option>
            <option value="offline">Luring (Tatap Muka)</option>
            <option value="online">Daring (Virtual)</option>
          </select>
        </div>
      </div>

      {/* Main Chronological Timeline Feed matching Luma Screenshots 4, 6, 7 */}
      {isLoading ? (
        <div className="py-16 text-center text-muted-foreground text-xs space-y-2">
          <div className="size-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent mx-auto" />
          <p>Memuat timeline agenda komunitas...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground space-y-3">
          {filterTab === "hosting" && !session?.user ? (
            <>
              <Users className="size-10 text-muted-foreground/40 mx-auto" />
              <div className="space-y-1">
                <h3 className="font-semibold text-foreground text-sm">Masuk untuk Melihat Acara Kelolaan</h3>
                <p className="text-xs max-w-sm mx-auto">
                  Masuk ke akun AnzaBook untuk melihat dan mengelola acara yang Anda selenggarakan.
                </p>
              </div>
              <Button
                asChild
                size="sm"
                className="rounded-lg bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs cursor-pointer"
              >
                <a href="/sign-in">Masuk ke Akun</a>
              </Button>
            </>
          ) : filterTab === "hosting" ? (
            <>
              <Sparkles className="size-10 text-muted-foreground/40 mx-auto" />
              <div className="space-y-1">
                <h3 className="font-semibold text-foreground text-sm">Belum Ada Acara yang Anda Buat</h3>
                <p className="text-xs max-w-sm mx-auto">
                  Anda belum menyelenggarakan acara apa pun. Mulai buat agenda bedah buku atau temu literasi pertama Anda!
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={handleCreateClick}
                className="rounded-lg bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs cursor-pointer"
              >
                + Buat Acara Baru
              </Button>
            </>
          ) : filterTab === "my_rsvps" && !session?.user ? (
            <>
              <Users className="size-10 text-muted-foreground/40 mx-auto" />
              <div className="space-y-1">
                <h3 className="font-semibold text-foreground text-sm">Masuk untuk Melihat Pendaftaran</h3>
                <p className="text-xs max-w-sm mx-auto">
                  Masuk ke akun AnzaBook Anda untuk melihat daftar acara yang Anda ikuti dan status tiket Anda.
                </p>
              </div>
              <Button
                asChild
                size="sm"
                className="rounded-lg bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs cursor-pointer"
              >
                <a href="/sign-in">Masuk ke Akun</a>
              </Button>
            </>
          ) : filterTab === "my_rsvps" ? (
            <>
              <CalendarIcon className="size-10 text-muted-foreground/40 mx-auto" />
              <div className="space-y-1">
                <h3 className="font-semibold text-foreground text-sm">Belum Ada Pendaftaran Acara</h3>
                <p className="text-xs max-w-sm mx-auto">
                  Anda belum mendaftar di acara mana pun. Temukan acara menarik di &quot;Acara Terdekat&quot; dan daftarkan diri Anda!
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => setFilterTab("upcoming")}
                className="rounded-lg bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs cursor-pointer"
              >
                Jelajahi Acara Terdekat
              </Button>
            </>
          ) : filterTab === "past" ? (
            <>
              <CalendarIcon className="size-10 text-muted-foreground/40 mx-auto" />
              <div className="space-y-1">
                <h3 className="font-semibold text-foreground text-sm">Belum Ada Riwayat Acara</h3>
                <p className="text-xs max-w-sm mx-auto">
                  Belum ada agenda komunitas yang telah berakhir.
                </p>
              </div>
            </>
          ) : (
            <>
              <CalendarIcon className="size-10 text-muted-foreground/40 mx-auto" />
              <div className="space-y-1">
                <h3 className="font-semibold text-foreground text-sm">Belum Ada Acara Terdekat</h3>
                <p className="text-xs max-w-sm mx-auto">
                  Jadilah yang pertama membuat agenda bedah buku atau temu literasi di komunitas!
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={handleCreateClick}
                className="rounded-lg bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs cursor-pointer"
              >
                + Buat Acara Baru
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-8 max-w-3xl">
          {groupedEvents.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-3">
              {/* Date Group Header with dot (Luma UI: e.g. "• Besok Selasa", "• 12 Nov Kamis") */}
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <span className="size-1.5 rounded-full bg-amber-500" />
                <span>{group.label}</span>
              </div>

              {/* Event Cards Stack */}
              <div className="space-y-2.5">
                {group.items.map((ev) => {
                  const isSelected = ev.slug === selectedEventSlug;
                  const isFull = ev.capacity !== null && ev.capacity !== undefined && ev.attendeeCount >= ev.capacity;

                  return (
                    <article
                      key={ev.id}
                      onClick={() => setSelectedEventSlug(ev.slug)}
                      className={`group relative flex cursor-pointer items-stretch justify-between gap-4 rounded-2xl border p-4 transition-all duration-200 ${
                        isSelected
                          ? "border-amber-500/80 bg-amber-500/5 shadow-md"
                          : "border-border/70 bg-card hover:border-border hover:bg-muted/40"
                      }`}
                    >
                      {/* Left & Center Information */}
                      <div className="flex-1 space-y-1.5 pr-2">
                        {/* Time */}
                        <div className="text-xs font-medium text-muted-foreground">
                          {formatCardTime(ev.startsAt)}
                        </div>

                        {/* Event Title */}
                        <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground group-hover:text-amber-500 transition-colors leading-snug">
                          {ev.title}
                        </h2>

                        {/* Host Line */}
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                          <span className="text-[11px]">Oleh</span>
                          <span className="font-medium text-foreground truncate">
                            {ev.calendarName}
                          </span>
                          {ev.coHosts && ev.coHosts.length > 0 && (
                            <span className="text-muted-foreground/60 text-[11px]">
                              & {ev.coHosts.length} lainnya
                            </span>
                          )}
                        </div>

                        {/* Location Line */}
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground/80 truncate pt-0.5">
                          {ev.format === "online" ? (
                            <Video className="size-3.5 shrink-0 text-blue-400" />
                          ) : (
                            <MapPin className="size-3.5 shrink-0 text-amber-500" />
                          )}
                          <span className="truncate">
                            {ev.isAddressHidden
                              ? `${ev.district ? `${ev.district}, ` : ""}${ev.city || "Jakarta"}`
                              : ev.venueName || (ev.format === "online" ? "Daring via Tautan Virtual" : "Lokasi Acara")}
                          </span>
                        </div>

                        {/* Footer Badges & Attendee Preview */}
                        <div className="flex flex-wrap items-center gap-2 pt-1.5">
                          {/* Host Manager Badge */}
                          {ev.canManage && (
                            <span className="rounded-md bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-semibold text-amber-400 flex items-center gap-1">
                              <Sparkles className="size-3" />
                              Host
                            </span>
                          )}

                          {/* Pending Requests Badge */}
                          {ev.pendingRsvpCount !== undefined && ev.pendingRsvpCount > 0 && (
                            <span className="rounded-md bg-rose-500/20 border border-rose-500/30 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
                              {ev.pendingRsvpCount} Permintaan
                            </span>
                          )}

                          {/* Waitlist Badge (Luma Screenshot 4) */}
                          {isFull && (
                            <span className="rounded-md bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                              Daftar Tunggu
                            </span>
                          )}

                          {/* Approval Required Badge */}
                          {ev.requiresApproval && (
                            <span className="rounded-md bg-zinc-500/15 border border-zinc-500/30 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
                              Perlu Persetujuan
                            </span>
                          )}

                          {/* User RSVP status badge */}
                          {ev.userRsvpStatus && (
                            <span className="rounded-md bg-emerald-500/20 text-emerald-400 px-2 py-0.5 text-[10px] font-semibold">
                              {ev.userRsvpStatus === "going"
                                ? "Terdaftar ✓"
                                : ev.userRsvpStatus === "pending_approval"
                                ? "Menunggu Persetujuan"
                                : "Daftar Tunggu"}
                            </span>
                          )}

                          {/* Attendee Avatar Stack (Luma Screenshot 4) */}
                          {ev.attendeeCount > 0 && (
                            <div className="flex items-center gap-1 text-[11px] text-muted-foreground ml-auto">
                              <Users className="size-3 text-muted-foreground/70" />
                              <span>{ev.attendeeCount}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right 1:1 Aspect Ratio Thumbnail (Luma UI) */}
                      <div className="relative aspect-square w-24 sm:w-28 shrink-0 overflow-hidden rounded-xl border border-border/50 bg-muted shadow-xs self-center">
                        <img
                          src={ev.coverUrl}
                          alt={ev.title}
                          className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Slide-over Detail Drawer (Right side, matching Luma Screenshot 4–8) */}
      <EventDetailDrawer
        open={Boolean(selectedEventSlug)}
        onClose={() => setSelectedEventSlug(null)}
        event={selectedEvent}
        onNextEvent={handleNextEvent}
        onPrevEvent={handlePrevEvent}
        hasNextEvent={selectedEventIndex >= 0 && selectedEventIndex < events.length - 1}
        hasPrevEvent={selectedEventIndex > 0}
      />

      {/* Create Event Dialog Studio */}
      <CreateEventDialog
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={(slug) => {
          setFilterTab("upcoming");
          setSelectedEventSlug(slug);
        }}
      />

      {/* Host Access Gate Dialog */}
      {isHostGateOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs animate-in fade-in duration-200 select-none"
          style={{ overscrollBehavior: "contain" }}
        >
          <div
            data-lenis-prevent
            className="relative flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#16171b] p-6 text-white shadow-2xl"
            style={{ overscrollBehavior: "contain" }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                <Sparkles className="size-5" />
              </div>
              <button
                type="button"
                onClick={() => setIsHostGateOpen(false)}
                className="flex size-8 items-center justify-center rounded-full text-white/50 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <h3 className="text-base font-bold text-white mb-1">
              Akses Penyelenggara Acara
            </h3>
            <p className="text-xs text-white/60 leading-relaxed mb-6">
              Di AnzaBook, acara diselenggarakan oleh <strong>Komunitas Baca, TBM, Penulis,</strong> atau <strong>Penerbit</strong> terverifikasi untuk menjaga linimasa tetap berkualitas dan bebas spam.
              <br /><br />
              Apakah Anda mengelola komunitas literasi atau seorang penulis? Ajukan kalender komunitas Anda sekarang untuk mulai menyelenggarakan acara.
            </p>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsHostGateOpen(false);
                  setIsApplyCalendarOpen(true);
                }}
                className="w-full rounded-xl bg-amber-500 hover:bg-amber-400 py-2.5 text-xs font-semibold text-black transition-colors cursor-pointer text-center"
              >
                Ajukan Kalender Komunitas
              </button>
              <button
                type="button"
                onClick={() => setIsHostGateOpen(false)}
                className="w-full rounded-xl border border-white/10 hover:bg-white/10 py-2 text-xs font-medium text-white/70 transition-colors cursor-pointer text-center"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Apply Calendar Dialog */}
      <ApplyCalendarDialog
        open={isApplyCalendarOpen}
        onClose={() => setIsApplyCalendarOpen(false)}
        onSuccess={() => {
          setIsApplyCalendarOpen(false);
          setIsCreateOpen(true);
        }}
      />
    </div>
  );
}
