import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  FileSearch,
  LoaderCircle,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserX,
  XCircle,
} from "lucide-react";
import { decodeZeroWidthFingerprint } from "@starter/shared/drm-steganography";
import type {
  DrmSecurityEventType,
  DrmSecurityRiskLevel,
  DrmSuspensionStatus,
} from "@starter/shared/types";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useAdminDrmEvents,
  useAdminDrmSuspensions,
  useAdminDrmTrace,
  useReviewAdminDrmSuspension,
} from "../hooks";

const EVENT_TYPE_LABELS: Record<DrmSecurityEventType, string> = {
  screenshot_shortcut: "Pintasan Screenshot",
  clipboard_copy: "Salin / Cut Teks",
  devtools_attempt: "Buka DevTools / Source",
  dom_tampering: "Manipulasi Node Watermark",
  print_save_attempt: "Cetak / Simpan Halaman",
  api_scrape_anomaly: "Anomali Scrape Bab (API)",
  context_menu: "Klik Kanan (Context Menu)",
  drag_attempt: "Seret Konten (Drag)",
  visibility_hidden: "Pindah Tab / Minimize",
  window_blur: "Jendela Hilang Fokus",
  multi_touch: "Sentuhan Multi-Jari",
};

const RISK_META: Record<
  DrmSecurityRiskLevel,
  { label: string; priorityNote: string; badgeClass: string }
> = {
  high: {
    label: "HIGH RISK",
    priorityNote: "Prioritas Tinggi",
    badgeClass:
      "border-destructive/40 bg-destructive/10 text-destructive font-bold",
  },
  medium: {
    label: "MEDIUM",
    priorityNote: "Pantau Pola",
    badgeClass:
      "border-amber-600/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold",
  },
  low: {
    label: "LOW",
    priorityNote: "Aktivitas Fokus",
    badgeClass: "border-border bg-muted text-muted-foreground font-medium",
  },
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

function getTraceErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Gagal melacak ID watermark.";
}

const SUSPENSION_STATUS_META: Record<
  DrmSuspensionStatus,
  { label: string; badgeClass: string }
> = {
  suspended: {
    label: "Dibekukan (Auto)",
    badgeClass:
      "border-destructive/40 bg-destructive/10 text-destructive font-bold",
  },
  appeal_pending: {
    label: "Menunggu Tinjauan",
    badgeClass:
      "border-amber-600/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold",
  },
  reinstated: {
    label: "Dipulihkan",
    badgeClass:
      "border-emerald-600/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold",
  },
  rejected: {
    label: "Ditolak",
    badgeClass: "border-border bg-muted text-muted-foreground font-semibold",
  },
};

export function DrmSecurityTab() {
  const [riskFilter, setRiskFilter] = useState<"all" | DrmSecurityRiskLevel>(
    "all",
  );
  const [eventFilter, setEventFilter] = useState<"all" | DrmSecurityEventType>(
    "all",
  );
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [traceInput, setTraceInput] = useState("");
  const [activeTraceCode, setActiveTraceCode] = useState("");
  const [stegoInput, setStegoInput] = useState("");
  const [stegoStatus, setStegoStatus] = useState<string | null>(null);
  const [suspensionFilter, setSuspensionFilter] = useState<
    "all" | DrmSuspensionStatus
  >("all");
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  const {
    data: response,
    isLoading,
    isFetching,
    refetch,
  } = useAdminDrmEvents({
    riskLevel: riskFilter,
    eventType: eventFilter,
    search: appliedSearch || undefined,
    limit: 50,
    offset: 0,
  });

  const {
    data: traceResult,
    isLoading: traceLoading,
    isError: traceIsError,
    error: traceError,
  } = useAdminDrmTrace(activeTraceCode);

  const { data: suspensionsResponse, isLoading: suspensionsLoading } =
    useAdminDrmSuspensions({
      status: suspensionFilter,
      limit: 50,
      offset: 0,
    });
  const reviewSuspensionMutation = useReviewAdminDrmSuspension();

  const summary = response?.summary ?? {
    totalEvents: 0,
    highRiskCount: 0,
    mediumRiskCount: 0,
    lowRiskCount: 0,
    last24hHighRiskCount: 0,
    uniqueFlaggedUsersCount: 0,
  };
  const events = response?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Monitor Keamanan DRM &amp; Audit Sesi
          </h2>
          <p className="text-sm text-muted-foreground">
            Pantau pemicu DRM di E-Reader berdasarkan tingkat risiko (High Risk
            seperti screenshot, copy, &amp; DevTools diprioritaskan di atas
            perpindahan tab).
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="min-h-11 gap-2 self-start sm:self-auto font-mono text-xs"
        >
          <RefreshCw
            className={`size-4 ${isFetching ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          Muat Ulang Log
        </Button>
      </div>

      {/* Tabular Summary Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border border border-border rounded-xl overflow-hidden">
        <div className="bg-card p-4 space-y-1">
          <p className="font-mono text-[11px] uppercase tracking-wider text-destructive flex items-center gap-1.5">
            <ShieldAlert className="size-3.5" aria-hidden="true" />
            High Risk (24 Jam)
          </p>
          <p className="font-mono text-2xl font-bold tabular-nums text-foreground">
            {summary.last24hHighRiskCount}
          </p>
          <p className="text-xs text-muted-foreground">
            Total high risk: {summary.highRiskCount}
          </p>
        </div>

        <div className="bg-card p-4 space-y-1">
          <p className="font-mono text-[11px] uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
            <AlertTriangle className="size-3.5" aria-hidden="true" />
            Medium Risk
          </p>
          <p className="font-mono text-2xl font-bold tabular-nums text-foreground">
            {summary.mediumRiskCount}
          </p>
          <p className="text-xs text-muted-foreground">
            Klik kanan &amp; drag konten
          </p>
        </div>

        <div className="bg-card p-4 space-y-1">
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Eye className="size-3.5" aria-hidden="true" />
            Low Risk (Fokus/Tab)
          </p>
          <p className="font-mono text-2xl font-bold tabular-nums text-foreground">
            {summary.lowRiskCount}
          </p>
          <p className="text-xs text-muted-foreground">
            Pindah tab &amp; window blur
          </p>
        </div>

        <div className="bg-card p-4 space-y-1">
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            Akun High Risk Unik
          </p>
          <p className="font-mono text-2xl font-bold tabular-nums text-foreground">
            {summary.uniqueFlaggedUsersCount}
          </p>
          <p className="text-xs text-muted-foreground">
            Dari {summary.totalEvents} total event
          </p>
        </div>
      </div>

      {/* Forensic Watermark Session ID Tracer (PRD DRM-03) */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-foreground">
            Pelacakan ID Sesi Watermark (DRM-03)
          </h3>
          <p className="text-xs text-muted-foreground">
            Masukkan kode sesi DRM (contoh:{" "}
            <code className="font-mono">ANZ-A1B2C3D4E5F6</code>) dari ekstraktor
            steganografi, layar kunci, atau log keamanan untuk mengetahui akun
            pembaca terkait tanpa menampilkan email di layar pembaca.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setActiveTraceCode(traceInput.trim().toUpperCase());
          }}
          className="flex flex-col sm:flex-row gap-2.5"
        >
          <Input
            value={traceInput}
            onChange={(e) => setTraceInput(e.target.value)}
            placeholder="Masukkan ID Watermark (mis. ANZ-7F3A9C21B401)"
            aria-label="ID Sesi Watermark"
            className="min-h-11 font-mono text-xs uppercase"
          />
          <Button
            type="submit"
            variant="outline"
            disabled={!traceInput.trim() || traceLoading}
            className="min-h-11 gap-2 shrink-0 font-mono text-xs"
          >
            <Search className="size-4" aria-hidden="true" />
            Lacak Sesi
          </Button>
        </form>

        {traceLoading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            Menelusuri sesi watermark...
          </div>
        )}

        {traceIsError && activeTraceCode && (
          <p role="alert" className="text-xs text-destructive font-medium">
            {getTraceErrorMessage(traceError)}
          </p>
        )}

        {traceResult && (
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-mono font-bold text-foreground">
                {traceResult.watermarkCode}
              </div>
              <span className="text-muted-foreground font-mono">
                Terakhir aktif: {formatDate(traceResult.lastSeenAt)}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <div>
                <span className="text-muted-foreground block">Pembaca</span>
                <strong className="text-foreground">
                  {traceResult.username
                    ? `@${traceResult.username}`
                    : traceResult.userName}
                </strong>{" "}
                <span className="text-muted-foreground">
                  ({traceResult.userName})
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Email Akun</span>
                <span className="font-mono text-foreground break-all">
                  {traceResult.userEmail}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Judul Buku</span>
                <span className="text-foreground font-medium">
                  {traceResult.bookTitle} ({traceResult.bookSlug})
                </span>
              </div>
            </div>
            <div className="text-muted-foreground pt-1">
              Total insiden pada sesi watermark ini:{" "}
              <strong className="text-foreground">
                {traceResult.recentEvents.length}
              </strong>
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-border/60 space-y-3">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <FileSearch className="size-3.5" aria-hidden="true" />
              Ekstraktor Sidik Jari Teks Tersembunyi (Steganografi)
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tempel teks salinan atau hasil scraping naskah pembaca untuk
              mengungkap sidik jari zero-width tak kasatmata dan langsung
              melacak akunnya.
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const extracted = decodeZeroWidthFingerprint(stegoInput);
              if (!extracted) {
                setStegoStatus(
                  "Tidak ditemukan sidik jari zero-width DRM pada teks tersebut.",
                );
                return;
              }
              setStegoStatus(`Sidik jari terungkap: ${extracted}`);
              setTraceInput(extracted);
              setActiveTraceCode(extracted);
            }}
            className="space-y-2.5"
          >
            <textarea
              value={stegoInput}
              onChange={(e) => setStegoInput(e.target.value)}
              aria-label="Tempel Teks Bocoran Steganografi"
              rows={2}
              placeholder="Tempel teks naskah bocoran yang mengandung karakter zero-width tersembunyi..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              {stegoStatus ? (
                <p className="text-xs font-mono text-foreground">
                  {stegoStatus}
                </p>
              ) : (
                <span />
              )}
              <Button
                type="submit"
                variant="outline"
                disabled={!stegoInput}
                className="min-h-11 gap-2 font-mono text-xs"
              >
                <FileSearch className="size-4" aria-hidden="true" />
                Ekstrak ID Watermark
              </Button>
            </div>
          </form>
        </div>
      </section>

      {/* Auto-Suspended Readers & Appeals Queue (Option C - Limit 7 High Risk) */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <UserX className="size-4 text-destructive" aria-hidden="true" />
              Pembekuan E-Reader &amp; Peninjauan Akses (Batas 7 High Risk)
            </h3>
            <p className="text-xs text-muted-foreground">
              Akun yang mencapai 7 pelanggaran High Risk dibekukan otomatis dari
              E-Reader hingga ditinjau Admin. Bila disetujui, hitungan kembali
              ke 0 untuk siklus baru.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
            <span className="px-2.5 py-1 rounded-md border border-amber-600/30 bg-amber-500/10 text-amber-700 dark:text-amber-400">
              Pending: {suspensionsResponse?.summary.appealPendingCount ?? 0}
            </span>
            <span className="px-2.5 py-1 rounded-md border border-destructive/30 bg-destructive/10 text-destructive">
              Dibekukan:{" "}
              {suspensionsResponse?.summary.activeSuspendedCount ?? 0}
            </span>
          </div>
        </div>

        <div
          className="flex flex-wrap gap-1.5"
          role="group"
          aria-label="Filter Status Pembekuan"
        >
          {(
            [
              { id: "all", label: "Semua Status" },
              { id: "appeal_pending", label: "Menunggu Tinjauan" },
              { id: "suspended", label: "Dibekukan" },
              { id: "reinstated", label: "Dipulihkan" },
              { id: "rejected", label: "Ditolak" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSuspensionFilter(item.id)}
              aria-pressed={suspensionFilter === item.id}
              className={`min-h-10 px-3 rounded-lg border text-xs font-mono transition-colors cursor-pointer ${
                suspensionFilter === item.id
                  ? "bg-foreground text-background border-foreground font-bold"
                  : "bg-background text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {suspensionsLoading ? (
          <div className="py-6 text-center text-xs text-muted-foreground">
            Memuat daftar pembekuan E-Reader...
          </div>
        ) : (suspensionsResponse?.data?.length ?? 0) === 0 ? (
          <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
            Tidak ada akun pada filter status pembekuan ini.
          </div>
        ) : (
          <div className="space-y-3">
            {suspensionsResponse?.data.map((item) => {
              const statusMeta = SUSPENSION_STATUS_META[item.status];
              const noteDraft = reviewNotes[item.id] ?? "";
              const isActionable = item.status !== "reinstated";
              return (
                <div
                  key={item.id}
                  className="rounded-lg border border-border bg-muted/20 p-4 space-y-3 text-xs"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded border font-mono text-[10px] ${statusMeta.badgeClass}`}
                        >
                          {statusMeta.label}
                        </span>
                        <strong className="text-foreground">
                          {item.username ? `@${item.username}` : item.userName}
                        </strong>
                        <span className="text-muted-foreground font-mono">
                          ({item.userEmail})
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Siklus ke-{item.cycleNumber} • {item.triggerCount} / 7
                        High Risk • Pemicu terakhir:{" "}
                        <span className="text-foreground font-medium">
                          {EVENT_TYPE_LABELS[item.lastEventType] ??
                            item.lastEventType}
                        </span>
                        {item.lastBookSlug ? ` (${item.lastBookSlug})` : ""}
                      </p>
                    </div>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {formatDate(item.suspendedAt)}
                    </span>
                  </div>

                  {item.appealMessage && (
                    <div className="rounded-md border border-border bg-card p-3 space-y-1">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground block">
                        Permintaan Peninjauan Pembaca:
                      </span>
                      <p className="text-foreground">{item.appealMessage}</p>
                    </div>
                  )}

                  {item.reviewNote && (
                    <p className="text-[11px] text-muted-foreground">
                      <strong className="text-foreground">
                        Catatan Review:
                      </strong>{" "}
                      {item.reviewNote}
                    </p>
                  )}

                  {isActionable && (
                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                      <Input
                        value={noteDraft}
                        onChange={(e) =>
                          setReviewNotes((prev) => ({
                            ...prev,
                            [item.id]: e.target.value,
                          }))
                        }
                        aria-label={`Catatan tinjauan untuk ${item.userEmail}`}
                        placeholder="Catatan peninjauan Admin (opsional)..."
                        className="min-h-10 text-xs flex-1"
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          disabled={reviewSuspensionMutation.isPending}
                          onClick={() =>
                            reviewSuspensionMutation.mutate({
                              id: item.id,
                              input: {
                                action: "approve",
                                reviewNote: noteDraft.trim() || undefined,
                              },
                            })
                          }
                          className="min-h-10 gap-1.5 font-mono text-xs"
                        >
                          <CheckCircle2
                            className="size-3.5"
                            aria-hidden="true"
                          />
                          Pulihkan Akses Baca
                        </Button>
                        {item.status !== "rejected" && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={reviewSuspensionMutation.isPending}
                            onClick={() =>
                              reviewSuspensionMutation.mutate({
                                id: item.id,
                                input: {
                                  action: "reject",
                                  reviewNote: noteDraft.trim() || undefined,
                                },
                              })
                            }
                            className="min-h-10 gap-1.5 font-mono text-xs text-destructive hover:text-destructive"
                          >
                            <XCircle className="size-3.5" aria-hidden="true" />
                            Tolak
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Filters & Search Bar */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        <div
          className="flex flex-wrap gap-1.5"
          role="group"
          aria-label="Filter Tingkat Risiko"
        >
          {(
            [
              { id: "all", label: "Semua Risiko" },
              { id: "high", label: "Prioritas Tinggi (High)" },
              { id: "medium", label: "Sedang (Medium)" },
              { id: "low", label: "Rendah (Low)" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setRiskFilter(item.id)}
              aria-pressed={riskFilter === item.id}
              className={`min-h-11 px-3 rounded-lg border text-xs font-mono transition-colors cursor-pointer ${
                riskFilter === item.id
                  ? "bg-foreground text-background border-foreground font-bold"
                  : "bg-card text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={eventFilter}
            onChange={(e) =>
              setEventFilter(e.target.value as "all" | DrmSecurityEventType)
            }
            aria-label="Filter Cara Pemicu"
            className="min-h-11 rounded-lg border border-border bg-card px-3 text-xs font-mono text-foreground"
          >
            <option value="all">Semua Pemicu</option>
            {(
              Object.entries(EVENT_TYPE_LABELS) as [
                DrmSecurityEventType,
                string,
              ][]
            ).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setAppliedSearch(searchInput.trim());
            }}
            className="flex gap-2"
          >
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari username, ANZ-..., buku"
              aria-label="Cari Log DRM"
              className="min-h-11 text-xs font-mono sm:w-56"
            />
            <Button
              type="submit"
              variant="outline"
              className="min-h-11 text-xs font-mono shrink-0"
            >
              Cari
            </Button>
          </form>
        </div>
      </div>

      {/* Audit Log Table */}
      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          <LoaderCircle
            className="mx-auto size-6 animate-spin mb-2"
            aria-hidden="true"
          />
          Memuat log keamanan DRM...
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-10 text-center text-sm text-muted-foreground">
          Belum ada aktivitas DRM yang tercatat untuk filter ini.
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 px-4">Prioritas</th>
                  <th className="py-3 px-4">Pembaca</th>
                  <th className="py-3 px-4">Cara Memicu</th>
                  <th className="py-3 px-4">Buku &amp; Sesi Watermark</th>
                  <th className="py-3 px-4">OS</th>
                  <th className="py-3 px-4">Waktu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {events.map((ev) => {
                  const risk = RISK_META[ev.riskLevel];
                  return (
                    <tr
                      key={ev.id}
                      className="hover:bg-muted/20 transition-colors align-top"
                    >
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded border font-mono text-[10px] ${risk.badgeClass}`}
                        >
                          {risk.label}
                        </span>
                        <span className="block text-[10px] text-muted-foreground mt-1">
                          {risk.priorityNote}
                        </span>
                      </td>

                      <td className="py-3 px-4 min-w-[170px]">
                        <div className="font-semibold text-foreground">
                          {ev.username ? `@${ev.username}` : ev.userName}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {ev.userName}
                        </div>
                        <div className="font-mono text-[10px] text-muted-foreground break-all">
                          {ev.userEmail}
                        </div>
                      </td>

                      <td className="py-3 px-4 min-w-[210px]">
                        <div className="font-medium text-foreground">
                          {EVENT_TYPE_LABELS[ev.eventType] ?? ev.eventType}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {ev.triggerDetail}
                        </div>
                      </td>

                      <td className="py-3 px-4 min-w-[180px]">
                        <div className="font-medium text-foreground">
                          {ev.bookTitle || ev.bookSlug}
                          {ev.chapterNumber ? ` · Bab ${ev.chapterNumber}` : ""}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setTraceInput(ev.watermarkCode);
                            setActiveTraceCode(ev.watermarkCode);
                          }}
                          className="mt-1 inline-flex items-center font-mono text-[11px] text-primary hover:underline cursor-pointer"
                          title="Klik untuk melacak sesi watermark ini"
                        >
                          {ev.watermarkCode}
                        </button>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap font-mono uppercase text-[11px] text-muted-foreground">
                        {ev.clientOs}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                        {formatDate(ev.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
