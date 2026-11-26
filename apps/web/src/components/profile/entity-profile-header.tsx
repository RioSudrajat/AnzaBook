import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { AnzaLogoMark } from "@/components/brand";
import { isUsableAssetUrl } from "@/lib/media-url";
import { cn } from "@/lib/utils";
import {
  ProfileSocialLinks,
  type ProfileSocialLinksData,
} from "./social-icons";

export type EntityProfileBadge = {
  label: string;
  tone?: "neutral" | "accent" | "success" | "warning" | "error";
  icon?: ReactNode;
};

export type EntityProfileMetric = {
  label: string;
  value: string | number;
  unit?: string;
  icon?: ReactNode;
  onClick?: () => void;
  title?: string;
};

export type EntityProfileHeaderProps = {
  kind: "user" | "publisher" | "community";
  name: string;
  headingId?: string;
  headingLevel?: "h1" | "h2";
  handleOrSlug?: string | null;
  handleHref?: string;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  logoFit?: "cover" | "contain";
  badges?: EntityProfileBadge[];
  metaItems?: Array<{ icon?: ReactNode; label: string }>;
  bio?: string | null;
  topics?: string[];
  socialLinks?: ProfileSocialLinksData | null;
  affiliations?: ReactNode;
  actions?: ReactNode;
  modeSwitcher?: ReactNode;
  metrics?: EntityProfileMetric[];
  ariaLabel?: string;
};

const BADGE_TONE_CLASS: Record<
  NonNullable<EntityProfileBadge["tone"]>,
  string
> = {
  neutral:
    "border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink-2)]",
  accent:
    "border-[var(--color-accent)]/50 bg-[var(--color-accent-soft)] text-[var(--color-ink)]",
  success:
    "border-[var(--color-green)]/40 bg-[var(--color-green-soft)] text-[var(--color-ink)]",
  warning:
    "border-[var(--color-accent)]/40 bg-[var(--color-accent-soft)] text-[var(--color-ink)]",
  error:
    "border-[var(--color-error)]/40 bg-[var(--color-error-soft)] text-[var(--color-ink)]",
};

export function EntityProfileHeader({
  kind,
  name,
  headingId,
  headingLevel = "h1",
  handleOrSlug,
  handleHref,
  avatarUrl,
  bannerUrl,
  logoFit,
  badges = [],
  metaItems = [],
  bio,
  topics = [],
  socialLinks,
  affiliations,
  actions,
  modeSwitcher,
  metrics = [],
  ariaLabel,
}: EntityProfileHeaderProps) {
  const [failedBannerUrl, setFailedBannerUrl] = useState<string | null>(null);
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);
  const [bioExpanded, setBioExpanded] = useState(false);

  const showBanner =
    isUsableAssetUrl(bannerUrl) && failedBannerUrl !== bannerUrl;
  const showAvatar =
    isUsableAssetUrl(avatarUrl) && failedAvatarUrl !== avatarUrl;

  const effectiveLogoFit =
    logoFit ?? (kind === "publisher" ? "contain" : "cover");
  const isCircular = kind === "user";
  const initial = (name || "A").slice(0, 1).toUpperCase();
  const HeadingTag = headingLevel;

  const trimmedBio = bio?.trim() || "";
  const isLongBio = trimmedBio.length > 320;
  const displayedBio =
    isLongBio && !bioExpanded
      ? `${trimmedBio.slice(0, 320).trimEnd()}…`
      : trimmedBio;

  return (
    <section
      aria-label={ariaLabel}
      aria-labelledby={ariaLabel ? undefined : headingId}
      className="overflow-hidden rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] text-[var(--color-ink)]"
    >
      {/* 3:1 Editorial Banner */}
      <div className="relative h-36 sm:h-48 w-full overflow-hidden border-b border-[var(--color-rule)] bg-[var(--color-paper-3)]">
        {showBanner ? (
          <img
            src={bannerUrl!}
            alt={`Banner ${name}`}
            onError={() => setFailedBannerUrl(bannerUrl ?? null)}
            className="size-full object-cover"
          />
        ) : (
          <div
            aria-hidden="true"
            className="relative flex size-full items-center justify-center overflow-hidden bg-[var(--color-paper-3)] select-none"
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-45"
              style={{
                backgroundImage:
                  "linear-gradient(var(--color-rule) 1px, transparent 1px), linear-gradient(90deg, var(--color-rule) 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }}
            />
            <div className="relative z-10 flex items-center gap-2 text-[var(--color-muted)]">
              <AnzaLogoMark variant="badge" className="size-5 opacity-75" />
              <span className="font-serif text-xs sm:text-sm italic text-[var(--color-ink-2)]">
                AnzaBook Pustaka Rakyat
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Body */}
      <div className="px-5 pb-6 sm:px-8 sm:pb-7">
        {/* Top Overlap Row: Avatar/Logo + Mode Switcher & Actions */}
        <div className="-mt-12 sm:-mt-14 mb-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div
            className={cn(
              "relative flex size-24 sm:size-28 shrink-0 items-center justify-center overflow-hidden border-4 border-[var(--color-paper-2)] bg-[var(--color-paper)] font-serif text-3xl font-bold text-[var(--color-ink)] shadow-sm",
              isCircular ? "rounded-full" : "rounded-2xl",
            )}
          >
            {showAvatar ? (
              <img
                src={avatarUrl!}
                alt={name}
                onError={() => setFailedAvatarUrl(avatarUrl ?? null)}
                className={cn(
                  "size-full",
                  effectiveLogoFit === "contain"
                    ? "object-contain p-2"
                    : "object-cover",
                )}
              />
            ) : (
              <span>{initial}</span>
            )}
          </div>

          {(modeSwitcher || actions) && (
            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              {modeSwitcher}
              {actions}
            </div>
          )}
        </div>

        {/* Identity, Badges, Meta, Bio, Topics, Social */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <HeadingTag
              id={headingId}
              className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-ink)] break-words"
            >
              {name}
            </HeadingTag>

            {badges.map((badge) => (
              <span
                key={badge.label}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 font-mono text-xs font-semibold",
                  BADGE_TONE_CLASS[badge.tone ?? "neutral"],
                )}
              >
                {badge.icon}
                <span>{badge.label}</span>
              </span>
            ))}
          </div>

          {(handleOrSlug || metaItems.length > 0) && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-xs text-[var(--color-muted)]">
              {handleOrSlug &&
                (handleHref ? (
                  <Link
                    to={handleHref}
                    className="font-semibold text-[var(--color-ink)] hover:underline focus-visible:outline-2 focus-visible:outline-[var(--color-focus)] rounded-sm"
                  >
                    {handleOrSlug}
                  </Link>
                ) : (
                  <span className="font-semibold text-[var(--color-ink)]">
                    {handleOrSlug}
                  </span>
                ))}

              {metaItems.map((item, idx) => (
                <span
                  key={`${item.label}-${idx}`}
                  className="inline-flex items-center gap-1.5"
                >
                  {item.icon}
                  <span>{item.label}</span>
                </span>
              ))}
            </div>
          )}

          {trimmedBio && (
            <div className="max-w-2xl space-y-1 pt-0.5">
              <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--color-ink-2)]">
                {displayedBio}
              </p>
              {isLongBio && (
                <button
                  type="button"
                  aria-expanded={bioExpanded}
                  onClick={() => setBioExpanded((prev) => !prev)}
                  className="inline-flex min-h-9 items-center text-xs font-semibold text-[var(--color-accent)] hover:underline cursor-pointer"
                >
                  {bioExpanded ? "Ringkas" : "Lihat selengkapnya"}
                </button>
              )}
            </div>
          )}

          {topics.length > 0 && (
            <ul
              className="flex flex-wrap items-center gap-2 pt-1"
              aria-label="Topik kurasi"
            >
              {topics.map((topic) => (
                <li
                  key={topic}
                  className="rounded-md border border-[var(--color-rule)] bg-[var(--color-paper)] px-2.5 py-1 text-xs font-medium text-[var(--color-ink-2)]"
                >
                  {topic}
                </li>
              ))}
            </ul>
          )}

          <ProfileSocialLinks links={socialLinks} />
          {affiliations}
        </div>

        {/* Consistent 4-Column Metric Strip */}
        {metrics.length > 0 && (
          <dl className="mt-6 grid grid-cols-2 gap-3 border-t border-[var(--color-rule)] pt-5 sm:grid-cols-4">
            {metrics.map((metric) => {
              const content = (
                <>
                  <dt className="flex items-center gap-1.5 font-mono text-[11px] text-[var(--color-muted)]">
                    {metric.icon}
                    <span>{metric.label}</span>
                  </dt>
                  <dd className="mt-1 font-serif text-xl sm:text-2xl font-bold text-[var(--color-ink)]">
                    {metric.value}
                    {metric.unit ? (
                      <span className="ml-1 font-mono text-xs font-normal text-[var(--color-muted)]">
                        {metric.unit}
                      </span>
                    ) : null}
                  </dd>
                </>
              );

              if (metric.onClick) {
                return (
                  <button
                    key={metric.label}
                    type="button"
                    onClick={metric.onClick}
                    title={metric.title}
                    className="rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] p-3.5 text-left hover:border-[var(--color-ink)]/40 hover:bg-[var(--color-paper-3)] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--color-focus)]"
                  >
                    {content}
                  </button>
                );
              }

              return (
                <div
                  key={metric.label}
                  className="rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] p-3.5"
                >
                  {content}
                </div>
              );
            })}
          </dl>
        )}
      </div>
    </section>
  );
}
