import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BookMarked,
  BookOpen,
  Calculator,
  Calendar,
  Clock,
  Compass,
  Flame,
  Gauge,
  History,
  Library,
  Share2,
  Sparkles,
} from "lucide-react";
import { z } from "zod";
import type { ShelfStatus } from "@starter/shared/types";
import { siteConfig } from "@/config/site";
import { Button } from "@/components/ui/button";
import {
  useReadingSessions,
  useUserShelves,
} from "@/features/community/hooks";
import { PublisherStudioPanel } from "@/features/publisher/components/publisher-studio-panel";
import { ShareStudioPanel } from "@/features/share/components/share-studio-panel";

const appSearchSchema = z.object({
  tab: z.enum(["shelves", "history", "share", "publisher"]).optional(),
});

export const Route = createFileRoute("/_protected/app")({
  validateSearch: appSearchSchema,
  head: () => ({ meta: [{ title: `Pusat Baca & Studio | ${siteConfig.name}` }] }),
  component: AppPage,
});

function AppPage() {
  const { user } = Route.useRouteContext().session;
  const search = Route.useSearch();
  const [activeTab, setActiveTab] = useState<
    "shelves" | "history" | "share" | "publisher"
  >(search.tab || "shelves");
  const [shelfFilter, setShelfFilter] = useState<"all" | ShelfStatus>("all");

  const { data: shelves = [] } = useUserShelves();
  const { data: sessionData } = useReadingSessions();

  const sessions = sessionData?.data || [];
  const telemetry = sessionData?.summary || {
    totalMinutesRead: 0,
    totalPagesRead: 0,
    currentStreakDays: 0,
    booksCompleted: 0,
    avgWpm: 0,
  };

  const filteredShelves =
    shelfFilter === "all"
      ? shelves
      : shelves.filter((s) => s.shelfStatus === shelfFilter);

  return (
    <div className="space-y-8 pb-16">
      {/* User Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[var(--color-accent)] font-semibold">
            <Sparkles className="size-3.5" />
            <span>Pustaka Pembaca Berdaulat</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-1">
            Selamat Datang, {user.name}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 font-sans">
            Kelola rak buku pribadi, pantau kecepatan membaca, dan ciptakan stiker literasi.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="outline" className="font-mono text-xs gap-1.5">
            <Link to="/">
              <Compass className="size-3.5" />
              Jelajahi Katalog Buku
            </Link>
          </Button>
        </div>
      </div>

      {/* Reading Telemetry Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-[8px] bg-background border border-border shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-mono uppercase tracking-wider">
              Total Waktu Baca
            </span>
            <Clock className="size-4 text-[var(--color-accent)]" />
          </div>
          <div className="mt-2 font-mono text-xl sm:text-2xl font-bold text-foreground">
            {telemetry.totalMinutesRead} <span className="text-xs font-normal text-muted-foreground">Menit</span>
          </div>
        </div>

        <div className="p-4 rounded-[8px] bg-background border border-border shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-mono uppercase tracking-wider">
              Halaman Selesai
            </span>
            <BookOpen className="size-4 text-emerald-600" />
          </div>
          <div className="mt-2 font-mono text-xl sm:text-2xl font-bold text-foreground">
            {telemetry.totalPagesRead} <span className="text-xs font-normal text-muted-foreground">Hal</span>
          </div>
        </div>

        <div className="p-4 rounded-[8px] bg-background border border-border shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-mono uppercase tracking-wider">
              Rata-Rata WPM
            </span>
            <Gauge className="size-4 text-amber-500" />
          </div>
          <div className="mt-2 font-mono text-xl sm:text-2xl font-bold text-foreground">
            {telemetry.avgWpm} <span className="text-xs font-normal text-muted-foreground">WPM</span>
          </div>
        </div>

        <div className="p-4 rounded-[8px] bg-background border border-border shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-mono uppercase tracking-wider">
              Streak Aktif
            </span>
            <Flame className="size-4 text-orange-500" />
          </div>
          <div className="mt-2 font-mono text-xl sm:text-2xl font-bold text-foreground flex items-center gap-1.5">
            <span>{telemetry.currentStreakDays}</span>
            <span className="text-xs font-normal text-muted-foreground">Hari</span>
          </div>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="border-b border-border">
        <nav className="flex space-x-6 text-sm font-sans" aria-label="Tabs Ruang Kerja">
          <button
            type="button"
            onClick={() => setActiveTab("shelves")}
            className={`pb-3 font-medium transition-all flex items-center gap-2 cursor-pointer border-b-2 ${
              activeTab === "shelves"
                ? "border-[var(--color-accent)] text-foreground font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Library className="size-4" />
            <span>Rak Buku Saya ({shelves.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`pb-3 font-medium transition-all flex items-center gap-2 cursor-pointer border-b-2 ${
              activeTab === "history"
                ? "border-[var(--color-accent)] text-foreground font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <History className="size-4" />
            <span>Riwayat Sesi ({sessions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("share")}
            className={`pb-3 font-medium transition-all flex items-center gap-2 cursor-pointer border-b-2 ${
              activeTab === "share"
                ? "border-[var(--color-accent)] text-foreground font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Share2 className="size-4 text-[var(--color-accent)]" />
            <span>Studio Strava Literasi</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("publisher")}
            className={`pb-3 font-medium transition-all flex items-center gap-2 cursor-pointer border-b-2 ${
              activeTab === "publisher"
                ? "border-[var(--color-accent)] text-foreground font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Calculator className="size-4 text-emerald-600" />
            <span>Studio Penerbit HPP</span>
          </button>
        </nav>
      </div>

      {/* Tab 1: Rak Buku Saya */}
      {activeTab === "shelves" && (
        <section aria-labelledby="shelves-heading" className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="shelves-heading" className="font-serif text-lg font-bold text-foreground">
              Daftar Buku Koleksi Anda
            </h2>

            {/* Filter buttons */}
            <div className="flex items-center gap-1.5 text-xs font-mono">
              {(
                [
                  { label: "Semua", value: "all" },
                  { label: "Sedang Dibaca", value: "reading" },
                  { label: "Ingin Dibaca", value: "want_to_read" },
                  { label: "Selesai", value: "finished" },
                ] as const
              ).map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setShelfFilter(f.value)}
                  className={`px-2.5 py-1 rounded-[4px] transition-all cursor-pointer ${
                    shelfFilter === f.value
                      ? "bg-foreground text-background font-bold shadow-xs"
                      : "bg-muted/40 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {filteredShelves.length === 0 ? (
            <div className="py-16 text-center bg-muted/20 border border-dashed border-border rounded-[10px] p-8">
              <BookMarked className="size-10 text-muted-foreground/60 mx-auto mb-3" />
              <h3 className="font-serif font-bold text-base text-foreground">
                Belum Ada Buku di Kategori Ini
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                Jelajahi karya sastra klasik dan pemikiran dunia di katalog, lalu simpan ke rak baca Anda.
              </p>
              <Button asChild size="sm">
                <Link to="/">Buka Katalog Buku</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredShelves.map((item) => (
                <div
                  key={item.id}
                  className="bg-card border border-border rounded-[8px] p-4 flex gap-4 hover:shadow-sm transition-all"
                >
                  <div
                    className="w-16 h-24 rounded-[2px_4px_4px_2px] shadow-sm flex flex-col justify-between p-2 shrink-0 text-white"
                    style={{ backgroundColor: item.book.coverColor || "#1E1A17" }}
                  >
                    <span className="text-[8px] font-mono opacity-80">
                      {item.book.publishedYear}
                    </span>
                    <span className="font-serif font-bold text-[9px] line-clamp-2 leading-tight">
                      {item.book.title}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 bg-muted rounded-[3px] text-muted-foreground">
                        {item.shelfStatus === "reading"
                          ? "Sedang Dibaca"
                          : item.shelfStatus === "want_to_read"
                            ? "Ingin Dibaca"
                            : "Selesai"}
                      </span>
                      <h4 className="font-serif font-bold text-sm text-foreground truncate mt-1">
                        {item.book.title}
                      </h4>
                      <p className="text-xs text-muted-foreground truncate">
                        {item.book.author}
                      </p>
                    </div>

                    <div className="pt-2 flex items-center justify-between border-t border-border/50 text-xs">
                      <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-xs">
                        <Link to="/read/$slug" params={{ slug: item.book.slug }}>
                          <BookOpen className="size-3 mr-1" />
                          Baca
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="outline" className="h-7 px-2 text-xs">
                        <Link to="/books/$slug" params={{ slug: item.book.slug }}>
                          Detail
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Tab 2: Riwayat Sesi Baca */}
      {activeTab === "history" && (
        <section aria-labelledby="history-heading" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 id="history-heading" className="font-serif text-lg font-bold text-foreground">
              Catatan Sesi & Telemetri
            </h2>
            <span className="text-xs font-mono text-muted-foreground">
              Total {sessions.length} sesi terekam
            </span>
          </div>

          {sessions.length === 0 ? (
            <div className="py-12 text-center bg-muted/20 border border-dashed border-border rounded-[8px] p-6 text-muted-foreground">
              <Calendar className="size-8 mx-auto mb-2 opacity-60" />
              <p className="text-xs font-sans">
                Belum ada rekaman sesi baca. Mulai membaca buku untuk mencatat kecepatan WPM dan durasi.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto bg-card border border-border rounded-[8px]">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground font-mono uppercase text-[10px]">
                    <th className="py-2.5 px-4">Buku & Mode</th>
                    <th className="py-2.5 px-4">Durasi</th>
                    <th className="py-2.5 px-4">Halaman</th>
                    <th className="py-2.5 px-4">Kecepatan</th>
                    <th className="py-2.5 px-4 text-right">Waktu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 font-sans">
                  {sessions.map((s) => (
                    <tr key={s.id} className="hover:bg-muted/30">
                      <td className="py-3 px-4 font-semibold text-foreground">
                        <div>{s.bookTitle}</div>
                        <span className="text-[10px] font-mono text-muted-foreground uppercase">
                          {s.mode === "blueprint" ? "Intisari 20 Mnt" : "Teks Lengkap"}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-muted-foreground">
                        {Math.round(s.durationSeconds / 60)} Menit
                      </td>
                      <td className="py-3 px-4 font-mono text-muted-foreground">
                        {s.pagesRead} Hal
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-[var(--color-accent)]">
                        {s.avgWpm} WPM
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-muted-foreground text-[11px]">
                        {new Date(s.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Tab 3: Studio Strava Literasi */}
      {activeTab === "share" && (
        <section aria-labelledby="share-studio-heading">
          <ShareStudioPanel
            userName={user.name}
            recentSessions={sessions}
          />
        </section>
      )}

      {/* Tab 4: Studio Penerbit HPP */}
      {activeTab === "publisher" && (
        <section aria-labelledby="publisher-studio-heading">
          <PublisherStudioPanel />
        </section>
      )}
    </div>
  );
}
