import { useState, type FormEvent } from "react";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  LogOut,
  QrCode,
} from "lucide-react";
import { membershipUsernameSchema } from "@starter/shared/validators/membership";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useMembershipOrders,
  useMembershipSummary,
  useSaveMembershipReminders,
  useSaveMembershipUsername,
} from "@/features/membership/hooks";
import {
  formatMembershipDate,
  formatRupiah,
  orderStatusLabel,
} from "@/features/membership/presentation";
import { ApiError } from "@/lib/api/client";
import { authClient } from "@/lib/auth-client";
import { QrProfileDialog } from "./qr-profile-dialog";

type DashboardSettingsProps = {
  userName: string;
  userEmail: string;
  userRole?: string;
  memberSince?: string;
  emailVerified?: boolean;
};

export function DashboardSettings({
  userName,
  userEmail,
  memberSince,
  emailVerified = false,
}: DashboardSettingsProps) {
  const [activeSubTab, setActiveSubTab] = useState<
    | "account"
    | "gifts"
    | "reading_pref"
    | "notifications"
    | "dues_history"
    | "orders_history"
  >("account");

  const [isQrOpen, setIsQrOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState<string>();
  const [logoutPending, setLogoutPending] = useState(false);
  const [logoutError, setLogoutError] = useState(false);
  const [verification, setVerification] = useState<"idle" | "pending" | "sent" | "error">("idle");
  const membership = useMembershipSummary();
  const orders = useMembershipOrders(activeSubTab === "dues_history");
  const saveUsername = useSaveMembershipUsername();
  const saveReminders = useSaveMembershipReminders();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const router = useRouter();
  const since = memberSince ? formatMembershipDate(memberSince) : undefined;

  const handleLogout = async () => {
    setLogoutPending(true);
    setLogoutError(false);
    try {
      const { error } = await authClient.signOut();
      if (error) throw error;
      queryClient.clear();
      await router.invalidate();
      await navigate({ to: "/", replace: true });
    } catch {
      setLogoutError(true);
      setLogoutPending(false);
    }
  };

  function handleUsername(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = membershipUsernameSchema.safeParse({ username });
    setUsernameError(result.success ? undefined : result.error.issues[0]?.message);
    if (result.success) saveUsername.mutate(result.data.username);
  }

  async function sendVerification() {
    setVerification("pending");
    try {
      const { error } = await authClient.sendVerificationEmail({
        email: userEmail,
        callbackURL: new URL("/app?tab=settings", window.location.origin).href,
      });
      setVerification(error ? "error" : "sent");
    } catch {
      setVerification("error");
    }
  }

  const subTabs = [
    { id: "account" as const, label: "Akun" },
    { id: "gifts" as const, label: "Hadiah" },
    { id: "reading_pref" as const, label: "Preferensi Membaca" },
    { id: "notifications" as const, label: "Notifikasi" },
    { id: "dues_history" as const, label: "Riwayat Iuran Keanggotaan" },
    { id: "orders_history" as const, label: "Riwayat Pembelian Buku" },
  ];

  return (
    <div className="space-y-8 pb-16">
      {/* Header (per SS 5) */}
      <div className="pb-4 border-b border-border">
        <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5 font-sans">
          Kelola akun, hadiah, preferensi membaca, dan riwayat pembelianmu.
        </p>
      </div>

      {/* Horizontal Sub-Tabs (per SS 5) */}
      <div className="border-b border-border overflow-x-auto scrollbar-none">
        <nav className="flex space-x-8 text-xs font-mono pb-px" aria-label="Sub Tabs Settings">
          {subTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id)}
              aria-current={activeSubTab === tab.id ? "page" : undefined}
              className={`min-h-11 pb-3 border-b-2 font-medium transition-colors shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring ${
                activeSubTab === tab.id
                  ? "border-[var(--color-accent)] text-foreground font-bold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Sub-Tab 1: Akun (per SS 5) */}
      {activeSubTab === "account" && (
        <div className="space-y-8 max-w-2xl text-xs font-mono animate-in fade-in duration-100">
          <div className="space-y-5">
            {/* Nama */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 items-center">
              <span className="sm:col-span-3 text-muted-foreground">Nama</span>
              <div className="sm:col-span-9 flex items-center gap-3">
                <div className="size-10 rounded-full overflow-hidden border border-border shrink-0 bg-muted flex items-center justify-center font-bold text-base text-muted-foreground">
                  {userName.slice(0, 1)}
                </div>
                <span className="font-semibold text-foreground text-sm font-sans">
                  {userName}
                </span>
              </div>
            </div>

            {/* Email */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 items-center">
              <span className="sm:col-span-3 text-muted-foreground">Email</span>
              <div className="sm:col-span-9 text-foreground font-sans">
                {userEmail}
              </div>
            </div>

            {/* Status Keanggotaan */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 items-center">
              <span className="sm:col-span-3 text-muted-foreground">
                Status Keanggotaan
              </span>
              <div className="sm:col-span-9 flex flex-wrap items-center gap-2">
                {membership.data ? (
                  <>
                    <span className="rounded bg-muted px-2 py-1 text-muted-foreground">
                      {membership.data.status === "active" ? "Nakama aktif"
                        : membership.data.status === "expired" ? "Nakama berakhir" : "Belum menjadi Nakama"}
                    </span>
                    {membership.data.expiresAt && (
                      <span className="text-muted-foreground">
                        {membership.data.status === "active" ? "Aktif hingga " : "Berakhir "}
                        {formatMembershipDate(membership.data.expiresAt)}
                      </span>
                    )}
                    <Button asChild variant="link" className="min-h-11">
                      <Link to="/membership" search={{}}>
                        {membership.data.status === "inactive" ? "Jadi Nakama" : "Perpanjang Nakama"}
                      </Link>
                    </Button>
                  </>
                ) : membership.isError ? (
                  <Button variant="link" className="min-h-11" onClick={() => void membership.refetch()}>Muat ulang status</Button>
                ) : (
                  <span role="status">Memuat status…</span>
                )}
              </div>
            </div>

            {/* Bergabung sejak */}
            {since && (
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 items-center">
                <span className="sm:col-span-3 text-muted-foreground">Bergabung sejak</span>
                <div className="sm:col-span-9 text-foreground">{since}</div>
              </div>
            )}

            {/* QR Profile */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 items-center">
              <span className="sm:col-span-3 text-muted-foreground">
                QR Profile
              </span>
              <div className="sm:col-span-9">
                <Button
                  onClick={() => setIsQrOpen(true)}
                  variant="outline"
                  size="sm"
                  className="min-h-11 font-mono text-xs gap-1.5"
                >
                  <QrCode className="size-3.5" />
                  <span>Tampilkan QR</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Logout Action (per SS 5) */}
          <div className="pt-6 border-t border-border">
            <button
              type="button"
              onClick={() => void handleLogout()}
              disabled={logoutPending}
              className="flex min-h-11 items-center gap-1.5 rounded-sm font-mono text-xs text-destructive focus-visible:outline-2 focus-visible:outline-ring"
            >
              <LogOut className="size-4" />
              <span>{logoutPending ? "Keluar…" : "Keluar"}</span>
            </button>
            {logoutError && <p role="alert" className="text-destructive">Belum berhasil keluar. Coba lagi.</p>}
          </div>
        </div>
      )}

      {activeSubTab === "gifts" && (
        <div className="max-w-md space-y-5 text-sm">
          <div className="space-y-1">
            <h2 className="font-serif text-xl font-bold">Hadiah Nakama</h2>
            <p className="text-muted-foreground">Gunakan username AnzaBook temanmu untuk membelikan paket. Bagikan username-mu agar teman bisa mengirim hadiah ke akunmu.</p>
          </div>
          {membership.data?.username ? (
            <p>Username kamu <strong>@{membership.data.username}</strong></p>
          ) : membership.data ? (
            <form onSubmit={handleUsername} className="space-y-2">
              <Label htmlFor="gift-username">Username kamu</Label>
              <p id="username-hint" className="text-muted-foreground">Gunakan 3–24 huruf, angka, atau garis bawah. Username dapat ditetapkan sekali.</p>
              <Input
                id="gift-username"
                className="h-11"
                aria-describedby="username-hint"
                autoCapitalize="none"
                autoComplete="username"
                spellCheck={false}
                required
                maxLength={24}
                value={username}
                onChange={(event) => {
                  setUsername(event.target.value);
                  setUsernameError(undefined);
                  saveUsername.reset();
                }}
              />
              {(usernameError || saveUsername.error) && (
                <p role="alert" className="text-destructive">
                  {usernameError ?? (saveUsername.error instanceof ApiError ? saveUsername.error.message : "Username belum tersimpan. Coba lagi.")}
                </p>
              )}
              <Button type="submit" variant="outline" className="min-h-11" disabled={saveUsername.isPending}>
                {saveUsername.isPending ? "Menyimpan…" : "Simpan username"}
              </Button>
            </form>
          ) : membership.isError ? (
            <Button type="button" variant="link" className="min-h-11" onClick={() => void membership.refetch()}>Muat ulang username</Button>
          ) : <p role="status" className="text-muted-foreground">Memuat username…</p>}
          <Button asChild className="min-h-11">
            <Link to="/membership" search={{}}>Lihat paket hadiah</Link>
          </Button>
          <p className="border-t border-border pt-4 text-muted-foreground">
            Kode buku cetak bisa diklaim dari halaman detail buku.
          </p>
        </div>
      )}

      {/* Sub-Tab 3: Preferensi Membaca */}
      {activeSubTab === "reading_pref" && (
        <div className="max-w-md space-y-4 font-mono text-xs animate-in fade-in duration-100">
          <h3 className="font-serif text-base font-bold text-foreground font-sans">
            Konfigurasi Pembacaan Default
          </h3>

          <div className="space-y-3">
            <div>
              <label className="block text-muted-foreground mb-1">
                Tata Letak Membaca Default:
              </label>
              <select className="w-full bg-card border border-border rounded-[6px] p-2 text-foreground focus:outline-none">
                <option value="scroll">Scroll Vertikal Berkelanjutan</option>
                <option value="slide">Slide Horizontal Per Halaman</option>
              </select>
            </div>

            <div>
              <label className="block text-muted-foreground mb-1">
                Tema Kertas Default:
              </label>
              <select className="w-full bg-card border border-border rounded-[6px] p-2 text-foreground focus:outline-none">
                <option value="manila">Kertas Manila Hangat (Newsprint)</option>
                <option value="sepia">Sepia Nostalgia</option>
                <option value="night">Mode Gelap (Malam)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === "notifications" && (
        <div className="max-w-md space-y-4 text-sm">
          <h2 className="font-serif text-xl font-bold">Pengingat Nakama</h2>
          {membership.data ? (
            <label className="flex min-h-11 cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                className="size-4 rounded accent-primary focus-visible:outline-2 focus-visible:outline-ring"
                checked={membership.data.reminderEmailsEnabled}
                disabled={saveReminders.isPending}
                onChange={(event) => saveReminders.mutate(event.target.checked)}
              />
              <span>Kirim pengingat masa aktif Nakama lewat email</span>
            </label>
          ) : membership.isError ? (
            <Button variant="link" className="min-h-11" onClick={() => void membership.refetch()}>Muat ulang preferensi</Button>
          ) : <p role="status" className="text-muted-foreground">Memuat preferensi…</p>}
          {saveReminders.isError && <p role="alert" className="text-destructive">Preferensi belum tersimpan. Coba lagi.</p>}
          {!emailVerified && (
            <div className="space-y-2 border-t border-border pt-4">
              <p className="text-muted-foreground">Verifikasi email untuk menerima pengingat Nakama.</p>
              <Button type="button" variant="outline" className="min-h-11" disabled={verification === "pending" || verification === "sent"} onClick={() => void sendVerification()}>
                {verification === "pending" ? "Mengirim…" : "Kirim email verifikasi"}
              </Button>
              {verification === "sent" && <p role="status">Tautan verifikasi dikirim ke {userEmail}.</p>}
              {verification === "error" && <p role="alert" className="text-destructive">Email verifikasi belum terkirim. Coba lagi.</p>}
            </div>
          )}
        </div>
      )}

      {activeSubTab === "dues_history" && (
        <div className="max-w-2xl space-y-3 text-sm">
          <h2 className="font-serif text-xl font-bold">Riwayat Pembayaran Iuran</h2>
          {orders.isPending && <p role="status" className="text-muted-foreground">Memuat riwayat pembayaran…</p>}
          {orders.isError && (
            <Button variant="link" className="min-h-11" onClick={() => void orders.refetch()}>Muat ulang riwayat</Button>
          )}
          {orders.data?.length === 0 && <p className="text-muted-foreground">Belum ada pembayaran iuran.</p>}
          {!!orders.data?.length && (
            <ul className="divide-y divide-border border-y border-border">
              {orders.data.map((order) => (
                <li key={order.id}>
                  <Link
                    to="/membership/checkout/$orderId"
                    params={{ orderId: order.id }}
                    className="flex min-h-11 flex-wrap items-center justify-between gap-2 rounded-sm px-2 py-3 hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <span>
                      <strong>Nakama {order.months} bulan</strong>
                      {order.recipientUsername && ` · Hadiah untuk @${order.recipientUsername}`}
                      <span className="block text-muted-foreground">{formatMembershipDate(order.createdAt)}</span>
                    </span>
                    <span>
                      <strong className="tabular-nums">{formatRupiah(order.priceIdr)}</strong>
                      <span className="block text-muted-foreground">{orderStatusLabel[order.status]}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Sub-Tab 6: Riwayat Pembelian Buku */}
      {activeSubTab === "orders_history" && (
        <div className="space-y-3 text-xs font-mono animate-in fade-in duration-100">
          <h3 className="font-serif text-base font-bold text-foreground font-sans">
            Pesanan Buku Cetak
          </h3>
          <div className="p-8 text-center text-muted-foreground border border-dashed border-border rounded-[10px]">
            Riwayat pemesanan buku fisik belum tersedia.
          </div>
        </div>
      )}

      {/* QR Profile Dialog Modal */}
      <QrProfileDialog
        isOpen={isQrOpen}
        onClose={() => setIsQrOpen(false)}
        userName={userName}
        userEmail={userEmail}
        memberSince={since ?? "—"}
      />
    </div>
  );
}
