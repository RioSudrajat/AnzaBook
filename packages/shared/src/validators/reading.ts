import { z } from "zod";

export const createReadingSessionSchema = z
  .object({
    bookId: z.string().uuid("ID buku harus berupa UUID valid"),
    pagesRead: z
      .number()
      .int("Jumlah halaman harus berupa bilangan bulat")
      .min(1, "Minimal 1 halaman dibaca")
      .max(1000, "Maksimal 1000 halaman per sesi"),
    durationSeconds: z
      .number()
      .int("Durasi membaca harus berupa bilangan bulat")
      .min(10, "Durasi membaca minimal 10 detik")
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

export type CreateReadingSessionInput = z.infer<typeof createReadingSessionSchema>;
export type ListReadingSessionsQuery = z.infer<typeof listReadingSessionsQuerySchema>;
