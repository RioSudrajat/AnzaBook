import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import {
  ac,
  ADMIN_ROLES,
  DEFAULT_ROLE,
  roles,
} from "@starter/shared/permissions";
import { siteConfig } from "@starter/shared/site";
import { env } from "../config/env";
import { db } from "../db";
import * as schema from "../db/schema";
import { logger } from "./logger";
import { createGmailSender } from "./gmail";

const authLog = logger.child({ module: "better-auth" });
const sendVerification = env.GMAIL_CLIENT_ID && env.GMAIL_CLIENT_SECRET &&
  env.GMAIL_REFRESH_TOKEN && env.GMAIL_FROM
  ? createGmailSender({
      clientId: env.GMAIL_CLIENT_ID,
      clientSecret: env.GMAIL_CLIENT_SECRET,
      refreshToken: env.GMAIL_REFRESH_TOKEN,
      from: env.GMAIL_FROM,
    })
  : null;

// Set by app.ts from Express's req.ip on every request (see TRUST_PROXY).
export const CLIENT_IP_HEADER = "x-starter-client-ip";

export const auth = betterAuth({
  appName: siteConfig.name,
  // The API's public origin. Better Auth serves /api/auth/* from here and sets
  // the session cookie for this host (or COOKIE_DOMAIN in production).
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  // The web app lives on another origin. Better Auth rejects cookie-carrying
  // mutations from any origin not listed here.
  trustedOrigins: env.trustedOrigins,
  database: drizzleAdapter(db, { provider: "pg", schema }),
  ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
    ? {
        socialProviders: {
          google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
            disableIdTokenSignIn: true,
          },
        },
      }
    : {}),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    requireEmailVerification: false,
  },
  ...(sendVerification ? {
    emailVerification: {
      sendVerificationEmail: async ({ user, url }) => {
        void sendVerification({
          to: user.email,
          subject: "Verifikasi email AnzaBook",
          text: `Buka tautan ini untuk memverifikasi email AnzaBook: ${url}`,
        }).catch(() => authLog.warn("Gagal mengirim email verifikasi"));
      },
    },
  } : {}),
  rateLimit: {
    // Better Auth only turns its limiter on by itself when NODE_ENV is
    // production, so a server started without it would accept unlimited
    // sign-in attempts. Keep it on everywhere except the API tests.
    enabled: !env.isTest,
    // The web server reads every visitor's session during SSR, all from its
    // own IP. Don't let that shared address exhaust a per-IP bucket; sign-in,
    // sign-up, and password routes keep their strict per-client limits.
    customRules: { "/get-session": false },
  },
  advanced: {
    cookiePrefix: siteConfig.id,
    // Rate limits and session IPs use the address Express resolved, never a
    // client-supplied X-Forwarded-For.
    ipAddress: { ipAddressHeaders: [CLIENT_IP_HEADER] },
    // Production: share the cookie between app.example.com and
    // api.example.com so the web server can read the session during SSR.
    ...(env.COOKIE_DOMAIN
      ? {
          crossSubDomainCookies: { enabled: true, domain: env.COOKIE_DOMAIN },
        }
      : {}),
  },
  logger: {
    level: env.isProduction ? "warn" : "info",
    log: (level, message, ...args) => {
      const [first] = args;
      const fields = first instanceof Error ? { err: first } : { args };
      if (level === "error") authLog.error(fields, message);
      else if (level === "warn") authLog.warn(fields, message);
      else if (level === "debug") authLog.debug(fields, message);
      else authLog.info(fields, message);
    },
  },
  plugins: [
    // Roles come from the access control in @starter/shared/permissions. New
    // accounts get DEFAULT_ROLE; `role` is not accepted from signup input, so
    // nobody can grant themselves one. Use pnpm role:set to promote an account.
    admin({
      ac,
      roles,
      defaultRole: DEFAULT_ROLE,
      adminRoles: ADMIN_ROLES,
    }),
  ],
});

export type AuthSession = NonNullable<
  Awaited<ReturnType<typeof auth.api.getSession>>
>;
