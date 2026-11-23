import type { CSSProperties, ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { BookOpen, Compass } from "lucide-react";
import type { ExplorePostItemDto } from "@starter/shared/types";
import { AnzaLogoMark } from "@/components/brand";
import { resolveSessionCardViewModel } from "@/features/share/card-helpers";
import { cn } from "@/lib/utils";
import { BookCoverThumb } from "./book-cover-thumb";

type SessionPostCardProps = {
  post: ExplorePostItemDto;
  variant?: "feed" | "standalone";
  as?: "article" | "div";
  footerActions?: ReactNode;
  className?: string;
};

export function SessionPostCard({
  post,
  variant = "feed",
  as = "article",
  footerActions,
  className,
}: SessionPostCardProps) {
  const Root = as;
  const vm = resolveSessionCardViewModel(post);
  const isStandalone = variant === "standalone";

  const isDarkSurface =
    (vm.template === "cover_trail" && vm.palette.isDarkBackground) ||
    (vm.template === "transparent_sticker" && vm.stickerInk === "light");

  const surfaceStyle: CSSProperties =
    vm.template === "cover_trail"
      ? {
          backgroundColor: vm.palette.background,
          color: vm.palette.foreground,
          borderColor: vm.palette.rule,
        }
      : vm.template === "transparent_sticker"
        ? vm.stickerInk === "light"
          ? {
              backgroundColor: "#161411",
              color: "#F6F2E9",
              borderColor: "rgba(246, 242, 233, 0.16)",
            }
          : {
              backgroundColor: "var(--color-paper)",
              color: "var(--color-ink)",
              borderColor: "var(--color-rule)",
            }
        : {
            backgroundColor: "var(--color-paper-2)",
            color: "var(--color-ink)",
            borderColor: "var(--color-rule)",
          };

  const secondaryColor =
    vm.template === "cover_trail"
      ? vm.palette.mutedForeground
      : isDarkSurface
        ? "rgba(246, 242, 233, 0.72)"
        : "var(--color-muted)";

  const ruleColor =
    vm.template === "cover_trail"
      ? vm.palette.rule
      : isDarkSurface
        ? "rgba(246, 242, 233, 0.16)"
        : "var(--color-rule)";

  const accentColor =
    vm.template === "cover_trail" ? vm.palette.accent : "var(--color-accent)";

  const trackBg = isDarkSurface
    ? "rgba(246, 242, 233, 0.16)"
    : "rgba(19, 17, 15, 0.12)";
  const previousProgressBg = isDarkSurface
    ? "rgba(246, 242, 233, 0.36)"
    : "rgba(19, 17, 15, 0.28)";

  return (
    <Root
      data-session-card
      data-session-template={vm.template}
      className={cn("[container-type:inline-size] space-y-3", className)}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border",
          isStandalone ? "p-6 sm:p-7" : "p-4 sm:p-5",
        )}
        style={surfaceStyle}
      >
        {/* Header: Book cover + Session title */}
        <header
          className={cn(
            "flex items-start gap-3.5 pb-4 border-b",
            vm.template === "literary_index" && "border-dashed",
          )}
          style={{ borderColor: ruleColor }}
        >
          {vm.template === "cover_trail" && (
            <BookCoverThumb
              book={post.book}
              className={isStandalone ? "w-14 sm:w-16" : "w-12"}
            />
          )}

          <div className="min-w-0 flex-1 space-y-1">
            <div
              className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono uppercase tracking-[0.13em]"
              style={{ color: secondaryColor }}
            >
              <span className="inline-flex items-center gap-1.5">
                <Compass
                  className="size-3.5 shrink-0"
                  style={{ color: accentColor }}
                  aria-hidden="true"
                />
                <span>
                  {vm.template === "literary_index"
                    ? "Kartu Indeks Baca"
                    : "Sesi Membaca"}
                </span>
              </span>
              {vm.trail.chapterLabel && (
                <span className="truncate">{vm.trail.chapterLabel}</span>
              )}
            </div>

            <h3
              className={cn(
                "font-serif font-bold leading-snug break-words",
                isStandalone ? "text-xl sm:text-2xl" : "text-base sm:text-lg",
              )}
            >
              {vm.title}
            </h3>

            {vm.note && (
              <p
                className="font-serif text-sm leading-relaxed italic pt-1 break-words"
                style={{ color: secondaryColor }}
              >
                &ldquo;{vm.note}&rdquo;
              </p>
            )}
          </div>
        </header>

        {/* Strava-style Reading Trail */}
        {vm.trail.hasTrail && (
          <div className="mt-4 space-y-1.5">
            <div
              className="flex items-center justify-between gap-2 text-[11px] font-mono"
              style={{ color: secondaryColor }}
            >
              <span>Jejak Baca</span>
              <span>
                {vm.trail.startPercent}% → {vm.trail.endPercent}%
                {vm.trail.deltaPercent > 0
                  ? ` (+${vm.trail.deltaPercent}%)`
                  : ""}
              </span>
            </div>

            <div
              className="relative h-2 w-full overflow-hidden rounded-full"
              style={{ backgroundColor: trackBg }}
              role="progressbar"
              aria-label="Progres membaca sesi"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={vm.trail.endPercent}
            >
              {vm.trail.startPercent > 0 && (
                <span
                  className="absolute inset-y-0 left-0 rounded-l-full"
                  style={{
                    width: `${vm.trail.startPercent}%`,
                    backgroundColor: previousProgressBg,
                  }}
                />
              )}
              <span
                className="absolute inset-y-0 rounded-full"
                style={{
                  left: `${vm.trail.startPercent}%`,
                  width: `${Math.max(
                    vm.trail.deltaPercent,
                    vm.trail.endPercent > 0 ? 3 : 0,
                  )}%`,
                  backgroundColor: accentColor,
                }}
              />
            </div>
          </div>
        )}

        {/* Privacy-safe Metric Grid (FLEX-03) */}
        {vm.metrics.length > 0 ? (
          <dl
            className={cn(
              "mt-4 grid gap-3",
              vm.metrics.length === 1 && "grid-cols-1",
              vm.metrics.length === 2 && "grid-cols-2",
              vm.metrics.length >= 3 && "grid-cols-2 @sm:grid-cols-3",
              vm.template === "literary_index" && "border-y border-dashed py-3",
            )}
            style={
              vm.template === "literary_index"
                ? { borderColor: ruleColor }
                : undefined
            }
          >
            {vm.metrics.map((metric) => (
              <div
                key={metric.key}
                data-session-metric={metric.key}
                className={cn(
                  "min-w-0",
                  vm.template !== "literary_index" &&
                    "rounded-lg border px-3 py-2.5",
                )}
                style={
                  vm.template !== "literary_index"
                    ? {
                        borderColor: ruleColor,
                        backgroundColor: isDarkSurface
                          ? "rgba(255, 255, 255, 0.05)"
                          : "rgba(19, 17, 15, 0.03)",
                      }
                    : undefined
                }
              >
                <dt
                  className="text-[11px] font-mono uppercase tracking-[0.08em] truncate"
                  style={{ color: secondaryColor }}
                >
                  {metric.label}
                </dt>
                <dd
                  className={cn(
                    "mt-0.5 font-mono font-semibold tabular-nums truncate",
                    vm.template === "transparent_sticker"
                      ? "text-lg sm:text-xl"
                      : "text-sm sm:text-base",
                  )}
                >
                  {metric.value}
                </dd>
                {metric.hint && (
                  <p
                    className="text-[11px] font-mono tabular-nums truncate"
                    style={{ color: secondaryColor }}
                  >
                    {metric.hint}
                  </p>
                )}
              </div>
            ))}
          </dl>
        ) : (
          <p
            className="mt-4 text-xs font-mono"
            style={{ color: secondaryColor }}
          >
            Menyelesaikan sesi membaca
          </p>
        )}

        {/* Footer: Book Link + AnzaBook Arch mark */}
        <footer
          className={cn(
            "mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-3.5 text-xs",
            vm.template === "literary_index" && "border-dashed",
          )}
          style={{ borderColor: ruleColor }}
        >
          <Link
            to="/books/$slug"
            params={{ slug: post.book.slug }}
            className="inline-flex min-h-8 min-w-0 items-center gap-2 font-medium hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] rounded-sm"
            style={{ color: "inherit" }}
          >
            <BookOpen
              className="size-3.5 shrink-0"
              style={{ color: accentColor }}
              aria-hidden="true"
            />
            <span className="truncate font-serif font-semibold">
              {post.book.title}
            </span>
            <span
              className="truncate hidden sm:inline"
              style={{ color: secondaryColor }}
            >
              — {post.book.author}
            </span>
          </Link>

          <div
            className="inline-flex items-center gap-1.5 text-[11px] font-mono shrink-0"
            style={{ color: secondaryColor }}
          >
            <AnzaLogoMark variant="badge" className="size-4 shrink-0" />
            <span>AnzaBook</span>
          </div>
        </footer>
      </div>

      {footerActions && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {footerActions}
        </div>
      )}
    </Root>
  );
}
