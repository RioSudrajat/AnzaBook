import type {
  CardAspect,
  CommunityEventSummaryDto,
} from "@starter/shared/types";
import {
  getMeetingPlatformMeta,
  parseEventThemeSpec,
  type EventThemeAccentCode,
  type EventThemeFontCode,
  type EventThemePresetCode,
  type EventThemeStyleCode,
} from "@starter/shared/validators/community";

export type EventShareTemplate =
  "invitation_poster" | "editorial_folio" | "attending_pass";

export type EventShareMode = "invite" | "attending";

export type EventShareSource = Pick<
  CommunityEventSummaryDto,
  | "id"
  | "slug"
  | "calendarName"
  | "calendarAvatarUrl"
  | "bookSummary"
  | "featuredWork"
  | "title"
  | "description"
  | "coverUrl"
  | "themePreset"
  | "visibility"
  | "eventType"
  | "categoryTag"
  | "coHosts"
  | "format"
  | "district"
  | "city"
  | "venueName"
  | "venueAddress"
  | "isAddressHidden"
  | "meetingPlatform"
  | "startsAt"
  | "endsAt"
  | "capacity"
  | "attendeeCount"
>;

export type EventShareTemplateOption = {
  id: EventShareTemplate;
  label: string;
  subtitle: string;
};

export const EVENT_SHARE_TEMPLATES: ReadonlyArray<EventShareTemplateOption> = [
  {
    id: "invitation_poster",
    label: "Poster Undangan",
    subtitle: "Sampul utama dengan jadwal kontras tinggi",
  },
  {
    id: "editorial_folio",
    label: "Folio Literasi",
    subtitle: "Kertas majalah sesuai tema warna acara",
  },
  {
    id: "attending_pass",
    label: "Kartu Hadir",
    subtitle: "Tiket personal siap bagikan ke Story",
  },
];

export type EventSharePalette = {
  pageBg: string;
  sheetBg: string;
  cardBg: string;
  border: string;
  ink: string;
  inkMuted: string;
  accent: string;
  accentInk: string;
  accentSoft: string;
  isDark: boolean;
  presetCode: EventThemePresetCode;
  styleCode: EventThemeStyleCode;
  fontCode: EventThemeFontCode;
};

const SHARE_PRESET_TINTS: Record<
  EventThemePresetCode,
  {
    lightPage: string;
    lightSheet: string;
    lightCard: string;
    lightBorder: string;
    darkPage: string;
    darkSheet: string;
    darkCard: string;
    darkBorder: string;
  }
> = {
  min: {
    lightPage: "#F4EFE6",
    lightSheet: "#FCF9F3",
    lightCard: "#FFFFFF",
    lightBorder: "#DDD5C6",
    darkPage: "#151412",
    darkSheet: "#1E1C19",
    darkCard: "#26231F",
    darkBorder: "#3A352E",
  },
  ris: {
    lightPage: "#F5EAE2",
    lightSheet: "#FFF9F5",
    lightCard: "#FFFFFF",
    lightBorder: "#E4CBC0",
    darkPage: "#1D1513",
    darkSheet: "#271C19",
    darkCard: "#30231F",
    darkBorder: "#4B3730",
  },
  nbk: {
    lightPage: "#EEE9DF",
    lightSheet: "#FAF7F0",
    lightCard: "#FFFFFF",
    lightBorder: "#D8D0C1",
    darkPage: "#131C21",
    darkSheet: "#1B272E",
    darkCard: "#223039",
    darkBorder: "#344854",
  },
  sln: {
    lightPage: "#EDEAE4",
    lightSheet: "#FAF8F3",
    lightCard: "#FFFFFF",
    lightBorder: "#D6CFC5",
    darkPage: "#121720",
    darkSheet: "#1B222F",
    darkCard: "#222B3B",
    darkBorder: "#344157",
  },
  bot: {
    lightPage: "#ECEFE8",
    lightSheet: "#F8FAF5",
    lightCard: "#FFFFFF",
    lightBorder: "#CFD7C8",
    darkPage: "#1E1914",
    darkSheet: "#28211A",
    darkCard: "#312920",
    darkBorder: "#4A3E31",
  },
  cin: {
    lightPage: "#EFECEF",
    lightSheet: "#FAF8FA",
    lightCard: "#FFFFFF",
    lightBorder: "#D8D1DA",
    darkPage: "#151218",
    darkSheet: "#1F1A24",
    darkCard: "#26202C",
    darkBorder: "#3E3448",
  },
  mus: {
    lightPage: "#EBF0F4",
    lightSheet: "#F7FAFC",
    lightCard: "#FFFFFF",
    lightBorder: "#CCD7E0",
    darkPage: "#101A23",
    darkSheet: "#172531",
    darkCard: "#1E2F3E",
    darkBorder: "#32495E",
  },
};

const SHARE_ACCENT_TOKENS: Record<
  EventThemeAccentCode,
  {
    lightAccent: string;
    lightInkOnAccent: string;
    lightSoft: string;
    darkAccent: string;
    darkInkOnAccent: string;
    darkSoft: string;
  }
> = {
  or: {
    lightAccent: "#B34009",
    lightInkOnAccent: "#FFFFFF",
    lightSoft: "rgba(179, 64, 9, 0.13)",
    darkAccent: "#F07638",
    darkInkOnAccent: "#14110F",
    darkSoft: "rgba(240, 118, 56, 0.22)",
  },
  sa: {
    lightAccent: "#2F5E39",
    lightInkOnAccent: "#FFFFFF",
    lightSoft: "rgba(47, 94, 57, 0.13)",
    darkAccent: "#7BB686",
    darkInkOnAccent: "#0E1810",
    darkSoft: "rgba(123, 182, 134, 0.20)",
  },
  co: {
    lightAccent: "#204E8A",
    lightInkOnAccent: "#FFFFFF",
    lightSoft: "rgba(32, 78, 138, 0.13)",
    darkAccent: "#70A4E8",
    darkInkOnAccent: "#0C1521",
    darkSoft: "rgba(112, 164, 232, 0.20)",
  },
  pl: {
    lightAccent: "#7F2641",
    lightInkOnAccent: "#FFFFFF",
    lightSoft: "rgba(127, 38, 65, 0.13)",
    darkAccent: "#E07D9A",
    darkInkOnAccent: "#1D0E13",
    darkSoft: "rgba(224, 125, 154, 0.20)",
  },
  am: {
    lightAccent: "#824E06",
    lightInkOnAccent: "#FFFFFF",
    lightSoft: "rgba(130, 78, 6, 0.13)",
    darkAccent: "#E5AA46",
    darkInkOnAccent: "#1A1308",
    darkSoft: "rgba(229, 170, 70, 0.20)",
  },
  in: {
    lightAccent: "#1D1A17",
    lightInkOnAccent: "#FAF7F0",
    lightSoft: "rgba(29, 26, 23, 0.10)",
    darkAccent: "#EFEAE0",
    darkInkOnAccent: "#151311",
    darkSoft: "rgba(239, 234, 224, 0.16)",
  },
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  book_club: "Klub Buku",
  film_discussion: "Diskusi Film",
  silent_reading: "Silent Reading",
  book_launch: "Peluncuran Buku",
  writing_session: "Sesi Menulis",
  community_meetup: "Temu Komunitas",
};

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
] as const;

const SHORT_MONTHS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MEI",
  "JUN",
  "JUL",
  "AGU",
  "SEP",
  "OKT",
  "NOV",
  "DES",
] as const;

const WEEKDAYS_ID = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
] as const;

export function getEventTypeLabel(eventType: string): string {
  return EVENT_TYPE_LABELS[eventType] ?? "Agenda Komunitas";
}

export function resolveEventSharePalette(
  themePreset?: string | null,
): EventSharePalette {
  const spec = parseEventThemeSpec(themePreset);
  const preset = SHARE_PRESET_TINTS[spec.preset] ?? SHARE_PRESET_TINTS.min;
  const accent = SHARE_ACCENT_TOKENS[spec.accent] ?? SHARE_ACCENT_TOKENS.or;
  const isDark = spec.mode === "d";

  return {
    pageBg: isDark ? preset.darkPage : preset.lightPage,
    sheetBg: isDark ? preset.darkSheet : preset.lightSheet,
    cardBg: isDark ? preset.darkCard : preset.lightCard,
    border: isDark ? preset.darkBorder : preset.lightBorder,
    ink: isDark ? "#F5F2EB" : "#151310",
    inkMuted: isDark ? "#C6BFB2" : "#5B544B",
    accent: isDark ? accent.darkAccent : accent.lightAccent,
    accentInk: isDark ? accent.darkInkOnAccent : accent.lightInkOnAccent,
    accentSoft: isDark ? accent.darkSoft : accent.lightSoft,
    isDark,
    presetCode: spec.preset,
    styleCode: spec.style,
    fontCode: spec.font,
  };
}

export type FormattedEventShareSchedule = {
  weekday: string;
  dayNumber: string;
  shortMonth: string;
  fullMonth: string;
  year: string;
  dateLine: string;
  timeRange: string;
  compactDateTime: string;
};

function getJakartaParts(date: Date): {
  year: number;
  monthIndex: number;
  day: number;
  hour: string;
  minute: string;
  weekdayIndex: number;
} {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  });
  const parts = formatter.formatToParts(date);
  const lookup = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";

  const weekdayShort = lookup("weekday");
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    year: Number(lookup("year")) || date.getUTCFullYear(),
    monthIndex: Math.max(0, Math.min(11, (Number(lookup("month")) || 1) - 1)),
    day: Number(lookup("day")) || date.getUTCDate(),
    hour: lookup("hour").padStart(2, "0"),
    minute: lookup("minute").padStart(2, "0"),
    weekdayIndex: weekdayMap[weekdayShort] ?? date.getUTCDay(),
  };
}

export function formatEventShareSchedule(
  startsAt: string,
  endsAt: string,
): FormattedEventShareSchedule {
  const start = new Date(startsAt);
  const end = new Date(endsAt);

  if (Number.isNaN(start.getTime())) {
    return {
      weekday: "Agenda",
      dayNumber: "01",
      shortMonth: "WIB",
      fullMonth: "Komunitas",
      year: "",
      dateLine: "Jadwal Agenda Komunitas",
      timeRange: "WIB",
      compactDateTime: "Jadwal Agenda Komunitas",
    };
  }

  const s = getJakartaParts(start);
  const weekday = WEEKDAYS_ID[s.weekdayIndex] ?? "Agenda";
  const shortMonth = SHORT_MONTHS[s.monthIndex] ?? "JAN";
  const fullMonth = MONTH_NAMES[s.monthIndex] ?? "Januari";
  const dayNumber = String(s.day).padStart(2, "0");
  const startClock = `${s.hour}:${s.minute}`;

  let timeRange = `${startClock} WIB`;
  if (!Number.isNaN(end.getTime())) {
    const e = getJakartaParts(end);
    timeRange = `${startClock} - ${e.hour}:${e.minute} WIB`;
  }

  const dateLine = `${weekday}, ${s.day} ${fullMonth} ${s.year}`;
  const compactDateTime = `${weekday}, ${s.day} ${shortMonth} · ${timeRange}`;

  return {
    weekday,
    dayNumber,
    shortMonth,
    fullMonth,
    year: String(s.year),
    dateLine,
    timeRange,
    compactDateTime,
  };
}

export type SafeEventShareLocation = {
  modeLabel: "Daring" | "Tatap Muka" | "Hibrida";
  primaryLine: string;
  secondaryLine: string | null;
  isMaskedAddress: boolean;
};

export function getSafeEventShareLocation(
  event: Pick<
    EventShareSource,
    | "format"
    | "venueName"
    | "district"
    | "city"
    | "isAddressHidden"
    | "meetingPlatform"
  >,
): SafeEventShareLocation {
  const area = [event.district, event.city]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(", ");

  if (event.format === "online") {
    const platform = getMeetingPlatformMeta(event.meetingPlatform).label;
    return {
      modeLabel: "Daring",
      primaryLine: platform,
      secondaryLine: "Tautan ruang terbuka untuk peserta terdaftar",
      isMaskedAddress: false,
    };
  }

  if (event.format === "hybrid") {
    const platform = getMeetingPlatformMeta(event.meetingPlatform).label;
    if (event.isAddressHidden) {
      return {
        modeLabel: "Hibrida",
        primaryLine: area
          ? `${area} & ${platform}`
          : `Tatap Muka & ${platform}`,
        secondaryLine: "Alamat penuh dibuka setelah disetujui",
        isMaskedAddress: true,
      };
    }

    const place = event.venueName?.trim() || area || "Lokasi Tatap Muka";
    return {
      modeLabel: "Hibrida",
      primaryLine: `${place} & ${platform}`,
      secondaryLine: event.venueName?.trim() && area ? area : null,
      isMaskedAddress: false,
    };
  }

  if (event.isAddressHidden) {
    return {
      modeLabel: "Tatap Muka",
      primaryLine: area || "Lokasi diumumkan setelah disetujui",
      secondaryLine: "Alamat lengkap dibuka untuk peserta terkonfirmasi",
      isMaskedAddress: true,
    };
  }

  const venue = event.venueName?.trim();
  return {
    modeLabel: "Tatap Muka",
    primaryLine: venue || area || "Lokasi Tatap Muka",
    secondaryLine: venue && area ? area : null,
    isMaskedAddress: false,
  };
}

export function getEventShareHostLine(
  event: Pick<EventShareSource, "calendarName" | "coHosts">,
): string {
  const count = event.coHosts?.length ?? 0;
  if (count > 0) {
    return `${event.calendarName} & ${count} mitra`;
  }
  return event.calendarName;
}

export function getEventShareWorkLine(
  event: Pick<EventShareSource, "bookSummary" | "featuredWork">,
): string | null {
  if (event.bookSummary?.title) {
    return event.bookSummary.author
      ? `${event.bookSummary.title} (${event.bookSummary.author})`
      : event.bookSummary.title;
  }
  if (event.featuredWork?.title) {
    return event.featuredWork.creator
      ? `${event.featuredWork.title} (${event.featuredWork.creator})`
      : event.featuredWork.title;
  }
  return null;
}

export function buildEventShareCaption(
  event: EventShareSource,
  shareUrl: string,
  options?: {
    mode?: EventShareMode;
    readerName?: string | null;
  },
): string {
  const mode = options?.mode ?? "invite";
  const readerName = options?.readerName?.trim();
  const schedule = formatEventShareSchedule(event.startsAt, event.endsAt);
  const location = getSafeEventShareLocation(event);
  const workLine = getEventShareWorkLine(event);
  const hostLine = getEventShareHostLine(event);

  const opener =
    mode === "attending"
      ? readerName
        ? `${readerName} akan hadir di agenda AnzaBook berikut. Ayo gabung bersama:`
        : "Saya akan hadir di agenda AnzaBook berikut. Ayo gabung bersama:"
      : "Mari bergabung di agenda komunitas AnzaBook:";

  const locationText =
    event.format === "online"
      ? `Sesi Daring via ${location.primaryLine}`
      : location.secondaryLine && !location.isMaskedAddress
        ? `${location.primaryLine}, ${location.secondaryLine}`
        : location.isMaskedAddress
          ? `${location.primaryLine} (alamat lengkap dibuka setelah pendaftaran disetujui)`
          : location.primaryLine;

  const lines = [
    opener,
    "",
    `*${event.title}*`,
    `Penyelenggara: ${hostLine}`,
    `Jadwal: ${schedule.dateLine}, ${schedule.timeRange}`,
    `Lokasi: ${locationText}`,
  ];

  if (workLine) {
    lines.push(`Karya bahasan: ${workLine}`);
  }

  lines.push("", `Info & pendaftaran: ${shareUrl}`);
  return lines.join("\n");
}

export function buildEventWhatsAppUrl(caption: string): string {
  return `https://wa.me/?text=${encodeURIComponent(caption)}`;
}

export function buildEventTelegramUrl(shareUrl: string, text: string): string {
  const params = new URLSearchParams({
    url: shareUrl,
    text,
  });
  return `https://t.me/share/url?${params.toString()}`;
}

export function buildEventXUrl(shareUrl: string, text: string): string {
  const params = new URLSearchParams({
    url: shareUrl,
    text,
  });
  return `https://x.com/intent/post?${params.toString()}`;
}

export function buildEventShareFilename(
  slug: string,
  template: EventShareTemplate,
  aspect: CardAspect,
): string {
  const cleanSlug = slug
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const templateTag =
    template === "attending_pass"
      ? "hadir"
      : template === "editorial_folio"
        ? "folio"
        : "poster";
  const ratioTag =
    aspect === "story" ? "9x16" : aspect === "4:3" ? "4x3" : "1x1";
  return `anzabook-agenda-${cleanSlug || "komunitas"}-${templateTag}-${ratioTag}.png`;
}
