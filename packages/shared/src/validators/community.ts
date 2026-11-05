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
      .enum(["rakyat_economy", "standard_trade", "kolektor_hardcover", "digital"])
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

export type UpsertShelfInput = z.infer<typeof upsertShelfSchema>;
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type CreateParagraphCommentInput = z.infer<typeof createParagraphCommentSchema>;
export type ListParagraphCommentsQuery = z.infer<typeof listParagraphCommentsQuerySchema>;
