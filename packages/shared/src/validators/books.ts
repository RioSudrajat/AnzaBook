import { z } from "zod";

export const listBooksQuerySchema = z
  .object({
    search: z.string().max(100).optional(),
    category: z.string().max(50).optional(),
    paperTier: z
      .enum(["all", "rakyat_economy", "standard_trade", "kolektor_hardcover"])
      .optional()
      .default("all"),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .strict();

export const bookSlugSchema = z
  .object({
    slug: z
      .string()
      .min(1)
      .max(120)
      .regex(/^[a-z0-9-]+$/, "Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung"),
  })
  .strict();

export const readBookQuerySchema = z
  .object({
    mode: z.enum(["full", "blueprint", "audio"]).default("full"),
    chapter: z.coerce.number().int().min(1).default(1),
  })
  .strict();

export const stockQuerySchema = z
  .object({
    city: z.string().max(80).optional(),
    partner: z
      .enum(["all", "gramedia", "togamas", "pos_indonesia", "komunitas"])
      .optional()
      .default("all"),
  })
  .strict();

export const claimPrintCodeSchema = z
  .object({
    code: z
      .string()
      .min(6, "Kode klaim minimal 6 karakter")
      .max(32, "Kode klaim maksimal 32 karakter")
      .transform((val) => val.trim().toUpperCase()),
  })
  .strict();

export type ListBooksQuery = z.infer<typeof listBooksQuerySchema>;
export type ReadBookQuery = z.infer<typeof readBookQuerySchema>;
export type StockQuery = z.infer<typeof stockQuerySchema>;
export type ClaimPrintCodeInput = z.infer<typeof claimPrintCodeSchema>;
