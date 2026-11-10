import { z } from "zod";

export const socialLinksSchema = z
  .object({
    instagram: z.string().url("URL Instagram tidak valid").or(z.literal("")).optional(),
    twitter: z.string().url("URL Twitter / X tidak valid").or(z.literal("")).optional(),
    website: z.string().url("URL situs web tidak valid").or(z.literal("")).optional(),
    goodreads: z.string().url("URL Goodreads tidak valid").or(z.literal("")).optional(),
  })
  .strict();

export const updateProfileBioSchema = z
  .object({
    bio: z.string().max(1000, "Bio maksimal 1000 karakter").optional(),
    locationCity: z.string().max(80, "Kota maksimal 80 karakter").optional().nullable(),
    authorPenName: z.string().max(160, "Nama pena maksimal 160 karakter").optional().nullable(),
    socialLinks: socialLinksSchema.optional().nullable(),
  })
  .strict();

export const applyAuthorSchema = z
  .object({
    penName: z
      .string()
      .min(2, "Nama pena minimal 2 karakter")
      .max(160, "Nama pena maksimal 160 karakter"),
    bio: z
      .string()
      .min(10, "Bio kepenulisan minimal 10 karakter")
      .max(2000, "Bio kepenulisan maksimal 2000 karakter"),
    portfolioUrl: z
      .string()
      .url("URL portofolio tidak valid")
      .optional()
      .nullable()
      .or(z.literal("")),
    claimedBookId: z
      .string()
      .uuid("ID buku tidak valid")
      .optional()
      .nullable(),
  })
  .strict();

export const followUserSchema = z
  .object({
    targetUserId: z.string().min(1, "ID target pengguna wajib diisi"),
    isSubscribedUpdates: z.boolean().default(true).optional(),
  })
  .strict();

export type SocialLinksInput = z.infer<typeof socialLinksSchema>;
export type UpdateProfileBioInput = z.infer<typeof updateProfileBioSchema>;
export type ApplyAuthorInput = z.infer<typeof applyAuthorSchema>;
export type FollowUserInput = z.infer<typeof followUserSchema>;
