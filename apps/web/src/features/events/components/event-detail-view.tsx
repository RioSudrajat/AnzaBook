import * as React from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  Calendar as CalendarIcon,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Film,
  Flag,
  Info,
  Lock,
  MapPin,
  Navigation,
  Settings2,
  Share2,
  Ticket,
  Users,
  Video,
  X,
} from "lucide-react";
import type {
  CommunityEventDetailDto,
  CommunityEventSummaryDto,
} from "@starter/shared/types";
import {
  detectMeetingPlatform,
  getMeetingPlatformMeta,
  parseEventThemeSpec,
} from "@starter/shared/validators/community";
import { Button } from "@/components/ui/button";
import { BookCover } from "@/features/books/components/book-cover";
import { copyTextToClipboard } from "@/features/share/web-share";
import { authClient } from "@/lib/auth-client";
import { isUsableAssetUrl } from "@/lib/media-url";
import { safeExternalHref } from "@/lib/safe-url";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import {
  useCancelRsvp,
  useEventDetail,
  useReportEvent,
  useRsvpEvent,
} from "../hooks";
import type { EventShareMode, EventShareTemplate } from "../event-share";
import { EventDescriptionRenderer } from "./event-description-renderer";
import { EventShareDialog } from "./event-share-dialog";
import {
  EventAtmosphereBackdrop,
  resolveEventThemeVars,
} from "./event-theme-atmosphere";

interface EventDetailViewProps {
  event: CommunityEventDetailDto | CommunityEventSummaryDto;
  isDrawer?: boolean;
  isInsideAppShell?: boolean;
  currentUserName?: string | null;
}

const EVENT_TYPE_BADGES: Record<string, string> = {
  book_club: "Klub Buku",
  film_discussion: "Diskusi Film",
  silent_reading: "Silent Reading",
  book_launch: "Peluncuran Buku",
  writing_session: "Sesi Menulis",
  community_meetup: "Temu Komunitas",
};

export function EventDetailView({
  event: initialEvent,
  isInsideAppShell = false,
  currentUserName,
}: EventDetailViewProps) {
  const { data: fullDetail } = useEventDetail(initialEvent.slug);
  const { data: session } = authClient.useSession();
  const event = fullDetail || initialEvent;
  const detail = event as Partial<CommunityEventDetailDto>;
  const resolvedUserName =
    currentUserName?.trim() || session?.user?.name?.trim() || null;

  const [copiedTicket, setCopiedTicket] = React.useState(false);
  const [copiedLink, setCopiedLink] = React.useState(false);
  const [shareModalOpen, setShareModalOpen] = React.useState(false);
  const [sharePreset, setSharePreset] = React.useState<{
    template: EventShareTemplate;
    mode: EventShareMode;
  }>({
    template: "invitation_poster",
    mode: "invite",
  });
  const [confirmCancelRsvp, setConfirmCancelRsvp] = React.useState(false);
  const [reportModalOpen, setReportModalOpen] = React.useState(false);
  const [reportReason, setReportReason] = React.useState("");
  const [reportSent, setReportSent] = React.useState(false);
  const [rsvpError, setRsvpError] = React.useState<string | null>(null);

  const rsvpMutation = useRsvpEvent(event.slug);
  const cancelRsvpMutation = useCancelRsvp(event.slug);
  const reportMutation = useReportEvent(event.slug);

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

  const dateShortMonth = monthNames[startDate.getMonth()]
    .slice(0, 3)
    .toUpperCase();
  const dayName = dayNames[startDate.getDay()];
  const dateFormatted = `${dayName}, ${startDate.getDate()} ${monthNames[startDate.getMonth()]} ${startDate.getFullYear()}`;

  const formatTime = (d: Date) =>
    d
      .toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
      .replace(".", ":");

  const timeFormatted = `${formatTime(startDate)} - ${formatTime(endDate)} WIB`;

  const previews = event.attendeesPreview || [];
  const attendeeCount = event.attendeeCount || 0;
  let attendeeNamesText = "";
  if (previews.length > 0) {
    const firstTwo = previews.slice(0, 2).map((p) => p.name);
    const remaining = Math.max(0, attendeeCount - 2);
    attendeeNamesText =
      remaining > 0
        ? `${firstTwo.join(", ")} dan ${remaining} lainnya`
        : firstTwo.join(" dan ");
  }

  const handleRsvp = async () => {
    setRsvpError(null);
    try {
      await rsvpMutation.mutateAsync({});
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setRsvpError(apiErr?.message || "Gagal memproses pendaftaran acara.");
    }
  };

  const handleConfirmCancelRsvp = async () => {
    setRsvpError(null);
    try {
      await cancelRsvpMutation.mutateAsync();
      setConfirmCancelRsvp(false);
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setRsvpError(apiErr?.message || "Gagal membatalkan pendaftaran.");
    }
  };

  const copiedLinkTimerRef = React.useRef<number | null>(null);
  const copiedTicketTimerRef = React.useRef<number | null>(null);
  const reportCloseTimerRef = React.useRef<number | null>(null);

  useBodyScrollLock(reportModalOpen);

  React.useEffect(() => {
    if (!reportModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setReportModalOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [reportModalOpen]);

  React.useEffect(() => {
    return () => {
      if (copiedLinkTimerRef.current !== null) {
        window.clearTimeout(copiedLinkTimerRef.current);
      }
      if (copiedTicketTimerRef.current !== null) {
        window.clearTimeout(copiedTicketTimerRef.current);
      }
      if (reportCloseTimerRef.current !== null) {
        window.clearTimeout(reportCloseTimerRef.current);
      }
    };
  }, []);

  const handleCopyShareLink = async () => {
    const encodedSlug = encodeURIComponent(event.slug);
    const shareUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/events/${encodedSlug}`
        : `/events/${encodedSlug}`;
    const ok = await copyTextToClipboard(shareUrl);
    if (ok) {
      setCopiedLink(true);
      if (copiedLinkTimerRef.current !== null) {
        window.clearTimeout(copiedLinkTimerRef.current);
      }
      copiedLinkTimerRef.current = window.setTimeout(
        () => setCopiedLink(false),
        2200,
      );
    }
  };

  const openShareStudio = (
    template?: EventShareTemplate,
    mode?: EventShareMode,
  ) => {
    setSharePreset({
      template: template ?? (isGoing ? "attending_pass" : "invitation_poster"),
      mode: mode ?? (isGoing ? "attending" : "invite"),
    });
    setShareModalOpen(true);
  };

  const handleSendReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportReason.trim()) return;
    await reportMutation.mutateAsync({ reason: reportReason.trim() });
    setReportSent(true);
    if (reportCloseTimerRef.current !== null) {
      window.clearTimeout(reportCloseTimerRef.current);
    }
    reportCloseTimerRef.current = window.setTimeout(() => {
      setReportSent(false);
      setReportModalOpen(false);
      setReportReason("");
    }, 1400);
  };

  const hasExactCoords =
    typeof event.latitude === "number" &&
    Number.isFinite(event.latitude) &&
    typeof event.longitude === "number" &&
    Number.isFinite(event.longitude);
  const googleMapsUrl = hasExactCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${event.latitude},${event.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${event.venueName || ""} ${event.district || ""} ${event.city || "Jakarta"}`.trim(),
      )}`;

  const isFull =
    event.capacity !== null &&
    event.capacity !== undefined &&
    event.attendeeCount >= event.capacity;
  const isGoing = event.userRsvpStatus === "going";
  const isPending = event.userRsvpStatus === "pending_approval";
  const isWaitlisted = event.userRsvpStatus === "waitlisted";
  const isRejected = event.userRsvpStatus === "rejected";

  const eventTypeLabel =
    EVENT_TYPE_BADGES[event.eventType] || "Agenda Komunitas";
  const meetingPlatform =
    event.meetingPlatform ?? detectMeetingPlatform(detail.onlineMeetingUrl);
  const platformMeta = getMeetingPlatformMeta(meetingPlatform);
  const meetingHref = safeExternalHref(detail.onlineMeetingUrl);
  const themeSpec = React.useMemo(
    () => parseEventThemeSpec(event.themePreset),
    [event.themePreset],
  );
  const themeVars = resolveEventThemeVars(themeSpec);

  return (
    <div
      style={themeVars.pageContainerStyle}
      className={`@container relative overflow-hidden rounded-2xl sm:rounded-3xl border p-5 sm:p-7 lg:p-10 shadow-xs ${themeVars.darkClass}`}
    >
      <EventAtmosphereBackdrop spec={themeSpec} variant="page" />

      <div className="relative z-10 text-foreground">
        <header className="grid grid-cols-1 @2xl:grid-cols-[minmax(0,1fr)_240px] @4xl:grid-cols-[minmax(0,1fr)_280px] gap-6 @4xl:gap-10 items-start pb-8 border-b border-[var(--evt-border-subtle,var(--border))]">
          <div className="@container min-w-0 space-y-5 order-2 @2xl:order-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                style={themeVars.badgeStyle}
                className="rounded-lg border px-2.5 py-1 font-mono text-[11px] font-semibold"
              >
                {eventTypeLabel}
              </span>
              {event.categoryTag && (
                <span className="rounded-lg bg-[var(--color-accent-soft)] px-2.5 py-1 font-mono text-[11px] font-semibold text-foreground">
                  #{event.categoryTag}
                </span>
              )}
              <span
                style={themeVars.badgeStyle}
                className="rounded-lg border px-2.5 py-1 font-mono text-[11px] text-muted-foreground"
              >
                {event.format === "online"
                  ? "Daring"
                  : event.format === "hybrid"
                    ? "Hibrida"
                    : "Tatap Muka"}
              </span>
            </div>

            {isInsideAppShell ? (
              <h2
                style={{ fontFamily: themeVars.fontFamily }}
                className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-[-0.025em] text-foreground leading-[1.15]"
              >
                {event.title}
              </h2>
            ) : (
              <h1
                style={{ fontFamily: themeVars.fontFamily }}
                className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-[-0.025em] text-foreground leading-[1.15]"
              >
                {event.title}
              </h1>
            )}

            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>Diselenggarakan oleh</span>
              <Link
                to="/c/$slug"
                params={{ slug: event.calendarSlug }}
                style={themeVars.badgeStyle}
                className="inline-flex min-h-9 items-center gap-2 rounded-xl border px-3 py-1.5 font-semibold text-foreground hover:border-[var(--color-accent)] transition-colors"
              >
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-[10px] font-bold text-foreground">
                  {event.calendarName[0]}
                </span>
                <span>{event.calendarName}</span>
              </Link>
              {event.coHosts &&
                event.coHosts.map((ch, idx) => (
                  <span
                    key={`${ch.name}-${idx}`}
                    style={themeVars.badgeStyle}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs text-foreground"
                  >
                    {ch.avatarUrl ? (
                      <img
                        src={ch.avatarUrl}
                        alt={ch.name}
                        className="size-4 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-[9px] font-bold text-foreground">
                        {ch.name.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <span className="font-medium">{ch.name}</span>
                    {ch.roleLabel && (
                      <span className="text-muted-foreground">
                        · {ch.roleLabel}
                      </span>
                    )}
                  </span>
                ))}
            </div>

            <dl className="grid grid-cols-1 @lg:grid-cols-2 gap-3 pt-1 text-sm">
              <div
                style={themeVars.glassSurfaceStyle}
                className="evt-glass rounded-2xl border p-4 flex items-start gap-3.5"
              >
                <div
                  style={{
                    backgroundColor: "var(--evt-control-bg, var(--background))",
                    borderColor: "var(--evt-border-subtle, var(--border))",
                  }}
                  className="flex size-11 shrink-0 flex-col items-center justify-center rounded-xl border text-center font-mono"
                >
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                    {dateShortMonth}
                  </span>
                  <span className="text-sm font-bold leading-none text-foreground">
                    {startDate.getDate()}
                  </span>
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <dt className="sr-only">Tanggal dan Waktu</dt>
                  <dd className="font-serif text-sm font-bold text-foreground leading-snug">
                    {dateFormatted}
                  </dd>
                  <dd className="font-mono text-xs tabular-nums text-muted-foreground">
                    {timeFormatted}
                  </dd>
                </div>
              </div>

              {event.format !== "online" && (
                <div
                  style={themeVars.glassSurfaceStyle}
                  className="evt-glass rounded-2xl border p-4 flex items-start gap-3.5"
                >
                  <div
                    style={{
                      backgroundColor:
                        "var(--evt-control-bg, var(--background))",
                      borderColor: "var(--evt-border-subtle, var(--border))",
                    }}
                    className="flex size-11 shrink-0 items-center justify-center rounded-xl border"
                  >
                    <MapPin
                      className="size-4 text-[var(--color-accent)]"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <dt className="sr-only">Lokasi Tatap Muka</dt>
                    {event.isAddressHidden ? (
                      <>
                        <dd className="font-serif text-sm font-bold text-foreground leading-snug">
                          Alamat dibagikan setelah disetujui
                        </dd>
                        <dd className="text-xs text-muted-foreground">
                          {event.district ? `${event.district}, ` : ""}
                          {event.city || "Jakarta"}
                        </dd>
                      </>
                    ) : (
                      <>
                        <dd className="font-serif text-sm font-bold text-foreground leading-snug">
                          {event.venueName || "Lokasi Acara"}
                        </dd>
                        <dd className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                          {event.venueAddress ||
                            [event.district, event.city]
                              .filter(Boolean)
                              .join(", ") ||
                            "Lokasi ditentukan penyelenggara"}
                        </dd>
                        <dd className="pt-0.5">
                          <a
                            href={googleMapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="min-h-8 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-accent)] hover:underline"
                          >
                            <Navigation
                              className="size-3.5"
                              aria-hidden="true"
                            />
                            <span>Buka rute di Google Maps</span>
                            <ExternalLink
                              className="size-3"
                              aria-hidden="true"
                            />
                          </a>
                        </dd>
                      </>
                    )}
                  </div>
                </div>
              )}

              {(event.format === "online" || event.format === "hybrid") && (
                <div
                  style={themeVars.glassSurfaceStyle}
                  className={`evt-glass rounded-2xl border p-4 flex items-start gap-3.5 ${
                    event.format === "hybrid" ? "@lg:col-span-2" : ""
                  }`}
                >
                  <div
                    style={{
                      backgroundColor:
                        "var(--evt-control-bg, var(--background))",
                      borderColor: "var(--evt-border-subtle, var(--border))",
                    }}
                    className="flex size-11 shrink-0 items-center justify-center rounded-xl border"
                  >
                    <Video
                      className="size-4 text-[var(--color-water)]"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <dt className="sr-only">Ruang Rapat Virtual</dt>
                    <dd className="font-serif text-sm font-bold text-foreground leading-snug">
                      {platformMeta.label}
                    </dd>
                    {(isGoing || event.canManage) && meetingHref ? (
                      <dd className="pt-0.5">
                        <Button
                          asChild
                          variant="outline"
                          className="min-h-11 gap-2 border-[var(--color-water)]/40 bg-[var(--evt-control-bg,var(--background))] text-xs font-semibold text-foreground hover:border-[var(--color-accent)]"
                        >
                          <a
                            href={meetingHref}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Video
                              className="size-4 text-[var(--color-water)]"
                              aria-hidden="true"
                            />
                            <span>{platformMeta.ctaLabel}</span>
                            <ExternalLink
                              className="size-3.5"
                              aria-hidden="true"
                            />
                          </a>
                        </Button>
                      </dd>
                    ) : (
                      <dd className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Lock
                          className="size-3.5 shrink-0"
                          aria-hidden="true"
                        />
                        <span>
                          Tautan {platformMeta.label} terbuka otomatis setelah
                          pendaftaran terkonfirmasi.
                        </span>
                      </dd>
                    )}
                  </div>
                </div>
              )}
            </dl>
          </div>

          <div className="relative order-1 @2xl:order-2 w-full max-w-[260px] @2xl:max-w-none mx-auto">
            {isUsableAssetUrl(event.coverUrl) && (
              <img
                src={event.coverUrl}
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute inset-2 scale-105 rounded-2xl object-cover blur-2xl opacity-35"
              />
            )}
            <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-[var(--evt-border-subtle,var(--border))] bg-muted shadow-sm">
              {isUsableAssetUrl(event.coverUrl) && (
                <img
                  src={event.coverUrl}
                  alt={event.title}
                  className="size-full object-cover"
                />
              )}
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 @3xl:grid-cols-[minmax(0,1fr)_350px] gap-6 @3xl:gap-8 items-start pt-8">
          <div className="min-w-0 space-y-6">
            <section
              aria-labelledby="event-about-heading"
              style={themeVars.glassSurfaceStyle}
              className="evt-glass rounded-2xl border p-5 sm:p-7 space-y-4"
            >
              <h3
                id="event-about-heading"
                className="font-serif text-lg font-bold text-foreground border-b border-[var(--evt-border-subtle,var(--border))] pb-2.5"
              >
                Tentang Acara
              </h3>
              <EventDescriptionRenderer description={event.description} />
            </section>

            {(event.bookSummary || event.featuredWork) && (
              <section
                aria-label="Karya yang dibahas"
                style={themeVars.glassSurfaceStyle}
                className="evt-glass rounded-2xl border p-5 sm:p-6 space-y-3.5"
              >
                <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  {event.featuredWork?.mediaType === "film" ? (
                    <Film
                      className="size-4 text-[var(--color-water)]"
                      aria-hidden="true"
                    />
                  ) : (
                    <BookOpen
                      className="size-4 text-[var(--color-accent)]"
                      aria-hidden="true"
                    />
                  )}
                  <span>Membahas Karya Ini</span>
                </div>

                {event.bookSummary ? (
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <BookCover
                        book={event.bookSummary}
                        className="w-12 shrink-0"
                        decorative
                      />
                      <div className="min-w-0">
                        <div className="font-serif text-base font-bold text-foreground truncate">
                          {event.bookSummary.title}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {event.bookSummary.author}
                        </div>
                      </div>
                    </div>
                    <Link
                      to="/read/$slug"
                      params={{ slug: event.bookSummary.slug }}
                      style={{
                        backgroundColor:
                          "var(--evt-control-bg, var(--background))",
                        borderColor: "var(--evt-border-subtle, var(--border))",
                      }}
                      className="min-h-11 inline-flex items-center gap-1.5 rounded-xl border px-4 text-xs font-semibold text-foreground hover:border-[var(--color-accent)] transition-colors"
                    >
                      <span>Baca Sampel</span>
                      <ArrowRight className="size-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="font-serif text-base font-bold text-foreground">
                      {event.featuredWork?.title}
                    </div>
                    {event.featuredWork?.creator && (
                      <div className="text-xs text-muted-foreground">
                        {event.featuredWork.creator}
                      </div>
                    )}
                    {(() => {
                      const featuredHref = safeExternalHref(
                        event.featuredWork?.externalUrl,
                      );
                      return featuredHref ? (
                        <a
                          href={featuredHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-h-10 inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-accent)] hover:underline pt-1"
                        >
                          Buka Tautan Karya
                          <ExternalLink className="size-3" aria-hidden="true" />
                        </a>
                      ) : null;
                    })()}
                  </div>
                )}
              </section>
            )}

            <section
              aria-label="Peserta yang mendaftar"
              className="border-t border-[var(--evt-border-subtle,var(--border))] pt-5 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-serif text-base font-bold text-foreground">
                  <span className="font-mono tabular-nums">
                    {attendeeCount}
                  </span>{" "}
                  Akan Hadir
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <Link
                    to="/c/$slug"
                    params={{ slug: event.calendarSlug }}
                    className="min-h-11 inline-flex items-center hover:text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-ring rounded-sm"
                  >
                    Hubungi Penyelenggara
                  </Link>
                  <button
                    type="button"
                    onClick={() => setReportModalOpen(true)}
                    className="min-h-11 inline-flex items-center gap-1 hover:text-[var(--color-error)] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring rounded-sm"
                  >
                    <Flag className="size-3.5" aria-hidden="true" />
                    <span>Laporkan</span>
                  </button>
                </div>
              </div>

              {previews.length > 0 && (
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex -space-x-2 overflow-hidden py-1">
                    {previews.map((att, idx) => (
                      <div
                        key={idx}
                        className="size-8 rounded-full ring-2 ring-background bg-[var(--color-accent-soft)] text-foreground text-xs font-bold flex items-center justify-center overflow-hidden"
                      >
                        {isUsableAssetUrl(att.image) ? (
                          <img
                            src={att.image}
                            alt={att.name}
                            className="size-full object-cover"
                          />
                        ) : (
                          att.name?.trim()?.[0]?.toUpperCase() || "?"
                        )}
                      </div>
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {attendeeNamesText}
                  </span>
                </div>
              )}
            </section>
          </div>

          <aside
            aria-label="Pendaftaran dan tiket acara"
            className="@3xl:sticky @3xl:top-24 space-y-4"
          >
            <div
              style={themeVars.glassElevatedStyle}
              className="evt-glass-elevated rounded-2xl border overflow-hidden shadow-sm"
            >
              <div
                style={{
                  backgroundColor: "var(--evt-control-bg, transparent)",
                  borderColor: "var(--evt-border-subtle, var(--border))",
                }}
                className="flex items-center justify-between gap-2 border-b px-5 py-3.5"
              >
                <div>
                  <h3 className="font-serif text-base font-bold text-foreground">
                    Pendaftaran Peserta
                  </h3>
                  <p className="font-mono text-xs tabular-nums text-muted-foreground mt-0.5">
                    {event.capacity
                      ? `${attendeeCount}/${event.capacity} kursi terisi`
                      : `${attendeeCount} peserta terdaftar`}
                  </p>
                </div>
                <span className="rounded-lg bg-[var(--color-green-soft)] text-[var(--color-green)] border border-[var(--color-green)]/30 px-2.5 py-1 font-mono text-[11px] font-semibold">
                  Gratis
                </span>
              </div>

              <div className="p-5 space-y-4">
                {rsvpError && (
                  <div
                    role="alert"
                    className="rounded-xl border border-[var(--color-error)]/40 bg-[var(--color-error-soft)] p-3 text-xs font-medium text-[var(--color-error)]"
                  >
                    {rsvpError}
                  </div>
                )}

                {event.userRsvpStatus ? (
                  <div className="space-y-3.5">
                    <div
                      className={`flex items-start gap-2.5 rounded-xl border p-3.5 text-xs ${
                        isGoing
                          ? "bg-[var(--color-green-soft)] border-[var(--color-green)]/35 text-foreground"
                          : isPending
                            ? "bg-[var(--color-accent-soft)] border-[var(--color-accent)]/40 text-foreground"
                            : isRejected
                              ? "bg-[var(--color-error-soft)] border-[var(--color-error)]/35 text-foreground"
                              : "bg-[var(--evt-control-bg,var(--background))] border-[var(--evt-border-subtle,var(--border))] text-foreground"
                      }`}
                    >
                      {isRejected ? (
                        <X
                          className="size-4 shrink-0 mt-0.5 text-[var(--color-error)]"
                          aria-hidden="true"
                        />
                      ) : (
                        <CheckCircle2
                          className={`size-4 shrink-0 mt-0.5 ${
                            isGoing
                              ? "text-[var(--color-green)]"
                              : "text-[var(--color-accent)]"
                          }`}
                          aria-hidden="true"
                        />
                      )}
                      <div>
                        <div className="font-semibold">
                          {isGoing && "Terdaftar (Akan Hadir)"}
                          {isPending && "Menunggu Persetujuan Host"}
                          {isWaitlisted && "Masuk Daftar Tunggu"}
                          {isRejected && "Pendaftaran Tidak Disetujui"}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                          {isGoing &&
                            "Tiket check-in serta akses lokasi lengkap telah aktif untuk akunmu."}
                          {isPending &&
                            "Penyelenggara akan meninjau permohonanmu sebelum alamat lengkap dibuka."}
                          {isWaitlisted &&
                            "Kamu akan otomatis naik status jika ada kursi tersedia."}
                          {isRejected &&
                            "Penyelenggara belum dapat menyetujui permohonanmu untuk sesi ini."}
                        </p>
                      </div>
                    </div>

                    {isGoing && detail.userRsvp?.checkinCode && (
                      <div
                        style={{
                          backgroundColor:
                            "var(--evt-control-bg, var(--background))",
                          borderColor:
                            "var(--evt-border-subtle, var(--border))",
                        }}
                        className="rounded-xl border border-dashed p-3.5 space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                            <Ticket
                              className="size-3.5 text-[var(--color-accent)]"
                              aria-hidden="true"
                            />
                            Kode Tiket Check-in
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const code = detail.userRsvp?.checkinCode;
                              if (!code) return;
                              void copyTextToClipboard(code).then((ok) => {
                                if (!ok) return;
                                setCopiedTicket(true);
                                if (copiedTicketTimerRef.current !== null) {
                                  window.clearTimeout(
                                    copiedTicketTimerRef.current,
                                  );
                                }
                                copiedTicketTimerRef.current =
                                  window.setTimeout(
                                    () => setCopiedTicket(false),
                                    2000,
                                  );
                              });
                            }}
                            className="min-h-11 inline-flex items-center gap-1 px-2 text-xs font-semibold text-[var(--color-accent)] hover:underline cursor-pointer focus-visible:outline-2 focus-visible:outline-ring rounded-sm"
                          >
                            {copiedTicket ? (
                              <>
                                <Check
                                  className="size-3.5"
                                  aria-hidden="true"
                                />
                                <span>Tersalin</span>
                              </>
                            ) : (
                              <>
                                <Copy className="size-3.5" aria-hidden="true" />
                                <span>Salin</span>
                              </>
                            )}
                          </button>
                        </div>
                        <div className="font-mono text-lg font-bold tracking-widest text-foreground text-center py-2 bg-card rounded-lg border border-border tabular-nums">
                          {detail.userRsvp.checkinCode}
                        </div>
                      </div>
                    )}

                    {isGoing && meetingHref && (
                      <Button
                        asChild
                        style={themeVars.ctaPrimaryStyle}
                        className="w-full min-h-11 rounded-xl font-semibold text-xs hover:opacity-90"
                      >
                        <a
                          href={meetingHref}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Video className="size-4" aria-hidden="true" />
                          <span>{platformMeta.ctaLabel}</span>
                          <ExternalLink
                            className="size-3.5 ml-auto"
                            aria-hidden="true"
                          />
                        </a>
                      </Button>
                    )}

                    {isGoing && detail.logisticsNotes && (
                      <div
                        style={{
                          backgroundColor:
                            "var(--evt-control-bg, var(--background))",
                          borderColor:
                            "var(--evt-border-subtle, var(--border))",
                        }}
                        className="rounded-xl border p-3.5 space-y-1"
                      >
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                          <Info
                            className="size-3.5 text-[var(--color-accent)]"
                            aria-hidden="true"
                          />
                          <span>Catatan Logistik</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                          {detail.logisticsNotes}
                        </p>
                      </div>
                    )}

                    {isGoing && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          openShareStudio("attending_pass", "attending")
                        }
                        className="w-full min-h-11 rounded-xl text-xs font-semibold bg-[var(--evt-control-bg,transparent)] border-[var(--evt-border-subtle,var(--border))]"
                      >
                        <Share2
                          className="size-3.5 text-[var(--color-accent-text)]"
                          aria-hidden="true"
                        />
                        <span>Bagikan Kartu &quot;Saya Akan Hadir&quot;</span>
                      </Button>
                    )}

                    {!isRejected &&
                      (!confirmCancelRsvp ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setConfirmCancelRsvp(true)}
                          className="w-full min-h-11 rounded-xl text-xs bg-[var(--evt-control-bg,transparent)] border-[var(--evt-border-subtle,var(--border))]"
                        >
                          Batalkan Pendaftaran
                        </Button>
                      ) : (
                        <div
                          style={{
                            backgroundColor:
                              "var(--evt-control-bg, var(--background))",
                            borderColor:
                              "var(--evt-border-subtle, var(--border))",
                          }}
                          className="rounded-xl border p-3 space-y-2.5"
                        >
                          <p className="text-xs font-medium text-foreground">
                            Yakin ingin membatalkan keikutsertaanmu di acara
                            ini?
                          </p>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              disabled={cancelRsvpMutation.isPending}
                              onClick={() => void handleConfirmCancelRsvp()}
                              className="flex-1 min-h-11 text-xs text-[var(--color-error)] border-[var(--color-error)]/40"
                            >
                              {cancelRsvpMutation.isPending
                                ? "Membatalkan..."
                                : "Ya, Batalkan"}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setConfirmCancelRsvp(false)}
                              className="min-h-11 text-xs"
                            >
                              Batal
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : event.requiresApproval ? (
                  <div className="space-y-3">
                    <div
                      style={{
                        backgroundColor:
                          "var(--evt-control-bg, var(--background))",
                        borderColor: "var(--evt-border-subtle, var(--border))",
                      }}
                      className="flex items-start gap-2.5 rounded-xl border p-3 text-xs"
                    >
                      <Lock
                        className="size-4 text-[var(--color-accent)] shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <div>
                        <div className="font-semibold text-foreground">
                          Persetujuan Host Diperlukan
                        </div>
                        <p className="text-muted-foreground mt-0.5">
                          Host akan meninjau pendaftaran sebelum tiket dan
                          alamat penuh terbuka.
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      disabled={rsvpMutation.isPending}
                      onClick={() => void handleRsvp()}
                      style={themeVars.ctaPrimaryStyle}
                      className="w-full min-h-11 rounded-xl hover:opacity-90 font-semibold text-sm"
                    >
                      {rsvpMutation.isPending
                        ? "Mengirim Permintaan..."
                        : "Minta untuk Bergabung"}
                    </Button>
                  </div>
                ) : isFull && event.allowWaitlist ? (
                  <div className="space-y-3">
                    <div
                      style={{
                        backgroundColor:
                          "var(--evt-control-bg, var(--background))",
                        borderColor: "var(--evt-border-subtle, var(--border))",
                      }}
                      className="flex items-start gap-2.5 rounded-xl border p-3 text-xs"
                    >
                      <Users
                        className="size-4 text-[var(--color-accent)] shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <div>
                        <div className="font-semibold text-foreground">
                          Kapasitas Penuh
                        </div>
                        <p className="text-muted-foreground mt-0.5">
                          Kamu dapat masuk ke daftar tunggu dan otomatis
                          dipromosikan jika kursi kosong.
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      disabled={rsvpMutation.isPending}
                      onClick={() => void handleRsvp()}
                      style={themeVars.ctaPrimaryStyle}
                      className="w-full min-h-11 rounded-xl hover:opacity-90 font-semibold text-sm"
                    >
                      {rsvpMutation.isPending
                        ? "Memproses..."
                        : "Daftar Tunggu"}
                    </Button>
                  </div>
                ) : isFull && !event.allowWaitlist ? (
                  <Button
                    type="button"
                    disabled
                    className="w-full min-h-11 rounded-xl font-semibold text-sm opacity-60 cursor-not-allowed"
                  >
                    Kapasitas Penuh
                  </Button>
                ) : (
                  <Button
                    type="button"
                    disabled={rsvpMutation.isPending}
                    onClick={() => void handleRsvp()}
                    style={themeVars.ctaPrimaryStyle}
                    className="w-full min-h-11 rounded-xl hover:opacity-90 font-semibold text-sm"
                  >
                    {rsvpMutation.isPending
                      ? "Mendaftarkan..."
                      : "Daftar Acara"}
                  </Button>
                )}

                <div className="pt-2 border-t border-[var(--evt-border-subtle,var(--border))] flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => openShareStudio()}
                    className="flex-1 min-h-11 rounded-xl text-xs font-semibold bg-[var(--evt-control-bg,transparent)] border-[var(--evt-border-subtle,var(--border))]"
                  >
                    <Share2 className="size-4" aria-hidden="true" />
                    <span>Bagikan Acara (IG &amp; WA)</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => void handleCopyShareLink()}
                    aria-label={
                      copiedLink
                        ? "Tautan acara tersalin"
                        : "Salin tautan acara"
                    }
                    title="Salin Tautan Acara"
                    className="size-11 shrink-0 rounded-xl bg-[var(--evt-control-bg,transparent)] border-[var(--evt-border-subtle,var(--border))]"
                  >
                    {copiedLink ? (
                      <Check
                        className="size-4 text-[var(--color-green)]"
                        aria-hidden="true"
                      />
                    ) : (
                      <Copy className="size-4" aria-hidden="true" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {event.canManage && (
              <div
                style={themeVars.glassSurfaceStyle}
                className="evt-glass rounded-2xl border p-4 space-y-2.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <Settings2
                      className="size-4 text-[var(--color-accent)]"
                      aria-hidden="true"
                    />
                    Meja Pengelola Acara
                  </span>
                  {event.pendingRsvpCount !== undefined &&
                    event.pendingRsvpCount > 0 && (
                      <span className="rounded-full bg-[var(--color-accent)] px-2 py-0.5 font-mono text-[10px] font-bold text-[var(--color-accent-ink)]">
                        {event.pendingRsvpCount} menunggu
                      </span>
                    )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Pengeditan detail, daftar peserta, check-in, dan penghapusan
                  acara dikelola terpisah di tab Dikelola Saya.
                </p>
                <Link
                  to="/app"
                  search={{ tab: "events", view: "hosting" }}
                  style={{
                    backgroundColor: "var(--evt-control-bg, var(--background))",
                    borderColor: "var(--evt-border-subtle, var(--border))",
                  }}
                  className="min-h-11 w-full inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-semibold text-foreground hover:border-[var(--color-accent)] transition-colors"
                >
                  <CalendarIcon className="size-3.5" aria-hidden="true" />
                  <span>Kelola di Dikelola Saya</span>
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              </div>
            )}
          </aside>
        </div>

        {reportModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs"
            style={{ overscrollBehavior: "contain" }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-event-title"
            onClick={(e) => {
              if (e.target === e.currentTarget) setReportModalOpen(false);
            }}
          >
            <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 text-foreground shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Flag
                    className="size-4 text-[var(--color-error)]"
                    aria-hidden="true"
                  />
                  <h3
                    id="report-event-title"
                    className="font-serif font-bold text-sm"
                  >
                    Laporkan Acara
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setReportModalOpen(false)}
                  aria-label="Tutup dialog laporan"
                  className="size-11 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground cursor-pointer focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>

              {reportSent ? (
                <div className="py-6 text-center text-[var(--color-green)] space-y-1">
                  <CheckCircle2 className="size-8 mx-auto" aria-hidden="true" />
                  <div className="font-semibold text-sm">Laporan Terkirim</div>
                  <p className="text-xs text-muted-foreground">
                    Tim kurator AnzaBook akan meninjau laporan Anda.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSendReport} className="mt-3 space-y-3">
                  <label
                    htmlFor="report-event-reason"
                    className="block text-xs text-muted-foreground"
                  >
                    Sampaikan alasan pelaporan (misal: spam, konten tidak
                    pantas, atau lokasi fiktif):
                  </label>
                  <textarea
                    id="report-event-reason"
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    placeholder="Tuliskan detail laporan..."
                    rows={3}
                    className="w-full rounded-lg border border-border bg-[var(--color-paper-2)] p-3 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-[var(--color-accent)]"
                    required
                  />
                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setReportModalOpen(false)}
                      className="min-h-11 text-xs"
                    >
                      Batal
                    </Button>
                    <Button
                      type="submit"
                      disabled={reportMutation.isPending}
                      className="min-h-11 bg-destructive text-destructive-foreground hover:opacity-90 text-xs font-semibold"
                    >
                      {reportMutation.isPending
                        ? "Mengirim..."
                        : "Kirim Laporan"}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        <EventShareDialog
          event={event}
          open={shareModalOpen}
          onOpenChange={setShareModalOpen}
          defaultTemplate={sharePreset.template}
          defaultMode={sharePreset.mode}
          defaultReaderName={resolvedUserName}
          isUserGoing={isGoing}
        />
      </div>
    </div>
  );
}
