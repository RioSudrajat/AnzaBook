import { describe, expect, it, vi } from "vitest";
import { createMembershipMailer } from "../services/membership-mail";

const config = {
  clientId: "client-id",
  clientSecret: "client-secret",
  refreshToken: "refresh-token",
  from: "membership@example.com",
  webUrl: "https://anzabook.example",
};

describe("membership email delivery", () => {
  it("authorizes a sender and sends a text reminder through the Gmail API", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ access_token: "access-token" }))
      .mockResolvedValueOnce(Response.json({ id: "gmail-message-id" }));
    const send = createMembershipMailer(config, fetchMock);

    await send({
      to: "reader@example.com",
      kind: "expired",
      expiresAt: new Date("2026-12-05T13:00:00.000Z"),
      deliveryKey: "reminder-key",
    });

    const [tokenCall, gmailCall] = fetchMock.mock.calls;
    expect(tokenCall[0]).toBe("https://oauth2.googleapis.com/token");
    expect((tokenCall[1]?.body as URLSearchParams).get("grant_type")).toBe(
      "refresh_token",
    );
    expect(gmailCall[0]).toBe(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    );
    expect(gmailCall[1]?.headers).toMatchObject({
      Authorization: "Bearer access-token",
    });
    const { raw } = JSON.parse(String(gmailCall[1]?.body)) as { raw: string };
    const message = Buffer.from(raw, "base64url").toString("utf8");
    expect(message).toContain("To: reader@example.com\r\n");
    expect(message).toContain("Subject: Akses Nakama sudah berakhir\r\n");
    expect(message).toContain("Message-ID: <reminder-key@anzabook.example>");
    expect(message).toContain("https://anzabook.example/membership");
  });

  it("rejects unsafe addresses before contacting the mail service", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    const send = createMembershipMailer(config, fetchMock);
    await expect(
      send({
        to: "reader@example.com\r\nBcc: hidden@example.com",
        kind: "expiring",
        expiresAt: new Date(),
        deliveryKey: "reminder-key",
      }),
    ).rejects.toThrow("Invalid reminder recipient");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
