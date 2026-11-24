import { useEffect, useRef, useState } from "react";
import { AlertCircle, Check, Link2 } from "lucide-react";
import { copyTextToClipboard } from "@/features/share/web-share";
import { cn } from "@/lib/utils";

let lastLiveAnnouncement = "";

type CopyLinkButtonProps = {
  url: string;
  label?: string;
  copiedLabel?: string;
  failedLabel?: string;
  ariaLabel?: string;
  className?: string;
  compact?: boolean;
};

export function CopyLinkButton({
  url,
  label = "Salin Tautan",
  copiedLabel = "Tautan disalin",
  failedLabel = "Gagal menyalin",
  ariaLabel,
  className,
  compact = false,
}: CopyLinkButtonProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  const [liveMessage, setLiveMessage] = useState("");
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  async function handleCopy() {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    const ok = await copyTextToClipboard(url);
    const baseMessage = ok ? copiedLabel : failedLabel;
    const nextAnnouncement =
      baseMessage === lastLiveAnnouncement
        ? `${baseMessage}\u00A0`
        : baseMessage;
    lastLiveAnnouncement = nextAnnouncement;

    setStatus(ok ? "copied" : "failed");
    setLiveMessage(nextAnnouncement);

    timerRef.current = window.setTimeout(() => {
      setStatus("idle");
      setLiveMessage("");
      timerRef.current = null;
    }, 2200);
  }

  return (
    <span className="relative inline-flex items-center gap-2">
      <button
        type="button"
        onClick={() => void handleCopy()}
        data-copied={status === "copied" ? "" : undefined}
        data-failed={status === "failed" ? "" : undefined}
        aria-label={compact ? (ariaLabel ?? label) : undefined}
        className={cn(
          "inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] px-3.5 text-sm font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-paper-2)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] cursor-pointer",
          status === "copied" &&
            "border-emerald-700/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
          status === "failed" &&
            "border-red-600/40 bg-red-500/10 text-red-700 dark:text-red-300",
          className,
        )}
      >
        {status === "copied" ? (
          <Check className="size-4 shrink-0" aria-hidden="true" />
        ) : status === "failed" ? (
          <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
        ) : (
          <Link2 className="size-4 shrink-0" aria-hidden="true" />
        )}
        {!compact && (
          <span>
            {status === "copied"
              ? copiedLabel
              : status === "failed"
                ? failedLabel
                : label}
          </span>
        )}
      </button>
      <span
        role="status"
        aria-live="polite"
        className={cn(
          "pointer-events-none text-xs font-mono transition-opacity duration-150 motion-reduce:transition-none",
          compact
            ? "sr-only"
            : status === "idle"
              ? "sr-only opacity-0"
              : "sr-only opacity-100",
        )}
      >
        {liveMessage}
      </span>
    </span>
  );
}
