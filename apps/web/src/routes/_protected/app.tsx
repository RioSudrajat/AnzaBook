import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  BadgeCheck,
  BookMarked,
  Compass,
  Home,
  Settings,
} from "lucide-react";
import { z } from "zod";
import type {
  BookHighlightDto,
  ReadingSessionDto,
} from "@starter/shared/types";
import { siteConfig } from "@/config/site";
import { useAuthors, useBooks, useCollections } from "@/features/books/hooks";
import { useUserShelves } from "@/features/community/hooks";
import { AllHighlightsDialog } from "@/features/dashboard/components/all-highlights-dialog";
import { DashboardExplore } from "@/features/dashboard/components/dashboard-explore";
import { DashboardHome } from "@/features/dashboard/components/dashboard-home";
import { DashboardLibrary } from "@/features/dashboard/components/dashboard-library";
import { DashboardSettings } from "@/features/dashboard/components/dashboard-settings";
import { useMembershipSummary } from "@/features/membership/hooks";
import { HighlightStoryDialog } from "@/features/reader/components/highlight-story-dialog";
import { FlexReadingDialog } from "@/features/share/components/flex-reading-dialog";

export type AppTab =
  | "home"
  | "explore"
  | "library"
  | "settings"
  | "shelves"
  | "history"
  | "share"
  | "publisher";

const appSearchSchema = z.object({
  tab: z
    .enum([
      "home",
      "explore",
      "library",
      "settings",
      "shelves",
      "history",
      "share",
      "publisher",
    ])
    .optional(),
  category: z.string().min(1).max(50).optional().catch(undefined),
  collection: z.string().min(1).max(120).optional().catch(undefined),
});

export const Route = createFileRoute("/_protected/app")({
  validateSearch: appSearchSchema,
  head: () => ({ meta: [{ title: `Pustaka & Studio | ${siteConfig.name}` }] }),
  component: AppPage,
});

export default function AppPage() {
  const { user } = Route.useRouteContext().session;
  const search = Route.useSearch();
  const navigate = useNavigate();

  // Normalize legacy tab parameters
  const currentTabRaw = search.tab || "home";
  const activeTab =
    currentTabRaw === "shelves" || currentTabRaw === "history" || currentTabRaw === "share"
      ? "library"
      : currentTabRaw === "publisher"
        ? "settings"
        : currentTabRaw;

  // Queries
  const { data: booksData } = useBooks();
  const { data: authors = [] } = useAuthors();
  const { data: collections = [] } = useCollections();
  const { data: shelves = [] } = useUserShelves();
  const { data: membership } = useMembershipSummary();

  const books = booksData?.data || [];
  const bulletinBook = booksData?.bulletin || null;
  const currentlyReading = shelves.find((item) => item.shelfStatus === "reading");

  // Dialog states
  const [isAllHighlightsOpen, setIsAllHighlightsOpen] = useState(false);
  const [flexStoryState, setFlexStoryState] = useState<{
    isOpen: boolean;
    session: ReadingSessionDto | null;
    bookTitle: string;
  }>({
    isOpen: false,
    session: null,
    bookTitle: "",
  });

  const [quoteStoryState, setQuoteStoryState] = useState<{
    isOpen: boolean;
    highlight: BookHighlightDto | null;
  }>({
    isOpen: false,
    highlight: null,
  });

  const handleTabChange = (tab: "home" | "explore" | "library" | "settings") => {
    navigate({
      to: "/app",
      search: { tab },
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* 1. Left Fixed Vertical Icon Sidebar (Matching SS 2, 3, 4, 5) */}
      <aside className="hidden md:flex w-16 shrink-0 border-r border-border/80 bg-card/60 backdrop-blur-md flex-col items-center justify-between py-5 sticky top-0 h-screen z-40 select-none">
        {/* Top: AnzaBook Logo Mark */}
        <div className="flex flex-col items-center gap-6">
          <Link
            to="/app"
            search={{ tab: "home" }}
            onClick={() => handleTabChange("home")}
            className="p-1.5 rounded-[8px] hover:bg-muted transition-colors"
            title="Beranda AnzaBook"
          >
            <img
              src="/logo-mark.svg"
              alt="AnzaBook"
              className="size-7 object-contain drop-shadow-sm"
            />
          </Link>

          {/* Navigation Icons */}
          <nav className="flex flex-col items-center gap-2" aria-label="Navigasi Utama">
            {/* Home */}
            <button
              type="button"
              onClick={() => handleTabChange("home")}
              className={`p-2.5 rounded-[10px] transition-all cursor-pointer ${
                activeTab === "home"
                  ? "bg-[var(--color-accent)] text-white shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              title="Home"
            >
              <Home className="size-5" />
            </button>

            {/* Explore */}
            <button
              type="button"
              onClick={() => handleTabChange("explore")}
              className={`p-2.5 rounded-[10px] transition-all cursor-pointer ${
                activeTab === "explore"
                  ? "bg-[var(--color-accent)] text-white shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              title="Explore (Rak Kategori)"
            >
              <Compass className="size-5" />
            </button>

            {/* My Library */}
            <button
              type="button"
              onClick={() => handleTabChange("library")}
              className={`p-2.5 rounded-[10px] transition-all cursor-pointer ${
                activeTab === "library"
                  ? "bg-[var(--color-accent)] text-white shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              title="My Library"
            >
              <BookMarked className="size-5" />
            </button>

            {/* Settings */}
            <button
              type="button"
              onClick={() => handleTabChange("settings")}
              className={`p-2.5 rounded-[10px] transition-all cursor-pointer ${
                activeTab === "settings"
                  ? "bg-[var(--color-accent)] text-white shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              title="Settings"
            >
              <Settings className="size-5" />
            </button>
          </nav>
        </div>

        <div className="flex flex-col items-center gap-4">
          {/* User Avatar */}
          <button
            type="button"
            onClick={() => handleTabChange("settings")}
            className="size-8 rounded-full bg-muted border border-border flex items-center justify-center font-bold text-xs text-foreground hover:ring-2 hover:ring-[var(--color-accent)] transition-all cursor-pointer"
            title={`Profil ${user.name}`}
          >
            {user.name.slice(0, 1)}
          </button>
        </div>
      </aside>

      {/* 2. Main Content Canvas */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar per Screens */}
        <header className="sticky top-0 z-30 border-b border-border/80 bg-background/95 backdrop-blur-md px-6 py-3.5 flex items-center justify-between select-none">
          <div className="flex items-center gap-3">
            <img
              src="/logo-mark.svg"
              alt="AnzaBook"
              className="size-6 object-contain md:hidden"
            />
            <h1 className="font-serif text-lg font-bold capitalize">
              {activeTab === "home"
                ? "Home"
                : activeTab === "explore"
                  ? "Explore"
                  : activeTab === "library"
                    ? "My Library"
                    : "Settings"}
            </h1>
          </div>

          <Link
            to="/membership"
            search={{}}
            className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            <BadgeCheck className="size-4" aria-hidden="true" />
            Nakama
          </Link>
        </header>

        {/* Main Tab Screen Switcher */}
        <main id="main-content" className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 pt-6">
          {activeTab === "home" && membership?.status === "expired" && (
            <section aria-label="Keanggotaan Nakama" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4">
              <p className="text-sm">Masa aktif Nakama sudah berakhir. Perpanjang untuk melanjutkan buku Premium dari posisi terakhir.</p>
              <Link
                to="/membership"
                search={{}}
                className="inline-flex min-h-11 items-center rounded-md px-2 text-sm font-semibold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
              >
                Perpanjang Nakama
              </Link>
            </section>
          )}
          {activeTab === "home" && (
            <DashboardHome
              books={books}
              authors={authors}
              bulletinBook={bulletinBook}
              collections={collections}
              currentlyReading={currentlyReading}
            />
          )}

          {activeTab === "explore" && (
            <DashboardExplore
              category={search.category}
              collection={search.collection}
            />
          )}

          {activeTab === "library" && (
            <DashboardLibrary
              shelves={shelves}
              onOpenAllHighlights={() => setIsAllHighlightsOpen(true)}
              onOpenFlexStory={(session, bookTitle) => {
                setFlexStoryState({
                  isOpen: true,
                  session,
                  bookTitle,
                });
              }}
            />
          )}

          {activeTab === "settings" && (
            <DashboardSettings
              userName={user.name}
              userEmail={user.email}
              userRole={user.role ?? undefined}
              emailVerified={user.emailVerified}
              memberSince={typeof user.createdAt === "string" ? user.createdAt : user.createdAt.toISOString()}
            />
          )}
        </main>

        {/* Authentic Malaka Books Style Footer (per SS 2, 3, 4, 5) */}
        <footer className="border-t border-border/80 bg-card/40 mt-16 pt-12 pb-16 px-6 sm:px-12 select-none">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="flex flex-wrap items-start justify-between gap-8 text-xs font-sans">
              {/* Brand & Mobile apps */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <img src="/logo-mark.svg" alt="AnzaBook" className="size-6 object-contain" />
                  <span className="font-serif font-bold text-base tracking-tight">
                    AnzaBook
                  </span>
                </div>
                <p className="text-muted-foreground text-xs leading-relaxed max-w-xs">
                  Pustaka digital dwibahasa dan edisi cetak rakyat. Kedaulatan literasi untuk akal budi yang berdikari.
                </p>
                <div className="text-[11px] font-mono text-muted-foreground pt-2">
                  &copy; Copyright AnzaBook, 2026.
                </div>
              </div>

              <nav aria-label="Tautan AnzaBook" className="flex flex-wrap gap-x-5 text-sm">
                <Link to="/app" search={{ tab: "explore" }} className="inline-flex min-h-11 items-center underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring">
                  Katalog
                </Link>
                <Link to="/membership" search={{}} className="inline-flex min-h-11 items-center underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring">
                  Keanggotaan Nakama
                </Link>
              </nav>
            </div>

            {/* Giant Subtle Background Watermark Typography */}
            <div
              className="text-center font-serif text-5xl sm:text-7xl lg:text-9xl font-black tracking-tighter opacity-[0.035] select-none pointer-events-none"
              aria-hidden="true"
            >
              AnzaBook
            </div>
          </div>
        </footer>
      </div>

      {/* 3. Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Navigasi Bawah Mobile"
        className="md:hidden fixed bottom-0 inset-x-0 bg-background/95 backdrop-blur-md border-t border-border z-40 flex items-center justify-around py-2 px-4"
      >
        <button
          type="button"
          onClick={() => handleTabChange("home")}
          className={`flex flex-col items-center gap-1 p-1 text-[10px] font-mono ${
            activeTab === "home" ? "text-[var(--color-accent)] font-bold" : "text-muted-foreground"
          }`}
        >
          <Home className="size-4" />
          <span>Home</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("explore")}
          className={`flex flex-col items-center gap-1 p-1 text-[10px] font-mono ${
            activeTab === "explore" ? "text-[var(--color-accent)] font-bold" : "text-muted-foreground"
          }`}
        >
          <Compass className="size-4" />
          <span>Explore</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("library")}
          className={`flex flex-col items-center gap-1 p-1 text-[10px] font-mono ${
            activeTab === "library" ? "text-[var(--color-accent)] font-bold" : "text-muted-foreground"
          }`}
        >
          <BookMarked className="size-4" />
          <span>Library</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("settings")}
          className={`flex flex-col items-center gap-1 p-1 text-[10px] font-mono ${
            activeTab === "settings" ? "text-[var(--color-accent)] font-bold" : "text-muted-foreground"
          }`}
        >
          <Settings className="size-4" />
          <span>Settings</span>
        </button>
      </nav>

      {/* Dialog: All User Highlights */}
      <AllHighlightsDialog
        isOpen={isAllHighlightsOpen}
        onClose={() => setIsAllHighlightsOpen(false)}
        onOpenStory={(hl) => {
          setIsAllHighlightsOpen(false);
          setQuoteStoryState({
            isOpen: true,
            highlight: hl,
          });
        }}
      />

      {/* Dialog: Flex Your Reading Athletic Card */}
      <FlexReadingDialog
        isOpen={flexStoryState.isOpen}
        session={flexStoryState.session}
        bookTitle={flexStoryState.bookTitle}
        userName={user.name}
        onClose={() =>
          setFlexStoryState((prev) => ({ ...prev, isOpen: false }))
        }
      />

      {/* Dialog: Specific Quote 9:16 Story */}
      {quoteStoryState.highlight && (
        <HighlightStoryDialog
          isOpen={quoteStoryState.isOpen}
          onClose={() =>
            setQuoteStoryState({ isOpen: false, highlight: null })
          }
          bookTitle="Sains, Logika, dan Seni untuk Hidup Bermutu"
          bookAuthor="Zenius"
          chapterNumber={quoteStoryState.highlight.chapterNumber}
          highlightText={quoteStoryState.highlight.selectedText}
          color={quoteStoryState.highlight.color}
          note={quoteStoryState.highlight.note || undefined}
          readerName={user.name}
        />
      )}
    </div>
  );
}
