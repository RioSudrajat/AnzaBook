import { classifyReadingTempo } from "@starter/shared/reading-progress";
import type { SessionTemplate } from "@starter/shared/types";

/** Mirrors backend DRM-05 public quote length guard in social.service.ts. */
export const MAX_PUBLIC_QUOTE_CHARS = 400;

export const MAX_SESSION_TITLE_CHARS = 140;

export type QuoteExcerptValidation = {
  length: number;
  maxLength: number;
  isTooLong: boolean;
  remainingChars: number;
};

export type SevenDayConsistencyDot = {
  dateKey: string;
  dayLabel: string;
  active: boolean;
};

export type AdaptiveCoverPalette = {
  background: string;
  surface: string;
  foreground: string;
  mutedForeground: string;
  accent: string;
  rule: string;
  isDarkBackground: boolean;
};

const DAY_LABELS_ID = [
  "Min",
  "Sen",
  "Sel",
  "Rab",
  "Kam",
  "Jum",
  "Sab",
] as const;
const DEFAULT_COVER_HEX = "#243B4A";

export function getQuoteExcerptValidation(
  text: string,
): QuoteExcerptValidation {
  const length = text.trim().length;
  return {
    length,
    maxLength: MAX_PUBLIC_QUOTE_CHARS,
    isTooLong: length > MAX_PUBLIC_QUOTE_CHARS,
    remainingChars: MAX_PUBLIC_QUOTE_CHARS - length,
  };
}

/**
 * Resolves a safe session template for persisted in-app posts.
 * Custom local photos stay client-side in P0 (Opsi A), so in-app feed cards fall
 * back from photo_overlay to cover_trail without blocking external sharing.
 */
export function resolveSafeInAppSessionTemplate(
  template: SessionTemplate,
): Exclude<SessionTemplate, "photo_overlay"> {
  return template === "photo_overlay" ? "cover_trail" : template;
}

export function suggestSessionTitle(
  bookTitle: string,
  date: Date = new Date(),
): string {
  const hour = date.getHours();
  let slot = "Baca Malam";
  if (hour >= 4 && hour <= 10) {
    slot = "Baca Pagi";
  } else if (hour >= 11 && hour <= 14) {
    slot = "Baca Siang";
  } else if (hour >= 15 && hour <= 17) {
    slot = "Baca Sore";
  }

  const cleanTitle = bookTitle.trim() || "AnzaBook";
  const raw = `${slot} · ${cleanTitle}`;
  if (raw.length <= MAX_SESSION_TITLE_CHARS) {
    return raw;
  }
  return `${raw.slice(0, MAX_SESSION_TITLE_CHARS - 3).trimEnd()}...`;
}

function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function computeSevenDayConsistency(
  sessions: ReadonlyArray<{
    createdAt?: string | null;
    startedAt?: string | null;
    endedAt?: string | null;
  }>,
  referenceDate: Date = new Date(),
): SevenDayConsistencyDot[] {
  const activeDates = new Set<string>();

  for (const session of sessions) {
    for (const timestamp of [
      session.createdAt,
      session.startedAt,
      session.endedAt,
    ]) {
      if (!timestamp) continue;
      const parsed = new Date(timestamp);
      if (!Number.isNaN(parsed.getTime())) {
        activeDates.add(toLocalDateKey(parsed));
      }
    }
  }

  const dots: SevenDayConsistencyDot[] = [];
  const baseDay = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
  );

  for (let offset = -6; offset <= 0; offset++) {
    const current = new Date(baseDay);
    current.setDate(baseDay.getDate() + offset);
    const dateKey = toLocalDateKey(current);
    dots.push({
      dateKey,
      dayLabel: DAY_LABELS_ID[current.getDay()] ?? "",
      active: activeDates.has(dateKey),
    });
  }

  return dots;
}

export function formatShareDuration(durationSec: number): string {
  const safeSeconds = Math.max(0, Math.round(durationSec));
  if (safeSeconds < 60) {
    return `${safeSeconds} dtk`;
  }

  const totalMinutes = Math.floor(safeSeconds / 60);
  if (totalMinutes < 60) {
    return `${totalMinutes} mnt`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  return remainingMinutes > 0
    ? `${hours} jam ${remainingMinutes} mnt`
    : `${hours} jam`;
}

function normalizeHexColor(input?: string | null): string {
  if (!input) return DEFAULT_COVER_HEX;
  const trimmed = input.trim();
  const sixDigit = /^#([0-9a-fA-F]{6})$/.exec(trimmed);
  if (sixDigit) {
    return `#${sixDigit[1].toUpperCase()}`;
  }
  const threeDigit = /^#([0-9a-fA-F]{3})$/.exec(trimmed);
  if (threeDigit) {
    const [r, g, b] = threeDigit[1].split("");
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return DEFAULT_COVER_HEX;
}

function parseHexRgb(hex: string): [number, number, number] {
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function relativeLuminance(rgb: [number, number, number]): number {
  const linearize = (channel: number): number => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = rgb;
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

function mixHex(baseHex: string, targetHex: string, weight: number): string {
  const [r1, g1, b1] = parseHexRgb(baseHex);
  const [r2, g2, b2] = parseHexRgb(targetHex);
  const mix = (a: number, b: number) =>
    Math.round(a * (1 - weight) + b * weight)
      .toString(16)
      .padStart(2, "0")
      .toUpperCase();
  return `#${mix(r1, r2)}${mix(g1, g2)}${mix(b1, b2)}`;
}

export function deriveAdaptiveCoverPalette(
  coverColor?: string | null,
): AdaptiveCoverPalette {
  const background = normalizeHexColor(coverColor);
  const luminance = relativeLuminance(parseHexRgb(background));
  // 0.179 is the exact WCAG luminance crossover between #13110F and #F6F2E9.
  const isDarkBackground = luminance <= 0.179;

  if (isDarkBackground) {
    return {
      background,
      surface: mixHex(background, "#FFFFFF", 0.08),
      foreground: "#F6F2E9",
      mutedForeground: "rgba(246, 242, 233, 0.76)",
      accent: "#F06A24",
      rule: "rgba(246, 242, 233, 0.22)",
      isDarkBackground: true,
    };
  }

  return {
    background,
    surface: mixHex(background, "#13110F", 0.06),
    foreground: "#13110F",
    mutedForeground: "rgba(19, 17, 15, 0.74)",
    accent: luminance < 0.35 ? "#13110F" : "#C24A0E",
    rule: "rgba(19, 17, 15, 0.18)",
    isDarkBackground: false,
  };
}

export function buildSharePostUrl(params: {
  origin: string;
  postType: "quote" | "session";
  postId?: string | null;
  isPosted?: boolean;
  bookSlug?: string | null;
}): string {
  const cleanOrigin = params.origin.replace(/\/+$/, "");
  const cleanPostId = params.postId?.trim();
  if (params.isPosted && cleanPostId) {
    return `${cleanOrigin}/post/${params.postType}/${encodeURIComponent(cleanPostId)}`;
  }

  const cleanSlug = params.bookSlug?.trim();
  if (cleanSlug) {
    return `${cleanOrigin}/books/${encodeURIComponent(cleanSlug)}`;
  }

  return `${cleanOrigin}/app?tab=explore`;
}

export function buildWhatsAppShareUrl(text: string): string {
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
}

export function buildQuoteShareCaption(params: {
  quote: string;
  bookTitle: string;
  bookAuthor?: string | null;
  postCaption?: string | null;
  shareUrl: string;
}): string {
  const parts: string[] = [];
  const caption = params.postCaption?.trim();
  if (caption) {
    parts.push(caption);
  }

  const cleanQuote = params.quote.trim().replace(/\s+/g, " ");
  const truncatedQuote =
    cleanQuote.length > 220
      ? `${cleanQuote.slice(0, 217).trimEnd()}...`
      : cleanQuote;
  parts.push(`"${truncatedQuote}"`);

  const author = params.bookAuthor?.trim();
  parts.push(
    author ? `${params.bookTitle.trim()} (${author})` : params.bookTitle.trim(),
  );
  parts.push(params.shareUrl);

  return parts.join("\n\n");
}

export function buildSessionShareCaption(params: {
  title: string;
  bookTitle: string;
  durationSec?: number | null;
  pagesRead?: number;
  tempoLabel?: string | null;
  note?: string | null;
  shareUrl: string;
}): string {
  const metrics: string[] = [];
  if (
    params.durationSec != null &&
    Number.isFinite(params.durationSec) &&
    params.durationSec > 0
  ) {
    metrics.push(formatShareDuration(params.durationSec));
  }
  if (params.pagesRead && params.pagesRead > 0) {
    metrics.push(`${params.pagesRead} hlm`);
  }
  if (params.tempoLabel?.trim()) {
    metrics.push(`Ritme ${params.tempoLabel.trim()}`);
  }

  const bookSummaryLine =
    metrics.length > 0
      ? `${params.bookTitle.trim()} · ${metrics.join(" · ")}`
      : params.bookTitle.trim();

  const lines = [params.title.trim(), bookSummaryLine];

  if (params.note?.trim()) {
    lines.push(params.note.trim());
  }
  lines.push(params.shareUrl);

  return lines.join("\n\n");
}

export function shareTempoLabel(avgWpm: number | null | undefined): string {
  if (!avgWpm || !Number.isFinite(avgWpm) || avgWpm <= 0) {
    return "";
  }
  const tempo = classifyReadingTempo(avgWpm);
  switch (tempo) {
    case "reflective":
      return "Mendalam";
    case "steady":
      return "Mengalir";
    case "brisk":
      return "Lugas";
  }
}

export function extractSurroundingContext(
  chapterText: string | null | undefined,
  selectedText: string,
  maxChars = 220,
): string | null {
  if (!chapterText || !selectedText.trim()) {
    return null;
  }

  const cleanedChapter = chapterText
    .replace(/<!--\s*pagebreak\s*-->/gi, " ")
    .replace(/---pagebreak---/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleanedChapter) {
    return null;
  }

  const needle = selectedText.replace(/\s+/g, " ").trim();
  const matchIdx = cleanedChapter.toLowerCase().indexOf(needle.toLowerCase());

  if (matchIdx === -1) {
    return cleanedChapter.length <= maxChars
      ? cleanedChapter
      : `${cleanedChapter.slice(0, maxChars - 3).trimEnd()}...`;
  }

  const contextPadding = Math.max(
    24,
    Math.floor((maxChars - needle.length) / 2),
  );
  let start = Math.max(0, matchIdx - contextPadding);
  if (start <= 40 || matchIdx + needle.length + 12 <= maxChars) {
    start = 0;
  } else {
    const nextSpace = cleanedChapter.indexOf(" ", start);
    if (nextSpace !== -1 && nextSpace < matchIdx) {
      start = nextSpace + 1;
    }
  }

  const end = Math.min(cleanedChapter.length, start + maxChars);
  let snippet = cleanedChapter.slice(start, end).trim();
  if (end < cleanedChapter.length) {
    const reserve = 3;
    const capped = snippet.slice(0, Math.max(0, maxChars - reserve));
    const lastSpace = capped.lastIndexOf(" ");
    const cleanEnd = lastSpace > 20 ? capped.slice(0, lastSpace) : capped;
    snippet = `${cleanEnd.trimEnd()}...`;
  }

  return snippet;
}
