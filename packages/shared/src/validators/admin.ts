import { z } from "zod";

export const adminVerifyCalendarSchema = z
  .object({
    verificationStatus: z
      .enum(["pending", "verified", "trusted", "rejected"])
      .optional(),
    status: z.enum(["pending", "verified", "trusted", "rejected"]).optional(),
    rejectionReason: z.string().max(1000).optional().nullable(),
  })
  .refine(
    (data) =>
      data.verificationStatus !== undefined || data.status !== undefined,
    {
      message: "Status verifikasi wajib diisi",
    },
  );

export const adminReviewAuthorApplicationSchema = z
  .object({
    status: z.enum(["verified", "rejected"]),
    reviewNotes: z.string().max(1000).optional().nullable(),
    rejectionReason: z.string().max(1000).optional().nullable(),
  })
  .strict();

export const adminVerifyPublisherSchema = z
  .object({
    verificationStatus: z.enum(["pending", "verified", "rejected"]).optional(),
    status: z.enum(["pending", "verified", "rejected"]).optional(),
    rejectionReason: z.string().max(1000).optional().nullable(),
  })
  .refine(
    (data) =>
      data.verificationStatus !== undefined || data.status !== undefined,
    {
      message: "Status verifikasi penerbit wajib diisi",
    },
  );

export const adminListQuerySchema = z
  .object({
    status: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .strict();

export type AdminVerifyCalendarInput = z.infer<
  typeof adminVerifyCalendarSchema
>;
export type AdminReviewAuthorApplicationInput = z.infer<
  typeof adminReviewAuthorApplicationSchema
>;
export type AdminVerifyPublisherInput = z.infer<
  typeof adminVerifyPublisherSchema
>;
export type AdminListQueryInput = {
  status?: string;
  limit?: number;
  offset?: number;
};
export type AdminListQueryOutput = z.infer<typeof adminListQuerySchema>;
