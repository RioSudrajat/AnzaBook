import { z } from "zod";

export const simulatePrintSchema = z
  .object({
    pageCount: z
      .number()
      .int("Jumlah halaman harus berupa bilangan bulat")
      .min(24, "Jumlah halaman minimal 24")
      .max(1200, "Jumlah halaman maksimal 1200"),
    printRun: z
      .number()
      .int("Oplah cetak harus berupa bilangan bulat")
      .min(100, "Oplah minimal 100 eksemplar")
      .max(50000, "Oplah maksimal 50000 eksemplar"),
    authorRoyaltyPct: z
      .number()
      .min(5, "Royalti penulis minimal 5%")
      .max(25, "Royalti penulis maksimal 25%")
      .default(12),
  })
  .strict();

export const applyPublisherSchema = z
  .object({
    name: z
      .string()
      .min(2, "Nama penerbit minimal 2 karakter")
      .max(255, "Nama penerbit maksimal 255 karakter"),
    slug: z
      .string()
      .min(2, "Slug minimal 2 karakter")
      .max(120, "Slug maksimal 120 karakter")
      .regex(
        /^[a-z0-9-]+$/,
        "Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung",
      ),
    ikapiNumber: z.string().max(80, "Nomor IKAPI maksimal 80 karakter").optional().nullable(),
    description: z.string().max(2000, "Deskripsi maksimal 2000 karakter").optional().nullable(),
    logoUrl: z.string().url("URL logo tidak valid").or(z.literal("")).optional().nullable(),
    city: z.string().max(80, "Kota maksimal 80 karakter").optional().nullable(),
    address: z.string().max(500, "Alamat maksimal 500 karakter").optional().nullable(),
    contactEmail: z.string().email("Email narahubung tidak valid").max(255).optional().nullable(),
  })
  .strict();

export const digitalPolicyEnum = z.enum([
  "free_open",
  "print_claim_only",
  "sample_only",
  "alacarte_only",
  "hybrid_nakama_alacarte",
]);

export const submitManuscriptChapterSchema = z
  .object({
    chapterNumber: z.number().int().min(1, "Nomor bab minimal 1"),
    titleId: z.string().min(1, "Judul bab wajib diisi").max(255),
    contentId: z.string().min(1, "Konten bab wajib diisi"),
    contentEn: z.string().optional().nullable(),
    blueprintContent: z.string().optional().nullable(),
    estimatedMinutes: z.number().int().min(1).default(5),
  })
  .strict();

export const submitManuscriptSchema = z
  .object({
    publisherId: z.string().uuid("ID penerbit tidak valid").optional().nullable(),
    title: z
      .string()
      .min(2, "Judul naskah minimal 2 karakter")
      .max(255, "Judul naskah maksimal 255 karakter"),
    synopsis: z
      .string()
      .min(20, "Sinopsis naskah minimal 20 karakter")
      .max(5000, "Sinopsis naskah maksimal 5000 karakter"),
    proposedDigitalPolicy: digitalPolicyEnum,
    proposedAlacartePriceIdr: z
      .number()
      .int("Harga harus berupa bilangan bulat")
      .min(0, "Harga minimal 0")
      .max(10_000_000, "Harga maksimal 10.000.000")
      .optional()
      .nullable(),
    printSimJson: z.record(z.string(), z.unknown()).optional().nullable(),
    chapters: z
      .array(submitManuscriptChapterSchema)
      .min(1, "Minimal sertakan 1 bab naskah")
      .optional(),
  })
  .strict();

export const updateManuscriptSchema = z
  .object({
    title: z.string().min(2).max(255).optional(),
    synopsis: z.string().min(20).max(5000).optional(),
    proposedDigitalPolicy: digitalPolicyEnum.optional(),
    proposedAlacartePriceIdr: z.number().int().min(0).max(10_000_000).optional().nullable(),
    printSimJson: z.record(z.string(), z.unknown()).optional().nullable(),
    status: z
      .enum(["pending_review", "in_editing", "published", "rejected"])
      .optional(),
    rejectionReason: z.string().max(1000).optional().nullable(),
    publishedBookId: z.string().uuid("ID buku tidak valid").optional().nullable(),
  })
  .strict();

export const createClaimBatchSchema = z
  .object({
    bookId: z.string().uuid("ID buku tidak valid"),
    publisherId: z.string().uuid("ID penerbit tidak valid"),
    batchName: z
      .string()
      .min(2, "Nama batch minimal 2 karakter")
      .max(160, "Nama batch maksimal 160 karakter"),
    totalCodes: z
      .number()
      .int("Jumlah kode harus bilangan bulat")
      .min(1, "Jumlah kode minimal 1")
      .max(50_000, "Jumlah kode maksimal 50.000"),
  })
  .strict();

export const purchaseBookAlacarteSchema = z
  .object({
    bookId: z.string().uuid("ID buku tidak valid"),
    affiliateCalendarId: z.string().uuid("ID kalender afiliasi tidak valid").optional().nullable(),
    paymentMethod: z
      .enum(["manual_or_midtrans", "qris", "credit_card", "bank_transfer"])
      .default("manual_or_midtrans")
      .optional(),
  })
  .strict();

export type SimulatePrintSchemaInput = z.infer<typeof simulatePrintSchema>;
export type ApplyPublisherInput = z.infer<typeof applyPublisherSchema>;
export type SubmitManuscriptInput = z.infer<typeof submitManuscriptSchema>;
export type UpdateManuscriptInput = z.infer<typeof updateManuscriptSchema>;
export type CreateClaimBatchInput = z.infer<typeof createClaimBatchSchema>;
export type PurchaseBookAlacarteInput = z.infer<typeof purchaseBookAlacarteSchema>;
