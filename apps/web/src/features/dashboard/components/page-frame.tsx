import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { SiteFooter } from "@/components/site-footer";
import { SmartBackButton } from "@/components/smart-back-button";
import { AppShell } from "@/features/dashboard/components/app-shell";
import type { AppTab } from "@/features/dashboard/components/app-sidebar";

type FrameUser = {
  name: string;
  email: string;
  role?: string | null;
  image?: string | null;
};

type PageFrameProps = {
  user?: FrameUser | null;
  activeTab: AppTab;
  title: string;
  backLabel?: string;
  backFallback?: string;
  showBack?: boolean;
  children: ReactNode;
};

/**
 * Signed-in visitors stay inside the app shell (sidebar, header, bottom nav);
 * anonymous visitors get the lightweight public header so shared links still work.
 */
export function PageFrame({
  user,
  activeTab,
  title,
  backLabel = "Kembali",
  backFallback = "/app",
  showBack = true,
  children,
}: PageFrameProps) {
  if (user) {
    return (
      <AppShell user={user} activeTab={activeTab} title={title}>
        {showBack && (
          <SmartBackButton
            fallbackTo={backFallback}
            label={backLabel}
            className="-ml-2 mb-3"
          />
        )}
        {children}
      </AppShell>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/90 backdrop-blur-md px-4 sm:px-8 py-2 flex items-center justify-between">
        {showBack ? (
          <SmartBackButton fallbackTo="/" label={backLabel} />
        ) : (
          <span />
        )}
        <Link to="/" className="flex items-center gap-2">
          <img
            src="/icon.svg"
            alt=""
            className="size-6 rounded-[5px] object-contain border border-border/40 shadow-xs"
          />
          <span className="font-serif font-bold text-sm">AnzaBook</span>
        </Link>
      </header>
      <main
        id="main-content"
        className="max-w-5xl w-full mx-auto px-4 sm:px-8 py-8 flex-1"
      >
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
