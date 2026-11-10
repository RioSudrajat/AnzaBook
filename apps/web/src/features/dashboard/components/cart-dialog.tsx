import { ShoppingCart, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type CartDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  cartCount: number;
  onExplore: () => void;
};

export function CartDialog({
  isOpen,
  onClose,
  cartCount,
  onExplore,
}: CartDialogProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-title"
      className="fixed inset-0 z-50 flex items-start justify-end p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 text-foreground"
    >
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl overflow-hidden mt-12 sm:mt-14 animate-in slide-in-from-top-2 duration-200">
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-2">
            <ShoppingCart className="size-4 text-[var(--color-accent)]" />
            <h3 id="cart-title" className="font-serif font-bold text-base">
              Keranjang Belanja
            </h3>
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-full bg-muted text-muted-foreground">
              {cartCount} item
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 min-w-11 inline-flex items-center justify-center text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring"
            aria-label="Tutup"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="p-6 text-center space-y-4">
          <div className="size-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
            <ShoppingCart className="size-5" />
          </div>

          <div className="space-y-1">
            <p className="font-serif font-bold text-base">Keranjang Kamu Kosong</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Kamu belum memasukkan edisi cetak rakyat atau cinderamata literasi ke dalam keranjang.
            </p>
          </div>

          <Button
            type="button"
            onClick={() => {
              onClose();
              onExplore();
            }}
            className="w-full bg-[var(--color-accent)] text-white hover:opacity-90 font-medium gap-1.5 cursor-pointer text-xs"
          >
            <span>Jelajahi Katalog Buku</span>
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
