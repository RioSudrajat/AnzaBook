import { Link } from "@tanstack/react-router";
import { BookOpen, User as UserIcon } from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import type { Session } from "@/lib/session";

type SiteHeaderProps = {
  session?: Session | null;
};

export function SiteHeader({ session }: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-[var(--color-paper)]/90 backdrop-blur-md transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Brand />

        {/* Center Navigation Links */}
        <nav
          className="hidden md:flex items-center gap-6 text-sm font-medium text-foreground/80"
          aria-label="Navigasi Utama"
        >
          <a
            href="#katalog"
            className="hover:text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] rounded-[4px]"
          >
            Katalog Buku
          </a>
          <a
            href="#buletin"
            className="hover:text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] rounded-[4px]"
          >
            Buletin Mingguan
          </a>
          <a
            href="#revolusi-harga"
            className="hover:text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] rounded-[4px]"
          >
            Revolusi Kertas
          </a>
          <a
            href="#keanggotaan"
            className="hover:text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] rounded-[4px]"
          >
            Keanggotaan
          </a>
          <a
            href="#faq"
            className="hover:text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] rounded-[4px]"
          >
            FAQ
          </a>
        </nav>

        {/* Right CTA */}
        <div className="flex items-center gap-3">
          {session ? (
            <Button asChild size="sm">
              <Link to="/app">
                <BookOpen className="size-4 mr-1.5" />
                Ruang Baca Saya
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/sign-in">
                  <UserIcon className="size-4 mr-1.5" />
                  Masuk
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/sign-up">Daftar Membaca</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
