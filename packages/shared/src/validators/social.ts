import { z } from "zod";

export const socialLinksSchema = z
  .object({
    instagram: z.string().optional(),
    twitter: z.string().optional(),
    website: z.string().optional(),
    goodreads: z.string().optional(),
    linkedin: z.string().optional(),
    headerImage: z.string().optional(),
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
          val === "" ||
          val.startsWith("http://") ||
          val.startsWith("https://") ||
          val.startsWith("data:image/"),
        { message: "Format foto profil harus berupa URL atau Data Image yang valid" },
      )
      .optional()
      .nullable(),
    headerImage: z
      .string()
      .refine(
        (val) =>
          val === "" ||
          val.startsWith("http://") ||
          val.startsWith("https://") ||
          val.startsWith("data:image/"),
        { message: "Format gambar header harus berupa URL atau Data Image yang valid" },
      )
      .optional()
      .nullable(),
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
    verificationDocuments: z
      .array(
        z.object({
          title: z.string().min(1, "Judul berkas wajib diisi"),
          url: z.string().min(1, "URL berkas wajib diisi"),
          fileType: z.string().optional(),
        }),
      )
      .optional(),
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
