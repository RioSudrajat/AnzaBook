# DESIGN.md: AnzaBook Visual & Interaction Direction

## Identity & Character

- **Product:** AnzaBook (Platform E-Reader, Buku Cetak Terjangkau Multi-Kertas, Komunitas Literasi & Strava-Style Reading Share).
- **Theme Foundation:** Hallmark `Furrow` (Manila Paper, Warm Ink, Ruled Index Hairlines, Moulded Keys, Tangerine Bookmark Ribbon).
- **Brand Icon:** `/icon.svg` (Monogram pilar buku Manila `#F6F2E9` + pita huruf B Tangerine `#F06A24` di atas kanvas tinta `#13110F`).
- **Dials (Exploration & Marketing Pages):** `Dial: ENERGY 2 / RHYTHM 3 / MOTION 3`
- **Dials (Protected Reading Canvas):** `Dial: ENERGY 1 / RHYTHM 1 / MOTION 1`

## Palette (OKLCH)

- **Paper (Primary Surface):** `oklch(96% 0.011 85)` (`#F6F2E9`)
- **Paper-2 (Elevated Sheet / Card):** `oklch(99.5% 0.005 85)` (`#FEFDFB`)
- **Paper-3 (Recessed Well):** `oklch(92% 0.016 85)` (`#EAE3D5`)
- **Ink (Primary Text & Structural Rules):** `oklch(18% 0.006 60)` (`#13110F`)
- **Ink-2 (Secondary Text):** `oklch(28% 0.008 60)` (`#2B2825`)
- **Muted Ink (Metadata & Captions):** `oklch(44% 0.012 60)` (`#56514B`)
- **Rule (Hairline Dividers):** `oklch(88% 0.013 85)` (`#DDD6C7`)
- **Accent (Furrow Tangerine Ribbon):** `oklch(70% 0.19 40)` (`#F06A24`) with dark ink foreground `oklch(18% 0.006 60)` (`#13110F`)
- **Reading Modes:** `Manila` (default), `Sepia` (`[data-theme="sepia"]`), and `Warm Night` (`.dark` / `[data-theme="night"]`).

## Typography (Dual-Zone Literary System)

- **Display & Reading Canvas (`--font-display` / `--font-reader`):** `Literata` (Weights: `400`, `600`).
- **UI Chrome & Controls (`--font-body`):** `Plus Jakarta Sans` (Weights: `400`, `500`, `600`).
- **Tabular Metrics, Prices, WPM & ISBN (`--font-outlier`):** `Red Hat Mono` (`tabular-nums`, Weights: `400`, `500`).

## Motion & Choreography (GSAP + Lenis)

- **Smooth Scroll:** Lenis (`lenis`) disinkronkan dengan `gsap.ticker` dan `ScrollTrigger` untuk seluruh halaman eksplorasi; dihentikan otomatis saat masuk ke _Reading Canvas_ atau saat `prefers-reduced-motion: reduce` aktif.
- **Opening Literary Curtain Preloader:** Muncul sekali per sesi dengan animasi teks kutipan bertahap (`blur` ke tajam), ikon AnzaBook, tombol **Lewati** (`Escape`), dan efek angkat tirai kurva SVG.
- **Hero 3D Tactile Shelf Carousel:** Rak buku perspektif 3D yang bereaksi terhadap kecepatan _scroll_ Lenis dan mengangkat buku ke depan saat di-hover/fokus untuk menampilkan harga _Edisi Rakyat_ & stok toko, dilengkapi tombol **Jeda / Putar**.

## Written Purpose Reasons (R-31)

- **Why Manila Paper (`#F6F2E9`):** Meniru kehangatan kertas cetak asli agar mata tidak cepat lelah saat membaca 20 hingga 60 menit.
- **Why Tangerine Accent (`#F06A24`) with Dark Ink:** Memberi penanda fokus sejelas pita buku fisik sekaligus menjaga kontras bacaan `8.4:1`.
- **Why Dual-Zone Typography:** Membedakan zona bacaan sastra (`Literata`) dari panel alat & metrik (`Plus Jakarta Sans` + `Red Hat Mono`).
- **Why Tactile Ruled Index Over Floating Cards:** Menghindari tumpukan kartu generik dengan menyusun informasi layaknya daftar isi dan kartu catatan bergrid `8px`.
- **Why GSAP + Lenis + 3D Shelf Carousel:** Menghadirkan sensasi memilih buku di rak fisik dan membuka tirai ruang baca secara halus dan terkontrol.
