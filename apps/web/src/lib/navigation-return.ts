/**
 * Sanitizes an in-app returnTo URL so navigation never redirects to an external origin
 * or protocol-relative URL (`//`).
 */
export function sanitizeReturnTo(value?: string | null): string | null {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  if (/[\r\n]/.test(trimmed)) return null;
  try {
    const parsed = new URL(trimmed, "https://anzabook.local");
    if (parsed.origin !== "https://anzabook.local") return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

export function getCurrentRelativePath(): string {
  if (typeof window === "undefined") return "/app";
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}
