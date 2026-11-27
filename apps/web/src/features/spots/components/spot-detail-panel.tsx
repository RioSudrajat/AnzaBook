import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Bookmark,
  Calendar,
  Check,
  Clock,
  ExternalLink,
  Globe,
  MapPin,
  Navigation,
  Share2,
  Star,
  Store,
  Volume2,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import { useToggleSpotBookmark } from "../hooks";
import {
  buildGoogleMapsDirectionsUrl,
  buildGoogleMapsPlaceUrl,
  formatDistanceMeters,
  formatNoiseLevel,
  formatPriceRange,
  formatSpotCategory,
  formatVerifiedBadge,
  getActiveFacilityChips,
  sanitizeExternalHttpUrl,
} from "../spots-helpers";
import type { ReadingSpotDetailDto, ReadingSpotSummaryDto } from "../types";

type SpotDetailPanelProps = {
  spot: ReadingSpotDetailDto | ReadingSpotSummaryDto;
  onClose: () => void;
  /** Reserved extension slot for Issue #23 community reviews UI. */
  reviewsSlot?: ReactNode;
  /** Reserved extension slot for Issue #23 spot report action. */
  reportActionSlot?: ReactNode;
};

export function SpotDetailPanel({
  spot,
  onClose,
  reviewsSlot,
  reportActionSlot,
}: SpotDetailPanelProps) {
  const bookmarkMutation = useToggleSpotBookmark();
  const [shareCopied, setShareCopied] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const detailSpot = spot as Partial<ReadingSpotDetailDto>;
  const verifiedLabel = formatVerifiedBadge(spot.verifiedBadge);
  const distanceLabel = formatDistanceMeters(spot.distanceMeters);
  const facilityChips = getActiveFacilityChips(spot.facilities);
  const directionsUrl = buildGoogleMapsDirectionsUrl(spot);
  const placeUrl = buildGoogleMapsPlaceUrl(spot);
  const safeWebsiteUrl = sanitizeExternalHttpUrl(spot.websiteUrl);
  const safeCoverUrl = sanitizeExternalHttpUrl(spot.coverUrl);

  const handleToggleBookmark = () => {
    setActionError(null);
    bookmarkMutation.mutate(spot.slug, {
      onError: (err) => {
        if (err instanceof ApiError && err.status === 404) {
          setActionError(
            "Fitur simpan sudut baca menunggu sinkronisasi layanan.",
          );
          return;
        }
        setActionError("Gagal memperbarui simpanan sudut baca.");
      },
    });
  };

  const handleCopyShareLink = async () => {
    setActionError(null);
    try {
      const shareUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/spots?spot=${encodeURIComponent(spot.slug)}`
          : `/spots?spot=${encodeURIComponent(spot.slug)}`;
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2500);
    } catch {
      setActionError("Tidak dapat menyalin tautan dari peramban ini.");
    }
  };

  return (
    <article
      aria-label={`Detail ${spot.name}`}
      className="flex flex-col gap-5 pb-6"
    >
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 inline-flex items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          <span>Kembali ke daftar</span>
        </button>

        {reportActionSlot}
      </div>

      {safeCoverUrl && (
        <div className="aspect-[16/9] w-full overflow-hidden rounded-xl border border-border bg-[var(--color-paper-2)]">
          <img
            src={safeCoverUrl}
            alt={`Foto sudut baca ${spot.name}`}
            className="size-full object-cover"
          />
        </div>
      )}

      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-md border border-border bg-[var(--color-paper-2)] px-2.5 py-0.5 font-mono text-[11px] font-semibold text-foreground">
            {formatSpotCategory(spot.category)}
          </span>

          {verifiedLabel && (
            <span
              className={`inline-flex items-center rounded-md px-2.5 py-0.5 font-mono text-[11px] font-semibold ${
                spot.verifiedBadge === "partner"
                  ? "bg-[var(--color-accent-soft)] text-foreground border border-[var(--color-accent)]/40"
                  : "bg-[var(--color-green-soft)] text-[var(--color-green)] border border-[var(--color-green)]/30"
              }`}
            >
              {verifiedLabel}
            </span>
          )}

          {distanceLabel && (
            <span className="ml-auto inline-flex items-center gap-1 font-mono text-xs tabular-nums text-muted-foreground">
              <Navigation className="size-3.5" aria-hidden="true" />
              {distanceLabel}
            </span>
          )}
        </div>

        <h2 className="font-serif text-xl sm:text-2xl font-bold text-foreground leading-snug">
          {spot.name}
        </h2>

        <div className="flex flex-wrap items-center gap-3 text-xs font-mono tabular-nums text-muted-foreground">
          <span className="inline-flex items-center gap-1 text-foreground font-semibold">
            <Star
              className="size-3.5 text-[var(--color-accent)]"
              aria-hidden="true"
            />
            {spot.ratingCount > 0 ? spot.ratingAvg.toFixed(1) : "Baru"}
          </span>
          <span>({spot.ratingCount} ulasan)</span>
          <span>·</span>
          <span>{spot.bookmarkCount} disimpan</span>
        </div>

        {spot.description && (
          <p className="text-sm text-muted-foreground leading-relaxed pt-1">
            {spot.description}
          </p>
        )}
      </div>

      <div className="space-y-2.5">
        <Button
          asChild
          className="w-full min-h-11 bg-[var(--color-accent)] text-[var(--color-accent-ink)] hover:opacity-90 font-semibold"
        >
          <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
            <Navigation className="size-4" aria-hidden="true" />
            <span>Buka di Google Maps</span>
            <ExternalLink
              className="size-3.5 ml-auto opacity-80"
              aria-hidden="true"
            />
          </a>
        </Button>

        <div className="grid grid-cols-3 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleToggleBookmark}
            aria-pressed={Boolean(spot.isBookmarked)}
            disabled={bookmarkMutation.isPending}
            className={`min-h-11 text-xs ${
              spot.isBookmarked
                ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-foreground font-semibold"
                : ""
            }`}
          >
            <Bookmark className="size-4" aria-hidden="true" />
            <span>{spot.isBookmarked ? "Tersimpan" : "Simpan"}</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => void handleCopyShareLink()}
            className="min-h-11 text-xs"
          >
            {shareCopied ? (
              <Check
                className="size-4 text-[var(--color-green)]"
                aria-hidden="true"
              />
            ) : (
              <Share2 className="size-4" aria-hidden="true" />
            )}
            <span>{shareCopied ? "Tersalin" : "Bagikan"}</span>
          </Button>

          <Button asChild variant="outline" className="min-h-11 text-xs">
            <a href={placeUrl} target="_blank" rel="noopener noreferrer">
              <MapPin className="size-4" aria-hidden="true" />
              <span>Profil Maps</span>
            </a>
          </Button>
        </div>

        {shareCopied && (
          <p
            role="status"
            className="text-xs font-medium text-[var(--color-green)]"
          >
            Tautan sudut baca disalin ke papan klip.
          </p>
        )}

        {actionError && (
          <p
            role="alert"
            className="text-xs font-medium text-[var(--color-error)]"
          >
            {actionError}
          </p>
        )}
      </div>

      <dl className="ruled-index text-sm">
        <div className="py-3 flex items-start gap-3">
          <dt className="sr-only">Alamat</dt>
          <MapPin
            className="size-4 text-muted-foreground shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <dd className="text-foreground leading-relaxed">
            {spot.address}
            {spot.district ? `, ${spot.district}` : ""}, {spot.city}
            {spot.province ? `, ${spot.province}` : ""}
          </dd>
        </div>

        {spot.openingHoursText && (
          <div className="py-3 flex items-start gap-3">
            <dt className="sr-only">Jam operasional</dt>
            <Clock
              className="size-4 text-muted-foreground shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <dd className="font-mono text-xs tabular-nums text-foreground">
              {spot.openingHoursText}
            </dd>
          </div>
        )}

        <div className="py-3 grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <Wallet
              className="size-4 text-muted-foreground shrink-0"
              aria-hidden="true"
            />
            <div>
              <dt className="text-[11px] font-mono uppercase text-muted-foreground">
                Kisaran Biaya
              </dt>
              <dd className="text-xs font-semibold text-foreground">
                {formatPriceRange(spot.priceRange)}
              </dd>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Volume2
              className="size-4 text-muted-foreground shrink-0"
              aria-hidden="true"
            />
            <div>
              <dt className="text-[11px] font-mono uppercase text-muted-foreground">
                Suasana
              </dt>
              <dd className="text-xs font-semibold text-foreground">
                {formatNoiseLevel(spot.noiseLevel)}
              </dd>
            </div>
          </div>
        </div>

        {(safeWebsiteUrl || spot.instagramHandle) && (
          <div className="py-3 flex flex-wrap items-center gap-3">
            <dt className="sr-only">Tautan eksternal</dt>
            {safeWebsiteUrl && (
              <a
                href={safeWebsiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-11 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-accent)] hover:underline"
              >
                <Globe className="size-3.5" aria-hidden="true" />
                <span>Situs Resmi</span>
              </a>
            )}
            {spot.instagramHandle && (
              <a
                href={`https://instagram.com/${encodeURIComponent(spot.instagramHandle.replace(/^@/, ""))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-11 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <span>@{spot.instagramHandle.replace(/^@/, "")}</span>
              </a>
            )}
          </div>
        )}
      </dl>

      {facilityChips.length > 0 && (
        <section aria-label="Fasilitas kenyamanan baca" className="space-y-2.5">
          <h3 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Fasilitas Kenyamanan Baca
          </h3>
          <div className="flex flex-wrap gap-2">
            {facilityChips.map((chip) => (
              <span
                key={chip.key}
                className="inline-flex items-center rounded-md border border-border bg-[var(--color-paper-2)] px-2.5 py-1 text-xs font-medium text-foreground"
              >
                {chip.label}
              </span>
            ))}
          </div>
        </section>
      )}

      {(detailSpot.linkedBranchName || detailSpot.linkedCalendarSlug) && (
        <section
          aria-label="Terhubung dengan ekosistem AnzaBook"
          className="rounded-xl border border-[var(--color-accent)]/35 bg-[var(--color-accent-soft)]/50 p-4 space-y-2"
        >
          {detailSpot.linkedBranchName && (
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <Store
                className="size-4 text-[var(--color-accent)]"
                aria-hidden="true"
              />
              <span>Cabang / Mitra Buku: {detailSpot.linkedBranchName}</span>
            </div>
          )}

          {detailSpot.linkedCalendarSlug && (
            <Link
              to="/c/$slug"
              params={{ slug: detailSpot.linkedCalendarSlug }}
              className="min-h-11 inline-flex items-center gap-2 text-xs font-semibold text-[var(--color-accent)] hover:underline"
            >
              <Calendar className="size-4" aria-hidden="true" />
              <span>
                Komunitas:{" "}
                {detailSpot.linkedCalendarName ?? detailSpot.linkedCalendarSlug}
              </span>
            </Link>
          )}
        </section>
      )}

      {reviewsSlot}
    </article>
  );
}
