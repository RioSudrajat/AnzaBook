import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { allBooksData } from "./seeds/books-data";

export async function seedCatalog(
  db: NodePgDatabase<typeof schema>,
): Promise<void> {
  console.log(
    "Menyelaraskan data katalog AnzaBook, toko rekanan, dan bab buku...",
  );

  // 1. Cabang Toko Mitra & Titik GPS Peta
  const branchSeeds = [
    {
      chainName: "gramedia",
      branchName: "Gramedia Matraman",
      city: "Jakarta Timur",
      address:
        "Jl. Matraman Raya No.46-48, Kb. Manggis, Matraman, Jakarta Timur",
      latitude: -6.2013,
      longitude: 106.8576,
      distanceKm: 3.2,
      phone: "(021) 8581763",
      mapUrl: "https://maps.google.com/?q=Gramedia+Matraman",
    },
    {
      chainName: "gramedia",
      branchName: "Gramedia Grand Indonesia",
      city: "Jakarta Pusat",
      address:
        "Grand Indonesia West Mall Lt. 3, Jl. M.H. Thamrin No.1, Jakarta Pusat",
      latitude: -6.1952,
      longitude: 106.8208,
      distanceKm: 5.8,
      phone: "(021) 23580512",
      mapUrl: "https://maps.google.com/?q=Gramedia+Grand+Indonesia",
    },
    {
      chainName: "komunitas",
      branchName: "Post Santa & Kolektif Buku Pasar",
      city: "Jakarta Selatan",
      address:
        "Pasar Santa Lt. 1 Blok B, Jl. Cipaku I No.1, Petogogan, Kebayoran Baru",
      latitude: -6.2395,
      longitude: 106.816,
      distanceKm: 7.1,
      phone: "0812-8899-7711",
      mapUrl: "https://maps.google.com/?q=Post+Santa+Jakarta",
    },
    {
      chainName: "gramedia",
      branchName: "Gramedia Merdeka Bandung",
      city: "Bandung",
      address: "Jl. Merdeka No.43, Babakan Ciamis, Sumur Bandung, Kota Bandung",
      latitude: -6.9122,
      longitude: 107.6105,
      distanceKm: 142.0,
      phone: "(022) 4235878",
      mapUrl: "https://maps.google.com/?q=Gramedia+Merdeka+Bandung",
    },
    {
      chainName: "gramedia",
      branchName: "Gramedia Sudirman Yogyakarta",
      city: "Yogyakarta",
      address:
        "Jl. Jend. Sudirman No.54-56, Kotabaru, Gondokusuman, Kota Yogyakarta",
      latitude: -7.7828,
      longitude: 110.3732,
      distanceKm: 520.0,
      phone: "(0274) 512621",
      mapUrl: "https://maps.google.com/?q=Gramedia+Sudirman+Yogyakarta",
    },
    {
      chainName: "komunitas",
      branchName: "Kineruku & Kolektif Buku Hegarmanah",
      city: "Bandung",
      address: "Jl. Hegarmanah No.52, Hegarmanah, Cidadap, Kota Bandung",
      latitude: -6.8775,
      longitude: 107.5991,
      distanceKm: 148.0,
      phone: "(022) 2039601",
      mapUrl: "https://maps.google.com/?q=Kineruku+Bandung",
    },
  ];

  const allBranches: (typeof schema.storeBranches.$inferSelect)[] = [];
  for (const b of branchSeeds) {
    const [existing] = await db
      .select()
      .from(schema.storeBranches)
      .where(eq(schema.storeBranches.branchName, b.branchName))
      .limit(1);

    if (existing) {
      await db
        .update(schema.storeBranches)
        .set({
          address: b.address,
          latitude: b.latitude,
          longitude: b.longitude,
          phone: b.phone,
          distanceKm: b.distanceKm,
        })
        .where(eq(schema.storeBranches.id, existing.id));
      allBranches.push(existing);
    } else {
      const [inserted] = await db
        .insert(schema.storeBranches)
        .values(b)
        .returning();
      allBranches.push(inserted);
    }
  }

  // 2. Masukkan atau Perbarui 13 Buku ke Database
  for (const bookItem of allBooksData) {
    const { chapters, editions, claimCodes, ...bookRow } = bookItem;

    const [existingBook] = await db
      .select({ id: schema.books.id })
      .from(schema.books)
      .where(eq(schema.books.slug, bookRow.slug))
      .limit(1);

    let bookId: string;

    if (existingBook) {
      bookId = existingBook.id;
      await db
        .update(schema.books)
        .set({
          title: bookRow.title,
          originalTitle: bookRow.originalTitle,
          author: bookRow.author,
          authorAvatar: bookRow.authorAvatar,
          editor: bookRow.editor,
          editorAvatar: bookRow.editorAvatar,
          translator: bookRow.translator,
          coverUrl: bookRow.coverUrl,
          coverColor: bookRow.coverColor,
          synopsis: bookRow.synopsis,
          bulletinExcerpt: bookRow.bulletinExcerpt,
          publishedYear: bookRow.publishedYear,
          pageCount: bookRow.pageCount,
          totalChapters: bookRow.totalChapters,
          readingMinutes: bookRow.readingMinutes,
          audioDurationMinutes: bookRow.audioDurationMinutes,
          digitalPolicy: bookRow.digitalPolicy,
          accessTier: bookRow.accessTier,
          hasPhysical: bookRow.hasPhysical,
          securityLevel: bookRow.securityLevel,
          isWeeklyBulletin: bookRow.isWeeklyBulletin,
          rakyatPriceIdr: bookRow.rakyatPriceIdr,
          standardPriceIdr: bookRow.standardPriceIdr,
          ratingAvg: bookRow.ratingAvg,
          ratingCount: bookRow.ratingCount,
          availableLanguages: bookRow.availableLanguages,
          categories: bookRow.categories,
          collectionName: bookRow.collectionName,
          genres: bookRow.genres,
        })
        .where(eq(schema.books.id, bookId));
    } else {
      const [insertedBook] = await db
        .insert(schema.books)
        .values(bookRow)
        .returning();
      bookId = insertedBook.id;
    }

    // Masukkan atau perbarui bab-bab buku
    for (const chap of chapters) {
      const [existingChapter] = await db
        .select({ id: schema.bookChapters.id })
        .from(schema.bookChapters)
        .where(
          and(
            eq(schema.bookChapters.bookId, bookId),
            eq(schema.bookChapters.chapterNumber, chap.chapterNumber),
          ),
        )
        .limit(1);

      if (existingChapter) {
        await db
          .update(schema.bookChapters)
          .set({
            titleId: chap.titleId,
            titleEn: chap.titleEn,
            contentId: chap.contentId,
            contentEn: chap.contentEn,
            audioUrl: chap.audioUrl,
            audioDurationSec: chap.audioDurationSec,
          })
          .where(eq(schema.bookChapters.id, existingChapter.id));
      } else {
        await db.insert(schema.bookChapters).values({
          bookId,
          chapterNumber: chap.chapterNumber,
          isBlueprintSummary: false,
          titleId: chap.titleId,
          titleEn: chap.titleEn,
          contentId: chap.contentId,
          contentEn: chap.contentEn,
          blueprintContent: "",
          paragraphsJson: [],
          audioUrl: chap.audioUrl,
          audioDurationSec: chap.audioDurationSec,
        });
      }
    }

    // Masukkan atau perbarui edisi cetak
    for (const ed of editions) {
      const [existingEd] = await db
        .select({ id: schema.bookPrintEditions.id })
        .from(schema.bookPrintEditions)
        .where(
          and(
            eq(schema.bookPrintEditions.bookId, bookId),
            eq(schema.bookPrintEditions.tier, ed.tier),
          ),
        )
        .limit(1);

      if (existingEd) {
        await db
          .update(schema.bookPrintEditions)
          .set({
            tierName: ed.tierName,
            paperType: ed.paperType,
            paperGsm: ed.paperGsm,
            coverType: ed.coverType,
            bindingType: ed.bindingType,
            priceIdr: ed.priceIdr,
            traditionalPriceIdr: ed.traditionalPriceIdr,
            savingsPercent: ed.savingsPercent,
            weightGrams: ed.weightGrams,
            inStock: ed.inStock,
            isbn: ed.isbn,
          })
          .where(eq(schema.bookPrintEditions.id, existingEd.id));
      } else {
        await db.insert(schema.bookPrintEditions).values({
          bookId,
          tier: ed.tier,
          tierName: ed.tierName,
          paperType: ed.paperType,
          paperGsm: ed.paperGsm,
          coverType: ed.coverType,
          bindingType: ed.bindingType,
          priceIdr: ed.priceIdr,
          traditionalPriceIdr: ed.traditionalPriceIdr,
          savingsPercent: ed.savingsPercent,
          weightGrams: ed.weightGrams,
          inStock: ed.inStock,
          isbn: ed.isbn,
        });
      }
    }

    // Masukkan kode klaim buku demo
    if (
      process.env.NODE_ENV !== "production" &&
      claimCodes &&
      claimCodes.length > 0
    ) {
      for (const code of claimCodes) {
        const [existingCode] = await db
          .select({ id: schema.bookClaimCodes.id })
          .from(schema.bookClaimCodes)
          .where(
            and(
              eq(schema.bookClaimCodes.bookId, bookId),
              eq(schema.bookClaimCodes.code, code),
            ),
          )
          .limit(1);

        if (!existingCode) {
          await db.insert(schema.bookClaimCodes).values({
            bookId,
            code,
            isDemo: true,
          });
        }
      }
    }

    // Masukkan stok toko fisik
    for (const branch of allBranches) {
      const isWarehouse = branch.chainName === "komunitas";
      const [existingInv] = await db
        .select({ id: schema.storeInventories.id })
        .from(schema.storeInventories)
        .where(
          and(
            eq(schema.storeInventories.branchId, branch.id),
            eq(schema.storeInventories.bookId, bookId),
          ),
        )
        .limit(1);

      if (!existingInv) {
        await db.insert(schema.storeInventories).values({
          branchId: branch.id,
          bookId,
          rakyatStock: isWarehouse ? 450 : Math.floor(Math.random() * 25) + 8,
          standardStock: isWarehouse ? 200 : Math.floor(Math.random() * 15) + 3,
          stockStatus: "available",
        });
      }
    }
  }

  // 4. Pastikan akun Admin default tersedia
  const defaultAdminEmail = "admin@anzabook.id";
  const [existingAdmin] = await db
    .select()
    .from(schema.user)
    .where(eq(schema.user.email, defaultAdminEmail))
    .limit(1);

  if (!existingAdmin) {
    const adminId = randomUUID();
    const passwordHash = await hashPassword("AdminAnza123!");
    await db.insert(schema.user).values({
      id: adminId,
      name: "Admin AnzaBook",
      email: defaultAdminEmail,
      emailVerified: true,
      role: "admin",
    });
    await db.insert(schema.account).values({
      id: randomUUID(),
      accountId: adminId,
      providerId: "credential",
      userId: adminId,
      password: passwordHash,
    });
  } else if (existingAdmin.role !== "admin") {
    await db
      .update(schema.user)
      .set({ role: "admin" })
      .where(eq(schema.user.id, existingAdmin.id));
  }

  console.log("Penyelarasan katalog AnzaBook selesai.");
}
