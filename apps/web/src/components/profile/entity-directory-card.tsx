import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import { VerifiedBadge } from "@/components/profile/verified-badge";
import { isUsableAssetUrl } from "@/lib/media-url";
import { cn } from "@/lib/utils";

export type EntityDirectoryCardProps = {
  kind: "publisher" | "community";
  name: string;
  to: string;
  params: Record<string, string>;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  city?: string | null;
  description?: string | null;
  topics?: string[];
  verificationStatus?: "pending" | "verified" | "trusted" | "rejected";
  rejectionReason?: string | null;
  footerMeta?: string | null;
  actions: ReactNode;
  notice?: ReactNode;
};

export function EntityDirectoryCard({
  kind,
  name,
  to,
  params,
  avatarUrl,
  bannerUrl,
  city,
  description,
  topics = [],
  verificationStatus,
  rejectionReason,
  footerMeta,
  actions,
  notice,
}: EntityDirectoryCardProps) {
  const [failedBanner, setFailedBanner] = useState<string | null>(null);
  const [failedAvatar, setFailedAvatar] = useState<string | null>(null);
  const [topicsExpanded, setTopicsExpanded] = useState(false);

  const showBanner = isUsableAssetUrl(bannerUrl) && failedBanner !== bannerUrl;
  const showAvatar = isUsableAssetUrl(avatarUrl) && failedAvatar !== avatarUrl;
  const initial = (name || "A").slice(0, 1).toUpperCase();
  const isVerified =
    verificationStatus === "verified" || verificationStatus === "trusted";
  const isRejected = verificationStatus === "rejected";
  const isPending = verificationStatus === "pending";
  const hasExtraTopics = topics.length > 3;
  const displayedTopics =
    hasExtraTopics && !topicsExpanded ? topics.slice(0, 3) : topics;

  return (
    <article className="flex flex-col justify-between overflow-hidden rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] text-[var(--color-ink)] hover:border-[var(--color-ink)]/30 transition-colors">
      <div>
        {/* Mini Banner */}
        <Link
          to={to}
          params={params}
          tabIndex={-1}
          aria-hidden="true"
          className="block h-16 w-full overflow-hidden border-b border-[var(--color-rule)] bg-[var(--color-paper-3)]"
        >
          {showBanner ? (
            <img
              src={bannerUrl!}
              alt=""
              onError={() => setFailedBanner(bannerUrl ?? null)}
              className="size-full object-cover"
            />
          ) : (
            <div
              className="size-full opacity-50"
              style={{
                backgroundImage:
                  "linear-gradient(var(--color-rule) 1px, transparent 1px), linear-gradient(90deg, var(--color-rule) 1px, transparent 1px)",
                backgroundSize: "16px 16px",
              }}
            />
          )}
        </Link>

        {/* Body */}
        <div className="px-5 pb-4">
          <div className="-mt-6 mb-3 flex items-end justify-between gap-3">
            <Link
              to={to}
              params={params}
              className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-[var(--color-paper-2)] bg-[var(--color-paper)] font-serif text-lg font-bold text-[var(--color-ink)] shadow-xs"
            >
              {showAvatar ? (
                <img
                  src={avatarUrl!}
                  alt={name}
                  onError={() => setFailedAvatar(avatarUrl ?? null)}
                  className={cn(
                    "size-full",
                    kind === "publisher"
                      ? "object-contain p-1"
                      : "object-cover",
                  )}
                />
              ) : (
                <span>{initial}</span>
              )}
            </Link>

            {(isPending || isRejected) && (
              <span
                className={cn(
                  "inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide",
                  isRejected
                    ? "border-[var(--color-error)]/40 bg-[var(--color-error-soft)] text-[var(--color-ink)]"
                    : "border-[var(--color-accent)]/40 bg-[var(--color-accent-soft)] text-[var(--color-ink)]",
                )}
              >
                {isRejected ? "Ditolak" : "Menunggu Verifikasi"}
              </span>
            )}
          </div>

          <div className="space-y-1.5">
            <h3 className="flex items-center gap-1.5 font-serif text-base font-bold leading-snug text-[var(--color-ink)]">
              <Link
                to={to}
                params={params}
                className="truncate hover:underline"
              >
                {name}
              </Link>
              {isVerified && <VerifiedBadge entityType={kind} size="sm" />}
            </h3>

            <p className="flex items-center gap-1.5 text-xs font-mono text-[var(--color-muted)]">
              <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">
                {city ||
                  (kind === "publisher" ? "Mitra Penerbit IKAPI" : "Indonesia")}
              </span>
            </p>

            {description && (
              <p className="line-clamp-2 text-xs leading-relaxed text-[var(--color-ink-2)] pt-0.5">
                {description}
              </p>
            )}

            {topics.length > 0 && (
              <ul className="flex flex-wrap items-center gap-1.5 pt-1">
                {displayedTopics.map((topic) => (
                  <li
                    key={topic}
                    className="rounded border border-[var(--color-rule)] bg-[var(--color-paper)] px-2 py-0.5 text-[11px] text-[var(--color-ink-2)]"
                  >
                    {topic}
                  </li>
                ))}
                {hasExtraTopics && (
                  <li>
                    <button
                      type="button"
                      aria-expanded={topicsExpanded}
                      onClick={() => setTopicsExpanded((prev) => !prev)}
                      className="rounded border border-[var(--color-rule)] bg-[var(--color-paper-3)] px-2 py-0.5 font-mono text-[11px] font-semibold text-[var(--color-ink)] hover:border-[var(--color-ink)]/40 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--color-focus)]"
                    >
                      {topicsExpanded ? "Ringkas" : `+${topics.length - 3}`}
                    </button>
                  </li>
                )}
              </ul>
            )}

            {isRejected && rejectionReason && (
              <p className="mt-2 rounded-lg border border-[var(--color-error)]/40 bg-[var(--color-error-soft)] p-2.5 text-xs text-[var(--color-ink)]">
                {rejectionReason}
              </p>
            )}

            {notice}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-rule)] bg-[var(--color-paper)]/50 px-5 py-3">
        <span className="font-mono text-xs text-[var(--color-muted)]">
          {footerMeta ??
            (kind === "publisher" ? "Penerbit Resmi" : "Komunitas Literasi")}
        </span>
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      </div>
    </article>
  );
}
