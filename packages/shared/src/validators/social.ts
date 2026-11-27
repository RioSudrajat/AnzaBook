import { z } from "zod";
import {
  isSafeHttpUrl,
  isSafeImageOrAssetUrl,
  isSafeSocialLinkValue,
  safeVerificationDocumentsSchema,
} from "./url-safety";

const socialHandleOrUrlSchema = z
  .string()
  .max(500, "Tautan media sosial terlalu panjang")
  .refine((val) => isSafeSocialLinkValue(val, { allowHandle: true }), {
    message: "Tautan atau handle media sosial tidak valid",
  });

const socialWebsiteSchema = z
  .string()
  .max(500, "URL situs web terlalu panjang")
  .refine((val) => isSafeSocialLinkValue(val, { allowBareDomain: true }), {
    message: "URL situs web tidak valid",
  });

export const socialLinksSchema = z
  .object({
    instagram: socialHandleOrUrlSchema.optional(),
    twitter: socialHandleOrUrlSchema.optional(),
    website: socialWebsiteSchema.optional(),
    goodreads: socialWebsiteSchema.optional(),
    linkedin: socialHandleOrUrlSchema.optional(),
    headerImage: z
      .string()
      .refine(
        (val) =>
          isSafeImageOrAssetUrl(val, {
            allowEmpty: true,
            allowRootRelative: true,
            allowRasterDataUri: true,
          }),
        {
          message:
            "Format gambar header harus berupa URL HTTP(S) atau gambar raster valid (maks 90 KB)",
        },
      )
      .optional(),
  })
  .strict();

export const updateProfileBioSchema = z
  .object({
    name: z
      .string()
      .min(2, "Nama minimal 2 karakter")
      .max(100, "Nama maksimal 100 karakter")
      .optional(),
    username: z
      .string()
      .min(3, "Username minimal 3 karakter")
      .max(30, "Username maksimal 30 karakter")
      .regex(
        /^[a-z0-9_]+$/,
        "Username hanya boleh berupa huruf kecil, angka, dan underscore",
      )
      .optional(),
    image: z
      .string()
      .refine(
        (val) =>
          isSafeImageOrAssetUrl(val, {
            allowEmpty: true,
            allowRootRelative: true,
            allowRasterDataUri: true,
          }),
        {
          message:
            "Format foto profil harus berupa URL HTTP(S) atau gambar raster valid (maks 90 KB)",
        },
      )
      .optional()
      .nullable(),
    headerImage: z
      .string()
      .refine(
        (val) =>
          isSafeImageOrAssetUrl(val, {
            allowEmpty: true,
            allowRootRelative: true,
            allowRasterDataUri: true,
          }),
        {
          message:
            "Format gambar header harus berupa URL HTTP(S) atau gambar raster valid (maks 90 KB)",
        },
      )
      .optional()
      .nullable(),
    bio: z.string().max(1000, "Bio maksimal 1000 karakter").optional(),
    locationCity: z
      .string()
      .max(80, "Kota maksimal 80 karakter")
      .optional()
      .nullable(),
    authorPenName: z
      .string()
      .max(160, "Nama pena maksimal 160 karakter")
      .optional()
      .nullable(),
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
      .trim()
      .refine((val) => val === "" || isSafeHttpUrl(val), {
        message: "URL portofolio harus berupa tautan HTTP(S) valid",
      })
      .optional()
      .nullable(),
    claimedBookId: z.string().uuid("ID buku tidak valid").optional().nullable(),
    verificationDocuments: safeVerificationDocumentsSchema.optional(),
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

export const quoteTemplateSchema = z.enum([
  "book_cover",
  "furrow_paper",
  "night_stabilo",
  "cover_tint",
]);

export const sessionTemplateSchema = z.enum([
  "cover_trail",
  "photo_overlay",
  "transparent_sticker",
  "literary_index",
]);

export const cardAspectSchema = z.enum(["square", "story", "4:3"]);

export const quotePostConfigSchema = z
  .object({
    template: quoteTemplateSchema,
    aspect: cardAspectSchema,
    alignment: z.enum(["left", "center"]),
    includeNote: z.boolean(),
  })
  .strict();

export const sessionPostConfigSchema = z
  .object({
    template: sessionTemplateSchema,
    aspect: cardAspectSchema,
    showWpm: z.boolean(),
    showDuration: z.boolean(),
    showPages: z.boolean(),
    stickerInk: z.enum(["light", "dark"]).optional(),
  })
  .strict();

export const publishHighlightPostSchema = z
  .object({
    isPosted: z.boolean().optional(),
    postCaption: z
      .string()
      .trim()
      .max(500, "Caption maksimal 500 karakter")
      .optional()
      .nullable(),
    postConfig: quotePostConfigSchema.optional().nullable(),
  })
  .strict();

export const publishSessionPostSchema = z
  .object({
    isPosted: z.boolean().optional(),
    title: z
      .string()
      .trim()
      .max(140, "Judul sesi maksimal 140 karakter")
      .optional()
      .nullable(),
    note: z
      .string()
      .trim()
      .max(500, "Catatan sesi maksimal 500 karakter")
      .optional()
      .nullable(),
    postConfig: sessionPostConfigSchema.optional().nullable(),
  })
  .strict();

export const publicSocialPostTypeSchema = z.enum(["quote", "session"]);

export const publicSocialPostParamsSchema = z
  .object({
    type: publicSocialPostTypeSchema,
    id: z.string().uuid("ID postingan tidak valid"),
  })
  .strict();

export const socialResourceIdParamSchema = z
  .object({
    id: z.string().uuid("ID item tidak valid"),
  })
  .strict();

export type PublicSocialPostType = z.infer<typeof publicSocialPostTypeSchema>;
export type PublishHighlightPostInput = z.infer<
  typeof publishHighlightPostSchema
>;
export type PublishSessionPostInput = z.infer<typeof publishSessionPostSchema>;
