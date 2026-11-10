import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { BookOpen, Menu, User as UserIcon, X } from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import type { Session } from "@/lib/session";

type SiteHeaderProps = {
  session?: Session | null;
};

export function SiteHeader({ session }: SiteHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-[var(--color-paper)]/95 backdrop-blur-md transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3.5 sm:px-6 lg:px-8">
        {/* Brand */}
        <Brand />

        {/* Center Navigation Links (Desktop) */}
        <nav
          className="hidden md:flex items-center gap-6 text-sm font-medium text-foreground/80"
          aria-label="Navigasi Utama"
        >
          <a
            href="/#katalog"
            className="hover:text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] rounded-[4px]"
          >
            Katalog Buku
          </a>
          <a
            href="/#buletin"
            className="hover:text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] rounded-[4px]"
          >
            Buletin Mingguan
          </a>
          <a
            href="/#revolusi-harga"
            className="hover:text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] rounded-[4px]"
          >
            Revolusi Kertas
          </a>
          <a
            href="/#keanggotaan"
            className="hover:text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] rounded-[4px]"
          >
            Keanggotaan
          </a>
          <Link
            to="/about"
            className="hover:text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] rounded-[4px]"
          >
            Tentang Kami
          </Link>
        </nav>

        {/* Right CTA */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {session ? (
            <Button asChild size="sm" className="min-h-10 text-xs sm:text-sm px-2.5 sm:px-3">
              <Link to="/app">
                <BookOpen className="size-3.5 sm:size-4 mr-1 sm:mr-1.5" />
                <span>Ruang Baca</span>
                <span className="hidden sm:inline">&nbsp;Saya</span>
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="min-h-10 px-2 sm:px-3 text-xs sm:text-sm">
                <Link to="/sign-in">
                  <UserIcon className="size-3.5 sm:size-4 mr-1 sm:mr-1.5" />
                  Masuk
                </Link>
              </Button>
              <Button asChild size="sm" className="min-h-10 px-2.5 sm:px-3 text-xs sm:text-sm">
                <Link to="/sign-up">
                  Daftar<span className="hidden sm:inline">&nbsp;Membaca</span>
                </Link>
              </Button>
            </>
          )}

          {/* Mobile Hamburger Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? "Tutup menu" : "Buka menu navigasi"}
            className="md:hidden flex items-center justify-center size-10 rounded-md text-foreground/80 hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring"
          >
            {mobileMenuOpen ? (
              <X className="size-5" />
            ) : (
              <Menu className="size-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer / Menu */}
      {mobileMenuOpen && (
        <nav
          aria-label="Navigasi Menu Mobile"
          className="md:hidden border-t border-border/70 bg-[var(--color-paper)] px-4 py-3 space-y-1 shadow-lg animate-in slide-in-from-top-2 duration-150"
        >
          <a
            href="/#katalog"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center min-h-11 px-3 py-2 rounded-md text-sm font-medium text-foreground hover:bg-muted/60 transition-colors"
          >
            Katalog Buku
          </a>
          <a
            href="/#buletin"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center min-h-11 px-3 py-2 rounded-md text-sm font-medium text-foreground hover:bg-muted/60 transition-colors"
          >
            Buletin Mingguan
          </a>
          <a
            href="/#revolusi-harga"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center min-h-11 px-3 py-2 rounded-md text-sm font-medium text-foreground hover:bg-muted/60 transition-colors"
          >
            Revolusi Kertas
          </a>
          <a
            href="/#keanggotaan"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center min-h-11 px-3 py-2 rounded-md text-sm font-medium text-foreground hover:bg-muted/60 transition-colors"
          >
            Keanggotaan
          </a>
          <Link
            to="/about"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center min-h-11 px-3 py-2 rounded-md text-sm font-medium text-foreground hover:bg-muted/60 transition-colors"
          >
            Tentang Kami
          </Link>
        </nav>
      )}
    </header>
  );
}
