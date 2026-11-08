import { z } from "zod";

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
export type EventTheme = (typeof eventThemeValues)[number];

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

export const featuredWorkSchema = z.object({
  mediaType: z.enum(["book", "film", "article", "other"]),
  title: z.string().min(1, "Judul karya wajib diisi").max(200),
  creator: z.string().max(160).optional(),
  externalUrl: z.string().url("Tautan karya harus URL valid").optional().or(z.literal("")),
});

export const coHostSchema = z.object({
  name: z.string().min(1).max(100),
  avatarUrl: z.string().optional(),
  roleLabel: z.string().max(60).optional(),
});

export const createCalendarSchema = z
  .object({
    name: z.string().min(3, "Nama kalender minimal 3 karakter").max(100),
    slug: z
      .string()
      .min(3, "Slug minimal 3 karakter")
      .max(80)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug hanya boleh huruf kecil, angka, dan strip"),
    type: z.enum(calendarTypeValues).default("community"),
    description: z.string().max(2000).default(""),
    avatarUrl: z.string().optional(),
    coverUrl: z.string().optional(),
    city: z.string().max(80).optional(),
    contactEmail: z.string().email("Email kontak tidak valid").optional().or(z.literal("")),
    socialLinks: z
      .object({
        instagram: z.string().optional(),
        twitter: z.string().optional(),
        website: z.string().optional(),
      })
      .optional(),
  })
  .strict();

export const updateCalendarSchema = createCalendarSchema.partial();

const bannerUrlSchema = z
  .string()
  .min(1, "Banner poster acara wajib diisi")
  .max(90000, "Ukuran berkas banner terlalu besar")
  .refine(
    (val) =>
      val.startsWith("http://") ||
      val.startsWith("https://") ||
      val.startsWith("data:image/"),
    { message: "Format banner harus berupa URL valid atau data gambar terkompresi" },
  );

export const eventBaseSchema = z
  .object({
    calendarId: z.string().uuid("ID kalender harus berupa UUID valid"),
    bookId: z.string().uuid("ID buku harus berupa UUID valid").optional(),
    featuredWork: featuredWorkSchema.optional(),
    title: z.string().min(3, "Judul acara minimal 3 karakter").max(200),
    description: z.string().min(10, "Deskripsi acara minimal 10 karakter").max(10000),
    logisticsNotes: z.string().max(3000).optional(),
    coverUrl: bannerUrlSchema,
    themePreset: z.enum(eventThemeValues).default("minimal"),
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
    onlineMeetingUrl: z.string().url("Tautan rapat virtual harus berupa URL valid").optional().or(z.literal("")),
    startsAt: z.string().datetime({ message: "Format waktu mulai harus ISO 8601" }),
    endsAt: z.string().datetime({ message: "Format waktu selesai harus ISO 8601" }),
    timezone: z.string().default("Asia/Jakarta"),
    capacity: z.number().int().min(1, "Kapasitas minimal 1 orang").max(10000).optional(),
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

export const updateEventSchema = eventBaseSchema.partial();

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
    format: z.enum(eventFormatValues).optional(),
    eventType: z.enum(eventTypeValues).optional(),
    filter: z.enum(["upcoming", "past", "my_rsvps"]).default("upcoming"),
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
export type CreateCalendarInput = z.infer<typeof createCalendarSchema>;
export type UpdateCalendarInput = z.infer<typeof updateCalendarSchema>;
export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type RsvpEventInput = z.infer<typeof rsvpEventSchema>;
export type CheckInRsvpInput = z.infer<typeof checkInRsvpSchema>;
export type ReportEventInput = z.infer<typeof reportEventSchema>;
export type ListEventsQuery = z.infer<typeof listEventsQuerySchema>;
