import { createGmailSender } from "../lib/gmail";

export type MembershipReminderEmail = {
  to: string;
  kind: "expiring" | "expired";
  expiresAt: Date;
  deliveryKey: string;
};

type Config = Parameters<typeof createGmailSender>[0] & { webUrl: string };
const dateFormat = new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeZone: "Asia/Jakarta" });

export function createMembershipMailer(config: Config, request = fetch) {
  const send = createGmailSender(config, request);
  const membershipPage = new URL("/membership", config.webUrl);

  return ({ to, kind, expiresAt, deliveryKey }: MembershipReminderEmail) => {
    const date = dateFormat.format(expiresAt);
    const expired = kind === "expired";
    return send({
      to,
      subject: expired ? "Akses Nakama sudah berakhir" : "Akses Nakama segera berakhir",
      text: [
        expired ? `Akses Nakama berakhir pada ${date}.` : `Akses Nakama akan berakhir pada ${date}.`,
        "Posisi bacamu tetap tersimpan.",
        `Perpanjang Nakama di ${membershipPage.href}`,
        "Kamu bisa mengubah preferensi email di Pengaturan AnzaBook.",
      ].join("\n\n"),
      messageId: `${deliveryKey}@${membershipPage.hostname}`,
    });
  };
}
