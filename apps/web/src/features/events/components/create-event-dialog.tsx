import * as React from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  BookOpen,
  Calendar as CalendarIcon,
  Camera,
  Check,
  ChevronDown,
  Clock,
  Globe,
  Loader2,
  Lock,
  MapPin,
  Pencil,
  Plus,
  Search,
  Ticket,
  Users,
  Video,
} from "lucide-react";
import type { EventCoHostDto } from "@starter/shared/types";
import {
  detectMeetingPlatform,
  encodeEventThemeSpec,
  getMeetingPlatformMeta,
  parseEventThemeSpec,
  type CreateEventInput,
  type EventThemeSpec,
} from "@starter/shared/validators/community";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { useCatalogBooks } from "@/features/books/hooks";
import { uploadMediaImage } from "@/features/social/api";
import {
  PRESET_EVENT_BANNERS,
  createDefaultEventFormState,
  eventDescriptionToPlainExcerpt,
  formatEventApiError,
  normalizeOptionalHttpUrl,
  type EventTypeOption,
} from "../event-description-doc";
import { useCalendars, useCreateEvent } from "../hooks";
import { EventAtmosphereDock } from "./event-atmosphere-dock";
import { EventCoHostsField } from "./event-cohosts-field";
import { EventDescriptionInlineEditor } from "./event-description-dialog";
import {
  EventAtmosphereBackdrop,
  resolveEventThemeVars,
} from "./event-theme-atmosphere";
import {
  LocationPickerPopover,
  type SelectedLocationState,
} from "./location-picker-popover";

interface CreateEventDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (eventSlug: string) => void;
}

const EVENT_TYPE_OPTIONS: ReadonlyArray<{
  id: EventTypeOption;
  label: string;
}> = [
  { id: "book_club", label: "Klub Buku" },
  { id: "film_discussion", label: "Diskusi Film" },
  { id: "silent_reading", label: "Silent Reading" },
  { id: "book_launch", label: "Peluncuran Buku" },
  { id: "writing_session", label: "Sesi Menulis" },
  { id: "community_meetup", label: "Temu Komunitas" },
];

const INDONESIAN_WEEKDAYS = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
] as const;

const INDONESIAN_MONTHS_SHORT = [
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
] as const;

function formatSchedulePreview(
  startDate: string,
  startTime: string,
  endDate: string,
  endTime: string,
): { label: string; durationLabel: string | null; isInvalid: boolean } {
  const start = new Date(`${startDate}T${startTime}:00+07:00`);
  const end = new Date(`${endDate}T${endTime}:00+07:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return {
      label: "Jadwal belum lengkap",
      durationLabel: null,
      isInvalid: false,
    };
  }

  const diffMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
  const weekday = INDONESIAN_WEEKDAYS[start.getDay()];
  const day = start.getDate();
  const month = INDONESIAN_MONTHS_SHORT[start.getMonth()];

  if (diffMinutes <= 0) {
    return {
      label: `${weekday}, ${day} ${month} · ${startTime} WIB`,
      durationLabel: "Waktu selesai harus setelah waktu mulai",
      isInvalid: true,
    };
  }

  const hours = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;
  const durationParts: string[] = [];
  if (hours > 0) durationParts.push(`${hours} jam`);
  if (mins > 0) durationParts.push(`${mins} mnt`);

  const sameDay = startDate === endDate;
  const timeRange = sameDay
    ? `${startTime}–${endTime} WIB`
    : `${startTime} WIB s.d. ${endDate}`;

  return {
    label: `${weekday}, ${day} ${month} · ${timeRange}`,
    durationLabel: durationParts.join(" "),
    isInvalid: false,
  };
}

export function CreateEventDialog({
  open,
  onClose,
  onSuccess,
}: CreateEventDialogProps) {
  useBodyScrollLock(open);

  if (!open) return null;

  return <CreateEventForm onClose={onClose} onSuccess={onSuccess} />;
}

type CreateEventFormProps = {
  onClose: () => void;
  onSuccess?: (eventSlug: string) => void;
};

function CreateEventForm({ onClose, onSuccess }: CreateEventFormProps) {
  const [defaults] = React.useState(() => createDefaultEventFormState());
  const { data: session } = authClient.useSession();
  const { data: calendars = [] } = useCalendars();
  const createEventMutation = useCreateEvent();

  const userRole = session?.user?.role || "user";
  const managedCalendars = React.useMemo(
    () =>
      calendars.filter(
        (c) =>
          (c.isManager &&
            (c.verificationStatus === "verified" ||
              c.verificationStatus === "trusted")) ||
          userRole === "admin",
      ),
    [calendars, userRole],
  );

  const [mobilePane, setMobilePane] = React.useState<"compose" | "preview">(
    "compose",
  );
  const [selectedCalendarId, setSelectedCalendarId] = React.useState("");
  const [isCalendarMenuOpen, setIsCalendarMenuOpen] = React.useState(false);
  const [isPaymentPopoverOpen, setIsPaymentPopoverOpen] = React.useState(false);
  const [isBookPickerOpen, setIsBookPickerOpen] = React.useState(false);
  const [bookSearch, setBookSearch] = React.useState("");
  const [isUploadingPoster, setIsUploadingPoster] = React.useState(false);

  const [title, setTitle] = React.useState(defaults.title);
  const [coverUrl, setCoverUrl] = React.useState(defaults.coverUrl);
  const [themeSpec, setThemeSpec] = React.useState<EventThemeSpec>(() =>
    parseEventThemeSpec(defaults.themePreset),
  );
  const [visibility, setVisibility] = React.useState<"public" | "private_link">(
    defaults.visibility,
  );
  const [eventType, setEventType] = React.useState<EventTypeOption>(
    defaults.eventType,
  );
  const [categoryTag, setCategoryTag] = React.useState(defaults.categoryTag);

  const [startDate, setStartDate] = React.useState(defaults.startDate);
  const [startTime, setStartTime] = React.useState(defaults.startTime);
  const [endDate, setEndDate] = React.useState(defaults.endDate);
  const [endTime, setEndTime] = React.useState(defaults.endTime);

  const [locationState, setLocationState] =
    React.useState<SelectedLocationState>(defaults.locationState);
  const [onlineMeetingUrl, setOnlineMeetingUrl] = React.useState(
    defaults.onlineMeetingUrl,
  );

  const [description, setDescription] = React.useState(defaults.description);
  const [logisticsNotes, setLogisticsNotes] = React.useState(
    defaults.logisticsNotes,
  );

  const { data: catalogBooksData } = useCatalogBooks({ limit: 50 });
  const booksList = React.useMemo(
    () => catalogBooksData?.data || [],
    [catalogBooksData?.data],
  );

  const [selectedBookId, setSelectedBookId] = React.useState(
    defaults.selectedBookId,
  );
  const [isLinkingWork, setIsLinkingWork] = React.useState(
    defaults.isLinkingWork,
  );
  const [workMediaType, setWorkMediaType] = React.useState<
    "book" | "film" | "article" | "other"
  >(defaults.workMediaType);
  const [workTitle, setWorkTitle] = React.useState(defaults.workTitle);
  const [workCreator, setWorkCreator] = React.useState(defaults.workCreator);
  const [workUrl, setWorkUrl] = React.useState(defaults.workUrl);

  const [coHosts, setCoHosts] = React.useState<EventCoHostDto[]>(
    defaults.coHosts,
  );
  const [requiresApproval, setRequiresApproval] = React.useState(
    defaults.requiresApproval,
  );
  const [isUnlimitedCapacity, setIsUnlimitedCapacity] = React.useState(
    defaults.isUnlimitedCapacity,
  );
  const [capacityInput, setCapacityInput] = React.useState<string>(
    String(defaults.capacity),
  );
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const formScrollRef = React.useRef<HTMLFormElement | null>(null);
  const errorBannerRef = React.useRef<HTMLDivElement | null>(null);
  const calendarMenuRef = React.useRef<HTMLDivElement | null>(null);

  const reportFormError = React.useCallback((message: string) => {
    setErrorMsg(message);
    setMobilePane("compose");
    requestAnimationFrame(() => {
      formScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      errorBannerRef.current?.focus();
    });
  }, []);

  const effectiveCalendarId =
    selectedCalendarId || managedCalendars[0]?.id || "";
  const activeCalendar = managedCalendars.find(
    (c) => c.id === effectiveCalendarId,
  );

  const filteredBooks = React.useMemo(() => {
    const query = bookSearch.trim().toLowerCase();
    if (!query) return booksList;
    return booksList.filter(
      (b) =>
        b.title.toLowerCase().includes(query) ||
        b.author.toLowerCase().includes(query),
    );
  }, [bookSearch, booksList]);

  const selectedBook = booksList.find((b) => b.id === selectedBookId);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (isCalendarMenuOpen) {
        setIsCalendarMenuOpen(false);
        return;
      }
      if (isBookPickerOpen) {
        setIsBookPickerOpen(false);
        return;
      }
      if (isPaymentPopoverOpen) {
        setIsPaymentPopoverOpen(false);
        return;
      }
      onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isBookPickerOpen, isCalendarMenuOpen, isPaymentPopoverOpen, onClose]);

  React.useEffect(() => {
    if (!isCalendarMenuOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (
        calendarMenuRef.current &&
        target &&
        !calendarMenuRef.current.contains(target)
      ) {
        setIsCalendarMenuOpen(false);
      }
    };
    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [isCalendarMenuOpen]);

  const handlePosterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setErrorMsg(null);
    setIsUploadingPoster(true);
    try {
      const uploaded = await uploadMediaImage(file);
      setCoverUrl(uploaded.url);
    } catch {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const maxDim = 800;
          let width = img.width;
          let height = img.height;

          if (width > height && width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            setCoverUrl(canvas.toDataURL("image/jpeg", 0.8));
          }
        };
        img.src = String(event.target?.result || "");
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingPoster(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!effectiveCalendarId) {
      reportFormError(
        "Pilih atau buat kalender komunitas Anda untuk acara ini.",
      );
      return;
    }
    if (title.trim().length < 3) {
      reportFormError("Nama acara minimal 3 karakter.");
      return;
    }

    const activeFormat = locationState.format;
    const rawMeetingUrl =
      onlineMeetingUrl.trim() || locationState.onlineMeetingUrl?.trim() || "";
    const normalizedMeetingUrl = normalizeOptionalHttpUrl(rawMeetingUrl);
    const hasPhysicalVenue = Boolean(
      locationState.venueName?.trim() || locationState.venueAddress?.trim(),
    );

    if (activeFormat === "offline" && !hasPhysicalVenue) {
      reportFormError("Pilih atau ketik lokasi tempat untuk acara tatap muka.");
      return;
    }
    if (activeFormat === "online" && !rawMeetingUrl) {
      reportFormError(
        "Masukkan tautan Google Meet, Zoom, atau ruang rapat untuk acara daring.",
      );
      return;
    }
    if (activeFormat === "hybrid" && (!hasPhysicalVenue || !rawMeetingUrl)) {
      reportFormError(
        "Acara hibrida memerlukan lokasi tatap muka sekaligus tautan rapat virtual.",
      );
      return;
    }
    if (activeFormat !== "offline" && rawMeetingUrl && !normalizedMeetingUrl) {
      reportFormError(
        "Tautan rapat virtual tidak valid. Contoh: https://meet.google.com/nama-ruang",
      );
      return;
    }
    if (description.trim().length < 10) {
      reportFormError(
        "Deskripsi acara minimal 10 karakter. Klik 'Tambahkan Deskripsi Acara' untuk mengisi.",
      );
      return;
    }

    const startIso = new Date(
      `${startDate}T${startTime}:00+07:00`,
    ).toISOString();
    const endIso = new Date(`${endDate}T${endTime}:00+07:00`).toISOString();

    if (new Date(endIso) <= new Date(startIso)) {
      reportFormError("Waktu selesai harus setelah waktu mulai.");
      return;
    }

    const normalizedWorkUrl = workUrl.trim()
      ? normalizeOptionalHttpUrl(workUrl)
      : undefined;
    if (isLinkingWork && workUrl.trim() && !normalizedWorkUrl) {
      reportFormError(
        "Tautan referensi karya harus berupa alamat web yang valid (https://...).",
      );
      return;
    }

    const parsedCapacity = Math.min(
      10000,
      Math.max(1, Number.parseInt(capacityInput, 10) || 1),
    );

    try {
      const payload: CreateEventInput = {
        calendarId: effectiveCalendarId,
        bookId: selectedBookId || undefined,
        title: title.trim(),
        description: description.trim(),
        logisticsNotes: logisticsNotes.trim() || undefined,
        coverUrl,
        themePreset: encodeEventThemeSpec(themeSpec),
        visibility,
        eventType,
        categoryTag: categoryTag.trim() || "Literasi",
        format: activeFormat,
        venueName:
          activeFormat !== "online"
            ? locationState.venueName?.trim() || undefined
            : undefined,
        venueAddress:
          activeFormat !== "online"
            ? locationState.venueAddress?.trim() || undefined
            : undefined,
        city:
          activeFormat !== "online"
            ? locationState.city?.trim() || undefined
            : undefined,
        district:
          activeFormat !== "online"
            ? locationState.district?.trim() || undefined
            : undefined,
        latitude:
          activeFormat !== "online" ? locationState.latitude : undefined,
        longitude:
          activeFormat !== "online" ? locationState.longitude : undefined,
        onlineMeetingUrl:
          activeFormat !== "offline" ? normalizedMeetingUrl : undefined,
        hideAddressUntilApproved:
          activeFormat !== "online"
            ? locationState.hideAddressUntilApproved
            : false,
        startsAt: startIso,
        endsAt: endIso,
        timezone: "Asia/Jakarta",
        capacity: isUnlimitedCapacity ? undefined : parsedCapacity,
        requiresApproval,
        allowWaitlist: true,
        coHosts,
      };

      if (isLinkingWork && workTitle.trim()) {
        payload.featuredWork = {
          mediaType: workMediaType,
          title: workTitle.trim(),
          creator: workCreator.trim() || undefined,
          externalUrl: normalizedWorkUrl,
        };
      }

      const res = await createEventMutation.mutateAsync(payload);
      onClose();
      onSuccess?.(res.slug);
    } catch (err: unknown) {
      reportFormError(formatEventApiError(err, "Gagal membuat acara."));
    }
  };

  const themeVars = resolveEventThemeVars(themeSpec);
  const currentEventType =
    EVENT_TYPE_OPTIONS.find((item) => item.id === eventType) ||
    EVENT_TYPE_OPTIONS[0];
  const descriptionExcerpt = eventDescriptionToPlainExcerpt(description);
  const effectiveMeetingUrl =
    onlineMeetingUrl || locationState.onlineMeetingUrl || "";
  const normalizedPreviewMeeting =
    normalizeOptionalHttpUrl(effectiveMeetingUrl);
  const detectedMeetingPlatform = detectMeetingPlatform(
    normalizedPreviewMeeting || effectiveMeetingUrl,
  );
  const previewPlatformMeta = getMeetingPlatformMeta(detectedMeetingPlatform);
  const hasVenue = Boolean(
    locationState.venueName?.trim() || locationState.venueAddress?.trim(),
  );
  const hasMeeting = Boolean(normalizedPreviewMeeting);
  const schedule = formatSchedulePreview(
    startDate,
    startTime,
    endDate,
    endTime,
  );

  const isTitleReady = title.trim().length >= 3;
  const isScheduleReady =
    !schedule.isInvalid && Boolean(schedule.durationLabel);
  const isLocationReady =
    locationState.format === "online"
      ? hasMeeting
      : locationState.format === "hybrid"
        ? hasVenue && hasMeeting
        : hasVenue;
  const isDescriptionReady = description.trim().length >= 10;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col text-foreground ${themeVars.darkClass}`}
      style={{ ...themeVars.backdropStyle, overscrollBehavior: "contain" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-event-dialog-title"
    >
      <EventAtmosphereBackdrop spec={themeSpec} variant="studio" />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <header
          style={themeVars.glassElevatedStyle}
          className="evt-glass-elevated relative z-40 shrink-0 border-b px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3"
        >
          <div className="mx-auto flex max-w-[1380px] items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup dialog buat acara"
                style={{
                  backgroundColor: "var(--evt-control-bg, var(--background))",
                  borderColor: "var(--evt-border-subtle, var(--border))",
                }}
                className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border px-2.5 sm:px-3 text-xs font-medium text-foreground hover:border-foreground/30 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring"
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">Kembali</span>
              </button>

              <div className="h-5 w-px bg-border hidden sm:block" />

              <div className="flex items-center gap-2 min-w-0">
                <CalendarIcon
                  className="size-4 text-[var(--color-accent)] shrink-0 hidden sm:block"
                  aria-hidden="true"
                />
                <h1
                  id="create-event-dialog-title"
                  className="font-serif text-sm sm:text-lg font-bold text-foreground truncate"
                >
                  Buat Acara Baru
                </h1>
              </div>

              <div ref={calendarMenuRef} className="relative hidden md:block">
                <button
                  type="button"
                  onClick={() => setIsCalendarMenuOpen(!isCalendarMenuOpen)}
                  aria-expanded={isCalendarMenuOpen}
                  aria-haspopup="menu"
                  aria-label="Pilih kalender penyelenggara"
                  style={{
                    backgroundColor: "var(--evt-control-bg, var(--background))",
                    borderColor: "var(--evt-border-subtle, var(--border))",
                  }}
                  className="min-h-11 flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium text-foreground hover:border-foreground/30 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <span
                    className="size-2 rounded-full bg-[var(--color-accent)] shrink-0"
                    aria-hidden="true"
                  />
                  <span className="max-w-[210px] truncate">
                    {activeCalendar
                      ? activeCalendar.name
                      : "Pilih Kalender Komunitas"}
                  </span>
                  <ChevronDown
                    className={`size-3.5 text-muted-foreground shrink-0 transition-transform duration-150 ${
                      isCalendarMenuOpen ? "rotate-180" : ""
                    }`}
                    aria-hidden="true"
                  />
                </button>

                {isCalendarMenuOpen && (
                  <div
                    role="menu"
                    aria-label="Daftar kalender kelolaan"
                    className="absolute left-0 top-12 z-50 w-72 rounded-2xl border border-border bg-popover p-1.5 text-popover-foreground shadow-xl"
                    style={{ overscrollBehavior: "contain" }}
                  >
                    <div className="px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                      Kalender Kelolaan Anda
                    </div>
                    {managedCalendars.length === 0 ? (
                      <div className="p-2.5 text-xs text-muted-foreground">
                        Anda belum memiliki kalender komunitas terverifikasi.
                      </div>
                    ) : (
                      <div
                        data-lenis-prevent
                        className="max-h-60 overflow-y-auto space-y-0.5 pr-0.5"
                      >
                        {managedCalendars.map((cal) => (
                          <button
                            key={cal.id}
                            type="button"
                            role="menuitemradio"
                            aria-checked={effectiveCalendarId === cal.id}
                            onClick={() => {
                              setSelectedCalendarId(cal.id);
                              setIsCalendarMenuOpen(false);
                            }}
                            className={`flex w-full min-h-11 items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs transition-colors cursor-pointer ${
                              effectiveCalendarId === cal.id
                                ? "bg-[var(--color-accent-soft)] text-foreground font-semibold"
                                : "text-foreground hover:bg-muted"
                            }`}
                          >
                            <span className="truncate">{cal.name}</span>
                            {effectiveCalendarId === cal.id && (
                              <Check className="size-3.5 text-[var(--color-accent)] shrink-0" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="mt-1 border-t border-border pt-1 space-y-0.5">
                      {activeCalendar && (
                        <Link
                          to="/c/$slug"
                          params={{ slug: activeCalendar.slug }}
                          onClick={() => {
                            setIsCalendarMenuOpen(false);
                            onClose();
                          }}
                          className="flex w-full min-h-11 items-center gap-1.5 rounded-xl px-2.5 py-2 text-left text-xs font-medium text-foreground hover:bg-muted transition-colors"
                        >
                          <Plus
                            className="size-3.5 text-[var(--color-accent)]"
                            aria-hidden="true"
                          />
                          <span>Kelola Host &amp; Pengurus Komunitas</span>
                        </Link>
                      )}
                      <Link
                        to="/partner-program"
                        onClick={() => {
                          setIsCalendarMenuOpen(false);
                          onClose();
                        }}
                        className="flex w-full min-h-11 items-center gap-1.5 rounded-xl px-2.5 py-2 text-left text-xs font-semibold text-[var(--color-accent)] hover:bg-muted transition-colors"
                      >
                        <Plus className="size-3.5" aria-hidden="true" />
                        <span>Daftarkan Komunitas (Partner Program)</span>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 ml-auto">
              <div
                className="hidden xl:flex items-center gap-3 text-xs text-muted-foreground"
                aria-label="Kesiapan penerbitan"
              >
                <ReadinessStep label="Judul" done={isTitleReady} />
                <ReadinessStep label="Jadwal" done={isScheduleReady} />
                <ReadinessStep label="Lokasi" done={isLocationReady} />
                <ReadinessStep label="Deskripsi" done={isDescriptionReady} />
              </div>

              <Button
                type="submit"
                form="create-event-studio-form"
                disabled={createEventMutation.isPending || !effectiveCalendarId}
                style={themeVars.ctaPrimaryStyle}
                className="min-h-11 rounded-xl font-semibold text-xs sm:text-sm px-5 hover:opacity-90 cursor-pointer disabled:opacity-50"
              >
                {createEventMutation.isPending
                  ? "Menerbitkan Acara..."
                  : "Buat Acara"}
              </Button>
            </div>
          </div>
        </header>

        <div
          style={themeVars.glassElevatedStyle}
          className="evt-glass-elevated shrink-0 border-b px-4 py-2 lg:hidden"
        >
          <div
            role="tablist"
            aria-label="Mode tampilan studio acara"
            style={{
              backgroundColor: "var(--evt-control-bg, var(--background))",
              borderColor: "var(--evt-border-subtle, var(--border))",
            }}
            className="inline-flex w-full rounded-xl border p-1 text-xs"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mobilePane === "compose"}
              onClick={() => setMobilePane("compose")}
              className={`min-h-11 flex-1 rounded-lg font-medium transition-colors cursor-pointer ${
                mobilePane === "compose"
                  ? "bg-card text-foreground font-semibold border border-border shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Susun Lembar
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mobilePane === "preview"}
              onClick={() => setMobilePane("preview")}
              className={`min-h-11 flex-1 rounded-lg font-medium transition-colors cursor-pointer ${
                mobilePane === "preview"
                  ? "bg-card text-foreground font-semibold border border-border shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Pratinjau Undangan
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          <div className="mx-auto grid h-full w-full max-w-[1380px] grid-cols-1 lg:grid-cols-[minmax(0,1fr)_390px] xl:grid-cols-[minmax(0,1fr)_420px]">
            <form
              ref={formScrollRef}
              id="create-event-studio-form"
              noValidate
              onSubmit={handleSubmit}
              data-lenis-prevent
              className={`h-full overflow-y-auto px-4 sm:px-8 lg:px-10 py-6 ${
                mobilePane === "compose" ? "block" : "hidden lg:block"
              }`}
              style={{ overscrollBehavior: "contain" }}
            >
              <div className="mx-auto max-w-2xl space-y-5 pb-6">
                {errorMsg && (
                  <div
                    ref={errorBannerRef}
                    tabIndex={-1}
                    role="alert"
                    className="rounded-2xl border border-[var(--color-error)]/40 bg-[var(--color-error-soft)] p-4 text-xs font-medium text-[var(--color-error)] outline-none"
                  >
                    {errorMsg}
                  </div>
                )}

                <section
                  style={themeVars.glassSurfaceStyle}
                  className="evt-glass rounded-2xl border p-5 sm:p-6 space-y-5"
                >
                  {managedCalendars.length > 0 && (
                    <div className="md:hidden space-y-1.5">
                      <span className="block text-xs font-mono text-muted-foreground">
                        Penyelenggara
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {managedCalendars.map((cal) => {
                          const active = effectiveCalendarId === cal.id;
                          return (
                            <button
                              key={cal.id}
                              type="button"
                              aria-pressed={active}
                              onClick={() => setSelectedCalendarId(cal.id)}
                              className={`min-h-10 rounded-lg border px-3 text-xs font-medium transition-colors cursor-pointer ${
                                active
                                  ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-foreground font-semibold"
                                  : "border-border bg-background/60 text-muted-foreground"
                              }`}
                            >
                              {cal.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label
                      htmlFor="create-event-title"
                      className="block text-xs font-mono text-muted-foreground"
                    >
                      Judul Acara
                    </label>
                    <input
                      id="create-event-title"
                      type="text"
                      required
                      autoFocus
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Nama Acara"
                      style={{
                        fontFamily: themeVars.fontFamily,
                        borderColor: "var(--evt-border-subtle, var(--border))",
                      }}
                      className="w-full min-h-12 bg-transparent border-b pb-2.5 text-2xl sm:text-3xl font-bold text-foreground placeholder:text-muted-foreground/55 focus:border-[var(--color-accent)] outline-none transition-colors"
                    />
                  </div>

                  <div className="space-y-2">
                    <span className="block text-xs font-medium text-foreground">
                      Jenis Acara
                    </span>
                    <div
                      role="radiogroup"
                      aria-label="Jenis acara"
                      className="flex flex-wrap gap-2"
                    >
                      {EVENT_TYPE_OPTIONS.map((item) => {
                        const active = eventType === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => setEventType(item.id)}
                            className={`min-h-11 rounded-xl border px-3.5 text-xs font-medium transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring ${
                              active
                                ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-foreground font-semibold"
                                : "border-[var(--evt-border-subtle,var(--border))] bg-[var(--evt-control-bg,var(--background))] text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div className="space-y-1.5">
                      <span className="block text-xs font-medium text-foreground">
                        Visibilitas Halaman
                      </span>
                      <div
                        role="group"
                        aria-label="Visibilitas acara"
                        style={{
                          backgroundColor:
                            "var(--evt-control-bg, var(--background))",
                          borderColor:
                            "var(--evt-border-subtle, var(--border))",
                        }}
                        className="inline-flex w-full rounded-xl border p-1 text-xs"
                      >
                        <button
                          type="button"
                          aria-pressed={visibility === "public"}
                          onClick={() => setVisibility("public")}
                          className={`min-h-11 flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 font-medium transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring ${
                            visibility === "public"
                              ? "bg-card text-foreground font-semibold border border-border shadow-xs"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <Globe className="size-3.5" aria-hidden="true" />
                          <span>Publik</span>
                        </button>
                        <button
                          type="button"
                          aria-pressed={visibility === "private_link"}
                          onClick={() => setVisibility("private_link")}
                          className={`min-h-11 flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 font-medium transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring ${
                            visibility === "private_link"
                              ? "bg-card text-foreground font-semibold border border-border shadow-xs"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <Lock className="size-3.5" aria-hidden="true" />
                          <span>Tautan Pribadi</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label
                        htmlFor="create-event-tag"
                        className="block text-xs font-medium text-foreground"
                      >
                        Tag Topik
                      </label>
                      <Input
                        id="create-event-tag"
                        value={categoryTag}
                        onChange={(e) => setCategoryTag(e.target.value)}
                        placeholder="Literasi"
                        className="h-12 bg-[var(--evt-control-bg,var(--background))] border-[var(--evt-border-subtle,var(--border))] text-xs"
                      />
                    </div>
                  </div>
                </section>

                <section
                  style={themeVars.glassSurfaceStyle}
                  className="evt-glass rounded-2xl border p-5 sm:p-6 space-y-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-serif text-lg font-bold text-foreground">
                      Jadwal &amp; Tempat
                    </h2>
                    <div className="flex items-center gap-2 font-mono text-xs">
                      {schedule.durationLabel && (
                        <span
                          className={`rounded-lg px-2.5 py-1 border ${
                            schedule.isInvalid
                              ? "border-[var(--color-error)]/40 bg-[var(--color-error-soft)] text-[var(--color-error)]"
                              : "border-[var(--evt-border-subtle,var(--border))] bg-[var(--evt-control-bg,var(--background))] text-foreground"
                          }`}
                        >
                          {schedule.durationLabel}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Clock className="size-3.5" aria-hidden="true" />
                        GMT+07:00 WIB
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <span className="block text-xs font-medium text-foreground">
                        Waktu Mulai
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          aria-label="Tanggal mulai"
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="h-11 min-w-0 flex-1 rounded-xl border border-[var(--evt-border-subtle,var(--border))] bg-[var(--evt-control-bg,var(--background))] px-3 text-xs text-foreground cursor-pointer focus-visible:outline-2 focus-visible:outline-ring"
                        />
                        <input
                          aria-label="Jam mulai"
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="h-11 w-28 shrink-0 rounded-xl border border-[var(--evt-border-subtle,var(--border))] bg-[var(--evt-control-bg,var(--background))] px-2.5 text-xs font-mono text-foreground cursor-pointer focus-visible:outline-2 focus-visible:outline-ring"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <span className="block text-xs font-medium text-foreground">
                        Waktu Selesai
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          aria-label="Tanggal selesai"
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="h-11 min-w-0 flex-1 rounded-xl border border-[var(--evt-border-subtle,var(--border))] bg-[var(--evt-control-bg,var(--background))] px-3 text-xs text-foreground cursor-pointer focus-visible:outline-2 focus-visible:outline-ring"
                        />
                        <input
                          aria-label="Jam selesai"
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="h-11 w-28 shrink-0 rounded-xl border border-[var(--evt-border-subtle,var(--border))] bg-[var(--evt-control-bg,var(--background))] px-2.5 text-xs font-mono text-foreground cursor-pointer focus-visible:outline-2 focus-visible:outline-ring"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <span className="block text-xs font-medium text-foreground">
                        Format Pertemuan
                      </span>
                      <div
                        role="radiogroup"
                        aria-label="Format pertemuan acara"
                        style={{
                          backgroundColor:
                            "var(--evt-control-bg, var(--background))",
                          borderColor:
                            "var(--evt-border-subtle, var(--border))",
                        }}
                        className="inline-flex w-full rounded-xl border p-1 text-xs"
                      >
                        {(
                          [
                            { id: "offline", label: "Tatap Muka" },
                            { id: "online", label: "Daring" },
                            { id: "hybrid", label: "Hibrida" },
                          ] as const
                        ).map((opt) => {
                          const active = locationState.format === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              role="radio"
                              aria-checked={active}
                              onClick={() =>
                                setLocationState((prev) => ({
                                  ...prev,
                                  format: opt.id,
                                }))
                              }
                              className={`min-h-11 flex-1 rounded-lg px-3 font-medium transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring ${
                                active
                                  ? "bg-card text-foreground font-semibold border border-border shadow-xs"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {locationState.format !== "online" && (
                      <LocationPickerPopover
                        variant="ruled"
                        value={locationState}
                        onChange={setLocationState}
                      />
                    )}

                    {locationState.format !== "offline" && (
                      <div
                        style={{
                          backgroundColor:
                            "var(--evt-control-bg, var(--background))",
                          borderColor:
                            "var(--evt-border-subtle, var(--border))",
                        }}
                        className="rounded-xl border p-4 space-y-3 text-xs"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <label
                            htmlFor="create-event-meeting-url"
                            className="flex items-center gap-1.5 font-semibold text-foreground"
                          >
                            <Video
                              className="size-4 text-[var(--color-water)]"
                              aria-hidden="true"
                            />
                            <span>Ruang Rapat Virtual</span>
                          </label>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                const url =
                                  "https://meet.google.com/anzabook-diskusi";
                                setOnlineMeetingUrl(url);
                                setLocationState((prev) => ({
                                  ...prev,
                                  onlineMeetingUrl: url,
                                }));
                              }}
                              className="min-h-9 rounded-lg border border-[var(--evt-border-subtle,var(--border))] bg-card px-2.5 text-[11px] font-medium text-foreground hover:border-[var(--color-accent)] transition-colors cursor-pointer"
                            >
                              + Google Meet
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const url =
                                  "https://zoom.us/j/anzabook-session";
                                setOnlineMeetingUrl(url);
                                setLocationState((prev) => ({
                                  ...prev,
                                  onlineMeetingUrl: url,
                                }));
                              }}
                              className="min-h-9 rounded-lg border border-[var(--evt-border-subtle,var(--border))] bg-card px-2.5 text-[11px] font-medium text-foreground hover:border-[var(--color-accent)] transition-colors cursor-pointer"
                            >
                              + Zoom
                            </button>
                          </div>
                        </div>

                        <Input
                          id="create-event-meeting-url"
                          type="text"
                          inputMode="url"
                          autoCorrect="off"
                          autoCapitalize="none"
                          spellCheck={false}
                          value={effectiveMeetingUrl}
                          onChange={(e) => {
                            const val = e.target.value;
                            setOnlineMeetingUrl(val);
                            setLocationState((prev) => ({
                              ...prev,
                              onlineMeetingUrl: val,
                            }));
                          }}
                          placeholder="Tempel tautan Google Meet, Zoom, atau ruang virtual..."
                          className="h-11 bg-card border-border text-xs"
                        />

                        {hasMeeting ? (
                          <div className="flex items-center gap-2 rounded-lg border border-[var(--evt-border-subtle,var(--border))] bg-card px-3 py-2 text-[11px] text-foreground">
                            <Check
                              className="size-3.5 text-[var(--color-green)] shrink-0"
                              aria-hidden="true"
                            />
                            <span>
                              Terdeteksi{" "}
                              <strong>{previewPlatformMeta.label}</strong>:
                              peserta hanya melihat tombol{" "}
                              <strong>{previewPlatformMeta.ctaLabel}</strong>{" "}
                              tanpa alamat URL mentah.
                            </span>
                          </div>
                        ) : (
                          <p className="text-[11px] text-muted-foreground">
                            Alamat URL disimpan aman di balik tombol platform
                            (misalnya Buka Google Meet atau Gabung via Zoom).
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </section>

                <section
                  style={themeVars.glassSurfaceStyle}
                  className="evt-glass rounded-2xl border p-5 sm:p-6 space-y-4"
                >
                  <div>
                    <h2 className="font-serif text-lg font-bold text-foreground">
                      Deskripsi &amp; Susunan Acara
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Jelaskan topik pembahasan dan hal yang perlu diketahui
                      peserta.
                    </p>
                  </div>

                  <EventDescriptionInlineEditor
                    value={description}
                    onChange={setDescription}
                  />
                </section>

                <section
                  style={themeVars.glassSurfaceStyle}
                  className="evt-glass rounded-2xl border p-5 sm:p-6 space-y-5 text-xs"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <BookOpen
                          className="size-4 text-[var(--color-accent)] shrink-0"
                          aria-hidden="true"
                        />
                        <span className="font-medium text-foreground">
                          Kaitkan Karya (Buku, Film, atau Artikel)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsLinkingWork(!isLinkingWork)}
                        className="min-h-11 px-2 text-xs text-[var(--color-accent)] hover:underline font-semibold cursor-pointer focus-visible:outline-2 focus-visible:outline-ring"
                      >
                        {isLinkingWork ? "Tutup" : "+ Kaitkan"}
                      </button>
                    </div>

                    {isLinkingWork && (
                      <div className="space-y-3 border-t border-[var(--evt-border-subtle,var(--border))] pt-3">
                        <div className="flex flex-wrap gap-2">
                          {(["book", "film", "article", "other"] as const).map(
                            (mt) => (
                              <button
                                key={mt}
                                type="button"
                                onClick={() => {
                                  setWorkMediaType(mt);
                                  if (mt !== "book") setSelectedBookId("");
                                }}
                                className={`min-h-11 rounded-xl border px-3 text-xs font-medium capitalize cursor-pointer focus-visible:outline-2 focus-visible:outline-ring ${
                                  workMediaType === mt
                                    ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-foreground font-semibold"
                                    : "border-[var(--evt-border-subtle,var(--border))] bg-[var(--evt-control-bg,var(--background))] text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                {mt === "book"
                                  ? "Buku"
                                  : mt === "film"
                                    ? "Film"
                                    : mt === "article"
                                      ? "Artikel"
                                      : "Lainnya"}
                              </button>
                            ),
                          )}
                        </div>

                        {workMediaType === "book" && (
                          <div className="relative space-y-1.5">
                            <span className="text-xs font-medium text-foreground block">
                              Pilih Buku Katalog AnzaBook (Auto-Unlock Sampel)
                            </span>
                            <button
                              type="button"
                              aria-expanded={isBookPickerOpen}
                              onClick={() =>
                                setIsBookPickerOpen((prev) => !prev)
                              }
                              className="flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-[var(--evt-border-subtle,var(--border))] bg-[var(--evt-control-bg,var(--background))] px-3 text-left text-xs text-foreground hover:border-foreground/30 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring"
                            >
                              <span className="truncate">
                                {selectedBook
                                  ? `${selectedBook.title} (${selectedBook.author})`
                                  : "Pilih buku dari katalog (opsional)"}
                              </span>
                              <ChevronDown
                                className={`size-3.5 shrink-0 text-muted-foreground transition-transform ${
                                  isBookPickerOpen ? "rotate-180" : ""
                                }`}
                                aria-hidden="true"
                              />
                            </button>

                            {isBookPickerOpen && (
                              <div className="rounded-xl border border-border bg-popover p-2 text-popover-foreground shadow-xl space-y-2">
                                <div className="flex items-center gap-2 rounded-lg border border-border bg-background/60 px-2.5">
                                  <Search
                                    className="size-3.5 text-muted-foreground shrink-0"
                                    aria-hidden="true"
                                  />
                                  <input
                                    type="text"
                                    value={bookSearch}
                                    onChange={(e) =>
                                      setBookSearch(e.target.value)
                                    }
                                    placeholder="Cari judul buku atau penulis..."
                                    aria-label="Cari buku katalog"
                                    className="h-9 w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none"
                                    autoFocus
                                  />
                                </div>

                                <div className="max-h-48 overflow-y-auto space-y-0.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedBookId("");
                                      setIsBookPickerOpen(false);
                                    }}
                                    className="flex w-full min-h-10 items-center rounded-lg px-2.5 text-left text-xs text-muted-foreground hover:bg-muted cursor-pointer"
                                  >
                                    Tanpa buku katalog
                                  </button>
                                  {filteredBooks.map((b) => (
                                    <button
                                      key={b.id}
                                      type="button"
                                      onClick={() => {
                                        setSelectedBookId(b.id);
                                        setWorkTitle(b.title);
                                        setWorkCreator(b.author);
                                        setIsBookPickerOpen(false);
                                      }}
                                      className={`flex w-full min-h-10 items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors cursor-pointer ${
                                        selectedBookId === b.id
                                          ? "bg-[var(--color-accent-soft)] font-semibold text-foreground"
                                          : "text-foreground hover:bg-muted"
                                      }`}
                                    >
                                      <span className="truncate">
                                        {b.title}{" "}
                                        <span className="text-muted-foreground font-normal">
                                          ({b.author})
                                        </span>
                                      </span>
                                      {selectedBookId === b.id && (
                                        <Check className="size-3.5 text-[var(--color-accent)] shrink-0" />
                                      )}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <Input
                            value={workTitle}
                            onChange={(e) => setWorkTitle(e.target.value)}
                            placeholder="Judul karya (misal: Laut Bercerita)"
                            className="h-11 bg-[var(--evt-control-bg,var(--background))] border-[var(--evt-border-subtle,var(--border))] text-xs"
                          />
                          <Input
                            value={workCreator}
                            onChange={(e) => setWorkCreator(e.target.value)}
                            placeholder="Penulis atau sutradara"
                            className="h-11 bg-[var(--evt-control-bg,var(--background))] border-[var(--evt-border-subtle,var(--border))] text-xs"
                          />
                        </div>

                        <Input
                          value={workUrl}
                          onChange={(e) => setWorkUrl(e.target.value)}
                          type="text"
                          inputMode="url"
                          autoCorrect="off"
                          autoCapitalize="none"
                          spellCheck={false}
                          placeholder="Tautan referensi (https://...)"
                          className="h-11 bg-[var(--evt-control-bg,var(--background))] border-[var(--evt-border-subtle,var(--border))] text-xs"
                        />
                      </div>
                    )}
                  </div>

                  <div className="border-t border-[var(--evt-border-subtle,var(--border))] pt-5">
                    <EventCoHostsField
                      variant="ruled"
                      coHosts={coHosts}
                      onChange={setCoHosts}
                      calendarSlug={activeCalendar?.slug}
                      calendars={calendars}
                    />
                  </div>

                  <div className="border-t border-[var(--evt-border-subtle,var(--border))] pt-5 space-y-4">
                    <h2 className="font-serif text-lg font-bold text-foreground">
                      Pendaftaran &amp; Logistik
                    </h2>

                    <div className="divide-y divide-[var(--evt-border-subtle,var(--border))] border-y border-[var(--evt-border-subtle,var(--border))]">
                      <div
                        className="relative flex items-center justify-between gap-3 py-3.5"
                        onKeyDown={(e) => {
                          if (e.key === "Escape" && isPaymentPopoverOpen) {
                            e.stopPropagation();
                            setIsPaymentPopoverOpen(false);
                          }
                        }}
                      >
                        <div>
                          <span className="font-medium text-foreground block">
                            Harga Tiket
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            Pengaturan biaya masuk acara komunitas
                          </span>
                        </div>

                        <button
                          type="button"
                          aria-expanded={isPaymentPopoverOpen}
                          aria-controls="ticket-coming-soon-popover"
                          onClick={() =>
                            setIsPaymentPopoverOpen(!isPaymentPopoverOpen)
                          }
                          className="min-h-11 flex items-center gap-1.5 rounded-xl border border-[var(--evt-border-subtle,var(--border))] bg-[var(--evt-control-bg,var(--background))] px-3 text-foreground hover:border-foreground/30 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring"
                        >
                          <span className="font-medium">Gratis</span>
                          <Pencil
                            className="size-3.5 text-muted-foreground"
                            aria-hidden="true"
                          />
                        </button>

                        {isPaymentPopoverOpen && (
                          <div
                            id="ticket-coming-soon-popover"
                            role="region"
                            aria-label="Informasi Tiket Acara"
                            className="absolute right-0 bottom-14 sm:bottom-auto sm:top-14 z-30 w-80 max-w-full rounded-2xl border border-border bg-popover p-5 text-popover-foreground shadow-2xl"
                            style={{ overscrollBehavior: "contain" }}
                          >
                            <div className="mb-3 flex items-center justify-between">
                              <div className="flex size-10 items-center justify-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                                <Ticket className="size-5" aria-hidden="true" />
                              </div>
                              <span className="rounded-md border border-[var(--color-accent)]/40 bg-[var(--color-accent-soft)] px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-foreground">
                                Coming Soon
                              </span>
                            </div>
                            <h4 className="font-serif text-sm font-bold text-foreground mb-1.5">
                              Tiket Acara Berbayar
                            </h4>
                            <p className="text-xs leading-relaxed text-muted-foreground mb-4">
                              Saat ini seluruh acara komunitas bersifat gratis.
                              Fitur penjualan tiket berbayar sedang disiapkan
                              (Coming Soon).
                            </p>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setIsPaymentPopoverOpen(false)}
                              className="w-full min-h-11"
                            >
                              Mengerti
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-4 py-3.5">
                        <div>
                          <span className="font-medium text-foreground block">
                            Memerlukan Persetujuan
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            Host menyetujui pendaftar sebelum alamat dan tiket
                            dibuka
                          </span>
                        </div>
                        <label className="min-h-11 min-w-11 flex items-center justify-end cursor-pointer">
                          <input
                            type="checkbox"
                            aria-label="Memerlukan persetujuan host"
                            checked={requiresApproval}
                            onChange={(e) =>
                              setRequiresApproval(e.target.checked)
                            }
                            className="size-5 accent-[var(--color-accent)] cursor-pointer"
                          />
                        </label>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 py-3.5">
                        <div>
                          <span className="font-medium text-foreground block">
                            Kapasitas Kursi
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            Batas jumlah peserta yang dapat mendaftar
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <div
                            role="group"
                            aria-label="Mode kapasitas peserta"
                            style={{
                              backgroundColor:
                                "var(--evt-control-bg, var(--background))",
                              borderColor:
                                "var(--evt-border-subtle, var(--border))",
                            }}
                            className="inline-flex rounded-xl border p-1 text-xs"
                          >
                            <button
                              type="button"
                              aria-pressed={isUnlimitedCapacity}
                              onClick={() => setIsUnlimitedCapacity(true)}
                              className={`min-h-10 rounded-lg px-3 font-medium transition-colors cursor-pointer ${
                                isUnlimitedCapacity
                                  ? "bg-card text-foreground font-semibold border border-border shadow-xs"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              Tak terbatas
                            </button>
                            <button
                              type="button"
                              aria-pressed={!isUnlimitedCapacity}
                              onClick={() => setIsUnlimitedCapacity(false)}
                              className={`min-h-10 rounded-lg px-3 font-medium transition-colors cursor-pointer ${
                                !isUnlimitedCapacity
                                  ? "bg-card text-foreground font-semibold border border-border shadow-xs"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              Batasi Kursi
                            </button>
                          </div>

                          {!isUnlimitedCapacity && (
                            <div className="flex items-center gap-1.5">
                              <label
                                htmlFor="create-event-capacity"
                                className="sr-only"
                              >
                                Jumlah kursi maksimal
                              </label>
                              <input
                                id="create-event-capacity"
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={capacityInput}
                                onChange={(e) =>
                                  setCapacityInput(
                                    e.target.value.replace(/[^0-9]/g, ""),
                                  )
                                }
                                className="h-11 w-20 rounded-xl border border-[var(--evt-border-subtle,var(--border))] bg-[var(--evt-control-bg,var(--background))] px-2.5 text-center font-mono text-xs text-foreground"
                              />
                              <span className="text-muted-foreground">
                                kursi
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <label
                        htmlFor="create-event-logistics"
                        className="font-medium text-foreground block"
                      >
                        Catatan Logistik Peserta (Opsional)
                      </label>
                      <Input
                        id="create-event-logistics"
                        value={logisticsNotes}
                        onChange={(e) => setLogisticsNotes(e.target.value)}
                        placeholder="Bawa buku catatan atau kode pintu masuk..."
                        className="h-11 bg-[var(--evt-control-bg,var(--background))] border-[var(--evt-border-subtle,var(--border))] text-xs"
                      />
                    </div>
                  </div>
                </section>
              </div>
            </form>

            <aside
              data-lenis-prevent
              aria-label="Pratinjau undangan dan poster"
              className={`h-full overflow-y-auto px-4 sm:px-6 lg:pr-8 py-6 space-y-5 ${
                mobilePane === "preview" ? "block" : "hidden lg:block"
              }`}
              style={{ overscrollBehavior: "contain" }}
            >
              <div className="relative mx-auto max-w-[300px] lg:max-w-none">
                <img
                  src={coverUrl}
                  alt=""
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-3 scale-105 rounded-3xl object-cover blur-2xl opacity-35"
                />
                <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-[var(--evt-border-subtle,var(--border))] bg-muted shadow-sm">
                  <img
                    src={coverUrl}
                    alt="Poster pratinjau acara"
                    className="size-full object-cover"
                  />
                  <label className="absolute bottom-3 right-3 inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-white/25 bg-black/75 px-3.5 text-xs font-semibold text-white shadow-md backdrop-blur-xs hover:bg-black/85 cursor-pointer focus-within:outline-2 focus-within:outline-white">
                    {isUploadingPoster ? (
                      <Loader2
                        className="size-3.5 animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <Camera className="size-3.5" aria-hidden="true" />
                    )}
                    <span>
                      {isUploadingPoster ? "Mengunggah..." : "Unggah Poster"}
                    </span>
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      onChange={(event) => void handlePosterUpload(event)}
                      className="sr-only"
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {PRESET_EVENT_BANNERS.map((preset, idx) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setCoverUrl(preset)}
                    aria-label={`Pilih preset poster ${idx + 1}`}
                    aria-pressed={coverUrl === preset}
                    className={`aspect-square min-h-11 w-full rounded-xl overflow-hidden border-2 transition-transform cursor-pointer focus-visible:outline-2 focus-visible:outline-ring ${
                      coverUrl === preset
                        ? "border-[var(--color-accent)] scale-[1.03]"
                        : "border-[var(--evt-border-subtle,var(--border))] opacity-75 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={preset}
                      alt=""
                      className="size-full object-cover"
                    />
                  </button>
                ))}
              </div>

              <div
                style={themeVars.glassSurfaceStyle}
                className="evt-glass rounded-2xl border p-5 space-y-3.5"
              >
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="font-mono uppercase tracking-wider text-muted-foreground">
                    Pratinjau Kartu Undangan
                  </span>
                  <span className="font-mono text-muted-foreground">
                    {themeVars.presetMeta.name}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <span
                    style={themeVars.badgeStyle}
                    className="rounded-md border px-2.5 py-0.5 font-medium"
                  >
                    {currentEventType.label}
                  </span>
                  {categoryTag.trim() && (
                    <span
                      className="font-mono"
                      style={themeVars.cardMutedStyle}
                    >
                      #{categoryTag.trim()}
                    </span>
                  )}
                  <span
                    className="ml-auto inline-flex items-center gap-1 font-mono"
                    style={themeVars.cardMutedStyle}
                  >
                    {visibility === "public" ? (
                      <>
                        <Globe className="size-3" aria-hidden="true" />
                        Publik
                      </>
                    ) : (
                      <>
                        <Lock className="size-3" aria-hidden="true" />
                        Privat
                      </>
                    )}
                  </span>
                </div>

                <div>
                  <h3
                    style={{ fontFamily: themeVars.fontFamily }}
                    className="text-xl font-bold leading-snug break-words text-foreground"
                  >
                    {title.trim() || "Judul Acara Anda"}
                  </h3>
                  {descriptionExcerpt && (
                    <p
                      style={themeVars.cardMutedStyle}
                      className="mt-1.5 text-xs leading-relaxed line-clamp-2"
                    >
                      {descriptionExcerpt}
                    </p>
                  )}
                </div>

                <div
                  className="space-y-2 text-xs"
                  style={themeVars.cardMutedStyle}
                >
                  <div className="flex items-start gap-2 font-mono tabular-nums">
                    <CalendarIcon
                      className="size-3.5 mt-0.5 shrink-0"
                      aria-hidden="true"
                    />
                    <span>{schedule.label}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    {locationState.format === "online" ? (
                      <Video
                        className="size-3.5 mt-0.5 shrink-0"
                        aria-hidden="true"
                      />
                    ) : (
                      <MapPin
                        className="size-3.5 mt-0.5 shrink-0"
                        aria-hidden="true"
                      />
                    )}
                    <span className="break-words">
                      {locationState.format === "online"
                        ? hasMeeting
                          ? `Daring via ${previewPlatformMeta.label}`
                          : "Sesi Daring (ruang virtual belum dipilih)"
                        : locationState.format === "hybrid"
                          ? `${locationState.venueName || "Lokasi tatap muka"} · ${
                              hasMeeting ? previewPlatformMeta.label : "Daring"
                            }`
                          : `${locationState.venueName || "Lokasi belum ditentukan"}${
                              locationState.city
                                ? `, ${locationState.city}`
                                : ""
                            }`}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Users
                      className="size-3.5 mt-0.5 shrink-0"
                      aria-hidden="true"
                    />
                    <span>
                      Diselenggarakan oleh{" "}
                      <strong className="font-semibold text-foreground">
                        {activeCalendar?.name || "Komunitas AnzaBook"}
                      </strong>
                      {coHosts.length > 0 && ` + ${coHosts.length} kolaborator`}
                    </span>
                  </div>
                </div>

                <div
                  style={themeVars.cardMutedStyle}
                  className="flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-current/25 pt-3 text-[11px] font-mono"
                >
                  <span>Tiket: Gratis</span>
                  <span>
                    {isUnlimitedCapacity
                      ? "Kursi tak terbatas"
                      : `Maks. ${capacityInput || "1"} kursi`}
                    {requiresApproval ? " · Perlu ACC" : ""}
                  </span>
                </div>
              </div>
            </aside>
          </div>
        </div>

        <EventAtmosphereDock value={themeSpec} onChange={setThemeSpec} />
      </div>
    </div>
  );
}

function ReadinessStep({ label, done }: { label: string; done: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 font-medium ${
        done ? "text-foreground" : "text-muted-foreground"
      }`}
    >
      <span
        className={`flex size-4 items-center justify-center rounded-full border text-[10px] ${
          done
            ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-ink)]"
            : "border-border bg-background"
        }`}
        aria-hidden="true"
      >
        {done ? <Check className="size-2.5" /> : null}
      </span>
      <span>{label}</span>
    </span>
  );
}
