import * as React from "react";
import { Link } from "@tanstack/react-router";
import {
  X,
  Camera,
  Shuffle,
  Globe,
  Lock,
  Calendar as CalendarIcon,
  Clock,
  Film,
  BookOpen,
  Sparkles,
  ChevronDown,
  Plus,
  AlignLeft,
  Pencil,
  Ticket,
  Check,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { useCatalogBooks } from "@/features/books/hooks";
import { useCalendars, useCreateEvent } from "../hooks";
import {
  LocationPickerPopover,
  type SelectedLocationState,
} from "./location-picker-popover";
import { EventDescriptionDialog } from "./event-description-dialog";

interface CreateEventDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (eventSlug: string) => void;
}

const THEME_OPTIONS = [
  { id: "minimal", name: "Minimal", bg: "#1f1d18", border: "#38332a" },
  { id: "classic_paper", name: "Classic Paper", bg: "#2a241b", border: "#4a3c2a" },
  { id: "midnight_ink", name: "Midnight Ink", bg: "#12141a", border: "#222736" },
  { id: "terracotta", name: "Terracotta", bg: "#281b16", border: "#4a2c22" },
] as const;

const PRESET_BANNERS = [
  "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=600&auto=format&fit=crop&q=80",
];

export function CreateEventDialog({
  open,
  onClose,
  onSuccess,
}: CreateEventDialogProps) {
  useBodyScrollLock(open);

  const { data: session } = authClient.useSession();
  const { data: calendars = [] } = useCalendars();
  const createEventMutation = useCreateEvent();

  const userRole = session?.user?.role || "user";
  const managedCalendars = React.useMemo(() => {
    return calendars.filter(
      (c) =>
        (c.isManager &&
          (c.verificationStatus === "verified" ||
            c.verificationStatus === "trusted")) ||
        userRole === "admin",
    );
  }, [calendars, userRole]);

  const [selectedCalendarId, setSelectedCalendarId] = React.useState<string>("");
  const [isCalendarMenuOpen, setIsCalendarMenuOpen] = React.useState(false);
  const [isApplyCalendarOpen, setIsApplyCalendarOpen] = React.useState(false);
  const [isDescDialogOpen, setIsDescDialogOpen] = React.useState(false);
  const [isPaymentPopoverOpen, setIsPaymentPopoverOpen] = React.useState(false);
  const [isCapacityPopoverOpen, setIsCapacityPopoverOpen] = React.useState(false);

  // Form states
  const [title, setTitle] = React.useState("");
  const [coverUrl, setCoverUrl] = React.useState(PRESET_BANNERS[0]);
  const [themePreset, setThemePreset] = React.useState<
    "minimal" | "classic_paper" | "midnight_ink" | "terracotta"
  >("minimal");
  const [visibility, setVisibility] = React.useState<"public" | "private_link">(
    "public",
  );
  const [eventType, setEventType] = React.useState<
    | "book_club"
    | "film_discussion"
    | "silent_reading"
    | "book_launch"
    | "writing_session"
    | "community_meetup"
  >("book_club");
  const [categoryTag, setCategoryTag] = React.useState("Literasi");

  // Dates
  const tomorrow = new Date(Date.now() + 86400000);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];
  const [startDate, setStartDate] = React.useState(tomorrowStr);
  const [startTime, setStartTime] = React.useState("19:00");
  const [endDate, setEndDate] = React.useState(tomorrowStr);
  const [endTime, setEndTime] = React.useState("21:00");

  // Location State
  const [locationState, setLocationState] = React.useState<SelectedLocationState>({
    format: "offline",
    hideAddressUntilApproved: false,
  });
  const [onlineMeetingUrl, setOnlineMeetingUrl] = React.useState("");

  // Sync virtual meeting URL when chosen in location picker
  React.useEffect(() => {
    if (locationState.onlineMeetingUrl && !onlineMeetingUrl) {
      setOnlineMeetingUrl(locationState.onlineMeetingUrl);
    }
  }, [locationState.onlineMeetingUrl]);

  const [description, setDescription] = React.useState("");
  const [logisticsNotes, setLogisticsNotes] = React.useState("");

  // Catalog Books for linking
  const { data: catalogBooksData } = useCatalogBooks({ limit: 50 });
  const booksList = catalogBooksData?.data || [];

  // Featured Work / Book
  const [selectedBookId, setSelectedBookId] = React.useState<string>("");
  const [isLinkingWork, setIsLinkingWork] = React.useState(false);
  const [workMediaType, setWorkMediaType] = React.useState<
    "book" | "film" | "article" | "other"
  >("book");
  const [workTitle, setWorkTitle] = React.useState("");
  const [workCreator, setWorkCreator] = React.useState("");
  const [workUrl, setWorkUrl] = React.useState("");

  // Settings
  const [ticketPriceIdr, setTicketPriceIdr] = React.useState(0);
  const [requiresApproval, setRequiresApproval] = React.useState(false);
  const [isUnlimitedCapacity, setIsUnlimitedCapacity] = React.useState(true);
  const [capacity, setCapacity] = React.useState<number>(30);
  const [allowWaitlist, setAllowWaitlist] = React.useState(true);

  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Auto-select user's managed calendar
  React.useEffect(() => {
    if (managedCalendars.length > 0 && !selectedCalendarId) {
      setSelectedCalendarId(managedCalendars[0].id);
    }
  }, [managedCalendars, selectedCalendarId]);

  const activeCalendar = managedCalendars.find((c) => c.id === selectedCalendarId);

  // Client-side Canvas Compression to guarantee base64 image < 80 kB
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL("image/jpeg", 0.8);
          setCoverUrl(compressed);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleShuffleTheme = () => {
    const currentIndex = THEME_OPTIONS.findIndex((t) => t.id === themePreset);
    const nextTheme = THEME_OPTIONS[(currentIndex + 1) % THEME_OPTIONS.length];
    setThemePreset(nextTheme.id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedCalendarId) {
      setErrorMsg("Pilih atau buat kalender komunitas Anda untuk acara ini.");
      return;
    }
    if (title.trim().length < 3) {
      setErrorMsg("Nama acara minimal 3 karakter.");
      return;
    }
    if (description.trim().length < 10) {
      setErrorMsg("Deskripsi acara minimal 10 karakter. Klik 'Tambahkan Deskripsi' untuk mengisi.");
      return;
    }

    const startIso = new Date(`${startDate}T${startTime}:00+07:00`).toISOString();
    const endIso = new Date(`${endDate}T${endTime}:00+07:00`).toISOString();

    if (new Date(endIso) <= new Date(startIso)) {
      setErrorMsg("Waktu selesai harus setelah waktu mulai.");
      return;
    }

    try {
      const payload: any = {
        calendarId: selectedCalendarId,
        bookId: selectedBookId || undefined,
        title: title.trim(),
        description: description.trim(),
        logisticsNotes: logisticsNotes.trim() || undefined,
        coverUrl,
        themePreset,
        visibility,
        eventType,
        categoryTag: categoryTag.trim() || "Literasi",
        format: locationState.format,
        venueName: locationState.venueName,
        venueAddress: locationState.venueAddress,
        city: locationState.city,
        district: locationState.district,
        latitude: locationState.latitude,
        longitude: locationState.longitude,
        onlineMeetingUrl: onlineMeetingUrl.trim() || locationState.onlineMeetingUrl || undefined,
        hideAddressUntilApproved: locationState.hideAddressUntilApproved,
        startsAt: startIso,
        endsAt: endIso,
        timezone: "Asia/Jakarta",
        capacity: isUnlimitedCapacity ? undefined : Number(capacity),
        requiresApproval,
        allowWaitlist,
      };

      if (isLinkingWork && workTitle.trim()) {
        payload.featuredWork = {
          mediaType: workMediaType,
          title: workTitle.trim(),
          creator: workCreator.trim() || undefined,
          externalUrl: workUrl.trim() || undefined,
        };
      }

      const res = await createEventMutation.mutateAsync(payload);
      if (onSuccess) onSuccess(res.slug);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal membuat acara.");
    }
  };

  if (!open) return null;

  const currentTheme = THEME_OPTIONS.find((t) => t.id === themePreset) || THEME_OPTIONS[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200 select-none"
      style={{ overscrollBehavior: "contain" }}
    >
      <div
        data-lenis-prevent
        className="relative flex h-[94vh] max-h-[840px] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border shadow-2xl transition-colors duration-300"
        style={{
          backgroundColor: currentTheme.bg,
          borderColor: currentTheme.border,
          overscrollBehavior: "contain",
        }}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-3.5">
          <div className="flex items-center gap-4 text-xs font-medium text-white/70">
            <span className="flex items-center gap-1.5 text-white">
              <CalendarIcon className="size-4 text-amber-400" />
              Buat Acara Baru
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Studio Body: Split 2 Columns matching Luma Screenshot 1 */}
        <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
          {/* Left Column: 1:1 Poster Upload & Theme Controls */}
          <div
            data-lenis-prevent
            className="flex w-full md:w-[380px] shrink-0 flex-col items-center justify-start border-b md:border-b-0 md:border-r border-white/10 p-6 overflow-y-auto"
            style={{ overscrollBehavior: "contain" }}
          >
            {/* 1:1 Poster Preview Box */}
            <div className="relative group size-[240px] sm:size-[280px] rounded-2xl overflow-hidden border-2 border-white/15 bg-black/40 shadow-xl">
              <img
                src={coverUrl}
                alt="Banner Acara"
                className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
              />

              {/* Upload Overlay */}
              <label className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white">
                <Camera className="size-8 mb-2" />
                <span className="text-xs font-medium">Unggah Poster (1:1)</span>
                <span className="text-[10px] text-white/60 mt-0.5">JPG / PNG (Otomatis Kompres)</span>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Preset Banner Selector */}
            <div className="mt-4 flex items-center gap-2">
              <span className="text-[11px] text-white/40">Preset:</span>
              {PRESET_BANNERS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCoverUrl(preset)}
                  className={`size-8 rounded-lg overflow-hidden border-2 transition-all ${
                    coverUrl === preset
                      ? "border-amber-400 scale-105"
                      : "border-white/20 opacity-60 hover:opacity-100"
                  }`}
                >
                  <img src={preset} alt="" className="size-full object-cover" />
                </button>
              ))}
            </div>

            {/* Theme Picker Pill matching Luma Screenshot 1 */}
            <div className="mt-6 flex w-full max-w-[280px] items-center gap-2">
              <div className="flex flex-1 items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white">
                <div className="flex items-center gap-2">
                  <div
                    className="size-4 rounded border border-white/20"
                    style={{ backgroundColor: currentTheme.bg }}
                  />
                  <div>
                    <div className="text-[10px] text-white/40">Tema</div>
                    <div className="font-medium text-white">{currentTheme.name}</div>
                  </div>
                </div>
                <select
                  value={themePreset}
                  onChange={(e) => setThemePreset(e.target.value as any)}
                  className="bg-transparent text-xs text-white outline-none cursor-pointer"
                >
                  {THEME_OPTIONS.map((t) => (
                    <option key={t.id} value={t.id} className="bg-[#1b1c20] text-white">
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleShuffleTheme}
                title="Ganti Tema Warna"
                className="flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                <Shuffle className="size-4" />
              </button>
            </div>
          </div>

          {/* Right Column: Title, Dates, Location, Description & Options */}
          <div
            data-lenis-prevent
            className="flex-1 overflow-y-auto p-6 space-y-5 text-white"
            style={{ overscrollBehavior: "contain" }}
          >
            {errorMsg && (
              <div className="rounded-lg border border-red-500/40 bg-red-500/15 p-3 text-xs text-red-200">
                {errorMsg}
              </div>
            )}

            {/* Top Bar matching Screenshot 1: 🟡 Kalender Komunitas ▾ | 🌐 Publik ▾ */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              {/* Calendar Selector Pill */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsCalendarMenuOpen(!isCalendarMenuOpen)}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-1.5 font-medium text-white hover:bg-white/15 transition-colors cursor-pointer"
                >
                  <span className="size-2 rounded-full bg-amber-400" />
                  <span className="max-w-[200px] truncate">
                    {activeCalendar ? activeCalendar.name : "Pilih Kalender Komunitas"}
                  </span>
                  <ChevronDown className="size-3 text-white/50" />
                </button>

                {isCalendarMenuOpen && (
                  <div
                    className="absolute left-0 top-9 z-30 w-72 rounded-xl border border-white/15 bg-[#1b1c20] p-1.5 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95"
                    style={{ overscrollBehavior: "contain" }}
                  >
                    <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                      Kalender Kelolaan Anda
                    </div>
                    {managedCalendars.length === 0 ? (
                      <div className="p-2.5 text-xs text-white/60">
                        Anda belum memiliki kalender komunitas terverifikasi.
                      </div>
                    ) : (
                      managedCalendars.map((cal) => (
                        <button
                          key={cal.id}
                          type="button"
                          onClick={() => {
                            setSelectedCalendarId(cal.id);
                            setIsCalendarMenuOpen(false);
                          }}
                          className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors ${
                            selectedCalendarId === cal.id
                              ? "bg-amber-400/20 text-amber-300 font-semibold"
                              : "text-white/80 hover:bg-white/10"
                          }`}
                        >
                          <span className="truncate">{cal.name}</span>
                          {selectedCalendarId === cal.id && <Check className="size-3.5" />}
                        </button>
                      ))
                    )}
                    <div className="mt-1 border-t border-white/10 pt-1">
                      <Link
                        to="/partner-program"
                        onClick={() => {
                          setIsCalendarMenuOpen(false);
                          onClose();
                        }}
                        className="flex w-full items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-amber-400 hover:bg-white/10 transition-colors"
                      >
                        <Plus className="size-3.5" />
                        <span>Daftarkan Komunitas (Partner Program)</span>
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Visibility Selector */}
              <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-white/70">
                <Globe className="size-3.5 text-white/50" />
                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as any)}
                  className="bg-transparent text-xs text-white outline-none cursor-pointer"
                >
                  <option value="public" className="bg-[#1b1c20] text-white">
                    Publik
                  </option>
                  <option value="private_link" className="bg-[#1b1c20] text-white">
                    Tautan Pribadi
                  </option>
                </select>
              </div>
            </div>

            {/* Event Name Input matching Screenshot 1 */}
            <div className="space-y-1">
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Nama Acara"
                className="w-full bg-transparent font-serif text-2xl sm:text-3xl font-bold text-white placeholder-white/30 outline-none"
              />
            </div>

            {/* Date, Time & Timezone Card matching Screenshot 1 */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                {/* Mulai & Akhir */}
                <div className="md:col-span-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-white/40" />
                    <span className="w-12 text-white/60">Mulai</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="rounded border border-white/10 bg-white/10 px-2 py-1 text-white outline-none cursor-pointer"
                    />
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="rounded border border-white/10 bg-white/10 px-2 py-1 text-white outline-none cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full border border-white/40" />
                    <span className="w-12 text-white/60">Akhir</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="rounded border border-white/10 bg-white/10 px-2 py-1 text-white outline-none cursor-pointer"
                    />
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="rounded border border-white/10 bg-white/10 px-2 py-1 text-white outline-none cursor-pointer"
                    />
                  </div>
                </div>

                {/* Timezone Badge */}
                <div className="flex items-center gap-2 border-t md:border-t-0 md:border-l border-white/10 pt-2 md:pt-0 md:pl-4 text-white/60">
                  <Clock className="size-4 text-white/40" />
                  <div>
                    <div className="font-semibold text-white/90">GMT+07:00</div>
                    <div className="text-[10px]">WIB Jakarta</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Location Picker Popover Bar */}
            <LocationPickerPopover
              value={locationState}
              onChange={setLocationState}
            />

            {/* Input Tautan Rapat Virtual */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-medium text-white/80">
                  <Video className="size-4 text-blue-400" />
                  Tautan Rapat Virtual
                </span>
                <span className="text-[10px] text-white/40">
                  Zoom, Google Meet, YouTube Live, dll.
                </span>
              </div>
              <Input
                type="url"
                value={onlineMeetingUrl}
                onChange={(e) => {
                  setOnlineMeetingUrl(e.target.value);
                  setLocationState((prev) => ({
                    ...prev,
                    onlineMeetingUrl: e.target.value,
                  }));
                }}
                placeholder="https://meet.google.com/... atau https://zoom.us/j/..."
                className="bg-black/30 border-white/10 text-white placeholder-white/30 text-xs"
              />
              <p className="text-[10px] text-white/40">
                Tautan hanya diberikan otomatis kepada peserta yang telah disetujui (Going).
              </p>
            </div>

            {/* Description Row (matching Screenshot 1: opens rich modal Screenshot 2) */}
            <div
              onClick={() => setIsDescDialogOpen(true)}
              className="group flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3.5 hover:bg-white/10 transition-colors cursor-pointer select-none"
            >
              <AlignLeft className="mt-0.5 size-4 text-white/40 group-hover:text-white/70 transition-colors shrink-0" />
              <div className="min-w-0 flex-1">
                {description ? (
                  <div className="text-xs text-white/90 line-clamp-2 whitespace-pre-line leading-relaxed">
                    {description}
                  </div>
                ) : (
                  <div className="text-xs text-white/40">
                    Tambahkan Deskripsi Acara
                  </div>
                )}
              </div>
              <Pencil className="size-3.5 text-white/40 group-hover:text-white/70 transition-colors shrink-0" />
            </div>

            {/* Optional Featured Work / Book Linker */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-3.5 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="size-4 text-amber-400" />
                  <span className="font-medium text-white">
                    Kaitkan Karya (Buku, Film, atau Artikel)
                  </span>
                  <span className="text-[10px] text-white/40">(Opsional)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsLinkingWork(!isLinkingWork)}
                  className="text-xs text-amber-400 hover:text-amber-300 font-medium cursor-pointer"
                >
                  {isLinkingWork ? "Tutup" : "+ Kaitkan"}
                </button>
              </div>

              {isLinkingWork && (
                <div className="mt-3 space-y-3 border-t border-white/10 pt-3">
                  <div className="flex gap-2">
                    {(["book", "film", "article", "other"] as const).map((mt) => (
                      <button
                        key={mt}
                        type="button"
                        onClick={() => {
                          setWorkMediaType(mt);
                          if (mt !== "book") {
                            setSelectedBookId("");
                          }
                        }}
                        className={`rounded px-2.5 py-1 text-[11px] font-medium capitalize transition-colors cursor-pointer ${
                          workMediaType === mt
                            ? "bg-amber-400/20 text-amber-300 border border-amber-400/40"
                            : "bg-white/5 text-white/60 hover:bg-white/10"
                        }`}
                      >
                        {mt === "book" ? "Buku" : mt === "film" ? "Film" : mt}
                      </button>
                    ))}
                  </div>

                  {workMediaType === "book" && (
                    <div className="space-y-1.5 rounded-lg border border-white/10 bg-black/30 p-2.5">
                      <label className="text-[11px] font-medium text-amber-300 flex items-center gap-1.5">
                        <BookOpen className="size-3.5" />
                        <span>Pilih Buku Katalog AnzaBook (Auto-Unlock Sampel)</span>
                      </label>
                      <select
                        value={selectedBookId}
                        onChange={(e) => {
                          const bookId = e.target.value;
                          setSelectedBookId(bookId);
                          const chosen = booksList.find((b) => b.id === bookId);
                          if (chosen) {
                            setWorkTitle(chosen.title);
                            setWorkCreator(chosen.author);
                          }
                        }}
                        className="w-full rounded-lg border border-white/10 bg-[#1e2025] px-3 py-2 text-xs text-white outline-none cursor-pointer focus:border-amber-400/50"
                      >
                        <option value="">-- Pilih Buku dari Katalog (Opsional) --</option>
                        {booksList.map((b) => (
                          <option key={b.id} value={b.id} className="bg-[#1e2025] text-white">
                            {b.title} — {b.author}
                          </option>
                        ))}
                      </select>
                      {selectedBookId && (
                        <p className="text-[10px] text-emerald-400">
                          ✓ Peserta yang terdaftar & disetujui otomatis mendapatkan akses baca Bab 1 & 2 buku ini.
                        </p>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <Input
                      value={workTitle}
                      onChange={(e) => setWorkTitle(e.target.value)}
                      placeholder="Judul karya (misal: Laut Bercerita)"
                      className="bg-white/5 border-white/10 text-white placeholder-white/30 text-xs"
                    />
                    <Input
                      value={workCreator}
                      onChange={(e) => setWorkCreator(e.target.value)}
                      placeholder="Pembuat / Penulis / Sutradara"
                      className="bg-white/5 border-white/10 text-white placeholder-white/30 text-xs"
                    />
                  </div>

                  <Input
                    value={workUrl}
                    onChange={(e) => setWorkUrl(e.target.value)}
                    placeholder="Tautan referensi atau trailer (https://...)"
                    className="bg-white/5 border-white/10 text-white placeholder-white/30 text-xs"
                  />
                </div>
              )}
            </div>

            {/* Event Options ("Opsi Acara" matching Screenshot 1 & 3) */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs space-y-3">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-white/50">
                Opsi Acara
              </div>

              {/* Harga Tiket matching Screenshot 3 media_1794175722339_653f9914.jpg */}
              <div className="relative flex items-center justify-between py-1">
                <span className="text-white font-medium">Harga Tiket</span>
                <button
                  type="button"
                  onClick={() => setIsPaymentPopoverOpen(!isPaymentPopoverOpen)}
                  className="flex items-center gap-1.5 rounded-md px-2 py-1 text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <span>{ticketPriceIdr > 0 ? `Rp ${ticketPriceIdr.toLocaleString("id-ID")}` : "Gratis"}</span>
                  <Pencil className="size-3 text-white/50" />
                </button>

                {/* Stripe / Payment Popover matching Screenshot 3 */}
                {isPaymentPopoverOpen && (
                  <div
                    className="absolute right-0 top-8 z-30 w-80 rounded-2xl border border-white/15 bg-[#1a1b1f] p-5 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95"
                    style={{ overscrollBehavior: "contain" }}
                  >
                    <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-white/10 text-white">
                      <Ticket className="size-5 text-amber-400" />
                    </div>
                    <h4 className="text-sm font-bold text-white mb-1.5">Terima Pembayaran</h4>
                    <p className="text-[11px] leading-relaxed text-white/60 mb-4">
                      Kalender ini belum diatur untuk menerima pembayaran. Kami menggunakan Stripe untuk memproses pembayaran. Hubungkan atau buat akun Stripe untuk mulai menerima pembayaran. Biasanya membutuhkan waktu kurang dari 5 menit.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setIsPaymentPopoverOpen(false);
                      }}
                      className="w-full rounded-xl bg-white py-2 text-xs font-semibold text-black hover:bg-white/90 transition-all cursor-pointer shadow-sm text-center"
                    >
                      Hubungkan Stripe
                    </button>
                  </div>
                )}
              </div>

              {/* Memerlukan Persetujuan */}
              <div className="flex items-center justify-between border-t border-white/5 pt-2.5">
                <div>
                  <div className="font-medium text-white">Memerlukan Persetujuan</div>
                  <div className="text-[11px] text-white/40">
                    Host menyetujui setiap pendaftar sebelum alamat/tiket diberikan
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requiresApproval}
                    onChange={(e) => setRequiresApproval(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-400"></div>
                </label>
              </div>

              {/* Kapasitas matching Luma Screenshot 3 (No underline, Pencil Icon) */}
              <div className="relative flex items-center justify-between border-t border-white/5 pt-2.5">
                <div>
                  <div className="font-medium text-white">Kapasitas</div>
                  <div className="text-[11px] text-white/40">
                    Batas jumlah peserta yang dapat hadir
                  </div>
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsCapacityPopoverOpen(!isCapacityPopoverOpen)}
                    className="flex items-center gap-1.5 rounded-md px-2 py-1 text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <span>{isUnlimitedCapacity ? "Tak terbatas" : `${capacity} Peserta`}</span>
                    <Pencil className="size-3 text-white/50" />
                  </button>

                  {/* Capacity Popover */}
                  {isCapacityPopoverOpen && (
                    <div
                      className="absolute right-0 top-8 z-30 w-60 rounded-xl border border-white/15 bg-[#1b1c20] p-3 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 text-xs"
                      style={{ overscrollBehavior: "contain" }}
                    >
                      <div className="font-semibold text-white mb-2">Atur Kapasitas Peserta</div>
                      <div className="space-y-2.5">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isUnlimitedCapacity}
                            onChange={(e) => setIsUnlimitedCapacity(e.target.checked)}
                            className="rounded border-white/20 bg-white/10 text-amber-400 focus:ring-0"
                          />
                          <span className="text-white/80">Tak terbatas</span>
                        </label>

                        {!isUnlimitedCapacity && (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="1"
                              max="10000"
                              value={capacity}
                              onChange={(e) =>
                                setCapacity(Math.max(1, parseInt(e.target.value) || 1))
                              }
                              className="w-24 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1 text-white text-xs outline-none"
                              placeholder="Jumlah"
                              autoFocus
                            />
                            <span className="text-white/50">kursi</span>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => setIsCapacityPopoverOpen(false)}
                          className="w-full mt-2 rounded-lg bg-white/15 hover:bg-white/25 py-1 text-center font-medium text-white transition-colors cursor-pointer"
                        >
                          Selesai
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Button matching Luma Screenshot 1 */}
            <div className="pt-2">
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={createEventMutation.isPending || !selectedCalendarId}
                className="w-full h-12 rounded-xl bg-white text-black font-semibold text-sm hover:bg-white/90 active:scale-98 transition-all shadow-lg cursor-pointer disabled:opacity-50"
              >
                {createEventMutation.isPending ? "Menerbitkan Acara..." : "Buat Acara"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Rich Description Dialog */}
      <EventDescriptionDialog
        open={isDescDialogOpen}
        onClose={() => setIsDescDialogOpen(false)}
        value={description}
        onSave={setDescription}
      />
    </div>
  );
}
