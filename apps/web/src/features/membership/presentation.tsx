import type {
  MembershipOrderStatus,
  MembershipPlanDto,
} from "@starter/shared/validators/membership";

const rupiah = new Intl.NumberFormat("id-ID");
const calendar = new Intl.DateTimeFormat("id-ID", {
  day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta",
});

export function formatRupiah(value: number) {
  return `Rp${rupiah.format(value)}`;
}

export function formatMembershipDate(value: string) {
  return calendar.format(new Date(value));
}

export const orderStatusLabel: Record<MembershipOrderStatus, string> = {
  pending: "Menunggu pembayaran",
  paid: "Sudah dibayar",
  failed: "Pembayaran gagal",
  canceled: "Dibatalkan",
  expired: "Pembayaran kedaluwarsa",
  refunded: "Dana dikembalikan",
};

export function isMidtransCheckoutUrl(value: string | null): value is string {
  if (!value) return false;
  const url = URL.parse(value);
  return !!url && !url.username && !url.password && (
    url.origin === "https://app.sandbox.midtrans.com" || url.origin === "https://app.midtrans.com"
  ) && url.pathname.startsWith("/snap/v2/vtweb/");
}

export function MembershipPriceBreakdown({
  total,
  tax,
}: {
  total: number;
  tax: MembershipPlanDto["tax"];
}) {
  return (
    <dl className="space-y-2 text-sm tabular-nums">
      {tax && (
        <>
          <div className="flex justify-between gap-4 text-muted-foreground">
            <dt>Harga sebelum pajak</dt>
            <dd>{formatRupiah(tax.subtotalIdr)}</dd>
          </div>
          <div className="flex justify-between gap-4 text-muted-foreground">
            <dt>Pajak ({rupiah.format(tax.rateBps / 100)}%)</dt>
            <dd>{formatRupiah(tax.taxIdr)}</dd>
          </div>
        </>
      )}
      <div className="flex justify-between gap-4 border-t border-border pt-3 text-base font-semibold">
        <dt>Total pembayaran</dt>
        <dd>{formatRupiah(total)}</dd>
      </div>
    </dl>
  );
}
