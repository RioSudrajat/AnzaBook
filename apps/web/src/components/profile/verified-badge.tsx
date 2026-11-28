import { cn } from "@/lib/utils";

const ENTITY_LABELS = {
  author: "Penulis Resmi Terverifikasi",
  publisher: "Penerbit Mitra Terverifikasi",
  community: "Komunitas Literasi Terverifikasi",
} as const;

export function VerifiedBadge({
  entityType = "author",
  size = "sm",
  className,
}: {
  entityType?: keyof typeof ENTITY_LABELS;
  size?: "sm" | "md";
  className?: string;
}) {
  const label = ENTITY_LABELS[entityType];
  const dimensionClass = size === "md" ? "size-5" : "size-4";

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center align-middle",
        className,
      )}
      title={label}
      aria-label={label}
    >
      <svg
        viewBox="0 0 24 24"
        className={cn(dimensionClass, "text-[var(--color-verified)]")}
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.67-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2-3.54-3.54 1.41-1.41 2.12 2.12 4.95-4.95 1.41 1.41-6.35 6.37z" />
      </svg>
    </span>
  );
}
