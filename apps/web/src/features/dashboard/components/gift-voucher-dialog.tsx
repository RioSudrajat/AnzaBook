import { useState } from "react";
import { Copy, Check, Gift, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type GiftVoucherDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
};

const DEFAULT_GIFT_CODE = "ANZA-GIFT-NAKAMA26";

export function GiftVoucherDialog({
  isOpen,
  onClose,
  userName,
}: GiftVoucherDialogProps) {
  const [recipientEmail, setRecipientEmail] = useState("");
  const [copied, setCopied] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const giftCode = DEFAULT_GIFT_CODE;

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(giftCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (recipientEmail.trim()) {
      setIsSent(true);
      setTimeout(() => {
        setIsSent(false);
        setRecipientEmail("");
        onClose();
      }, 1600);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="voucher-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150 text-foreground"
    >
      <div className="max-w-md w-full bg-card border border-border rounded-2xl p-6 shadow-2xl relative space-y-5">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 min-h-11 min-w-11 inline-flex items-center justify-center text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring"
          aria-label="Tutup"
        >
          <X className="size-4" />
        </button>

        <div className="flex items-center gap-2.5 text-xs font-mono text-[var(--color-accent)] font-semibold">
          <Gift className="size-4" />
          <span>Hadiahkan Literasi</span>
        </div>

        <div>
          <h3 id="voucher-title" className="font-serif text-xl font-bold">
            Hadiahkan Gift Voucher
          </h3>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            Kirimkan akses baca dan voucher pustaka untuk kawan atau kerabat.
          </p>
        </div>

        {/* Voucher Preview Card */}
        <div className="p-4 rounded-xl border border-dashed border-border bg-muted/40 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-mono">Kode Voucher Eksklusif</span>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-[var(--color-accent)]/15 text-[var(--color-accent)] font-bold">
              1 Bulan Nakama
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 bg-background p-2.5 rounded-lg border border-border">
            <code className="font-mono text-sm font-bold tracking-wider text-foreground">
              {giftCode}
            </code>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="h-8 gap-1.5 text-xs cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="size-3.5 text-emerald-500" />
                  <span>Tersalin</span>
                </>
              ) : (
                <>
                  <Copy className="size-3.5" />
                  <span>Salin</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Send to Email Form */}
        <form onSubmit={handleSend} className="space-y-3">
          <label htmlFor="recipient-email" className="block text-xs font-medium text-muted-foreground">
            Kirim langsung ke email kawan:
          </label>
          <div className="flex gap-2">
            <Input
              id="recipient-email"
              type="email"
              required
              placeholder="kawan@literasi.id"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={isSent}
              className="bg-[var(--color-accent)] text-white hover:opacity-90 font-medium cursor-pointer"
            >
              {isSent ? "Terkirim!" : "Kirim Hadiah"}
            </Button>
          </div>
        </form>

        <p className="text-[11px] text-muted-foreground text-center">
          Penerima akan menerima email aktivasi dengan ucapan hangat dari {userName}.
        </p>
      </div>
    </div>
  );
}
