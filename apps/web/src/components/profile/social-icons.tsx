import { Globe, MessageCircle } from "lucide-react";
import { safeSocialHref } from "@/lib/safe-url";

export function InstagramIcon({
  className = "size-4",
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

export function XTwitterIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export function LinkedInIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.64 1.64 0 1 0 0-3.28 1.64 1.64 0 0 0 0 3.28m1.39 9.74v-8.37H5.07v8.37h2.78z" />
    </svg>
  );
}

export type ProfileSocialLinksData = {
  instagram?: string | null;
  twitter?: string | null;
  linkedin?: string | null;
  website?: string | null;
  whatsapp?: string | null;
};

function formatHandleLabel(raw: string, prefix: string) {
  if (raw.startsWith("http")) {
    const seg = raw.split("/").filter(Boolean).pop();
    return seg ? `@${seg.replace(/^@/, "")}` : raw;
  }
  return `${prefix}${raw.replace(/^@/, "")}`;
}

export function ProfileSocialLinks({
  links,
}: {
  links?: ProfileSocialLinksData | null;
}) {
  if (!links) return null;
  const { instagram, twitter, linkedin, website, whatsapp } = links;
  const instagramHref = safeSocialHref(instagram, "instagram");
  const twitterHref = safeSocialHref(twitter, "twitter");
  const linkedinHref = safeSocialHref(linkedin, "linkedin");
  const whatsappHref = safeSocialHref(whatsapp, "whatsapp");
  const websiteHref = safeSocialHref(website, "website");
  if (
    !instagramHref &&
    !twitterHref &&
    !linkedinHref &&
    !whatsappHref &&
    !websiteHref
  ) {
    return null;
  }

  const linkClass =
    "inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 text-xs font-mono text-[var(--color-ink-2)] hover:border-[var(--color-ink)] hover:text-[var(--color-ink)] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--color-focus)]";

  return (
    <div
      className="flex flex-wrap items-center gap-2 pt-1"
      aria-label="Tautan media sosial"
    >
      {instagramHref && instagram && (
        <a
          href={instagramHref}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
          title="Instagram"
        >
          <InstagramIcon className="size-3.5" />
          <span>{formatHandleLabel(instagram, "@")}</span>
        </a>
      )}
      {twitterHref && twitter && (
        <a
          href={twitterHref}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
          title="X / Twitter"
        >
          <XTwitterIcon className="size-3.5" />
          <span>{formatHandleLabel(twitter, "@")}</span>
        </a>
      )}
      {linkedinHref && (
        <a
          href={linkedinHref}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
          title="LinkedIn"
        >
          <LinkedInIcon className="size-3.5" />
          <span>LinkedIn</span>
        </a>
      )}
      {whatsappHref && (
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
          title="WhatsApp"
        >
          <MessageCircle className="size-3.5" aria-hidden="true" />
          <span>WhatsApp</span>
        </a>
      )}
      {websiteHref && website && (
        <a
          href={websiteHref}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
          title="Situs Web"
        >
          <Globe className="size-3.5" aria-hidden="true" />
          <span>{website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>
        </a>
      )}
    </div>
  );
}
