import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import { sanitizeReturnTo } from "@/lib/navigation-return";
import { cn } from "@/lib/utils";

type SmartBackButtonProps = {
  /** Where to go when the page was opened directly (no in-app history). */
  fallbackTo?: string;
  /** Explicit safe in-app return path (takes precedence over browser history). */
  returnTo?: string | null;
  label?: ReactNode;
  className?: string;
};

function navigateToRelativeUrl(
  router: ReturnType<typeof useRouter>,
  relativeUrl: string,
) {
  const parsed = new URL(relativeUrl, "https://anzabook.local");
  const search: Record<string, string> = {};
  parsed.searchParams.forEach((value, key) => {
    search[key] = value;
  });

  void router.navigate({
    to: parsed.pathname as never,
    search: (Object.keys(search).length > 0 ? search : undefined) as never,
    hash: parsed.hash ? parsed.hash.slice(1) : undefined,
  });
}

export function SmartBackButton({
  fallbackTo = "/app",
  returnTo,
  label = "Kembali",
  className,
}: SmartBackButtonProps) {
  const router = useRouter();
  const safeReturnTo = sanitizeReturnTo(returnTo);
  const safeFallback = sanitizeReturnTo(fallbackTo) ?? "/app";

  const goBack = () => {
    if (safeReturnTo) {
      navigateToRelativeUrl(router, safeReturnTo);
      return;
    }

    const tsrIndex =
      typeof window !== "undefined"
        ? (window.history.state as { __TSR_index?: number } | null)?.__TSR_index
        : undefined;
    if (typeof tsrIndex === "number" && tsrIndex > 0) {
      router.history.back();
      return;
    }

    navigateToRelativeUrl(router, safeFallback);
  };

  return (
    <button
      type="button"
      onClick={goBack}
      className={cn(
        "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-2 text-sm font-mono text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)] focus-visible:outline-2 focus-visible:outline-[var(--color-focus)]",
        className,
      )}
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}
