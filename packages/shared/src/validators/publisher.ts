import { z } from "zod";
import type { AccessTier, BookDistributionModel } from "../types/api";
import {
  isSafeSocialLinkValue,
  safeVerificationDocumentsSchema,
} from "./url-safety";

const ROOT_RELATIVE_ASSET_PATH_REGEX = /^\/(?!\/)[^\s]*$/;
const HTTP_URL_SCHEMA = z.string().url({ protocol: /^https?$/ });

const publisherSocialHandleOrUrlSchema = z
  .string()
  .max(500, "Tautan media sosial terlalu panjang")
  .refine((val) => isSafeSocialLinkValue(val, { allowHandle: true }), {
    message: "Tautan atau handle media sosial tidak valid",
  });

const publisherWebsiteSchema = z
  .string()
  .max(500, "URL situs web terlalu panjang")
  .refine((val) => isSafeSocialLinkValue(val, { allowBareDomain: true }), {
    message: "URL situs web tidak valid",
  });

export const DEFAULT_DIGITAL_BOOK_PRICE_IDR = 45_000;

export function deriveAccessTier(model: BookDistributionModel): AccessTier {
  if (model === "free_open") return "free";
  return "premium";
}

/**
 * Validates an asset reference as an HTTP(S) URL, a root-relative path
 * (rejecting protocol-relative `//` URLs), or an empty string.
 */
export function safeAssetUrlSchema(invalidMessage = "URL tidak valid") {
  return z
    .string()
    .refine(
      (value) =>
        value === "" ||
        ROOT_RELATIVE_ASSET_PATH_REGEX.test(value) ||
        HTTP_URL_SCHEMA.safeParse(value).success,
      { message: invalidMessage },
    );
}

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
    ikapiNumber: z
      .string()
      .max(80, "Nomor IKAPI maksimal 80 karakter")
      .optional()
      .nullable(),
    description: z
      .string()
      .max(2000, "Deskripsi maksimal 2000 karakter")
      .optional()
      .nullable(),
    logoUrl: safeAssetUrlSchema("URL logo tidak valid").optional().nullable(),
    headerImageUrl: safeAssetUrlSchema("URL banner tidak valid")
      .optional()
      .nullable(),
    city: z.string().max(80, "Kota maksimal 80 karakter").optional().nullable(),
    address: z
      .string()
      .max(500, "Alamat maksimal 500 karakter")
      .optional()
      .nullable(),
    contactEmail: z
      .string()
      .email("Email narahubung tidak valid")
      .max(255)
      .optional()
      .nullable(),
    socialLinks: z
      .object({
        instagram: publisherSocialHandleOrUrlSchema.optional(),
        twitter: publisherSocialHandleOrUrlSchema.optional(),
        website: publisherWebsiteSchema.optional(),
        whatsapp: publisherSocialHandleOrUrlSchema.optional(),
      })
      .optional()
      .nullable(),
    verificationDocuments: safeVerificationDocumentsSchema.optional(),
    topics: z.array(z.string().trim().min(1).max(60)).max(15).optional(),
    isAcceptingSubmissions: z.boolean().optional(),
    submissionGuidelines: z.string().max(2000).optional().nullable(),
  })
  .strict();

export const updatePublisherSchema = applyPublisherSchema.partial();

export const bookDistributionModelEnum = z.enum([
  "free_open",
  "nakama_subscription",
  "single_purchase",
]);

export const sourceLanguageEnum = z.enum(["id", "en"]);
export const targetAudienceEnum = z.enum([
  "general",
  "young_adult",
  "mature_academic",
]);

export const manuscriptStatusEnum = z.enum([
  "draft",
  "pending_review",
  "in_editing",
  "revision_requested",
  "published",
  "rejected",
]);

export const submitManuscriptChapterSchema = z
  .object({
    id: z.string().uuid().optional(),
    chapterNumber: z.number().int().min(1, "Nomor bab minimal 1"),
    titleId: z.string().max(255),
    contentId: z.string(),
    contentEn: z.string().optional().nullable(),
    blueprintContent: z.string().optional().nullable(),
    estimatedMinutes: z.number().int().min(1).default(5),
  })
  .strict();

export const createManuscriptDraftSchema = z
  .object({
    publisherId: z
      .string()
      .uuid("ID penerbit tidak valid")
      .optional()
      .nullable(),
    title: z.string().max(255).default(""),
    slug: z.string().max(255).optional().nullable(),
    coverUrl: z.string().optional().nullable(),
    coverColor: z
      .string()
      .regex(/^#[0-9a-f]{3,8}$/i, "Format warna hex tidak valid")
      .optional()
      .nullable(),
    category: z.string().max(80).optional().nullable(),
    synopsis: z.string().max(5000).default(""),
    sourceLanguage: sourceLanguageEnum.default("id").optional(),
    targetAudience: targetAudienceEnum.default("general").optional(),
    authorNotes: z.string().max(2000).optional().nullable(),
    isbn: z.string().trim().max(32).optional().nullable(),
    estimatedPages: z.number().int().min(1).max(3000).optional().nullable(),
    proposedDigitalPolicy: bookDistributionModelEnum.default(
      "nakama_subscription",
    ),
    proposedDigitalPriceIdr: z
      .number()
      .int()
      .min(0)
      .max(10_000_000)
      .optional()
      .nullable(),
    chapters: z.array(submitManuscriptChapterSchema).optional(),
  })
  .strict();

export const submitManuscriptSchema = z
  .object({
    publisherId: z
      .string()
      .uuid("ID penerbit tidak valid")
      .optional()
      .nullable(),
    title: z
      .string()
      .min(2, "Judul naskah minimal 2 karakter")
      .max(255, "Judul naskah maksimal 255 karakter"),
    synopsis: z
      .string()
      .min(10, "Sinopsis naskah minimal 10 karakter")
      .max(5000, "Sinopsis naskah maksimal 5000 karakter"),
    proposedDigitalPolicy: bookDistributionModelEnum,
    proposedDigitalPriceIdr: z
      .number()
      .int("Harga harus berupa bilangan bulat")
      .min(0, "Harga minimal 0")
      .max(10_000_000, "Harga maksimal 10.000.000")
      .optional()
      .nullable(),
    printSimJson: z.record(z.string(), z.unknown()).optional().nullable(),
    coverUrl: z.string().optional().nullable(),
    coverColor: z
      .string()
      .regex(/^#[0-9a-f]{3,8}$/i, "Format warna hex tidak valid")
      .optional()
      .nullable(),
    category: z.string().max(80).optional().nullable(),
    sourceLanguage: sourceLanguageEnum.optional(),
    targetAudience: targetAudienceEnum.optional(),
    authorNotes: z.string().max(2000).optional().nullable(),
    isbn: z.string().trim().max(32).optional().nullable(),
    estimatedPages: z.number().int().min(1).max(3000).optional().nullable(),
    chapters: z.array(submitManuscriptChapterSchema).optional(),
  })
  .strict();

const manuscriptEditableFields = {
  title: z.string().max(255).optional(),
  slug: z.string().max(255).optional().nullable(),
  coverUrl: z.string().optional().nullable(),
  coverColor: z
    .string()
    .regex(/^#[0-9a-f]{3,8}$/i, "Format warna hex tidak valid")
    .optional()
    .nullable(),
  category: z.string().max(80).optional().nullable(),
  synopsis: z.string().max(5000).optional(),
  sourceLanguage: sourceLanguageEnum.optional(),
  targetAudience: targetAudienceEnum.optional(),
  authorNotes: z.string().max(2000).optional().nullable(),
  isbn: z.string().trim().max(32).optional().nullable(),
  estimatedPages: z.number().int().min(1).max(3000).optional().nullable(),
  proposedDigitalPolicy: bookDistributionModelEnum.optional(),
  proposedDigitalPriceIdr: z
    .number()
    .int()
    .min(0)
    .max(10_000_000)
    .optional()
    .nullable(),
  printSimJson: z.record(z.string(), z.unknown()).optional().nullable(),
  chapters: z.array(submitManuscriptChapterSchema).optional(),
};

export const authorUpdateManuscriptSchema = z
  .object({
    publisherId: z
      .string()
      .uuid("ID penerbit tidak valid")
      .optional()
      .nullable(),
    ...manuscriptEditableFields,
  })
  .strict();

export const publisherEditManuscriptSchema = z
  .object({
    ...manuscriptEditableFields,
    editorialNotes: z.string().max(2000).optional().nullable(),
  })
  .strict();

export const publisherReviewManuscriptSchema = z
  .object({
    action: z.enum(["start_editing", "request_revision", "reject"]),
    notes: z.string().max(2000).optional().nullable(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (
      (data.action === "request_revision" || data.action === "reject") &&
      !data.notes?.trim()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["notes"],
        message: "Catatan revisi atau alasan penolakan wajib diisi",
      });
    }
  });

export const publishManuscriptSchema = z
  .object({
    title: z.string().trim().min(2).max(255).optional(),
    synopsis: z.string().trim().min(10).max(5000).optional(),
    coverUrl: safeAssetUrlSchema("URL cover tidak valid").optional().nullable(),
    coverColor: z
      .string()
      .regex(/^#[0-9a-f]{3,8}$/i, "Format warna hex tidak valid")
      .optional(),
    author: z.string().trim().min(1).max(255).optional(),
    digitalPolicy: bookDistributionModelEnum.optional(),
    digitalPriceIdr: z
      .number()
      .int()
      .min(0)
      .max(10_000_000)
      .optional()
      .nullable(),
    hasPhysical: z.boolean().optional(),
    categories: z.array(z.string().trim().min(1).max(60)).max(10).optional(),
    publishedYear: z.number().int().min(1900).max(2100).optional(),
    collectionName: z.string().trim().max(120).optional().nullable(),
    isbn: z.string().trim().max(32).optional().nullable(),
    rakyatPriceIdr: z.number().int().min(5000).max(5_000_000).optional(),
    standardPriceIdr: z.number().int().min(5000).max(5_000_000).optional(),
  })
  .strict()
  .optional();

export const listSubmissionTargetsQuerySchema = z
  .object({
    q: z.string().trim().max(120).optional(),
    topic: z.string().trim().max(80).optional(),
    limit: z.preprocess(
      (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
      z.coerce.number().int().min(1).max(100).default(50),
    ),
  })
  .strict();

export const publisherMemberRoleEnum = z.enum(["owner", "editor", "finance"]);

export const addPublisherMemberSchema = z
  .object({
    email: z.string().trim().email("Email tidak valid").max(255),
    role: publisherMemberRoleEnum.default("editor"),
  })
  .strict();

export const updatePublisherMemberSchema = z
  .object({
    role: publisherMemberRoleEnum,
  })
  .strict();

export const updatePublisherBookSchema = z
  .object({
    title: z.string().trim().min(2).max(255).optional(),
    synopsis: z.string().trim().min(10).max(5000).optional(),
    author: z.string().trim().min(1).max(255).optional(),
    coverUrl: safeAssetUrlSchema("URL cover tidak valid").optional().nullable(),
    coverColor: z
      .string()
      .regex(/^#[0-9a-f]{3,8}$/i, "Format warna hex tidak valid")
      .optional(),
    categories: z.array(z.string().trim().min(1).max(60)).max(10).optional(),
    digitalPolicy: bookDistributionModelEnum.optional(),
    digitalPriceIdr: z
      .number()
      .int()
      .min(0)
      .max(10_000_000)
      .optional()
      .nullable(),
    hasPhysical: z.boolean().optional(),
    publishedYear: z.number().int().min(1900).max(2100).optional(),
    collectionName: z.string().trim().max(120).optional().nullable(),
    rakyatPriceIdr: z.number().int().min(5000).max(5_000_000).optional(),
    standardPriceIdr: z.number().int().min(5000).max(5_000_000).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (
      data.digitalPolicy === "single_purchase" &&
      (data.digitalPriceIdr === 0 || data.digitalPriceIdr === null)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["digitalPriceIdr"],
        message: "Harga beli satuan digital harus lebih dari Rp0",
      });
    }
  });

export const addApprovedWriterSchema = z
  .object({
    identifier: z
      .string()
      .trim()
      .min(2, "Masukkan email atau username penulis")
      .max(255),
    canFastTrack: z.boolean().default(true),
  })
  .strict();

export const updateBookInventorySchema = z
  .object({
    items: z
      .array(
        z
          .object({
            branchId: z.string().uuid("ID cabang toko tidak valid"),
            rakyatStock: z.number().int().min(0).max(100_000),
            standardStock: z.number().int().min(0).max(100_000),
            stockStatus: z
              .enum(["available", "low_stock", "out_of_stock"])
              .optional(),
          })
          .strict(),
      )
      .max(100),
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

export const purchaseBookSchema = z
  .object({
    bookId: z.string().uuid("ID buku tidak valid").optional(),
    affiliateCalendarId: z
      .string()
      .uuid("ID kalender afiliasi tidak valid")
      .optional()
      .nullable(),
    affiliateCalendarSlug: z.string().optional().nullable(),
    paymentMethod: z
      .enum(["manual_or_midtrans", "qris", "credit_card", "bank_transfer"])
      .default("manual_or_midtrans")
      .optional(),
  })
  .strict();

export type SimulatePrintSchemaInput = z.infer<typeof simulatePrintSchema>;
export type ApplyPublisherInput = z.infer<typeof applyPublisherSchema>;
export type UpdatePublisherInput = z.infer<typeof updatePublisherSchema>;
export type CreateManuscriptDraftInput = z.infer<
  typeof createManuscriptDraftSchema
>;
export type SubmitManuscriptInput = z.infer<typeof submitManuscriptSchema>;
export type AuthorUpdateManuscriptInput = z.infer<
  typeof authorUpdateManuscriptSchema
>;
export type PublisherEditManuscriptInput = z.infer<
  typeof publisherEditManuscriptSchema
>;
export type PublisherReviewManuscriptInput = z.infer<
  typeof publisherReviewManuscriptSchema
>;
export type PublishManuscriptInput = z.infer<typeof publishManuscriptSchema>;
export type ListSubmissionTargetsInput = {
  q?: string;
  topic?: string;
  limit?: number;
};
export type ListSubmissionTargetsQuery = z.output<
  typeof listSubmissionTargetsQuerySchema
>;
export type AddPublisherMemberInput = z.input<typeof addPublisherMemberSchema>;
export type AddPublisherMemberOutput = z.output<
  typeof addPublisherMemberSchema
>;
export type UpdatePublisherMemberInput = z.infer<
  typeof updatePublisherMemberSchema
>;
export type UpdatePublisherBookInput = z.infer<
  typeof updatePublisherBookSchema
>;
export type AddApprovedWriterInput = z.input<typeof addApprovedWriterSchema>;
export type AddApprovedWriterOutput = z.output<typeof addApprovedWriterSchema>;
export type UpdateBookInventoryInput = z.infer<
  typeof updateBookInventorySchema
>;
export type CreateClaimBatchInput = z.infer<typeof createClaimBatchSchema>;
export type PurchaseBookInput = z.infer<typeof purchaseBookSchema>;
