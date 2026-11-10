import { useEffect, useRef } from "react";
import {
  createFileRoute,
  Link,
  notFound,
  useNavigate,
} from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { membershipOrderId } from "@starter/shared/validators/membership";
import { Button } from "@/components/ui/button";
import { booksKeys } from "@/features/books/queries";
import {
  useMembershipOrder,
  useRefreshMembershipOrder,
} from "@/features/membership/hooks";
import {
  formatMembershipDate,
  isMidtransCheckoutUrl,
  MembershipPriceBreakdown,
  orderStatusLabel,
} from "@/features/membership/presentation";
import {
  membershipKeys,
  membershipOrderQuery,
} from "@/features/membership/queries";
import { ApiError } from "@/lib/api/client";

export const Route = createFileRoute(
  "/_protected/membership/checkout/$orderId",
)({
  loader: async ({ context, params }) => {
    if (!membershipOrderId.safeParse(params.orderId).success) throw notFound();
    try {
      return await context.queryClient.ensureQueryData(
        membershipOrderQuery(params.orderId),
      );
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) throw notFound();
      throw error;
    }
  },
  head: () => ({ meta: [{ title: "Pembayaran Nakama | AnzaBook" }] }),
  component: MembershipCheckoutPage,
});

function MembershipCheckoutPage() {
  const { orderId } = Route.useParams();
  return <CheckoutStatus key={orderId} orderId={orderId} />;
}

function CheckoutStatus({ orderId }: { orderId: string }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const orderQuery = useMembershipOrder(orderId);
  const { data: order } = orderQuery;
  const {
    mutate: refresh,
    isPending: refreshing,
    error: refreshError,
  } = useRefreshMembershipOrder(orderId);
  const checked = useRef(false);
  const returned = useRef(false);
  const status = order?.status;
  const returnBook =
    order && !order.recipientUsername && !order.accessRevoked
      ? order.bookSlug
      : null;

  useEffect(() => {
    if (status !== "pending" || checked.current) return;
    checked.current = true;
    refresh();
  }, [status, refresh]);

  useEffect(() => {
    if (status !== "paid" || returned.current) return;
    returned.current = true;
    void queryClient.invalidateQueries({ queryKey: membershipKeys.summary });
    if (returnBook) {
      void queryClient.invalidateQueries({ queryKey: booksKeys.readers() });
      void navigate({
        to: "/read/$slug",
        params: { slug: returnBook },
        search: {},
        replace: true,
      });
    }
  }, [status, returnBook, queryClient, navigate]);

  if (!order) {
    return (
      <section className="space-y-4" aria-live="polite">
        <h1 className="font-serif text-3xl font-bold">Pembayaran Nakama</h1>
        <p>
          {orderQuery.isError
            ? "Status pembayaran belum bisa dimuat."
            : "Memuat status pembayaran…"}
        </p>
        {orderQuery.isError && (
          <Button onClick={() => void orderQuery.refetch()}>Muat ulang</Button>
        )}
      </section>
    );
  }

  return (
    <section className="max-w-lg space-y-6" aria-labelledby="checkout-title">
      <header className="space-y-2">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Pembayaran Nakama
        </p>
        <h1
          id="checkout-title"
          aria-live="polite"
          className="font-serif text-3xl font-bold"
        >
          {orderStatusLabel[order.status]}
        </h1>
        <p className="text-sm text-muted-foreground">
          Nakama {order.months} bulan ·{" "}
          {order.recipientUsername
            ? `Hadiah untuk @${order.recipientUsername}`
            : "Untuk akunmu"}
        </p>
      </header>

      <MembershipPriceBreakdown total={order.priceIdr} tax={order.tax} />

      {order.status === "pending" && (
        <div className="space-y-4">
          <p className="text-sm leading-6 text-muted-foreground">
            Akses dibuka setelah pembayaran QRIS terverifikasi. Halaman ini akan
            memantau status pesanan.
          </p>
          {refreshError && (
            <p role="alert" className="text-sm text-destructive">
              Status belum dapat diperiksa. Coba lagi.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {isMidtransCheckoutUrl(order.checkoutUrl) && (
              <Button asChild className="min-h-11">
                <a href={order.checkoutUrl}>Lanjutkan pembayaran QRIS</a>
              </Button>
            )}
            <Button
              variant="outline"
              className="min-h-11"
              disabled={refreshing}
              onClick={() => refresh()}
            >
              {refreshing ? "Memeriksa…" : "Periksa pembayaran"}
            </Button>
          </div>
        </div>
      )}

      {order.status === "paid" && (
        <div className="space-y-4">
          <p className="text-sm">
            {order.accessRevoked
              ? "Keanggotaan dari pesanan ini sudah dibatalkan."
              : order.recipientUsername
                ? `Pembayaran hadiah Nakama untuk @${order.recipientUsername} terverifikasi.`
                : "Pembayaran Nakama untuk akunmu terverifikasi."}
            {order.paidAt && ` Dibayar ${formatMembershipDate(order.paidAt)}.`}
          </p>
          {returnBook && (
            <Button asChild className="min-h-11">
              <Link to="/read/$slug" params={{ slug: returnBook }} search={{}}>
                Kembali ke e-reader
              </Link>
            </Button>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-t border-border pt-5">
        {order.status !== "pending" && order.status !== "paid" && (
          <Button asChild className="min-h-11">
            <Link
              to="/membership"
              search={{
                book: order.bookSlug ?? undefined,
                plan: order.planId,
                gift: order.recipientUsername ? true : undefined,
              }}
              hash="ringkasan"
            >
              Pilih paket lagi
            </Link>
          </Button>
        )}
        <Button asChild variant="ghost" className="min-h-11">
          <Link to="/app" search={{ tab: "settings" }}>
            Kembali ke pengaturan
          </Link>
        </Button>
      </div>
    </section>
  );
}
