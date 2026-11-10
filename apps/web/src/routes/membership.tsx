import { useRef, useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Gift, QrCode } from "lucide-react";
import { z } from "zod";
import { bookSlugSchema } from "@starter/shared/validators/books";
import {
  membershipPlanId,
  membershipUsernameSchema,
  type MembershipPlanDto,
} from "@starter/shared/validators/membership";
import { Brand } from "@/components/brand";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useCheckMembershipRecipient,
  useMembershipPlans,
  useMembershipSummary,
  useStartMembershipCheckout,
} from "@/features/membership/hooks";
import { membershipPlansQuery } from "@/features/membership/queries";
import {
  formatRupiah,
  isMidtransCheckoutUrl,
  MembershipPriceBreakdown,
} from "@/features/membership/presentation";
import { ApiError } from "@/lib/api/client";

const searchSchema = z.object({
  book: bookSlugSchema.shape.slug.optional().catch(undefined),
  plan: membershipPlanId.optional().catch(undefined),
  gift: z.literal(true).optional().catch(undefined),
});

export const Route = createFileRoute("/membership")({
  validateSearch: searchSchema,
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(membershipPlansQuery()),
  head: () => ({ meta: [{ title: "Keanggotaan Nakama | AnzaBook" }] }),
  component: MembershipPage,
});

function MembershipPage() {
  const { session } = Route.useRouteContext();
  const { book, plan, gift } = Route.useSearch();
  const { data: plans } = useMembershipPlans();
  const membership = useMembershipSummary(!!session);
  const selected = plans.find((item) => item.id === plan);
  const back =
    book && session ? (
      <Link to="/read/$slug" params={{ slug: book }} search={{}}>
        Kembali ke e-reader
      </Link>
    ) : session ? (
      <Link to="/app" search={{ tab: "home" }}>
        Kembali ke Home
      </Link>
    ) : (
      <Link to="/">Kembali ke katalog</Link>
    );

  return (
    <div className="min-h-svh bg-background text-foreground flex flex-col">
      <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-8 w-full">
        <Brand />
        <Button asChild variant="ghost" className="min-h-11">
          {back}
        </Button>
      </header>

      <main
        id="main-content"
        className="flex-1 mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-8 md:pt-16 w-full"
      >
        <header className="max-w-2xl space-y-4">
          <p className="font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Keanggotaan AnzaBook
          </p>
          <h1 className="font-serif text-4xl font-bold tracking-tight md:text-5xl">
            Jadi Nakama
          </h1>
          <p className="text-base leading-7 text-muted-foreground md:text-lg">
            Baca naskah Premium selama masa keanggotaanmu. Pilih durasi untuk
            akunmu atau berikan keanggotaan kepada teman.
          </p>
          {membership.data?.status === "expired" && (
            <p className="border-l-2 border-primary pl-3 text-sm">
              Masa aktif Nakama kamu berakhir. Pilih paket untuk membuka kembali
              buku Premium.
            </p>
          )}
        </header>

        <section
          aria-label="Paket Nakama"
          className="mt-9 grid gap-3 sm:grid-cols-3"
        >
          {plans.map((item) => (
            <article
              key={item.id}
              className={`flex flex-col gap-5 rounded-lg border bg-card px-5 py-5 text-card-foreground sm:px-4 lg:px-6 ${item.id === plan ? "border-primary" : "border-border"}`}
            >
              <div>
                <h2 className="font-serif text-xl font-semibold">
                  {item.months} bulan
                </h2>
                <p className="mt-2 font-mono text-2xl font-bold tracking-tight">
                  {formatRupiah(item.tax?.subtotalIdr ?? item.priceIdr)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatRupiah(
                    Math.round(
                      (item.tax?.subtotalIdr ?? item.priceIdr) / item.months,
                    ),
                  )}{" "}
                  per bulan
                  {(item.tax?.taxIdr ?? 0) > 0 && " sebelum pajak"}
                </p>
                {(item.tax?.taxIdr ?? 0) > 0 && (
                  <p className="mt-1 text-sm font-medium">
                    {formatRupiah(item.priceIdr)} setelah pajak
                  </p>
                )}
              </div>
              <div className="grid gap-2 border-t border-border pt-4">
                <PlanLink
                  signedIn={!!session}
                  book={book}
                  plan={item.id}
                  selected={item.id === plan && !gift}
                />
                <PlanLink
                  signedIn={!!session}
                  book={book}
                  plan={item.id}
                  gift
                  selected={item.id === plan && !!gift}
                />
              </div>
            </article>
          ))}
        </section>

        <p className="mt-4 text-sm text-muted-foreground">
          Pembayaran satu kali dengan QRIS. Perpanjangan dilakukan secara
          manual.
        </p>

        {selected && session && (
          <CheckoutReview
            key={`${selected.id}:${!!gift}:${book ?? ""}`}
            plan={selected}
            gift={!!gift}
            book={book}
            available={membership.data?.checkoutAvailable === true}
            statusPending={membership.isPending}
            statusError={membership.isError}
            retryStatus={() => void membership.refetch()}
          />
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function PlanLink({
  signedIn,
  book,
  plan,
  gift,
  selected,
}: {
  signedIn: boolean;
  book?: string;
  plan: MembershipPlanDto["id"];
  gift?: true;
  selected: boolean;
}) {
  const params = new URLSearchParams({ plan });
  if (book) params.set("book", book);
  if (gift) params.set("gift", "true");
  const label = gift ? "Beli sebagai hadiah" : "Pilih paket";
  return (
    <Button
      asChild
      variant={gift ? "outline" : "default"}
      className="min-h-11 whitespace-normal"
    >
      {signedIn ? (
        <Link
          to="/membership"
          search={{ book, plan, gift }}
          hash="ringkasan"
          aria-current={selected ? "true" : undefined}
        >
          {gift && <Gift aria-hidden="true" />}
          {label}
        </Link>
      ) : (
        <Link to="/sign-in" search={{ redirect: `/membership?${params}` }}>
          {gift && <Gift aria-hidden="true" />}
          {label}
        </Link>
      )}
    </Button>
  );
}

function CheckoutReview({
  plan,
  gift,
  book,
  available,
  statusPending,
  statusError,
  retryStatus,
}: {
  plan: MembershipPlanDto;
  gift: boolean;
  book?: string;
  available: boolean;
  statusPending: boolean;
  statusError: boolean;
  retryStatus: () => void;
}) {
  const [username, setUsername] = useState("");
  const [recipientError, setRecipientError] = useState<string>();
  const [paymentError, setPaymentError] = useState<string>();
  const navigate = useNavigate();
  const recipient = useCheckMembershipRecipient();
  const checkout = useStartMembershipCheckout();
  const request = useRef<{ username?: string; id: string } | null>(null);

  const confirmed =
    recipient.data?.username === username.trim().toLowerCase()
      ? recipient.data
      : null;

  function checkRecipient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = membershipUsernameSchema.safeParse({ username });
    setRecipientError(
      result.success ? undefined : result.error.issues[0]?.message,
    );
    if (result.success) recipient.mutate(result.data.username);
  }

  async function pay() {
    if (!available || checkout.isPending || (gift && !confirmed)) return;
    const recipientUsername = confirmed?.username;
    if (!request.current || request.current.username !== recipientUsername) {
      request.current = {
        username: recipientUsername,
        id: crypto.randomUUID(),
      };
    }
    setPaymentError(undefined);
    try {
      const order = await checkout.mutateAsync({
        planId: plan.id,
        requestId: request.current.id,
        recipientUsername,
        bookSlug: gift ? undefined : book,
      });
      if (
        order.status === "pending" &&
        isMidtransCheckoutUrl(order.checkoutUrl)
      ) {
        window.location.assign(order.checkoutUrl);
      } else {
        await navigate({
          to: "/membership/checkout/$orderId",
          params: { orderId: order.id },
        });
      }
    } catch (error) {
      setPaymentError(
        error instanceof ApiError
          ? error.message
          : "Pembayaran belum bisa dibuka. Coba lagi.",
      );
    }
  }

  return (
    <section
      id="ringkasan"
      aria-labelledby="ringkasan-title"
      className="mt-12 max-w-lg space-y-5 border-t border-border pt-6"
    >
      <div>
        <h2 id="ringkasan-title" className="font-serif text-2xl font-bold">
          Ringkasan pembayaran
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Nakama {plan.months} bulan · {gift ? "Hadiah" : "Untuk akunmu"}
        </p>
      </div>

      {gift && (
        <form onSubmit={checkRecipient} className="space-y-2">
          <Label htmlFor="recipient-username">Username penerima</Label>
          <p id="recipient-hint" className="text-sm text-muted-foreground">
            Masukkan username AnzaBook yang diberikan penerima.
          </p>
          <div className="flex flex-wrap gap-2 sm:flex-nowrap">
            <Input
              id="recipient-username"
              className="h-11"
              value={username}
              onChange={(event) => {
                setUsername(event.target.value);
                setRecipientError(undefined);
                recipient.reset();
              }}
              aria-describedby="recipient-hint"
              autoCapitalize="none"
              autoComplete="off"
              spellCheck={false}
              maxLength={24}
              required
            />
            <Button
              type="submit"
              variant="outline"
              className="min-h-11"
              disabled={recipient.isPending || checkout.isPending}
            >
              {recipient.isPending ? "Mengecek…" : "Cek penerima"}
            </Button>
          </div>
          {(recipientError || recipient.error) && (
            <p role="alert" className="text-sm text-destructive">
              {recipientError ??
                (recipient.error instanceof ApiError
                  ? recipient.error.message
                  : "Penerima belum dapat dicek. Coba lagi.")}
            </p>
          )}
          {confirmed && (
            <p role="status" className="text-sm">
              Hadiah dikirim ke{" "}
              <strong>
                {confirmed.displayName} (@{confirmed.username})
              </strong>
              .
            </p>
          )}
        </form>
      )}

      <MembershipPriceBreakdown total={plan.priceIdr} tax={plan.tax} />
      {!available && (
        <div className="text-sm text-muted-foreground">
          <p role="status">
            {statusPending
              ? "Memeriksa ketersediaan pembayaran…"
              : statusError
                ? "Status pembayaran belum dapat dimuat."
                : "Pembayaran QRIS belum tersedia saat ini."}
          </p>
          {statusError && (
            <Button type="button" variant="link" onClick={retryStatus}>
              Muat ulang
            </Button>
          )}
        </div>
      )}
      {paymentError && (
        <p role="alert" className="text-sm text-destructive">
          {paymentError}
        </p>
      )}
      <Button
        type="button"
        className="min-h-11"
        disabled={!available || checkout.isPending || (gift && !confirmed)}
        onClick={() => void pay()}
      >
        <QrCode aria-hidden="true" />
        {checkout.isPending ? "Membuka QRIS…" : "Bayar dengan QRIS"}
        <ArrowRight aria-hidden="true" />
      </Button>
      {book && (
        <Button variant="ghost" asChild className="ml-2 min-h-11">
          <Link to="/read/$slug" params={{ slug: book }} search={{}}>
            <ArrowLeft aria-hidden="true" /> Lanjut baca
          </Link>
        </Button>
      )}
    </section>
  );
}
