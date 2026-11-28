import * as React from "react";
import { Check, QrCode, Search, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { formatEventApiError } from "../event-description-doc";
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

  if (!open) return null;

  return (
    <EventAttendeesDialogContent
      key={eventSlug}
      onClose={onClose}
      eventSlug={eventSlug}
      eventTitle={eventTitle}
    />
  );
}

function EventAttendeesDialogContent({
  onClose,
  eventSlug,
  eventTitle,
}: Omit<EventAttendeesDialogProps, "open">) {
  const {
    data: attendees = [],
    isLoading,
    error,
  } = useEventAttendees(eventSlug);
  const approveMutation = useApproveRsvp(eventSlug);
  const rejectMutation = useRejectRsvp(eventSlug);
  const checkInMutation = useCheckInRsvp(eventSlug);

  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterTab, setFilterTab] = React.useState<
    "all" | "pending" | "going" | "waitlisted"
  >("all");
  const [manualCode, setManualCode] = React.useState("");
  const [codeFeedback, setCodeFeedback] = React.useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  const [actionFeedback, setActionFeedback] = React.useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  const [busyRsvpIds, setBusyRsvpIds] = React.useState<Set<string>>(
    () => new Set(),
  );

  const setRsvpBusy = (rsvpId: string, busy: boolean) => {
    setBusyRsvpIds((prev) => {
      const next = new Set(prev);
      if (busy) next.add(rsvpId);
      else next.delete(rsvpId);
      return next;
    });
  };

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const pendingCount = attendees.filter(
    (a) => a.status === "pending_approval",
  ).length;
  const goingCount = attendees.filter((a) => a.status === "going").length;
  const waitlistedCount = attendees.filter(
    (a) => a.status === "waitlisted",
  ).length;
  const checkedInCount = attendees.filter(
    (a) => a.status === "going" && Boolean(a.checkedInAt),
  ).length;

  const filteredAttendees = attendees.filter((a) => {
    if (filterTab === "pending" && a.status !== "pending_approval")
      return false;
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

  const handleManualCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    setCodeFeedback(null);
    try {
      await checkInMutation.mutateAsync({
        checkinCode: manualCode.trim().toUpperCase(),
      });
      setCodeFeedback({ ok: true, text: "Check-in peserta berhasil dicatat." });
      setManualCode("");
    } catch (err: unknown) {
      setCodeFeedback({
        ok: false,
        text: formatEventApiError(err, "Kode tiket tidak valid atau ditolak."),
      });
    }
  };

  const handleApprove = async (rsvpId: string, name: string) => {
    setActionFeedback(null);
    setRsvpBusy(rsvpId, true);
    try {
      await approveMutation.mutateAsync(rsvpId);
      setActionFeedback({
        ok: true,
        text: `${name} disetujui dan masuk daftar peserta hadir.`,
      });
    } catch (err: unknown) {
      setActionFeedback({
        ok: false,
        text: formatEventApiError(err, "Gagal menyetujui pendaftar."),
      });
    } finally {
      setRsvpBusy(rsvpId, false);
    }
  };

  const handleReject = async (rsvpId: string, name: string) => {
    setActionFeedback(null);
    setRsvpBusy(rsvpId, true);
    try {
      await rejectMutation.mutateAsync(rsvpId);
      setActionFeedback({
        ok: true,
        text: `Pendaftaran ${name} telah ditolak.`,
      });
    } catch (err: unknown) {
      setActionFeedback({
        ok: false,
        text: formatEventApiError(err, "Gagal menolak pendaftar."),
      });
    } finally {
      setRsvpBusy(rsvpId, false);
    }
  };

  const handleQuickCheckIn = async (
    rsvpId: string,
    code: string,
    name: string,
  ) => {
    setActionFeedback(null);
    setRsvpBusy(rsvpId, true);
    try {
      await checkInMutation.mutateAsync({ checkinCode: code });
      setActionFeedback({
        ok: true,
        text: `${name} berhasil ditandai sudah hadir.`,
      });
    } catch (err: unknown) {
      setActionFeedback({
        ok: false,
        text: formatEventApiError(err, "Gagal mencatat kehadiran peserta."),
      });
    } finally {
      setRsvpBusy(rsvpId, false);
    }
  };

  const renderStatusBadge = (status: string) => {
    if (status === "going") {
      return {
        label: "Terdaftar",
        cls: "bg-[var(--color-green-soft)] text-[var(--color-green)] border border-[var(--color-green)]/30",
      };
    }
    if (status === "pending_approval") {
      return {
        label: "Perlu Persetujuan",
        cls: "bg-[var(--color-accent-soft)] text-foreground border border-[var(--color-accent)]/40",
      };
    }
    if (status === "waitlisted") {
      return {
        label: "Daftar Tunggu",
        cls: "bg-[var(--color-paper-3)] text-foreground border border-border",
      };
    }
    if (status === "rejected") {
      return {
        label: "Ditolak",
        cls: "bg-[var(--color-error-soft)] text-[var(--color-error)] border border-[var(--color-error)]/30",
      };
    }
    if (status === "canceled") {
      return {
        label: "Dibatalkan",
        cls: "bg-[var(--color-paper-3)] text-muted-foreground border border-border",
      };
    }
    return {
      label: status,
      cls: "bg-[var(--color-paper-3)] text-foreground border border-border",
    };
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-3 sm:p-4 backdrop-blur-xs"
      style={{ overscrollBehavior: "contain" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="attendees-dialog-title"
    >
      <div
        data-lenis-prevent
        className="relative flex h-[88dvh] max-h-[760px] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card text-foreground shadow-2xl"
        style={{ overscrollBehavior: "contain" }}
      >
        <div className="flex items-center justify-between border-b border-border bg-[var(--color-paper-2)] px-5 py-3.5 gap-3">
          <div className="space-y-0.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Users
                className="size-4 text-[var(--color-accent)] shrink-0"
                aria-hidden="true"
              />
              <h2
                id="attendees-dialog-title"
                className="font-serif text-base font-bold text-foreground"
              >
                Kelola Peserta Acara
              </h2>
              <span className="rounded-md border border-border bg-background px-2 py-0.5 font-mono text-[11px] tabular-nums text-foreground">
                Hadir {checkedInCount}/{goingCount}
              </span>
            </div>
            <p className="text-xs text-muted-foreground truncate max-w-md">
              {eventTitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog peserta"
            className="size-11 shrink-0 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="border-b border-border bg-[var(--color-paper-2)]/60 p-4">
          <form
            onSubmit={handleManualCheckIn}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <QrCode
                className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <Input
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                placeholder="Masukkan kode tiket peserta (misal: CHK-A1B2)"
                aria-label="Kode tiket peserta"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                className="pl-9 h-11 text-xs bg-background border-border rounded-xl uppercase font-mono tracking-wider"
              />
            </div>
            <Button
              type="submit"
              disabled={checkInMutation.isPending || !manualCode.trim()}
              className="min-h-11 px-4 rounded-xl bg-[var(--color-accent)] text-[var(--color-accent-ink)] hover:opacity-90 font-semibold text-xs shrink-0"
            >
              {checkInMutation.isPending ? "Memproses..." : "Check-in"}
            </Button>
          </form>
          {codeFeedback && (
            <p
              role={codeFeedback.ok ? "status" : "alert"}
              className={`text-xs mt-2 font-medium ${
                codeFeedback.ok
                  ? "text-[var(--color-green)]"
                  : "text-[var(--color-error)]"
              }`}
            >
              {codeFeedback.text}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border p-4">
          <div
            role="group"
            aria-label="Filter status peserta"
            className="flex flex-wrap items-center gap-1 rounded-xl bg-[var(--color-paper-2)] p-1 text-xs"
          >
            <button
              type="button"
              aria-pressed={filterTab === "all"}
              onClick={() => setFilterTab("all")}
              className={`min-h-11 rounded-lg px-2.5 font-medium transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring ${
                filterTab === "all"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Semua ({attendees.length})
            </button>
            <button
              type="button"
              aria-pressed={filterTab === "pending"}
              onClick={() => setFilterTab("pending")}
              className={`min-h-11 rounded-lg px-2.5 font-medium transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring flex items-center gap-1.5 ${
                filterTab === "pending"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>Perlu Persetujuan</span>
              {pendingCount > 0 && (
                <span className="rounded-full border border-[var(--color-error)]/40 bg-[var(--color-error-soft)] px-1.5 text-[10px] font-bold text-[var(--color-error)] tabular-nums">
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              type="button"
              aria-pressed={filterTab === "going"}
              onClick={() => setFilterTab("going")}
              className={`min-h-11 rounded-lg px-2.5 font-medium transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring ${
                filterTab === "going"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Terdaftar ({goingCount})
            </button>
            <button
              type="button"
              aria-pressed={filterTab === "waitlisted"}
              onClick={() => setFilterTab("waitlisted")}
              className={`min-h-11 rounded-lg px-2.5 font-medium transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring ${
                filterTab === "waitlisted"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Daftar Tunggu ({waitlistedCount})
            </button>
          </div>

          <div className="relative w-full sm:w-48">
            <Search
              className="size-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama/email/kode..."
              aria-label="Cari peserta"
              className="pl-8 h-11 text-xs bg-[var(--color-paper-2)] border-border rounded-lg"
            />
          </div>
        </div>

        <div
          data-lenis-prevent
          className="flex-1 overflow-y-auto p-4 space-y-2.5"
          style={{ overscrollBehavior: "contain" }}
        >
          {actionFeedback && (
            <div
              role={actionFeedback.ok ? "status" : "alert"}
              className={`flex items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-medium ${
                actionFeedback.ok
                  ? "border-[var(--color-green)]/35 bg-[var(--color-green-soft)] text-foreground"
                  : "border-[var(--color-error)]/40 bg-[var(--color-error-soft)] text-[var(--color-error)]"
              }`}
            >
              <span>{actionFeedback.text}</span>
              <button
                type="button"
                onClick={() => setActionFeedback(null)}
                aria-label="Tutup pesan"
                className="size-11 -mr-2 inline-flex items-center justify-center rounded-md hover:bg-black/5 cursor-pointer focus-visible:outline-2 focus-visible:outline-ring"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </div>
          )}

          {error ? (
            <div
              role="alert"
              className="rounded-xl border border-[var(--color-error)]/40 bg-[var(--color-error-soft)] p-4 text-xs text-[var(--color-error)]"
            >
              {formatEventApiError(error, "Gagal memuat daftar peserta.")}
            </div>
          ) : isLoading ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              Memuat data pendaftar...
            </div>
          ) : filteredAttendees.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              Tidak ada peserta dalam filter ini.
            </div>
          ) : (
            filteredAttendees.map((att) => {
              const isCheckedIn = Boolean(att.checkedInAt);
              const badge = renderStatusBadge(att.status);
              const isBusy = busyRsvpIds.has(att.id);
              return (
                <div
                  key={att.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border bg-[var(--color-paper-2)] p-3.5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-[var(--color-accent-soft)] text-foreground font-bold text-xs uppercase">
                      {att.userName?.trim()?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-foreground text-xs truncate">
                          {att.userName}
                        </span>
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-semibold ${badge.cls}`}
                        >
                          {badge.label}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {att.userEmail}
                      </div>
                      <div className="text-[11px] font-mono text-muted-foreground mt-0.5">
                        Kode:{" "}
                        <span className="text-foreground font-semibold">
                          {att.checkinCode}
                        </span>
                        {isCheckedIn && (
                          <span className="text-[var(--color-green)] font-sans font-semibold ml-2">
                            Sudah Hadir
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {(att.status === "pending_approval" ||
                      att.status === "waitlisted") && (
                      <>
                        <Button
                          type="button"
                          disabled={isBusy}
                          onClick={() =>
                            void handleApprove(att.id, att.userName)
                          }
                          className="min-h-11 px-3.5 rounded-lg bg-[var(--color-accent)] text-[var(--color-accent-ink)] hover:opacity-90 font-semibold text-xs"
                        >
                          <Check className="size-3.5 mr-1" aria-hidden="true" />
                          Setujui
                        </Button>
                        {att.status === "pending_approval" && (
                          <Button
                            type="button"
                            variant="outline"
                            disabled={isBusy}
                            onClick={() =>
                              void handleReject(att.id, att.userName)
                            }
                            className="min-h-11 px-3 rounded-lg text-xs"
                          >
                            Tolak
                          </Button>
                        )}
                      </>
                    )}

                    {att.status === "going" && !isCheckedIn && (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isBusy}
                        onClick={() =>
                          void handleQuickCheckIn(
                            att.id,
                            att.checkinCode,
                            att.userName,
                          )
                        }
                        className="min-h-11 px-3.5 rounded-lg text-xs font-semibold"
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
