import { z } from "zod";

export const adminVerifyCalendarSchema = z
  .object({
    verificationStatus: z
      .enum(["pending", "verified", "trusted", "rejected"])
      .optional(),
    status: z
      .enum(["pending", "verified", "trusted", "rejected"])
      .optional(),
  })
  .refine(
    (data) => data.verificationStatus !== undefined || data.status !== undefined,
    {
      message: "Status verifikasi wajib diisi",
    },
  );

export const adminReviewAuthorApplicationSchema = z
  .object({
    status: z.enum(["verified", "rejected"]),
    reviewNotes: z.string().max(1000).optional().nullable(),
  })
  .strict();

export const adminVerifyPublisherSchema = z
  .object({
    verificationStatus: z
      .enum(["pending", "verified", "rejected"])
      .optional(),
    status: z
      .enum(["pending", "verified", "rejected"])
      .optional(),
  })
  .refine(
    (data) => data.verificationStatus !== undefined || data.status !== undefined,
    {
      message: "Status verifikasi penerbit wajib diisi",
    },
  );

export const adminEditManuscriptChapterSchema = z
  .object({
    id: z.string().uuid().optional(),
    chapterNumber: z.number().int().positive(),
    titleId: z.string().min(1).max(255),
    contentId: z.string().min(1),
    contentEn: z.string().optional().nullable(),
    blueprintContent: z.string().optional().nullable(),
    estimatedMinutes: z.number().int().min(1).default(5),
  })
  .strict();

export const adminEditManuscriptSchema = z
  .object({
    title: z.string().min(2).max(255).optional(),
    synopsis: z.string().min(10).optional(),
    proposedDigitalPolicy: z
      .enum([
        "free_open",
        "sample_only",
        "alacarte_only",
        "print_claim_only",
        "hybrid_nakama_alacarte",
      ])
      .optional(),
    proposedAlacartePriceIdr: z.number().int().min(0).optional().nullable(),
    status: z
      .enum(["pending_review", "in_editing", "published", "rejected"])
      .optional(),
    rejectionReason: z.string().max(1000).optional().nullable(),
    chapters: z.array(adminEditManuscriptChapterSchema).optional(),
  })
  .strict();

export const adminPublishManuscriptSchema = z
  .object({
    coverUrl: z.string().optional().nullable(),
    digitalPolicy: z
      .enum([
        "free_open",
        "sample_only",
        "alacarte_only",
        "print_claim_only",
        "hybrid_nakama_alacarte",
      ])
      .optional(),
    alacartePriceIdr: z.number().int().min(0).optional().nullable(),
    author: z.string().max(255).optional(),
  })
  .strict()
  .optional();

export const adminListQuerySchema = z
  .object({
    status: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .strict();

export type AdminVerifyCalendarInput = z.infer<typeof adminVerifyCalendarSchema>;
export type AdminReviewAuthorApplicationInput = z.infer<
  typeof adminReviewAuthorApplicationSchema
>;
export type AdminVerifyPublisherInput = z.infer<
  typeof adminVerifyPublisherSchema
>;
export type AdminEditManuscriptInput = z.infer<typeof adminEditManuscriptSchema>;
export type AdminPublishManuscriptInput = z.infer<
  typeof adminPublishManuscriptSchema
>;
export type AdminListQueryInput = z.infer<typeof adminListQuerySchema>;
