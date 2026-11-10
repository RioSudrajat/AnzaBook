import { z } from "zod";

export const createReadingSessionSchema = z
  .object({
    bookId: z.string().uuid("ID buku harus berupa UUID valid"),
    sessionId: z.string().uuid().optional(),
    pagesRead: z
      .number()
      .int("Jumlah halaman harus berupa bilangan bulat")
      .min(1, "Minimal 1 halaman dibaca")
      .max(1000, "Maksimal 1000 halaman per sesi"),
    durationSeconds: z
      .number()
      .int("Durasi membaca harus berupa bilangan bulat")
      .min(1, "Durasi membaca minimal 1 detik")
      .max(28800, "Durasi membaca maksimal 8 jam"),
    avgWpm: z
      .number()
      .int("Kecepatan membaca harus berupa bilangan bulat")
      .min(30, "Kecepatan membaca minimal 30 kata per menit")
      .max(1200, "Kecepatan membaca maksimal 1200 kata per menit"),
    mode: z.enum(["full", "blueprint", "audio"]).default("full"),
  })
  .strict();

export const listReadingSessionsQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(30),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .strict();

export const createHighlightSchema = z
  .object({
    bookId: z.string().uuid("ID buku harus berupa UUID valid"),
    chapterId: z.string().uuid().optional().nullable(),
    chapterNumber: z.number().int().min(1).default(1),
    pageNumber: z.number().int().min(1).default(1),
    selectedText: z
      .string()
      .min(1, "Teks kutipan tidak boleh kosong")
      .max(5000),
    color: z.enum(["yellow", "green", "coral", "blue"]).default("yellow"),
    note: z.string().max(2000).optional().nullable(),
  })
  .strict();

export const saveReadingProgressSchema = z
  .object({
    lastChapterId: z.string().uuid().optional().nullable(),
    lastChapterNumber: z.number().int().min(1).default(1),
    lastPageNumber: z.number().int().min(1).default(1),
    lastScrollPercent: z.number().int().min(0).max(100).default(0),
    lastParagraphIndex: z.number().int().min(0).optional(),
    layout: z.enum(["scroll", "slide"]).optional(),
    capturedAt: z
      .number()
      .int()
      .nonnegative()
      .max(Number.MAX_SAFE_INTEGER)
      .optional(),
  })
  .strict();

export const readingBookParamsSchema = z
  .object({ bookId: z.string().uuid() })
  .strict();

export const readingProgressQuerySchema = z
  .object({ scope: z.enum(["full", "preview"]).default("full") })
  .strict();

export type CreateReadingSessionInput = z.infer<
  typeof createReadingSessionSchema
>;
export type ListReadingSessionsQuery = z.infer<
  typeof listReadingSessionsQuerySchema
>;
export type CreateHighlightInput = z.infer<typeof createHighlightSchema>;
export type SaveReadingProgressInput = z.infer<
  typeof saveReadingProgressSchema
>;
