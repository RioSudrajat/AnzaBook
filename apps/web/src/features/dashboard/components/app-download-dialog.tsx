import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

type AppDownloadDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  platform: "android" | "ios" | null;
};

export function AppDownloadDialog({
  isOpen,
  onClose,
  platform,
}: AppDownloadDialogProps) {
  if (!isOpen) return null;

  const isAndroid = platform === "android";
  const title = isAndroid ? "AnzaBook untuk Android" : "AnzaBook untuk iOS";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-download-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150 text-foreground"
    >
      <div className="max-w-sm w-full bg-card border border-border rounded-2xl p-6 shadow-2xl relative text-center space-y-4">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 min-h-11 min-w-11 inline-flex items-center justify-center text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring"
          aria-label="Tutup"
        >
          <X className="size-4" />
        </button>

        <div className="size-12 rounded-full bg-[var(--color-accent)]/15 text-[var(--color-accent)] flex items-center justify-center mx-auto">
          {isAndroid ? (
            <svg className="size-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-1.0003s.4482-1.0003.9993-1.0003c.552 0 .9993.4486.9993 1.0003s-.4473 1.0003-.9993 1.0003m-11.046 0c-.5511 0-.9993-.4486-.9993-1.0003s.4482-1.0003.9993-1.0003c.5511 0 .9993.4486.9993 1.0003s-.4482 1.0003-.9993 1.0003m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.4116 13.8533 8.125 12 8.125c-1.854 0-3.5906.2866-5.1368.8247L4.841 5.4467a.416.416 0 00-.5676-.1521.416.416 0 00-.1521.5676l1.9973 3.4592C2.6889 10.9658.3344 14.773.3344 19.167h23.3312c0-4.394-2.3545-8.2012-5.7836-9.8456"/>
            </svg>
          ) : (
            <svg className="size-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.63-.77 1.06-1.84.94-2.91-.91.04-2.02.61-2.67 1.38-.58.67-1.09 1.77-.95 2.82 1.02.08 2.06-.52 2.68-1.29z"/>
            </svg>
          )}
        </div>

        <div>
          <h3 id="app-download-title" className="font-serif text-lg font-bold">
            {title}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {isAndroid
              ? "Bawa pustaka dalam genggaman dengan pengalaman membaca e-ink & audio player."
              : "Pengalaman membaca buku kurasi dengan sinkronisasi iCloud & audio player terintegrasi."}
          </p>
        </div>

        <div className="p-3 bg-white rounded-xl shadow-xs inline-block mx-auto border border-black/10">
          <svg className="size-32 text-black" viewBox="0 0 120 120" fill="currentColor">
            <rect x="10" y="10" width="30" height="30" rx="4" />
            <rect x="80" y="10" width="30" height="30" rx="4" />
            <rect x="10" y="80" width="30" height="30" rx="4" />
            <rect x="18" y="18" width="14" height="14" fill="white" />
            <rect x="88" y="18" width="14" height="14" fill="white" />
            <rect x="18" y="88" width="14" height="14" fill="white" />
            <rect x="22" y="22" width="6" height="6" />
            <rect x="92" y="22" width="6" height="6" />
            <rect x="22" y="92" width="6" height="6" />
            <circle cx="60" cy="30" r="4" />
            <circle cx="50" cy="60" r="5" />
            <circle cx="70" cy="70" r="5" />
            <rect x="55" y="85" width="20" height="8" rx="2" />
            <rect x="85" y="55" width="8" height="20" rx="2" />
          </svg>
        </div>

        <p className="text-[11px] font-mono text-muted-foreground">
          Scan QR untuk instal langsung via {isAndroid ? "Play Store / APK" : "App Store / TestFlight"}
        </p>

        <Button
          type="button"
          onClick={onClose}
          className="w-full bg-[var(--color-accent)] text-white hover:opacity-90 font-medium cursor-pointer"
        >
          {isAndroid ? "Unduh APK (v1.4.0)" : "Buka di TestFlight"}
        </Button>
      </div>
    </div>
  );
}
