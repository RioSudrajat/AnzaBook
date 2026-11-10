import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  BookOpen,
  CheckCircle2,
  KeyRound,
  Loader2,
  ShieldAlert,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useClaimBookCode } from "../hooks";

type ClaimCodeDialogProps = {
  slug: string;
  bookTitle: string;
  hasClaimedDigital: boolean;
};

export function ClaimCodeDialog({
  slug,
  bookTitle,
  hasClaimedDigital,
}: ClaimCodeDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [code, setCode] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const claimMutation = useClaimBookCode(slug);

  const handleOpen = () => {
    setIsOpen(true);
    setErrorMessage(null);
    setIsSuccess(false);
    setCode("");
  };

  const handleClose = () => {
    setIsOpen(false);
    setErrorMessage(null);
    setIsSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (cleanCode.length < 6) {
      setErrorMessage("Kode klaim minimal 6 karakter.");
      return;
    }

    setErrorMessage(null);
    try {
      await claimMutation.mutateAsync(cleanCode);
      setIsSuccess(true);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setErrorMessage(
        error?.message ||
          "Gagal menukarkan kode. Pastikan kode valid dan belum pernah digunakan.",
      );
    }
  };

  if (hasClaimedDigital) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[6px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-mono">
        <CheckCircle2 className="size-4 shrink-0" />
        <span>
          Edisi Fisik Anda telah terverifikasi. Akses digital aktif penuh.
        </span>
      </div>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleOpen}
        className="font-mono text-xs gap-1.5"
      >
        <KeyRound className="size-3.5 text-[var(--color-accent)]" />
        Klaim Akses Digital Buku Fisik
      </Button>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="claim-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") handleClose();
          }}
        >
          <div className="bg-background border border-border rounded-[10px] shadow-2xl max-w-md w-full p-6 relative">
            <button
              type="button"
              onClick={handleClose}
              className="absolute right-4 top-4 p-1.5 rounded-[4px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              aria-label="Tutup Dialog"
            >
              <X className="size-4" />
            </button>

            {isSuccess ? (
              <div className="text-center py-4">
                <div className="size-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="size-6" />
                </div>
                <h3
                  id="claim-dialog-title"
                  className="font-serif text-xl font-bold text-foreground"
                >
                  Klaim Berhasil!
                </h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Akses web reader dwibahasa untuk <strong>{bookTitle}</strong>{" "}
                  kini terbuka penuh di akun Anda.
                </p>

                <div className="mt-6 flex flex-col gap-2">
                  <Button asChild>
                    <Link
                      to="/read/$slug"
                      params={{ slug }}
                      search={{ mode: "full", chapter: 1 }}
                      onClick={handleClose}
                    >
                      <BookOpen className="size-4 mr-2" />
                      Mulai Membaca Sekarang
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleClose}>
                    Tutup
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <KeyRound className="size-5 text-[var(--color-accent)]" />
                  <h3
                    id="claim-dialog-title"
                    className="font-serif text-lg font-bold text-foreground"
                  >
                    Klaim Pembelian Buku Fisik
                  </h3>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  Beli edisi cetak di Gramedia atau gudang komunitas? Masukkan
                  kode unik 16 karakter dari segel halaman belakang buku Anda
                  untuk membuka web reader dwibahasa dan sinkronisasi audio.
                </p>

                <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                  <div>
                    <label
                      htmlFor="claimCodeInput"
                      className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5"
                    >
                      Kode Akses Unik
                    </label>
                    <Input
                      id="claimCodeInput"
                      type="text"
                      placeholder="Contoh: ANZA-RAKYAT-2026"
                      value={code}
                      onChange={(e) => {
                        setCode(e.target.value.toUpperCase());
                        if (errorMessage) setErrorMessage(null);
                      }}
                      className="font-mono text-center tracking-widest text-sm uppercase"
                      disabled={claimMutation.isPending}
                      autoFocus
                    />
                    <p className="text-[11px] font-mono text-muted-foreground mt-1">
                      Tips pengujian: Gunakan kode demo{" "}
                      <code>ANZA-RAKYAT-2026</code>
                    </p>
                  </div>

                  {errorMessage && (
                    <div className="p-2.5 rounded-[6px] bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2">
                      <ShieldAlert className="size-4 shrink-0 mt-0.5" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleClose}
                      disabled={claimMutation.isPending}
                    >
                      Batal
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={claimMutation.isPending || !code.trim()}
                    >
                      {claimMutation.isPending ? (
                        <>
                          <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                          Memverifikasi...
                        </>
                      ) : (
                        "Verifikasi & Buka Akses"
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
