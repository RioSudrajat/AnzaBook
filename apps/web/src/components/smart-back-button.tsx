import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

type SmartBackButtonProps = {
  /** Where to go when the page was opened directly (no in-app history). */
  fallbackTo?: string;
  label?: ReactNode;
  className?: string;
};

function hasInAppHistory() {
  if (typeof window === "undefined") return false;
  const index = (window.history.state as { __TSR_index?: number } | null)
    ?.__TSR_index;
  return typeof index === "number" ? index > 0 : window.history.length > 1;
}

export function SmartBackButton({
  fallbackTo = "/app",
  label = "Kembali",
  className,
}: SmartBackButtonProps) {
  const router = useRouter();

  const goBack = () => {
    if (hasInAppHistory()) {
      router.history.back();
      return;
    }
    void router.navigate({ to: fallbackTo });
  };

  return (
    <button
      type="button"
      onClick={goBack}
      className={cn(
        "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-2 text-sm font-mono text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring",
        className,
      )}
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}
