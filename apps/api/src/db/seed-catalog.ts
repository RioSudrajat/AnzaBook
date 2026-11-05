import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

export async function seedCatalog(db: NodePgDatabase<typeof schema>): Promise<void> {
  console.log("Menyelaraskan data katalog AnzaBook, toko rekanan, dan bab buku...");

  // 1. Cabang Toko Mitra & Titik GPS Peta
  const branchSeeds = [
    {
      chainName: "gramedia",
      branchName: "Gramedia Matraman",
      city: "Jakarta Timur",
      address: "Jl. Matraman Raya No.46-48, Kb. Manggis, Matraman, Jakarta Timur",
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
      address: "Grand Indonesia West Mall Lt. 3, Jl. M.H. Thamrin No.1, Jakarta Pusat",
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
      address: "Pasar Santa Lt. 1 Blok B, Jl. Cipaku I No.1, Petogogan, Kebayoran Baru",
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
      address: "Jl. Jend. Sudirman No.54-56, Kotabaru, Gondokusuman, Kota Yogyakarta",
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

  // 2. Data Katalog Buku Kurasi Sastra & Sains
  const booksData = [
    {
      slug: "sains-logika-seni-hidup-bermutu",
      title: "Sains, Logika, dan Seni untuk Hidup Bermutu",
      originalTitle: "Science, Logic, and the Art of High Quality Living",
      author: "Zenius",
      authorAvatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80",
      editor: "Anza Book",
      editorAvatar: "/logo-mark.svg",
      translator: null,
      coverUrl: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80",
      coverColor: "#1E3A8A",
      synopsis: "Pernah merasa hidupmu seperti berputar di labirin tanpa peta? Info datang bertubi-tubi, keputusan harus diambil cepat, dan kamu cuma bisa bilang 'yaudah sih ikut arus aja'. Tenang, kamu tidak sendirian. Kabar baiknya, ada cara agar hidup tidak lagi se-random itu. Sains bisa jadi jalan ninjamu.",
      bulletinExcerpt: "Sains bukan sekadar rumus di papan tulis, melainkan lensa paling jujur untuk membedah prasangka dan mengambil keputusan hidup yang bermutu.",
      publishedYear: 2026,
      pageCount: 288,
      totalChapters: 8,
      readingMinutes: 24,
      audioDurationMinutes: 65,
      digitalPolicy: "sample_only",
      accessTier: "premium" as const,
      hasPhysical: true,
      securityLevel: "standard_blur",
      isWeeklyBulletin: false,
      rakyatPriceIdr: 36000,
      standardPriceIdr: 78000,
      ratingAvg: 4.8,
      ratingCount: 28,
      availableLanguages: ["id", "en"],
      categories: ["Sains", "Berpikir Kritis", "Pengembangan Diri"],
      collectionName: "The Thinking Blueprint",
      genres: ["Sains Populer", "Logika", "Pengembangan Diri"],
      chapters: [
        {
          chapterNumber: 1,
          titleId: "Sains Sebagai Kunci Smart Living",
          titleEn: "Science as the Key to Smart Living",
          contentId: "Bayangkan kamu terbangun di pagi hari dengan ribuan informasi yang membanjiri layar ponselmu. Berita bohong, tawaran investasi kilat, klaim kesehatan ajaib, hingga saran karier dari algoritma media sosial. Tanpa metode berpikir yang teruji, otak kita rentan terjebak dalam ilusi kepastian semu.\n\nSains mengajarkan kita satu prinsip utama: keraguan yang sehat dan pencarian bukti empiris. Ini bukan soal menghafal tabel periodik atau teori relativitas umum, melainkan kebiasaan menguji hipotesis sebelum mempercayai suatu klaim sebagai kebenaran mutlak.",
          contentEn: "Imagine waking up in the morning with thousands of data points flooding your phone screen. Fake news, instant investment schemes, miracle health claims, and social media algorithmic career advice. Without a proven method of inquiry, our brains easily fall prey to illusions of false certainty.\n\nScience teaches us one foundational principle: healthy skepticism coupled with empirical verification.",
          audioUrl: null,
          audioDurationSec: null,
        },
        {
          chapterNumber: 2,
          titleId: "Cara Berpikir Ilmiah untuk Hidup Simpel",
          titleEn: "Scientific Thinking for a Simpler Life",
          contentId: "Banyak orang mengira berpikir ilmiah membuat hidup jadi rumit dan penuh beban. Sebaliknya, metode ilmiah justru merupakan alat pemangkas keruwetan paling efektif di dunia. Prinsip Pisau Bedah Occam (Occam's Razor) mengingatkan kita bahwa penjelasan paling sederhana yang memadai hampir selalu lebih dekat dengan kenyataan daripada konspirasi berbelit-belit.",
          contentEn: "Many assume scientific thinking complicates existence. In reality, the scientific method is the world's most potent clutter-cutter.",
          audioUrl: null,
          audioDurationSec: null,
        },
        {
          chapterNumber: 3,
          titleId: "Sains itu Proses, Bukan Cuma Fakta",
          titleEn: "Science as a Process, Not Merely Facts",
          contentId: "Kekeliruan terbesar dalam sistem pendidikan konvensional adalah memperlakukan sains sebagai tumpukan kesimpulan mati yang harus dihafal. Padahal, keindahan terbesar sains terletak pada kesediaannya merevisi diri sendiri saat bukti baru yang lebih kuat ditemukan.",
          contentEn: "The grandest flaw of conventional education is treating science as a static catalog of dead conclusions to memorize.",
          audioUrl: null,
          audioDurationSec: null,
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
          priceIdr: 36000,
          traditionalPriceIdr: 88000,
          savingsPercent: 59,
          weightGrams: 230,
          inStock: true,
          isbn: "978-602-0010-01-4",
        },
        {
          tier: "standard_trade",
          tierName: "Edisi Standar (Bookpaper)",
          paperType: "Bookpaper Krem 72 gsm",
          paperGsm: 72.0,
          coverType: "Softcover AC 260gsm Doff + Spot UV",
          bindingType: "Jahit Benang + Lem Panas",
          priceIdr: 78000,
          traditionalPriceIdr: 105000,
          savingsPercent: 25,
          weightGrams: 310,
          inStock: true,
          isbn: "978-602-0010-02-1",
        },
        {
          tier: "kolektor_hardcover",
          tierName: "Edisi Kolektor (Hardcover)",
          paperType: "Bookpaper Premium 80 gsm",
          paperGsm: 80.0,
          coverType: "Hardcover Board Tebal + Pita Pembatas",
          bindingType: "Jahit Benang Eksklusif",
          priceIdr: 155000,
          traditionalPriceIdr: 215000,
          savingsPercent: 28,
          weightGrams: 520,
          inStock: true,
          isbn: "978-602-0010-03-8",
        },
      ],
      claimCodes: ["SAINS-MALAKA-01", "ZENIUS-SMART-26"],
    },
    {
      slug: "kecerdasan-sosial-homo-sapiens",
      title: "Kecerdasan Sosial: Senjata Utama Homo Sapiens",
      originalTitle: "Social Intelligence: The Prime Weapon of Homo Sapiens",
      author: "Zenius",
      authorAvatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80",
      editor: "Anza Book",
      editorAvatar: "/logo-mark.svg",
      translator: null,
      coverUrl: "https://images.unsplash.com/photo-1532012164546-f432f2e3777f?w=600&auto=format&fit=crop&q=80",
      coverColor: "#EA580C",
      synopsis: "Mengapa Homo sapiens berhasil bertahan dan menguasai bumi sementara spesies manusia purba lainnya punah? Bukan karena otot yang lebih kuat atau cakar yang lebih tajam, melainkan kapasitas unik untuk bekerja sama dalam kelompok besar melalui bahasa, empati, dan kecerdasan sosial.",
      bulletinExcerpt: "Kemampuan sosial sering jadi tameng pertama di dunia yang serbacepat. Kecakapan teknis memang penting, tapi tanpa kemampuan bikin orang percaya, keahlianmu cuma bertahan di layar laptop.",
      publishedYear: 2026,
      pageCount: 304,
      totalChapters: 8,
      readingMinutes: 26,
      audioDurationMinutes: 70,
      digitalPolicy: "free_open",
      accessTier: "free" as const,
      hasPhysical: true,
      securityLevel: "standard_blur",
      isWeeklyBulletin: false,
      rakyatPriceIdr: 32000,
      standardPriceIdr: 72000,
      ratingAvg: 4.9,
      ratingCount: 45,
      availableLanguages: ["id", "en"],
      categories: ["Hubungan Sosial", "Antropologi", "Berpikir Kritis"],
      collectionName: "Asal-usul dan Perilaku Manusia",
      genres: ["Antropologi", "Sosiologi", "Evolusi"],
      chapters: [
        {
          chapterNumber: 1,
          titleId: "Social Intelligence: Senjata Utama Homo Sapiens",
          titleEn: "Social Intelligence: The Prime Weapon of Homo Sapiens",
          contentId: "Bayangin lagi nongkrong di kafe, kuota mendadak habis, deadline numpuk, dan dompet digital minus. Satu-satunya jalan keluar: nebeng Wi-Fi. Bukan dengan merengek, tapi ngobrol santai sama barista sampai dia kasih password tanpa ragu. Dalam situasi kritis kayak gitu, skill ngobrol jelas lebih menyelamatkan ketimbang hafalan kode HTML.\n\nContoh kecil itu ngejelasin satu hal: kemampuan sosial sering jadi tameng pertama di dunia yang serbacepat. Kecakapan teknis memang penting, tapi tanpa kemampuan bikin orang percaya, keahlianmu cuma bertahan di layar laptop.\n\nMenurut Robin Dunbar dalam Grooming, Gossip, and the Evolution of Language (1998), ukuran neokorteks manusia linier dengan ukuran kelompok pertemanan. Otak secara harfiah di-desain buat networking, bukan buat adu otot. Semakin besar lingkar sosial, semakin kompleks pula percakapan yang harus diproses.",
          contentEn: "Imagine chilling in a coffee shop, suddenly out of mobile data, deadlines piling high, and your e-wallet empty. Your sole escape route: borrowing Wi-Fi. Not by pleading, but by having an effortless rapport with the barista until they gladly share the network password.\n\nThat humble vignette demonstrates one crucial truth: social capability is our primary shield in an accelerated world.",
          audioUrl: null,
          audioDurationSec: null,
        },
        {
          chapterNumber: 2,
          titleId: "Dari Simpanse ke Star Wars: Evolusi Obrolan Santai",
          titleEn: "From Chimpanzees to Star Wars: The Evolution of Small Talk",
          contentId: "Banyak orang menganggap obrolan basa-basi (small talk) sebagai hal yang tidak penting dan membuang waktu. Dalam kacamata antropologi evolusioner, basa-basi adalah pengganti ritual mencari kutu pada primata purba: cara kita saling memastikan bahwa kita berada di pihak yang sama dan tidak berniat saling mencelakai.",
          contentEn: "Many dismiss casual small talk as superficial frivolity. From the vantage point of evolutionary anthropology, casual pleasantries replaced social grooming among ancestral primates.",
          audioUrl: null,
          audioDurationSec: null,
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
          priceIdr: 32000,
          traditionalPriceIdr: 79000,
          savingsPercent: 59,
          weightGrams: 240,
          inStock: true,
          isbn: "978-602-0011-01-1",
        },
        {
          tier: "standard_trade",
          tierName: "Edisi Standar (Bookpaper)",
          paperType: "Bookpaper Krem 72 gsm",
          paperGsm: 72.0,
          coverType: "Softcover AC 260gsm Doff",
          bindingType: "Jahit Benang",
          priceIdr: 72000,
          traditionalPriceIdr: 98000,
          savingsPercent: 26,
          weightGrams: 320,
          inStock: true,
          isbn: "978-602-0011-02-8",
        },
      ],
      claimCodes: ["SOSIAL-HOMO-26", "ANZA-SAPIENS-01"],
    },
    {
      slug: "merobek-langit-dogma",
      title: "Merobek Langit Dogma: Awal Revolusi Sains",
      originalTitle: "Tearing the Sky of Dogma: The Dawn of Scientific Revolution",
      author: "Sabda PS",
      authorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      editor: "Anza Book",
      editorAvatar: "/logo-mark.svg",
      translator: null,
      coverUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80",
      coverColor: "#0284C7",
      synopsis: "Ketika teleskop Galileo pertama kali diarahkan ke langit malam dan menemukan bahwa bumi bukan pusat jagat raya, tatanan kekuasaan politik dan dogma berusia ribuan tahun terguncang. Buku ini menelusuri bagaimana keberanian bertanya meruntuhkan tirani kepalsuan.",
      bulletinExcerpt: "Kebenaran ilmiah tidak pernah ditentukan oleh konsensus penguasa atau suara mayoritas yang keras berteriak.",
      publishedYear: 2026,
      pageCount: 320,
      totalChapters: 6,
      readingMinutes: 28,
      audioDurationMinutes: 80,
      digitalPolicy: "sample_only",
      accessTier: "premium" as const,
      hasPhysical: true,
      securityLevel: "standard_blur",
      isWeeklyBulletin: false,
      rakyatPriceIdr: 34000,
      standardPriceIdr: 76000,
      ratingAvg: 4.7,
      ratingCount: 19,
      availableLanguages: ["id", "en"],
      categories: ["Sains", "Filsafat", "Sejarah"],
      collectionName: "Cara Kerja Kenyataan",
      genres: ["Sejarah Sains", "Filsafat Ilmu", "Kosmologi"],
      chapters: [
        {
          chapterNumber: 1,
          titleId: "Bab 1: Menatap Bulan dengan Tabung Kaca",
          titleEn: "Chapter 1: Looking at the Moon Through a Glass Tube",
          contentId: "Pada musim gugur 1609 di Padua, seorang profesor matematika mengarahkan pipa berlensa cembung ke arah kawah bulan. Apa yang dilihatnya bukan bulatan kristal sempurna seperti yang didogmakan para teolog, melainkan dataran kasar penuh jurang dan kawah berbatu yang mirip dengan permukaan bumi.",
          contentEn: "In the autumn of 1609 in Padua, a mathematics professor pointed a lead tube fitted with convex lenses toward the lunar craters.",
          audioUrl: null,
          audioDurationSec: null,
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
          priceIdr: 34000,
          traditionalPriceIdr: 85000,
          savingsPercent: 60,
          weightGrams: 250,
          inStock: true,
          isbn: "978-602-0012-01-8",
        },
      ],
      claimCodes: ["SABDA-DOGMA-26"],
    },
    {
      slug: "akar-semua-kekusutan-percintaan",
      title: "Akar Semua Kekusutan Percintaan, Menurut Antropologi",
      originalTitle: "The Roots of Romantic Entanglements, According to Anthropology",
      author: "Cania Citta",
      authorAvatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
      editor: "Anza Book",
      editorAvatar: "/logo-mark.svg",
      translator: null,
      coverUrl: "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=600&auto=format&fit=crop&q=80",
      coverColor: "#BE123C",
      synopsis: "Kenapa cinta terasa begitu rumit, penuh drama kecemburuan, dan sering bikin sakit hati? Melalui kacamata antropologi budaya dan biologi evolusioner, buku ini mengurai ekspektasi romantis modern yang kerap bertabrakan dengan naluri purba pembentukan ikatan pasangan manusia.",
      bulletinExcerpt: "Romantisisme modern menuntut pasangan menjadi sahabat, kekasih, mitra finansial, sekaligus terapis pribadi dalam satu paket yang mustahil.",
      publishedYear: 2026,
      pageCount: 240,
      totalChapters: 6,
      readingMinutes: 22,
      audioDurationMinutes: 50,
      digitalPolicy: "free_open",
      accessTier: "free" as const,
      hasPhysical: true,
      securityLevel: "standard_blur",
      isWeeklyBulletin: false,
      rakyatPriceIdr: 30000,
      standardPriceIdr: 68000,
      ratingAvg: 4.6,
      ratingCount: 32,
      availableLanguages: ["id"],
      categories: ["Antropologi", "Hubungan Sosial", "Psikologi"],
      collectionName: "Asal-usul dan Perilaku Manusia",
      genres: ["Antropologi", "Hubungan", "Psikologi Sosial"],
      chapters: [
        {
          chapterNumber: 1,
          titleId: "Bab 1: Mitos Cinta Sejati dan Runtuhnya Realitas",
          titleEn: "Chapter 1: The Myth of True Love and the Collapse of Reality",
          contentId: "Setiap dongeng masa kecil kita berakhir dengan kalimat: 'dan mereka hidup bahagia selamanya'. Dongeng itu tidak pernah menceritakan siapa yang mencuci piring keesokan paginya, siapa yang membayar cicilan listrik, atau bagaimana menghadapi pasangan yang tidur mendengkur.",
          contentEn: "Every fairy tale from our childhood closes with: 'and they lived happily ever after.'",
          audioUrl: null,
          audioDurationSec: null,
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
          priceIdr: 30000,
          traditionalPriceIdr: 75000,
          savingsPercent: 60,
          weightGrams: 200,
          inStock: true,
          isbn: "978-602-0013-01-5",
        },
      ],
      claimCodes: ["CANIA-CINTA-26"],
    },
    {
      slug: "revolusi-cetak-kedaulatan-membaca",
      title: "Revolusi Cetak & Kedaulatan Membaca",
      originalTitle: "The Print Revolution & Reading Sovereignty",
      author: "Sutan Sjahrir",
      authorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
      editor: "Anza Book",
      editorAvatar: "/logo-mark.svg",
      translator: "Ahmad Sanusi",
      coverUrl: "/covers/revolusi-cetak.svg",
      coverColor: "#F06A24",
      synopsis: "Mengapa buku di Indonesia begitu mahal? Bukan karena penulis serakah, melainkan rantai distribusi oligopoli dan potongan toko fisik 45-50%. Manifesto ini membedah kalkulasi HPP cetak kertas Newsprint 48.8 gsm dan rute distribusi langsung ke tangan rakyat pembaca.",
      bulletinExcerpt: "Buku tidak boleh menjadi barang mewah kaum ningrat. Dengan memangkas perantara dan memakai kertas buram halus, kita kembalikan buku ke tangan mereka yang paling haus ilmu.",
      publishedYear: 2026,
      pageCount: 256,
      totalChapters: 6,
      readingMinutes: 22,
      audioDurationMinutes: 45,
      digitalPolicy: "free_open",
      accessTier: "premium_physical" as const,
      hasPhysical: true,
      securityLevel: "standard_blur",
      isWeeklyBulletin: true,
      rakyatPriceIdr: 29000,
      standardPriceIdr: 69000,
      ratingAvg: 4.9,
      ratingCount: 312,
      availableLanguages: ["id", "en"],
      categories: ["Ekonomi", "Sejarah", "Politik"],
      collectionName: "Kedaulatan Membaca",
      genres: ["Ekonomi Buku", "Sejarah Literasi", "Manifesto"],
      chapters: [
        {
          chapterNumber: 1,
          titleId: "Bab 1: Anatomi Buku Mahal di Negeri Kepulauan",
          titleEn: "Chapter 1: Anatomy of Expensive Books in an Archipelago",
          contentId: "Buku di Indonesia selama puluhan tahun diperlakukan seperti barang mewah kosmetik. Dari selembar label harga Rp95.000 di toko buku jaringan besar, biaya kertas dan cetak sebenarnya tidak sampai Rp18.000. Kemana sisa Rp77.000 lainnya menguap?\n\nJawabannya ada pada rantai pasok warisan kolonial: konsinyasi dengan potongan 45% sampai 50% bagi pengelola toko, biaya distributor 15%, pajak ganda, dan risiko buku retur yang hangus di gudang. Sistem ini membuat penerbit harus mencetak oplah kecil dengan harga melambung tinggi agar tidak gulung tikar.\n\nEdisi Rakyat AnzaBook membalik total paradigma ini. Dengan menggunakan kertas Newsprint 48.8 gsm (kertas koran halus ramah baca) dan menjual langsung melalui hub komunitas serta sistem klaim digital, biaya produksi per eksemplar dapat ditekan hingga di bawah Rp15.000. Inilah fondasi kedaulatan membaca kita.",
          contentEn: "For decades in Indonesia, books have been treated like luxury cosmetic goods. Out of a Rp95,000 price tag in major chain bookstores, the actual paper and printing cost barely reaches Rp18,000. Where does the remaining Rp77,000 evaporate to?\n\nThe answer lies in a colonial-heritage supply chain: consignment margins of 45% to 50% for bookstore operators, 15% distributor fees, double taxation, and the risk of returned unsold books rotting in warehouses. This system forces publishers into small print runs with inflated retail prices just to survive.\n\nAnzaBook's People's Edition completely inverts this paradigm. By utilizing 48.8 gsm newsprint (smooth, eye-friendly newsprint paper) and distributing directly through community hubs and digital claim systems, production costs per copy stay below Rp15,000. This is the cornerstone of our reading sovereignty.",
          audioUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
          audioDurationSec: 1320,
        },
        {
          chapterNumber: 2,
          titleId: "Bab 2: Kertas Buram, Koran Stensil, dan Perlawanan Bahasa",
          titleEn: "Chapter 2: Newsprint, Stencils, and Linguistic Resistance",
          contentId: "Kertas buram bukanlah tanda kemiskinan karya, melainkan senjata sejarah literasi dunia. Pada era pergerakan kemerdekaan 1920-1945, pamflet politik dan terjemahan gagasan dunia dicetak di atas kertas stensil murah dan diedarkan dari tangan ke tangan pejuang di gerbong kereta api Jawa.\n\nKetika penerbit modern memaksakan standar 'buku mewah' dengan kertas tebal beraroma wangi tapi mematok harga setara upah dua hari buruh harian, yang terjadi adalah sensor ekonomi halus: ilmu pengetahuan dipagari tembok ketidakmampuan bayar.",
          contentEn: "Rough newsprint paper is not a mark of literary poverty, but a historical weapon of world literacy. During the 1920-1945 independence movement, political pamphlets and translations of world philosophy were printed on inexpensive stencil paper and passed hand-to-hand among freedom fighters on Javanese railway coaches.",
          audioUrl: null,
          audioDurationSec: null,
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
      authorAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
      editor: "Anza Book",
      editorAvatar: "/logo-mark.svg",
      translator: null,
      coverUrl: "/covers/madilog.svg",
      coverColor: "#8B1E1E",
      synopsis: "Karya magnum opus Tan Malaka yang ditulis di masa pelarian bawah tanah di Rawajati. Menganalisis bagaimana bangsa Indonesia harus melepaskan diri dari belenggu 'logika mistika' dan takhayul feodal menuju cara berpikir ilmiah, materialistis, dan dialektis.",
      bulletinExcerpt: null,
      publishedYear: 2026,
      pageCount: 448,
      totalChapters: 6,
      readingMinutes: 35,
      audioDurationMinutes: 90,
      digitalPolicy: "free_open",
      accessTier: "free" as const,
      hasPhysical: true,
      securityLevel: "standard_blur",
      isWeeklyBulletin: false,
      rakyatPriceIdr: 39000,
      standardPriceIdr: 79000,
      ratingAvg: 4.8,
      ratingCount: 520,
      availableLanguages: ["id", "en"],
      categories: ["Filsafat", "Sains", "Sejarah"],
      collectionName: "Cara Kerja Kenyataan",
      genres: ["Filsafat", "Sains", "Klasik Indonesia"],
      chapters: [
        {
          chapterNumber: 1,
          titleId: "Bab 1: Dari Logika Mistika Menuju Ilmu Bukti",
          titleEn: "Chapter 1: From Mystical Logic to Empirical Science",
          contentId: "Selama berabad-abad bangsa kita dihipnotis oleh kepercayaan bahwa nasib manusia ditentukan oleh jimat, ramalan dukun, dan kekuasaan gaib. Akibatnya, ketika penjajah datang dengan meriam dan kompas ilmiah, perlawanan kita mudah dipatahkan karena kita bertumpu pada keyakinan magis, bukan penguasaan kenyataan materiil.\n\nMadilog adalah ikhtiar merombak cara berpikir tersebut dari akarnya. Materi mendahului ide, dan kenyataan objektif harus dibuktikan melalui eksperimen serta pengamatan kritis, bukan sekadar kutipan dogma kuno.",
          contentEn: "For centuries our people have been hypnotized by the belief that human destiny is governed by talismans, shamanic prophecies, and unseen occult forces.",
          audioUrl: null,
          audioDurationSec: null,
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
      ],
      claimCodes: ["MADILOG-RAKYAT-01"],
    },
  ];

  // 3. Masukkan atau Perbarui Buku ke Database
  for (const bookItem of booksData) {
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
          author: bookRow.author,
          authorAvatar: bookRow.authorAvatar,
          editor: bookRow.editor,
          editorAvatar: bookRow.editorAvatar,
          coverUrl: bookRow.coverUrl,
          synopsis: bookRow.synopsis,
          bulletinExcerpt: bookRow.bulletinExcerpt,
          totalChapters: bookRow.totalChapters,
          accessTier: bookRow.accessTier,
          hasPhysical: bookRow.hasPhysical,
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

      // Masukkan bab buku baru
      for (const chap of chapters) {
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

      // Masukkan edisi cetak
      for (const ed of editions) {
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

      if (process.env.NODE_ENV !== "production" && claimCodes.length > 0) {
        await db.insert(schema.bookClaimCodes).values(
          claimCodes.map((code) => ({ bookId, code, isDemo: true })),
        );
      }

      // Masukkan stok toko fisik
      for (const branch of allBranches) {
        const isWarehouse = branch.chainName === "komunitas";
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

  console.log("Penyelarasan katalog AnzaBook selesai.");
}
