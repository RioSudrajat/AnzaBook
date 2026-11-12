import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { BookOpen, Camera, ExternalLink, Link as LinkIcon, Loader2, LogOut, QrCode, Sparkles, Trash2 } from "lucide-react";
import { membershipUsernameSchema } from "@starter/shared/validators/membership";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useCancelMembership,
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

const membershipStatusLabel = {
  inactive: "Belum menjadi Nakama",
  active: "Nakama aktif",
  expired: "Nakama berakhir",
  canceled: "Nakama dibatalkan",
};

async function resizeImageFile(
  file: File,
  maxDimension = 256,
  quality = 0.85,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal membaca berkas gambar."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Format berkas gambar tidak valid."));
      img.onload = () => {
        let { width, height } = img;
        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Gagal memproses gambar pada peramban."));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

type DashboardSettingsProps = {
  userName: string;
  userEmail: string;
  userRole?: string;
  userImage?: string | null;
  memberSince?: string;
  emailVerified?: boolean;
};

export function DashboardSettings({
  userName,
  userEmail,
  userImage,
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

  const [profileImage, setProfileImage] = useState<string | null>(
    userImage ?? null,
  );
  const [isUpdatingImage, setIsUpdatingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageSuccess, setImageSuccess] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isQrOpen, setIsQrOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState<string>();
  const [cancelExpiry, setCancelExpiry] = useState<string | null>(null);
  const cancelTrigger = useRef<HTMLButtonElement>(null);
  const [logoutPending, setLogoutPending] = useState(false);
  const [logoutError, setLogoutError] = useState(false);
  const [verification, setVerification] = useState<
    "idle" | "pending" | "sent" | "error"
  >("idle");
  const membership = useMembershipSummary();
  const cancelNakama = useCancelMembership();
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
    setUsernameError(
      result.success ? undefined : result.error.issues[0]?.message,
    );
    if (result.success) saveUsername.mutate(result.data.username);
  }

  async function updateProfileImage(newImageUrl: string) {
    setIsUpdatingImage(true);
    setImageError(null);
    setImageSuccess(null);
    try {
      const { error } = await authClient.updateUser({
        image: newImageUrl,
      });
      if (error) {
        setImageError(error.message || "Gagal memperbarui foto profil.");
      } else {
        setProfileImage(newImageUrl || null);
        setImageSuccess(
          newImageUrl
            ? "Foto profil berhasil diperbarui."
            : "Foto profil berhasil dihapus.",
        );
        await router.invalidate();
      }
    } catch (err) {
      setImageError(
        err instanceof Error ? err.message : "Gagal memperbarui foto profil.",
      );
    } finally {
      setIsUpdatingImage(false);
    }
  }

  async function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setImageError("Pilih berkas gambar yang valid (JPG, PNG, atau WEBP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setImageError("Ukuran berkas gambar maksimal 5MB.");
      return;
    }

    try {
      setIsUpdatingImage(true);
      setImageError(null);
      const dataUrl = await resizeImageFile(file, 256, 0.85);
      await updateProfileImage(dataUrl);
    } catch (err) {
      setImageError(
        err instanceof Error ? err.message : "Gagal memproses gambar.",
      );
      setIsUpdatingImage(false);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleUrlSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = urlInput.trim();
    if (!trimmed) {
      setImageError("Masukkan tautan gambar yang valid.");
      return;
    }
    if (
      !trimmed.startsWith("http://") &&
      !trimmed.startsWith("https://") &&
      !trimmed.startsWith("data:image/")
    ) {
      setImageError("URL gambar harus dimulai dengan http:// atau https://.");
      return;
    }
    await updateProfileImage(trimmed);
    setUrlInput("");
    setShowUrlInput(false);
  }

  async function handleRemoveImage() {
    await updateProfileImage("");
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
      {/* Header Subtitle */}
      <div className="pb-3 border-b border-border">
        <p className="text-xs text-muted-foreground font-sans">
          Kelola akun, hadiah, preferensi membaca, dan riwayat pembelianmu.
        </p>
      </div>

      {/* Horizontal Sub-Tabs (per SS 5) */}
      <div className="border-b border-border overflow-x-auto scrollbar-none">
        <nav
          className="flex space-x-8 text-xs font-mono pb-px"
          aria-label="Sub Tabs Settings"
        >
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
          <div className="space-y-6">
            {/* Foto Profil */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 items-start pb-4 border-b border-border/60">
              <span className="sm:col-span-3 text-muted-foreground pt-2">
                Foto Profil
              </span>
              <div className="sm:col-span-9 space-y-3">
                <div className="flex items-center gap-4">
                  <div className="size-16 rounded-full overflow-hidden border border-border shrink-0 bg-muted flex items-center justify-center font-bold text-xl text-muted-foreground ring-2 ring-border/50">
                    {profileImage ? (
                      <img
                        src={profileImage}
                        alt={userName}
                        className="size-full object-cover"
                      />
                    ) : (
                      <span>{userName.slice(0, 1).toUpperCase()}</span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileSelected}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isUpdatingImage}
                      onClick={() => fileInputRef.current?.click()}
                      className="min-h-9"
                    >
                      {isUpdatingImage ? (
                        <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <Camera className="size-3.5 mr-1.5" />
                      )}
                      {isUpdatingImage ? "Menyimpan..." : "Unggah Gambar"}
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isUpdatingImage}
                      onClick={() => setShowUrlInput(!showUrlInput)}
                      className="min-h-9 text-muted-foreground hover:text-foreground"
                    >
                      <LinkIcon className="size-3.5 mr-1.5" />
                      Tautan URL
                    </Button>

                    {profileImage && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isUpdatingImage}
                        onClick={handleRemoveImage}
                        className="min-h-9 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="size-3.5 mr-1.5" />
                        Hapus
                      </Button>
                    )}
                  </div>
                </div>

                {showUrlInput && (
                  <form
                    onSubmit={handleUrlSubmit}
                    className="flex flex-col sm:flex-row gap-2 max-w-md pt-1"
                  >
                    <Input
                      type="url"
                      placeholder="https://example.com/foto-profil.jpg"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      disabled={isUpdatingImage}
                      className="text-xs h-9"
                    />
                    <Button
                      type="submit"
                      size="sm"
                      disabled={isUpdatingImage || !urlInput.trim()}
                      className="h-9 shrink-0"
                    >
                      Terapkan
                    </Button>
                  </form>
                )}

                <p className="text-[11px] text-muted-foreground font-sans">
                  Pilih berkas dari perangkat (JPG, PNG, WEBP) atau masukkan URL foto. Gambar otomatis dikompres.
                </p>

                {imageError && (
                  <p className="text-[11px] text-destructive font-sans font-medium">
                    {imageError}
                  </p>
                )}

                {imageSuccess && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-sans font-medium">
                    {imageSuccess}
                  </p>
                )}
              </div>
            </div>

            {/* Nama */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 items-center">
              <span className="sm:col-span-3 text-muted-foreground">Nama</span>
              <div className="sm:col-span-9 flex items-center gap-3">
                <div className="size-9 rounded-full overflow-hidden border border-border shrink-0 bg-muted flex items-center justify-center font-bold text-xs text-muted-foreground">
                  {profileImage ? (
                    <img
                      src={profileImage}
                      alt={userName}
                      className="size-full object-cover"
                    />
                  ) : (
                    <span>{userName.slice(0, 1).toUpperCase()}</span>
                  )}
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
                    <span
                      role="status"
                      className="rounded bg-muted px-2 py-1 text-muted-foreground"
                    >
                      {membershipStatusLabel[membership.data.status]}
                    </span>
                    {membership.data.expiresAt && (
                      <span className="text-muted-foreground">
                        {membership.data.status === "active"
                          ? "Aktif hingga "
                          : membership.data.status === "canceled"
                            ? "Dibatalkan pada "
                            : "Berakhir "}
                        {formatMembershipDate(membership.data.expiresAt)}
                      </span>
                    )}
                    <Button asChild variant="link" className="min-h-11">
                      <Link to="/membership" search={{}}>
                        {membership.data.status === "inactive"
                          ? "Jadi Nakama"
                          : membership.data.status === "canceled"
                            ? "Gabung kembali"
                            : "Perpanjang Nakama"}
                      </Link>
                    </Button>
                    {membership.data.status === "active" &&
                      membership.data.expiresAt && (
                        <Button
                          ref={cancelTrigger}
                          type="button"
                          variant="ghost"
                          className="min-h-11 text-destructive hover:text-destructive"
                          aria-expanded={cancelExpiry !== null}
                          aria-controls="nakama-cancellation"
                          disabled={cancelNakama.isPending}
                          onClick={() => {
                            cancelNakama.reset();
                            setCancelExpiry(
                              cancelExpiry === null
                                ? (membership.data?.expiresAt ?? null)
                                : null,
                            );
                          }}
                        >
                          Batalkan keanggotaan
                        </Button>
                      )}
                    {membership.data.status === "active" &&
                      cancelExpiry !== null && (
                        <fieldset
                          id="nakama-cancellation"
                          className="mt-2 w-full min-w-0 space-y-3 rounded-md border border-border p-4"
                        >
                          <legend className="px-1 font-semibold">
                            Konfirmasi pembatalan Nakama
                          </legend>
                          <p className="font-sans text-muted-foreground">
                            Akses Premium langsung dihentikan dan sisa masa
                            aktif berakhir. Pengembalian dana ditangani
                            terpisah.
                          </p>
                          {cancelNakama.isError && (
                            <p role="alert" className="text-destructive">
                              {cancelNakama.error instanceof ApiError
                                ? cancelNakama.error.message
                                : "Pembatalan gagal. Coba lagi."}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              className="min-h-11"
                              disabled={cancelNakama.isPending}
                              onClick={() => {
                                setCancelExpiry(null);
                                cancelTrigger.current?.focus();
                              }}
                            >
                              Tetap jadi Nakama
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              className="min-h-11"
                              disabled={cancelNakama.isPending}
                              onClick={() =>
                                cancelNakama.mutate(
                                  { confirm: true, expiresAt: cancelExpiry },
                                  {
                                    onSuccess: () => setCancelExpiry(null),
                                  },
                                )
                              }
                            >
                              {cancelNakama.isPending
                                ? "Membatalkan…"
                                : "Ya, batalkan keanggotaan"}
                            </Button>
                          </div>
                        </fieldset>
                      )}
                  </>
                ) : membership.isError ? (
                  <Button
                    variant="link"
                    className="min-h-11"
                    onClick={() => void membership.refetch()}
                  >
                    Muat ulang status
                  </Button>
                ) : (
                  <span role="status">Memuat status…</span>
                )}
              </div>
            </div>

            {/* Bergabung sejak */}
            {since && (
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 items-center">
                <span className="sm:col-span-3 text-muted-foreground">
                  Bergabung sejak
                </span>
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

            {/* Partner Program */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 items-start pt-2 border-t border-border/40">
              <span className="sm:col-span-3 text-muted-foreground pt-1">
                Partner Program
              </span>
              <div className="sm:col-span-9 space-y-1.5">
                <Link
                  to="/partner-program"
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 hover:bg-muted border border-border/80 text-xs font-mono font-medium text-foreground transition-colors cursor-pointer group"
                >
                  <BookOpen className="size-3.5 text-foreground shrink-0" />
                  <span className="group-hover:underline">AnzaBook Partner Program</span>
                  <ExternalLink className="size-3 text-muted-foreground ml-1" />
                </Link>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Jembatan kemitraan dan bagi hasil royalti untuk Penulis Resmi, Penerbit Mitra, dan Komunitas Literasi.
                </p>
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
            {logoutError && (
              <p role="alert" className="text-destructive">
                Belum berhasil keluar. Coba lagi.
              </p>
            )}
          </div>
        </div>
      )}

      {activeSubTab === "gifts" && (
        <div className="max-w-md space-y-5 text-sm">
          <div className="space-y-1">
            <h2 className="font-serif text-xl font-bold">Hadiah Nakama</h2>
            <p className="text-muted-foreground">
              Gunakan username AnzaBook temanmu untuk membelikan paket. Bagikan
              username-mu agar teman bisa mengirim hadiah ke akunmu.
            </p>
          </div>
          {membership.data?.username ? (
            <p>
              Username kamu <strong>@{membership.data.username}</strong>
            </p>
          ) : membership.data ? (
            <form onSubmit={handleUsername} className="space-y-2">
              <Label htmlFor="gift-username">Username kamu</Label>
              <p id="username-hint" className="text-muted-foreground">
                Gunakan 3–24 huruf, angka, atau garis bawah. Username dapat
                ditetapkan sekali.
              </p>
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
                  {usernameError ??
                    (saveUsername.error instanceof ApiError
                      ? saveUsername.error.message
                      : "Username belum tersimpan. Coba lagi.")}
                </p>
              )}
              <Button
                type="submit"
                variant="outline"
                className="min-h-11"
                disabled={saveUsername.isPending}
              >
                {saveUsername.isPending ? "Menyimpan…" : "Simpan username"}
              </Button>
            </form>
          ) : membership.isError ? (
            <Button
              type="button"
              variant="link"
              className="min-h-11"
              onClick={() => void membership.refetch()}
            >
              Muat ulang username
            </Button>
          ) : (
            <p role="status" className="text-muted-foreground">
              Memuat username…
            </p>
          )}
          <Button asChild className="min-h-11">
            <Link to="/membership" search={{}}>
              Lihat paket hadiah
            </Link>
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
            <Button
              variant="link"
              className="min-h-11"
              onClick={() => void membership.refetch()}
            >
              Muat ulang preferensi
            </Button>
          ) : (
            <p role="status" className="text-muted-foreground">
              Memuat preferensi…
            </p>
          )}
          {saveReminders.isError && (
            <p role="alert" className="text-destructive">
              Preferensi belum tersimpan. Coba lagi.
            </p>
          )}
          {!emailVerified && (
            <div className="space-y-2 border-t border-border pt-4">
              <p className="text-muted-foreground">
                Verifikasi email untuk menerima pengingat Nakama.
              </p>
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                disabled={verification === "pending" || verification === "sent"}
                onClick={() => void sendVerification()}
              >
                {verification === "pending"
                  ? "Mengirim…"
                  : "Kirim email verifikasi"}
              </Button>
              {verification === "sent" && (
                <p role="status">Tautan verifikasi dikirim ke {userEmail}.</p>
              )}
              {verification === "error" && (
                <p role="alert" className="text-destructive">
                  Email verifikasi belum terkirim. Coba lagi.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {activeSubTab === "dues_history" && (
        <div className="max-w-2xl space-y-3 text-sm">
          <h2 className="font-serif text-xl font-bold">
            Riwayat Pembayaran Iuran
          </h2>
          {orders.isPending && (
            <p role="status" className="text-muted-foreground">
              Memuat riwayat pembayaran…
            </p>
          )}
          {orders.isError && (
            <Button
              variant="link"
              className="min-h-11"
              onClick={() => void orders.refetch()}
            >
              Muat ulang riwayat
            </Button>
          )}
          {orders.data?.length === 0 && (
            <p className="text-muted-foreground">Belum ada pembayaran iuran.</p>
          )}
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
                      {order.recipientUsername &&
                        ` · Hadiah untuk @${order.recipientUsername}`}
                      <span className="block text-muted-foreground">
                        {formatMembershipDate(order.createdAt)}
                      </span>
                    </span>
                    <span>
                      <strong className="tabular-nums">
                        {formatRupiah(order.priceIdr)}
                      </strong>
                      <span className="block text-muted-foreground">
                        {orderStatusLabel[order.status]}
                      </span>
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
