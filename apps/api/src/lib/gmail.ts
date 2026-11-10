import { z } from "zod";

type GmailConfig = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  from: string;
};

type GmailMessage = {
  to: string;
  subject: string;
  text: string;
  messageId?: string;
};

const emailAddress = z.email();
const accessToken = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().positive().default(3600),
});

export function createGmailSender(config: GmailConfig, request = fetch) {
  const from = emailAddress.parse(config.from);
  let cachedToken: { value: string; expiresAt: number } | undefined;

  async function authorize() {
    if (cachedToken && cachedToken.expiresAt > Date.now())
      return cachedToken.value;
    const response = await request("https://oauth2.googleapis.com/token", {
      method: "POST",
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: config.refreshToken,
        grant_type: "refresh_token",
      }),
      redirect: "error",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error("Gmail authorization failed");
    const token = accessToken.safeParse(await response.json());
    if (!token.success)
      throw new Error("Gmail authorization response was invalid");
    cachedToken = {
      value: token.data.access_token,
      expiresAt: Date.now() + (token.data.expires_in - 30) * 1000,
    };
    return cachedToken.value;
  }

  return async ({ to, subject, text, messageId }: GmailMessage) => {
    if (!emailAddress.safeParse(to).success)
      throw new Error("Invalid reminder recipient");
    if (
      /[\r\n]/.test(subject) ||
      (messageId && !/^[\w.-]+@[\w.-]+$/.test(messageId))
    ) {
      throw new Error("Invalid email header");
    }
    const encodedSubject = /^[\x20-\x7e]*$/.test(subject)
      ? subject
      : `=?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`;
    const mime = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${encodedSubject}`,
      `Date: ${new Date().toUTCString()}`,
      ...(messageId ? [`Message-ID: <${messageId}>`] : []),
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=UTF-8",
      "Content-Transfer-Encoding: 8bit",
      "",
      text.replace(/\r?\n/g, "\r\n"),
    ].join("\r\n");

    const token = await authorize();
    const response = await request(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw: Buffer.from(mime).toString("base64url") }),
        redirect: "error",
        signal: AbortSignal.timeout(5000),
      },
    );
    if (response.status === 401) cachedToken = undefined;
    if (!response.ok) throw new Error("Gmail delivery failed");
  };
}
