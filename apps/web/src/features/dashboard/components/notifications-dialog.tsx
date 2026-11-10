import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type NotificationItem = {
  id: string;
  title: string;
  desc: string;
  time: string;
  unread: boolean;
};

type NotificationsDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  unreadCount: number;
  onMarkAllRead: () => void;
};

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "1",
    title: "Buletin Mingguan Baru Terbit",
    desc: "Pajak Melulu, Duitnya ke Mana? telah rilis dan siap dibaca.",
    time: "10 menit lalu",
    unread: true,
  },
  {
    id: "2",
    title: "Buku Rekomendasi Baru",
    desc: "Kecerdasan Sosial: Senjata Utama Homo Sapiens kini tersedia lengkap.",
    time: "2 jam lalu",
    unread: true,
  },
  {
    id: "3",
    title: "Akses Audio Tersedia",
    desc: "Audiobook Akar Semua Kekusutan Percintaan telah aktif.",
    time: "1 hari lalu",
    unread: true,
  },
  {
    id: "4",
    title: "Iuran Keanggotaan Nakama",
    desc: "Perpanjang keanggotaan untuk akses tak terbatas ke seluruh pustaka.",
    time: "2 hari lalu",
    unread: true,
  },
  {
    id: "5",
    title: "Catatan & Kutipan Tersimpan",
    desc: "3 sorotan kutipan baru berhasil disinkronkan ke My Library.",
    time: "3 hari lalu",
    unread: true,
  },
];

export function NotificationsDialog({
  isOpen,
  onClose,
  unreadCount,
  onMarkAllRead,
}: NotificationsDialogProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="notifications-title"
      className="fixed inset-0 z-50 flex items-start justify-end p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 text-foreground"
    >
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl overflow-hidden mt-12 sm:mt-14 animate-in slide-in-from-top-2 duration-200">
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-2">
            <Bell className="size-4 text-[var(--color-accent)]" />
            <h3 id="notifications-title" className="font-serif font-bold text-base">
              Notifikasi
            </h3>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-full bg-red-600 text-white">
                {unreadCount} baru
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllRead}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 cursor-pointer"
              >
                Tandai dibaca
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 min-w-11 inline-flex items-center justify-center text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring"
              aria-label="Tutup"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto divide-y divide-border/60">
          {INITIAL_NOTIFICATIONS.map((item) => (
            <div
              key={item.id}
              className={`p-3.5 space-y-1 transition-colors hover:bg-muted/40 ${
                item.unread && unreadCount > 0 ? "bg-[var(--color-accent)]/5" : ""
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">{item.title}</span>
                <span className="text-[10px] font-mono text-muted-foreground">{item.time}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-border bg-muted/20 text-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="w-full text-xs text-muted-foreground hover:text-foreground"
          >
            Tutup
          </Button>
        </div>
      </div>
    </div>
  );
}
