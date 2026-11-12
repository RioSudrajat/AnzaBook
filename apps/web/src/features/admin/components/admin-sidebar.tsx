import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Coins,
  FileCode,
  FileText,
  UserCheck,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { SidebarToggleIcon } from "@/features/dashboard/components/app-sidebar";

export type AdminTab =
  | "calendars"
  | "partners"
  | "manuscripts"
  | "claim-batches"
  | "financials"
  | "notes";

type AdminSidebarProps = {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  user: {
    id: string;
    name: string;
    email: string;
    role?: string | null;
    image?: string | null;
  };
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  pendingCounts?: {
    calendars: number;
    partners: number;
    manuscripts: number;
  };
};

export function AdminSidebar({
  activeTab,
  onTabChange,
  user,
  isCollapsed,
  onToggleCollapse,
  pendingCounts = { calendars: 0, partners: 0, manuscripts: 0 },
}: AdminSidebarProps) {
  const navItems = [
    {
      id: "calendars" as const,
      label: "Komunitas & Acara",
      icon: Calendar,
      badge: pendingCounts.calendars,
    },
    {
      id: "partners" as const,
      label: "Penulis & Penerbit",
      icon: UserCheck,
      badge: pendingCounts.partners,
    },
    {
      id: "manuscripts" as const,
      label: "Kurasi Naskah",
      icon: BookOpen,
      badge: pendingCounts.manuscripts,
    },
    {
      id: "claim-batches" as const,
      label: "Kode Klaim Phygital",
      icon: FileCode,
      badge: 0,
    },
    {
      id: "financials" as const,
      label: "Keuangan & Royalti",
      icon: Coins,
      badge: 0,
    },
    {
      id: "notes" as const,
      label: "Catatan Sistem",
      icon: FileText,
      badge: 0,
    },
  ];

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
      {/* Top Section: Logo & Navigation */}
      <div className="flex flex-col gap-6 w-full">
        {/* Header: Logo & Collapse Button */}
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
                <Link
                  to="/admin"
                  className="flex items-center gap-2.5 group cursor-pointer focus-visible:outline-2 focus-visible:outline-ring rounded-lg p-1 min-w-0"
                  title="Studio Redaksi AnzaBook"
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
                      Studio Redaksi
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
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  className="size-11 rounded-xl bg-muted/50 dark:bg-zinc-800/80 hover:bg-muted text-foreground transition-all duration-200 cursor-pointer border border-border/50 relative flex items-center justify-center group"
                  title="Buka Sidebar"
                  aria-label="Buka Sidebar"
                >
                  <img
                    src="/icon.svg"
                    alt="AnzaBook"
                    className="size-7 rounded-[6px] object-contain shadow-xs transition-all duration-200 group-hover:opacity-0 group-hover:scale-75 group-focus-visible:opacity-0 group-focus-visible:scale-75 absolute pointer-events-none"
                  />
                  <div className="opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 group-focus-visible:opacity-100 group-focus-visible:scale-100 transition-all duration-200 flex items-center justify-center text-foreground">
                    <SidebarToggleIcon className="size-5" />
                  </div>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Menu Navigation */}
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
                Menu Redaksi
              </motion.p>
            )}
          </AnimatePresence>

          <nav className="flex flex-col gap-1 w-full" aria-label="Menu Admin">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onTabChange(item.id)}
                  className={`flex items-center gap-3.5 rounded-xl transition-all cursor-pointer ${
                    isCollapsed
                      ? "size-11 justify-center mx-auto relative"
                      : "px-3.5 py-2.5 text-sm w-full text-left justify-between"
                  } ${
                    isActive
                      ? "bg-neutral-900 dark:bg-zinc-800 text-white font-medium shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  }`}
                  title={item.label}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <Icon className="size-5 shrink-0" />
                    <AnimatePresence initial={false}>
                      {!isCollapsed && (
                        <motion.span
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -6 }}
                          transition={{ duration: 0.15 }}
                          className="truncate whitespace-nowrap"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>

                  {item.badge > 0 && (
                    <AnimatePresence initial={false}>
                      {!isCollapsed ? (
                        <motion.span
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                            isActive
                              ? "bg-white/20 text-white"
                              : "bg-muted text-foreground border border-border/60"
                          }`}
                        >
                          {item.badge}
                        </motion.span>
                      ) : (
                        <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-[var(--color-accent)] ring-2 ring-card" />
                      )}
                    </AnimatePresence>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Bottom Section: Back to Reader App & User Profile */}
      <div className="flex flex-col gap-3 w-full">
        {/* Back to App Link */}
        <Link
          to="/app"
          className={`flex items-center gap-3 rounded-xl border border-border/80 bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer ${
            isCollapsed
              ? "size-11 justify-center mx-auto p-0"
              : "px-3.5 py-2 text-xs font-semibold w-full text-left"
          }`}
          title="Kembali ke Aplikasi Pembaca"
        >
          <ArrowLeft className="size-4 shrink-0" />
          <AnimatePresence initial={false}>
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.15 }}
                className="truncate whitespace-nowrap"
              >
                Aplikasi Pembaca
              </motion.span>
            )}
          </AnimatePresence>
        </Link>

        {/* Hairline Divider before profile in collapsed mode */}
        {isCollapsed && (
          <div className="w-9 h-px bg-border/80 my-1 mx-auto" />
        )}

        {/* User Profile Card */}
        <div
          className={`flex items-center gap-3 rounded-xl text-left ${
            isCollapsed
              ? "size-11 justify-center mx-auto p-0"
              : "p-2 w-full bg-muted/30 border border-border/50"
          }`}
          title={`Masuk sebagai Administrator: ${user.name}`}
        >
          <div className="size-9 rounded-full bg-neutral-900 dark:bg-zinc-800 border border-border/80 flex items-center justify-center font-bold text-xs text-white shrink-0 overflow-hidden ring-1 ring-border/40">
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
                <div className="flex items-center justify-between gap-1">
                  <p className="text-xs font-semibold text-foreground truncate whitespace-nowrap">
                    {user.name}
                  </p>
                  <span className="font-mono text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-muted border border-border/60 text-muted-foreground">
                    Admin
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground truncate whitespace-nowrap">
                  {user.email}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  );
}
