import { Link } from "@tanstack/react-router";
import { siteConfig } from "@/config/site";

export function Brand({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      className={`inline-flex items-center gap-2.5 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-focus)] cursor-pointer ${className ?? ""}`}
      aria-label={`${siteConfig.name} beranda`}
    >
      <img
        src="/icon.svg"
        alt=""
        width={32}
        height={32}
        className="size-8 rounded-[6px] shrink-0 border border-border/40 shadow-xs"
      />
      <span className="flex flex-col leading-none">
        <span className="font-serif text-lg font-semibold tracking-tight text-foreground">
          {siteConfig.name}
        </span>
        <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground mt-0.5">
          Pustaka & Cetak Rakyat
        </span>
      </span>
    </Link>
  );
}
