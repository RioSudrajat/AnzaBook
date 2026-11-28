import { useRef, useState, useSyncExternalStore } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  BookOpen,
  CheckCircle2,
  KeyRound,
  Loader2,
  ShoppingBag,
} from "lucide-react";
import type { BookDetailDto } from "@starter/shared/types";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import { useStartBookCheckout } from "../hooks";
import { ClaimCodeDialog } from "./claim-code-dialog";

const rupiahFormatter = new Intl.NumberFormat("id-ID");

function formatRupiahPrice(value: number): string {
  return `Rp${rupiahFormatter.format(value)}`;
}

const subscribeNoop = () => () => {};

function getAffiliateSnapshot(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const params = new URLSearchParams(window.location.search);
  const raw =
    params.get("ref") || sessionStorage.getItem("anzabook_affiliate_ref");
  const normalized = raw?.trim().replace(/^cal_/, "");
  return normalized || undefined;
}

type SinglePurchaseCardProps = {
  book: BookDetailDto;
  isLoggedIn: boolean;
  onStartReading: () => void;
  onReadSample: () => void;
  returnTo?: string | null;
};

export function SinglePurchaseCard({
  book,
  isLoggedIn,
  onStartReading,
  onReadSample,
  returnTo,
}: SinglePurchaseCardProps) {
  const navigate = useNavigate();
  const startCheckout = useStartBookCheckout(book.slug);
  const requestIdRef = useRef<{ slug: string; id: string } | null>(null);
  const [checkoutErrorState, setCheckoutErrorState] = useState<{
    slug: string;
    message: string;
  } | null>(null);

  const affiliateCalendarSlug = useSyncExternalStore(
    subscribeNoop,
    getAffiliateSnapshot,
    () => undefined,
  );

  const checkoutError =
    checkoutErrorState?.slug === book.slug ? checkoutErrorState.message : null;

  const hasFullAccess = Boolean(
    book.hasPurchasedDigital || book.hasClaimedDigital,
  );
  const hasPrice =
    typeof book.digitalPriceIdr === "number" && book.digitalPriceIdr > 0;
  const formattedPrice = hasPrice
    ? formatRupiahPrice(book.digitalPriceIdr!)
    : null;
  const hasAffiliateRef = Boolean(affiliateCalendarSlug);

  const handleCheckout = async () => {
    if (startCheckout.isPending) return;
    setCheckoutErrorState(null);
    if (!requestIdRef.current || requestIdRef.current.slug !== book.slug) {
      requestIdRef.current = { slug: book.slug, id: crypto.randomUUID() };
    }
    try {
      const order = await startCheckout.mutateAsync({
        requestId: requestIdRef.current.id,
        affiliateCalendarSlug,
      });
      requestIdRef.current = null;
      await navigate({
        to: "/books/$slug/checkout/$purchaseId",
        params: { slug: book.slug, purchaseId: order.id },
      });
    } catch (error) {
      setCheckoutErrorState({
        slug: book.slug,
        message:
          error instanceof ApiError
            ? error.message
            : "Pembayaran buku belum dapat dibuka. Silakan coba lagi.",
      });
    }
  };

  if (hasFullAccess) {
    return (
      <div className="w-full rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-4 space-y-3.5 text-left">
        <div className="flex items-start gap-2.5 text-xs font-sans text-[var(--color-green)]">
          <CheckCircle2 className="size-4 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="font-semibold leading-snug">
            Akses Digital Penuh Aktif — Milik Anda Selamanya
          </p>
        </div>

        <Button
          type="button"
          onClick={onStartReading}
          size="lg"
          className="w-full min-h-11 bg-[var(--color-accent)] hover:brightness-95 text-[var(--color-accent-ink)] font-semibold text-xs gap-2 cursor-pointer"
        >
          <BookOpen className="size-4" aria-hidden="true" />
          <span>Mulai Membaca Buku Lengkap</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-4 space-y-3.5 text-left">
      <div className="space-y-1.5">
        <p className="font-mono text-[11px] uppercase tracking-wider text-[var(--color-muted)]">
          Beli Satuan Digital
        </p>
        {formattedPrice && (
          <p className="font-serif text-2xl font-bold text-[var(--color-ink)] tabular-nums">
            {formattedPrice}
          </p>
        )}
        <p className="font-sans text-xs leading-relaxed text-[var(--color-ink-2)]">
          Akses penuh semua chapter selamanya + mendukung penulis &amp; penerbit
          lokal 75%.
        </p>
        {hasAffiliateRef && (
          <p className="font-mono text-[11px] text-[var(--color-green)]">
            10% mendukung kas komunitas literasi
          </p>
        )}
      </div>

      <div className="space-y-2.5 pt-1">
        {isLoggedIn ? (
          <Button
            type="button"
            onClick={() => void handleCheckout()}
            disabled={startCheckout.isPending}
            size="lg"
            className="w-full min-h-11 bg-[var(--color-accent)] hover:brightness-95 text-[var(--color-accent-ink)] font-semibold text-xs gap-2 cursor-pointer"
          >
            {startCheckout.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                <span>Menyiapkan Pembayaran...</span>
              </>
            ) : (
              <>
                <ShoppingBag className="size-4" aria-hidden="true" />
                <span>
                  {formattedPrice
                    ? `Beli Buku Digital — ${formattedPrice}`
                    : "Beli Buku Digital"}
                </span>
              </>
            )}
          </Button>
        ) : (
          <Button
            asChild
            size="lg"
            className="w-full min-h-11 bg-[var(--color-accent)] hover:brightness-95 text-[var(--color-accent-ink)] font-semibold text-xs gap-2"
          >
            <Link to="/sign-in" search={{ redirect: `/books/${book.slug}` }}>
              <ShoppingBag className="size-4" aria-hidden="true" />
              <span>
                {formattedPrice
                  ? `Beli Buku Digital — ${formattedPrice}`
                  : "Beli Buku Digital"}
              </span>
            </Link>
          </Button>
        )}

        {checkoutError && (
          <p
            role="alert"
            className="text-xs font-sans text-[var(--color-error)]"
          >
            {checkoutError}
          </p>
        )}

        <Button
          type="button"
          onClick={onReadSample}
          variant="outline"
          size="lg"
          className="w-full min-h-11 border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink)] hover:bg-[var(--color-paper-3)] font-medium text-xs gap-2 cursor-pointer"
        >
          <BookOpen className="size-4" aria-hidden="true" />
          <span>Baca Cuplikan Chapter 1</span>
        </Button>
      </div>

      <div className="pt-3 border-t border-[var(--color-rule)]">
        {isLoggedIn ? (
          <ClaimCodeDialog
            slug={book.slug}
            bookTitle={book.title}
            hasClaimedDigital={book.hasClaimedDigital}
            returnTo={returnTo}
            className="w-full"
          />
        ) : (
          <Button
            asChild
            variant="outline"
            size="sm"
            className="w-full min-h-11 font-mono text-xs gap-1.5 border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink)] hover:bg-[var(--color-paper-3)]"
          >
            <Link to="/sign-in" search={{ redirect: `/books/${book.slug}` }}>
              <KeyRound
                className="size-3.5 text-[var(--color-accent)]"
                aria-hidden="true"
              />
              <span>Klaim Akses Digital Buku Fisik</span>
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
