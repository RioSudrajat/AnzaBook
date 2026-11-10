import { z } from "zod";

export const listBooksQuerySchema = z
  .object({
    search: z.string().max(100).optional(),
    category: z.string().max(50).optional(),
    language: z.string().max(10).optional(),
    accessTier: z.enum(["all", "free", "premium"]).optional().default("all"),
    digitalPolicy: z
      .enum([
        "all",
        "free_open",
        "print_claim_only",
        "sample_only",
        "alacarte_only",
        "hybrid_nakama_alacarte",
      ])
      .optional()
      .default("all"),
    publisher: z.string().max(100).optional(),
    collection: z.string().max(120).optional(),
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
      .regex(
        /^[a-z0-9-]+$/,
        "Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung",
      ),
  })
  .strict();

export const readBookQuerySchema = z
  .object({
    mode: z.enum(["full", "blueprint", "audio"]).default("full"),
    chapter: z.coerce.number().int().min(1).default(1),
    continuous: z.enum(["true", "false"]).optional(),
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

export type ListBooksInput = {
  search?: string;
  category?: string;
  language?: string;
  accessTier?: "all" | "free" | "premium";
  digitalPolicy?:
    | "all"
    | "free_open"
    | "print_claim_only"
    | "sample_only"
    | "alacarte_only"
    | "hybrid_nakama_alacarte";
  publisher?: string;
  collection?: string;
  paperTier?:
    "all" | "rakyat_economy" | "standard_trade" | "kolektor_hardcover";
  limit?: number;
  offset?: number;
};
export type ListBooksQuery = z.infer<typeof listBooksQuerySchema>;

export type ReadBookInput = {
  mode?: "full" | "blueprint" | "audio";
  chapter?: number;
  continuous?: boolean;
};
export type ReadBookQuery = z.infer<typeof readBookQuerySchema>;

export type StockInput = {
  city?: string;
  partner?: "all" | "gramedia" | "togamas" | "pos_indonesia" | "komunitas";
};
export type StockQuery = z.infer<typeof stockQuerySchema>;

export type ClaimPrintCodeInput = z.input<typeof claimPrintCodeSchema>;
export type ClaimPrintCodeOutput = z.infer<typeof claimPrintCodeSchema>;
