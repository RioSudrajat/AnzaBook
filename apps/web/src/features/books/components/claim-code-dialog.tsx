import { useEffect, useId, useRef, useState } from "react";
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
import { cn } from "@/lib/utils";
import { useClaimBookCode } from "../hooks";

type ClaimCodeDialogProps = {
  slug: string;
  bookTitle: string;
  hasClaimedDigital: boolean;
  returnTo?: string | null;
  className?: string;
};

export function ClaimCodeDialog({
  slug,
  bookTitle,
  hasClaimedDigital,
  returnTo,
  className,
}: ClaimCodeDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [code, setCode] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const pressedOutsideRef = useRef(false);
  const titleId = useId();
  const inputId = useId();

  const claimMutation = useClaimBookCode(slug);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  const handleOpen = () => {
    setErrorMessage(null);
    setIsSuccess(false);
    setCode("");
    setIsOpen(true);
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
      <div
        className={cn(
          "inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--color-green-soft)] border border-[var(--color-green)]/25 text-[var(--color-green)] text-xs font-mono",
          className,
        )}
      >
        <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
        <span>
          Edisi Fisik Anda telah terverifikasi. Akses digital aktif penuh.
        </span>
      </div>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleOpen}
        className={cn(
          "min-h-11 font-mono text-xs gap-1.5 border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink)] hover:bg-[var(--color-paper-3)] cursor-pointer",
          className,
        )}
      >
        <KeyRound
          className="size-3.5 text-[var(--color-accent)]"
          aria-hidden="true"
        />
        <span>Klaim Akses Digital Buku Fisik</span>
      </Button>

      <dialog
        ref={dialogRef}
        closedby="any"
        aria-labelledby={titleId}
        onClose={() => {
          if (dialogRef.current) dialogRef.current.returnValue = "";
          if (isOpen) handleClose();
        }}
        onPointerDown={(e) => {
          const el = dialogRef.current;
          if (!el) return;
          const r = el.getBoundingClientRect();
          pressedOutsideRef.current =
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom;
        }}
        onPointerUp={(e) => {
          const el = dialogRef.current;
          if (!el || "closedBy" in HTMLDialogElement.prototype) return;
          const r = el.getBoundingClientRect();
          const releasedOutside =
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom;
          if (pressedOutsideRef.current && releasedOutside) {
            handleClose();
          }
          pressedOutsideRef.current = false;
        }}
        className="m-auto w-[min(92vw,28rem)] rounded-2xl border border-[var(--color-rule)] bg-[var(--color-sheet)] p-6 text-[var(--color-ink)] shadow-[var(--shadow-lift)] backdrop:bg-black/60 backdrop:backdrop-blur-xs overscroll-contain"
      >
        {isOpen && (
          <div className="relative">
            <button
              type="button"
              onClick={handleClose}
              className="absolute -right-2 -top-2 inline-flex size-11 items-center justify-center rounded-lg text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-3)] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--color-focus)]"
              aria-label="Tutup dialog"
            >
              <X className="size-4" aria-hidden="true" />
            </button>

            {isSuccess ? (
              <div className="text-center py-3">
                <div className="size-12 rounded-full bg-[var(--color-green-soft)] text-[var(--color-green)] flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="size-6" aria-hidden="true" />
                </div>
                <h2
                  id={titleId}
                  className="font-serif text-xl font-bold text-[var(--color-ink)]"
                >
                  Klaim Berhasil!
                </h2>
                <p className="text-sm text-[var(--color-ink-2)] mt-2 leading-relaxed">
                  Akses web reader dwibahasa untuk <strong>{bookTitle}</strong>{" "}
                  kini terbuka penuh di akun Anda.
                </p>

                <div className="mt-6 flex flex-col gap-2">
                  <Button
                    asChild
                    autoFocus
                    className="min-h-11 bg-[var(--color-accent)] text-[var(--color-accent-ink)] hover:brightness-95 font-semibold"
                  >
                    <Link
                      to="/read/$slug"
                      params={{ slug }}
                      search={{
                        mode: "full",
                        chapter: 1,
                        ...(returnTo ? { returnTo } : {}),
                      }}
                      onClick={handleClose}
                    >
                      <BookOpen className="size-4 mr-2" aria-hidden="true" />
                      Mulai Membaca Sekarang
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleClose}
                    className="min-h-11 text-[var(--color-ink-2)] hover:bg-[var(--color-paper-3)] cursor-pointer"
                  >
                    Tutup
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 pr-10 mb-2">
                  <KeyRound
                    className="size-5 text-[var(--color-accent)] shrink-0"
                    aria-hidden="true"
                  />
                  <h2
                    id={titleId}
                    className="font-serif text-lg font-bold text-[var(--color-ink)]"
                  >
                    Klaim Pembelian Buku Fisik
                  </h2>
                </div>

                <p className="text-xs text-[var(--color-muted)] leading-relaxed">
                  Memiliki edisi cetak resmi? Masukkan kode unik 16 karakter
                  dari segel halaman belakang buku Anda untuk membuka web reader
                  dwibahasa dan sinkronisasi audio.
                </p>

                <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                  <div>
                    <label
                      htmlFor={inputId}
                      className="block text-xs font-mono uppercase tracking-wider text-[var(--color-muted)] mb-1.5"
                    >
                      Kode Akses Unik
                    </label>
                    <Input
                      id={inputId}
                      type="text"
                      placeholder="Contoh: ANZA-RAKYAT-2026"
                      value={code}
                      onChange={(e) => {
                        setCode(e.target.value.toUpperCase());
                        if (errorMessage) setErrorMessage(null);
                      }}
                      className="min-h-11 font-mono text-center tracking-widest text-sm uppercase border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink)]"
                      disabled={claimMutation.isPending}
                      autoFocus
                    />
                    <p className="text-[11px] font-mono text-[var(--color-muted)] mt-1.5">
                      Tips pengujian: Gunakan kode demo{" "}
                      <code>ANZA-RAKYAT-2026</code>
                    </p>
                  </div>

                  {errorMessage && (
                    <div
                      role="alert"
                      className="p-3 rounded-lg bg-[var(--color-error-soft)] border border-[var(--color-error)]/30 text-[var(--color-error)] text-xs flex items-start gap-2"
                    >
                      <ShieldAlert
                        className="size-4 shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  <div className="pt-3 border-t border-[var(--color-rule)] flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleClose}
                      disabled={claimMutation.isPending}
                      className="min-h-11 text-xs text-[var(--color-ink-2)] hover:bg-[var(--color-paper-3)] cursor-pointer"
                    >
                      Batal
                    </Button>
                    <Button
                      type="submit"
                      disabled={claimMutation.isPending || !code.trim()}
                      className="min-h-11 px-4 text-xs font-semibold bg-[var(--color-accent)] text-[var(--color-accent-ink)] hover:brightness-95 cursor-pointer"
                    >
                      {claimMutation.isPending ? (
                        <>
                          <Loader2
                            className="size-3.5 mr-1.5 animate-spin"
                            aria-hidden="true"
                          />
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
        )}
      </dialog>
    </>
  );
}
