# About Page & Brand Vision Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mengimplementasikan halaman dedicated `/about` (berkiblat pada manifesto dan estetika ala Malaka Books), memperbarui headline Hero menjadi *"Aksara Tanpa Penjara Pikiran: Pustaka Digital & Edisi Cetak Rakyat"*, membersihkan rincian teknis (newsprint/angka rupiah) dari tampilan umum, serta menyelaraskan deskripsi footer dengan frasa *"sudut baca di Indonesia"*.

**Architecture:** Menambahkan route SSR TanStack Start `apps/web/src/routes/about.tsx` yang memuat manifesto literasi, visi, 4 pilar misi, roadmap ekosistem masa depan (komunitas & sudut baca), dan jembatan ke section Transparansi Industri Buku. Memperbarui hero headline dan subheadline pada `apps/web/src/routes/index.tsx`, serta mengarahkan navigasi footer `apps/web/src/components/site-footer.tsx` dan header `apps/web/src/components/site-header.tsx` ke halaman `/about`.

**Tech Stack:** TanStack Start (React 19 + TanStack Router), Tailwind CSS v4, Lucide React, TypeScript monorepo.

**Spec:** Dokumen diskusi Visi-Misi AnzaBook, `PRD_AnzaBook.md`, dan `AGENTS.md`.

## Global Constraints

- **Anti-Slop Clean Copy:** Dilarang menyebut rincian teknis material (*newsprint*, gramatur kertas gsm) maupun angka rupiah spesifik di Hero, Footer, atau halaman About. Semua detail teknis hanya diizinkan berada pada section/halaman *Transparansi Industri Buku*.
- **Brand Terminology:** Menggunakan frasa baku: *"Aksara Tanpa Penjara Pikiran: Pustaka Digital & Edisi Cetak Rakyat"*, *"cetak rakyat"*, *"terjangkau"*, *"ragam novel fiksi dan nonfiksi"*, dan *"sudut baca di Indonesia"*.
- **Desain & Tipografi:** Mengikuti token warna AnzaBook (`--color-paper`, `--color-ink`, `--color-accent`) dan hierarki tipografi editorial (`font-serif` untuk tajuk, `font-sans` untuk badan teks, `font-mono` untuk metadata/lencana) dengan kontras WCAG AA.
- **Navigasi Aman:** Pastikan navigasi header dan footer tetap berfungsi baik saat diakses dari root `/` maupun saat pengunjung berada di `/about`.

## Review Focus

1. **Sanitasi Kata Kunci Teknis:** Memastikan teks Hero dan Footer tidak lagi memuat kata "Newsprint" atau "mulai Rp29.000".
2. **Kesesuaian Teks Footer:** Memastikan frasa yang tertulis tepat "sudut baca di Indonesia" (bukan "peta tempat baca di Indonesia").
3. **Integritas Route SSR:** Memastikan route `/about` di-*generate* dengan benar oleh TanStack Router (`routeTree.gen.ts`) dan tidak menyebabkan hydration mismatch.
4. **Kelengkapan 4 Pilar Misi:** Memastikan halaman `/about` mencantumkan Visi lengkap serta 4 Misi (Akses Tanpa Sekat, Hak & Perlindungan Penulis, Panggung Komunitas, dan Sudut Baca).
5. **Responsivitas & Aksesibilitas:** Memastikan seluruh elemen di layar 375px (mobile) hingga 1280px (desktop) tidak mengalami *horizontal overflow* dan elemen interaktif memiliki focus ring yang jelas.

---

### Task 1: Update Hero Section Copywriting di `apps/web/src/routes/index.tsx`

**Files:**
- Modify: `apps/web/src/routes/index.tsx:71-85`

**Steps:**
- [ ] Ganti elemen `<h1>` pada Hero Section menjadi:
  ```tsx
  <h1 className="font-serif text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight max-w-4xl leading-[1.15] text-balance">
    Aksara Tanpa Penjara Pikiran: Pustaka Digital & Edisi Cetak Rakyat
  </h1>
  ```
- [ ] Bersihkan paragraf sub-headline Hero dari kata "Newsprint" dan "mulai Rp29.000", perbarui menjadi:
  ```tsx
  <p className="mt-5 text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl font-normal leading-relaxed text-balance">
    Pustaka digital ragam novel fiksi dan nonfiksi, edisi cetak rakyat yang
    terjangkau dengan perlindungan penuh bagi karya penulis, serta ruang
    kolaborasi komunitas ke seluruh penjuru negeri.
  </p>
  ```
- [ ] Periksa kembali bahwa tidak ada properti atau teks lain di Hero yang melanggar batasan global.

---

### Task 2: Buat Halaman Dedicated `/about` di `apps/web/src/routes/about.tsx`

**Files:**
- Create: `apps/web/src/routes/about.tsx`

**Content & Sections Structure:**
1. **Header & Top Badge:**
   - Lencana: *"Manifesto & Nilai AnzaBook"*
   - Judul Utama: *"Membebaskan Aksara, Merawat Karya Penulis"*
   - Pengantar editorial tentang kegelisahan literasi dan kelahiran AnzaBook.
2. **The Manifesto: Cerita Nyata & Karya Fiksi-Nonfiksi untuk Semua:**
   - Esai editorial yang menjelaskan pentingnya cerita nyata (novel nonfiksi) sebagai cermin kehidupan, serta fiksi yang mengasah empati.
   - Penegasan bahwa aksara tidak boleh dipenjara oleh sekat sosial, jarak wilayah, maupun harga yang tak terjangkau.
3. **Visi & Misi Lengkap AnzaBook:**
   - Card Visi dengan aksen tipografi serif yang menonjol:
     *"Mendemokratisasi akses membaca dan melindungi hak karya penulis dalam ekosistem literasi yang adil, inklusif, dan terhubung—dari layar digital, cetak rakyat, hingga ruang temu komunitas di seluruh penjuru negeri."*
   - Grid 4 Pilar Misi:
     1. *Akses Membaca Tanpa Sekat* (Pustaka digital & opsi cetak rakyat terjangkau).
     2. *Perlindungan Hak & Martabat Penulis* (Anti-pembajakan, perlindungan karya, dan royalti yang adil).
     3. *Panggung Komunitas & Temu Kreator* (Peluncuran buku, bedah karya, ruang nulis bareng).
     4. *Merajut Sudut Baca Publik* (Koneksi ke perpustakaan ramah dan tempat membaca ternyaman di kota).
4. **Roadmap Ekosistem Masa Depan:**
   - Penjelasan fitur agenda komunitas/penulis dan peta sudut baca ternyaman yang sedang aktif dikembangkan.
5. **Jembatan Transparansi Industri:**
   - Pintu masuk elegan menuju section *Transparansi Industri Buku*, menjelaskan komitmen keterbukaan biaya cetak dan rantai distribusi.
6. **Footer & Navigasi Terpadu:**
   - Menggunakan `SiteHeader` dan `SiteFooter` standar agar konsisten dengan halaman utama.

**Steps:**
- [ ] Buat file `apps/web/src/routes/about.tsx` dengan route TanStack Start `createFileRoute("/about")`.
- [ ] Implementasikan struktur komponen dengan styling Tailwind CSS v4 yang mematuhi anti-slop guidelines.
- [ ] Tambahkan meta tag / title SEO untuk halaman Tentang Kami.

---

### Task 3: Sinkronisasi Footer & Navigasi di `site-footer.tsx` dan `site-header.tsx`

**Files:**
- Modify: `apps/web/src/components/site-footer.tsx`
- Modify: `apps/web/src/components/site-header.tsx`

**Steps:**
- [ ] Pada `apps/web/src/components/site-footer.tsx`:
  - Perbarui link menu "Tentang Kami" agar menggunakan `<Link to="/about">` langsung, bukan sekadar memicu modal kecil.
  - Perbarui teks deskripsi pada modal informasi fallback (jika dibuka) agar bebas dari kata "Newsprint 48.8 gsm" dan "mulai Rp29.000", menggantinya dengan "cetak rakyat yang terjangkau".
  - Pastikan salinan teks footer menyertakan frasa *"sudut baca di Indonesia"*.
- [ ] Pada `apps/web/src/components/site-header.tsx`:
  - Perbarui tautan jangkar (seperti `#katalog`, `#revolusi-harga`, `#keanggotaan`, `#faq`) agar menggunakan path root `/#katalog` atau Link TanStack Router sehingga saat pengguna berada di halaman `/about`, klik navigasi dapat kembali ke bagian beranda dengan mulus.
  - Tambahkan link navigasi atau sub-tautan ke `Tentang Kami` (`/about`).

---

### Task 4: Verifikasi & Test Build

**Files:**
- Run Verification Commands

**Steps:**
- [ ] Jalankan `pnpm --filter @starter/web build` untuk memicu regenerasi TanStack Router `routeTree.gen.ts` dan memvalidasi type check seluruh route.
- [ ] Pastikan tidak ada pesan error TypeScript atau broken imports.
- [ ] Verifikasi bahwa route `/about` dan route `/` dapat diakses dan dirender tanpa peringatan hydration.
