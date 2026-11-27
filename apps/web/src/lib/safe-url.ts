const SIMPLE_HANDLE_REGEX = /^[a-zA-Z0-9._-]+$/;
const LINKEDIN_HANDLE_REGEX = /^[a-zA-Z0-9._/-]+$/;
const WHATSAPP_PHONE_REGEX = /^\+?[0-9-]{6,24}$/;
const EXPLICIT_SCHEME_REGEX = /^[a-z][a-z0-9+.-]*:/i;

function hasControlChar(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f) {
      return true;
    }
  }
  return false;
}

/**
 * Returns a safe HTTP(S) external URL string for <a href>, or null for any
 * dangerous/non-HTTP(S) scheme (e.g. javascript:, data:, vbscript:, //evil).
 */
export function safeExternalHref(
  raw: string | null | undefined,
): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed || hasControlChar(trimmed)) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export type SocialHrefPlatform =
  "instagram" | "twitter" | "linkedin" | "whatsapp" | "website";

/**
 * Normalizes a user/publisher/community social link or handle into a safe HTTPS
 * URL, or returns null if the value contains dangerous schemes or malformed characters.
 */
export function safeSocialHref(
  raw: string | null | undefined,
  platform: SocialHrefPlatform,
): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed || hasControlChar(trimmed) || /\s/.test(trimmed)) {
    return null;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return safeExternalHref(trimmed);
  }
  if (EXPLICIT_SCHEME_REGEX.test(trimmed) || trimmed.startsWith("//")) {
    return null;
  }

  const cleanHandle = trimmed.replace(/^@/, "");
  if (!cleanHandle) return null;

  switch (platform) {
    case "instagram":
      return SIMPLE_HANDLE_REGEX.test(cleanHandle)
        ? safeExternalHref(`https://instagram.com/${cleanHandle}`)
        : null;
    case "twitter":
      return SIMPLE_HANDLE_REGEX.test(cleanHandle)
        ? safeExternalHref(`https://x.com/${cleanHandle}`)
        : null;
    case "linkedin":
      return LINKEDIN_HANDLE_REGEX.test(cleanHandle)
        ? safeExternalHref(`https://linkedin.com/in/${cleanHandle}`)
        : null;
    case "whatsapp":
      if (WHATSAPP_PHONE_REGEX.test(trimmed)) {
        const digits = trimmed.replace(/\D/g, "");
        return digits.length >= 6
          ? safeExternalHref(`https://wa.me/${digits}`)
          : null;
      }
      return SIMPLE_HANDLE_REGEX.test(cleanHandle)
        ? safeExternalHref(`https://wa.me/${cleanHandle}`)
        : null;
    case "website":
      return safeExternalHref(`https://${trimmed}`);
  }
}
