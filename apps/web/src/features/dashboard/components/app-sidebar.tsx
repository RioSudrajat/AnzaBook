import { Link } from "@tanstack/react-router";
import {
  Calendar,
  Home,
  Library,
  Sailboat,
  Search,
  Settings,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

export type AppTab = "home" | "explore" | "events" | "library" | "settings";

type AppSidebarProps = {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  user: {
    name: string;
    email: string;
    role?: string | null;
    image?: string | null;
  };
  membershipTier?: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenVoucher: () => void;
  onOpenAppDownload: (platform: "android" | "ios") => void;
  onOpenProfile: () => void;
};

// Exact replica of the collapse/sidebar toggle icon from screenshot
export function SidebarToggleIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <line x1="8.5" y1="3" x2="8.5" y2="21" />
      <line x1="5.5" y1="8" x2="6.5" y2="8" strokeWidth="2" />
      <line x1="5.5" y1="12" x2="6.5" y2="12" strokeWidth="2" />
      <line x1="5.5" y1="16" x2="6.5" y2="16" strokeWidth="2" />
    </svg>
  );
}

// 3D Gift Box Icon matching the screenshot
function GiftBoxIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3" y="10" width="18" height="11" rx="2" fill="#F59E0B" />
      <rect x="2" y="6" width="20" height="4" rx="1.5" fill="#D97706" />
      <rect x="10.5" y="6" width="3" height="15" fill="#EF4444" />
      <path
        d="M12 6C10 4 7 3.5 7 5.5C7 7.5 11 6.5 12 6Z"
        fill="#DC2626"
      />
      <path
        d="M12 6C14 4 17 3.5 17 5.5C17 7.5 13 6.5 12 6Z"
        fill="#DC2626"
      />
    </svg>
  );
}

export function AppSidebar({
  activeTab,
  onTabChange,
  user,
  membershipTier = "Free User",
  isCollapsed,
  onToggleCollapse,
  onOpenVoucher,
  onOpenAppDownload,
  onOpenProfile,
}: AppSidebarProps) {
  return (
    <motion.aside
      initial={false}
      animate={{
        width: isCollapsed ? 72 : 245,
      }}
      transition={{
        duration: 0.28,
        ease: [0.25, 1, 0.5, 1],
      }}
      className={`hidden md:flex shrink-0 border-r border-border/80 bg-card/95 backdrop-blur-md flex-col justify-between py-5 sticky top-0 h-screen z-40 select-none overflow-hidden ${
        isCollapsed ? "px-2.5 items-center" : "px-3.5"
      }`}
    >
      {/* Top Section: Logo & Nav */}
      <div className="flex flex-col gap-6 w-full">
        {/* Header: AnzaBook Logo & Collapse Toggle */}
        <div className="min-h-10 flex items-center w-full">
          <AnimatePresence initial={false} mode="wait">
            {!isCollapsed ? (
              <motion.div
                key="expanded-header"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex items-center justify-between w-full"
              >
                {/* AnzaBook Official Brand Logo */}
                <Link
                  to="/app"
                  search={{ tab: "home" }}
                  onClick={() => onTabChange("home")}
                  className="flex items-center gap-2.5 group cursor-pointer focus-visible:outline-2 focus-visible:outline-ring rounded-lg p-1 min-w-0"
                  title="AnzaBook"
                >
                  <img
                    src="/icon.svg"
                    alt="AnzaBook"
                    className="size-8 rounded-[7px] object-contain shadow-xs border border-border/40 shrink-0 transition-transform group-hover:scale-105"
                  />
                  <div className="flex flex-col items-start leading-tight min-w-0">
                    <span className="font-serif font-bold tracking-tight text-base text-foreground truncate">
                      AnzaBook
                    </span>
                    <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground truncate">
                      Pustaka Digital
                    </span>
                  </div>
                </Link>

                {/* Collapse Button */}
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  className="p-2 rounded-xl bg-muted/60 dark:bg-zinc-800/80 hover:bg-muted text-foreground transition-colors cursor-pointer border border-border/40 shrink-0"
                  title="Tutup Sidebar"
                  aria-label="Tutup Sidebar"
                >
                  <SidebarToggleIcon className="size-5" />
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="collapsed-header"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex justify-center w-full"
              >
                {/* Collapsed Top: Logo by default, Toggle Icon on hover */}
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  className="size-11 rounded-xl bg-muted/50 dark:bg-zinc-800/80 hover:bg-muted text-foreground transition-all duration-200 cursor-pointer border border-border/50 relative flex items-center justify-center group"
                  title="Buka Sidebar"
                  aria-label="Buka Sidebar"
                >
                  {/* Default State: AnzaBook Logo */}
                  <img
                    src="/icon.svg"
                    alt="AnzaBook"
                    className="size-7 rounded-[6px] object-contain shadow-xs transition-all duration-200 group-hover:opacity-0 group-hover:scale-75 group-focus-visible:opacity-0 group-focus-visible:scale-75 absolute pointer-events-none"
                  />
                  {/* Hover State: Sidebar Toggle Icon */}
                  <div className="opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 group-focus-visible:opacity-100 group-focus-visible:scale-100 transition-all duration-200 flex items-center justify-center text-foreground">
                    <SidebarToggleIcon className="size-5" />
                  </div>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation Menu */}
        <div className="space-y-1 w-full">
          <AnimatePresence initial={false}>
            {!isCollapsed && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15 }}
                className="px-3 text-xs font-medium text-muted-foreground/80 mb-2 overflow-hidden"
              >
                Menu
              </motion.p>
            )}
          </AnimatePresence>

          <nav className="flex flex-col gap-1 w-full" aria-label="Menu Utama">
            {/* Home */}
            <button
              type="button"
              onClick={() => onTabChange("home")}
              className={`flex items-center gap-3.5 rounded-xl transition-all cursor-pointer ${
                isCollapsed
                  ? "size-11 justify-center mx-auto"
                  : "px-3.5 py-2.5 text-sm w-full text-left"
              } ${
                activeTab === "home"
                  ? "bg-neutral-900 dark:bg-zinc-800 text-white font-medium shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
              title="Home"
            >
              <Home className="size-5 shrink-0" />
              <AnimatePresence initial={false}>
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -6 }}
                    transition={{ duration: 0.15 }}
                    className="truncate whitespace-nowrap"
                  >
                    Home
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            {/* Explore */}
            <button
              type="button"
              onClick={() => onTabChange("explore")}
              className={`flex items-center gap-3.5 rounded-xl transition-all cursor-pointer ${
                isCollapsed
                  ? "size-11 justify-center mx-auto"
                  : "px-3.5 py-2.5 text-sm w-full text-left"
              } ${
                activeTab === "explore"
                  ? "bg-neutral-900 dark:bg-zinc-800 text-white font-medium shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
              title="Explore"
            >
              <Search className="size-5 shrink-0" />
              <AnimatePresence initial={false}>
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -6 }}
                    transition={{ duration: 0.15 }}
                    className="truncate whitespace-nowrap"
                  >
                    Explore
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            {/* Agenda (Komunitas & Event) */}
            <button
              type="button"
              onClick={() => onTabChange("events")}
              className={`flex items-center gap-3.5 rounded-xl transition-all cursor-pointer ${
                isCollapsed
                  ? "size-11 justify-center mx-auto"
                  : "px-3.5 py-2.5 text-sm w-full text-left"
              } ${
                activeTab === "events"
                  ? "bg-neutral-900 dark:bg-zinc-800 text-white font-medium shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
              title="Agenda"
            >
              <Calendar className="size-5 shrink-0" />
              <AnimatePresence initial={false}>
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -6 }}
                    transition={{ duration: 0.15 }}
                    className="truncate whitespace-nowrap"
                  >
                    Agenda
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            {/* Library */}
            <button
              type="button"
              onClick={() => onTabChange("library")}
              className={`flex items-center gap-3.5 rounded-xl transition-all cursor-pointer ${
                isCollapsed
                  ? "size-11 justify-center mx-auto"
                  : "px-3.5 py-2.5 text-sm w-full text-left"
              } ${
                activeTab === "library"
                  ? "bg-neutral-900 dark:bg-zinc-800 text-white font-medium shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
              title="Library"
            >
              <Library className="size-5 shrink-0" />
              <AnimatePresence initial={false}>
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -6 }}
                    transition={{ duration: 0.15 }}
                    className="truncate whitespace-nowrap"
                  >
                    Library
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            {/* Settings */}
            <button
              type="button"
              onClick={() => onTabChange("settings")}
              className={`flex items-center gap-3.5 rounded-xl transition-all cursor-pointer ${
                isCollapsed
                  ? "size-11 justify-center mx-auto"
                  : "px-3.5 py-2.5 text-sm w-full text-left"
              } ${
                activeTab === "settings"
                  ? "bg-neutral-900 dark:bg-zinc-800 text-white font-medium shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
              title="Settings"
            >
              <Settings className="size-5 shrink-0" />
              <AnimatePresence initial={false}>
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -6 }}
                    transition={{ duration: 0.15 }}
                    className="truncate whitespace-nowrap"
                  >
                    Settings
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </nav>
        </div>
      </div>

      {/* Bottom Section: Sailboat Membership, 3D Gift, Mobile Apps, User Profile */}
      <div className="flex flex-col gap-2.5 pt-3 w-full">
        {/* Iuran Keanggotaan (Sailboat Icon) */}
        <Link
          to="/membership"
          search={{}}
          className={`flex items-center gap-3 rounded-xl border border-border/70 dark:border-zinc-800/80 bg-muted/30 hover:bg-muted/70 text-foreground transition-all cursor-pointer ${
            isCollapsed
              ? "size-11 justify-center mx-auto p-0"
              : "px-3.5 py-2.5 text-xs font-medium w-full text-left"
          }`}
          title="Iuran Keanggotaan"
        >
          <Sailboat className="size-4 shrink-0 text-foreground" />
          <AnimatePresence initial={false}>
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.15 }}
                className="truncate whitespace-nowrap"
              >
                Iuran Keanggotaan
              </motion.span>
            )}
          </AnimatePresence>
        </Link>

        {/* Hadiahkan Gift Voucher (3D Gift Icon) */}
        <button
          type="button"
          onClick={onOpenVoucher}
          className={`flex items-center gap-3 rounded-xl border border-border/70 dark:border-zinc-800/80 bg-muted/30 hover:bg-muted/70 text-foreground transition-all cursor-pointer ${
            isCollapsed
              ? "size-11 justify-center mx-auto p-0"
              : "px-3.5 py-2.5 text-xs font-medium w-full text-left"
          }`}
          title="Hadiahkan Gift Voucher"
        >
          <GiftBoxIcon className="size-4 shrink-0" />
          <AnimatePresence initial={false}>
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.15 }}
                className="truncate whitespace-nowrap"
              >
                Hadiahkan Gift Voucher
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* Mobile App Download: Android & iOS */}
        <AnimatePresence initial={false} mode="wait">
          {!isCollapsed ? (
            <motion.div
              key="expanded-apps"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-2"
            >
              <button
                type="button"
                onClick={() => onOpenAppDownload("android")}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-muted/30 hover:bg-muted/70 text-foreground text-xs font-medium transition-colors cursor-pointer border border-border/70 dark:border-zinc-800/80"
                title="Unduh untuk Android"
              >
                <svg className="size-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-1.0003s.4482-1.0003.9993-1.0003c.552 0 .9993.4486.9993 1.0003s-.4473 1.0003-.9993 1.0003m-11.046 0c-.5511 0-.9993-.4486-.9993-1.0003s.4482-1.0003.9993-1.0003c.5511 0 .9993.4486.9993 1.0003s-.4482 1.0003-.9993 1.0003m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.4116 13.8533 8.125 12 8.125c-1.854 0-3.5906.2866-5.1368.8247L4.841 5.4467a.416.416 0 00-.5676-.1521.416.416 0 00-.1521.5676l1.9973 3.4592C2.6889 10.9658.3344 14.773.3344 19.167h23.3312c0-4.394-2.3545-8.2012-5.7836-9.8456" />
                </svg>
                <span>Android</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenAppDownload("ios")}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-muted/30 hover:bg-muted/70 text-foreground text-xs font-medium transition-colors cursor-pointer border border-border/70 dark:border-zinc-800/80"
                title="Unduh untuk iOS"
              >
                <svg className="size-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.63-.77 1.06-1.84.94-2.91-.91.04-2.02.61-2.67 1.38-.58.67-1.09 1.77-.95 2.82 1.02.08 2.06-.52 2.68-1.29z" />
                </svg>
                <span>iOS</span>
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="collapsed-apps"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col gap-2.5 w-full items-center"
            >
              <button
                type="button"
                onClick={() => onOpenAppDownload("android")}
                className="size-11 rounded-xl flex items-center justify-center text-foreground bg-muted/30 hover:bg-muted/70 transition-colors cursor-pointer border border-border/70 dark:border-zinc-800/80"
                title="Unduh untuk Android"
              >
                <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-1.0003s.4482-1.0003.9993-1.0003c.552 0 .9993.4486.9993 1.0003s-.4473 1.0003-.9993 1.0003m-11.046 0c-.5511 0-.9993-.4486-.9993-1.0003s.4482-1.0003.9993-1.0003c.5511 0 .9993.4486.9993 1.0003s-.4482 1.0003-.9993 1.0003m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.4116 13.8533 8.125 12 8.125c-1.854 0-3.5906.2866-5.1368.8247L4.841 5.4467a.416.416 0 00-.5676-.1521.416.416 0 00-.1521.5676l1.9973 3.4592C2.6889 10.9658.3344 14.773.3344 19.167h23.3312c0-4.394-2.3545-8.2012-5.7836-9.8456" />
                </svg>
              </button>

              <button
                type="button"
                onClick={() => onOpenAppDownload("ios")}
                className="size-11 rounded-xl flex items-center justify-center text-foreground bg-muted/30 hover:bg-muted/70 transition-colors cursor-pointer border border-border/70 dark:border-zinc-800/80"
                title="Unduh untuk iOS"
              >
                <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.63-.77 1.06-1.84.94-2.91-.91.04-2.02.61-2.67 1.38-.58.67-1.09 1.77-.95 2.82 1.02.08 2.06-.52 2.68-1.29z" />
                </svg>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hairline Divider before profile in collapsed mode */}
        {isCollapsed && (
          <div className="w-9 h-px bg-border/80 my-1 mx-auto" />
        )}

        {/* User Profile Card */}
        <button
          type="button"
          onClick={onOpenProfile}
          className={`flex items-center gap-3 rounded-xl transition-all cursor-pointer hover:bg-muted/70 text-left ${
            isCollapsed
              ? "size-11 justify-center mx-auto p-0"
              : "p-2 w-full"
          }`}
          title={`Profil ${user.name}`}
        >
          <div className="size-9 rounded-full bg-zinc-700/60 border border-border/80 flex items-center justify-center font-bold text-xs text-foreground shrink-0 overflow-hidden ring-1 ring-border/40">
            {user.image ? (
              <img
                src={user.image}
                alt={user.name}
                className="size-full object-cover"
              />
            ) : (
              <span>{user.name.slice(0, 1).toUpperCase()}</span>
            )}
          </div>

          <AnimatePresence initial={false}>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.15 }}
                className="min-w-0 flex-1"
              >
                <p className="text-xs font-semibold text-foreground truncate whitespace-nowrap">
                  {user.name}
                </p>
                <p className="text-[11px] text-muted-foreground truncate whitespace-nowrap">
                  {membershipTier}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>
  );
}
