import * as React from "react";
import {
  X,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Check,
  QrCode,
} from "lucide-react";
import type { EventRsvpDto } from "@starter/shared/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import {
  useApproveRsvp,
  useCheckInRsvp,
  useEventAttendees,
  useRejectRsvp,
} from "../hooks";

interface EventAttendeesDialogProps {
  open: boolean;
  onClose: () => void;
  eventSlug: string;
  eventTitle: string;
}

export function EventAttendeesDialog({
  open,
  onClose,
  eventSlug,
  eventTitle,
}: EventAttendeesDialogProps) {
  useBodyScrollLock(open);

  const { data: attendees = [], isLoading } = useEventAttendees(eventSlug);
  const approveMutation = useApproveRsvp(eventSlug);
  const rejectMutation = useRejectRsvp(eventSlug);
  const checkInMutation = useCheckInRsvp(eventSlug);

  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterTab, setFilterTab] = React.useState<"all" | "pending" | "going" | "waitlisted">("all");
  const [manualCode, setManualCode] = React.useState("");
  const [codeFeedback, setCodeFeedback] = React.useState<string | null>(null);

  if (!open) return null;

  const filteredAttendees = attendees.filter((a) => {
    if (filterTab === "pending" && a.status !== "pending_approval") return false;
    if (filterTab === "going" && a.status !== "going") return false;
    if (filterTab === "waitlisted" && a.status !== "waitlisted") return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        a.userName.toLowerCase().includes(q) ||
        a.userEmail.toLowerCase().includes(q) ||
        a.checkinCode.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const pendingCount = attendees.filter((a) => a.status === "pending_approval").length;
  const goingCount = attendees.filter((a) => a.status === "going").length;

  const handleManualCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    try {
      await checkInMutation.mutateAsync({ checkinCode: manualCode.trim() });
      setCodeFeedback("Check-in berhasil!");
      setManualCode("");
      setTimeout(() => setCodeFeedback(null), 2500);
    } catch (err: any) {
      setCodeFeedback(err.message || "Kode tiket tidak valid.");
      setTimeout(() => setCodeFeedback(null), 3500);
    }
  };

  const handleQuickCheckIn = async (code: string) => {
    try {
      await checkInMutation.mutateAsync({ checkinCode: code });
    } catch {
      // handled
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200 select-none"
      style={{ overscrollBehavior: "contain" }}
    >
      <div
        data-lenis-prevent
        className="relative flex h-[88vh] max-h-[720px] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#16171b] text-white shadow-2xl"
        style={{ overscrollBehavior: "contain" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 bg-[#141518]">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-amber-500" />
              <h2 className="text-base font-bold text-white">Kelola Peserta Acara</h2>
            </div>
            <p className="text-xs text-white/50 truncate max-w-md">{eventTitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Quick Check-in Bar */}
        <div className="border-b border-white/10 bg-white/5 p-4">
          <form onSubmit={handleManualCheckIn} className="flex items-center gap-2">
            <div className="relative flex-1">
              <QrCode className="size-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                placeholder="Masukkan kode tiket peserta (misal: CHK-A1B2)"
                className="pl-9 h-9 text-xs bg-black/40 border-white/10 text-white placeholder:text-white/30 rounded-xl uppercase font-mono tracking-wider"
              />
            </div>
            <Button
              type="submit"
              size="sm"
              disabled={checkInMutation.isPending || !manualCode.trim()}
              className="h-9 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs cursor-pointer shrink-0"
            >
              {checkInMutation.isPending ? "Memproses..." : "Check-in"}
            </Button>
          </form>
          {codeFeedback && (
            <p className={`text-[11px] mt-1.5 font-medium ${codeFeedback.includes("berhasil") ? "text-emerald-400" : "text-rose-400"}`}>
              {codeFeedback}
            </p>
          )}
        </div>

        {/* Filter Tabs & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 p-4">
          <div className="flex items-center gap-1 rounded-xl bg-white/5 p-1 text-xs">
            <button
              type="button"
              onClick={() => setFilterTab("all")}
              className={`rounded-lg px-2.5 py-1 font-medium transition-colors cursor-pointer ${
                filterTab === "all" ? "bg-white/15 text-white" : "text-white/50 hover:text-white"
              }`}
            >
              Semua ({attendees.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("pending")}
              className={`rounded-lg px-2.5 py-1 font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                filterTab === "pending" ? "bg-white/15 text-white" : "text-white/50 hover:text-white"
              }`}
            >
              <span>Perlu Persetujuan</span>
              {pendingCount > 0 && (
                <span className="rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("going")}
              className={`rounded-lg px-2.5 py-1 font-medium transition-colors cursor-pointer ${
                filterTab === "going" ? "bg-white/15 text-white" : "text-white/50 hover:text-white"
              }`}
            >
              Diterima ({goingCount})
            </button>
          </div>

          <div className="relative w-full sm:w-48">
            <Search className="size-3.5 text-white/40 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama/email..."
              className="pl-8 h-8 text-xs bg-black/40 border-white/10 text-white placeholder:text-white/30 rounded-lg"
            />
          </div>
        </div>

        {/* Attendees List */}
        <div
          data-lenis-prevent
          className="flex-1 overflow-y-auto p-4 space-y-2.5 scrollbar-thin"
          style={{ overscrollBehavior: "contain" }}
        >
          {isLoading ? (
            <div className="py-12 text-center text-xs text-white/40">
              Memuat data pendaftar...
            </div>
          ) : filteredAttendees.length === 0 ? (
            <div className="py-12 text-center text-xs text-white/40">
              Tidak ada peserta dalam filter ini.
            </div>
          ) : (
            filteredAttendees.map((att) => {
              const isCheckedIn = Boolean(att.checkedInAt);
              return (
                <div
                  key={att.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-3.5 hover:bg-white/[0.07] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-300 font-bold text-xs uppercase">
                      {att.userName[0]}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-xs truncate">
                          {att.userName}
                        </span>
                        {/* Status Badge */}
                        <span
                          className={`rounded px-1.5 py-0.2 text-[10px] font-medium ${
                            att.status === "going"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : att.status === "pending_approval"
                              ? "bg-amber-500/20 text-amber-300"
                              : att.status === "waitlisted"
                              ? "bg-blue-500/20 text-blue-300"
                              : "bg-white/10 text-white/40"
                          }`}
                        >
                          {att.status === "going"
                            ? "Terdaftar"
                            : att.status === "pending_approval"
                            ? "Perlu Persetujuan"
                            : att.status === "waitlisted"
                            ? "Daftar Tunggu"
                            : att.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-white/50 truncate">{att.userEmail}</div>
                      <div className="text-[10px] font-mono text-white/40 mt-0.5">
                        Kode: <span className="text-white/70">{att.checkinCode}</span>
                        {isCheckedIn && (
                          <span className="text-emerald-400 font-sans ml-2">✓ Sudah Hadir</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions per attendee */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {att.status === "pending_approval" && (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          disabled={approveMutation.isPending}
                          onClick={() => approveMutation.mutate(att.id)}
                          className="h-7 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black font-semibold text-xs cursor-pointer"
                        >
                          <Check className="size-3 mr-1" />
                          Setujui
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={rejectMutation.isPending}
                          onClick={() => rejectMutation.mutate(att.id)}
                          className="h-7 px-2.5 rounded-lg border-white/20 text-white/60 hover:bg-rose-500/20 hover:text-rose-200 cursor-pointer text-xs"
                        >
                          Tolak
                        </Button>
                      </>
                    )}

                    {att.status === "going" && !isCheckedIn && (
                      <Button
                        type="button"
                        size="sm"
                        disabled={checkInMutation.isPending}
                        onClick={() => handleQuickCheckIn(att.checkinCode)}
                        className="h-7 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium text-xs border border-white/15 cursor-pointer"
                      >
                        Check-in
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
