import { useEffect, useState } from "react";
import { Lock, ShieldAlert, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

type DrmShieldProps = {
  watermarkText: string;
  enabled?: boolean;
  children: React.ReactNode;
};

export function DrmShield({ watermarkText, enabled = false, children }: DrmShieldProps) {
  const [isShieldActive, setIsShieldActive] = useState(false);
  const [shieldReason, setShieldReason] = useState<string>(
    "Aktivitas tangkapan layar atau kehilangan fokus terdeteksi.",
  );

  useEffect(() => {
    if (!enabled) return;

    // 1. Prevent context menu & copy/cut
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    const handleCopyCut = (e: ClipboardEvent) => {
      e.preventDefault();
      setShieldReason("Penyalinan teks naskah dinonaktifkan demi perlindungan hak cipta.");
      setIsShieldActive(true);
      return false;
    };

    // 2. Pre-trigger keydown interception (before OS screen grab finishes)
    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen key
      if (e.key === "PrintScreen") {
        e.preventDefault();
        setShieldReason("Tombol PrintScreen terdeteksi.");
        setIsShieldActive(true);
        return;
      }

      // Windows key / Meta key
      if (e.key === "Meta" || e.key === "OS") {
        setShieldReason("Kombinasi tombol sistem terdeteksi.");
        setIsShieldActive(true);
        return;
      }

      // Cmd+Shift+3/4/5 (Mac screenshot) or Win+Shift+S (Windows Snipping Tool)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey) {
        setShieldReason("Pintasan tangkapan layar terdeteksi.");
        setIsShieldActive(true);
        return;
      }

      // Ctrl+P / Cmd+P (Print to PDF)
      if ((e.metaKey || e.ctrlKey) && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        setShieldReason("Fungsi pencetakan dokumen dinonaktifkan.");
        setIsShieldActive(true);
        return;
      }

      // Ctrl+S / Cmd+S (Save webpage)
      if ((e.metaKey || e.ctrlKey) && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        setShieldReason("Fungsi pengunduhan halaman dinonaktifkan.");
        setIsShieldActive(true);
        return;
      }
    };

    // 3. Window blur trigger (when user switches app or opens screen-capture tool)
    const handleWindowBlur = () => {
      setShieldReason("Jendela baca kehilangan fokus.");
      setIsShieldActive(true);
    };

    // 4. Multi-touch gesture safeguard (> 2 fingers)
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 2) {
        setShieldReason("Gerakan multi-sentuh terdeteksi.");
        setIsShieldActive(true);
      }
    };

    window.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("copy", handleCopyCut);
    window.addEventListener("cut", handleCopyCut);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("touchstart", handleTouchStart);

    return () => {
      window.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("copy", handleCopyCut);
      window.removeEventListener("cut", handleCopyCut);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("touchstart", handleTouchStart);
    };
  }, [enabled]);

  const isEffectiveShieldActive = enabled && isShieldActive;

  return (
    <div className="relative select-text">
      {/* Background Subtle Watermark Matrix (Permanent Provenance, only when DRM is enabled) */}
      {enabled && (
        <div
          className="pointer-events-none fixed inset-0 z-20 flex flex-wrap items-center justify-around overflow-hidden opacity-[0.035] leading-none select-none"
          aria-hidden="true"
        >
          {Array.from({ length: 48 }).map((_, i) => (
            <div
              key={i}
              className="w-64 h-24 rotate-[-25deg] flex items-center justify-center font-mono text-[10px] tracking-widest text-foreground uppercase select-none"
            >
              {watermarkText}
            </div>
          ))}
        </div>
      )}

      {/* Actual Content with Blur Filter on Shield Active */}
      <div
        className={`transition-all duration-150 ${
          isEffectiveShieldActive ? "blur-2xl opacity-10 pointer-events-none filter" : "blur-none opacity-100"
        }`}
      >
        {children}
      </div>

      {/* Pre-Trigger DRM Shield Overlay */}
      {isEffectiveShieldActive && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="drm-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/90 backdrop-blur-md animate-in fade-in duration-100"
        >
          <div className="max-w-md w-full bg-card border border-border rounded-[10px] p-6 shadow-2xl text-center space-y-4">
            {/* AnzaBook Official Logo */}
            <div className="flex justify-center mb-2">
              <img
                src="/logo-mark.svg"
                alt="AnzaBook Logo"
                className="size-10 object-contain drop-shadow-sm"
              />
            </div>

            <div className="size-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
              <ShieldAlert className="size-5" />
            </div>

            <div className="space-y-1.5">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground flex items-center justify-center gap-1">
                <Lock className="size-3" />
                Perlindungan Hak Cipta Aktif (DRM)
              </span>
              <h2 id="drm-title" className="font-serif text-lg font-bold text-foreground">
                Tampilan Naskah Terkunci Sementara
              </h2>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              {shieldReason} Demi melindungi hak cipta penulis dan penerjemah, naskah disembunyikan secara otomatis saat jendela tidak aktif atau terdeteksi pintasan tangkapan layar.
            </p>

            <div className="p-3 bg-muted/40 rounded-[6px] border border-border text-[11px] font-mono text-muted-foreground text-left break-all">
              <span className="opacity-70 block text-[9px] uppercase tracking-wider mb-0.5">
                Identitas Sidik Jari Pembaca:
              </span>
              {watermarkText}
            </div>

            <div className="pt-2">
              <Button
                onClick={() => setIsShieldActive(false)}
                className="w-full gap-2 font-mono text-xs"
              >
                <Sparkles className="size-3.5" />
                Lanjutkan Membaca
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
