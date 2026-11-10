import { Link } from "@tanstack/react-router";
import { siteConfig } from "@/config/site";

type BrandProps = {
  className?: string;
  asLink?: boolean;
  size?: "sm" | "default" | "lg";
};

export function Brand({
  className,
  asLink = true,
  size = "default",
}: BrandProps) {
  const content = (
    <>
      <img
        src="/icon.svg"
        alt=""
        width={size === "sm" ? 24 : size === "lg" ? 40 : 32}
        height={size === "sm" ? 24 : size === "lg" ? 40 : 32}
        className={`${
          size === "sm"
            ? "size-6 rounded-[5px]"
            : size === "lg"
              ? "size-10 rounded-[8px]"
              : "size-8 rounded-[6px]"
        } shrink-0 border border-border/40 shadow-xs`}
      />
      <span className="flex flex-col items-start text-left leading-none">
        <span
          className={`font-serif font-semibold tracking-tight text-foreground text-left ${
            size === "sm" ? "text-base" : size === "lg" ? "text-xl" : "text-lg"
          }`}
        >
          {siteConfig.name}
        </span>
        <span
          className={`uppercase font-mono tracking-wider text-muted-foreground mt-0.5 text-left ${
            size === "sm"
              ? "text-[9px]"
              : size === "lg"
                ? "text-[11px]"
                : "text-[10px]"
          }`}
        >
          Pustaka & Cetak Rakyat
        </span>
      </span>
    </>
  );

  if (!asLink) {
    return (
      <div
        className={`inline-flex items-center gap-2.5 text-left ${className ?? ""}`}
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      to="/"
      className={`inline-flex items-center gap-2.5 text-left rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-focus)] cursor-pointer ${className ?? ""}`}
      aria-label={`${siteConfig.name} beranda`}
    >
      {content}
    </Link>
  );
}
