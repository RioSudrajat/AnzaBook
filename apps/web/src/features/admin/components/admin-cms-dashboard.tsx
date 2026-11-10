import { useState, type ChangeEvent } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle2,
  Coins,
  Download,
  ExternalLink,
  FileCheck,
  FileCode,
  FileText,
  Library,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import type {
  AdminAuthorApplicationDto,
  AdminCalendarDto,
  AdminOverviewDto,
  BookClaimBatchDto,
  ManuscriptSubmissionDto,
  PublisherDto,
} from "@starter/shared/types";
import { roleHasPermission } from "@starter/shared/permissions";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCatalogBooks } from "@/features/books/hooks";
import {
  useAdminAuthorApplications,
  useAdminCalendars,
  useAdminManuscriptDetail,
  useAdminManuscripts,
  useAdminNotes,
  useAdminOverview,
  useAdminPublishers,
  useClaimBatchCodes,
  useCreateClaimBatch,
  useDeleteAnyNote,
  usePublishAdminManuscript,
  useReviewAuthorApplication,
  useUpdateAdminManuscript,
  useVerifyCalendar,
  useVerifyPublisher,
} from "../hooks";

type TabId =
  | "calendars"
  | "partners"
  | "manuscripts"
  | "claim-batches"
  | "financials"
  | "notes";

function formatIdr(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const field = error.details?.[0];
    return field?.field ? `${field.field}: ${field.message}` : error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Terjadi kendala pada sistem. Silakan coba kembali.";
}

function downloadClaimCodesCsv(
  batchName: string,
  codes: Array<{ code: string } | string>,
) {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://anzabook.id";
  const rows = [
    ["No", "Kode Klaim", "URL Klaim Langsung"],
    ...codes.map((item, index) => {
      const code = typeof item === "string" ? item : item.code;
      return [
        String(index + 1),
        code,
        `${origin}/buku/klaim?code=${encodeURIComponent(code)}`,
      ];
    }),
  ];
  const csvContent =
    "\uFEFF" +
    rows
      .map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `anzabook-batch-${batchName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function AdminCmsDashboard({
  currentUser,
}: {
  currentUser: { id: string; name: string; email: string; role?: string | null };
}) {
  const [activeTab, setActiveTab] = useState<TabId>("calendars");
  const { data: overview, isLoading: overviewLoading } = useAdminOverview();

  const pendingCalendars = overview?.pendingCalendarsCount ?? 0;
  const pendingAuthors = overview?.pendingAuthorsCount ?? 0;
  const pendingPublishers = overview?.pendingPublishersCount ?? 0;
  const pendingManuscripts = overview?.pendingManuscriptsCount ?? 0;
  const totalPending =
    pendingCalendars + pendingAuthors + pendingPublishers + pendingManuscripts;

  return (
    <div className="mx-auto max-w-6xl space-y-8 overflow-x-clip py-4 sm:py-6">
      {/* Top Bar Header */}
      <header className="border-b border-border pb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                <ShieldCheck className="size-4" aria-hidden="true" />
                CMS Redaksi &amp; Ekosistem
              </span>
              {totalPending > 0 ? (
                <span className="inline-flex items-center rounded-md bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                  {totalPending} antrean memerlukan kurasi
                </span>
              ) : (
                <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  Semua antrean kurasi beres
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl text-foreground">
              Panel Pengelola Redaksi &amp; Kemitraan AnzaBook
            </h1>
            <p className="text-sm text-muted-foreground">
              Masuk sebagai <strong className="text-foreground">{currentUser.name}</strong> ({currentUser.email}).
              Kelola kurasi kalender literasi, validasi hak cipta penulis, izin terbit mitra, dan kode klaim phygital.
            </p>
          </div>

          <Button variant="outline" asChild size="sm" className="min-h-[44px]">
            <Link to="/app">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Kembali ke Aplikasi Pembaca
            </Link>
          </Button>
        </div>

        {/* Quick Pending Summary Counters */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <button
            type="button"
            onClick={() => setActiveTab("calendars")}
            className="flex min-h-[44px] items-center justify-between rounded-lg border border-border bg-card p-3 text-left transition hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-primary"
          >
            <div className="flex items-center gap-2.5">
              <Calendar className="size-4 text-muted-foreground" aria-hidden="true" />
              <span className="text-xs font-medium text-foreground">Komunitas</span>
            </div>
            <span
              className={`rounded px-2 py-0.5 text-xs font-bold ${
                pendingCalendars > 0
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {pendingCalendars}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("partners")}
            className="flex min-h-[44px] items-center justify-between rounded-lg border border-border bg-card p-3 text-left transition hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-primary"
          >
            <div className="flex items-center gap-2.5">
              <UserCheck className="size-4 text-muted-foreground" aria-hidden="true" />
              <span className="text-xs font-medium text-foreground">Penulis &amp; Penerbit</span>
            </div>
            <span
              className={`rounded px-2 py-0.5 text-xs font-bold ${
                pendingAuthors + pendingPublishers > 0
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {pendingAuthors + pendingPublishers}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("manuscripts")}
            className="flex min-h-[44px] items-center justify-between rounded-lg border border-border bg-card p-3 text-left transition hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-primary"
          >
            <div className="flex items-center gap-2.5">
              <BookOpen className="size-4 text-muted-foreground" aria-hidden="true" />
              <span className="text-xs font-medium text-foreground">Naskah Masuk</span>
            </div>
            <span
              className={`rounded px-2 py-0.5 text-xs font-bold ${
                pendingManuscripts > 0
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {pendingManuscripts}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("financials")}
            className="flex min-h-[44px] items-center justify-between rounded-lg border border-border bg-card p-3 text-left transition hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-primary"
          >
            <div className="flex items-center gap-2.5">
              <Coins className="size-4 text-muted-foreground" aria-hidden="true" />
              <span className="text-xs font-medium text-foreground">Royalti Nakama</span>
            </div>
            <span className="text-xs font-bold text-foreground">
              {overviewLoading
                ? "..."
                : formatIdr(overview?.estimatedNakamaRoyaltyPoolIdr ?? 0)}
            </span>
          </button>
        </div>
      </header>

      {/* Main Tab Navigation */}
      <nav
        aria-label="Tab navigasi CMS"
        className="flex flex-wrap gap-2 border-b border-border pb-2"
      >
        <button
          type="button"
          onClick={() => setActiveTab("calendars")}
          className={`flex min-h-[44px] items-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-primary ${
            activeTab === "calendars"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Calendar className="size-4" aria-hidden="true" />
          <span>Verifikasi Komunitas &amp; Acara</span>
          {pendingCalendars > 0 && (
            <span className="ml-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-900 dark:text-amber-200">
              {pendingCalendars}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("partners")}
          className={`flex min-h-[44px] items-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-primary ${
            activeTab === "partners"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <UserCheck className="size-4" aria-hidden="true" />
          <span>Verifikasi Penulis &amp; Penerbit</span>
          {pendingAuthors + pendingPublishers > 0 && (
            <span className="ml-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-900 dark:text-amber-200">
              {pendingAuthors + pendingPublishers}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("manuscripts")}
          className={`flex min-h-[44px] items-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-primary ${
            activeTab === "manuscripts"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <BookOpen className="size-4" aria-hidden="true" />
          <span>Editor &amp; Kurasi Naskah</span>
          {pendingManuscripts > 0 && (
            <span className="ml-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-900 dark:text-amber-200">
              {pendingManuscripts}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("claim-batches")}
          className={`flex min-h-[44px] items-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-primary ${
            activeTab === "claim-batches"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <FileCode className="size-4" aria-hidden="true" />
          <span>Generator Kode Klaim Fisik</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("financials")}
          className={`flex min-h-[44px] items-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-primary ${
            activeTab === "financials"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Coins className="size-4" aria-hidden="true" />
          <span>Monitor Royalti &amp; Kas Komunitas</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("notes")}
          className={`flex min-h-[44px] items-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-primary ${
            activeTab === "notes"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <FileText className="size-4" aria-hidden="true" />
          <span>Utilitas &amp; Catatan Sistem</span>
        </button>
      </nav>

      {/* Tab Panels */}
      <main className="min-h-[480px]">
        {activeTab === "calendars" && <TabCalendars />}
        {activeTab === "partners" && <TabPartners />}
        {activeTab === "manuscripts" && <TabManuscripts />}
        {activeTab === "claim-batches" && <TabClaimBatches />}
        {activeTab === "financials" && <TabFinancials overview={overview} />}
        {activeTab === "notes" && <TabNotes userRole={currentUser.role ?? undefined} />}
      </main>
    </div>
  );
}

// =========================================================================
// TAB 1: Verifikasi Komunitas & Acara
// =========================================================================

function TabCalendars() {
  const [filter, setFilter] = useState<string>("pending");
  const { data: calendars = [], isLoading, refetch } = useAdminCalendars({
    status: filter === "all" ? undefined : filter,
  });
  const verifyMutation = useVerifyCalendar();
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleVerify(id: string, status: "verified" | "trusted" | "rejected") {
    try {
      setFeedback(null);
      await verifyMutation.mutateAsync({ id, input: { status } });
      setFeedback(`Status kalender komunitas berhasil diperbarui menjadi "${status}".`);
    } catch (err) {
      setFeedback(`Gagal memperbarui status: ${getErrorMessage(err)}`);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Verifikasi Kalender Komunitas &amp; Klub Baca
          </h2>
          <p className="text-sm text-muted-foreground">
            Validasi kurasi komunitas baca buku, penerbit lokal, dan entitas literasi yang mengajukan kalender acara.
          </p>
        </div>

        {/* Filter Badges */}
        <div className="flex flex-wrap items-center gap-2">
          {["pending", "verified", "trusted", "rejected", "all"].map((statusKey) => (
            <button
              key={statusKey}
              type="button"
              onClick={() => setFilter(statusKey)}
              className={`min-h-[44px] rounded-md px-3.5 py-1.5 text-xs font-semibold capitalize transition focus-visible:outline-2 focus-visible:outline-primary ${
                filter === statusKey
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-foreground hover:bg-muted"
              }`}
            >
              {statusKey === "all" ? "Semua Status" : statusKey}
            </button>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="min-h-[44px]"
            title="Muat ulang"
          >
            <RefreshCw className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {feedback && (
        <div className="rounded-md border border-border bg-card p-4 text-sm text-foreground">
          {feedback}
        </div>
      )}

      {isLoading ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <LoaderCircle className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
        </div>
      ) : calendars.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
          <Calendar className="mx-auto size-8 text-muted-foreground/60" aria-hidden="true" />
          <p className="mt-3 text-base font-medium">Tidak ada kalender komunitas pada status ini.</p>
          <p className="text-sm">Semua pengajuan kalender komunitas telah selesai diproses.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {calendars.map((cal: AdminCalendarDto) => (
            <div
              key={cal.id}
              className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="space-y-2 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-bold text-foreground break-words">{cal.name}</h3>
                  <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    /{cal.slug}
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-semibold uppercase ${
                      cal.verificationStatus === "verified"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : cal.verificationStatus === "trusted"
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                        : cal.verificationStatus === "rejected"
                        ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                    }`}
                  >
                    {cal.verificationStatus}
                  </span>
                </div>

                <p className="text-sm text-foreground/90 leading-relaxed break-words">
                  {cal.description || "Tidak ada deskripsi."}
                </p>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>
                    Kota: <strong className="text-foreground">{cal.city || "Nasional"}</strong>
                  </span>
                  <span>
                    Tipe: <strong className="text-foreground">{cal.type}</strong>
                  </span>
                  <span>
                    Pengaju: <strong className="text-foreground">{cal.creatorName || "Anonim"}</strong> ({cal.creatorEmail})
                  </span>
                  <span>
                    Dibuat: {formatDate(cal.createdAt)}
                  </span>
                </div>

                {cal.socialLinks && Object.keys(cal.socialLinks).length > 0 && (
                  <div className="flex flex-wrap gap-3 pt-1 text-xs">
                    {cal.socialLinks.instagram && (
                      <a
                        href={cal.socialLinks.instagram}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        <ExternalLink className="size-3" aria-hidden="true" />
                        Instagram
                      </a>
                    )}
                    {cal.socialLinks.twitter && (
                      <a
                        href={cal.socialLinks.twitter}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        <ExternalLink className="size-3" aria-hidden="true" />
                        X / Twitter
                      </a>
                    )}
                    {cal.socialLinks.website && (
                      <a
                        href={cal.socialLinks.website}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        <ExternalLink className="size-3" aria-hidden="true" />
                        Website
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-row sm:flex-col gap-2 shrink-0">
                <Button
                  size="sm"
                  className="min-h-[44px] bg-emerald-700 text-white hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                  disabled={verifyMutation.isPending || cal.verificationStatus === "verified"}
                  onClick={() => handleVerify(cal.id, "verified")}
                >
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                  Setujui (Verify)
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-[44px]"
                  disabled={verifyMutation.isPending || cal.verificationStatus === "trusted"}
                  onClick={() => handleVerify(cal.id, "trusted")}
                >
                  <ShieldCheck className="size-4" aria-hidden="true" />
                  Tetapkan Trusted
                </Button>

                <Button
                  variant="destructive"
                  size="sm"
                  className="min-h-[44px]"
                  disabled={verifyMutation.isPending || cal.verificationStatus === "rejected"}
                  onClick={() => handleVerify(cal.id, "rejected")}
                >
                  <XCircle className="size-4" aria-hidden="true" />
                  Tolak
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =========================================================================
// TAB 2: Verifikasi Penulis & Penerbit Mitra
// =========================================================================

function TabPartners() {
  const [partnerSubTab, setPartnerSubTab] = useState<"authors" | "publishers">("authors");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Verifikasi Penulis Resmi &amp; Penerbit Mitra
          </h2>
          <p className="text-sm text-muted-foreground">
            Tinjau klaim kepemilikan karya oleh penulis serta verifikasi legalitas nomor IKAPI penerbit mitra.
          </p>
        </div>

        {/* Sub-tab pills */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPartnerSubTab("authors")}
            className={`min-h-[44px] rounded-md px-4 py-2 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-primary ${
              partnerSubTab === "authors"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "border border-border bg-card text-foreground hover:bg-muted"
            }`}
          >
            Pengajuan Penulis Resmi
          </button>
          <button
            type="button"
            onClick={() => setPartnerSubTab("publishers")}
            className={`min-h-[44px] rounded-md px-4 py-2 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-primary ${
              partnerSubTab === "publishers"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "border border-border bg-card text-foreground hover:bg-muted"
            }`}
          >
            Penerbit Mitra (IKAPI)
          </button>
        </div>
      </div>

      {partnerSubTab === "authors" ? <AuthorsSection /> : <PublishersSection />}
    </div>
  );
}

function AuthorsSection() {
  const [filter, setFilter] = useState<string>("pending");
  const { data: applications = [], isLoading, refetch } = useAdminAuthorApplications({
    status: filter === "all" ? undefined : filter,
  });
  const reviewMutation = useReviewAuthorApplication();
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleReview(id: string, status: "verified" | "rejected") {
    try {
      setFeedback(null);
      await reviewMutation.mutateAsync({
        id,
        input: {
          status,
          reviewNotes: reviewNotes[id]?.trim() || undefined,
        },
      });
      setFeedback(
        status === "verified"
          ? "Penulis berhasil disetujui! Status akun dan buku yang diklaim telah diperbarui secara otomatis."
          : "Pengajuan penulis telah ditolak.",
      );
    } catch (err) {
      setFeedback(`Gagal memproses verifikasi: ${getErrorMessage(err)}`);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          Menampilkan {applications.length} pengajuan penulis ({filter}).
        </span>
        <div className="flex gap-2">
          {["pending", "verified", "rejected", "all"].map((statusKey) => (
            <button
              key={statusKey}
              type="button"
              onClick={() => setFilter(statusKey)}
              className={`min-h-[44px] rounded-md px-3 py-1 text-xs font-semibold capitalize ${
                filter === statusKey
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-foreground hover:bg-muted"
              }`}
            >
              {statusKey === "all" ? "Semua" : statusKey}
            </button>
          ))}
          <Button variant="outline" size="sm" onClick={() => refetch()} className="min-h-[44px]">
            <RefreshCw className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {feedback && (
        <div className="rounded-md border border-border bg-card p-4 text-sm text-foreground">
          {feedback}
        </div>
      )}

      {isLoading ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <LoaderCircle className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
        </div>
      ) : applications.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
          <UserCheck className="mx-auto size-8 text-muted-foreground/60" aria-hidden="true" />
          <p className="mt-3 text-base font-medium">Tidak ada pengajuan penulis pada status ini.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {applications.map((app: AdminAuthorApplicationDto) => (
            <div
              key={app.id}
              className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-foreground">{app.penName}</h3>
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-semibold uppercase ${
                        app.status === "verified"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : app.status === "rejected"
                          ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                      }`}
                    >
                      {app.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Akun: <strong className="text-foreground">{app.userName || "Tanpa Nama"}</strong> ({app.userEmail}) · Diajukan {formatDate(app.createdAt)}
                  </p>
                </div>

                {app.portfolioUrl && (
                  <a
                    href={app.portfolioUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                  >
                    <ExternalLink className="size-3.5" aria-hidden="true" />
                    Tautan Portofolio / Bukti Karya
                  </a>
                )}
              </div>

              {app.bio && (
                <p className="text-sm text-foreground/90 leading-relaxed bg-muted/40 p-3 rounded-md">
                  {app.bio}
                </p>
              )}

              {app.claimedBookId && (
                <div className="flex items-center gap-3 rounded-md border border-border bg-muted/20 p-3 text-xs">
                  <BookOpen className="size-4 text-primary shrink-0" aria-hidden="true" />
                  <div>
                    <span className="font-semibold text-foreground">Klaim Hak Buku:</span>{" "}
                    {app.claimedBookTitle || app.claimedBookId}
                  </div>
                </div>
              )}

              {app.reviewNotes && (
                <div className="text-xs text-muted-foreground italic">
                  Catatan Review Sebelumnya: "{app.reviewNotes}"
                </div>
              )}

              {/* Review Input & Actions */}
              <div className="pt-2 border-t border-border/80 flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
                <div className="flex-1 space-y-1">
                  <Label htmlFor={`note-${app.id}`} className="text-xs text-muted-foreground">
                    Catatan Editor / Verifikator (opsional)
                  </Label>
                  <Input
                    id={`note-${app.id}`}
                    placeholder="Contoh: Bukti karya valid, telah sesuai nomor ISBN."
                    value={reviewNotes[app.id] ?? ""}
                    onChange={(e) =>
                      setReviewNotes((prev) => ({ ...prev, [app.id]: e.target.value }))
                    }
                    className="min-h-[44px]"
                  />
                </div>

                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    className="min-h-[44px] bg-emerald-700 text-white hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                    disabled={reviewMutation.isPending || app.status === "verified"}
                    onClick={() => handleReview(app.id, "verified")}
                  >
                    <CheckCircle2 className="size-4" aria-hidden="true" />
                    Setujui Penulis Resmi
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="min-h-[44px]"
                    disabled={reviewMutation.isPending || app.status === "rejected"}
                    onClick={() => handleReview(app.id, "rejected")}
                  >
                    <XCircle className="size-4" aria-hidden="true" />
                    Tolak
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PublishersSection() {
  const [filter, setFilter] = useState<string>("pending");
  const { data: publishers = [], isLoading, refetch } = useAdminPublishers({
    status: filter === "all" ? undefined : filter,
  });
  const verifyMutation = useVerifyPublisher();
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleVerify(id: string, status: "verified" | "rejected") {
    try {
      setFeedback(null);
      await verifyMutation.mutateAsync({ id, input: { status } });
      setFeedback(`Penerbit mitra berhasil diperbarui menjadi status "${status}".`);
    } catch (err) {
      setFeedback(`Gagal memperbarui status penerbit: ${getErrorMessage(err)}`);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          Menampilkan {publishers.length} penerbit mitra ({filter}).
        </span>
        <div className="flex gap-2">
          {["pending", "verified", "rejected", "all"].map((statusKey) => (
            <button
              key={statusKey}
              type="button"
              onClick={() => setFilter(statusKey)}
              className={`min-h-[44px] rounded-md px-3 py-1 text-xs font-semibold capitalize ${
                filter === statusKey
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-foreground hover:bg-muted"
              }`}
            >
              {statusKey === "all" ? "Semua" : statusKey}
            </button>
          ))}
          <Button variant="outline" size="sm" onClick={() => refetch()} className="min-h-[44px]">
            <RefreshCw className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {feedback && (
        <div className="rounded-md border border-border bg-card p-4 text-sm text-foreground">
          {feedback}
        </div>
      )}

      {isLoading ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <LoaderCircle className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
        </div>
      ) : publishers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
          <Library className="mx-auto size-8 text-muted-foreground/60" aria-hidden="true" />
          <p className="mt-3 text-base font-medium">Tidak ada data penerbit pada status ini.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {publishers.map((pub: PublisherDto) => (
            <div
              key={pub.id}
              className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="space-y-2 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-foreground">{pub.name}</h3>
                  <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    /{pub.slug}
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-semibold uppercase ${
                      pub.verificationStatus === "verified"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : pub.verificationStatus === "rejected"
                        ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                    }`}
                  >
                    {pub.verificationStatus}
                  </span>
                </div>

                {pub.description && (
                  <p className="text-sm text-foreground/90 leading-relaxed break-words">
                    {pub.description}
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
                  <span>
                    No. IKAPI: <strong className="text-foreground">{pub.ikapiNumber || "Belum disertakan"}</strong>
                  </span>
                  <span>
                    Kota: <strong className="text-foreground">{pub.city || "Indonesia"}</strong>
                  </span>
                  <span>
                    Kontak: <strong className="text-foreground">{pub.contactEmail || "-"}</strong>
                  </span>
                  <span>
                    Alamat: <strong className="text-foreground">{pub.address || "-"}</strong>
                  </span>
                  <span>
                    Kuota Perdana: <strong className="text-foreground">{pub.freeClaimCodeQuotaPerBook ?? 500} kode gratis/buku</strong>
                  </span>
                  <span>
                    Biaya Batch Lanjutan: <strong className="text-foreground">{formatIdr(pub.claimCodeFeeIdr ?? 2000)}/kode</strong>
                  </span>
                </div>
              </div>

              <div className="flex sm:flex-col gap-2 shrink-0">
                <Button
                  size="sm"
                  className="min-h-[44px] bg-emerald-700 text-white hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                  disabled={verifyMutation.isPending || pub.verificationStatus === "verified"}
                  onClick={() => handleVerify(pub.id, "verified")}
                >
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                  Setujui Penerbit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="min-h-[44px]"
                  disabled={verifyMutation.isPending || pub.verificationStatus === "rejected"}
                  onClick={() => handleVerify(pub.id, "rejected")}
                >
                  <XCircle className="size-4" aria-hidden="true" />
                  Tolak
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =========================================================================
// TAB 3: Editor & Kurasi Naskah Masuk
// =========================================================================

function TabManuscripts() {
  const [filter, setFilter] = useState<string>("all");
  const [selectedManuscriptId, setSelectedManuscriptId] = useState<string | null>(null);

  const { data: manuscripts = [], isLoading, refetch } = useAdminManuscripts({
    status: filter === "all" ? undefined : filter,
  });

  if (selectedManuscriptId) {
    return (
      <ManuscriptEditorWorkspace
        manuscriptId={selectedManuscriptId}
        onBack={() => {
          setSelectedManuscriptId(null);
          refetch();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Editor &amp; Kurasi Naskah Masuk
          </h2>
          <p className="text-sm text-muted-foreground">
            Kelola naskah buku yang dikirimkan oleh penulis independen dan penerbit mitra. Tinjau struktur bab dan terbitkan ke katalog resmi.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {["pending_review", "in_editing", "published", "rejected", "all"].map((statusKey) => (
            <button
              key={statusKey}
              type="button"
              onClick={() => setFilter(statusKey)}
              className={`min-h-[44px] rounded-md px-3.5 py-1.5 text-xs font-semibold transition ${
                filter === statusKey
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-foreground hover:bg-muted"
              }`}
            >
              {statusKey === "all" ? "Semua Status" : statusKey.replace("_", " ")}
            </button>
          ))}
          <Button variant="outline" size="sm" onClick={() => refetch()} className="min-h-[44px]">
            <RefreshCw className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <LoaderCircle className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
        </div>
      ) : manuscripts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
          <BookOpen className="mx-auto size-8 text-muted-foreground/60" aria-hidden="true" />
          <p className="mt-3 text-base font-medium">Tidak ada naskah pada status ini.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {manuscripts.map((m: ManuscriptSubmissionDto) => (
            <div
              key={m.id}
              className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="space-y-2 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-bold text-foreground break-words">{m.title}</h3>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-semibold uppercase ${
                      m.status === "published"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : m.status === "in_editing"
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                        : m.status === "rejected"
                        ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                    }`}
                  >
                    {m.status.replace("_", " ")}
                  </span>
                  <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                    Skema: {m.proposedDigitalPolicy}
                  </span>
                </div>

                <p className="text-sm text-foreground/90 line-clamp-2 leading-relaxed">
                  {m.synopsis}
                </p>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
                  <span>
                    Penulis: <strong className="text-foreground">{m.authorPenName || m.authorName || "Anonim"}</strong>
                  </span>
                  <span>
                    Penerbit: <strong className="text-foreground">{m.publisherName || "Penulis Mandiri"}</strong>
                  </span>
                  {m.proposedAlacartePriceIdr ? (
                    <span>
                      Harga Satuan: <strong className="text-foreground">{formatIdr(m.proposedAlacartePriceIdr)}</strong>
                    </span>
                  ) : null}
                  <span>Diajukan: {formatDate(m.createdAt)}</span>
                </div>
              </div>

              <Button
                onClick={() => setSelectedManuscriptId(m.id)}
                className="min-h-[44px] shrink-0"
              >
                <BookOpen className="size-4" aria-hidden="true" />
                Buka Workspace Editor &amp; Kurasi
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ManuscriptEditorWorkspace({
  manuscriptId,
  onBack,
}: {
  manuscriptId: string;
  onBack: () => void;
}) {
  const { data: manuscript, isLoading, refetch } = useAdminManuscriptDetail(manuscriptId);
  const updateMutation = useUpdateAdminManuscript();
  const publishMutation = usePublishAdminManuscript();

  // Local form states
  const [title, setTitle] = useState("");
  const [synopsis, setSynopsis] = useState("");
  const [digitalPolicy, setDigitalPolicy] = useState<
    "free_open" | "sample_only" | "alacarte_only" | "print_claim_only" | "hybrid_nakama_alacarte"
  >("sample_only");
  const [alacartePriceIdr, setAlacartePriceIdr] = useState<number>(0);
  const [status, setStatus] = useState<"pending_review" | "in_editing" | "published" | "rejected">(
    "pending_review",
  );
  const [rejectionReason, setRejectionReason] = useState("");
  const [chapters, setChapters] = useState<
    Array<{
      id?: string;
      chapterNumber: number;
      titleId: string;
      contentId: string;
      blueprintContent?: string | null;
      estimatedMinutes: number;
    }>
  >([]);

  // Publish Dialog / State
  const [isPublishing, setIsPublishing] = useState(false);
  const [coverUrl, setCoverUrl] = useState("/covers/default-book.jpg");
  const [authorOverride, setAuthorOverride] = useState("");
  const [publishResult, setPublishResult] = useState<{
    publishedBookId: string;
    claimBatchId?: string;
  } | null>(null);

  const [feedback, setFeedback] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Sync state once data loads
  if (manuscript && !isInitialized) {
    setTitle(manuscript.title);
    setSynopsis(manuscript.synopsis);
    setDigitalPolicy(manuscript.proposedDigitalPolicy);
    setAlacartePriceIdr(manuscript.proposedAlacartePriceIdr || 0);
    setStatus(manuscript.status);
    setRejectionReason(manuscript.rejectionReason || "");
    setAuthorOverride(manuscript.authorPenName || manuscript.authorName || "");
    if (manuscript.chapters) {
      setChapters(
        manuscript.chapters.map((c) => ({
          id: c.id,
          chapterNumber: c.chapterNumber,
          titleId: c.titleId,
          contentId: c.contentId,
          blueprintContent: c.blueprintContent,
          estimatedMinutes: c.estimatedMinutes || 5,
        })),
      );
    }
    setIsInitialized(true);
  }

  async function handleSaveDraft() {
    try {
      setFeedback(null);
      await updateMutation.mutateAsync({
        id: manuscriptId,
        input: {
          title,
          synopsis,
          proposedDigitalPolicy: digitalPolicy,
          proposedAlacartePriceIdr: alacartePriceIdr > 0 ? alacartePriceIdr : null,
          status,
          rejectionReason: status === "rejected" ? rejectionReason : null,
          chapters: chapters.map((c, idx) => ({
            id: c.id,
            chapterNumber: idx + 1,
            titleId: c.titleId,
            contentId: c.contentId,
            blueprintContent: c.blueprintContent || null,
            estimatedMinutes: c.estimatedMinutes || 5,
          })),
        },
      });
      setFeedback("Perubahan naskah dan bab berhasil disimpan ke draf!");
      refetch();
    } catch (err) {
      setFeedback(`Gagal menyimpan perubahan: ${getErrorMessage(err)}`);
    }
  }

  async function handlePublishCatalog() {
    try {
      setFeedback(null);
      const res = await publishMutation.mutateAsync({
        id: manuscriptId,
        overrides: {
          coverUrl: coverUrl || "/covers/default-book.jpg",
          author: authorOverride.trim() || undefined,
          digitalPolicy,
          alacartePriceIdr: alacartePriceIdr > 0 ? alacartePriceIdr : null,
        },
      });
      setPublishResult({
        publishedBookId: res.publishedBookId,
        claimBatchId: res.claimBatch?.id,
      });
      setIsPublishing(false);
      refetch();
    } catch (err) {
      setFeedback(`Gagal menerbitkan naskah: ${getErrorMessage(err)}`);
    }
  }

  function handleAddChapter() {
    const nextNumber = chapters.length + 1;
    setChapters([
      ...chapters,
      {
        chapterNumber: nextNumber,
        titleId: `Bab ${nextNumber}`,
        contentId: "",
        blueprintContent: "",
        estimatedMinutes: 5,
      },
    ]);
  }

  function handleRemoveChapter(index: number) {
    const next = chapters.filter((_, i) => i !== index);
    setChapters(next.map((c, i) => ({ ...c, chapterNumber: i + 1 })));
  }

  function handleChapterChange(
    index: number,
    field: string,
    val: string | number,
  ) {
    setChapters((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: val } : c)),
    );
  }

  // Client-side docx / txt import helper
  function handleImportDocument(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      // Simple heuristic chapter splitter
      const rawChapters = text.split(/\n(?=(?:Bab|BAB|Chapter|CHAPTER)\s+\d+)/i);
      if (rawChapters.length > 1) {
        const parsed = rawChapters.map((rawText, i) => {
          const lines = rawText.trim().split("\n");
          const firstLine = lines[0]?.trim() || `Bab ${i + 1}`;
          const content = lines.slice(1).join("\n").trim();
          return {
            chapterNumber: i + 1,
            titleId: firstLine.length > 80 ? firstLine.slice(0, 80) : firstLine,
            contentId: content || rawText,
            blueprintContent: "",
            estimatedMinutes: Math.max(Math.round(rawText.length / 800), 2),
          };
        });
        setChapters(parsed);
        setFeedback(`Berhasil mengimpor ${parsed.length} bab dari berkas "${file.name}"!`);
      } else {
        // Single chapter append
        const nextNum = chapters.length + 1;
        setChapters([
          ...chapters,
          {
            chapterNumber: nextNum,
            titleId: file.name.replace(/\.[^/.]+$/, ""),
            contentId: text,
            blueprintContent: "",
            estimatedMinutes: Math.max(Math.round(text.length / 800), 3),
          },
        ]);
        setFeedback(`Teks dari berkas "${file.name}" berhasil ditambahkan sebagai Bab ${nextNum}!`);
      }
    };

    reader.readAsText(file);
    e.target.value = "";
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <LoaderCircle className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Workspace Header */}
      <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button variant="ghost" size="sm" onClick={onBack} className="min-h-[44px] -ml-2 mb-2">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Kembali ke Daftar Naskah
          </Button>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Workspace Redaksi: {manuscript?.title}
          </h2>
          <p className="text-sm text-muted-foreground">
            Penulis: <strong className="text-foreground">{manuscript?.authorPenName || manuscript?.authorName}</strong> · Penerbit: <strong className="text-foreground">{manuscript?.publisherName || "Mandiri"}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            disabled={updateMutation.isPending}
            className="min-h-[44px]"
          >
            {updateMutation.isPending ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <FileCheck className="size-4" aria-hidden="true" />
            )}
            Simpan Draf Perubahan
          </Button>

          <Button
            onClick={() => setIsPublishing(true)}
            disabled={chapters.length === 0 || manuscript?.status === "published"}
            className="min-h-[44px] bg-emerald-700 text-white hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 font-bold"
          >
            🚀 Terbitkan ke Katalog AnzaBook
          </Button>
        </div>
      </div>

      {feedback && (
        <div className="rounded-md border border-border bg-card p-4 text-sm text-foreground">
          {feedback}
        </div>
      )}

      {publishResult && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6 space-y-3">
          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-lg">
            <CheckCircle2 className="size-5" aria-hidden="true" />
            Naskah Berhasil Diterbitkan ke Katalog AnzaBook!
          </div>
          <p className="text-sm text-foreground/90">
            Buku dan seluruh {chapters.length} bab kini aktif di katalog pembaca.
          </p>
          <div className="text-xs font-mono bg-background p-3 rounded border border-border">
            ID Buku Katalog: {publishResult.publishedBookId}
            {publishResult.claimBatchId && (
              <div>
                ID Batch 500 Kode Perdana: {publishResult.claimBatchId} (Skema A Phygital)
              </div>
            )}
          </div>
          <div className="pt-2 flex gap-3">
            <Button asChild size="sm" className="min-h-[44px]">
              <Link to="/app">Buka Katalog Buku</Link>
            </Button>
          </div>
        </div>
      )}

      {/* Metadata Form */}
      <section className="rounded-xl border border-border bg-card p-6 space-y-5">
        <h3 className="text-base font-bold text-foreground">Metadata &amp; Skema B2B2C Naskah</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-xs font-semibold">
              Judul Buku
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="min-h-[44px]"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="author" className="text-xs font-semibold">
              Nama Penulis (di Katalog)
            </Label>
            <Input
              id="author"
              value={authorOverride}
              onChange={(e) => setAuthorOverride(e.target.value)}
              className="min-h-[44px]"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="policy" className="text-xs font-semibold">
              Kebijakan Akses &amp; Monetisasi (B2B2C)
            </Label>
            <select
              id="policy"
              value={digitalPolicy}
              onChange={(e) =>
                setDigitalPolicy(
                  e.target.value as
                    | "free_open"
                    | "sample_only"
                    | "alacarte_only"
                    | "print_claim_only"
                    | "hybrid_nakama_alacarte",
                )
              }
              className="w-full min-h-[44px] rounded-md border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-primary"
            >
              <option value="print_claim_only">
                print_claim_only (Skema A: Cetak Fisik + Kode Klaim Digital)
              </option>
              <option value="sample_only">
                sample_only (Bab Contoh Terbuka + Beli Fisik)
              </option>
              <option value="alacarte_only">
                alacarte_only (Jual Satuan Ala Carte Rp / Judul)
              </option>
              <option value="hybrid_nakama_alacarte">
                hybrid_nakama_alacarte (Nakama Subscription + Ala Carte)
              </option>
              <option value="free_open">
                free_open (Akses Terbuka Bebas / Domain Publik)
              </option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="price" className="text-xs font-semibold">
              Harga Satuan Ala Carte (IDR)
            </Label>
            <Input
              id="price"
              type="number"
              min="0"
              step="1000"
              value={alacartePriceIdr}
              onChange={(e) => setAlacartePriceIdr(Number(e.target.value))}
              placeholder="Contoh: 45000"
              className="min-h-[44px]"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="status" className="text-xs font-semibold">
              Status Kurasi Editorial
            </Label>
            <select
              id="status"
              value={status}
              onChange={(e) =>
                setStatus(
                  e.target.value as
                    | "pending_review"
                    | "in_editing"
                    | "published"
                    | "rejected",
                )
              }
              className="w-full min-h-[44px] rounded-md border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-primary"
            >
              <option value="pending_review">pending_review</option>
              <option value="in_editing">in_editing</option>
              <option value="published">published</option>
              <option value="rejected">rejected</option>
            </select>
          </div>

          {status === "rejected" && (
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="rejection" className="text-xs font-semibold text-destructive">
                Alasan Penolakan Naskah (disampaikan ke penulis/penerbit)
              </Label>
              <Input
                id="rejection"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Contoh: Format naskah tidak lengkap, belum memenuhi standar hak cipta."
                className="min-h-[44px]"
              />
            </div>
          )}

          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="synopsis" className="text-xs font-semibold">
              Sinopsis Lengkap
            </Label>
            <Textarea
              id="synopsis"
              rows={4}
              value={synopsis}
              onChange={(e) => setSynopsis(e.target.value)}
              className="text-sm leading-relaxed"
            />
          </div>
        </div>
      </section>

      {/* Chapters Structured Editor */}
      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-foreground">
              Daftar Struktur Bab Naskah ({chapters.length} Bab)
            </h3>
            <p className="text-xs text-muted-foreground">
              Susun bab naskah, konten teks penuh, takeaway blueprint, dan estimasi waktu baca pembaca.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Impor berkas docx/txt */}
            <label
              htmlFor="import-doc"
              className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-md border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground transition hover:bg-muted focus-within:outline-2 focus-within:outline-primary"
            >
              <Upload className="size-4" aria-hidden="true" />
              <span>Impor Berkas .docx/.txt</span>
              <input
                id="import-doc"
                type="file"
                accept=".txt,.md,.docx"
                onChange={handleImportDocument}
                className="sr-only"
              />
            </label>

            <Button
              size="sm"
              onClick={handleAddChapter}
              className="min-h-[44px]"
            >
              <Plus className="size-4" aria-hidden="true" />
              Tambah Bab Baru
            </Button>
          </div>
        </div>

        {chapters.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-muted-foreground">
            <p className="text-sm font-medium">Naskah belum memiliki bab terstruktur.</p>
            <p className="text-xs mt-1">Gunakan tombol "Tambah Bab Baru" atau impor dari berkas teks naskah Anda.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {chapters.map((ch, idx) => (
              <div
                key={ch.id || `temp-${idx}`}
                className="rounded-xl border border-border bg-card p-5 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {idx + 1}
                    </span>
                    <Input
                      placeholder="Judul Bab (contoh: Bab 1 - Awal Mula Perjalanan)"
                      value={ch.titleId}
                      onChange={(e) => handleChapterChange(idx, "titleId", e.target.value)}
                      className="min-h-[44px] font-semibold text-sm max-w-md"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span>Estimasi:</span>
                      <Input
                        type="number"
                        min="1"
                        max="120"
                        value={ch.estimatedMinutes}
                        onChange={(e) =>
                          handleChapterChange(idx, "estimatedMinutes", Number(e.target.value))
                        }
                        className="w-16 min-h-[36px] text-xs text-center"
                      />
                      <span>menit</span>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveChapter(idx)}
                      className="min-h-[44px] min-w-[44px] text-destructive hover:bg-destructive/10"
                      title="Hapus bab"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground font-medium">
                    Isi Konten Bab (Bahasa Indonesia)
                  </Label>
                  <Textarea
                    rows={6}
                    placeholder="Tuliskan isi bab buku di sini..."
                    value={ch.contentId}
                    onChange={(e) => handleChapterChange(idx, "contentId", e.target.value)}
                    className="text-sm font-sans leading-relaxed"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground font-medium">
                    Ringkasan Inti Blueprint (Poin Penting untuk Mode Cepat / Takeaway)
                  </Label>
                  <Textarea
                    rows={2}
                    placeholder="Contoh: Bab ini membahas prinsip pertama kebiasaan atomik..."
                    value={ch.blueprintContent || ""}
                    onChange={(e) =>
                      handleChapterChange(idx, "blueprintContent", e.target.value)
                    }
                    className="text-xs"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Confirmation Modal to Publish */}
      {isPublishing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl space-y-5">
            <h3 className="text-lg font-bold text-foreground">
              Konfirmasi Penerbitan ke Katalog AnzaBook
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Tindakan ini akan menyalin seluruh {chapters.length} bab secara atomik ke tabel produksi buku.
              {digitalPolicy === "print_claim_only" && (
                <span className="block mt-2 font-semibold text-foreground">
                  Skema A Phygital: Sistem akan otomatis meng-generate 500 kode klaim fisik perdana secara gratis.
                </span>
              )}
            </p>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="cover-url" className="text-xs font-semibold">
                  URL Berkas Cover Buku
                </Label>
                <Input
                  id="cover-url"
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  placeholder="/covers/buku-anda.jpg"
                  className="min-h-[44px]"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="pub-author" className="text-xs font-semibold">
                  Nama Penulis di Katalog
                </Label>
                <Input
                  id="pub-author"
                  value={authorOverride}
                  onChange={(e) => setAuthorOverride(e.target.value)}
                  className="min-h-[44px]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setIsPublishing(false)}
                className="min-h-[44px]"
              >
                Batal
              </Button>
              <Button
                onClick={handlePublishCatalog}
                disabled={publishMutation.isPending}
                className="min-h-[44px] bg-emerald-700 text-white hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 font-bold"
              >
                {publishMutation.isPending ? (
                  <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                )}
                Konfirmasi &amp; Terbitkan Sekarang
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// TAB 4: Generator Batch Kode Klaim Fisik (Skema A)
// =========================================================================

function TabClaimBatches() {
  const { data: booksResponse } = useCatalogBooks({ limit: 100 });
  const { data: publishers = [] } = useAdminPublishers({ status: "verified" });
  const createBatchMutation = useCreateClaimBatch();

  const [selectedBookId, setSelectedBookId] = useState("");
  const [selectedPublisherId, setSelectedPublisherId] = useState("");
  const [batchName, setBatchName] = useState("");
  const [totalCodes, setTotalCodes] = useState<number>(500);

  // Result display
  const [lastGeneratedBatch, setLastGeneratedBatch] = useState<{
    batch: BookClaimBatchDto;
    codes: string[];
  } | null>(null);

  // Lookup existing batch ID
  const [lookupBatchId, setLookupBatchId] = useState("");
  const [searchBatchId, setSearchBatchId] = useState("");
  const { data: lookupResult, isLoading: lookupLoading } = useClaimBatchCodes(searchBatchId);

  const [feedback, setFeedback] = useState<string | null>(null);

  const booksList = booksResponse?.data ?? [];

  async function handleGenerateBatch() {
    if (!selectedBookId || !selectedPublisherId || !batchName.trim()) {
      setFeedback("Mohon lengkapi pilihan buku, penerbit mitra, dan nama batch.");
      return;
    }

    try {
      setFeedback(null);
      const res = await createBatchMutation.mutateAsync({
        bookId: selectedBookId,
        publisherId: selectedPublisherId,
        batchName: batchName.trim(),
        totalCodes,
      });
      setLastGeneratedBatch(res);
      setFeedback(`Batch "${res.batch.batchName}" berhasil dibuat dengan ${res.codes.length} kode klaim fisik unik!`);
    } catch (err) {
      setFeedback(`Gagal membuat batch kode klaim: ${getErrorMessage(err)}`);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          Generator Batch Kode Klaim Fisik (Skema A Phygital)
        </h2>
        <p className="text-sm text-muted-foreground">
          Cetak stiker kode QR / kode kupon fisik untuk diselipkan di dalam buku cetak toko Gramedia, Togamas, atau pameran buku. Pembaca yang membeli buku fisik dapat membuka edisi digital gratis di AnzaBook.
        </p>
      </div>

      {feedback && (
        <div className="rounded-md border border-border bg-card p-4 text-sm text-foreground">
          {feedback}
        </div>
      )}

      {/* Generator Form */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        <h3 className="text-base font-bold text-foreground">Buat Batch Baru untuk Percetakan</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="book-select" className="text-xs font-semibold">
              Pilih Judul Buku Katalog (Skema A Phygital)
            </Label>
            <select
              id="book-select"
              value={selectedBookId}
              onChange={(e) => setSelectedBookId(e.target.value)}
              className="w-full min-h-[44px] rounded-md border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-primary"
            >
              <option value="">-- Pilih Judul Buku --</option>
              {booksList.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title} ({b.digitalPolicy})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="publisher-select" className="text-xs font-semibold">
              Pilih Penerbit Mitra
            </Label>
            <select
              id="publisher-select"
              value={selectedPublisherId}
              onChange={(e) => setSelectedPublisherId(e.target.value)}
              className="w-full min-h-[44px] rounded-md border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-primary"
            >
              <option value="">-- Pilih Penerbit Mitra --</option>
              {publishers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (IKAPI: {p.ikapiNumber || "-"})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="batch-name" className="text-xs font-semibold">
              Nama Batch / Penanda Cetak
            </Label>
            <Input
              id="batch-name"
              placeholder="Contoh: Batch Cetak Perdana 500 Eks - Gramedia Matraman"
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              className="min-h-[44px]"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="code-count" className="text-xs font-semibold">
              Jumlah Kode Unik
            </Label>
            <Input
              id="code-count"
              type="number"
              min="1"
              max="50000"
              value={totalCodes}
              onChange={(e) => setTotalCodes(Number(e.target.value))}
              className="min-h-[44px]"
            />
          </div>
        </div>

        {/* Pricing notice card */}
        <div className="rounded-lg border border-border bg-muted/30 p-4 text-xs text-muted-foreground space-y-1">
          <p className="font-semibold text-foreground">Kebijakan Kuota &amp; Biaya Kode Klaim:</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>
              <strong>Batch Perdana 500 Kode:</strong> Gratis (Rp 0 / <code>free_tier</code>) untuk setiap judul buku baru.
            </li>
            <li>
              <strong>Batch Lanjutan / Cetak Ulang:</strong> Rp 2.000 / kode (<code>unbilled</code>, ditagihkan berkala ke penerbit mitra).
            </li>
          </ul>
        </div>

        <Button
          onClick={handleGenerateBatch}
          disabled={createBatchMutation.isPending}
          className="min-h-[44px] bg-primary text-primary-foreground font-semibold"
        >
          {createBatchMutation.isPending ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <FileCode className="size-4" aria-hidden="true" />
          )}
          Generate Batch Kode Unik
        </Button>
      </div>

      {/* Result of Newly Generated Batch */}
      {lastGeneratedBatch && (
        <div className="rounded-xl border border-emerald-500/30 bg-card p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span className="text-xs font-semibold uppercase text-emerald-600 dark:text-emerald-400">
                Batch Berhasil Dibuat
              </span>
              <h3 className="text-xl font-bold text-foreground">
                {lastGeneratedBatch.batch.batchName}
              </h3>
              <p className="text-xs text-muted-foreground">
                ID Batch: <code className="text-foreground">{lastGeneratedBatch.batch.id}</code> · Status Penagihan:{" "}
                <span className="font-semibold text-foreground uppercase">
                  {lastGeneratedBatch.batch.billingStatus}
                </span>{" "}
                ({formatIdr(lastGeneratedBatch.batch.unitFeeIdr)}/kode)
              </p>
            </div>

            <Button
              onClick={() =>
                downloadClaimCodesCsv(
                  lastGeneratedBatch.batch.batchName,
                  lastGeneratedBatch.codes,
                )
              }
              className="min-h-[44px] bg-emerald-700 text-white hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 font-bold shrink-0"
            >
              <Download className="size-4" aria-hidden="true" />
              Unduh CSV Siap Cetak ({lastGeneratedBatch.codes.length} Kode)
            </Button>
          </div>

          <div className="rounded-md border border-border bg-muted/20 p-3">
            <p className="text-xs font-medium text-foreground mb-2">
              Pratinjau 10 Kode Pertama:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-mono text-muted-foreground">
              {lastGeneratedBatch.codes.slice(0, 10).map((code) => (
                <div key={code} className="bg-background border border-border rounded px-2 py-1 text-center">
                  {code}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Lookup Existing Batch */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h3 className="text-base font-bold text-foreground">Pencarian / Unduh Ulang Batch Kode Klaim</h3>
        <div className="flex gap-2">
          <Input
            placeholder="Masukkan UUID Batch ID..."
            value={lookupBatchId}
            onChange={(e) => setLookupBatchId(e.target.value)}
            className="min-h-[44px] font-mono text-xs"
          />
          <Button
            variant="outline"
            onClick={() => setSearchBatchId(lookupBatchId.trim())}
            disabled={!lookupBatchId.trim() || lookupLoading}
            className="min-h-[44px]"
          >
            <Search className="size-4" aria-hidden="true" />
            Cari Batch
          </Button>
        </div>

        {lookupLoading && (
          <div className="py-4 text-center text-sm text-muted-foreground">
            <LoaderCircle className="mx-auto size-5 animate-spin" aria-hidden="true" />
          </div>
        )}

        {lookupResult && (
          <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h4 className="font-bold text-foreground">{lookupResult.batch.batchName}</h4>
                <p className="text-xs text-muted-foreground">
                  Buku: {lookupResult.batch.bookTitle} · Penerbit: {lookupResult.batch.publisherName} · Total:{" "}
                  {lookupResult.codes.length} kode
                </p>
              </div>
              <Button
                size="sm"
                onClick={() =>
                  downloadClaimCodesCsv(
                    lookupResult.batch.batchName,
                    lookupResult.codes.map((c: { code: string }) => c.code),
                  )
                }
                className="min-h-[44px]"
              >
                <Download className="size-4" aria-hidden="true" />
                Unduh Berkas CSV
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// =========================================================================
// TAB 5: Monitor Royalti B2B2C & Kas Komunitas
// =========================================================================

function TabFinancials({ overview }: { overview: AdminOverviewDto | undefined }) {
  const nakamaPool = overview?.estimatedNakamaRoyaltyPoolIdr ?? 0;
  const alacarteSales = overview?.totalAlacarteSalesIdr ?? 0;
  const publisherShare = overview?.totalPublisherShareIdr ?? 0;
  const anzabookNet = overview?.totalNetAnzabookIdr ?? 0;
  const affiliateCommissions = overview?.totalAffiliateCommissionsIdr ?? 0;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          Monitor Royalti B2B2C &amp; Kas Komunitas
        </h2>
        <p className="text-sm text-muted-foreground">
          Transparansi pembagian pendapatan ekosistem AnzaBook: 55% Nakama Pool untuk penulis/penerbit, 75% omzet buku satuan, dan 10% komisi kas komunitas.
        </p>
      </div>

      {/* 3 Core Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Nakama Royalty Pool */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-3 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-primary">
            <span>Creator Pool 55%</span>
            <Coins className="size-4" aria-hidden="true" />
          </div>
          <div className="text-3xl font-extrabold text-foreground">
            {formatIdr(nakamaPool)}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Akumulasi 55% dari biaya langganan Nakama berbayar. Didistribusikan secara proporsional kepada penulis &amp; penerbit mitra berdasarkan menit baca pembaca.
          </p>
        </div>

        {/* Card 2: Ala Carte Sales */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-3 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <span>Buku Satuan (75% : 25%)</span>
            <BookOpen className="size-4" aria-hidden="true" />
          </div>
          <div className="text-3xl font-extrabold text-foreground">
            {formatIdr(alacarteSales)}
          </div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Hak Penerbit (75%):</span>
              <strong className="text-foreground">{formatIdr(publisherShare)}</strong>
            </div>
            <div className="flex justify-between">
              <span>Net AnzaBook (25%):</span>
              <strong className="text-foreground">{formatIdr(anzabookNet)}</strong>
            </div>
          </div>
        </div>

        {/* Card 3: Community Affiliate */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-3 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-amber-600 dark:text-amber-400">
            <span>Kas Komunitas Literasi (10%)</span>
            <Users className="size-4" aria-hidden="true" />
          </div>
          <div className="text-3xl font-extrabold text-foreground">
            {formatIdr(affiliateCommissions)}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Hak bagi hasil 10% untuk kas komunitas buku dan klub baca yang mendatangkan pembaca baru melalui kalender komunitas mereka.
          </p>
        </div>
      </div>

      {/* Ecosystem Philosophy & Policy Overview */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h3 className="text-base font-bold text-foreground">
          Arsitektur Skema Pendapatan Multi-Pilar AnzaBook
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-muted-foreground leading-relaxed">
          <div className="border border-border rounded-lg p-4 space-y-1 bg-muted/10">
            <strong className="text-foreground block text-sm">Skema A: Phygital (Cetak Fisik)</strong>
            Penerbit mencetak buku dengan kode klaim digital gratis (500 kode perdana Rp0). Melindungi omzet toko buku luring tanpa kanibalisasi penjualan fisik.
          </div>
          <div className="border border-border rounded-lg p-4 space-y-1 bg-muted/10">
            <strong className="text-foreground block text-sm">Skema B: Ala Carte (Beli Lepas)</strong>
            Pembaca membeli akses digital penuh per judul buku (75% untuk penerbit, 25% biaya platform AnzaBook).
          </div>
          <div className="border border-border rounded-lg p-4 space-y-1 bg-muted/10">
            <strong className="text-foreground block text-sm">Skema C: Nakama Pool (Langganan)</strong>
            55% dari langganan Nakama dialokasikan ke pool royalti, dibagikan setiap bulan berdasarkan durasi baca aktif pembaca.
          </div>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// TAB 6: Utilitas & Catatan Sistem (Starter Baseline Preserved)
// =========================================================================

function TabNotes({ userRole }: { userRole?: string }) {
  const { data: page } = useAdminNotes();
  const remove = useDeleteAnyNote();
  const canDelete = roleHasPermission(userRole, { notes: ["delete-any"] });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          Utilitas &amp; Catatan Sistem
        </h2>
        <p className="text-sm text-muted-foreground">
          Modul bawaan starter untuk memeriksa dan memelihara catatan lintas akun (notes: read-any / delete-any).
        </p>
      </div>

      {remove.error ? (
        <p role="alert" className="text-sm text-destructive">
          {getErrorMessage(remove.error)}
        </p>
      ) : null}

      {page.data.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-10 text-center text-muted-foreground">
          Belum ada catatan sistem dari pengguna mana pun.
        </div>
      ) : (
        <ul className="space-y-3">
          {page.data.map((note) => (
            <li
              key={note.id}
              className="flex items-start justify-between gap-4 rounded-xl border border-border bg-card px-5 py-4"
            >
              <div className="min-w-0">
                <p className="font-medium break-words text-foreground">{note.title}</p>
                {note.content && (
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">
                    {note.content}
                  </p>
                )}
                <p className="mt-2 break-all text-xs text-muted-foreground">
                  {note.ownerName} · {note.ownerEmail} · Dibuat {formatDate(note.createdAt)}
                </p>
              </div>
              {canDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Hapus ${note.title}`}
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(note.id)}
                  className="min-h-[44px] min-w-[44px]"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {page.meta.hasMore && (
        <p className="text-xs text-muted-foreground">
          Menampilkan {page.meta.limit} catatan pertama.
        </p>
      )}
    </div>
  );
}
