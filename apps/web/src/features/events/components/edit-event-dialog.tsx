import * as React from "react";
import {
  X,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Video,
  Pencil,
  Sparkles,
} from "lucide-react";
import type { CommunityEventDetailDto, CommunityEventSummaryDto } from "@starter/shared/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { useUpdateEvent } from "../hooks";

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

  const updateMutation = useUpdateEvent(event.slug);

  const [title, setTitle] = React.useState(event.title);
  const [description, setDescription] = React.useState(event.description);
  const [coverUrl, setCoverUrl] = React.useState(event.coverUrl);
  const [format, setFormat] = React.useState<"offline" | "online" | "hybrid">(event.format);
  const [venueName, setVenueName] = React.useState(event.venueName || "");
  const [venueAddress, setVenueAddress] = React.useState(event.venueAddress || "");
  const [onlineMeetingUrl, setOnlineMeetingUrl] = React.useState(
    ("onlineMeetingUrl" in event && event.onlineMeetingUrl) ? event.onlineMeetingUrl : "",
  );
  const [capacity, setCapacity] = React.useState<string>(
    event.capacity ? String(event.capacity) : "",
  );
  const [requiresApproval, setRequiresApproval] = React.useState(event.requiresApproval);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Parse start / end dates
  const startD = new Date(event.startsAt);
  const endD = new Date(event.endsAt);
  const [startDate, setStartDate] = React.useState(startD.toISOString().split("T")[0]);
  const [startTime, setStartTime] = React.useState(
    startD.toTimeString().slice(0, 5),
  );
  const [endDate, setEndDate] = React.useState(endD.toISOString().split("T")[0]);
  const [endTime, setEndTime] = React.useState(
    endD.toTimeString().slice(0, 5),
  );

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim()) {
      setErrorMsg("Judul acara wajib diisi.");
      return;
    }
    if (!description.trim()) {
      setErrorMsg("Deskripsi acara wajib diisi.");
      return;
    }

    try {
      const startsAt = new Date(`${startDate}T${startTime}:00`).toISOString();
      const endsAt = new Date(`${endDate}T${endTime}:00`).toISOString();

      await updateMutation.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        coverUrl: coverUrl.trim(),
        format,
        venueName: format !== "online" ? venueName.trim() || undefined : undefined,
        venueAddress: format !== "online" ? venueAddress.trim() || undefined : undefined,
        onlineMeetingUrl: format === "online" ? onlineMeetingUrl.trim() || undefined : undefined,
        startsAt,
        endsAt,
        capacity: capacity ? Number(capacity) : undefined,
        requiresApproval,
      });

      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal memperbarui acara.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200 select-none"
      style={{ overscrollBehavior: "contain" }}
    >
      <div
        data-lenis-prevent
        className="relative flex h-[90vh] max-h-[760px] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#16171b] text-white shadow-2xl"
        style={{ overscrollBehavior: "contain" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 bg-[#141518]">
          <div className="flex items-center gap-2">
            <Pencil className="size-4 text-amber-500" />
            <h2 className="text-base font-bold text-white">Edit Detail Acara</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs scrollbar-thin"
          style={{ overscrollBehavior: "contain" }}
        >
          {errorMsg && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              {errorMsg}
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <label className="font-semibold text-white/80">Judul Acara</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-black/40 border-white/10 text-white rounded-xl h-10 text-xs"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="font-semibold text-white/80">Deskripsi Acara</label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500/80 resize-none"
            />
          </div>

          {/* Banner URL */}
          <div className="space-y-1.5">
            <label className="font-semibold text-white/80">URL Banner Poster</label>
            <Input
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              className="bg-black/40 border-white/10 text-white rounded-xl h-9 text-xs font-mono"
            />
          </div>

          {/* Format */}
          <div className="space-y-1.5">
            <label className="font-semibold text-white/80">Format Pertemuan</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFormat("offline")}
                className={`flex-1 rounded-xl border p-2.5 text-center font-medium transition-colors cursor-pointer ${
                  format === "offline"
                    ? "border-amber-500 bg-amber-500/15 text-amber-300"
                    : "border-white/10 bg-black/30 text-white/60 hover:text-white"
                }`}
              >
                Tatap Muka (Luring)
              </button>
              <button
                type="button"
                onClick={() => setFormat("online")}
                className={`flex-1 rounded-xl border p-2.5 text-center font-medium transition-colors cursor-pointer ${
                  format === "online"
                    ? "border-amber-500 bg-amber-500/15 text-amber-300"
                    : "border-white/10 bg-black/30 text-white/60 hover:text-white"
                }`}
              >
                Virtual (Daring)
              </button>
            </div>
          </div>

          {/* Location / Meeting URL */}
          {format === "online" ? (
            <div className="space-y-1.5">
              <label className="font-semibold text-white/80 flex items-center gap-1.5">
                <Video className="size-3.5 text-blue-400" />
                Tautan Rapat Virtual (Google Meet / Zoom)
              </label>
              <Input
                value={onlineMeetingUrl}
                onChange={(e) => setOnlineMeetingUrl(e.target.value)}
                placeholder="https://meet.google.com/..."
                className="bg-black/40 border-white/10 text-white rounded-xl h-9 text-xs"
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="font-semibold text-white/80 flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-amber-500" />
                  Nama Tempat / Kafe / Perpustakaan
                </label>
                <Input
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  className="bg-black/40 border-white/10 text-white rounded-xl h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-semibold text-white/80">Alamat Lengkap</label>
                <Input
                  value={venueAddress}
                  onChange={(e) => setVenueAddress(e.target.value)}
                  className="bg-black/40 border-white/10 text-white rounded-xl h-9 text-xs"
                />
              </div>
            </div>
          )}

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <label className="font-semibold text-white/80 flex items-center gap-1">
                <CalendarIcon className="size-3 text-amber-500" />
                Mulai
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-black/40 border-white/10 text-white rounded-xl h-9 text-xs"
              />
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="bg-black/40 border-white/10 text-white rounded-xl h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-white/80 flex items-center gap-1">
                <Clock className="size-3 text-amber-500" />
                Selesai
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-black/40 border-white/10 text-white rounded-xl h-9 text-xs"
              />
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="bg-black/40 border-white/10 text-white rounded-xl h-9 text-xs"
              />
            </div>
          </div>

          {/* Capacity & Approval */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <label className="font-semibold text-white/80">Kapasitas Kursi</label>
              <Input
                type="number"
                min="1"
                placeholder="Tak terbatas"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className="bg-black/40 border-white/10 text-white rounded-xl h-9 text-xs"
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 p-3 self-end h-14">
              <div>
                <span className="text-xs font-semibold text-white block">Perlu Persetujuan</span>
                <span className="text-[10px] text-white/40 block">Host menyetujui RSVP</span>
              </div>
              <input
                type="checkbox"
                checked={requiresApproval}
                onChange={(e) => setRequiresApproval(e.target.checked)}
                className="size-4 accent-amber-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/10">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="border-white/20 text-white/70 hover:bg-white/10 cursor-pointer text-xs"
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={updateMutation.isPending}
              className="rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs px-5 cursor-pointer"
            >
              {updateMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
