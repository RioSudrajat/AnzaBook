import { z } from "zod";
import { safeAssetUrlSchema } from "./publisher";
import {
  isSafeHttpUrl,
  isSafeImageOrAssetUrl,
  isSafeSocialLinkValue,
  safeVerificationDocumentsSchema,
} from "./url-safety";

export const upsertShelfSchema = z
  .object({
    bookId: z.string().uuid("ID buku harus berupa UUID valid"),
    shelfStatus: z.enum(["want_to_read", "reading", "finished", "abandoned"]),
    favorite: z.boolean().optional(),
  })
  .strict();

export const createReviewSchema = z
  .object({
    bookId: z.string().uuid("ID buku harus berupa UUID valid"),
    rating: z
      .number()
      .min(0.5, "Rating minimal 0.5")
      .max(5.0, "Rating maksimal 5.0")
      .refine((val) => val % 0.5 === 0, {
        message: "Rating harus kelipatan 0.5 antara 0.5 hingga 5.0",
      }),
    content: z
      .string()
      .min(5, "Ulasan minimal 5 karakter")
      .max(3000, "Ulasan maksimal 3000 karakter"),
    editionTierReviewed: z
      .enum([
        "rakyat_economy",
        "standard_trade",
        "kolektor_hardcover",
        "digital",
      ])
      .default("rakyat_economy"),
  })
  .strict();

export const createParagraphCommentSchema = z
  .object({
    chapterId: z.string().uuid("ID bab harus berupa UUID valid"),
    paragraphIndex: z
      .number()
      .int()
      .min(0, "Index paragraf tidak boleh negatif")
      .max(5000, "Index paragraf melebihi batas bab"),
    content: z
      .string()
      .min(2, "Komentar marjinalia minimal 2 karakter")
      .max(1000, "Komentar marjinalia maksimal 1000 karakter"),
  })
  .strict();

export const listParagraphCommentsQuerySchema = z
  .object({
    chapterId: z.string().uuid("ID bab harus berupa UUID valid"),
  })
  .strict();

// ---------------- Community Calendars & Events ---------------- //

export const calendarTypeValues = ["community", "author", "publisher"] as const;
export type CalendarType = (typeof calendarTypeValues)[number];

export const eventTypeValues = [
  "book_club",
  "film_discussion",
  "silent_reading",
  "book_launch",
  "writing_session",
  "community_meetup",
] as const;
export type EventType = (typeof eventTypeValues)[number];

export const eventFormatValues = ["offline", "online", "hybrid"] as const;
export type EventFormat = (typeof eventFormatValues)[number];

export const eventThemeValues = [
  "minimal",
  "classic_paper",
  "midnight_ink",
  "terracotta",
] as const;
export type LegacyEventTheme = (typeof eventThemeValues)[number];

export const eventThemePresetCodeValues = [
  "min",
  "ris",
  "nbk",
  "sln",
  "bot",
  "cin",
  "mus",
] as const;
export type EventThemePresetCode = (typeof eventThemePresetCodeValues)[number];

export const eventThemeAccentCodeValues = [
  "or",
  "sa",
  "co",
  "pl",
  "am",
  "in",
] as const;
export type EventThemeAccentCode = (typeof eventThemeAccentCodeValues)[number];

export const eventThemeStyleCodeValues = [
  "pl",
  "gr",
  "ln",
  "ht",
  "dg",
  "hj",
  "lb",
  "ms",
] as const;
export type EventThemeStyleCode = (typeof eventThemeStyleCodeValues)[number];

export const eventThemeFontCodeValues = ["li", "jk", "mn", "cl"] as const;
export type EventThemeFontCode = (typeof eventThemeFontCodeValues)[number];

export const eventThemeModeCodeValues = ["l", "d", "a"] as const;
export type EventThemeModeCode = (typeof eventThemeModeCodeValues)[number];

export type EventThemeSpec = {
  preset: EventThemePresetCode;
  accent: EventThemeAccentCode;
  style: EventThemeStyleCode;
  font: EventThemeFontCode;
  mode: EventThemeModeCode;
};

export type EventTheme =
  | LegacyEventTheme
  | `v2:${EventThemePresetCode}:${EventThemeAccentCode}:${EventThemeStyleCode}:${EventThemeFontCode}:${EventThemeModeCode}`;

const DEFAULT_EVENT_THEME_SPEC: EventThemeSpec = {
  preset: "min",
  accent: "or",
  style: "pl",
  font: "li",
  mode: "a",
};

const LEGACY_THEME_SPECS: Record<LegacyEventTheme, EventThemeSpec> = {
  minimal: { preset: "min", accent: "or", style: "pl", font: "li", mode: "a" },
  classic_paper: {
    preset: "nbk",
    accent: "am",
    style: "ln",
    font: "li",
    mode: "l",
  },
  midnight_ink: {
    preset: "sln",
    accent: "or",
    style: "lb",
    font: "li",
    mode: "d",
  },
  terracotta: {
    preset: "ris",
    accent: "or",
    style: "ht",
    font: "li",
    mode: "l",
  },
};

const PRESET_SET = new Set<string>(eventThemePresetCodeValues);
const ACCENT_SET = new Set<string>(eventThemeAccentCodeValues);
const STYLE_SET = new Set<string>(eventThemeStyleCodeValues);
const FONT_SET = new Set<string>(eventThemeFontCodeValues);
const MODE_SET = new Set<string>(eventThemeModeCodeValues);
const LEGACY_SET = new Set<string>(eventThemeValues);

/**
 * Validates either a legacy event theme key or a compact 5-axis v2 theme token
 * stored inside the existing 32-char theme_preset column.
 */
export function isValidEventTheme(value: string): value is EventTheme {
  if (LEGACY_SET.has(value)) return true;
  if (value.length > 32 || !value.startsWith("v2:")) return false;
  const parts = value.split(":");
  if (parts.length !== 6) return false;
  const [, preset, accent, style, font, mode] = parts;
  return (
    PRESET_SET.has(preset) &&
    ACCENT_SET.has(accent) &&
    STYLE_SET.has(style) &&
    FONT_SET.has(font) &&
    MODE_SET.has(mode)
  );
}

/** Encodes a 5-axis event theme configuration into a 17-char token. */
export function encodeEventThemeSpec(spec: EventThemeSpec): EventTheme {
  return `v2:${spec.preset}:${spec.accent}:${spec.style}:${spec.font}:${spec.mode}`;
}

/** Parses any stored legacy or v2 event theme string into a safe configuration. */
export function parseEventThemeSpec(raw?: string | null): EventThemeSpec {
  if (!raw) return { ...DEFAULT_EVENT_THEME_SPEC };
  if (LEGACY_SET.has(raw)) {
    return { ...LEGACY_THEME_SPECS[raw as LegacyEventTheme] };
  }
  if (isValidEventTheme(raw) && raw.startsWith("v2:")) {
    const [, preset, accent, style, font, mode] = raw.split(":");
    return {
      preset: preset as EventThemePresetCode,
      accent: accent as EventThemeAccentCode,
      style: style as EventThemeStyleCode,
      font: font as EventThemeFontCode,
      mode: mode as EventThemeModeCode,
    };
  }
  return { ...DEFAULT_EVENT_THEME_SPEC };
}

export const eventThemeInputSchema = z
  .string()
  .max(32, "Kode tema acara terlalu panjang")
  .refine((val): val is EventTheme => isValidEventTheme(val), {
    message: "Format tema acara tidak valid",
  });

export const eventThemeSchema = eventThemeInputSchema.default("minimal");

export const eventVisibilityValues = ["public", "private_link"] as const;
export type EventVisibility = (typeof eventVisibilityValues)[number];

export const rsvpStatusValues = [
  "going",
  "pending_approval",
  "waitlisted",
  "canceled",
  "rejected",
] as const;
export type RsvpStatus = (typeof rsvpStatusValues)[number];

export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

const communitySocialHandleOrUrlSchema = z
  .string()
  .max(500, "Tautan media sosial terlalu panjang")
  .refine((val) => isSafeSocialLinkValue(val, { allowHandle: true }), {
    message: "Tautan atau handle media sosial tidak valid",
  });

const communityWebsiteSchema = z
  .string()
  .max(500, "URL situs web terlalu panjang")
  .refine((val) => isSafeSocialLinkValue(val, { allowBareDomain: true }), {
    message: "URL situs web tidak valid",
  });

export const featuredWorkSchema = z.object({
  mediaType: z.enum(["book", "film", "article", "other"]),
  title: z.string().min(1, "Judul karya wajib diisi").max(200),
  creator: z.string().max(160).optional(),
  externalUrl: z
    .string()
    .trim()
    .refine((val) => val === "" || isSafeHttpUrl(val), {
      message: "Tautan karya harus URL HTTP(S) valid",
    })
    .optional(),
});

export const coHostSchema = z
  .object({
    userId: z.string().trim().min(1).max(128).optional(),
    name: z
      .string()
      .trim()
      .min(1, "Nama kolaborator wajib diisi")
      .max(100, "Nama kolaborator maksimal 100 karakter"),
    avatarUrl: safeAssetUrlSchema("URL avatar kolaborator tidak valid")
      .max(500, "URL avatar terlalu panjang")
      .optional(),
    roleLabel: z
      .string()
      .trim()
      .max(60, "Label peran maksimal 60 karakter")
      .optional(),
  })
  .strict();

/**
 * Keeps only validated HTTP(S) or root-relative avatar URLs within coHostSchema bounds,
 * discarding base64 data URIs or oversized/unsafe URLs that would trigger 422 on submit.
 */
export function sanitizeCoHostAvatarUrl(
  rawUrl?: string | null,
): string | undefined {
  const trimmed = rawUrl?.trim();
  if (!trimmed) return undefined;
  const parsed = coHostSchema.shape.avatarUrl.safeParse(trimmed);
  return parsed.success && parsed.data ? parsed.data : undefined;
}

export const calendarManageableRoleValues = [
  "admin",
  "checkin_staff",
  "member",
] as const;
export type CalendarManageableRole =
  (typeof calendarManageableRoleValues)[number];

export const addCalendarMemberSchema = z
  .object({
    identifier: z
      .string()
      .trim()
      .min(2, "Masukkan email atau username pengguna")
      .max(255, "Identitas pengguna terlalu panjang"),
    role: z.enum(calendarManageableRoleValues).default("admin"),
  })
  .strict();

export const updateCalendarMemberSchema = z
  .object({
    role: z.enum(calendarManageableRoleValues),
  })
  .strict();

export const createCalendarSchema = z
  .object({
    name: z.string().min(3, "Nama kalender minimal 3 karakter").max(100),
    slug: z
      .string()
      .min(3, "Slug minimal 3 karakter")
      .max(80)
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Slug hanya boleh huruf kecil, angka, dan strip",
      ),
    type: z.enum(calendarTypeValues).default("community"),
    description: z.string().max(2000).default(""),
    avatarUrl: z
      .string()
      .refine(
        (val) =>
          isSafeImageOrAssetUrl(val, {
            allowEmpty: true,
            allowRootRelative: true,
            allowRasterDataUri: true,
          }),
        {
          message:
            "URL avatar harus berupa gambar raster valid atau URL HTTP(S)",
        },
      )
      .optional(),
    coverUrl: z
      .string()
      .refine(
        (val) =>
          isSafeImageOrAssetUrl(val, {
            allowEmpty: true,
            allowRootRelative: true,
            allowRasterDataUri: true,
          }),
        {
          message:
            "URL sampul harus berupa gambar raster valid atau URL HTTP(S)",
        },
      )
      .optional(),
    city: z.string().max(80).optional(),
    contactEmail: z
      .string()
      .email("Email kontak tidak valid")
      .optional()
      .or(z.literal("")),
    socialLinks: z
      .object({
        instagram: communitySocialHandleOrUrlSchema.optional(),
        twitter: communitySocialHandleOrUrlSchema.optional(),
        website: communityWebsiteSchema.optional(),
        discord: communitySocialHandleOrUrlSchema.optional(),
        telegram: communitySocialHandleOrUrlSchema.optional(),
        whatsapp: communitySocialHandleOrUrlSchema.optional(),
      })
      .optional(),
    verificationDocuments: safeVerificationDocumentsSchema.optional(),
  })
  .strict();

export const updateCalendarSchema = createCalendarSchema.partial();

const bannerUrlSchema = z
  .string()
  .min(1, "Banner poster acara wajib diisi")
  .max(90000, "Ukuran berkas banner terlalu besar")
  .refine(
    (val) =>
      isSafeImageOrAssetUrl(val, {
        allowRootRelative: true,
        allowRasterDataUri: true,
        maxDataUriLength: 90_000,
      }),
    {
      message:
        "Format banner harus berupa URL valid atau data gambar terkompresi",
    },
  );

export const eventBaseSchema = z
  .object({
    calendarId: z.string().uuid("ID kalender harus berupa UUID valid"),
    bookId: z.string().uuid("ID buku harus berupa UUID valid").optional(),
    featuredWork: featuredWorkSchema.optional(),
    title: z.string().min(3, "Judul acara minimal 3 karakter").max(200),
    description: z
      .string()
      .min(10, "Deskripsi acara minimal 10 karakter")
      .max(10000),
    logisticsNotes: z.string().max(3000).optional(),
    coverUrl: bannerUrlSchema,
    themePreset: eventThemeSchema,
    visibility: z.enum(eventVisibilityValues).default("public"),
    eventType: z.enum(eventTypeValues).default("book_club"),
    categoryTag: z.string().max(50).default("Literasi"),
    coHosts: z.array(coHostSchema).max(5).default([]),
    format: z.enum(eventFormatValues).default("offline"),
    district: z.string().max(100).optional(),
    city: z.string().max(80).optional(),
    venueName: z.string().max(160).optional(),
    venueAddress: z.string().max(500).optional(),
    hideAddressUntilApproved: z.boolean().default(false),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    placeSourceLat: z.number().min(-90).max(90).optional(),
    placeSourceLng: z.number().min(-180).max(180).optional(),
    onlineMeetingUrl: z
      .string()
      .trim()
      .refine((val) => val === "" || isSafeHttpUrl(val), {
        message: "Tautan rapat virtual harus berupa URL HTTP(S) valid",
      })
      .optional(),
    startsAt: z
      .string()
      .datetime({ message: "Format waktu mulai harus ISO 8601" }),
    endsAt: z
      .string()
      .datetime({ message: "Format waktu selesai harus ISO 8601" }),
    timezone: z.string().default("Asia/Jakarta"),
    capacity: z
      .number()
      .int()
      .min(1, "Kapasitas minimal 1 orang")
      .max(10000)
      .optional(),
    requiresApproval: z.boolean().default(false),
    allowWaitlist: z.boolean().default(true),
  })
  .strict();

export const createEventSchema = eventBaseSchema.superRefine((data, ctx) => {
  const start = new Date(data.startsAt);
  const end = new Date(data.endsAt);
  if (end <= start) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["endsAt"],
      message: "Waktu selesai harus setelah waktu mulai acara",
    });
  }

  if (data.format === "offline" || data.format === "hybrid") {
    if (!data.venueName && !data.venueAddress) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["venueName"],
        message: "Nama tempat atau alamat fisik wajib diisi untuk acara luring",
      });
    }

    if (
      typeof data.latitude === "number" &&
      typeof data.longitude === "number" &&
      typeof data.placeSourceLat === "number" &&
      typeof data.placeSourceLng === "number"
    ) {
      const dist = haversineDistanceMeters(
        data.latitude,
        data.longitude,
        data.placeSourceLat,
        data.placeSourceLng,
      );
      if (dist > 1000) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["latitude"],
          message: `Pin peta digeser ${dist}m, melebihi batas maksimal 1 km (1000m) dari alamat yang dipilih`,
        });
      }
    }
  }

  if (data.format === "online" && !data.onlineMeetingUrl) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["onlineMeetingUrl"],
      message: "Tautan rapat virtual wajib diisi untuk acara daring",
    });
  }
});

export const updateEventSchema = eventBaseSchema
  .omit({ calendarId: true })
  .extend({
    bookId: z
      .string()
      .uuid("ID buku harus berupa UUID valid")
      .nullable()
      .optional(),
    featuredWork: featuredWorkSchema.nullable().optional(),
    themePreset: eventThemeInputSchema,
    visibility: z.enum(eventVisibilityValues),
    eventType: z.enum(eventTypeValues),
    categoryTag: z.string().max(50),
    coHosts: z.array(coHostSchema).max(5),
    format: z.enum(eventFormatValues),
    hideAddressUntilApproved: z.boolean(),
    timezone: z.string(),
    requiresApproval: z.boolean(),
    allowWaitlist: z.boolean(),
    capacity: z
      .number()
      .int()
      .min(1, "Kapasitas minimal 1 orang")
      .max(10000)
      .nullable()
      .optional(),
    logisticsNotes: z.string().max(3000).nullable().optional(),
    onlineMeetingUrl: z
      .string()
      .trim()
      .refine((val) => val === "" || isSafeHttpUrl(val), {
        message: "Tautan rapat virtual harus berupa URL HTTP(S) valid",
      })
      .nullable()
      .optional(),
    venueName: z.string().max(160).nullable().optional(),
    venueAddress: z.string().max(500).nullable().optional(),
    district: z.string().max(100).nullable().optional(),
    city: z.string().max(80).nullable().optional(),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
  })
  .partial()
  .strict()
  .superRefine((data, ctx) => {
    if (data.startsAt && data.endsAt) {
      if (new Date(data.endsAt) <= new Date(data.startsAt)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["endsAt"],
          message: "Waktu selesai harus setelah waktu mulai acara",
        });
      }
    }
  });

export const rsvpEventSchema = z
  .object({
    note: z.string().max(500).optional(),
  })
  .strict();

export const checkInRsvpSchema = z
  .object({
    checkinCode: z.string().min(4).max(32).optional(),
    userId: z.string().optional(),
  })
  .strict()
  .refine((data) => data.checkinCode || data.userId, {
    message: "Harus menyertakan checkinCode atau userId",
  });

export const reportEventSchema = z
  .object({
    reason: z
      .string()
      .min(5, "Alasan pelaporan minimal 5 karakter")
      .max(1000, "Alasan pelaporan maksimal 1000 karakter"),
  })
  .strict();

export const listEventsQuerySchema = z
  .object({
    calendarSlug: z.string().optional(),
    bookId: z.string().uuid().optional(),
    city: z.string().optional(),
    q: z.string().trim().max(120).optional(),
    format: z.enum(eventFormatValues).optional(),
    eventType: z.enum(eventTypeValues).optional(),
    filter: z
      .enum(["upcoming", "past", "my_rsvps", "hosting"])
      .default("upcoming"),
    timeScope: z.enum(["upcoming", "past", "all"]).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(30),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .strict();

export type UpsertShelfInput = z.infer<typeof upsertShelfSchema>;
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type CreateParagraphCommentInput = z.infer<
  typeof createParagraphCommentSchema
>;
export type ListParagraphCommentsQuery = z.infer<
  typeof listParagraphCommentsQuerySchema
>;
export type FeaturedWorkInput = z.infer<typeof featuredWorkSchema>;
export type CoHostInput = z.infer<typeof coHostSchema>;
export type AddCalendarMemberInput = z.input<typeof addCalendarMemberSchema>;
export type AddCalendarMemberOutput = z.output<typeof addCalendarMemberSchema>;
export type UpdateCalendarMemberInput = z.infer<
  typeof updateCalendarMemberSchema
>;
export type CreateCalendarInput = z.infer<typeof createCalendarSchema>;
export type UpdateCalendarInput = z.infer<typeof updateCalendarSchema>;
export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type RsvpEventInput = z.infer<typeof rsvpEventSchema>;
export type CheckInRsvpInput = z.infer<typeof checkInRsvpSchema>;
export type ReportEventInput = z.infer<typeof reportEventSchema>;
export type ListEventsInput = z.input<typeof listEventsQuerySchema>;
export type ListEventsQuery = z.infer<typeof listEventsQuerySchema>;

export const meetingPlatformValues = [
  "google_meet",
  "zoom",
  "teams",
  "discord",
  "youtube",
  "virtual",
] as const;
export type MeetingPlatform = (typeof meetingPlatformValues)[number];

/**
 * Infers the virtual meeting provider from a submitted meeting URL so cards
 * and event detail buttons can label the platform cleanly without exposing raw URLs.
 */
export function detectMeetingPlatform(
  url?: string | null,
): MeetingPlatform | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  if (
    /^(javascript|data|vbscript|file):/i.test(trimmed) ||
    trimmed.startsWith("/")
  ) {
    return null;
  }
  const candidate = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    const host = parsed.hostname.toLowerCase();
    if (!host || (!host.includes(".") && host !== "localhost")) {
      return null;
    }
    if (
      host === "meet.google.com" ||
      (host === "g.co" && parsed.pathname.toLowerCase().startsWith("/meet"))
    ) {
      return "google_meet";
    }
    if (
      host === "zoom.us" ||
      host.endsWith(".zoom.us") ||
      host === "zoom.com" ||
      host.endsWith(".zoom.com")
    ) {
      return "zoom";
    }
    if (host === "teams.microsoft.com" || host === "teams.live.com") {
      return "teams";
    }
    if (
      host === "discord.gg" ||
      host === "discord.com" ||
      host.endsWith(".discord.com")
    ) {
      return "discord";
    }
    if (
      host === "youtube.com" ||
      host.endsWith(".youtube.com") ||
      host === "youtu.be"
    ) {
      return "youtube";
    }
    return "virtual";
  } catch {
    return null;
  }
}

export function getMeetingPlatformMeta(platform?: MeetingPlatform | null): {
  id: MeetingPlatform;
  label: string;
  ctaLabel: string;
} {
  switch (platform) {
    case "google_meet":
      return {
        id: "google_meet",
        label: "Google Meet",
        ctaLabel: "Buka Google Meet",
      };
    case "zoom":
      return { id: "zoom", label: "Zoom", ctaLabel: "Gabung via Zoom" };
    case "teams":
      return {
        id: "teams",
        label: "Microsoft Teams",
        ctaLabel: "Buka Microsoft Teams",
      };
    case "discord":
      return {
        id: "discord",
        label: "Discord",
        ctaLabel: "Masuk ke Discord",
      };
    case "youtube":
      return {
        id: "youtube",
        label: "YouTube Live",
        ctaLabel: "Tonton di YouTube",
      };
    case "virtual":
    default:
      return {
        id: "virtual",
        label: "Ruang Virtual",
        ctaLabel: "Buka Ruang Rapat",
      };
  }
}
