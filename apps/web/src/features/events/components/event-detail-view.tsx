import * as React from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Lock,
  ExternalLink,
  Users,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Share2,
  ChevronRight,
  BookOpen,
  Film,
  Mail,
  Flag,
  Pencil,
  Trash2,
  Sparkles,
  Ticket,
  Video,
  Copy,
  Check,
  Info,
} from "lucide-react";
import type {
  CommunityEventDetailDto,
  CommunityEventSummaryDto,
} from "@starter/shared/types";
import { Button } from "@/components/ui/button";
import {
  useCancelRsvp,
  useDeleteEvent,
  useEventDetail,
  useReportEvent,
  useRsvpEvent,
} from "../hooks";
import { EventAttendeesDialog } from "./event-attendees-dialog";
import { EditEventDialog } from "./edit-event-dialog";

interface EventDetailViewProps {
  event: CommunityEventDetailDto | CommunityEventSummaryDto;
  isDrawer?: boolean;
}

export function EventDetailView({ event: initialEvent, isDrawer = false }: EventDetailViewProps) {
  const { data: fullDetail } = useEventDetail(initialEvent.slug);
  const event = fullDetail || initialEvent;
  const detail = event as Partial<CommunityEventDetailDto>;

  const [copiedTicket, setCopiedTicket] = React.useState(false);
  const [reportModalOpen, setReportModalOpen] = React.useState(false);
  const [reportReason, setReportReason] = React.useState("");
  const [reportSent, setReportSent] = React.useState(false);
  const [isAttendeesModalOpen, setIsAttendeesModalOpen] = React.useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);

  const rsvpMutation = useRsvpEvent(event.slug);
  const cancelRsvpMutation = useCancelRsvp(event.slug);
  const reportMutation = useReportEvent(event.slug);
  const deleteMutation = useDeleteEvent();

  const handleDeleteEvent = async () => {
    if (confirm("Apakah Anda yakin ingin membatalkan/menghapus acara ini secara permanen?")) {
      await deleteMutation.mutateAsync(event.slug);
      window.location.reload();
    }
  };

  const startDate = new Date(event.startsAt);
  const endDate = new Date(event.endsAt);

  const monthNames = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
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

  const dateShortMonth = monthNames[startDate.getMonth()].slice(0, 3).toUpperCase();
  const dayName = dayNames[startDate.getDay()];
  const dateFormatted = `${dayName}, ${startDate.getDate()} ${monthNames[startDate.getMonth()]}`;

  const formatTime = (d: Date) =>
    d.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).replace(".", ":");

  const timeFormatted = `${formatTime(startDate)} - ${formatTime(endDate)} WIB`;

  // Attendee names text (Luma Screenshots 5 & 8)
  const previews = event.attendeesPreview || [];
  const attendeeCount = event.attendeeCount || 0;
  let attendeeNamesText = "";
  if (previews.length > 0) {
    const firstTwo = previews.slice(0, 2).map((p) => p.name);
    const remaining = Math.max(0, attendeeCount - 2);
    if (remaining > 0) {
      attendeeNamesText = `${firstTwo.join(", ")} dan ${remaining} lainnya`;
    } else {
      attendeeNamesText = firstTwo.join(" dan ");
    }
  }

  const handleRsvp = async () => {
    try {
      await rsvpMutation.mutateAsync({});
    } catch {
      // handled by mutation error
    }
  };

  const handleCancelRsvp = async () => {
    if (confirm("Apakah Anda yakin ingin membatalkan pendaftaran acara ini?")) {
      await cancelRsvpMutation.mutateAsync();
    }
  };

  const handleSendReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportReason.trim()) return;
    await reportMutation.mutateAsync({ reason: reportReason.trim() });
    setReportSent(true);
    setTimeout(() => {
      setReportSent(false);
      setReportModalOpen(false);
      setReportReason("");
    }, 1500);
  };

  const googleMapsUrl =
    event.latitude && event.longitude
      ? `https://www.google.com/maps/search/?api=1&query=${event.latitude}%2C${event.longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${event.district || ""} ${event.city || "Jakarta"}`,
        )}`;

  const isFull = event.capacity !== null && event.capacity !== undefined && event.attendeeCount >= event.capacity;
  const isGoing = event.userRsvpStatus === "going";
  const isPending = event.userRsvpStatus === "pending_approval";
  const isWaitlisted = event.userRsvpStatus === "waitlisted";

  return (
    <div className="flex flex-col space-y-6 text-white text-xs">
      {/* 1:1 Aspect Ratio Banner Poster (Luma UI) */}
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-xl">
        <img
          src={event.coverUrl}
          alt={event.title}
          className="size-full object-cover"
        />
        {event.categoryTag && (
          <span className="absolute top-3 left-3 rounded-md bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white/90 backdrop-blur-xs border border-white/10">
            #{event.categoryTag}
          </span>
        )}
      </div>

      {/* Title & Host info */}
      <div className="space-y-2">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-snug">
          {event.title}
        </h1>

        <div className="flex items-center gap-2 text-white/70">
          <div className="flex size-5 items-center justify-center rounded-full bg-amber-500/20 text-amber-300 font-semibold text-[10px]">
            {event.calendarName[0]}
          </div>
          <span>
            Diselenggarakan oleh{" "}
            <strong className="text-white font-medium">{event.calendarName}</strong>
          </span>
        </div>
      </div>

      {/* Date & Time Row */}
      <div className="flex items-start gap-3.5 rounded-xl border border-white/10 bg-white/5 p-3.5">
        <div className="flex size-11 flex-col items-center justify-center rounded-lg border border-white/10 bg-white/10 text-center font-bold">
          <span className="text-[9px] uppercase tracking-wider text-white/60">
            {dateShortMonth}
          </span>
          <span className="text-base leading-none text-white">
            {startDate.getDate()}
          </span>
        </div>
        <div className="flex-1 space-y-0.5">
          <div className="font-semibold text-white text-sm">{dateFormatted}</div>
          <div className="text-white/60">{timeFormatted}</div>
        </div>
      </div>

      {/* Location Row (Luma Screenshot 4) */}
      <div className="flex items-start gap-3.5 rounded-xl border border-white/10 bg-white/5 p-3.5">
        <MapPin className="mt-0.5 size-5 shrink-0 text-amber-400" />
        <div className="flex-1 space-y-0.5">
          {event.isAddressHidden ? (
            <div>
              <div className="font-semibold text-white text-sm">
                Daftar untuk Melihat Alamat
              </div>
              <div className="text-white/60">
                {event.district ? `${event.district}, ` : ""}
                {event.city || "Jakarta"}
              </div>
            </div>
          ) : (
            <div>
              <div className="font-semibold text-white text-sm">
                {event.venueName || "Lokasi Acara"}
              </div>
              <div className="text-white/60">
                {event.venueAddress || `${event.district || ""}, ${event.city || ""}`}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dynamic Registration Box or Host Panel */}
      {event.canManage ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
              <Sparkles className="size-4" />
              <span>Panel Penyelenggara (Host)</span>
            </div>
            <span className="rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold">
              Tayang Publik
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-black/40 border border-white/10 p-2.5">
              <span className="text-[10px] text-white/50 block">Pendaftar</span>
              <span className="text-base font-bold text-white">
                {event.attendeeCount} Orang
              </span>
            </div>
            <div className="rounded-lg bg-black/40 border border-white/10 p-2.5">
              <span className="text-[10px] text-white/50 block">Kapasitas</span>
              <span className="text-base font-bold text-white">
                {event.capacity ? `${event.capacity} Kursi` : "Tak Terbatas"}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2 pt-1">
            <Button
              type="button"
              onClick={() => setIsAttendeesModalOpen(true)}
              className="w-full h-10 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs shadow-md cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Users className="size-4" />
              <span>Kelola Peserta & Persetujuan</span>
              {event.pendingRsvpCount !== undefined && event.pendingRsvpCount > 0 && (
                <span className="rounded-full bg-rose-600 px-1.5 py-0.2 text-[10px] font-bold text-white ml-1">
                  {event.pendingRsvpCount}
                </span>
              )}
            </Button>

            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditModalOpen(true)}
                className="border-white/20 text-white hover:bg-white/10 cursor-pointer text-xs"
              >
                <Pencil className="size-3.5 mr-1 text-white/70" />
                Edit Acara
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDeleteEvent}
                className="border-rose-500/30 text-rose-300 hover:bg-rose-500/20 hover:text-rose-200 cursor-pointer text-xs"
              >
                <Trash2 className="size-3.5 mr-1 text-rose-400" />
                Hapus Acara
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3.5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-white/50">
            Pendaftaran
          </div>

          {/* State 1: Already Registered */}
          {event.userRsvpStatus ? (
            <div className="space-y-3">
              <div
                className={`flex items-start gap-2 rounded-lg p-3 ${
                  isGoing
                    ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-200"
                    : isPending
                    ? "bg-amber-500/15 border border-amber-500/30 text-amber-200"
                    : "bg-blue-500/15 border border-blue-500/30 text-blue-200"
                }`}
              >
                <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">
                    {isGoing && "Pendaftaran Dikonfirmasi (Going)"}
                    {isPending && "Menunggu Persetujuan Host"}
                    {isWaitlisted && "Dalam Antrean Daftar Tunggu"}
                  </div>
                  <div className="text-[11px] opacity-80 mt-0.5">
                    {isGoing && "Tiket dan lokasi lengkap telah terbuka untuk Anda."}
                    {isPending && "Host akan meninjau pendaftaran Anda sebelum membuka alamat acara."}
                    {isWaitlisted && "Anda akan otomatis dipromosikan jika kursi tersedia."}
                  </div>
                </div>
              </div>

              {/* Detail Akses Khusus Peserta 'Going' */}
              {isGoing && (
                <>
                  {/* Kode Tiket Check-in */}
                  {detail.userRsvp?.checkinCode && (
                    <div className="rounded-xl border border-white/10 bg-black/40 p-3 space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="flex items-center gap-1.5 font-medium text-white/90">
                          <Ticket className="size-3.5 text-amber-400" />
                          Kode Tiket Check-in
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (detail.userRsvp?.checkinCode) {
                              navigator.clipboard.writeText(detail.userRsvp.checkinCode);
                              setCopiedTicket(true);
                              setTimeout(() => setCopiedTicket(false), 2000);
                            }
                          }}
                          className="flex items-center gap-1 text-[10px] text-amber-300 hover:text-amber-200 transition-colors"
                        >
                          {copiedTicket ? (
                            <>
                              <Check className="size-3 text-emerald-400" />
                              <span className="text-emerald-300">Tersalin</span>
                            </>
                          ) : (
                            <>
                              <Copy className="size-3" />
                              <span>Salin Kode</span>
                            </>
                          )}
                        </button>
                      </div>
                      <div className="font-mono text-base font-bold tracking-widest text-amber-300 text-center py-2 bg-white/5 rounded-lg border border-white/5">
                        {detail.userRsvp.checkinCode}
                      </div>
                      <p className="text-[10px] text-white/40 text-center">
                        Tunjukkan kode tiket ini kepada host saat verifikasi kedatangan
                      </p>
                    </div>
                  )}

                  {/* Tautan Rapat Virtual */}
                  {detail.onlineMeetingUrl && (
                    <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3.5 space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-blue-300">
                        <span className="flex items-center gap-1.5">
                          <Video className="size-4 text-blue-400" />
                          Tautan Sesi Virtual
                        </span>
                      </div>
                      <a
                        href={detail.onlineMeetingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 py-2 px-3 text-xs font-semibold text-white transition-colors shadow-sm"
                      >
                        <span>Gabung Ruang Rapat</span>
                        <ExternalLink className="size-3.5" />
                      </a>
                      <p className="text-[10px] text-blue-200/60 truncate text-center">
                        {detail.onlineMeetingUrl}
                      </p>
                    </div>
                  )}

                  {/* Catatan Logistik Peserta */}
                  {detail.logisticsNotes && (
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5 space-y-1.5">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                        <Info className="size-3.5 text-amber-400 shrink-0" />
                        Catatan Logistik & Ketentuan Peserta
                      </span>
                      <p className="text-xs text-white/80 leading-relaxed whitespace-pre-line">
                        {detail.logisticsNotes}
                      </p>
                    </div>
                  )}
                </>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={cancelRsvpMutation.isPending}
                onClick={handleCancelRsvp}
                className="w-full border-white/20 text-white/70 hover:bg-white/10 hover:text-white"
              >
                {cancelRsvpMutation.isPending ? "Membatalkan..." : "Batalkan Pendaftaran"}
              </Button>
            </div>
          ) : event.requiresApproval ? (
            /* State 2: Requires Approval (Screenshot 4) */
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-white/80">
                <Lock className="size-4 text-amber-400" />
                <div>
                  <div className="font-semibold text-white">Persetujuan Diperlukan</div>
                  <div className="text-[11px] text-white/50">
                    Pendaftaran Anda memerlukan persetujuan host.
                  </div>
                </div>
              </div>

              <p className="text-white/70 text-[11px]">
                Silakan klik tombol di bawah untuk meminta akses bergabung ke acara ini.
              </p>

              <Button
                type="button"
                disabled={rsvpMutation.isPending}
                onClick={handleRsvp}
                className="w-full h-11 rounded-xl bg-white text-black font-semibold hover:bg-white/90 text-sm shadow-lg cursor-pointer"
              >
                {rsvpMutation.isPending ? "Mengirim Permintaan..." : "Minta untuk Bergabung"}
              </Button>
            </div>
          ) : isFull && event.allowWaitlist ? (
            /* State 3: Full Capacity -> Waitlist (Screenshot 6) */
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-amber-300">
                <Users className="size-4 text-amber-400" />
                <div>
                  <div className="font-semibold text-white">Acara Penuh</div>
                  <div className="text-[11px] text-white/50">
                    Kapasitas kursi penuh. Anda dapat bergabung dengan daftar tunggu.
                  </div>
                </div>
              </div>

              <p className="text-white/70 text-[11px]">
                Klik tombol di bawah untuk bergabung dengan daftar tunggu. Anda akan otomatis masuk jika tempat tambahan tersedia.
              </p>

              <Button
                type="button"
                disabled={rsvpMutation.isPending}
                onClick={handleRsvp}
                className="w-full h-11 rounded-xl bg-white text-black font-semibold hover:bg-white/90 text-sm shadow-lg cursor-pointer"
              >
                {rsvpMutation.isPending ? "Memproses..." : "Daftar Tunggu"}
              </Button>
            </div>
          ) : (
            /* State 4: Standard Open Registration */
            <div className="space-y-3">
              <Button
                type="button"
                disabled={rsvpMutation.isPending}
                onClick={handleRsvp}
                className="w-full h-11 rounded-xl bg-white text-black font-semibold hover:bg-white/90 text-sm shadow-lg cursor-pointer"
              >
                {rsvpMutation.isPending ? "Mendaftar..." : "Daftar Acara"}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Featured Work / Linked Book (if available) */}
      {(event.bookSummary || event.featuredWork) && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-white/50 flex items-center gap-1.5">
            {event.featuredWork?.mediaType === "film" ? (
              <Film className="size-3.5 text-blue-400" />
            ) : (
              <BookOpen className="size-3.5 text-amber-400" />
            )}
            <span>Membahas Karya Ini</span>
          </div>

          {event.bookSummary ? (
            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-3">
                <img
                  src={event.bookSummary.coverUrl}
                  alt={event.bookSummary.title}
                  className="h-14 w-10 rounded object-cover shadow border border-white/10"
                />
                <div>
                  <div className="font-semibold text-white">{event.bookSummary.title}</div>
                  <div className="text-white/50">{event.bookSummary.author}</div>
                </div>
              </div>
              <a
                href={`/read/${event.bookSummary.slug}`}
                className="rounded-lg bg-amber-400/20 px-3 py-1.5 font-medium text-amber-300 hover:bg-amber-400/30 transition-colors"
              >
                Baca Sampel ↗
              </a>
            </div>
          ) : (
            <div className="pt-1 space-y-1">
              <div className="font-semibold text-white">{event.featuredWork?.title}</div>
              {event.featuredWork?.creator && (
                <div className="text-white/50">{event.featuredWork.creator}</div>
              )}
              {event.featuredWork?.externalUrl && (
                <a
                  href={event.featuredWork.externalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-amber-300 hover:underline pt-1"
                >
                  Buka Tautan Karya ↗
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {/* Description / "Tentang Acara" */}
      <div className="space-y-2.5">
        <h2 className="text-sm font-semibold text-white uppercase tracking-wider text-white/50">
          Tentang Acara
        </h2>
        <div className="prose prose-invert prose-xs text-white/80 whitespace-pre-line leading-relaxed">
          {event.description}
        </div>
      </div>

      {/* "Lokasi - Cara Menuju Venue" with Map & Maps ↗ button (Screenshots 5 & 8) */}
      <div className="space-y-2.5">
        <h2 className="text-sm font-semibold text-white uppercase tracking-wider text-white/50">
          Lokasi
        </h2>
        {event.isAddressHidden ? (
          <p className="text-white/70">
            Harap mendaftar untuk melihat lokasi tepat acara ini.
            <br />
            <span className="text-white/50">
              {event.district ? `${event.district}, ` : ""}
              {event.city || "Jakarta"}
            </span>
          </p>
        ) : (
          <div className="text-white/80 space-y-1">
            <div className="font-semibold text-white">{event.venueName}</div>
            <div className="text-white/60">{event.venueAddress}</div>
          </div>
        )}

        {/* Map Preview Box with Maps ↗ Overlay (Luma Screenshot 5 & 8) */}
        <div className="relative h-44 w-full overflow-hidden rounded-xl border border-white/10 bg-[#161a22]">
          {/* Simulated OpenStreetMap Vector Background */}
          <svg className="absolute inset-0 size-full stroke-white/5 [stroke-width:1]">
            <pattern id="detail-grid" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" />
            </pattern>
            <rect width="100%" height="100%" fill="url(#detail-grid)" />
            <path d="M 0 90 Q 150 70, 400 120" stroke="#25354d" strokeWidth="8" fill="none" />
            <path d="M 180 0 L 210 200" stroke="#1f2c3e" strokeWidth="6" fill="none" />
          </svg>

          {/* Map Pin */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
            <div className="size-4 rounded-full border-2 border-white bg-red-500 shadow-lg animate-bounce" />
            <span className="mt-1 rounded bg-black/80 px-1.5 py-0.5 text-[10px] text-white">
              {event.isAddressHidden ? event.city || "Jakarta" : event.venueName || "Venue"}
            </span>
          </div>

          {/* Overlay Button "Maps ↗" (Luma Screenshot 5 & 8) */}
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noreferrer"
            className="absolute top-3 left-3 flex items-center gap-1.5 rounded-lg border border-white/20 bg-black/75 px-3 py-1.5 text-xs font-semibold text-white shadow-lg backdrop-blur-xs hover:bg-black transition-colors"
          >
            Maps ↗
          </a>
        </div>
      </div>

      {/* Diselenggarakan Oleh (Screenshot 5 & 8) */}
      <div className="space-y-2.5 border-t border-white/10 pt-4">
        <h2 className="text-sm font-semibold text-white uppercase tracking-wider text-white/50">
          Diselenggarakan Oleh
        </h2>
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-full bg-amber-500/20 text-amber-300 font-bold text-sm">
            {event.calendarName[0]}
          </div>
          <div>
            <div className="font-semibold text-white">{event.calendarName}</div>
            <div className="text-[11px] text-white/50">Komunitas Terverifikasi AnzaBook</div>
          </div>
        </div>

        {event.coHosts && event.coHosts.length > 0 && (
          <div className="mt-2 space-y-1.5 pl-2">
            {event.coHosts.map((ch, idx) => (
              <div key={idx} className="flex items-center gap-2 text-white/70">
                <span className="size-1.5 rounded-full bg-amber-400" />
                <span className="text-white">{ch.name}</span>
                {ch.roleLabel && (
                  <span className="text-[10px] text-white/40">({ch.roleLabel})</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Attendee Section "[N] Akan Pergi" (Luma Screenshots 5 & 8) */}
      <div className="space-y-2 border-t border-white/10 pt-4">
        <div className="font-semibold text-white text-sm">
          {attendeeCount} Akan Pergi
        </div>

        {previews.length > 0 && (
          <div className="space-y-1.5">
            {/* Overlapping Avatar Stack */}
            <div className="flex -space-x-2 overflow-hidden py-1">
              {previews.map((att, idx) => (
                <div
                  key={idx}
                  className="inline-block size-7 rounded-full ring-2 ring-[#121316] bg-amber-500/30 text-amber-200 text-[11px] font-bold flex items-center justify-center overflow-hidden"
                >
                  {att.image ? (
                    <img src={att.image} alt={att.name} className="size-full object-cover" />
                  ) : (
                    att.name[0]
                  )}
                </div>
              ))}
            </div>

            {/* Names string */}
            <div className="text-[11px] text-white/60">
              {attendeeNamesText}
            </div>
          </div>
        )}
      </div>

      {/* Footer Links & Category Pill (Screenshots 5 & 8) */}
      <div className="space-y-3 border-t border-white/10 pt-4 pb-2">
        <div className="flex flex-col gap-1.5 text-xs text-white/50">
          <a
            href={`mailto:${event.calendarName.toLowerCase().replace(/\s+/g, "")}@anzabook.com`}
            className="hover:text-white transition-colors"
          >
            Hubungi Penyelenggara
          </a>
          <button
            type="button"
            onClick={() => setReportModalOpen(true)}
            className="text-left text-white/40 hover:text-red-400 transition-colors"
          >
            Laporkan Acara
          </button>
        </div>

        {event.categoryTag && (
          <div className="pt-1">
            <span className="inline-block rounded-md bg-white/10 px-2.5 py-1 text-xs font-medium text-white/70">
              #{event.categoryTag}
            </span>
          </div>
        )}
      </div>

      {/* Report Modal */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-xl border border-white/15 bg-[#1a1b1f] p-5 text-white shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Flag className="size-4 text-red-400" />
                <h3 className="font-semibold text-sm">Laporkan Acara</h3>
              </div>
              <button
                type="button"
                onClick={() => setReportModalOpen(false)}
                className="text-white/40 hover:text-white"
              >
                ✕
              </button>
            </div>

            {reportSent ? (
              <div className="py-6 text-center text-emerald-400 space-y-1">
                <CheckCircle2 className="size-8 mx-auto" />
                <div className="font-semibold">Laporan Terkirim</div>
                <div className="text-[11px] text-white/60">
                  Tim kurator AnzaBook akan meninjau laporan Anda.
                </div>
              </div>
            ) : (
              <form onSubmit={handleSendReport} className="mt-3 space-y-3">
                <p className="text-[11px] text-white/70">
                  Sampaikan alasan pelaporan (misal: spam, konten tidak pantas, atau lokasi fiktif):
                </p>
                <textarea
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="Tuliskan detail laporan..."
                  rows={3}
                  className="w-full rounded-lg border border-white/10 bg-white/5 p-2.5 text-xs text-white placeholder-white/30 outline-none"
                  required
                />
                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => setReportModalOpen(false)}
                    className="border-white/20 text-white"
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    size="xs"
                    disabled={reportMutation.isPending}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    {reportMutation.isPending ? "Mengirim..." : "Kirim Laporan"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Host Management Modals */}
      {event.canManage && (
        <>
          <EventAttendeesDialog
            open={isAttendeesModalOpen}
            onClose={() => setIsAttendeesModalOpen(false)}
            eventSlug={event.slug}
            eventTitle={event.title}
          />
          <EditEventDialog
            open={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            event={event}
          />
        </>
      )}
    </div>
  );
}
