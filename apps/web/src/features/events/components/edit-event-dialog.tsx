import * as React from "react";
import {
  Calendar as CalendarIcon,
  Camera,
  Clock,
  Globe,
  Loader2,
  Lock,
  MapPin,
  Pencil,
  Video,
  X,
} from "lucide-react";
import type {
  CommunityEventDetailDto,
  CommunityEventSummaryDto,
  EventCoHostDto,
} from "@starter/shared/types";
import {
  detectMeetingPlatform,
  encodeEventThemeSpec,
  getMeetingPlatformMeta,
  parseEventThemeSpec,
  sanitizeCoHostAvatarUrl,
  type EventThemeSpec,
} from "@starter/shared/validators/community";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uploadMediaImage } from "@/features/social/api";
import { isUsableAssetUrl } from "@/lib/media-url";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import {
  formatEventApiError,
  formatLocalDateInput,
  formatLocalTimeInput,
  normalizeOptionalHttpUrl,
  type EventTypeOption,
} from "../event-description-doc";
import { useEventDetail, useUpdateEvent } from "../hooks";
import { EventCoHostsField } from "./event-cohosts-field";
import { EventDescriptionInlineEditor } from "./event-description-dialog";
import {
  EVENT_THEME_ACCENTS,
  EVENT_THEME_FONTS,
  EVENT_THEME_MODES,
  EVENT_THEME_PRESETS,
  EVENT_THEME_STYLES,
} from "./event-theme-atmosphere";

const EDIT_EVENT_TYPE_OPTIONS: ReadonlyArray<{
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

interface EditEventDialogProps {
  open: boolean;
  onClose: () => void;
  event: CommunityEventDetailDto | CommunityEventSummaryDto;
}

export function EditEventDialog({
  open,
  onClose,
  event,
}: EditEventDialogProps) {
  useBodyScrollLock(open);

  if (!open) return null;

  return <EditEventForm key={event.id} onClose={onClose} event={event} />;
}

type EditEventFormProps = {
  onClose: () => void;
  event: CommunityEventDetailDto | CommunityEventSummaryDto;
};

function EditEventForm({ onClose, event }: EditEventFormProps) {
  const updateMutation = useUpdateEvent(event.slug);
  const {
    data: fullEvent,
    isLoading: isLoadingDetail,
    isError: isDetailError,
  } = useEventDetail(event.slug);
  const detail = (fullEvent ?? event) as Partial<CommunityEventDetailDto>;
  const isWaitingForDetail = isLoadingDetail && !fullEvent;

  const [title, setTitle] = React.useState(event.title);
  const [description, setDescription] = React.useState(event.description);
  const [coverUrl, setCoverUrl] = React.useState(event.coverUrl);
  const [themeSpec, setThemeSpec] = React.useState<EventThemeSpec>(() =>
    parseEventThemeSpec(event.themePreset),
  );
  const [eventType, setEventType] = React.useState<EventTypeOption>(
    (event.eventType as EventTypeOption) || "book_club",
  );
  const [categoryTag, setCategoryTag] = React.useState(
    event.categoryTag || "Literasi",
  );
  const [visibility, setVisibility] = React.useState<"public" | "private_link">(
    event.visibility === "private_link" ? "private_link" : "public",
  );
  const [format, setFormat] = React.useState<"offline" | "online" | "hybrid">(
    event.format,
  );
  const [venueName, setVenueName] = React.useState(event.venueName || "");
  const [venueAddress, setVenueAddress] = React.useState(
    event.venueAddress || "",
  );
  const [hideAddressUntilApproved, setHideAddressUntilApproved] =
    React.useState(Boolean(event.hideAddressUntilApproved));
  const [onlineMeetingUrl, setOnlineMeetingUrl] = React.useState(
    detail.onlineMeetingUrl || "",
  );
  const [logisticsNotes, setLogisticsNotes] = React.useState(
    detail.logisticsNotes || "",
  );
  const [capacity, setCapacity] = React.useState(
    event.capacity ? String(event.capacity) : "",
  );
  const [requiresApproval, setRequiresApproval] = React.useState(
    event.requiresApproval,
  );
  const [coHosts, setCoHosts] = React.useState<EventCoHostDto[]>(
    event.coHosts || [],
  );
  const [startDate, setStartDate] = React.useState(() =>
    formatLocalDateInput(event.startsAt),
  );
  const [startTime, setStartTime] = React.useState(() =>
    formatLocalTimeInput(event.startsAt),
  );
  const [endDate, setEndDate] = React.useState(() =>
    formatLocalDateInput(event.endsAt),
  );
  const [endTime, setEndTime] = React.useState(() =>
    formatLocalTimeInput(event.endsAt),
  );
  const [isUploadingPoster, setIsUploadingPoster] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const hydratedRef = React.useRef<string | null>(null);
  const dirtyFieldsRef = React.useRef<Set<string>>(new Set());
  const errorBannerRef = React.useRef<HTMLDivElement | null>(null);

  const markDirty = (field: string) => {
    dirtyFieldsRef.current.add(field);
  };

  React.useEffect(() => {
    if (!fullEvent || hydratedRef.current === fullEvent.id) return;
    hydratedRef.current = fullEvent.id;

    if (!dirtyFieldsRef.current.has("onlineMeetingUrl")) {
      setOnlineMeetingUrl(fullEvent.onlineMeetingUrl || "");
    }
    if (!dirtyFieldsRef.current.has("logisticsNotes")) {
      setLogisticsNotes(fullEvent.logisticsNotes || "");
    }
    if (!dirtyFieldsRef.current.has("venueName")) {
      setVenueName(fullEvent.venueName || "");
    }
    if (!dirtyFieldsRef.current.has("venueAddress")) {
      setVenueAddress(fullEvent.venueAddress || "");
    }
    if (!dirtyFieldsRef.current.has("categoryTag")) {
      setCategoryTag(fullEvent.categoryTag || "Literasi");
    }
    if (!dirtyFieldsRef.current.has("visibility")) {
      setVisibility(
        fullEvent.visibility === "private_link" ? "private_link" : "public",
      );
    }
    if (!dirtyFieldsRef.current.has("hideAddressUntilApproved")) {
      setHideAddressUntilApproved(Boolean(fullEvent.hideAddressUntilApproved));
    }
  }, [fullEvent]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const showFormError = (msg: string) => {
    setErrorMsg(msg);
    requestAnimationFrame(() => {
      errorBannerRef.current?.focus();
    });
  };

  const handlePosterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErrorMsg(null);
    setIsUploadingPoster(true);
    try {
      const uploaded = await uploadMediaImage(file);
      setCoverUrl(uploaded.url);
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      showFormError(
        apiErr?.message || "Gagal mengunggah poster (JPG/PNG/WebP maks. 5 MB).",
      );
    } finally {
      setIsUploadingPoster(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (isWaitingForDetail) {
      showFormError(
        "Detail acara masih dimuat. Tunggu sebentar sebelum menyimpan perubahan.",
      );
      return;
    }
    if (title.trim().length < 3) {
      showFormError("Judul acara minimal 3 karakter.");
      return;
    }
    if (description.trim().length < 10) {
      showFormError("Deskripsi acara minimal 10 karakter.");
      return;
    }
    if (!isUsableAssetUrl(coverUrl.trim())) {
      showFormError(
        "URL poster acara tidak valid. Gunakan gambar unggahan atau tautan HTTPS valid.",
      );
      return;
    }

    const startsAtDate = new Date(`${startDate}T${startTime}:00`);
    const endsAtDate = new Date(`${endDate}T${endTime}:00`);
    if (
      Number.isNaN(startsAtDate.getTime()) ||
      Number.isNaN(endsAtDate.getTime()) ||
      endsAtDate <= startsAtDate
    ) {
      showFormError("Waktu selesai harus setelah waktu mulai acara.");
      return;
    }

    const trimmedMeeting = onlineMeetingUrl.trim();
    const normalizedMeeting = trimmedMeeting
      ? normalizeOptionalHttpUrl(trimmedMeeting)
      : undefined;

    if (format !== "offline" && !trimmedMeeting) {
      showFormError("Tautan rapat virtual wajib diisi untuk acara daring.");
      return;
    }
    if (format !== "offline" && trimmedMeeting && !normalizedMeeting) {
      showFormError(
        "Tautan rapat virtual tidak valid. Contoh: https://meet.google.com/nama-ruang",
      );
      return;
    }
    if (
      (format === "offline" || format === "hybrid") &&
      !venueName.trim() &&
      !venueAddress.trim()
    ) {
      showFormError(
        "Nama tempat atau alamat fisik wajib diisi untuk acara tatap muka.",
      );
      return;
    }

    const parsedCapacity = capacity.trim() ? Number(capacity.trim()) : null;
    if (
      parsedCapacity !== null &&
      (!Number.isInteger(parsedCapacity) ||
        parsedCapacity < 1 ||
        parsedCapacity > 10000)
    ) {
      showFormError(
        "Kapasitas kursi harus berupa angka bulat antara 1 hingga 10.000.",
      );
      return;
    }

    try {
      const sanitizedCoHosts: EventCoHostDto[] = coHosts
        .map((item) => {
          const cleanName = item.name.trim();
          const cleanRole = item.roleLabel?.trim();
          const cleanAvatar = sanitizeCoHostAvatarUrl(item.avatarUrl);
          return {
            ...(item.userId ? { userId: item.userId } : {}),
            name: cleanName,
            ...(cleanAvatar ? { avatarUrl: cleanAvatar } : {}),
            ...(cleanRole ? { roleLabel: cleanRole } : {}),
          };
        })
        .filter((item) => Boolean(item.name));

      const detailLoaded = Boolean(hydratedRef.current);
      const shouldSendLogistics =
        detailLoaded || dirtyFieldsRef.current.has("logisticsNotes");
      const shouldSendMeetingUrl =
        format === "offline" ||
        detailLoaded ||
        dirtyFieldsRef.current.has("onlineMeetingUrl");

      await updateMutation.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        ...(shouldSendLogistics
          ? {
              logisticsNotes: logisticsNotes.trim()
                ? logisticsNotes.trim()
                : null,
            }
          : {}),
        eventType,
        categoryTag: categoryTag.trim() || "Literasi",
        visibility,
        coverUrl: coverUrl.trim(),
        themePreset: encodeEventThemeSpec(themeSpec),
        format,
        venueName: format !== "online" ? venueName.trim() || null : null,
        venueAddress: format !== "online" ? venueAddress.trim() || null : null,
        hideAddressUntilApproved:
          format !== "online" ? hideAddressUntilApproved : false,
        ...(shouldSendMeetingUrl
          ? {
              onlineMeetingUrl:
                format !== "offline" ? (normalizedMeeting ?? null) : null,
            }
          : {}),
        startsAt: startsAtDate.toISOString(),
        endsAt: endsAtDate.toISOString(),
        capacity: parsedCapacity,
        requiresApproval,
        coHosts: sanitizedCoHosts,
      });

      onClose();
    } catch (err: unknown) {
      showFormError(formatEventApiError(err, "Gagal memperbarui acara."));
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-3 sm:p-4 backdrop-blur-xs"
      style={{ overscrollBehavior: "contain" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-event-dialog-title"
    >
      <div
        data-lenis-prevent
        className="relative flex h-[92dvh] max-h-[820px] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card text-foreground shadow-2xl"
        style={{ overscrollBehavior: "contain" }}
      >
        <div className="flex items-center justify-between border-b border-border bg-[var(--color-paper-2)] px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Pencil
              className="size-4 text-[var(--color-accent)]"
              aria-hidden="true"
            />
            <h2
              id="edit-event-dialog-title"
              className="font-serif text-base font-bold text-foreground"
            >
              Edit Detail Acara
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog edit acara"
            className="size-11 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <form
          noValidate
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs"
          style={{ overscrollBehavior: "contain" }}
        >
          {isDetailError && !fullEvent && (
            <div
              role="alert"
              className="rounded-xl border border-[var(--color-error)]/40 bg-[var(--color-error-soft)] p-3 text-xs font-medium text-[var(--color-error)]"
            >
              Gagal memuat detail lengkap acara (tautan rapat &amp; catatan
              logistik). Kolom yang belum Anda ubah tidak akan ditimpa saat
              disimpan.
            </div>
          )}

          {errorMsg && (
            <div
              ref={errorBannerRef}
              tabIndex={-1}
              role="alert"
              className="rounded-xl border border-[var(--color-error)]/40 bg-[var(--color-error-soft)] p-3 text-xs font-medium text-[var(--color-error)] outline-none"
            >
              {errorMsg}
            </div>
          )}

          <div className="space-y-1.5">
            <label
              htmlFor="edit-event-title"
              className="font-semibold text-foreground block"
            >
              Judul Acara
            </label>
            <Input
              id="edit-event-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-11 bg-[var(--color-paper-2)] border-border text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <span className="font-semibold text-foreground block">
              Deskripsi Acara
            </span>
            <EventDescriptionInlineEditor
              value={description}
              onChange={setDescription}
            />
          </div>

          <div className="space-y-1.5">
            <span className="font-semibold text-foreground block">
              Jenis Acara
            </span>
            <div
              role="radiogroup"
              aria-label="Jenis acara"
              className="flex flex-wrap gap-2"
            >
              {EDIT_EVENT_TYPE_OPTIONS.map((item) => {
                const active = eventType === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setEventType(item.id)}
                    className={`min-h-11 rounded-lg border px-3 text-xs font-medium transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring ${
                      active
                        ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-foreground font-semibold"
                        : "border-border bg-[var(--color-paper-2)] text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label
                htmlFor="edit-event-category"
                className="font-semibold text-foreground block"
              >
                Topik / Tagar Singkat
              </label>
              <Input
                id="edit-event-category"
                maxLength={50}
                value={categoryTag}
                onChange={(e) => {
                  markDirty("categoryTag");
                  setCategoryTag(e.target.value);
                }}
                placeholder="Literasi, Filsafat, Fiksi..."
                className="h-11 bg-[var(--color-paper-2)] border-border text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <span className="font-semibold text-foreground block">
                Visibilitas Halaman
              </span>
              <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-border bg-[var(--color-paper-2)] p-1">
                <button
                  type="button"
                  aria-pressed={visibility === "public"}
                  onClick={() => {
                    markDirty("visibility");
                    setVisibility("public");
                  }}
                  className={`min-h-10 rounded-lg px-2.5 flex items-center justify-center gap-1.5 font-medium transition-colors cursor-pointer ${
                    visibility === "public"
                      ? "bg-background text-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Globe className="size-3.5" aria-hidden="true" />
                  <span>Publik</span>
                </button>
                <button
                  type="button"
                  aria-pressed={visibility === "private_link"}
                  onClick={() => {
                    markDirty("visibility");
                    setVisibility("private_link");
                  }}
                  className={`min-h-10 rounded-lg px-2.5 flex items-center justify-center gap-1.5 font-medium transition-colors cursor-pointer ${
                    visibility === "private_link"
                      ? "bg-background text-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Lock className="size-3.5" aria-hidden="true" />
                  <span>Tautan Privat</span>
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="edit-event-cover"
              className="font-semibold text-foreground block"
            >
              Banner Poster Acara
            </label>
            <div className="flex flex-wrap items-center gap-3">
              {isUsableAssetUrl(coverUrl) ? (
                <img
                  src={coverUrl}
                  alt="Pratinjau poster"
                  className="h-14 w-20 rounded-lg border border-border object-cover shrink-0 bg-muted"
                />
              ) : (
                <div
                  aria-label="Pratinjau poster tidak tersedia"
                  className="h-14 w-20 rounded-lg border border-border shrink-0 bg-muted flex items-center justify-center text-[10px] text-muted-foreground"
                >
                  Poster
                </div>
              )}
              <div className="min-w-0 flex-1 space-y-2">
                <Input
                  id="edit-event-cover"
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  className="h-11 bg-[var(--color-paper-2)] border-border text-xs font-mono"
                />
              </div>
              <label className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-[var(--color-paper-2)] px-3 text-xs font-semibold text-foreground hover:border-[var(--color-accent)] cursor-pointer focus-within:outline-2 focus-within:outline-ring">
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

          <div className="space-y-3 rounded-xl border border-border bg-[var(--color-paper-2)] p-3.5">
            <span className="font-semibold text-foreground block">
              Atmosfer &amp; Tema Halaman
            </span>

            <div className="flex flex-wrap gap-1.5">
              {EVENT_THEME_PRESETS.map((preset) => {
                const active = themeSpec.preset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setThemeSpec({ ...preset.defaults })}
                    className={`min-h-10 rounded-lg border px-2.5 text-[11px] font-medium transition-colors cursor-pointer ${
                      active
                        ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-foreground font-semibold"
                        : "border-border bg-background text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {preset.name}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] text-muted-foreground mr-1">
                Tinta:
              </span>
              {EVENT_THEME_ACCENTS.map((accent) => {
                const active = themeSpec.accent === accent.id;
                return (
                  <button
                    key={accent.id}
                    type="button"
                    aria-label={`Tinta ${accent.name}`}
                    aria-pressed={active}
                    onClick={() =>
                      setThemeSpec((prev) => ({ ...prev, accent: accent.id }))
                    }
                    className={`size-9 flex items-center justify-center rounded-lg border transition-colors cursor-pointer ${
                      active
                        ? "border-[var(--color-accent)] bg-background"
                        : "border-border bg-background/60"
                    }`}
                  >
                    <span
                      className="size-4 rounded-full border border-black/15"
                      style={{ backgroundColor: accent.swatch }}
                      aria-hidden="true"
                    />
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {EVENT_THEME_STYLES.map((styleOpt) => {
                const active = themeSpec.style === styleOpt.id;
                return (
                  <button
                    key={styleOpt.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      setThemeSpec((prev) => ({ ...prev, style: styleOpt.id }))
                    }
                    className={`min-h-10 rounded-lg border px-2.5 text-[11px] transition-colors cursor-pointer ${
                      active
                        ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] font-semibold text-foreground"
                        : "border-border bg-background text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {styleOpt.name}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <div className="flex flex-wrap gap-1.5">
                {EVENT_THEME_FONTS.map((fontOpt) => {
                  const active = themeSpec.font === fontOpt.id;
                  return (
                    <button
                      key={fontOpt.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() =>
                        setThemeSpec((prev) => ({ ...prev, font: fontOpt.id }))
                      }
                      className={`min-h-10 rounded-lg border px-2.5 text-[11px] transition-colors cursor-pointer ${
                        active
                          ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] font-semibold text-foreground"
                          : "border-border bg-background text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {fontOpt.shortLabel}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-1.5 sm:justify-end">
                {EVENT_THEME_MODES.map((modeOpt) => {
                  const active = themeSpec.mode === modeOpt.id;
                  return (
                    <button
                      key={modeOpt.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() =>
                        setThemeSpec((prev) => ({ ...prev, mode: modeOpt.id }))
                      }
                      className={`min-h-10 rounded-lg border px-2.5 text-[11px] transition-colors cursor-pointer ${
                        active
                          ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] font-semibold text-foreground"
                          : "border-border bg-background text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {modeOpt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="font-semibold text-foreground block">
              Format Pertemuan
            </span>
            <div
              role="radiogroup"
              aria-label="Format pertemuan acara"
              className="flex flex-wrap items-center gap-2"
            >
              <button
                type="button"
                role="radio"
                aria-checked={format === "offline"}
                onClick={() => setFormat("offline")}
                className={`min-h-11 flex-1 rounded-xl border p-2.5 text-center font-medium transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring ${
                  format === "offline"
                    ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-foreground font-semibold"
                    : "border-border bg-[var(--color-paper-2)] text-muted-foreground hover:text-foreground"
                }`}
              >
                Tatap Muka
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={format === "online"}
                onClick={() => setFormat("online")}
                className={`min-h-11 flex-1 rounded-xl border p-2.5 text-center font-medium transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring ${
                  format === "online"
                    ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-foreground font-semibold"
                    : "border-border bg-[var(--color-paper-2)] text-muted-foreground hover:text-foreground"
                }`}
              >
                Daring
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={format === "hybrid"}
                onClick={() => setFormat("hybrid")}
                className={`min-h-11 flex-1 rounded-xl border p-2.5 text-center font-medium transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring ${
                  format === "hybrid"
                    ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-foreground font-semibold"
                    : "border-border bg-[var(--color-paper-2)] text-muted-foreground hover:text-foreground"
                }`}
              >
                Hibrida
              </button>
            </div>
            {format === "online" && (
              <p className="text-[11px] text-muted-foreground">
                Saat disimpan sebagai acara daring, detail alamat fisik lama
                dibersihkan otomatis.
              </p>
            )}
            {format === "offline" && (
              <p className="text-[11px] text-muted-foreground">
                Saat disimpan sebagai tatap muka, tautan rapat virtual lama
                dibersihkan otomatis.
              </p>
            )}
          </div>

          {format !== "offline" && (
            <div className="space-y-1.5">
              <label
                htmlFor="edit-event-meeting"
                className="font-semibold text-foreground flex items-center gap-1.5"
              >
                <Video
                  className="size-3.5 text-[var(--color-water)]"
                  aria-hidden="true"
                />
                <span>Tautan Rapat Virtual</span>
                {isLoadingDetail && !onlineMeetingUrl && (
                  <span className="text-[11px] font-normal text-muted-foreground">
                    (Memuat tautan tersimpan...)
                  </span>
                )}
              </label>
              <Input
                id="edit-event-meeting"
                type="text"
                inputMode="url"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                value={onlineMeetingUrl}
                onChange={(e) => {
                  markDirty("onlineMeetingUrl");
                  setOnlineMeetingUrl(e.target.value);
                }}
                placeholder="https://meet.google.com/..."
                className="h-11 bg-[var(--color-paper-2)] border-border text-xs"
              />
              {onlineMeetingUrl.trim() && (
                <p className="text-[11px] text-muted-foreground">
                  Platform tersemat:{" "}
                  <strong className="text-foreground">
                    {
                      getMeetingPlatformMeta(
                        detectMeetingPlatform(onlineMeetingUrl),
                      ).label
                    }
                  </strong>
                </p>
              )}
            </div>
          )}

          {format !== "online" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label
                  htmlFor="edit-event-venue"
                  className="font-semibold text-foreground flex items-center gap-1.5"
                >
                  <MapPin
                    className="size-3.5 text-[var(--color-accent)]"
                    aria-hidden="true"
                  />
                  Nama Tempat / Kafe / Perpustakaan
                </label>
                <Input
                  id="edit-event-venue"
                  value={venueName}
                  onChange={(e) => {
                    markDirty("venueName");
                    setVenueName(e.target.value);
                  }}
                  className="h-11 bg-[var(--color-paper-2)] border-border text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="edit-event-address"
                  className="font-semibold text-foreground block"
                >
                  Alamat Lengkap
                </label>
                <Input
                  id="edit-event-address"
                  value={venueAddress}
                  onChange={(e) => {
                    markDirty("venueAddress");
                    setVenueAddress(e.target.value);
                  }}
                  className="h-11 bg-[var(--color-paper-2)] border-border text-xs"
                />
              </div>

              <label className="flex items-center justify-between rounded-xl border border-border bg-[var(--color-paper-2)] p-3 min-h-12 cursor-pointer">
                <div>
                  <span className="text-xs font-semibold text-foreground block">
                    Sembunyikan Alamat Lengkap
                  </span>
                  <span className="text-[11px] text-muted-foreground block">
                    Tampilkan kota/kecamatan hingga pendaftaran peserta
                    disetujui
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={hideAddressUntilApproved}
                  onChange={(e) => {
                    markDirty("hideAddressUntilApproved");
                    setHideAddressUntilApproved(e.target.checked);
                  }}
                  className="size-5 accent-[var(--color-accent)] cursor-pointer shrink-0 ml-3"
                />
              </label>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <label
                htmlFor="edit-event-start-date"
                className="font-semibold text-foreground flex items-center gap-1"
              >
                <CalendarIcon
                  className="size-3.5 text-[var(--color-accent)]"
                  aria-hidden="true"
                />
                Mulai
              </label>
              <Input
                id="edit-event-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-11 bg-[var(--color-paper-2)] border-border text-xs"
              />
              <Input
                aria-label="Jam mulai acara"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="h-11 bg-[var(--color-paper-2)] border-border text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="edit-event-end-date"
                className="font-semibold text-foreground flex items-center gap-1"
              >
                <Clock
                  className="size-3.5 text-[var(--color-accent)]"
                  aria-hidden="true"
                />
                Selesai
              </label>
              <Input
                id="edit-event-end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-11 bg-[var(--color-paper-2)] border-border text-xs"
              />
              <Input
                aria-label="Jam selesai acara"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="h-11 bg-[var(--color-paper-2)] border-border text-xs font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="edit-event-logistics"
              className="font-semibold text-foreground flex items-center gap-1.5"
            >
              <span>Catatan Logistik Peserta</span>
              {isLoadingDetail && !logisticsNotes && (
                <span className="text-[11px] font-normal text-muted-foreground">
                  (Memuat catatan tersimpan...)
                </span>
              )}
            </label>
            <Input
              id="edit-event-logistics"
              value={logisticsNotes}
              onChange={(e) => {
                markDirty("logisticsNotes");
                setLogisticsNotes(e.target.value);
              }}
              placeholder="Bawa buku catatan atau kode pintu..."
              className="h-11 bg-[var(--color-paper-2)] border-border text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <label
                htmlFor="edit-event-capacity"
                className="font-semibold text-foreground block"
              >
                Kapasitas Kursi (kosongkan = tak terbatas)
              </label>
              <Input
                id="edit-event-capacity"
                type="number"
                min="1"
                placeholder="Tak terbatas"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className="h-11 bg-[var(--color-paper-2)] border-border text-xs font-mono"
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border bg-[var(--color-paper-2)] p-3 self-end min-h-14">
              <div>
                <span className="text-xs font-semibold text-foreground block">
                  Perlu Persetujuan
                </span>
                <span className="text-[11px] text-muted-foreground block">
                  Host menyetujui RSVP
                </span>
              </div>
              <input
                type="checkbox"
                aria-label="Perlu persetujuan RSVP"
                checked={requiresApproval}
                onChange={(e) => setRequiresApproval(e.target.checked)}
                className="size-5 accent-[var(--color-accent)] cursor-pointer"
              />
            </div>
          </div>

          <EventCoHostsField
            coHosts={coHosts}
            onChange={setCoHosts}
            calendarSlug={event.calendarSlug}
          />

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="min-h-11"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={updateMutation.isPending || isWaitingForDetail}
              className="min-h-11 bg-[var(--color-accent)] text-[var(--color-accent-ink)] hover:opacity-90 font-semibold px-5"
            >
              {updateMutation.isPending
                ? "Menyimpan..."
                : isWaitingForDetail
                  ? "Memuat detail..."
                  : "Simpan Perubahan"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
