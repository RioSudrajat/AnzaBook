import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Bell, Calendar, Gift, Home, Library, Moon, Search, Settings, ShoppingCart, Sun, User } from "lucide-react";
import { z } from "zod";
import type {
  BookHighlightDto,
  ReadingSessionDto,
} from "@starter/shared/types";
import { siteConfig } from "@/config/site";
import { SiteFooter } from "@/components/site-footer";
import { useAuthors, useBooks, useCollections } from "@/features/books/hooks";
import { useUserShelves } from "@/features/community/hooks";
import { AllHighlightsDialog } from "@/features/dashboard/components/all-highlights-dialog";
import { AppDownloadDialog } from "@/features/dashboard/components/app-download-dialog";
import { AppSidebar } from "@/features/dashboard/components/app-sidebar";
import { CartDialog } from "@/features/dashboard/components/cart-dialog";
import { DashboardEvents } from "@/features/events/components/dashboard-events";
import { DashboardExplore } from "@/features/dashboard/components/dashboard-explore";
import { DashboardHome } from "@/features/dashboard/components/dashboard-home";
import { DashboardLibrary } from "@/features/dashboard/components/dashboard-library";
import { DashboardProfile } from "@/features/dashboard/components/dashboard-profile";
import { DashboardSettings } from "@/features/dashboard/components/dashboard-settings";
import { GiftVoucherDialog } from "@/features/dashboard/components/gift-voucher-dialog";
import { NotificationsDialog } from "@/features/dashboard/components/notifications-dialog";
import { QrProfileDialog } from "@/features/dashboard/components/qr-profile-dialog";
import { useMembershipSummary } from "@/features/membership/hooks";
import { HighlightStoryDialog } from "@/features/reader/components/highlight-story-dialog";
import { FlexReadingDialog } from "@/features/share/components/flex-reading-dialog";

export type AppTab =
  | "home"
  | "explore"
  | "events"
  | "library"
  | "profile"
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
      "events",
      "library",
      "profile",
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
    currentTabRaw === "shelves" ||
    currentTabRaw === "history" ||
    currentTabRaw === "share"
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
  const currentlyReading = shelves.find(
    (item) => item.shelfStatus === "reading",
  );

  // Sidebar collapse state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("anzabook_sidebar_collapsed") === "true";
  });

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("anzabook_sidebar_collapsed", String(next));
      return next;
    });
  };

  // Theme dark mode state: default is LIGHT!
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return false;
    const savedTheme = localStorage.getItem("anzabook-theme");
    return savedTheme === "dark";
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  const handleToggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      localStorage.setItem("anzabook-theme", next ? "dark" : "light");
      return next;
    });
  };

  // Dialog & header interaction states
  const [isVoucherOpen, setIsVoucherOpen] = useState(false);
  const [appDownloadPlatform, setAppDownloadPlatform] = useState<"android" | "ios" | null>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(5);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartCount] = useState(0);
  const [isQrProfileOpen, setIsQrProfileOpen] = useState(false);

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

  const handleTabChange = (tab: AppTab) => {
    navigate({
      to: "/app",
      search: { tab },
    });
  };

  const membershipTier =
    membership?.status === "active" ? "Nakama Member" : "Free User";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* 1. Left Collapsible Authentic Sidebar (Matching Screenshot) */}
      <AppSidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        user={user}
        membershipTier={membershipTier}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
        onOpenVoucher={() => setIsVoucherOpen(true)}
        onOpenAppDownload={(platform) => setAppDownloadPlatform(platform)}
        onOpenProfile={() => handleTabChange("profile")}
      />

      {/* 2. Main Content Canvas */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar per Screenshot */}
        <header className="sticky top-0 z-30 border-b border-border/80 bg-background/95 backdrop-blur-md px-6 py-3.5 flex items-center justify-between select-none">
          <div className="flex items-center gap-3">
            <img
              src="/icon.svg"
              alt="AnzaBook"
              className="size-6 rounded-[5px] object-contain md:hidden border border-border/40 shadow-xs"
            />
            <h1 className="font-serif text-xl sm:text-2xl font-bold">
              {activeTab === "home"
                ? "Home"
                : activeTab === "explore"
                  ? "Explore"
                  : activeTab === "events"
                    ? "Agenda"
                    : activeTab === "library"
                      ? "My Library"
                      : activeTab === "profile"
                        ? "Profil Saya"
                        : "Settings"}
            </h1>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            {/* Gift Voucher Quick Action */}
            <button
              type="button"
              onClick={() => setIsVoucherOpen(true)}
              className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring"
              title="Klaim Voucher Hadiah"
              aria-label="Klaim Voucher Hadiah"
            >
              <Gift className="size-5" />
            </button>

            {/* Notification Bell with Badge */}
            <button
              type="button"
              onClick={() => setIsNotificationsOpen(true)}
              className="relative p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring"
              title="Notifikasi"
              aria-label={`Notifikasi (${unreadCount} belum dibaca)`}
            >
              <Bell className="size-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 size-4 rounded-full bg-red-600 text-white text-[9px] font-bold font-mono flex items-center justify-center ring-2 ring-background">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Shopping Cart with Badge */}
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring"
              title="Keranjang Belanja"
              aria-label={`Keranjang belanja (${cartCount} item)`}
            >
              <ShoppingCart className="size-5" />
              <span className="absolute top-1 right-1 size-4 rounded-full bg-red-600 text-white text-[9px] font-bold font-mono flex items-center justify-center ring-2 ring-background">
                {cartCount}
              </span>
            </button>

            {/* Dark/Light Mode Moon Toggle */}
            <button
              type="button"
              onClick={handleToggleTheme}
              className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring"
              title={isDark ? "Ganti ke Mode Terang" : "Ganti ke Mode Gelap"}
              aria-label={isDark ? "Ganti ke Mode Terang" : "Ganti ke Mode Gelap"}
            >
              {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
            </button>
          </div>
        </header>

        {/* Main Tab Screen Switcher */}
        <main
          id="main-content"
          className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 pt-6 pb-24 md:pb-8"
        >
          {activeTab === "home" && membership?.status === "expired" && (
            <section
              aria-label="Keanggotaan Nakama"
              className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4"
            >
              <p className="text-sm">
                Masa aktif Nakama sudah berakhir. Perpanjang untuk melanjutkan
                buku Premium dari posisi terakhir.
              </p>
              <button
                type="button"
                onClick={() => handleTabChange("settings")}
                className="inline-flex min-h-11 items-center rounded-md px-2 text-sm font-semibold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
              >
                Perpanjang Nakama
              </button>
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

          {activeTab === "events" && <DashboardEvents />}

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

          {activeTab === "profile" && (
            <DashboardProfile
              isOwnProfile
              onNavigateSettings={() => handleTabChange("settings")}
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
              userImage={user.image}
              emailVerified={user.emailVerified}
              memberSince={
                typeof user.createdAt === "string"
                  ? user.createdAt
                  : user.createdAt.toISOString()
              }
            />
          )}
        </main>

        {/* Authentic Malaka Books Style Footer (with safe padding for mobile bottom bar) */}
        <div className="pb-20 md:pb-0">
          <SiteFooter />
        </div>
      </div>

      {/* 3. Mobile Bottom Navigation Bar (WCAG AA 44px+ touch targets) */}
      <nav
        aria-label="Navigasi Bawah Mobile"
        className="md:hidden fixed bottom-0 inset-x-0 bg-background/95 backdrop-blur-md border-t border-border z-40 flex items-center justify-around py-1.5 px-3 shadow-lg"
      >
        <button
          type="button"
          onClick={() => handleTabChange("home")}
          className={`flex flex-col items-center justify-center min-h-[48px] min-w-[56px] px-2 py-1 text-[11px] font-mono cursor-pointer rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-ring ${
            activeTab === "home"
              ? "text-[var(--color-accent)] font-bold bg-muted/40"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Home className="size-5" />
          <span>Home</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("explore")}
          className={`flex flex-col items-center justify-center min-h-[48px] min-w-[56px] px-2 py-1 text-[11px] font-mono cursor-pointer rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-ring ${
            activeTab === "explore"
              ? "text-[var(--color-accent)] font-bold bg-muted/40"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Search className="size-5" />
          <span>Explore</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("events")}
          className={`flex flex-col items-center justify-center min-h-[48px] min-w-[56px] px-2 py-1 text-[11px] font-mono cursor-pointer rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-ring ${
            activeTab === "events"
              ? "text-[var(--color-accent)] font-bold bg-muted/40"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Calendar className="size-5" />
          <span>Agenda</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("library")}
          className={`flex flex-col items-center justify-center min-h-[48px] min-w-[56px] px-2 py-1 text-[11px] font-mono cursor-pointer rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-ring ${
            activeTab === "library"
              ? "text-[var(--color-accent)] font-bold bg-muted/40"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Library className="size-5" />
          <span>Library</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("profile")}
          className={`flex flex-col items-center justify-center min-h-[48px] min-w-[56px] px-2 py-1 text-[11px] font-mono cursor-pointer rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-ring ${
            activeTab === "profile"
              ? "text-[var(--color-accent)] font-bold bg-muted/40"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <User className="size-5" />
          <span>Profile</span>
        </button>
      </nav>

      {/* Dialog: Gift Voucher */}
      <GiftVoucherDialog
        isOpen={isVoucherOpen}
        onClose={() => setIsVoucherOpen(false)}
        userName={user.name}
      />

      {/* Dialog: App Download (Android & iOS) */}
      <AppDownloadDialog
        isOpen={appDownloadPlatform !== null}
        platform={appDownloadPlatform}
        onClose={() => setAppDownloadPlatform(null)}
      />

      {/* Dialog: Notifications */}
      <NotificationsDialog
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        unreadCount={unreadCount}
        onMarkAllRead={() => setUnreadCount(0)}
      />

      {/* Dialog: Shopping Cart */}
      <CartDialog
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartCount={cartCount}
        onExplore={() => handleTabChange("explore")}
      />

      {/* Dialog: QR Profile Card */}
      <QrProfileDialog
        isOpen={isQrProfileOpen}
        onClose={() => setIsQrProfileOpen(false)}
        userName={user.name}
        userEmail={user.email}
        memberSince={
          typeof user.createdAt === "string"
            ? user.createdAt
            : user.createdAt.toISOString()
        }
      />

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
          onClose={() => setQuoteStoryState({ isOpen: false, highlight: null })}
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
