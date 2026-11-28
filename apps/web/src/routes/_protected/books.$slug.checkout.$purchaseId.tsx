import { useEffect, useRef } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  CheckCircle2,
  ExternalLink,
  QrCode,
  RefreshCw,
} from "lucide-react";
import {
  bookPurchaseOrderId,
  bookSlugSchema,
} from "@starter/shared/validators/books";
import { parseMidtransCheckoutUrl } from "@starter/shared/validators/membership";
import type { BookPurchaseOrderDto } from "@starter/shared/types";
import { SmartBackButton } from "@/components/smart-back-button";
import { Button } from "@/components/ui/button";
import { bookPagePath } from "@/features/books/book-share";
import {
  useBookPurchaseOrder,
  useRefreshBookPurchaseOrder,
} from "@/features/books/hooks";
import { bookPurchaseOrderQuery, booksKeys } from "@/features/books/queries";
import {
  formatMembershipDate,
  formatRupiah,
} from "@/features/membership/presentation";
import { ApiError } from "@/lib/api/client";

const purchaseStatusLabel: Record<BookPurchaseOrderDto["status"], string> = {
  pending: "Menunggu Pembayaran",
  paid: "Pembayaran Lunas — Akses Buku Aktif Selamanya",
  failed: "Pembayaran Gagal",
  canceled: "Pembayaran Dibatalkan",
  expired: "Pembayaran Kedaluwarsa",
  refunded: "Dana Dikembalikan",
};

const rateFormatter = new Intl.NumberFormat("id-ID");

export const Route = createFileRoute(
  "/_protected/books/$slug/checkout/$purchaseId",
)({
  loader: async ({ context, params }) => {
    if (
      !bookSlugSchema.shape.slug.safeParse(params.slug).success ||
      !bookPurchaseOrderId.safeParse(params.purchaseId).success
    ) {
      throw notFound();
    }
    try {
      const order = await context.queryClient.ensureQueryData(
        bookPurchaseOrderQuery(params.purchaseId),
      );
      if (order.bookSlug !== params.slug) throw notFound();
      return order;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) throw notFound();
      throw error;
    }
  },
  head: () => ({ meta: [{ title: "Pembayaran Buku Digital | AnzaBook" }] }),
  component: BookCheckoutPage,
});

function BookCheckoutPage() {
  const { slug, purchaseId } = Route.useParams();
  return (
    <BookCheckoutStatus key={purchaseId} slug={slug} purchaseId={purchaseId} />
  );
}

function BookCheckoutStatus({
  slug,
  purchaseId,
}: {
  slug: string;
  purchaseId: string;
}) {
  const queryClient = useQueryClient();
  const orderQuery = useBookPurchaseOrder(purchaseId);
  const { data: order } = orderQuery;
  const {
    mutate: refresh,
    isPending: refreshing,
    error: refreshError,
  } = useRefreshBookPurchaseOrder(purchaseId, slug);

  const initialCheckedRef = useRef(false);
  const paidSyncedRef = useRef(false);
  const status = order?.status;

  useEffect(() => {
    if (status !== "pending" || initialCheckedRef.current) return;
    initialCheckedRef.current = true;
    refresh();
  }, [status, refresh]);

  useEffect(() => {
    if (status !== "pending") return;

    const triggerRefreshIfVisible = () => {
      if (document.visibilityState === "visible" && !refreshing) {
        refresh();
      }
    };

    const intervalId = window.setInterval(triggerRefreshIfVisible, 5000);
    window.addEventListener("focus", triggerRefreshIfVisible);
    document.addEventListener("visibilitychange", triggerRefreshIfVisible);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", triggerRefreshIfVisible);
      document.removeEventListener("visibilitychange", triggerRefreshIfVisible);
    };
  }, [status, refreshing, refresh]);

  useEffect(() => {
    if (status !== "paid" || paidSyncedRef.current) return;
    paidSyncedRef.current = true;
    void queryClient.invalidateQueries({ queryKey: booksKeys.detail(slug) });
    void queryClient.invalidateQueries({ queryKey: booksKeys.readers() });
  }, [status, slug, queryClient]);

  if (!order) {
    return (
      <section className="max-w-lg space-y-4" aria-live="polite">
        <SmartBackButton
          fallbackTo={bookPagePath(slug)}
          label="Kembali ke Detail Buku"
          className="-ml-2"
        />
        <h1 className="font-serif text-3xl font-bold text-[var(--color-ink)]">
          Pembayaran Buku Digital
        </h1>
        <p className="text-sm text-[var(--color-ink-2)]">
          {orderQuery.isError
            ? "Status pembayaran belum bisa dimuat."
            : "Memuat status pembayaran…"}
        </p>
        {orderQuery.isError && (
          <Button
            type="button"
            onClick={() => void orderQuery.refetch()}
            className="min-h-11 bg-[var(--color-accent)] text-[var(--color-accent-ink)] hover:brightness-95"
          >
            Muat ulang
          </Button>
        )}
      </section>
    );
  }

  const verifiedCheckoutUrl =
    order.checkoutUrl && parseMidtransCheckoutUrl(order.checkoutUrl)
      ? order.checkoutUrl
      : null;
  const canOpenPayment =
    (order.status === "pending" || order.status === "failed") &&
    verifiedCheckoutUrl !== null;

  return (
    <section
      className="max-w-lg space-y-6"
      aria-labelledby="book-checkout-title"
    >
      <SmartBackButton
        fallbackTo={bookPagePath(slug)}
        label="Kembali ke Detail Buku"
        className="-ml-2"
      />

      <header className="space-y-3">
        <p className="font-mono text-xs uppercase tracking-widest text-[var(--color-muted)]">
          Pembayaran Buku Digital
        </p>
        <h1
          id="book-checkout-title"
          aria-live="polite"
          className="font-serif text-3xl font-bold text-[var(--color-ink)] leading-tight"
        >
          {purchaseStatusLabel[order.status]}
        </h1>

        <div className="flex items-center gap-3.5 pt-2">
          {order.bookCoverUrl ? (
            <img
              src={order.bookCoverUrl}
              alt={order.bookTitle}
              className="w-14 aspect-[2/3] rounded-md object-cover border border-[var(--color-rule)] shrink-0"
            />
          ) : (
            <div className="w-14 aspect-[2/3] rounded-md bg-[var(--color-paper-3)] border border-[var(--color-rule)] flex items-center justify-center shrink-0">
              <BookOpen
                className="size-5 text-[var(--color-muted)]"
                aria-hidden="true"
              />
            </div>
          )}
          <div className="min-w-0 space-y-1">
            <h2 className="font-serif text-lg font-semibold text-[var(--color-ink)] leading-snug">
              {order.bookTitle}
            </h2>
            <p className="font-mono text-xs text-[var(--color-muted)]">
              Dibuat {formatMembershipDate(order.createdAt)}
            </p>
          </div>
        </div>
      </header>

      <div className="rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-4">
        <dl className="space-y-2.5 text-sm tabular-nums">
          {order.tax !== null && (
            <>
              <div className="flex justify-between gap-4 text-[var(--color-muted)]">
                <dt>Subtotal</dt>
                <dd>{formatRupiah(order.tax.subtotalIdr)}</dd>
              </div>
              <div className="flex justify-between gap-4 text-[var(--color-muted)]">
                <dt>PPN ({rateFormatter.format(order.tax.rateBps / 100)}%)</dt>
                <dd>{formatRupiah(order.tax.taxIdr)}</dd>
              </div>
            </>
          )}
          <div
            className={`flex justify-between gap-4 font-semibold text-base text-[var(--color-ink)] ${
              order.tax !== null
                ? "border-t border-[var(--color-rule)] pt-3"
                : ""
            }`}
          >
            <dt>Total Bayar</dt>
            <dd>{formatRupiah(order.priceIdr)}</dd>
          </div>
        </dl>
      </div>

      {(order.status === "pending" || order.status === "failed") && (
        <div className="space-y-4">
          <p className="text-sm leading-6 text-[var(--color-ink-2)]">
            {order.status === "pending"
              ? "Akses penuh buku dibuka otomatis setelah pembayaran QRIS terverifikasi. Halaman ini memantau status pembayaran Anda."
              : "Pembayaran sebelumnya belum berhasil. Anda dapat membuka ulang tautan QRIS atau memeriksa status terkini."}
          </p>

          {refreshError && (
            <p
              role="alert"
              className="text-sm text-[var(--color-error)] font-sans"
            >
              Status belum dapat diperiksa. Coba lagi.
            </p>
          )}

          <div className="flex flex-wrap gap-2.5">
            {canOpenPayment && verifiedCheckoutUrl && (
              <Button
                asChild
                className="min-h-11 bg-[var(--color-accent)] text-[var(--color-accent-ink)] hover:brightness-95 font-semibold gap-2"
              >
                <a
                  href={verifiedCheckoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <QrCode className="size-4" aria-hidden="true" />
                  <span>Buka Pembayaran QRIS Midtrans</span>
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                </a>
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              className="min-h-11 border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink)] hover:bg-[var(--color-paper-3)] gap-2 cursor-pointer"
              disabled={refreshing}
              onClick={() => refresh()}
            >
              <RefreshCw
                className={`size-4 ${refreshing ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              <span>
                {refreshing ? "Memeriksa…" : "Periksa Status Pembayaran"}
              </span>
            </Button>
          </div>
        </div>
      )}

      {order.status === "paid" && (
        <div className="space-y-4 rounded-xl border border-[var(--color-green)]/25 bg-[var(--color-green-soft)] p-4">
          <div className="flex items-start gap-2.5 text-sm text-[var(--color-green)]">
            <CheckCircle2
              className="size-5 shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div className="space-y-1">
              <p className="font-semibold">
                Pembayaran Lunas — Akses Buku Aktif Selamanya
              </p>
              {order.paidAt && (
                <p className="text-xs opacity-90">
                  Dibayar pada {formatMembershipDate(order.paidAt)}.
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5 pt-1">
            <Button
              asChild
              className="min-h-11 bg-[var(--color-accent)] text-[var(--color-accent-ink)] hover:brightness-95 font-semibold gap-2"
            >
              <Link to="/read/$slug" params={{ slug }} search={{}}>
                <BookOpen className="size-4" aria-hidden="true" />
                <span>Mulai Membaca Buku</span>
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="min-h-11 border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink)] hover:bg-[var(--color-paper-3)]"
            >
              <Link to="/books/$slug" params={{ slug }}>
                Kembali ke Detail Buku
              </Link>
            </Button>
          </div>
        </div>
      )}

      {order.status !== "pending" && order.status !== "paid" && (
        <div className="flex flex-wrap gap-2.5 border-t border-[var(--color-rule)] pt-5">
          <Button
            asChild
            variant="outline"
            className="min-h-11 border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink)] hover:bg-[var(--color-paper-3)]"
          >
            <Link to="/books/$slug" params={{ slug }}>
              Kembali ke Detail Buku
            </Link>
          </Button>
        </div>
      )}
    </section>
  );
}
