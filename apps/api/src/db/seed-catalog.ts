import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

export async function seedCatalog(db: NodePgDatabase<typeof schema>): Promise<void> {
  const existingBooks = await db.select({ id: schema.books.id }).from(schema.books).limit(1);
  if (existingBooks.length > 0) {
    return;
  }

  console.log("Seeding AnzaBook catalog, print editions, store inventories, and chapters...");

  // 1. Create Store Branches
  const [bMatraman] = await db
    .insert(schema.storeBranches)
    .values({
      chainName: "gramedia",
      branchName: "Gramedia Matraman",
      city: "Jakarta Timur",
      address: "Jl. Matraman Raya No.46-48, Kb. Manggis, Matraman, Jakarta Timur",
      latitude: -6.2013,
      longitude: 106.8576,
      distanceKm: 3.2,
      mapUrl: "https://maps.google.com/?q=Gramedia+Matraman",
    })
    .returning();

  const [bGrandIndonesia] = await db
    .insert(schema.storeBranches)
    .values({
      chainName: "gramedia",
      branchName: "Gramedia Grand Indonesia",
      city: "Jakarta Pusat",
      address: "Grand Indonesia West Mall Lt. 3, Jl. M.H. Thamrin No.1, Jakarta Pusat",
      latitude: -6.1952,
      longitude: 106.8208,
      distanceKm: 5.8,
      mapUrl: "https://maps.google.com/?q=Gramedia+Grand+Indonesia",
    })
    .returning();

  const [bMerdekaBandung] = await db
    .insert(schema.storeBranches)
    .values({
      chainName: "gramedia",
      branchName: "Gramedia Merdeka Bandung",
      city: "Bandung",
      address: "Jl. Merdeka No.43, Babakan Ciamis, Sumur Bandung, Kota Bandung",
      latitude: -6.9122,
      longitude: 107.6105,
      distanceKm: 142.0,
      mapUrl: "https://maps.google.com/?q=Gramedia+Merdeka+Bandung",
    })
    .returning();

  const [bSudirmanJogja] = await db
    .insert(schema.storeBranches)
    .values({
      chainName: "gramedia",
      branchName: "Gramedia Sudirman Yogyakarta",
      city: "Yogyakarta",
      address: "Jl. Jend. Sudirman No.54-56, Kotabaru, Gondokusuman, Kota Yogyakarta",
      latitude: -7.7828,
      longitude: 110.3732,
      distanceKm: 520.0,
      mapUrl: "https://maps.google.com/?q=Gramedia+Sudirman+Yogyakarta",
    })
    .returning();

  const [bGudangPusat] = await db
    .insert(schema.storeBranches)
    .values({
      chainName: "komunitas",
      branchName: "Gudang Distribusi Rakyat AnzaBook",
      city: "Jakarta Selatan",
      address: "Jl. Tebet Timur Dalam VI No.12, Tebet, Jakarta Selatan",
      latitude: -6.2335,
      longitude: 106.8528,
      distanceKm: 1.1,
      mapUrl: "https://maps.google.com/?q=Tebet+Jakarta+Selatan",
    })
    .returning();

  const [bKineruku] = await db
    .insert(schema.storeBranches)
    .values({
      chainName: "komunitas",
      branchName: "Kineruku & Kolektif Buku Hegarmanah",
      city: "Bandung",
      address: "Jl. Hegarmanah No.52, Hegarmanah, Cidadap, Kota Bandung",
      latitude: -6.8775,
      longitude: 107.5991,
      distanceKm: 148.0,
      mapUrl: "https://maps.google.com/?q=Kineruku+Bandung",
    })
    .returning();

  const allBranches = [bMatraman, bGrandIndonesia, bMerdekaBandung, bSudirmanJogja, bGudangPusat, bKineruku];

  // 2. Curated Books Seed Data
  const booksData = [
    {
      slug: "revolusi-cetak-kedaulatan-membaca",
      title: "Revolusi Cetak & Kedaulatan Membaca",
      originalTitle: "The Print Revolution & Reading Sovereignty",
      author: "Sutan Sjahrir & Tim Litbang AnzaBook",
      translator: "Ahmad Sanusi",
      coverUrl: "/covers/revolusi-cetak.svg",
      coverColor: "#F06A24",
      synopsis: "Mengapa buku di Indonesia begitu mahal? Bukan karena penulis serakah, melainkan rantai distribusi oligopoli dan potongan toko fisik 45-50%. Manifesto ini membedah kalkulasi HPP cetak kertas Newsprint 48.8 gsm dan rute distribusi langsung ke tangan rakyat pembaca.",
      bulletinExcerpt: "Buku tidak boleh menjadi barang mewah kaum ningrat. Dengan memangkas perantara dan memakai kertas buram halus, kita kembalikan buku ke tangan mereka yang paling haus ilmu.",
      publishedYear: 2026,
      pageCount: 256,
      readingMinutes: 22,
      audioDurationMinutes: 45,
      digitalPolicy: "free_open",
      securityLevel: "standard_blur",
      isWeeklyBulletin: true,
      rakyatPriceIdr: 29000,
      standardPriceIdr: 69000,
      ratingAvg: 4.9,
      ratingCount: 312,
      genres: ["Ekonomi Buku", "Sejarah Literasi", "Manifesto"],
      chapters: [
        {
          chapterNumber: 1,
          isBlueprintSummary: false,
          titleId: "Bab 1: Anatomi Buku Mahal di Negeri Kepulauan",
          titleEn: "Chapter 1: Anatomy of Expensive Books in an Archipelago",
          contentId: "Buku di Indonesia selama puluhan tahun diperlakukan seperti barang mewah kosmetik. Dari selembar label harga Rp95.000 di toko buku jaringan besar, biaya kertas dan cetak sebenarnya tidak sampai Rp18.000. Kemana sisa Rp77.000 lainnya menguap?\n\nJawabannya ada pada rantai pasok warisan kolonial: konsinyasi dengan potongan 45% sampai 50% bagi pengelola toko, biaya distributor 15%, pajak ganda, dan risiko buku retur yang hangus di gudang. Sistem ini membuat penerbit harus mencetak oplah kecil dengan harga melambung tinggi agar tidak gulung tikar.\n\nEdisi Rakyat AnzaBook membalik total paradigma ini. Dengan menggunakan kertas Newsprint 48.8 gsm (kertas koran halus ramah baca) dan menjual langsung melalui hub komunitas serta sistem klaim digital, biaya produksi per eksemplar dapat ditekan hingga di bawah Rp15.000. Inilah fondasi kedaulatan membaca kita.",
          contentEn: "For decades in Indonesia, books have been treated like luxury cosmetic goods. Out of a Rp95,000 price tag in major chain bookstores, the actual paper and printing cost barely reaches Rp18,000. Where does the remaining Rp77,000 evaporate to?\n\nThe answer lies in a colonial-heritage supply chain: consignment margins of 45% to 50% for bookstore operators, 15% distributor fees, double taxation, and the risk of returned unsold books rotting in warehouses. This system forces publishers into small print runs with inflated retail prices just to survive.\n\nAnzaBook's People's Edition completely inverts this paradigm. By utilizing 48.8 gsm newsprint (smooth, eye-friendly newsprint paper) and distributing directly through community hubs and digital claim systems, production costs per copy stay below Rp15,000. This is the cornerstone of our reading sovereignty.",
          blueprintContent: "POIN UTAMA (INTISARI 20 MENIT):\n1. Struktur Harga Ritel Buku: 45-50% margin toko retail, 15% distributor, 12% royalti penulis, 8% laba penerbit, hanya 15-20% biaya fisik cetak.\n2. Inovasi Kertas Newsprint: Pemilihan gramatur 48.8 gsm memangkas berat kirim hingga 40% dan menghemat biaya kertas hingga 60% dibanding Bookpaper 72 gsm.\n3. Model Distribusi Komunitas: Penjualan langsung lewat lapak baca mandiri dan minimarket lokal meniadakan beban sewa mal toko besar.",
          audioUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
          audioDurationSec: 1320,
          paragraphs: [
            {
              index: 0,
              textId: "Buku di Indonesia selama puluhan tahun diperlakukan seperti barang mewah kosmetik. Dari selembar label harga Rp95.000 di toko buku jaringan besar, biaya kertas dan cetak sebenarnya tidak sampai Rp18.000. Kemana sisa Rp77.000 lainnya menguap?",
              textEn: "For decades in Indonesia, books have been treated like luxury cosmetic goods. Out of a Rp95,000 price tag in major chain bookstores, the actual paper and printing cost barely reaches Rp18,000. Where does the remaining Rp77,000 evaporate to?",
              audioStartSec: 0,
              audioEndSec: 18,
            },
            {
              index: 1,
              textId: "Jawabannya ada pada rantai pasok warisan kolonial: konsinyasi dengan potongan 45% sampai 50% bagi pengelola toko, biaya distributor 15%, pajak ganda, dan risiko buku retur yang hangus di gudang. Sistem ini membuat penerbit harus mencetak oplah kecil dengan harga melambung tinggi agar tidak gulung tikar.",
              textEn: "The answer lies in a colonial-heritage supply chain: consignment margins of 45% to 50% for bookstore operators, 15% distributor fees, double taxation, and the risk of returned unsold books rotting in warehouses. This system forces publishers into small print runs with inflated retail prices just to survive.",
              audioStartSec: 19,
              audioEndSec: 42,
            },
            {
              index: 2,
              textId: "Edisi Rakyat AnzaBook membalik total paradigma ini. Dengan menggunakan kertas Newsprint 48.8 gsm (kertas koran halus ramah baca) dan menjual langsung melalui hub komunitas serta sistem klaim digital, biaya produksi per eksemplar dapat ditekan hingga di bawah Rp15.000. Inilah fondasi kedaulatan membaca kita.",
              textEn: "AnzaBook's People's Edition completely inverts this paradigm. By utilizing 48.8 gsm newsprint (smooth, eye-friendly newsprint paper) and distributing directly through community hubs and digital claim systems, production costs per copy stay below Rp15,000. This is the cornerstone of our reading sovereignty.",
              audioStartSec: 43,
              audioEndSec: 72,
            },
          ],
        },
        {
          chapterNumber: 2,
          isBlueprintSummary: false,
          titleId: "Bab 2: Kertas Buram, Koran Stensil, dan Perlawanan Bahasa",
          titleEn: "Chapter 2: Newsprint, Stencils, and Linguistic Resistance",
          contentId: "Kertas buram bukanlah tanda kemiskinan karya, melainkan senjata sejarah literasi dunia. Pada era pergerakan kemerdekaan 1920-1945, pamflet politik dan terjemahan gagasan dunia dicetak di atas kertas stensil murah dan diedarkan dari tangan ke tangan pejuang di gerbong kereta api Jawa.\n\nKetika penerbit modern memaksakan standar 'buku mewah' dengan kertas tebal beraroma wangi tapi mematok harga setara upah dua hari buruh harian, yang terjadi adalah sensor ekonomi halus: ilmu pengetahuan dipagari tembok ketidakmampuan bayar.",
          contentEn: "Rough newsprint paper is not a mark of literary poverty, but a historical weapon of world literacy. During the 1920-1945 independence movement, political pamphlets and translations of world philosophy were printed on inexpensive stencil paper and passed hand-to-hand among freedom fighters on Javanese railway coaches.\n\nWhen modern publishers impose 'luxury book' standards with scented heavy paper while pricing them at two days' wages of a day laborer, the outcome is subtle economic censorship: knowledge is cordoned off behind an affordability wall.",
          blueprintContent: "POIN UTAMA (INTISARI 20 MENIT):\n1. Nilai Historis: Kertas stensil dan koran buram adalah medium kelahiran novel pergerakan dan surat kabar pribumi pertama.\n2. Sensor Ekonomi: Standar estetik penerbitan yang elitis tanpa disadari menjadi instrumen eksklusi sosial.\n3. Taktil & Daya Tahan: Newsprint modern 48.8 gsm memiliki opasitas tinggi dan kelenturan yang nyaman untuk dibaca sambil rebahan atau di perjalanan komuter.",
          audioUrl: null,
          audioDurationSec: null,
          paragraphs: [],
        },
      ],
      editions: [
        {
          tier: "rakyat_economy",
          tierName: "Edisi Rakyat (Newsprint)",
          paperType: "Newsprint Halus 48.8 gsm",
          paperGsm: 48.8,
          coverType: "Softcover Art Carton 210gsm Doff",
          bindingType: "Lem Panas Lentur",
          priceIdr: 29000,
          traditionalPriceIdr: 79000,
          savingsPercent: 63,
          weightGrams: 210,
          inStock: true,
          isbn: "978-602-0001-01-1",
        },
        {
          tier: "standard_trade",
          tierName: "Edisi Standar (Bookpaper)",
          paperType: "Bookpaper Krem 72 gsm",
          paperGsm: 72.0,
          coverType: "Softcover AC 260gsm Doff + Spot UV",
          bindingType: "Jahit Benang + Lem Panas",
          priceIdr: 69000,
          traditionalPriceIdr: 89000,
          savingsPercent: 22,
          weightGrams: 290,
          inStock: true,
          isbn: "978-602-0001-02-8",
        },
        {
          tier: "kolektor_hardcover",
          tierName: "Edisi Kolektor (Hardcover)",
          paperType: "Bookpaper Premium 80 gsm",
          paperGsm: 80.0,
          coverType: "Hardcover Board Tebal + Foil Emas + Pembatas Pita",
          bindingType: "Jahit Benang Eksklusif",
          priceIdr: 145000,
          traditionalPriceIdr: 195000,
          savingsPercent: 26,
          weightGrams: 480,
          inStock: true,
          isbn: "978-602-0001-03-5",
        },
      ],
      claimCodes: ["ANZA-RAKYAT-2026", "ANZA-MERDEKA-01"],
    },
    {
      slug: "madilog-tan-malaka",
      title: "Madilog: Materialisme, Dialektika, dan Logika",
      originalTitle: "Madilog",
      author: "Tan Malaka",
      translator: null,
      coverUrl: "/covers/madilog.svg",
      coverColor: "#8B1E1E",
      synopsis: "Karya magnum opus Tan Malaka yang ditulis di masa pelarian bawah tanah di Rawajati. Menganalisis bagaimana bangsa Indonesia harus melepaskan diri dari belenggu 'logika mistika' dan takhayul feodal menuju cara berpikir ilmiah, materialistis, dan dialektis.",
      bulletinExcerpt: null,
      publishedYear: 2026,
      pageCount: 448,
      readingMinutes: 35,
      audioDurationMinutes: 90,
      digitalPolicy: "free_open",
      securityLevel: "standard_blur",
      isWeeklyBulletin: false,
      rakyatPriceIdr: 39000,
      standardPriceIdr: 79000,
      ratingAvg: 4.8,
      ratingCount: 520,
      genres: ["Filsafat", "Sains", "Klasik Indonesia"],
      chapters: [
        {
          chapterNumber: 1,
          isBlueprintSummary: false,
          titleId: "Bab 1: Dari Logika Mistika Menuju Ilmu Bukti",
          titleEn: "Chapter 1: From Mystical Logic to Empirical Science",
          contentId: "Selama berabad-abad bangsa kita dihipnotis oleh kepercayaan bahwa nasib manusia ditentukan oleh jimat, ramalan dukun, dan kekuasaan gaib. Akibatnya, ketika penjajah datang dengan meriam dan kompas ilmiah, perlawanan kita mudah dipatahkan karena kita bertumpu pada keyakinan magis, bukan penguasaan kenyataan materiil.\n\nMadilog adalah ikhtiar merombak cara berpikir tersebut dari akarnya. Materi mendahului ide, dan kenyataan objektif harus dibuktikan melalui eksperimen serta pengamatan kritis, bukan sekadar kutipan dogma kuno.",
          contentEn: "For centuries our people have been hypnotized by the belief that human destiny is governed by talismans, shamanic prophecies, and unseen occult forces. As a consequence, when colonizers arrived with cannons and scientific compasses, our resistance was easily crushed because we relied on magical convictions rather than the mastery of material reality.\n\nMadilog is an endeavor to overturn this mindset from its very roots. Matter precedes ideas, and objective reality must be verified through experiment and critical observation, not merely through ancient dogma.",
          blueprintContent: "POIN UTAMA (INTISARI 20 MENIT):\n1. Logika Mistika vs Logika Ilmiah: Mengidentifikasi bias fatal takhayul dalam pengambilan keputusan sosial.\n2. Hukum Dialektika: Memahami bahwa segala sesuatu di alam semesta senantiasa bergerak, berubah, dan saling mempengaruhi.\n3. Kedaulatan Berpikir: Rakyat pekerja harus mampu berpikir kritis mandiri tanpa bergantung pada legitimasi mistis penguasa.",
          audioUrl: null,
          audioDurationSec: null,
          paragraphs: [
            {
              index: 0,
              textId: "Selama berabad-abad bangsa kita dihipnotis oleh kepercayaan bahwa nasib manusia ditentukan oleh jimat, ramalan dukun, dan kekuasaan gaib.",
              textEn: "For centuries our people have been hypnotized by the belief that human destiny is governed by talismans, shamanic prophecies, and unseen occult forces.",
            },
          ],
        },
      ],
      editions: [
        {
          tier: "rakyat_economy",
          tierName: "Edisi Rakyat (Newsprint)",
          paperType: "Newsprint Halus 48.8 gsm",
          paperGsm: 48.8,
          coverType: "Softcover Art Carton 210gsm Doff",
          bindingType: "Lem Panas Tebal",
          priceIdr: 39000,
          traditionalPriceIdr: 95000,
          savingsPercent: 59,
          weightGrams: 340,
          inStock: true,
          isbn: "978-602-0002-01-8",
        },
        {
          tier: "standard_trade",
          tierName: "Edisi Standar (Bookpaper)",
          paperType: "Bookpaper Krem 72 gsm",
          paperGsm: 72.0,
          coverType: "Softcover AC 260gsm Doff",
          bindingType: "Jahit Benang + Lem Panas",
          priceIdr: 79000,
          traditionalPriceIdr: 110000,
          savingsPercent: 28,
          weightGrams: 470,
          inStock: true,
          isbn: "978-602-0002-02-5",
        },
        {
          tier: "kolektor_hardcover",
          tierName: "Edisi Kolektor (Hardcover)",
          paperType: "Bookpaper Premium 80 gsm",
          paperGsm: 80.0,
          coverType: "Hardcover Board Tebal Emboss Emas",
          bindingType: "Jahit Benang Eksklusif",
          priceIdr: 169000,
          traditionalPriceIdr: 230000,
          savingsPercent: 27,
          weightGrams: 720,
          inStock: true,
          isbn: "978-602-0002-03-2",
        },
      ],
      claimCodes: ["MADILOG-RAKYAT-01"],
    },
    {
      slug: "psikologi-perhatian-halaman-panjang",
      title: "Psikologi Perhatian: Mengapa Otak Menolak Halaman Panjang",
      originalTitle: "Stolen Focus: The Anatomy of Deep Reading",
      author: "Dr. Johann Hari & Ratih Ibrahim",
      translator: "Damar Wicaksono",
      coverUrl: "/covers/psikologi-perhatian.svg",
      coverColor: "#1D3557",
      synopsis: "Eksplorasi neurobiologis bagaimana arus informasi digital dan notifikasi instan merusak kapasitas otak untuk deep reading, serta bagaimana ritual membaca buku fisik memulihkan default mode network pikiran.",
      bulletinExcerpt: null,
      publishedYear: 2026,
      pageCount: 312,
      readingMinutes: 20,
      audioDurationMinutes: 60,
      digitalPolicy: "sample_only",
      securityLevel: "strict_touch_focus",
      isWeeklyBulletin: false,
      rakyatPriceIdr: 35000,
      standardPriceIdr: 75000,
      ratingAvg: 4.7,
      ratingCount: 189,
      genres: ["Psikologi", "Fokus", "Neurosains"],
      chapters: [
        {
          chapterNumber: 1,
          isBlueprintSummary: false,
          titleId: "Bab 1: Fragmen Perhatian dan Jebakan Dopamin Ringan",
          titleEn: "Chapter 1: Attention Fragments and the Trap of Cheap Dopamine",
          contentId: "Rata-rata pengguna ponsel pintar modern menyentuh layar mereka lebih dari 2.600 kali sehari dan berpindah fokus setiap 47 detik. Ketika kita mencoba membaca teks narasi panjang di layar peramban, sirkuit saraf kita berada dalam status siaga konstan menunggu interupsi.\n\nBuku fisik, terutama yang dicetak tanpa kilau reflektif pada kertas koran yang hangat, menciptakan pelindung kognitif: tidak ada hyperlink yang memancing klik, tidak ada pop-up notifikasi yang memecah konsentrasi.",
          contentEn: "The average modern smartphone user touches their screen more than 2,600 times a day and shifts focus every 47 seconds. When we attempt to read long-form narrative text on a browser screen, our neural circuits remain on constant alert expecting interruption.\n\nA physical book, especially one printed without reflective glare on warm newsprint paper, provides a cognitive shield: no hyperlinked lures, no pop-up alerts to fracture attention.",
          blueprintContent: "POIN UTAMA (INTISARI 20 MENIT):\n1. Switch-Cost Effect: Berpindah aplikasi saat membaca mengurangi retensi memori hingga 40%.\n2. Taktilitas Kertas: Sensasi membalik halaman fisik memberikan navigasi spasial mental yang tidak dapat ditiru oleh layar vertikal.\n3. Protokol Deep Work: Menjadwalkan 30 menit membaca tanpa perangkat elektronik di pagi hari memulihkan kejernihan kognitif.",
          audioUrl: null,
          audioDurationSec: null,
          paragraphs: [],
        },
      ],
      editions: [
        {
          tier: "rakyat_economy",
          tierName: "Edisi Rakyat (Newsprint)",
          paperType: "Newsprint Halus 48.8 gsm",
          paperGsm: 48.8,
          coverType: "Softcover AC 210gsm Doff",
          bindingType: "Lem Panas",
          priceIdr: 35000,
          traditionalPriceIdr: 85000,
          savingsPercent: 59,
          weightGrams: 260,
          inStock: true,
          isbn: "978-602-0003-01-5",
        },
        {
          tier: "standard_trade",
          tierName: "Edisi Standar (Bookpaper)",
          paperType: "Bookpaper Krem 72 gsm",
          paperGsm: 72.0,
          coverType: "Softcover AC 260gsm Doff",
          bindingType: "Jahit Benang",
          priceIdr: 75000,
          traditionalPriceIdr: 98000,
          savingsPercent: 23,
          weightGrams: 360,
          inStock: true,
          isbn: "978-602-0003-02-2",
        },
      ],
      claimCodes: ["FOCUS-CLAIM-2026"],
    },
    {
      slug: "panduan-lapak-baca-gratis",
      title: "Kolektif Literasi: Panduan Lapak Baca Gratis di Ruang Publik",
      originalTitle: "Public Commons & The Free Library Movement",
      author: "Kolektif Jalanan Merdeka",
      translator: null,
      coverUrl: "/covers/panduan-lapak.svg",
      coverColor: "#2A9D8F",
      synopsis: "Buku saku praktis tentang cara mengorganisir perpustakaan jalanan mandiri di trotoar, taman kota, terminal bus, dan stasiun komuter tanpa birokrasi berbelit.",
      bulletinExcerpt: null,
      publishedYear: 2026,
      pageCount: 160,
      readingMinutes: 15,
      audioDurationMinutes: 30,
      digitalPolicy: "free_open",
      securityLevel: "standard_blur",
      isWeeklyBulletin: false,
      rakyatPriceIdr: 22000,
      standardPriceIdr: 45000,
      ratingAvg: 4.9,
      ratingCount: 145,
      genres: ["Komunitas", "Aktivisme", "Ruang Publik"],
      chapters: [
        {
          chapterNumber: 1,
          isBlueprintSummary: false,
          titleId: "Bab 1: Menghamparkan Tikar di Trotoar Kota",
          titleEn: "Chapter 1: Spreading Mats on City Sidewalks",
          contentId: "Perpustakaan bukan gedung megah berpendingin ruangan dengan kartu anggota birokratis. Cukup sehelai terpal plastik, sekotak kardus berisi 30 buku pilihan, dan segelas kopi hangat di tepi trotoar hari Minggu.\n\nDi saat ruang publik komersial menuntut uang hanya untuk sekadar duduk, lapak baca gratis menawarkan suaka: siapa saja boleh membaca tanpa ditanya KTP atau saldo dompet.",
          contentEn: "A library is not an imposing air-conditioned monument requiring bureaucratic membership cards. A single plastic tarp, a cardboard box filled with 30 curated books, and a warm cup of coffee on a Sunday sidewalk is all it takes.\n\nWhile commercialized public spaces demand payment merely to sit down, free reading mats offer sanctuary: anyone can read without showing ID or wallet balance.",
          blueprintContent: "POIN UTAMA (INTISARI 20 MENIT):\n1. Logistik Minimalis: Peralatan lapak yang muat dalam ransel motor roda dua.\n2. Hubungan dengan Warga Lokal: Menjalin komunikasi bersahabat dengan pedagang kaki lima dan petugas kebersihan.\n3. Perawatan Buku: Teknik melaminasi sampul buku tipis agar tahan hujan rintik dan debu jalanan.",
          audioUrl: null,
          audioDurationSec: null,
          paragraphs: [],
        },
      ],
      editions: [
        {
          tier: "rakyat_economy",
          tierName: "Edisi Rakyat (Newsprint)",
          paperType: "Newsprint Halus 48.8 gsm",
          paperGsm: 48.8,
          coverType: "Softcover Kraft Paper 200gsm",
          bindingType: "Steples Tengah / Saddle Stitch",
          priceIdr: 22000,
          traditionalPriceIdr: 55000,
          savingsPercent: 60,
          weightGrams: 140,
          inStock: true,
          isbn: "978-602-0004-01-2",
        },
      ],
      claimCodes: ["LAPAK-COMMONS-01"],
    },
    {
      slug: "desain-tipografi-ergonomi-baca",
      title: "Desain Tipografi & Ergonomi Baca",
      originalTitle: "Ergonomics of Reading & Type Design",
      author: "Robert Bringhurst & Dandi Darmawan",
      translator: "Dandi Darmawan",
      coverUrl: "/covers/desain-tipografi.svg",
      coverColor: "#4A4E69",
      synopsis: "Panduan visual mendalam tentang grid tipografi, leading proporsional, contrast ratio tinta di atas kertas buram, dan prinsip optik huruf font Literata untuk kenyamanan mata pembaca.",
      bulletinExcerpt: null,
      publishedYear: 2026,
      pageCount: 220,
      readingMinutes: 18,
      audioDurationMinutes: 40,
      digitalPolicy: "print_claim_only",
      securityLevel: "strict_touch_focus",
      isWeeklyBulletin: false,
      rakyatPriceIdr: 32000,
      standardPriceIdr: 68000,
      ratingAvg: 4.9,
      ratingCount: 204,
      genres: ["Tipografi", "Desain Grafis", "Ergonomi"],
      chapters: [
        {
          chapterNumber: 1,
          isBlueprintSummary: false,
          titleId: "Bab 1: Proporsi Emas Halaman dan Ukuran Huruf Ideal",
          titleEn: "Chapter 1: The Golden Page Ratio and Ideal Type Scale",
          contentId: "Mata manusia membaca bukan per kata, melainkan dalam loncatan ritmis yang disebut sakade (saccades). Panjang baris teks yang ideal berkisar antara 45 hingga 75 karakter per baris. Lebih panjang dari itu, mata akan kelelahan saat mencari awal baris berikutnya; lebih pendek dari itu, ritme sakade terpecah.\n\nDengan memilih typeface seperti Literata yang dirancang khusus untuk layar dan cetak, teks mempertahankan ketajaman bentuk bahkan pada kertas buram berserat kasar.",
          contentEn: "The human eye does not read word-by-word, but in rhythmic leaps known as saccades. The ideal measure for continuous text spans 45 to 75 characters per line. Longer than that, the eye fatigues tracking back to the next line; shorter, and the rhythmic cadence stutters.\n\nBy choosing typefaces like Literata specifically engineered for both print and screens, letterforms retain optical clarity even across rough fibrous newsprint paper.",
          blueprintContent: "POIN UTAMA (INTISARI 20 MENIT):\n1. Golden Measure: Menjaga lebar kolom baca pada 60-70 karakter per baris untuk ritme visual maksimal.\n2. Leading Relatif: Menetapkan line-height 1.6x sampai 1.75x ukuran font untuk teks berukuran 18-20px.\n3. Anti-Slop Tipografi: Menolak tombol pil seragam, spasi serampangan, dan font tanpa skala harmonis.",
          audioUrl: null,
          audioDurationSec: null,
          paragraphs: [],
        },
      ],
      editions: [
        {
          tier: "rakyat_economy",
          tierName: "Edisi Rakyat (Newsprint)",
          paperType: "Newsprint Halus 48.8 gsm",
          paperGsm: 48.8,
          coverType: "Softcover AC 210gsm",
          bindingType: "Lem Panas",
          priceIdr: 32000,
          traditionalPriceIdr: 79000,
          savingsPercent: 59,
          weightGrams: 190,
          inStock: true,
          isbn: "978-602-0005-01-9",
        },
        {
          tier: "standard_trade",
          tierName: "Edisi Standar (Bookpaper)",
          paperType: "Bookpaper Krem 72 gsm",
          paperGsm: 72.0,
          coverType: "Softcover AC 260gsm Doff",
          bindingType: "Jahit Benang",
          priceIdr: 68000,
          traditionalPriceIdr: 90000,
          savingsPercent: 24,
          weightGrams: 280,
          inStock: true,
          isbn: "978-602-0005-02-6",
        },
      ],
      claimCodes: ["ANZA-TYPO-2026", "PRINT-ONLY-CLAIM"],
    },
    {
      slug: "catatan-pinggir-masa-silam",
      title: "Catatan Pinggir dari Masa Silam: Kumpulan Esai Sosial & Politik",
      originalTitle: "Marginalia: Indonesian Social Essays",
      author: "Pramoedya Ananta Toer",
      translator: null,
      coverUrl: "/covers/catatan-pinggir.svg",
      coverColor: "#9A3412",
      synopsis: "Refleksi kritis tentang keadilan sosial, perburuhan, dan nasib manusia biasa di tengah pusaran industrialisasi dan modernitas Indonesia abad ke-20.",
      bulletinExcerpt: null,
      publishedYear: 2026,
      pageCount: 384,
      readingMinutes: 28,
      audioDurationMinutes: 75,
      digitalPolicy: "sample_only",
      securityLevel: "standard_blur",
      isWeeklyBulletin: false,
      rakyatPriceIdr: 36000,
      standardPriceIdr: 78000,
      ratingAvg: 4.8,
      ratingCount: 380,
      genres: ["Sastra", "Esai", "Sejarah Politik"],
      chapters: [
        {
          chapterNumber: 1,
          isBlueprintSummary: false,
          titleId: "Bab 1: Manusia di Bawah Roda Mesin",
          titleEn: "Chapter 1: Humans Under the Wheels of the Machine",
          contentId: "Pembangunan tanpa keadilan watak adalah pabrik yang mencetak angka-angka statistik tanpa jiwa. Kita melihat jembatan dan gedung-gedung pencakar langit menjulang, namun di bawah bayang-bayangnya, anak-anak penjaja koran masih bermimpi tentang secuil buku cerita yang bisa mereka miliki sendiri.",
          contentEn: "Development devoid of moral justice is merely a factory stamping soulless statistical digits. We marvel at towering bridges and soaring skyscrapers, yet in their casting shadows, newsboys still dream of owning a simple storybook of their own.",
          blueprintContent: "POIN UTAMA (INTISARI 20 MENIT):\n1. Kritik Humanisme: Menguji kemajuan ekonomi berdasarkan kesejahteraan manusia paling rentan.\n2. Kuasa Tulisan: Dokumentasi tertulis sebagai saksi sejarah yang tidak dapat dipadamkan kekuasaan.\n3. Etika Kerja Kultural: Seniman dan intelektual wajib berpihak pada martabat kemanusiaan.",
          audioUrl: null,
          audioDurationSec: null,
          paragraphs: [],
        },
      ],
      editions: [
        {
          tier: "rakyat_economy",
          tierName: "Edisi Rakyat (Newsprint)",
          paperType: "Newsprint Halus 48.8 gsm",
          paperGsm: 48.8,
          coverType: "Softcover AC 210gsm",
          bindingType: "Lem Panas",
          priceIdr: 36000,
          traditionalPriceIdr: 88000,
          savingsPercent: 59,
          weightGrams: 310,
          inStock: true,
          isbn: "978-602-0006-01-6",
        },
        {
          tier: "standard_trade",
          tierName: "Edisi Standar (Bookpaper)",
          paperType: "Bookpaper Krem 72 gsm",
          paperGsm: 72.0,
          coverType: "Softcover AC 260gsm Doff",
          bindingType: "Jahit Benang",
          priceIdr: 78000,
          traditionalPriceIdr: 105000,
          savingsPercent: 26,
          weightGrams: 420,
          inStock: true,
          isbn: "978-602-0006-02-3",
        },
      ],
      claimCodes: ["PRAM-CLAIM-01"],
    },
  ];

  for (const bookItem of booksData) {
    const { chapters, editions, claimCodes, ...bookRow } = bookItem;
    const [insertedBook] = await db
      .insert(schema.books)
      .values(bookRow)
      .returning();

    // Insert Chapters
    for (const chap of chapters) {
      await db.insert(schema.bookChapters).values({
        bookId: insertedBook.id,
        chapterNumber: chap.chapterNumber,
        isBlueprintSummary: chap.isBlueprintSummary,
        titleId: chap.titleId,
        titleEn: chap.titleEn,
        contentId: chap.contentId,
        contentEn: chap.contentEn,
        blueprintContent: chap.blueprintContent,
        paragraphsJson: chap.paragraphs,
        audioUrl: chap.audioUrl,
        audioDurationSec: chap.audioDurationSec,
      });
    }

    // Insert Print Editions
    for (const ed of editions) {
      await db.insert(schema.bookPrintEditions).values({
        bookId: insertedBook.id,
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

    // Insert Claim Codes
    for (const code of claimCodes) {
      await db.insert(schema.bookClaimCodes).values({
        bookId: insertedBook.id,
        code,
      });
    }

    // Insert Store Inventories for each branch
    for (let i = 0; i < allBranches.length; i++) {
      const branch = allBranches[i];
      const isWarehouse = branch.chainName === "komunitas";
      await db.insert(schema.storeInventories).values({
        branchId: branch.id,
        bookId: insertedBook.id,
        rakyatStock: isWarehouse ? 450 : Math.floor(Math.random() * 25) + 8,
        standardStock: isWarehouse ? 200 : Math.floor(Math.random() * 15) + 3,
        stockStatus: "available",
      });
    }
  }

  console.log("Seeding complete: 6 books, 6 branches, print editions, and inventories populated.");
}
