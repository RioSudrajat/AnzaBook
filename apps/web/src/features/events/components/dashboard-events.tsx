import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  BookOpen,
  Calendar as CalendarIcon,
  LayoutGrid,
  List,
  Lock,
  MapPin,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Share2,
  Sparkles,
  Trash2,
  Users,
  Video,
  X,
} from "lucide-react";
import type { CommunityEventSummaryDto } from "@starter/shared/types";
import {
  getMeetingPlatformMeta,
  parseEventThemeSpec,
} from "@starter/shared/validators/community";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { isUsableAssetUrl } from "@/lib/media-url";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import {
  eventDescriptionToPlainExcerpt,
  formatEventApiError,
  type EventTypeOption,
} from "../event-description-doc";
import { useCalendars, useDeleteEvent, useInfiniteEvents } from "../hooks";
import { eventsQuery } from "../queries";
import { CreateEventDialog } from "./create-event-dialog";
import { EditEventDialog } from "./edit-event-dialog";
import { EventAttendeesDialog } from "./event-attendees-dialog";
import { EventShareDialog } from "./event-share-dialog";
import { resolveEventThemeVars } from "./event-theme-atmosphere";

type EventsFilterTab = "upcoming" | "hosting" | "my_rsvps" | "past";
type LifecycleScope = "upcoming" | "past";
type FormatFilter = "all" | "offline" | "online" | "hybrid";
type EventTypeFilter = "all" | EventTypeOption;
type ViewMode = "grid" | "timeline";

type DashboardEventsProps = {
  initialView?: EventsFilterTab;
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  book_club: "Klub Buku",
  silent_reading: "Silent Reading",
  film_discussion: "Diskusi Film",
  book_launch: "Peluncuran Buku",
  writing_session: "Sesi Menulis",
  community_meetup: "Temu Komunitas",
};

const EVENT_TYPE_FILTERS: ReadonlyArray<{
  id: EventTypeFilter;
  label: string;
}> = [
  { id: "all", label: "Semua Jenis" },
  { id: "book_club", label: "Klub Buku" },
  { id: "silent_reading", label: "Silent Reading" },
  { id: "film_discussion", label: "Diskusi Film" },
  { id: "book_launch", label: "Peluncuran Buku" },
  { id: "writing_session", label: "Sesi Menulis" },
  { id: "community_meetup", label: "Temu Komunitas" },
];

function getRsvpBadgeMeta(
  status: CommunityEventSummaryDto["userRsvpStatus"],
): { label: string; className: string } | null {
  if (status === "going") {
    return {
      label: "Terdaftar",
      className:
        "bg-[var(--color-green-soft)] text-[var(--color-green)] border-[var(--color-green)]/30",
    };
  }
  if (status === "pending_approval") {
    return {
      label: "Menunggu Host",
      className:
        "bg-[var(--color-accent-soft)] text-foreground border-[var(--color-accent)]/40",
    };
  }
  if (status === "waitlisted") {
    return {
      label: "Daftar Tunggu",
      className: "bg-[var(--color-paper-2)] text-foreground border-border",
    };
  }
  if (status === "rejected") {
    return {
      label: "Ditolak",
      className:
        "bg-[var(--color-error-soft)] text-[var(--color-error)] border-[var(--color-error)]/30",
    };
  }
  return null;
}

function getSeatSummaryText(ev: CommunityEventSummaryDto): {
  text: string;
  isFull: boolean;
} {
  if (ev.capacity !== null && ev.capacity !== undefined) {
    const remaining = ev.capacity - ev.attendeeCount;
    if (remaining <= 0) {
      return {
        text: `${ev.attendeeCount}/${ev.capacity} kursi (Penuh)`,
        isFull: true,
      };
    }
    if (remaining <= 5) {
      return {
        text: `Sisa ${remaining} kursi`,
        isFull: false,
      };
    }
    return {
      text: `${ev.attendeeCount}/${ev.capacity} kursi`,
      isFull: false,
    };
  }
  return {
    text: `${ev.attendeeCount} peserta`,
    isFull: false,
  };
}

function formatShortDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatCardTime(iso: string) {
  const d = new Date(iso);
  return `${d
    .toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    .replace(".", ":")} WIB`;
}

function getLocationLabel(ev: CommunityEventSummaryDto): string {
  const platformLabel =
    ev.format !== "offline"
      ? getMeetingPlatformMeta(ev.meetingPlatform).label
      : null;

  if (ev.format === "online") {
    return platformLabel || "Ruang Virtual";
  }
  if (ev.isAddressHidden) {
    const area = `${ev.district ? `${ev.district}, ` : ""}${ev.city || "Jakarta"}`;
    return platformLabel ? `${area} · ${platformLabel}` : area;
  }
  const baseVenue = ev.venueName || ev.city || "Lokasi Acara";
  return platformLabel ? `${baseVenue} · ${platformLabel}` : baseVenue;
}

function getLinkedWorkLabel(ev: CommunityEventSummaryDto): string | null {
  if (ev.bookSummary?.title) {
    return `Membahas: ${ev.bookSummary.title}`;
  }
  if (ev.featuredWork?.title) {
    return `Membahas: ${ev.featuredWork.title}`;
  }
  return null;
}

export function DashboardEvents({ initialView }: DashboardEventsProps) {
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();

  const [rawFilterTab, setRawFilterTab] = React.useState<EventsFilterTab>(
    initialView ?? "upcoming",
  );
  const [prevInitialView, setPrevInitialView] = React.useState(initialView);
  const [lifecycleScope, setLifecycleScope] =
    React.useState<LifecycleScope>("upcoming");

  if (initialView !== prevInitialView) {
    setPrevInitialView(initialView);
    if (initialView) {
      setRawFilterTab(initialView);
      setLifecycleScope("upcoming");
    }
  }
  const [selectedFormat, setSelectedFormat] =
    React.useState<FormatFilter>("all");
  const [selectedEventType, setSelectedEventType] =
    React.useState<EventTypeFilter>("all");
  const [viewMode, setViewMode] = React.useState<ViewMode>("grid");
  const [searchInput, setSearchInput] = React.useState("");
  const [debouncedQ, setDebouncedQ] = React.useState("");

  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [createSessionKey, setCreateSessionKey] = React.useState(0);
  const [isHostGateOpen, setIsHostGateOpen] = React.useState(false);

  const [managingAttendeesFor, setManagingAttendeesFor] =
    React.useState<CommunityEventSummaryDto | null>(null);
  const [editingEvent, setEditingEvent] =
    React.useState<CommunityEventSummaryDto | null>(null);
  const [shareEvent, setShareEvent] =
    React.useState<CommunityEventSummaryDto | null>(null);
  const [confirmDeleteSlug, setConfirmDeleteSlug] = React.useState<
    string | null
  >(null);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  useBodyScrollLock(isHostGateOpen);

  const { data: session } = authClient.useSession();
  const { data: calendars = [], isLoading: isCalendarsLoading } =
    useCalendars();
  const deleteEventMutation = useDeleteEvent();

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQ(searchInput.trim());
    }, 280);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const canHostEvents = React.useMemo(() => {
    if (!session?.user) return false;
    const role = session.user.role;
    if (role === "admin") return true;
    return calendars.some(
      (c) =>
        c.isManager &&
        (c.verificationStatus === "verified" ||
          c.verificationStatus === "trusted"),
    );
  }, [session, calendars]);

  const filterTab: EventsFilterTab =
    !isCalendarsLoading && rawFilterTab === "hosting" && !canHostEvents
      ? "upcoming"
      : rawFilterTab;

  const { data: hostingOverviewData } = useQuery({
    ...eventsQuery({
      filter: "hosting",
      timeScope: "upcoming",
      limit: 30,
    }),
    enabled: canHostEvents,
  });

  const totalPendingApprovals = React.useMemo(() => {
    const items = hostingOverviewData?.data ?? [];
    return items.reduce((sum, ev) => sum + (ev.pendingRsvpCount ?? 0), 0);
  }, [hostingOverviewData?.data]);

  const verifiedCalendars = React.useMemo(
    () =>
      calendars.filter(
        (c) =>
          c.verificationStatus === "verified" ||
          c.verificationStatus === "trusted",
      ),
    [calendars],
  );

  const handleSelectTab = (tab: EventsFilterTab) => {
    setRawFilterTab(tab);
    setDeleteError(null);
    setConfirmDeleteSlug(null);
    if (tab === "hosting" || tab === "my_rsvps") {
      setLifecycleScope("upcoming");
    }
  };

  const handleCreateClick = () => {
    if (!session?.user) {
      window.location.href = "/sign-in";
      return;
    }
    if (!canHostEvents) {
      setIsHostGateOpen(true);
      return;
    }
    setCreateSessionKey((k) => k + 1);
    setIsCreateOpen(true);
  };

  const activeTimeScope =
    filterTab === "hosting" || filterTab === "my_rsvps"
      ? lifecycleScope
      : undefined;
  const showCategoryChips = filterTab === "upcoming" || filterTab === "past";
  const showViewToggle = filterTab !== "hosting";

  const {
    data: eventsPages,
    isLoading,
    isFetching,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteEvents({
    filter: filterTab,
    timeScope: activeTimeScope,
    format: selectedFormat === "all" ? undefined : selectedFormat,
    eventType:
      showCategoryChips && selectedEventType !== "all"
        ? selectedEventType
        : undefined,
    q: debouncedQ || undefined,
    limit: 8,
  });

  const events = React.useMemo(() => {
    const seen = new Set<string>();
    const deduped: CommunityEventSummaryDto[] = [];
    for (const page of eventsPages?.pages ?? []) {
      for (const item of page.data) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          deduped.push(item);
        }
      }
    }
    return deduped;
  }, [eventsPages?.pages]);

  const totalEventsCount = eventsPages?.pages[0]?.meta.total ?? events.length;

  const hasActiveFilters =
    Boolean(debouncedQ) ||
    selectedFormat !== "all" ||
    (showCategoryChips && selectedEventType !== "all");

  useBodyScrollLock(isHostGateOpen);

  React.useEffect(() => {
    if (!isHostGateOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsHostGateOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isHostGateOpen]);

  const handleResetFilters = () => {
    setSearchInput("");
    setDebouncedQ("");
    setSelectedFormat("all");
    setSelectedEventType("all");
  };

  const showLeadShowcase =
    filterTab === "upcoming" &&
    viewMode === "grid" &&
    !hasActiveFilters &&
    events.length > 0;

  const leadEvent = showLeadShowcase ? events[0] : null;
  const bodyEvents = showLeadShowcase ? events.slice(1) : events;

  const groupedTimelineEvents = React.useMemo(() => {
    const groups: {
      [key: string]: {
        label: string;
        date: Date;
        items: CommunityEventSummaryDto[];
      };
    } = {};

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

    for (const ev of bodyEvents) {
      const d = new Date(ev.startsAt);
      const dayKey = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

      if (!groups[dayKey]) {
        const itemDate = new Date(d);
        itemDate.setHours(0, 0, 0, 0);

        let label = `${itemDate.getDate()} ${monthNames[itemDate.getMonth()]}, ${dayNames[itemDate.getDay()]}`;
        if (itemDate.getTime() === today.getTime()) {
          label = `Hari Ini, ${dayNames[itemDate.getDay()]}`;
        } else if (itemDate.getTime() === tomorrow.getTime()) {
          label = `Besok, ${dayNames[itemDate.getDay()]}`;
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
  }, [bodyEvents]);

  const handleConfirmDelete = async (slug: string) => {
    setDeleteError(null);
    try {
      await deleteEventMutation.mutateAsync(slug);
      setConfirmDeleteSlug(null);
    } catch (err: unknown) {
      setDeleteError(formatEventApiError(err, "Gagal menghapus acara."));
    }
  };

  const navTabs = React.useMemo(() => {
    const list: Array<{
      id: EventsFilterTab;
      label: string;
      badge?: number;
    }> = [
      { id: "upcoming", label: "Acara Terdekat" },
      { id: "my_rsvps", label: "Pendaftaran Saya" },
    ];
    if (canHostEvents) {
      list.push({
        id: "hosting",
        label: "Dikelola Saya",
        badge: totalPendingApprovals > 0 ? totalPendingApprovals : undefined,
      });
    }
    list.push({ id: "past", label: "Riwayat Acara" });
    return list;
  }, [canHostEvents, totalPendingApprovals]);

  return (
    <div className="relative flex flex-col space-y-6 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-border pb-4">
        <div className="space-y-1">
          <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground text-balance">
            Agenda Komunitas
          </h2>
          <p className="text-sm text-muted-foreground max-w-2xl text-pretty">
            {filterTab === "hosting"
              ? "Meja kerja penyelenggara untuk meninjau pendaftar, menyunting rincian acara, dan mencatat kehadiran."
              : filterTab === "my_rsvps"
                ? "Tiket check-in, akses tautan pertemuan, dan agenda literasi yang sudah kamu daftarkan."
                : filterTab === "past"
                  ? "Arsip pertemuan baca, bedah buku, dan diskusi komunitas yang telah berlangsung."
                  : "Temukan bedah buku, silent reading, dan temu literasi lintas komunitas pembaca."}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            onClick={handleCreateClick}
            className="min-h-11 gap-2 bg-[var(--color-accent)] text-[var(--color-accent-ink)] hover:opacity-90 font-semibold text-xs px-4"
          >
            <Plus className="size-4" aria-hidden="true" />
            <span>{canHostEvents ? "Buat Acara" : "Ajukan Komunitas"}</span>
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div
            role="tablist"
            aria-label="Kategori daftar agenda"
            className="flex flex-nowrap overflow-x-auto items-center gap-1 rounded-xl border border-border bg-[var(--color-paper-2)] p-1 text-xs"
          >
            {navTabs.map((tab) => {
              const active = filterTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => handleSelectTab(tab.id)}
                  className={`relative min-h-11 shrink-0 whitespace-nowrap rounded-lg px-3.5 font-medium transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring inline-flex items-center gap-2 ${
                    active
                      ? "text-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {active &&
                    (shouldReduceMotion ? (
                      <span
                        aria-hidden="true"
                        className="absolute inset-0 rounded-lg bg-background border border-border shadow-xs"
                      />
                    ) : (
                      <motion.span
                        layoutId="community-tab-pill"
                        transition={{
                          type: "spring",
                          stiffness: 420,
                          damping: 34,
                        }}
                        aria-hidden="true"
                        className="absolute inset-0 rounded-lg bg-background border border-border shadow-xs"
                      />
                    ))}
                  <span className="relative z-10">{tab.label}</span>
                  {tab.badge !== undefined && (
                    <span className="relative z-10 rounded-full bg-[var(--color-accent)] px-1.5 py-0.5 font-mono text-[10px] font-bold text-[var(--color-accent-ink)] tabular-nums">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {showViewToggle && (
            <div
              role="group"
              aria-label="Mode tampilan daftar agenda"
              className="inline-flex shrink-0 self-start sm:self-auto items-center rounded-xl border border-border bg-[var(--color-paper-2)] p-1 text-xs"
            >
              <button
                type="button"
                aria-pressed={viewMode === "grid"}
                aria-label="Tampilan kartu"
                onClick={() => setViewMode("grid")}
                className={`min-h-11 px-3 rounded-lg inline-flex items-center gap-1.5 font-medium transition-colors cursor-pointer ${
                  viewMode === "grid"
                    ? "bg-background text-foreground font-semibold shadow-xs border border-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LayoutGrid className="size-3.5" aria-hidden="true" />
                <span>Kartu</span>
              </button>
              <button
                type="button"
                aria-pressed={viewMode === "timeline"}
                aria-label="Tampilan linimasa"
                onClick={() => setViewMode("timeline")}
                className={`min-h-11 px-3 rounded-lg inline-flex items-center gap-1.5 font-medium transition-colors cursor-pointer ${
                  viewMode === "timeline"
                    ? "bg-background text-foreground font-semibold shadow-xs border border-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <List className="size-3.5" aria-hidden="true" />
                <span>Linimasa</span>
              </button>
            </div>
          )}
        </div>

        <search aria-label="Pencarian dan filter agenda" className="block">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
            <div className="relative min-w-0 flex-1">
              <label htmlFor="agenda-search-input" className="sr-only">
                Cari judul acara, komunitas, topik, atau kota
              </label>
              <Search
                className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="agenda-search-input"
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Cari acara, komunitas, topik, atau kota..."
                className="h-11 w-full rounded-xl border border-border bg-[var(--color-paper-2)] pl-9 pr-9 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput("");
                    setDebouncedQ("");
                  }}
                  aria-label="Hapus kata kunci"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 size-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              )}
            </div>

            <div
              role="group"
              aria-label="Filter format acara"
              className="inline-flex shrink-0 items-center rounded-xl border border-border bg-[var(--color-paper-2)] p-1 text-xs overflow-x-auto"
            >
              {(
                [
                  { id: "all", label: "Semua" },
                  { id: "offline", label: "Luring" },
                  { id: "online", label: "Daring" },
                  { id: "hybrid", label: "Hibrida" },
                ] as const
              ).map((option) => {
                const active = selectedFormat === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelectedFormat(option.id)}
                    className={`min-h-11 shrink-0 rounded-lg px-3 font-medium transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring ${
                      active
                        ? "bg-background text-foreground font-semibold shadow-xs border border-border"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        </search>

        {(filterTab === "hosting" || filterTab === "my_rsvps") && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div
              role="group"
              aria-label="Rentang waktu acara"
              className="inline-flex items-center rounded-xl border border-border bg-[var(--color-paper-2)] p-1 text-xs"
            >
              <button
                type="button"
                aria-pressed={lifecycleScope === "upcoming"}
                onClick={() => setLifecycleScope("upcoming")}
                className={`min-h-10 rounded-lg px-3.5 font-medium transition-colors cursor-pointer ${
                  lifecycleScope === "upcoming"
                    ? "bg-background text-foreground font-semibold shadow-xs border border-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Aktif &amp; Mendatang
              </button>
              <button
                type="button"
                aria-pressed={lifecycleScope === "past"}
                onClick={() => setLifecycleScope("past")}
                className={`min-h-10 rounded-lg px-3.5 font-medium transition-colors cursor-pointer ${
                  lifecycleScope === "past"
                    ? "bg-background text-foreground font-semibold shadow-xs border border-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Selesai / Lewat
              </button>
            </div>

            {hasActiveFilters && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="font-mono tabular-nums">
                  Ditemukan {totalEventsCount} agenda
                </span>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="min-h-10 inline-flex items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium text-foreground hover:bg-muted cursor-pointer"
                >
                  <RotateCcw className="size-3.5" aria-hidden="true" />
                  <span>Reset filter</span>
                </button>
              </div>
            )}
          </div>
        )}

        {showCategoryChips && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div
              role="group"
              aria-label="Filter jenis acara"
              className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 sm:flex-wrap"
            >
              {EVENT_TYPE_FILTERS.map((item) => {
                const active = selectedEventType === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelectedEventType(item.id)}
                    className={`min-h-10 shrink-0 whitespace-nowrap rounded-lg border px-3 text-xs font-medium transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring ${
                      active
                        ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-foreground font-semibold"
                        : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-foreground/25"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            {hasActiveFilters && (
              <div className="flex items-center gap-2.5 text-xs text-muted-foreground shrink-0">
                <span className="font-mono tabular-nums">
                  Ditemukan {totalEventsCount} agenda
                </span>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="min-h-10 inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs font-medium text-foreground hover:bg-muted cursor-pointer"
                >
                  <RotateCcw className="size-3.5" aria-hidden="true" />
                  <span>Reset</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {deleteError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-error)]/40 bg-[var(--color-error-soft)] px-4 py-3 text-xs font-medium text-[var(--color-error)]"
        >
          <span>{deleteError}</span>
          <button
            type="button"
            onClick={() => setDeleteError(null)}
            aria-label="Tutup pesan gagal hapus"
            className="size-8 inline-flex items-center justify-center rounded-md hover:bg-black/5 cursor-pointer"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {isLoading ? (
        <div
          className="grid grid-cols-1 md:grid-cols-2 gap-5 py-4"
          aria-label="Memuat agenda komunitas"
        >
          {[0, 1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-72 rounded-2xl border border-border bg-card animate-pulse"
            />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-[var(--color-paper-2)] p-10 text-center space-y-3">
          {filterTab === "hosting" && !session?.user ? (
            <>
              <Users
                className="size-9 text-muted-foreground mx-auto"
                aria-hidden="true"
              />
              <h3 className="font-serif text-base font-bold text-foreground">
                Masuk untuk Melihat Acara Kelolaan
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Masuk ke akun AnzaBook untuk menyunting dan memeriksa daftar
                peserta acara.
              </p>
              <Button
                asChild
                className="min-h-11 bg-[var(--color-accent)] text-[var(--color-accent-ink)] font-semibold text-xs"
              >
                <a href="/sign-in">Masuk ke Akun</a>
              </Button>
            </>
          ) : filterTab === "hosting" ? (
            <>
              <Sparkles
                className="size-9 text-muted-foreground mx-auto"
                aria-hidden="true"
              />
              <h3 className="font-serif text-base font-bold text-foreground">
                {lifecycleScope === "past"
                  ? "Belum Ada Acara Kelolaan yang Selesai"
                  : hasActiveFilters
                    ? "Tidak Ada Acara Kelolaan yang Cocok"
                    : "Belum Ada Acara Aktif yang Anda Kelola"}
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {lifecycleScope === "past"
                  ? "Agenda kelolaan yang telah berakhir akan tersimpan rapi di bagian ini."
                  : hasActiveFilters
                    ? "Coba ubah kata kunci pencarian atau reset filter aktif."
                    : "Mulai buat agenda bedah buku, silent reading, atau diskusi karya pertamamu."}
              </p>
              {hasActiveFilters ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResetFilters}
                  className="min-h-11 text-xs"
                >
                  Reset Filter
                </Button>
              ) : lifecycleScope === "upcoming" ? (
                <Button
                  type="button"
                  onClick={handleCreateClick}
                  className="min-h-11 bg-[var(--color-accent)] text-[var(--color-accent-ink)] font-semibold text-xs"
                >
                  + Buat Acara Baru
                </Button>
              ) : null}
            </>
          ) : filterTab === "my_rsvps" ? (
            <>
              <CalendarIcon
                className="size-9 text-muted-foreground mx-auto"
                aria-hidden="true"
              />
              <h3 className="font-serif text-base font-bold text-foreground">
                {hasActiveFilters
                  ? "Tidak Ada Pendaftaran yang Cocok"
                  : lifecycleScope === "past"
                    ? "Belum Ada Riwayat Kehadiran"
                    : "Belum Ada Pendaftaran Aktif"}
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {hasActiveFilters
                  ? "Coba ubah kata kunci pencarian atau reset filter aktif."
                  : lifecycleScope === "past"
                    ? "Acara yang pernah kamu ikuti akan tampil di sini setelah sesi berakhir."
                    : "Jelajahi Acara Terdekat dan daftarkan diri untuk mendapatkan kode tiket check-in."}
              </p>
              {hasActiveFilters ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResetFilters}
                  className="min-h-11 text-xs"
                >
                  Reset Filter
                </Button>
              ) : (
                lifecycleScope === "upcoming" && (
                  <Button
                    type="button"
                    onClick={() => handleSelectTab("upcoming")}
                    className="min-h-11 bg-[var(--color-accent)] text-[var(--color-accent-ink)] font-semibold text-xs"
                  >
                    Jelajahi Acara Terdekat
                  </Button>
                )
              )}
            </>
          ) : filterTab === "past" ? (
            <>
              <CalendarIcon
                className="size-9 text-muted-foreground mx-auto"
                aria-hidden="true"
              />
              <h3 className="font-serif text-base font-bold text-foreground">
                Belum Ada Riwayat Acara
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {hasActiveFilters
                  ? "Tidak ada arsip agenda yang cocok dengan filter pencarianmu."
                  : "Belum ada agenda komunitas yang telah berakhir."}
              </p>
              {hasActiveFilters && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResetFilters}
                  className="min-h-11 text-xs"
                >
                  Reset Filter
                </Button>
              )}
            </>
          ) : (
            <>
              <CalendarIcon
                className="size-9 text-muted-foreground mx-auto"
                aria-hidden="true"
              />
              <h3 className="font-serif text-base font-bold text-foreground">
                {hasActiveFilters
                  ? "Agenda Tidak Ditemukan"
                  : "Belum Ada Acara Terdekat"}
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {hasActiveFilters
                  ? "Tidak ada agenda yang cocok dengan kata kunci atau filter yang dipilih."
                  : "Jadilah yang pertama membuat agenda bedah buku atau temu literasi di komunitas."}
              </p>
              {hasActiveFilters ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResetFilters}
                  className="min-h-11 text-xs"
                >
                  Reset Filter
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleCreateClick}
                  className="min-h-11 bg-[var(--color-accent)] text-[var(--color-accent-ink)] font-semibold text-xs"
                >
                  + Buat Acara Baru
                </Button>
              )}
            </>
          )}
        </div>
      ) : filterTab === "hosting" ? (
        <div className="space-y-4">
          {events.map((ev) => {
            const isConfirming = confirmDeleteSlug === ev.slug;
            const evSpec = parseEventThemeSpec(ev.themePreset);
            const evTheme = resolveEventThemeVars(evSpec);
            const seatInfo = getSeatSummaryText(ev);
            const locationLabel = getLocationLabel(ev);
            const eventTypeLabel =
              EVENT_TYPE_LABELS[ev.eventType] || "Agenda Komunitas";
            return (
              <div
                key={ev.id}
                className="rounded-2xl border border-border bg-card p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4 min-w-0">
                  {isUsableAssetUrl(ev.coverUrl) ? (
                    <img
                      src={ev.coverUrl}
                      alt={ev.title}
                      className="size-20 sm:size-24 rounded-xl border border-border object-cover shrink-0 bg-muted"
                    />
                  ) : (
                    <div
                      aria-hidden="true"
                      className="size-20 sm:size-24 rounded-xl border border-border shrink-0 bg-muted"
                    />
                  )}
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-muted-foreground tabular-nums">
                      <span
                        className="size-2 rounded-full shrink-0"
                        style={{ backgroundColor: evTheme.accentMeta.swatch }}
                        aria-hidden="true"
                      />
                      <span>{formatShortDate(ev.startsAt)}</span>
                      <span>·</span>
                      <span>{formatCardTime(ev.startsAt)}</span>
                      <span className="rounded bg-[var(--color-paper-2)] border border-border px-1.5 py-0.5 font-sans text-[10px] font-medium text-foreground">
                        {eventTypeLabel}
                      </span>
                      {ev.visibility === "private_link" && (
                        <span className="inline-flex items-center gap-1 rounded bg-[var(--color-paper-2)] border border-border px-1.5 py-0.5 font-sans text-[10px] text-foreground">
                          <Lock className="size-3" aria-hidden="true" />
                          Privat
                        </span>
                      )}
                      {ev.pendingRsvpCount !== undefined &&
                        ev.pendingRsvpCount > 0 && (
                          <span className="rounded bg-[var(--color-accent-soft)] border border-[var(--color-accent)]/40 px-2 py-0.5 font-sans text-[10px] text-foreground font-semibold tabular-nums">
                            {ev.pendingRsvpCount} perlu persetujuan
                          </span>
                        )}
                    </div>

                    <h3 className="font-serif text-lg font-bold text-foreground line-clamp-1 text-balance">
                      {ev.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {ev.calendarName}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        {ev.format === "online" ? (
                          <Video
                            className="size-3.5 text-[var(--color-water)]"
                            aria-hidden="true"
                          />
                        ) : (
                          <MapPin
                            className="size-3.5 text-[var(--color-accent-text)]"
                            aria-hidden="true"
                          />
                        )}
                        <span>{locationLabel}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                        <Users className="size-3.5" aria-hidden="true" />
                        <span>{seatInfo.text}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 shrink-0">
                  <Button
                    asChild
                    variant="outline"
                    className="min-h-11 text-xs"
                  >
                    <Link to="/events/$slug" params={{ slug: ev.slug }}>
                      <span>Buka Halaman</span>
                      <ArrowRight className="size-3.5" aria-hidden="true" />
                    </Link>
                  </Button>

                  <Button
                    type="button"
                    onClick={() => setManagingAttendeesFor(ev)}
                    className="min-h-11 bg-[var(--color-accent)] text-[var(--color-accent-ink)] hover:opacity-90 font-semibold text-xs"
                  >
                    <Users className="size-3.5" aria-hidden="true" />
                    <span>Kelola Peserta</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShareEvent(ev)}
                    className="min-h-11 text-xs"
                  >
                    <Share2 className="size-3.5" aria-hidden="true" />
                    <span>Bagikan</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingEvent(ev)}
                    className="min-h-11 text-xs"
                  >
                    <Pencil className="size-3.5" aria-hidden="true" />
                    <span>Edit</span>
                  </Button>

                  {!isConfirming ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setDeleteError(null);
                        setConfirmDeleteSlug(ev.slug);
                      }}
                      className="min-h-11 text-xs text-[var(--color-error)] border-[var(--color-error)]/35"
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                      <span>Hapus</span>
                    </Button>
                  ) : (
                    <div className="col-span-2 flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={deleteEventMutation.isPending}
                        onClick={() => void handleConfirmDelete(ev.slug)}
                        className="min-h-11 flex-1 sm:flex-none text-xs bg-[var(--color-error-soft)] text-[var(--color-error)] border-[var(--color-error)]/40 font-semibold"
                      >
                        {deleteEventMutation.isPending
                          ? "Menghapus..."
                          : "Konfirmasi Hapus"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setConfirmDeleteSlug(null)}
                        className="min-h-11 text-xs"
                      >
                        Batal
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div
          className={`space-y-8 transition-opacity duration-200 ${
            isFetching && !isFetchingNextPage ? "opacity-75" : "opacity-100"
          }`}
        >
          {leadEvent && (
            <LeadSpotlightCard
              ev={leadEvent}
              shouldReduceMotion={Boolean(shouldReduceMotion)}
              onShare={setShareEvent}
            />
          )}

          {viewMode === "grid" ? (
            bodyEvents.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {bodyEvents.map((ev) => (
                  <EditorialEventCard
                    key={ev.id}
                    ev={ev}
                    shouldReduceMotion={Boolean(shouldReduceMotion)}
                    onShare={setShareEvent}
                  />
                ))}
              </div>
            )
          ) : (
            <div className="space-y-6">
              {groupedTimelineEvents.map((group) => (
                <section
                  key={group.label}
                  className="grid grid-cols-1 md:grid-cols-[136px_minmax(0,1fr)] gap-3 md:gap-6 items-start"
                >
                  <div className="md:sticky md:top-24 pt-1">
                    <h3 className="font-mono text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                      {group.label}
                    </h3>
                  </div>

                  <ul className="space-y-3">
                    {group.items.map((ev) => (
                      <li key={ev.id}>
                        <TimelineEventCard ev={ev} onShare={setShareEvent} />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      )}

      {!isLoading && events.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-border pt-4">
          <p className="font-mono text-xs text-muted-foreground tabular-nums">
            Menampilkan {events.length} dari {totalEventsCount} agenda
          </p>

          {hasNextPage && (
            <Button
              type="button"
              variant="outline"
              disabled={isFetchingNextPage}
              onClick={() => void fetchNextPage()}
              className="min-h-11 rounded-xl px-5 text-xs font-semibold border-border hover:border-foreground/30"
            >
              {isFetchingNextPage
                ? "Memuat agenda..."
                : "Muat Agenda Berikutnya"}
            </Button>
          )}
        </div>
      )}

      {filterTab === "upcoming" &&
        !hasActiveFilters &&
        verifiedCalendars.length > 0 && (
          <section
            aria-label="Komunitas penyelenggara literasi"
            className="border-t border-border pt-6 space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-serif text-base sm:text-lg font-bold text-foreground">
                Komunitas Penyelenggara Aktif
              </h3>
              <span className="font-mono text-xs text-muted-foreground">
                {verifiedCalendars.length} komunitas terverifikasi
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {verifiedCalendars.slice(0, 4).map((cal) => (
                <Link
                  key={cal.id}
                  to="/c/$slug"
                  params={{ slug: cal.slug }}
                  className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3.5 transition-colors hover:border-foreground/30 focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="font-serif text-sm font-bold text-foreground group-hover:text-[var(--color-accent-text)] transition-colors truncate">
                      {cal.name}
                    </div>
                    <div className="font-mono text-[11px] text-muted-foreground tabular-nums truncate">
                      {cal.followerCount} pengikut
                      {cal.city ? ` · ${cal.city}` : ""}
                    </div>
                  </div>
                  <ArrowRight
                    className="size-4 text-muted-foreground group-hover:text-[var(--color-accent-text)] shrink-0 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>
              ))}
            </div>
          </section>
        )}

      <CreateEventDialog
        key={createSessionKey}
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={(slug) => {
          setIsCreateOpen(false);
          void navigate({ to: "/events/$slug", params: { slug } });
        }}
      />

      {managingAttendeesFor && (
        <EventAttendeesDialog
          open
          onClose={() => setManagingAttendeesFor(null)}
          eventSlug={managingAttendeesFor.slug}
          eventTitle={managingAttendeesFor.title}
        />
      )}

      {editingEvent && (
        <EditEventDialog
          open
          onClose={() => setEditingEvent(null)}
          event={editingEvent}
        />
      )}

      {shareEvent && (
        <EventShareDialog
          event={shareEvent}
          open
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setShareEvent(null);
          }}
          defaultReaderName={session?.user?.name}
          isUserGoing={shareEvent.userRsvpStatus === "going"}
        />
      )}

      {isHostGateOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs"
          style={{ overscrollBehavior: "contain" }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="host-gate-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsHostGateOpen(false);
          }}
        >
          <div
            data-lenis-prevent
            className="relative flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-card p-6 text-foreground shadow-2xl"
            style={{ overscrollBehavior: "contain" }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex size-10 items-center justify-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent-text)]">
                <Sparkles className="size-5" aria-hidden="true" />
              </div>
              <button
                type="button"
                onClick={() => setIsHostGateOpen(false)}
                aria-label="Tutup"
                className="size-11 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            <h3
              id="host-gate-title"
              className="font-serif text-lg font-bold text-foreground mb-2"
            >
              Akses Penyelenggara Acara
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed mb-6">
              Di AnzaBook, acara diselenggarakan oleh{" "}
              <strong className="text-foreground">
                Komunitas Baca, Penulis,
              </strong>{" "}
              atau <strong className="text-foreground">Penerbit</strong>{" "}
              terverifikasi untuk menjaga linimasa tetap berkualitas. Daftarkan
              entitas Anda melalui{" "}
              <strong className="text-foreground">Partner Program</strong>.
            </p>

            <div className="flex flex-col gap-2">
              <Link
                to="/partner-program"
                onClick={() => setIsHostGateOpen(false)}
                className="min-h-11 w-full rounded-xl bg-[var(--color-accent)] text-[var(--color-accent-ink)] font-semibold text-xs flex items-center justify-center hover:opacity-90"
              >
                Buka Partner Program
              </Link>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsHostGateOpen(false)}
                className="w-full min-h-11 text-xs"
              >
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AttendeeAvatarPile({
  ev,
  maxAvatars = 3,
}: {
  ev: CommunityEventSummaryDto;
  maxAvatars?: number;
}) {
  const previews = (ev.attendeesPreview ?? []).slice(0, maxAvatars);
  const seatInfo = getSeatSummaryText(ev);

  return (
    <div className="inline-flex items-center gap-2 min-w-0">
      {previews.length > 0 ? (
        <div className="flex -space-x-2 shrink-0">
          {previews.map((att) => (
            <div
              key={att.userId}
              className="size-6 rounded-full ring-2 ring-card bg-[var(--color-accent-soft)] text-foreground text-[10px] font-bold flex items-center justify-center overflow-hidden uppercase"
              title={att.name}
            >
              {att.image ? (
                <img
                  src={att.image}
                  alt={att.name}
                  className="size-full object-cover"
                />
              ) : (
                att.name[0]
              )}
            </div>
          ))}
        </div>
      ) : (
        <Users
          className="size-3.5 text-muted-foreground shrink-0"
          aria-hidden="true"
        />
      )}
      <span
        className={`font-mono text-[11px] tabular-nums truncate ${
          seatInfo.isFull
            ? "font-semibold text-foreground"
            : "text-muted-foreground"
        }`}
      >
        {seatInfo.text}
      </span>
    </div>
  );
}

function LeadSpotlightCard({
  ev,
  shouldReduceMotion,
  onShare,
}: {
  ev: CommunityEventSummaryDto;
  shouldReduceMotion: boolean;
  onShare: (ev: CommunityEventSummaryDto) => void;
}) {
  const spec = parseEventThemeSpec(ev.themePreset);
  const themeVars = resolveEventThemeVars(spec);
  const eventTypeLabel = EVENT_TYPE_LABELS[ev.eventType] || "Agenda Komunitas";
  const locationLabel = getLocationLabel(ev);
  const linkedWork = getLinkedWorkLabel(ev);
  const rsvpBadge = getRsvpBadgeMeta(ev.userRsvpStatus);
  const excerpt = eventDescriptionToPlainExcerpt(ev.description);

  return (
    <article
      className={`group relative grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] overflow-hidden rounded-2xl border border-border bg-card hover:border-foreground/30 transition-all ${
        shouldReduceMotion ? "" : "hover:-translate-y-0.5 hover:shadow-sm"
      }`}
    >
      <div className="min-w-0 flex flex-col justify-between gap-4 p-5 sm:p-7 order-2 lg:order-1">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs tabular-nums text-muted-foreground">
            <span
              className="size-2.5 rounded-full shrink-0 border border-black/10"
              style={{ background: themeVars.swatchGradient }}
              aria-hidden="true"
            />
            <span className="font-semibold text-[var(--color-accent-text)]">
              Agenda Terdekat
            </span>
            <span>·</span>
            <span className="text-foreground font-medium">
              {formatShortDate(ev.startsAt)}, {formatCardTime(ev.startsAt)}
            </span>
            <span className="rounded-md border border-border bg-[var(--color-paper-2)] px-2 py-0.5 font-sans text-[11px] font-medium text-foreground">
              {eventTypeLabel}
            </span>
            {rsvpBadge && (
              <span
                className={`rounded-md border px-2 py-0.5 font-sans text-[11px] font-semibold ${rsvpBadge.className}`}
              >
                {rsvpBadge.label}
              </span>
            )}
          </div>

          <h3 className="font-serif text-2xl sm:text-3xl font-bold text-foreground group-hover:text-[var(--color-accent-text)] transition-colors leading-tight text-balance">
            <Link
              to="/events/$slug"
              params={{ slug: ev.slug }}
              className="after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-ring rounded-sm"
            >
              {ev.title}
            </Link>
          </h3>

          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed text-pretty">
            {excerpt}
          </p>

          {linkedWork && (
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
              <BookOpen
                className="size-3.5 text-[var(--color-accent-text)] shrink-0"
                aria-hidden="true"
              />
              <span className="truncate">{linkedWork}</span>
            </div>
          )}
        </div>

        <div className="space-y-3 pt-4 border-t border-border/80">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 min-w-0">
              <span className="font-semibold text-foreground">
                {ev.calendarName}
              </span>
              {ev.coHosts && ev.coHosts.length > 0 && (
                <span>+ {ev.coHosts.map((c) => c.name).join(", ")}</span>
              )}
              <span className="inline-flex items-center gap-1">
                {ev.format === "online" ? (
                  <Video
                    className="size-3.5 text-[var(--color-water)] shrink-0"
                    aria-hidden="true"
                  />
                ) : (
                  <MapPin
                    className="size-3.5 text-[var(--color-accent-text)] shrink-0"
                    aria-hidden="true"
                  />
                )}
                <span>{locationLabel}</span>
              </span>
            </div>

            <AttendeeAvatarPile ev={ev} maxAvatars={4} />
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-[11px] text-muted-foreground">
              {ev.categoryTag ? `#${ev.categoryTag}` : ""}
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onShare(ev)}
                aria-label={`Bagikan agenda ${ev.title}`}
                className="relative z-10 inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring"
              >
                <Share2 className="size-3.5" aria-hidden="true" />
                <span>Bagikan</span>
              </button>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-accent-text)]">
                <span>Buka Agenda</span>
                <ArrowRight
                  className="size-3.5 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative aspect-[16/10] lg:aspect-auto lg:min-h-[270px] w-full overflow-hidden bg-muted order-1 lg:order-2">
        <img
          src={ev.coverUrl}
          alt={ev.title}
          className={`size-full object-cover ${
            shouldReduceMotion
              ? ""
              : "transition-transform duration-300 group-hover:scale-[1.03]"
          }`}
        />
      </div>
    </article>
  );
}

function EditorialEventCard({
  ev,
  shouldReduceMotion,
  onShare,
}: {
  ev: CommunityEventSummaryDto;
  shouldReduceMotion: boolean;
  onShare: (ev: CommunityEventSummaryDto) => void;
}) {
  const spec = parseEventThemeSpec(ev.themePreset);
  const themeVars = resolveEventThemeVars(spec);
  const eventTypeLabel = EVENT_TYPE_LABELS[ev.eventType] || "Agenda Komunitas";
  const locationLabel = getLocationLabel(ev);
  const linkedWork = getLinkedWorkLabel(ev);
  const rsvpBadge = getRsvpBadgeMeta(ev.userRsvpStatus);
  const excerpt = eventDescriptionToPlainExcerpt(ev.description);

  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card hover:border-foreground/30 transition-all ${
        shouldReduceMotion ? "" : "hover:-translate-y-0.5 hover:shadow-sm"
      }`}
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
        <img
          src={ev.coverUrl}
          alt={ev.title}
          className={`size-full object-cover ${
            shouldReduceMotion
              ? ""
              : "transition-transform duration-300 group-hover:scale-[1.03]"
          }`}
        />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/75 via-black/30 to-transparent pointer-events-none" />

        <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5">
          <span className="rounded-md bg-background/95 backdrop-blur-xs border border-border px-2.5 py-1 text-[11px] font-semibold text-foreground shadow-xs">
            {eventTypeLabel}
          </span>
        </div>

        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
          <span className="rounded-md bg-black/75 px-2.5 py-1 font-mono text-[11px] font-semibold text-white tabular-nums">
            {formatShortDate(ev.startsAt)}, {formatCardTime(ev.startsAt)}
          </span>

          {rsvpBadge && (
            <span
              className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold shadow-xs ${rsvpBadge.className}`}
            >
              {rsvpBadge.label}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="size-2.5 rounded-full shrink-0 border border-black/10"
              style={{ background: themeVars.swatchGradient }}
              aria-hidden="true"
            />
            <span className="font-medium text-foreground truncate">
              {ev.calendarName}
            </span>
            {ev.coHosts && ev.coHosts.length > 0 && (
              <span className="shrink-0">+ {ev.coHosts.length} mitra</span>
            )}
          </div>

          {ev.categoryTag && (
            <span className="font-mono text-[11px] text-muted-foreground shrink-0">
              #{ev.categoryTag}
            </span>
          )}
        </div>

        <h4 className="font-serif text-lg sm:text-xl font-bold text-foreground group-hover:text-[var(--color-accent-text)] transition-colors leading-snug line-clamp-2 text-balance">
          <Link
            to="/events/$slug"
            params={{ slug: ev.slug }}
            className="after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-ring rounded-sm"
          >
            {ev.title}
          </Link>
        </h4>

        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 leading-relaxed text-pretty">
          {excerpt}
        </p>

        {linkedWork && (
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
            <BookOpen
              className="size-3.5 text-[var(--color-accent-text)] shrink-0"
              aria-hidden="true"
            />
            <span className="truncate">{linkedWork}</span>
          </div>
        )}

        <div className="mt-auto pt-3 border-t border-border/70 flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <div className="min-w-0 space-y-1">
            <span className="inline-flex items-center gap-1.5 max-w-full">
              {ev.format === "online" ? (
                <Video
                  className="size-3.5 text-[var(--color-water)] shrink-0"
                  aria-hidden="true"
                />
              ) : (
                <MapPin
                  className="size-3.5 text-[var(--color-accent-text)] shrink-0"
                  aria-hidden="true"
                />
              )}
              <span className="truncate">{locationLabel}</span>
            </span>
            <div>
              <AttendeeAvatarPile ev={ev} maxAvatars={3} />
            </div>
          </div>

          <button
            type="button"
            onClick={() => onShare(ev)}
            aria-label={`Bagikan agenda ${ev.title}`}
            title="Bagikan Agenda"
            className="relative z-10 size-11 shrink-0 inline-flex items-center justify-center rounded-xl border border-border bg-background text-foreground hover:bg-muted transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring"
          >
            <Share2 className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
}

function TimelineEventCard({
  ev,
  onShare,
}: {
  ev: CommunityEventSummaryDto;
  onShare: (ev: CommunityEventSummaryDto) => void;
}) {
  const shouldReduceMotion = useReducedMotion();
  const evSpec = parseEventThemeSpec(ev.themePreset);
  const evVars = resolveEventThemeVars(evSpec);
  const locationLabel = getLocationLabel(ev);
  const eventTypeLabel = EVENT_TYPE_LABELS[ev.eventType] || "Agenda Komunitas";
  const rsvpBadge = getRsvpBadgeMeta(ev.userRsvpStatus);
  const excerpt = eventDescriptionToPlainExcerpt(ev.description);

  return (
    <article className="group relative flex items-stretch justify-between gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5 transition-colors hover:border-foreground/30">
      <div className="min-w-0 flex-1 flex flex-col justify-between gap-2.5">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs tabular-nums text-muted-foreground">
            <span
              className="size-2 rounded-full shrink-0 border border-black/10"
              style={{ background: evVars.swatchGradient }}
              aria-hidden="true"
            />
            <span>{formatCardTime(ev.startsAt)}</span>
            <span>·</span>
            <span className="text-foreground font-sans font-medium">
              {ev.calendarName}
            </span>
            {ev.coHosts && ev.coHosts.length > 0 && (
              <span className="font-sans">&amp; {ev.coHosts.length} mitra</span>
            )}
            <span className="rounded bg-[var(--color-paper-2)] border border-border px-1.5 py-0.5 font-sans text-[10px] font-medium text-foreground">
              {eventTypeLabel}
            </span>
            {rsvpBadge && (
              <span
                className={`rounded border px-2 py-0.5 font-sans text-[10px] font-semibold ${rsvpBadge.className}`}
              >
                {rsvpBadge.label}
              </span>
            )}
          </div>

          <h4 className="font-serif text-base sm:text-lg font-bold text-foreground group-hover:text-[var(--color-accent-text)] transition-colors leading-snug line-clamp-2 text-balance">
            <Link
              to="/events/$slug"
              params={{ slug: ev.slug }}
              className="after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-ring rounded-sm"
            >
              {ev.title}
            </Link>
          </h4>

          <p className="text-xs text-muted-foreground line-clamp-1 text-pretty">
            {excerpt}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/60 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 min-w-0">
            {ev.format === "online" ? (
              <Video
                className="size-3.5 text-[var(--color-water)] shrink-0"
                aria-hidden="true"
              />
            ) : (
              <MapPin
                className="size-3.5 text-[var(--color-accent-text)] shrink-0"
                aria-hidden="true"
              />
            )}
            <span className="truncate">{locationLabel}</span>
          </span>

          <div className="flex items-center gap-2">
            <AttendeeAvatarPile ev={ev} maxAvatars={3} />
            <button
              type="button"
              onClick={() => onShare(ev)}
              aria-label={`Bagikan agenda ${ev.title}`}
              title="Bagikan Agenda"
              className="relative z-10 size-11 shrink-0 inline-flex items-center justify-center rounded-xl border border-border bg-background text-foreground hover:bg-muted transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring"
            >
              <Share2 className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <div className="w-28 sm:w-44 aspect-[4/3] shrink-0 self-center overflow-hidden rounded-xl border border-border bg-muted">
        {isUsableAssetUrl(ev.coverUrl) && (
          <img
            src={ev.coverUrl}
            alt={ev.title}
            className={`size-full object-cover ${
              shouldReduceMotion
                ? ""
                : "transition-transform duration-300 group-hover:scale-[1.03]"
            }`}
          />
        )}
      </div>
    </article>
  );
}
