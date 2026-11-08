import * as React from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCalendars, useCreateEvent } from "../hooks";
import {
  LocationPickerPopover,
  type SelectedLocationState,
} from "./location-picker-popover";
import { ApplyCalendarDialog } from "./apply-calendar-dialog";

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
  const { data: calendars = [] } = useCalendars();
  const createEventMutation = useCreateEvent();

  const [selectedCalendarId, setSelectedCalendarId] = React.useState<string>("");
  const [isApplyCalendarOpen, setIsApplyCalendarOpen] = React.useState(false);

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

  const [description, setDescription] = React.useState("");
  const [logisticsNotes, setLogisticsNotes] = React.useState("");

  // Featured Work / Book
  const [isLinkingWork, setIsLinkingWork] = React.useState(false);
  const [workMediaType, setWorkMediaType] = React.useState<
    "book" | "film" | "article" | "other"
  >("book");
  const [workTitle, setWorkTitle] = React.useState("");
  const [workCreator, setWorkCreator] = React.useState("");
  const [workUrl, setWorkUrl] = React.useState("");

  // Settings
  const [requiresApproval, setRequiresApproval] = React.useState(false);
  const [isUnlimitedCapacity, setIsUnlimitedCapacity] = React.useState(true);
  const [capacity, setCapacity] = React.useState<number>(30);
  const [allowWaitlist, setAllowWaitlist] = React.useState(true);

  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Auto-select first calendar
  React.useEffect(() => {
    if (calendars.length > 0 && !selectedCalendarId) {
      const myCal = calendars.find((c) => c.isManager) || calendars[0];
      setSelectedCalendarId(myCal.id);
    }
  }, [calendars, selectedCalendarId]);

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
          // Compress to JPEG with 0.8 quality
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
      setErrorMsg("Pilih atau buat kalender untuk acara ini.");
      return;
    }
    if (title.trim().length < 3) {
      setErrorMsg("Nama acara minimal 3 karakter.");
      return;
    }
    if (description.trim().length < 10) {
      setErrorMsg("Deskripsi acara minimal 10 karakter.");
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
        title: title.trim(),
        description: description.trim(),
        logisticsNotes: logisticsNotes.trim() || undefined,
        coverUrl,
        themePreset,
        visibility,
        eventType,
        categoryTag: categoryTag.trim() || "Literasi",
        format: locationState.format || "offline",
        district: locationState.district || undefined,
        city: locationState.city || undefined,
        venueName: locationState.venueName || undefined,
        venueAddress: locationState.venueAddress || undefined,
        hideAddressUntilApproved: locationState.hideAddressUntilApproved,
        latitude: locationState.latitude || undefined,
        longitude: locationState.longitude || undefined,
        placeSourceLat: locationState.placeSourceLat || undefined,
        placeSourceLng: locationState.placeSourceLng || undefined,
        onlineMeetingUrl: locationState.onlineMeetingUrl || undefined,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative flex h-[94vh] max-h-[820px] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border shadow-2xl transition-colors duration-300"
        style={{
          backgroundColor: currentTheme.bg,
          borderColor: currentTheme.border,
        }}
      >
        {/* Top Header */}
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
            className="flex size-8 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* 2-Column Luma Studio Content */}
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden lg:flex-row">
          {/* Left Column: 1:1 Poster Upload & Theme Picker (Luma Screenshot 1) */}
          <div className="flex flex-col items-center border-b border-white/10 p-6 lg:w-[380px] lg:border-r lg:border-b-0 overflow-y-auto">
            {/* 1:1 Poster Frame */}
            <div className="relative aspect-square w-full max-w-[280px] overflow-hidden rounded-2xl border-2 border-white/10 bg-black/40 shadow-xl group">
              <img
                src={coverUrl}
                alt="Banner Acara"
                className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
              />

              {/* Upload trigger overlay button at bottom right */}
              <label className="absolute right-3 bottom-3 flex size-10 cursor-pointer items-center justify-center rounded-full bg-black/75 text-white shadow-lg backdrop-blur-xs hover:bg-black transition-colors">
                <Camera className="size-5" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Quick Preset Selector */}
            <div className="mt-3 flex gap-2">
              {PRESET_BANNERS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCoverUrl(preset)}
                  className={`size-8 overflow-hidden rounded-md border transition-all ${
                    coverUrl === preset
                      ? "border-amber-400 scale-105"
                      : "border-white/20 opacity-60 hover:opacity-100"
                  }`}
                >
                  <img src={preset} alt="" className="size-full object-cover" />
                </button>
              ))}
            </div>

            {/* Theme Picker Pill (Luma Screenshot 1) */}
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
                className="flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
              >
                <Shuffle className="size-4" />
              </button>
            </div>
          </div>

          {/* Right Column: Title, Dates, Location, Work Linker & Settings */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5 text-white">
            {errorMsg && (
              <div className="rounded-lg border border-red-500/40 bg-red-500/15 p-3 text-xs text-red-200">
                {errorMsg}
              </div>
            )}

            {/* Top Bar: Calendar & Visibility dropdowns */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-white/50">Host:</span>
                <select
                  value={selectedCalendarId}
                  onChange={(e) => {
                    if (e.target.value === "__NEW__") {
                      setIsApplyCalendarOpen(true);
                    } else {
                      setSelectedCalendarId(e.target.value);
                    }
                  }}
                  className="rounded-lg border border-white/10 bg-white/10 px-3 py-1.5 font-medium text-amber-300 outline-none cursor-pointer"
                >
                  {calendars.map((cal) => (
                    <option key={cal.id} value={cal.id} className="bg-[#1b1c20] text-white">
                      {cal.name} ({cal.type === "community" ? "Komunitas" : cal.type})
                    </option>
                  ))}
                  <option value="__NEW__" className="bg-[#1b1c20] text-amber-400 font-semibold">
                    + Buat Kalender Komunitas Baru...
                  </option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-white/70">
                {visibility === "public" ? (
                  <Globe className="size-3.5 text-emerald-400" />
                ) : (
                  <Lock className="size-3.5 text-amber-400" />
                )}
                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as any)}
                  className="bg-transparent text-xs text-white outline-none cursor-pointer"
                >
                  <option value="public" className="bg-[#1b1c20] text-white">Publik</option>
                  <option value="private_link" className="bg-[#1b1c20] text-white">Tautan Privat</option>
                </select>
              </div>
            </div>

            {/* Big Event Title Input (Luma Screenshot 1) */}
            <div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Nama Acara"
                className="w-full bg-transparent text-2xl sm:text-3xl font-bold text-white placeholder-white/30 outline-none"
                required
              />
            </div>

            {/* Date & Time Picker Card matching Luma UI */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Mulai & Akhir */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-12 text-white/50">Mulai</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="rounded border border-white/10 bg-white/10 px-2 py-1 text-white outline-none"
                    />
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="rounded border border-white/10 bg-white/10 px-2 py-1 text-white outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="w-12 text-white/50">Akhir</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="rounded border border-white/10 bg-white/10 px-2 py-1 text-white outline-none"
                    />
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="rounded border border-white/10 bg-white/10 px-2 py-1 text-white outline-none"
                    />
                  </div>
                </div>

                {/* Timezone badge */}
                <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white/60">
                  <Clock className="size-3.5 text-white/40" />
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

            {/* Description Input */}
            <div className="space-y-1.5">
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tambahkan deskripsi acara, pembicara, agenda diskusi, dan yang perlu dibawa..."
                className="bg-white/5 border-white/10 text-white placeholder-white/40 min-h-[100px] text-xs"
                required
              />
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
                  className="text-xs text-amber-400 hover:text-amber-300 font-medium"
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
                        onClick={() => setWorkMediaType(mt)}
                        className={`rounded px-2.5 py-1 text-[11px] font-medium capitalize transition-colors ${
                          workMediaType === mt
                            ? "bg-amber-400/20 text-amber-300 border border-amber-400/40"
                            : "bg-white/5 text-white/60 hover:bg-white/10"
                        }`}
                      >
                        {mt === "book" ? "Buku" : mt === "film" ? "Film" : mt}
                      </button>
                    ))}
                  </div>

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

            {/* Event Options ("Opsi Acara" matching Luma Screenshot 1) */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs space-y-3">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-white/50">
                Opsi Acara
              </div>

              {/* Harga Tiket */}
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2 text-white/80">
                  <span className="text-white">Harga Tiket</span>
                </div>
                <div className="flex items-center gap-1.5 text-white/60 font-medium">
                  <span>Gratis</span>
                </div>
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

              {/* Kapasitas Peserta */}
              <div className="flex items-center justify-between border-t border-white/5 pt-2.5">
                <div>
                  <div className="font-medium text-white">Kapasitas Kursi</div>
                  <div className="text-[11px] text-white/40">
                    Batas jumlah peserta yang dapat hadir
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isUnlimitedCapacity ? (
                    <button
                      type="button"
                      onClick={() => setIsUnlimitedCapacity(false)}
                      className="text-white/60 hover:text-white underline"
                    >
                      Tak terbatas
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="1"
                        max="1000"
                        value={capacity}
                        onChange={(e) => setCapacity(parseInt(e.target.value) || 10)}
                        className="w-16 rounded border border-white/10 bg-white/10 px-2 py-1 text-center text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setIsUnlimitedCapacity(true)}
                        className="text-[11px] text-white/40 hover:text-white"
                      >
                        Reset
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Daftar Tunggu (Waitlist) */}
              {!isUnlimitedCapacity && (
                <div className="flex items-center justify-between border-t border-white/5 pt-2.5">
                  <div>
                    <div className="font-medium text-white">Daftar Tunggu</div>
                    <div className="text-[11px] text-white/40">
                      Izinkan peserta masuk antrean saat kuota penuh
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowWaitlist}
                      onChange={(e) => setAllowWaitlist(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-400"></div>
                  </label>
                </div>
              )}
            </div>

            {/* Primary Action Button (Luma Screenshot 1) */}
            <div className="pt-2">
              <Button
                type="submit"
                disabled={createEventMutation.isPending}
                className="w-full h-12 rounded-xl bg-white text-black font-semibold hover:bg-white/90 text-sm shadow-xl transition-all cursor-pointer"
              >
                {createEventMutation.isPending ? "Menerbitkan Acara..." : "Buat Acara"}
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* Nested Host Calendar Application Dialog */}
      <ApplyCalendarDialog
        open={isApplyCalendarOpen}
        onClose={() => setIsApplyCalendarOpen(false)}
        onSuccess={(slug) => {
          // Find or select the newly created calendar
        }}
      />
    </div>
  );
}
