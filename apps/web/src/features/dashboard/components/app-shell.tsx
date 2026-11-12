import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Bell,
  Calendar,
  Gift,
  Home,
  Library,
  Moon,
  Search,
  ShoppingCart,
  Sun,
  User,
} from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { AppDownloadDialog } from "@/features/dashboard/components/app-download-dialog";
import {
  AppSidebar,
  type AppTab as SidebarTab,
} from "@/features/dashboard/components/app-sidebar";
import { CartDialog } from "@/features/dashboard/components/cart-dialog";
import { GiftVoucherDialog } from "@/features/dashboard/components/gift-voucher-dialog";
import { NotificationsDialog } from "@/features/dashboard/components/notifications-dialog";
import { useMembershipSummary } from "@/features/membership/hooks";

type ShellUser = {
  name: string;
  email: string;
  role?: string | null;
  image?: string | null;
};

type AppShellProps = {
  user: ShellUser;
  activeTab: SidebarTab;
  title: string;
  children: ReactNode;
  /** Page content width; detail pages read better a bit narrower. */
  wide?: boolean;
};

const MOBILE_TABS: { tab: SidebarTab; label: string; icon: typeof Home }[] = [
  { tab: "home", label: "Home", icon: Home },
  { tab: "explore", label: "Explore", icon: Search },
  { tab: "events", label: "Agenda", icon: Calendar },
  { tab: "library", label: "Library", icon: Library },
  { tab: "profile", label: "Profile", icon: User },
];

export function AppShell({
  user,
  activeTab,
  title,
  children,
  wide = false,
}: AppShellProps) {
  const navigate = useNavigate();
  const { data: membership } = useMembershipSummary();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("anzabook_sidebar_collapsed") === "true";
  });
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("anzabook-theme") === "dark";
  });
  const [isVoucherOpen, setIsVoucherOpen] = useState(false);
  const [appDownloadPlatform, setAppDownloadPlatform] = useState<
    "android" | "ios" | null
  >(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(5);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const cartCount = 0;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("anzabook_sidebar_collapsed", String(next));
      return next;
    });
  };

  const handleToggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      localStorage.setItem("anzabook-theme", next ? "dark" : "light");
      return next;
    });
  };

  const handleTabChange = (tab: SidebarTab) => {
    void navigate({ to: "/app", search: { tab } });
  };

  const membershipTier =
    membership?.status === "active" ? "Nakama Member" : "Free User";

  const iconButton =
    "p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
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

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 border-b border-border/80 bg-background/95 backdrop-blur-md px-6 py-3.5 flex items-center justify-between select-none">
          <div className="flex items-center gap-3">
            <img
              src="/icon.svg"
              alt="AnzaBook"
              className="size-6 rounded-[5px] object-contain md:hidden border border-border/40 shadow-xs"
            />
            <h1 className="font-serif text-xl sm:text-2xl font-bold">
              {title}
            </h1>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => setIsVoucherOpen(true)}
              className={iconButton}
              title="Klaim Voucher Hadiah"
              aria-label="Klaim Voucher Hadiah"
            >
              <Gift className="size-5" />
            </button>

            <button
              type="button"
              onClick={() => setIsNotificationsOpen(true)}
              className={`relative ${iconButton}`}
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

            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className={`relative ${iconButton}`}
              title="Keranjang Belanja"
              aria-label={`Keranjang belanja (${cartCount} item)`}
            >
              <ShoppingCart className="size-5" />
              <span className="absolute top-1 right-1 size-4 rounded-full bg-red-600 text-white text-[9px] font-bold font-mono flex items-center justify-center ring-2 ring-background">
                {cartCount}
              </span>
            </button>

            <button
              type="button"
              onClick={handleToggleTheme}
              className={iconButton}
              title={isDark ? "Ganti ke Mode Terang" : "Ganti ke Mode Gelap"}
              aria-label={
                isDark ? "Ganti ke Mode Terang" : "Ganti ke Mode Gelap"
              }
            >
              {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
            </button>
          </div>
        </header>

        <main
          id="main-content"
          className={`flex-1 w-full mx-auto px-4 sm:px-8 pt-6 pb-24 md:pb-8 ${
            wide ? "max-w-6xl" : "max-w-5xl"
          }`}
        >
          {children}
        </main>

        <div className="pb-20 md:pb-0">
          <SiteFooter />
        </div>
      </div>

      <nav
        aria-label="Navigasi Bawah Mobile"
        className="md:hidden fixed bottom-0 inset-x-0 bg-background/95 backdrop-blur-md border-t border-border z-40 flex items-center justify-around py-1.5 px-3 shadow-lg"
      >
        {MOBILE_TABS.map(({ tab, label, icon: Icon }) => (
          <button
            key={tab}
            type="button"
            onClick={() => handleTabChange(tab)}
            aria-current={activeTab === tab ? "page" : undefined}
            className={`flex flex-col items-center justify-center min-h-[48px] min-w-[56px] px-2 py-1 text-[11px] font-mono cursor-pointer rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-ring ${
              activeTab === tab
                ? "text-[var(--color-accent)] font-bold bg-muted/40"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="size-5" />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <GiftVoucherDialog
        isOpen={isVoucherOpen}
        onClose={() => setIsVoucherOpen(false)}
        userName={user.name}
      />
      <AppDownloadDialog
        isOpen={appDownloadPlatform !== null}
        platform={appDownloadPlatform}
        onClose={() => setAppDownloadPlatform(null)}
      />
      <NotificationsDialog
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        unreadCount={unreadCount}
        onMarkAllRead={() => setUnreadCount(0)}
      />
      <CartDialog
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartCount={cartCount}
        onExplore={() => handleTabChange("explore")}
      />
    </div>
  );
}
