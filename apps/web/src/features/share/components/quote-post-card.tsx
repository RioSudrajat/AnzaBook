import type { CSSProperties, ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { BookOpen, Quote } from "lucide-react";
import type { ExplorePostItemDto, HighlightColor } from "@starter/shared/types";
import { AnzaLogoMark } from "@/components/brand";
import { resolveQuoteCardViewModel } from "@/features/share/card-helpers";
import { cn } from "@/lib/utils";
import { BookCoverThumb } from "./book-cover-thumb";

const STABILO_STYLES: Record<
  HighlightColor,
  { wash: string; border: string; accent: string }
> = {
  yellow: {
    wash: "rgba(250, 204, 21, 0.16)",
    border: "rgba(250, 204, 21, 0.45)",
    accent: "#FACC15",
  },
  green: {
    wash: "rgba(74, 222, 128, 0.15)",
    border: "rgba(74, 222, 128, 0.42)",
    accent: "#4ADE80",
  },
  coral: {
    wash: "rgba(240, 106, 36, 0.2)",
    border: "rgba(240, 106, 36, 0.55)",
    accent: "#F06A24",
  },
  blue: {
    wash: "rgba(96, 165, 250, 0.16)",
    border: "rgba(96, 165, 250, 0.45)",
    accent: "#60A5FA",
  },
};

type QuotePostCardProps = {
  post: ExplorePostItemDto;
  variant?: "feed" | "standalone";
  as?: "article" | "div";
  footerActions?: ReactNode;
  className?: string;
};

export function QuotePostCard({
  post,
  variant = "feed",
  as = "article",
  footerActions,
  className,
}: QuotePostCardProps) {
  const Root = as;
  const vm = resolveQuoteCardViewModel(post);
  const stabilo = STABILO_STYLES[post.color ?? "yellow"];
  const isCentered = vm.alignment === "center";
  const isStandalone = variant === "standalone";

  const surfaceStyle: CSSProperties =
    vm.template === "cover_tint"
      ? {
          backgroundColor: vm.palette.background,
          color: vm.palette.foreground,
          borderColor: vm.palette.rule,
        }
      : vm.template === "book_cover"
        ? {
            background: `linear-gradient(145deg, ${vm.palette.background} 0%, #161411 100%)`,
            color: "#F6F2E9",
            borderColor: "rgba(246, 242, 233, 0.16)",
          }
        : vm.template === "night_stabilo"
          ? {
              backgroundColor: "#161411",
              color: "#F6F2E9",
              borderColor: "rgba(246, 242, 233, 0.14)",
            }
          : {
              backgroundColor: "var(--color-paper-2)",
              color: "var(--color-ink)",
              borderColor: "var(--color-rule)",
            };

  const secondaryColor =
    vm.template === "cover_tint"
      ? vm.palette.mutedForeground
      : vm.template === "furrow_paper"
        ? "var(--color-muted)"
        : "rgba(246, 242, 233, 0.74)";

  const accentColor =
    vm.template === "night_stabilo"
      ? stabilo.accent
      : vm.template === "cover_tint"
        ? vm.palette.accent
        : "var(--color-accent)";

  const ruleColor =
    vm.template === "cover_tint"
      ? vm.palette.rule
      : vm.template === "furrow_paper"
        ? "var(--color-rule)"
        : "rgba(246, 242, 233, 0.16)";

  return (
    <Root
      data-quote-card
      data-quote-template={vm.template}
      className={cn("[container-type:inline-size] space-y-3", className)}
    >
      {vm.caption && (
        <p className="font-sans text-sm sm:text-[15px] leading-relaxed text-[var(--color-ink)] whitespace-pre-line">
          {vm.caption}
        </p>
      )}

      <div
        className={cn(
          "relative overflow-hidden rounded-xl border transition-colors",
          isStandalone ? "p-6 sm:p-8" : "p-5 sm:p-6",
        )}
        style={surfaceStyle}
      >
        {vm.template === "furrow_paper" && (
          <span
            aria-hidden="true"
            className="absolute inset-y-0 left-0 w-1 bg-[var(--color-accent)]"
          />
        )}

        <div
          className={cn(
            "flex flex-col gap-4",
            vm.template === "book_cover" &&
              "@md:flex-row @md:items-start @md:gap-5",
          )}
        >
          {vm.template === "book_cover" && (
            <BookCoverThumb
              book={post.book}
              className={cn(
                isStandalone ? "w-16 sm:w-20" : "w-14 sm:w-16",
                isCentered && "mx-auto @md:mx-0",
              )}
            />
          )}

          <div
            className={cn(
              "min-w-0 flex-1 space-y-3.5",
              isCentered && "text-center",
            )}
          >
            <div
              className={cn(
                "flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.14em]",
                isCentered ? "justify-center" : "justify-between",
              )}
              style={{ color: secondaryColor }}
            >
              <span className="inline-flex items-center gap-1.5">
                <Quote
                  className="size-3.5 shrink-0"
                  style={{ color: accentColor }}
                  aria-hidden="true"
                />
                <span>Kutipan Buku</span>
              </span>
              {vm.locationLabel && !isCentered && (
                <span className="truncate">{vm.locationLabel}</span>
              )}
            </div>

            <blockquote
              className={cn(
                "font-serif leading-[1.6] tracking-[-0.005em] break-words",
                isStandalone
                  ? "text-xl sm:text-2xl"
                  : "text-base sm:text-[18px]",
                vm.template === "night_stabilo" &&
                  "rounded-lg px-3.5 py-2.5 border-l-2",
              )}
              style={
                vm.template === "night_stabilo"
                  ? {
                      backgroundColor: stabilo.wash,
                      borderLeftColor: stabilo.border,
                    }
                  : undefined
              }
            >
              &ldquo;{post.content}&rdquo;
            </blockquote>

            {vm.locationLabel && isCentered && (
              <p
                className="text-[11px] font-mono uppercase tracking-[0.12em]"
                style={{ color: secondaryColor }}
              >
                {vm.locationLabel}
              </p>
            )}

            {vm.note && (
              <p
                className={cn(
                  "text-xs sm:text-sm leading-relaxed italic pt-2.5 border-t",
                  isCentered && "mx-auto max-w-prose",
                )}
                style={{ color: secondaryColor, borderColor: ruleColor }}
              >
                Catatan pembaca: {vm.note}
              </p>
            )}
          </div>
        </div>

        <footer
          className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-3.5 text-xs"
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
