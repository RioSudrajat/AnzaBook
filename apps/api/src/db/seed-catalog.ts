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

  // 4. Seeding Komunitas, Kalender Host, dan Agenda Acara
  let [systemHost] = await db
    .select()
    .from(schema.user)
    .where(eq(schema.user.email, "host@anzabook.id"))
    .limit(1);

  if (!systemHost) {
    const [created] = await db
      .insert(schema.user)
      .values({
        id: "anzabook-system-host",
        name: "Penggerak Literasi",
        email: "host@anzabook.id",
        emailVerified: true,
        image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80",
      })
      .onConflictDoNothing()
      .returning();
    systemHost = created;
  }

  if (systemHost) {
    const calendarSeeds = [
      {
        slug: "kolektif-layar-aksara",
        name: "Kolektif Layar & Aksara",
        type: "community" as const,
        description: "Ruang temu pegiat literasi, sinema alternatif, dan diskusi naskah independen.",
        city: "Jakarta Selatan",
        contactEmail: "layar.aksara@anzabook.id",
        avatarUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=256&q=80",
        coverUrl: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1200&q=80",
        verificationStatus: "verified" as const,
      },
      {
        slug: "klub-buku-taman-suropati",
        name: "Klub Buku Taman Suropati",
        type: "community" as const,
        description: "Komunitas membaca hening (silent reading) dan bedah buku setiap pekan di ruang terbuka.",
        city: "Jakarta Pusat",
        contactEmail: "tamansuropati@anzabook.id",
        avatarUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=256&q=80",
        coverUrl: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=1200&q=80",
        verificationStatus: "verified" as const,
      },
      {
        slug: "pramoedya-institute",
        name: "Pramoedya Institute",
        type: "author" as const,
        description: "Kanal resmi arsip pemikiran, peluncuran karya digital, dan diskusi kebangsaan.",
        city: "Jakarta",
        contactEmail: "pram@anzabook.id",
        avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80",
        coverUrl: "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=1200&q=80",
        verificationStatus: "trusted" as const,
      },
    ];

    const calendarMap = new Map<string, string>();
    for (const c of calendarSeeds) {
      const [existingCal] = await db
        .select()
        .from(schema.communityCalendars)
        .where(eq(schema.communityCalendars.slug, c.slug))
        .limit(1);

      if (existingCal) {
        calendarMap.set(c.slug, existingCal.id);
      } else {
        const [inserted] = await db
          .insert(schema.communityCalendars)
          .values({
            ...c,
            createdByUserId: systemHost.id,
          })
          .returning();
        if (inserted) {
          calendarMap.set(c.slug, inserted.id);
          await db
            .insert(schema.communityCalendarMembers)
            .values({
              calendarId: inserted.id,
              userId: systemHost.id,
              role: "owner",
            })
            .onConflictDoNothing();
        }
      }
    }

    // Ambil buku Revolusi Cetak untuk dikaitkan
    const [revolusiBook] = await db
      .select({ id: schema.books.id })
      .from(schema.books)
      .where(eq(schema.books.slug, "revolusi-cetak-kedaulatan-membaca"))
      .limit(1);

    const now = new Date();
    const addDays = (d: number, hour = 14, min = 0) => {
      const res = new Date(now.getTime() + d * 86400000);
      res.setHours(hour, min, 0, 0);
      return res;
    };

    const kolektifCalId = calendarMap.get("kolektif-layar-aksara");
    const suropatiCalId = calendarMap.get("klub-buku-taman-suropati");
    const pramCalId = calendarMap.get("pramoedya-institute");

    if (kolektifCalId && suropatiCalId && pramCalId) {
      const eventSeeds = [
        {
          slug: "kopichat-x-prodia-scaling-up-without-burning-out",
          calendarId: kolektifCalId,
          bookId: null,
          featuredWork: {
            mediaType: "film" as const,
            title: "Scaling Up: Dokumenter Ruang Kreatif",
            creator: "Kolektif Sinema",
          },
          title: "KopiChat x Prodia: Scaling Up Without Burning Out",
          description:
            "Diskusi intim mengenai kesehatan mental, produktivitas berkarya tanpa burnout, dan manajemen energi dalam komunitas kreatif.\n\nTopik Utama:\n- Mengelola ekspektasi dan target karya\n- Tanda awal kelelahan mental (burnout)\n- Sesi tanya jawab dan temu jejaring",
          logisticsNotes: "Lokasi: Ground Floor Menara Rajawali. Parkir tersedia di basement. Harap datang 15 menit sebelum acara.",
          coverUrl: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=800&q=80",
          themePreset: "minimal" as const,
          visibility: "public" as const,
          eventType: "community_meetup" as const,
          categoryTag: "Pengembangan Diri",
          coHosts: [{ name: "Naura Humairaa", roleLabel: "Moderator & Penyelenggara" }],
          format: "offline" as const,
          district: "Kecamatan Setiabudi",
          city: "Daerah Khusus Ibukota Jakarta",
          venueName: "GoWork Menara Rajawali - Coworking and Office Space",
          venueAddress: "Ground Floor, Menara Rajawali, Jl. DR. Ide Anak Agung Gde Agung, Kuningan Timur",
          hideAddressUntilApproved: true,
          latitude: -6.22838,
          longitude: 106.83532,
          placeSourceLat: -6.22838,
          placeSourceLng: 106.83532,
          startsAt: addDays(3, 13, 0),
          endsAt: addDays(3, 15, 30),
          timezone: "Asia/Jakarta",
          capacity: 45,
          requiresApproval: true,
          allowWaitlist: true,
          status: "published" as const,
        },
        {
          slug: "indonesia-temporal-user-group",
          calendarId: kolektifCalId,
          bookId: null,
          featuredWork: null,
          title: "Indonesia Temporal User Group",
          description:
            "Temu komunitas kedua di Jakarta! Kesempatan bagus untuk bertemu dengan sesama engineer dan pegiat open-source.\n\nTopik:\n- Durable Execution in Action\n- Workflow Architecture\n- Tanya jawab santai ditemani kopi dan kudapan.",
          logisticsNotes: "GoWork Menara Rajawali. Bawa laptop bila ingin mencoba hands-on.",
          coverUrl: "https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=800&q=80",
          themePreset: "midnight_ink" as const,
          visibility: "public" as const,
          eventType: "community_meetup" as const,
          categoryTag: "Teknologi",
          coHosts: [
            { name: "Michael Mah", roleLabel: "Host" },
            { name: "Shaik Jifridin", roleLabel: "Speaker" },
          ],
          format: "offline" as const,
          district: "Kecamatan Setiabudi",
          city: "Daerah Khusus Ibukota Jakarta",
          venueName: "GoWork Menara Rajawali - Coworking and Office Space",
          venueAddress: "Ground Floor, Menara Rajawali, Kuningan Timur",
          hideAddressUntilApproved: false,
          latitude: -6.22838,
          longitude: 106.83532,
          placeSourceLat: -6.22838,
          placeSourceLng: 106.83532,
          startsAt: addDays(1, 18, 0),
          endsAt: addDays(1, 21, 0),
          timezone: "Asia/Jakarta",
          capacity: 1, // Kapasitas 1 agar memicu tampilan Acara Penuh / Daftar Tunggu
          requiresApproval: false,
          allowWaitlist: true,
          status: "published" as const,
        },
        {
          slug: "baca-bareng-akhir-pekan-revolusi-cetak",
          calendarId: suropatiCalId,
          bookId: revolusiBook?.id || null,
          featuredWork: null,
          title: "Baca Bareng Akhir Pekan: Revolusi Cetak & Kedaulatan Membaca",
          description:
            "Sesi membaca hening (silent reading) selama 45 menit, dilanjutkan dengan diskusi santai mengenai kedaulatan buku cetak dan digital di era modern.\n\nBuku Bahasan:\nRevolusi Cetak: Kedaulatan Membaca Rakyat.",
          logisticsNotes: "Taman Suropati dekat air mancur tengah. Harap membawa alas duduk sendiri.",
          coverUrl: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=800&q=80",
          themePreset: "classic_paper" as const,
          visibility: "public" as const,
          eventType: "book_club" as const,
          categoryTag: "Literasi",
          coHosts: [{ name: "Klub Buku Suropati", roleLabel: "Penyelenggara" }],
          format: "offline" as const,
          district: "Menteng",
          city: "Jakarta Pusat",
          venueName: "Taman Suropati",
          venueAddress: "Jl. Taman Suropati No.5, RT.5/RW.5, Menteng, Jakarta Pusat",
          hideAddressUntilApproved: false,
          latitude: -6.1990,
          longitude: 106.8320,
          placeSourceLat: -6.1990,
          placeSourceLng: 106.8320,
          startsAt: addDays(5, 16, 0),
          endsAt: addDays(5, 18, 0),
          timezone: "Asia/Jakarta",
          capacity: 50,
          requiresApproval: false,
          allowWaitlist: true,
          status: "published" as const,
        },
        {
          slug: "grand-launching-edisi-digital-rakyat",
          calendarId: pramCalId,
          bookId: revolusiBook?.id || null,
          featuredWork: null,
          title: "Grand Launching & Q&A: Edisi Digital Kerakyatan",
          description:
            "Peluncuran resmi buku digital kerakyatan dan perkenalan model akses terbuka AnzaBook bagi seluruh pembaca di pelosok Nusantara.",
          logisticsNotes: "Tautan ruang Google Meet akan otomatis tersedia untuk peserta yang telah mendaftar.",
          coverUrl: "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=800&q=80",
          themePreset: "terracotta" as const,
          visibility: "public" as const,
          eventType: "book_launch" as const,
          categoryTag: "Peluncuran Buku",
          coHosts: [{ name: "Pramoedya Institute", roleLabel: "Host Resmi" }],
          format: "online" as const,
          district: null,
          city: null,
          venueName: null,
          venueAddress: null,
          hideAddressUntilApproved: false,
          latitude: null,
          longitude: null,
          placeSourceLat: null,
          placeSourceLng: null,
          onlineMeetingUrl: "https://meet.google.com/anz-book-launch",
          startsAt: addDays(7, 19, 0),
          endsAt: addDays(7, 21, 0),
          timezone: "Asia/Jakarta",
          capacity: 200,
          requiresApproval: false,
          allowWaitlist: true,
          status: "published" as const,
        },
      ];

      for (const ev of eventSeeds) {
        const [existingEv] = await db
          .select()
          .from(schema.communityEvents)
          .where(eq(schema.communityEvents.slug, ev.slug))
          .limit(1);

        if (!existingEv) {
          const [createdEv] = await db.insert(schema.communityEvents).values(ev).returning();

          // Untuk event yang sengaja dibuat penuh, buat 1 RSVP going
          if (createdEv && ev.capacity === 1) {
            await db
              .insert(schema.eventRsvps)
              .values({
                eventId: createdEv.id,
                userId: systemHost.id,
                status: "going",
                checkinCode: "CHK-TEST-01",
              })
              .onConflictDoNothing();
          }
        }
      }
    }
  }

  console.log("Penyelarasan katalog AnzaBook selesai.");
}
