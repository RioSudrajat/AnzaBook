import { useId, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Flag,
  Loader2,
  MapPin,
  Navigation,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import type {
  AdminOverviewDto,
  AdminSpotModerationItemDto,
  SpotCategory,
  SpotNoiseLevel,
  SpotPriceRange,
  SpotStatus,
  SpotVerifiedBadge,
} from "@starter/shared/types";
import {
  moderateSpotSchema,
  spotCategoryValues,
  spotVerifiedBadgeValues,
  type ModerateSpotInput,
} from "@starter/shared/validators/spots";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  SPOT_CATEGORY_LABELS,
  SPOT_NOISE_LEVEL_OPTIONS,
  SPOT_PRICE_RANGE_OPTIONS,
  SPOT_REPORT_REASON_LABELS,
  SPOT_STATUS_META,
  buildGoogleMapsDirectionsUrl,
  buildGoogleMapsPlaceUrl,
  formatSpotApiError,
  formatSpotCategory,
  formatVerifiedBadge,
} from "@/features/spots/spots-helpers";
import { useAdminSpots, useModerateAdminSpot } from "../hooks";

type AdminSpotsFilter =
  "pending_review" | "open_reports" | "published" | "rejected" | "closed";

const FILTER_OPTIONS: ReadonlyArray<{ id: AdminSpotsFilter; label: string }> = [
  { id: "pending_review", label: "Menunggu Kurasi" },
  { id: "open_reports", label: "Laporan Terbuka" },
  { id: "published", label: "Tayang" },
  { id: "rejected", label: "Ditolak" },
  { id: "closed", label: "Tutup" },
];

const VERIFIED_BADGE_LABELS: Record<SpotVerifiedBadge, string> = {
  none: "Komunitas (Tanpa Lencana)",
  curated: "Terkurasi",
  partner: "Mitra AnzaBook",
};

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function getStatusBadgeClass(status: SpotStatus): string {
  const tone = SPOT_STATUS_META[status].tone;
  if (tone === "published") {
    return "border-[var(--color-green)]/40 bg-[var(--color-green-soft)] text-[var(--color-green)]";
  }
  if (tone === "rejected") {
    return "border-[var(--color-error)]/40 bg-[var(--color-error-soft)] text-[var(--color-error)]";
  }
  if (tone === "pending") {
    return "border-[var(--color-accent)]/40 bg-[var(--color-accent-soft)] text-foreground";
  }
  return "border-border bg-muted text-muted-foreground";
}

export function AdminSpotsTab({ overview }: { overview?: AdminOverviewDto }) {
  const searchInputId = useId();
  const [filter, setFilter] = useState<AdminSpotsFilter>("pending_review");
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [bannerMessage, setBannerMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  const queryParams =
    filter === "open_reports"
      ? { hasOpenReports: true, q: appliedSearch || undefined, limit: 50 }
      : { status: filter, q: appliedSearch || undefined, limit: 50 };

  const {
    data: spots = [],
    isLoading,
    isFetching,
    refetch,
  } = useAdminSpots(queryParams);
  const moderateMutation = useModerateAdminSpot();

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAppliedSearch(searchInput.trim());
  };

  const pendingSpotsCount = overview?.pendingSpotsCount ?? 0;
  const openSpotReportsCount = overview?.openSpotReportsCount ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Kurasi &amp; Moderasi Peta Sudut Baca
          </h2>
          <p className="text-sm text-muted-foreground">
            Tinjau usulan sudut baca baru dari komunitas, koreksi typo atau
            lencana, dan selesaikan laporan tempat tutup atau lokasi meleset.
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
          <span>Muat Ulang</span>
        </Button>
      </div>

      {/* Tabular Summary Metrics */}
      <div className="grid grid-cols-3 gap-px bg-border border border-border rounded-xl overflow-hidden">
        <div className="bg-card p-4 space-y-1">
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <MapPin
              className="size-3.5 text-[var(--color-accent)]"
              aria-hidden="true"
            />
            <span>Menunggu Kurasi</span>
          </p>
          <p className="font-mono text-2xl font-bold tabular-nums text-foreground">
            {pendingSpotsCount}
          </p>
          <p className="text-xs text-muted-foreground">Usulan baru</p>
        </div>

        <div className="bg-card p-4 space-y-1">
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <AlertTriangle
              className="size-3.5 text-[var(--color-error)]"
              aria-hidden="true"
            />
            <span>Laporan Terbuka</span>
          </p>
          <p className="font-mono text-2xl font-bold tabular-nums text-foreground">
            {openSpotReportsCount}
          </p>
          <p className="text-xs text-muted-foreground">Perlu verifikasi</p>
        </div>

        <div className="bg-card p-4 space-y-1">
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <ShieldCheck
              className="size-3.5 text-[var(--color-green)]"
              aria-hidden="true"
            />
            <span>Hasil Filter</span>
          </p>
          <p className="font-mono text-2xl font-bold tabular-nums text-foreground">
            {spots.length}
          </p>
          <p className="text-xs text-muted-foreground">Sudut baca tampil</p>
        </div>
      </div>

      {/* Filter Bar & Search */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Filter status moderasi sudut baca"
          className="flex flex-wrap gap-1.5"
        >
          {FILTER_OPTIONS.map((item) => {
            const active = filter === item.id;
            const badgeCount =
              item.id === "pending_review"
                ? pendingSpotsCount
                : item.id === "open_reports"
                  ? openSpotReportsCount
                  : 0;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setFilter(item.id);
                  setBannerMessage(null);
                }}
                className={`min-h-11 inline-flex items-center gap-1.5 rounded-lg border px-3.5 text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring ${
                  active
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>{item.label}</span>
                {badgeCount > 0 && (
                  <span
                    className={`font-mono text-[10px] tabular-nums px-1.5 py-0.5 rounded ${
                      active
                        ? "bg-background/20 text-background"
                        : "bg-[var(--color-accent-soft)] text-foreground"
                    }`}
                  >
                    {badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <form
          onSubmit={handleSearchSubmit}
          role="search"
          aria-label="Cari sudut baca di antrean moderasi"
          className="flex items-center gap-2 w-full lg:w-auto"
        >
          <div className="relative flex-1 lg:w-64">
            <label htmlFor={searchInputId} className="sr-only">
              Cari nama, kota, atau alamat sudut baca
            </label>
            <Search
              className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <Input
              id={searchInputId}
              type="search"
              value={searchInput}
              onChange={(event) => {
                const next = event.target.value;
                setSearchInput(next);
                if (next === "") setAppliedSearch("");
              }}
              placeholder="Cari nama, kota, alamat..."
              className="min-h-11 pl-9 bg-background"
            />
          </div>
          <Button type="submit" variant="outline" className="min-h-11 px-3.5">
            Cari
          </Button>
        </form>
      </div>

      {bannerMessage && (
        <div
          role={bannerMessage.tone === "error" ? "alert" : "status"}
          className={`rounded-xl border px-4 py-3 text-xs font-medium flex items-center gap-2 ${
            bannerMessage.tone === "error"
              ? "border-[var(--color-error)]/40 bg-[var(--color-error-soft)] text-[var(--color-error)]"
              : "border-[var(--color-green)]/40 bg-[var(--color-green-soft)] text-[var(--color-green)]"
          }`}
        >
          {bannerMessage.tone === "error" ? (
            <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
          )}
          <span>{bannerMessage.text}</span>
        </div>
      )}

      {/* Moderation Queue List */}
      {isLoading ? (
        <div className="space-y-3" aria-label="Memuat antrean sudut baca">
          {[0, 1, 2].map((idx) => (
            <div
              key={idx}
              className="h-32 rounded-xl border border-border bg-card animate-pulse"
            />
          ))}
        </div>
      ) : spots.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center space-y-2">
          <MapPin
            className="size-6 text-muted-foreground mx-auto"
            aria-hidden="true"
          />
          <p className="font-serif text-base font-bold text-foreground">
            Tidak ada sudut baca pada filter ini
          </p>
          <p className="text-xs text-muted-foreground">
            Semua antrean pada kategori ini sudah bersih atau coba ubah kata
            kunci pencarian.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {spots.map((spot) => (
            <SpotModerationCard
              key={`${spot.id}:${spot.updatedAt}`}
              spot={spot}
              isMutating={moderateMutation.isPending}
              onModerate={(input, successLabel) => {
                setBannerMessage(null);
                moderateMutation.mutate(
                  { id: spot.id, input },
                  {
                    onSuccess: () => {
                      setBannerMessage({
                        tone: "success",
                        text: `${spot.name}: ${successLabel}`,
                      });
                    },
                    onError: (err) => {
                      setBannerMessage({
                        tone: "error",
                        text: formatSpotApiError(
                          err,
                          `Gagal memproses moderasi untuk ${spot.name}.`,
                        ),
                      });
                    },
                  },
                );
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SpotModerationCard({
  spot,
  isMutating,
  onModerate,
}: {
  spot: AdminSpotModerationItemDto;
  isMutating: boolean;
  onModerate: (input: ModerateSpotInput, successLabel: string) => void;
}) {
  const fieldIdPrefix = useId();
  const [isExpanded, setIsExpanded] = useState(
    spot.status === "pending_review" || spot.openReportsCount > 0,
  );
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [rejectionReason, setRejectionReason] = useState(
    spot.rejectionReason ?? "",
  );
  const [localError, setLocalError] = useState<string | null>(null);

  const [editName, setEditName] = useState(spot.name);
  const [editCategory, setEditCategory] = useState<SpotCategory>(spot.category);
  const [editAddress, setEditAddress] = useState(spot.address);
  const [editCity, setEditCity] = useState(spot.city);
  const [editProvince, setEditProvince] = useState(spot.province ?? "");
  const [editOpeningHours, setEditOpeningHours] = useState(
    spot.openingHoursText ?? "",
  );
  const [editPriceRange, setEditPriceRange] = useState<SpotPriceRange>(
    spot.priceRange,
  );
  const [editNoiseLevel, setEditNoiseLevel] = useState<SpotNoiseLevel>(
    spot.noiseLevel,
  );
  const [editBadge, setEditBadge] = useState<SpotVerifiedBadge>(
    spot.verifiedBadge,
  );
  const [editMapsUrl, setEditMapsUrl] = useState(spot.googleMapsUrl ?? "");
  const [editDescription, setEditDescription] = useState(
    spot.description ?? "",
  );

  const status: SpotStatus = spot.status ?? "pending_review";
  const verifiedLabel = formatVerifiedBadge(spot.verifiedBadge);
  const directionsUrl = buildGoogleMapsDirectionsUrl(spot);
  const placeUrl = buildGoogleMapsPlaceUrl(spot);

  const buildEditPatch = (): Partial<ModerateSpotInput> => {
    const patch: Partial<ModerateSpotInput> = {};
    if (editName.trim() !== spot.name) patch.name = editName.trim();
    if (editCategory !== spot.category) patch.category = editCategory;
    if (editAddress.trim() !== spot.address) patch.address = editAddress.trim();
    if (editCity.trim() !== spot.city) patch.city = editCity.trim();
    if (editProvince.trim() && editProvince.trim() !== (spot.province ?? "")) {
      patch.province = editProvince.trim();
    }
    if (editOpeningHours.trim() !== (spot.openingHoursText ?? "")) {
      patch.openingHoursText = editOpeningHours.trim() || null;
    }
    if (editPriceRange !== spot.priceRange) patch.priceRange = editPriceRange;
    if (editNoiseLevel !== spot.noiseLevel) patch.noiseLevel = editNoiseLevel;
    if (editBadge !== spot.verifiedBadge) patch.verifiedBadge = editBadge;
    if (editMapsUrl.trim() !== (spot.googleMapsUrl ?? "")) {
      patch.googleMapsUrl = editMapsUrl.trim() || null;
    }
    if (editDescription.trim() !== (spot.description ?? "")) {
      patch.description = editDescription.trim() || null;
    }
    return patch;
  };

  const dispatchModeration = (
    action: ModerateSpotInput["action"],
    successLabel: string,
    extraReason?: string,
  ) => {
    setLocalError(null);
    const candidate: ModerateSpotInput = {
      action,
      ...buildEditPatch(),
      ...(extraReason !== undefined ? { rejectionReason: extraReason } : {}),
    };
    const parsed = moderateSpotSchema.safeParse(candidate);
    if (!parsed.success) {
      setLocalError(
        parsed.error.issues[0]?.message ?? "Periksa kembali perubahan data.",
      );
      return;
    }
    onModerate(parsed.data, successLabel);
  };

  return (
    <article className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="p-4 sm:p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`inline-flex items-center rounded border px-2 py-0.5 font-mono text-[10px] font-semibold ${getStatusBadgeClass(
                  status,
                )}`}
              >
                {SPOT_STATUS_META[status].label}
              </span>
              <span className="rounded border border-border bg-background px-2 py-0.5 font-mono text-[10px] text-foreground">
                {formatSpotCategory(spot.category)}
              </span>
              {verifiedLabel && (
                <span className="rounded border border-[var(--color-accent)]/40 bg-[var(--color-accent-soft)] px-2 py-0.5 font-mono text-[10px] font-semibold text-foreground">
                  {verifiedLabel}
                </span>
              )}
              {spot.openReportsCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded border border-[var(--color-error)]/40 bg-[var(--color-error-soft)] px-2 py-0.5 font-mono text-[10px] font-semibold text-[var(--color-error)]">
                  <Flag className="size-3" aria-hidden="true" />
                  {spot.openReportsCount} laporan terbuka
                </span>
              )}
            </div>

            <h3 className="font-serif text-lg font-bold text-foreground leading-snug">
              {spot.name}
            </h3>

            <p className="text-xs text-muted-foreground leading-relaxed">
              {spot.address}
              {spot.district ? `, ${spot.district}` : ""}, {spot.city}
              {spot.province ? `, ${spot.province}` : ""}
            </p>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono text-muted-foreground tabular-nums">
              <span>
                Koordinat: {spot.latitude.toFixed(5)},{" "}
                {spot.longitude.toFixed(5)}
              </span>
              {spot.submitterName && (
                <span>
                  Pengusul: {spot.submitterName}
                  {spot.submitterEmail ? ` (${spot.submitterEmail})` : ""}
                </span>
              )}
              <span>Diajukan: {formatDate(spot.createdAt)}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="min-h-11 text-xs"
            >
              <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
                <Navigation className="size-3.5" aria-hidden="true" />
                <span>Cek Pin Maps</span>
                <ExternalLink className="size-3" aria-hidden="true" />
              </a>
            </Button>

            <Button
              asChild
              variant="outline"
              size="sm"
              className="min-h-11 text-xs"
            >
              <a href={placeUrl} target="_blank" rel="noopener noreferrer">
                <span>Profil Maps</span>
              </a>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-expanded={isExpanded}
              onClick={() => setIsExpanded((prev) => !prev)}
              className="min-h-11 text-xs"
            >
              <span>{isExpanded ? "Sembunyikan" : "Inspeksi & Edit"}</span>
              {isExpanded ? (
                <ChevronUp className="size-4" aria-hidden="true" />
              ) : (
                <ChevronDown className="size-4" aria-hidden="true" />
              )}
            </Button>
          </div>
        </div>

        {/* Recent Reports Callout */}
        {spot.recentReports.length > 0 && (
          <div className="rounded-lg border border-border bg-background p-3 space-y-2">
            <p className="font-mono text-[11px] uppercase tracking-wider font-semibold text-foreground">
              Laporan Pengguna ({spot.recentReports.length})
            </p>
            <ul className="space-y-2">
              {spot.recentReports.map((report) => (
                <li
                  key={report.id}
                  className="rounded-md border border-border/70 bg-card px-3 py-2 text-xs space-y-1"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-foreground">
                      {SPOT_REPORT_REASON_LABELS[report.reasonType]}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {report.status === "open" ? "Terbuka" : "Selesai"} ·{" "}
                      {report.reporterName ?? "Pembaca"} ·{" "}
                      {formatDate(report.createdAt)}
                    </span>
                  </div>
                  <p className="text-muted-foreground whitespace-pre-line break-words">
                    {report.details}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Expandable Minor-Edit & Badge Form */}
        {isExpanded && (
          <div className="rounded-lg border border-border bg-background p-4 space-y-3">
            <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Koreksi Cepat &amp; Lencana Kurasi (opsional sebelum menyimpan)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label
                  htmlFor={`${fieldIdPrefix}-name`}
                  className="text-xs font-medium text-foreground"
                >
                  Nama tempat
                </label>
                <Input
                  id={`${fieldIdPrefix}-name`}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="min-h-11 bg-card"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor={`${fieldIdPrefix}-category`}
                  className="text-xs font-medium text-foreground"
                >
                  Kategori
                </label>
                <select
                  id={`${fieldIdPrefix}-category`}
                  value={editCategory}
                  onChange={(e) =>
                    setEditCategory(e.target.value as SpotCategory)
                  }
                  className="w-full h-11 rounded-md border border-border bg-card px-3 text-xs text-foreground"
                >
                  {spotCategoryValues.map((cat) => (
                    <option key={cat} value={cat}>
                      {SPOT_CATEGORY_LABELS[cat]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor={`${fieldIdPrefix}-badge`}
                  className="text-xs font-medium text-foreground"
                >
                  Lencana verifikasi
                </label>
                <select
                  id={`${fieldIdPrefix}-badge`}
                  value={editBadge}
                  onChange={(e) =>
                    setEditBadge(e.target.value as SpotVerifiedBadge)
                  }
                  className="w-full h-11 rounded-md border border-border bg-card px-3 text-xs text-foreground"
                >
                  {spotVerifiedBadgeValues.map((badge) => (
                    <option key={badge} value={badge}>
                      {VERIFIED_BADGE_LABELS[badge]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor={`${fieldIdPrefix}-city`}
                  className="text-xs font-medium text-foreground"
                >
                  Kota
                </label>
                <Input
                  id={`${fieldIdPrefix}-city`}
                  value={editCity}
                  onChange={(e) => setEditCity(e.target.value)}
                  className="min-h-11 bg-card"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor={`${fieldIdPrefix}-province`}
                  className="text-xs font-medium text-foreground"
                >
                  Provinsi
                </label>
                <Input
                  id={`${fieldIdPrefix}-province`}
                  value={editProvince}
                  onChange={(e) => setEditProvince(e.target.value)}
                  className="min-h-11 bg-card"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor={`${fieldIdPrefix}-opening-hours`}
                  className="text-xs font-medium text-foreground"
                >
                  Jam operasional
                </label>
                <Input
                  id={`${fieldIdPrefix}-opening-hours`}
                  value={editOpeningHours}
                  onChange={(e) => setEditOpeningHours(e.target.value)}
                  className="min-h-11 bg-card"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor={`${fieldIdPrefix}-price-range`}
                  className="text-xs font-medium text-foreground"
                >
                  Kisaran biaya
                </label>
                <select
                  id={`${fieldIdPrefix}-price-range`}
                  value={editPriceRange}
                  onChange={(e) =>
                    setEditPriceRange(e.target.value as SpotPriceRange)
                  }
                  className="w-full h-11 rounded-md border border-border bg-card px-3 text-xs text-foreground"
                >
                  {SPOT_PRICE_RANGE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor={`${fieldIdPrefix}-noise-level`}
                  className="text-xs font-medium text-foreground"
                >
                  Suasana
                </label>
                <select
                  id={`${fieldIdPrefix}-noise-level`}
                  value={editNoiseLevel}
                  onChange={(e) =>
                    setEditNoiseLevel(e.target.value as SpotNoiseLevel)
                  }
                  className="w-full h-11 rounded-md border border-border bg-card px-3 text-xs text-foreground"
                >
                  {SPOT_NOISE_LEVEL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor={`${fieldIdPrefix}-maps-url`}
                  className="text-xs font-medium text-foreground"
                >
                  Tautan Google Maps
                </label>
                <Input
                  id={`${fieldIdPrefix}-maps-url`}
                  value={editMapsUrl}
                  onChange={(e) => setEditMapsUrl(e.target.value)}
                  placeholder="https://maps.app.goo.gl/..."
                  className="min-h-11 bg-card"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label
                  htmlFor={`${fieldIdPrefix}-address`}
                  className="text-xs font-medium text-foreground"
                >
                  Alamat lengkap
                </label>
                <Textarea
                  id={`${fieldIdPrefix}-address`}
                  rows={2}
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="bg-card text-xs"
                />
              </div>
              <div className="space-y-1">
                <label
                  htmlFor={`${fieldIdPrefix}-description`}
                  className="text-xs font-medium text-foreground"
                >
                  Deskripsi
                </label>
                <Textarea
                  id={`${fieldIdPrefix}-description`}
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="bg-card text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* Rejection Reason Box */}
        {showRejectBox && (
          <div className="rounded-lg border border-[var(--color-error)]/40 bg-[var(--color-error-soft)]/50 p-3.5 space-y-2.5">
            <label
              htmlFor={`${fieldIdPrefix}-rejection-reason`}
              className="block text-xs font-semibold text-foreground"
            >
              Alasan penolakan (wajib minimal 5 karakter — ditampilkan kepada
              pengusul)
            </label>
            <Textarea
              id={`${fieldIdPrefix}-rejection-reason`}
              rows={2}
              value={rejectionReason}
              onChange={(e) => {
                setRejectionReason(e.target.value);
                if (localError) setLocalError(null);
              }}
              placeholder="Contoh: Lokasi merupakan duplikat sudut baca yang sudah tayang atau bukan ruang baca publik."
              className="bg-background text-xs"
            />
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowRejectBox(false)}
                className="min-h-11 text-xs"
              >
                Batal
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={isMutating}
                onClick={() =>
                  dispatchModeration(
                    "reject",
                    "Usulan ditolak.",
                    rejectionReason.trim(),
                  )
                }
                className="min-h-11 text-xs"
              >
                {isMutating && (
                  <Loader2
                    className="size-3.5 animate-spin"
                    aria-hidden="true"
                  />
                )}
                <span>Konfirmasi Tolak</span>
              </Button>
            </div>
          </div>
        )}

        {localError && (
          <p
            role="alert"
            className="text-xs font-medium text-[var(--color-error)]"
          >
            {localError}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-border">
          {(status === "pending_review" || status === "rejected") && (
            <Button
              type="button"
              disabled={isMutating}
              onClick={() =>
                dispatchModeration(
                  "approve",
                  "Disetujui dan ditayangkan di Peta Sudut Baca.",
                )
              }
              className="min-h-11 bg-[var(--color-accent)] text-[var(--color-accent-ink)] hover:opacity-90 font-semibold text-xs px-4"
            >
              <CheckCircle2 className="size-4" aria-hidden="true" />
              <span>Setujui &amp; Tayangkan</span>
            </Button>
          )}

          {status === "published" && spot.openReportsCount > 0 && (
            <Button
              type="button"
              disabled={isMutating}
              onClick={() =>
                dispatchModeration(
                  "approve",
                  "Laporan diselesaikan dan sudut baca tetap tayang.",
                )
              }
              className="min-h-11 bg-[var(--color-accent)] text-[var(--color-accent-ink)] hover:opacity-90 font-semibold text-xs px-4"
            >
              <CheckCircle2 className="size-4" aria-hidden="true" />
              <span>Selesaikan Laporan (Tetap Tayang)</span>
            </Button>
          )}

          {status === "published" &&
            spot.openReportsCount === 0 &&
            isExpanded && (
              <Button
                type="button"
                variant="outline"
                disabled={isMutating}
                onClick={() =>
                  dispatchModeration(
                    "approve",
                    "Perubahan info sudut baca berhasil disimpan.",
                  )
                }
                className="min-h-11 text-xs"
              >
                <span>Simpan Perubahan</span>
              </Button>
            )}

          {status === "closed" && (
            <Button
              type="button"
              variant="outline"
              disabled={isMutating}
              onClick={() =>
                dispatchModeration(
                  "reopen",
                  "Sudut baca dibuka kembali dan ditayangkan.",
                )
              }
              className="min-h-11 text-xs"
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              <span>Buka Kembali</span>
            </Button>
          )}

          {status !== "closed" && (
            <Button
              type="button"
              variant="outline"
              disabled={isMutating}
              onClick={() =>
                dispatchModeration(
                  "mark_closed",
                  "Ditandai tutup permanen dan laporan diselesaikan.",
                )
              }
              className="min-h-11 text-xs"
            >
              <span>Tandai Tutup</span>
            </Button>
          )}

          {status !== "rejected" && !showRejectBox && (
            <Button
              type="button"
              variant="outline"
              disabled={isMutating}
              onClick={() => setShowRejectBox(true)}
              className="min-h-11 text-xs text-[var(--color-error)] hover:text-[var(--color-error)]"
            >
              <XCircle className="size-3.5" aria-hidden="true" />
              <span>Tolak</span>
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
