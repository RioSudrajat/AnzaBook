import { Sparkles, X } from "lucide-react";

type QrProfileDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  userEmail: string;
  memberSince?: string;
};

export function QrProfileDialog({
  isOpen,
  onClose,
  userName,
  userEmail,
  memberSince = "28 Oktober 2026",
}: QrProfileDialogProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-profile-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150 text-foreground"
    >
      <div className="max-w-xs w-full bg-card border border-border rounded-[16px] p-6 shadow-2xl relative text-center space-y-4">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3.5 top-3.5 p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted"
          aria-label="Tutup"
        >
          <X className="size-4" />
        </button>

        <div className="flex items-center justify-center gap-1.5 text-xs font-mono text-[var(--color-accent)] font-semibold">
          <Sparkles className="size-3.5" />
          <span>Kartu Identitas Pembaca</span>
        </div>

        <div>
          <h3 id="qr-profile-title" className="font-serif text-lg font-bold">
            {userName}
          </h3>
          <p className="text-xs text-muted-foreground font-mono">{userEmail}</p>
        </div>

        {/* QR Code Graphic Frame */}
        <div className="p-4 bg-white rounded-[12px] shadow-inner inline-block mx-auto border border-black/10">
          <svg
            className="size-44 text-black"
            viewBox="0 0 100 100"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Outer corners */}
            <rect x="10" y="10" width="24" height="24" rx="3" fill="#1C1917" />
            <rect x="14" y="14" width="16" height="16" rx="2" fill="#FFFFFF" />
            <rect x="18" y="18" width="8" height="8" rx="1" fill="#F06A24" />

            <rect x="66" y="10" width="24" height="24" rx="3" fill="#1C1917" />
            <rect x="70" y="14" width="16" height="16" rx="2" fill="#FFFFFF" />
            <rect x="74" y="18" width="8" height="8" rx="1" fill="#F06A24" />

            <rect x="10" y="66" width="24" height="24" rx="3" fill="#1C1917" />
            <rect x="14" y="70" width="16" height="16" rx="2" fill="#FFFFFF" />
            <rect x="18" y="74" width="8" height="8" rx="1" fill="#F06A24" />

            {/* Matrix dots simulating real reader identifier */}
            <rect x="42" y="12" width="6" height="6" fill="#1C1917" />
            <rect x="52" y="12" width="6" height="6" fill="#1C1917" />
            <rect x="42" y="24" width="6" height="12" fill="#1C1917" />
            <rect x="52" y="30" width="6" height="6" fill="#F06A24" />
            <rect x="12" y="42" width="6" height="6" fill="#1C1917" />
            <rect x="24" y="42" width="12" height="6" fill="#1C1917" />
            <rect x="42" y="42" width="16" height="16" rx="2" fill="#1C1917" />
            <rect x="66" y="42" width="8" height="6" fill="#1C1917" />
            <rect x="82" y="42" width="6" height="12" fill="#1C1917" />
            <rect x="12" y="54" width="8" height="6" fill="#1C1917" />
            <rect x="30" y="54" width="6" height="6" fill="#1C1917" />
            <rect x="66" y="54" width="14" height="6" fill="#1C1917" />
            <rect x="42" y="66" width="6" height="14" fill="#1C1917" />
            <rect x="54" y="72" width="6" height="8" fill="#1C1917" />
            <rect x="66" y="66" width="6" height="6" fill="#1C1917" />
            <rect x="78" y="66" width="10" height="6" fill="#1C1917" />
            <rect x="66" y="78" width="12" height="10" fill="#1C1917" />
            <rect x="84" y="84" width="6" height="6" fill="#F06A24" />
          </svg>
        </div>

        <div className="text-[11px] font-mono text-muted-foreground border-t border-border pt-3">
          <span>Bergabung sejak: {memberSince}</span>
          <span className="block text-[9px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mt-0.5">
            Terverifikasi di Jaringan Toko Mitra
          </span>
        </div>
      </div>
    </div>
  );
}
