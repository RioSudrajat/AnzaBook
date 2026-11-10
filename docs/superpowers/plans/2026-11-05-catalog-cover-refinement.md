# Pembaruan Sampul Buku & Penyempurnaan Tampilan Katalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menghilangkan label harga dan penyebutan "Edisi Rakyat" dari kartu katalog serta sampul buku, merestrukturisasi komposisi sampul dengan logo AnzaBook di kanan atas, elemen visual artistik di tengah, dan nama penulis di bawah tengah, serta menyempurnakan badge dan metrik sosial membaca.

**Architecture:** Memperbarui komponen `BookCover` dengan inline SVG visual patterns tematik, tipografi hierarkis editorial, dan identitas brand AnzaBook tanpa cetakan harga. Memperbarui `BookCatalogCard` dengan soft-pill badges (kategori, `FREE`/`PREMIUM`, `FISIK`) dan metrik pembaca serta aktivitas berbagi yang menggantikan teks harga lama di footer kartu.

**Tech Stack:** React 19, Tailwind CSS v4, Lucide React, TanStack Start/Router, TypeScript.

**Spec:** `docs/superpowers/specs/2026-11-05-catalog-cover-refinement-design.md`

## Global Constraints

- Judul utama section katalog di `apps/web/src/routes/index.tsx` WAJIB tetap `"Katalog Edisi Rakyat & Pustaka Digital"`.
- Tidak ada teks harga (`Rp...`) atau frasa `"Edisi Rakyat"` pada kartu katalog dan sampul buku di muka katalog.
- Badge `FISIK` tetap dipertahankan bagi buku yang memiliki opsi cetak fisik (`hasPhysical: true`), tetapi didesain rapi, terintegrasi, dan anti-slop (tanpa border neon tebal).
- Desain visual sampul harus memuat logo mini AnzaBook + teks `"AnzaBook"` di kanan atas, visual artistik tematik di tengah, dan nama penulis di tengah bawah.
- Seluruh perubahan harus lulus typecheck (`pnpm --filter @starter/web typecheck`) dan verifikasi kode (`pnpm check`).

## Review Focus

1. **Responsivitas Layar**: Di layar mobile (360px) dan desktop (1280px), layout kartu katalog horizontal tidak mengalami text clipping atau horizontal overflow.
2. **Kesesuaian Tampilan Cover**: Komponen `BookCover` yang dirender di beranda maupun di halaman detail (`books.$slug.tsx`) tidak menimbulkan regression visual atau proporsi yang rusak.
3. **Keterbacaan Tipografi**: Judul buku pada sampul tetap kontras di atas elemen visual artistik.
4. **Keaslian Metrik**: Angka pembaca dan share dihitung secara deterministik berbasis data buku agar konsisten saat dirender di SSR.
5. **Aksesibilitas (a11y)**: Warna badge `FREE`, `PREMIUM`, dan `FISIK` memenuhi rasio kontras WCAG AA (minimal 4.5:1 untuk normal text).

---

## Tasks

- [x] **Task 1: Redesain Komposisi & Grafis Sampul Buku (`BookCover`)**
  - **Files**: `apps/web/src/features/books/components/book-cover.tsx`
  - **Deliverable**: Sampul buku dengan logo mini AnzaBook di kanan atas, visual artistik tematik (vektor SVG inline non-polos), tipografi judul tebal, nama penulis di tengah bawah, dan bebas dari label harga.
  - **Steps**:
    - [x] 1. Siapkan aset/komponen inline SVG visual art tematik (motif Bauhaus, garis geometris, siluet abstrak, dsb.) yang dipilih berdasarkan genre atau slug buku.
    - [x] 2. Update markup `BookCover`: tambahkan brand header di kanan atas (logo ikon buku/monogram AnzaBook + teks `"AnzaBook"`).
    - [x] 3. Posisikan judul buku dan grafis artistik di area tengah dengan kontras warna yang nyaman.
    - [x] 4. Posisikan nama penulis di bagian tengah bawah sampul.
    - [x] 5. Hapus footer harga (`Rp...` / `edition.priceIdr` / `rakyatPriceIdr`) dari sampul buku.
    - [x] 6. Verifikasi tipe TypeScript dan jalankan typecheck `apps/web`.

- [x] **Task 2: Penyempurnaan Badge & Footer Metrik Kartu Katalog (`BookCatalogCard`)**
  - **Files**: `apps/web/src/features/books/components/book-catalog-card.tsx`
  - **Deliverable**: Kartu katalog dengan header badge bersih (*clean pill*) untuk kategori, `FREE`/`PREMIUM`, dan `FISIK`, serta footer baru yang menampilkan metrik pembaca & share menggantikan `Edisi Rakyat: Rp...`.
  - **Steps**:
    - [x] 1. Rombak baris atas kartu: tampilkan kategori di sisi kiri dengan gaya muted font mono/sans yang elegan.
    - [x] 2. Tampilkan badge akses (`FREE` / `PREMIUM`) di sisi kanan dengan soft-pill styling tanpa border neon yang kasar.
    - [x] 3. Jika `book.hasPhysical` bernilai `true`, tampilkan badge `FISIK` dengan style soft pill netral yang menyatu.
    - [x] 4. Tempatkan indikator bendera bahasa secara rapi dan harmonis.
    - [x] 5. Rombak footer kartu: hapus `Edisi Rakyat: Rp{book.rakyatPriceIdr}` dan gantikan dengan metrik fungsional: jumlah pembaca (`👥 [X]k pembaca`) dan jumlah share (`↗ [Y] dibagikan`).
    - [x] 6. Pertahankan link aksi `Lihat Buku →` di sisi kanan footer dengan hover transisi aksen.
    - [x] 7. Jalankan typecheck `pnpm --filter @starter/web typecheck`.

- [x] **Task 3: Verifikasi Halaman Beranda & Konsistensi UI/UX**
  - **Files**: `apps/web/src/routes/index.tsx`, `apps/web/src/routes/books.$slug.tsx`
  - **Deliverable**: Halaman katalog beranda menampilkan judul `"Katalog Edisi Rakyat & Pustaka Digital"` secara utuh, kartu buku rapi tanpa harga/edisi rakyat di muka katalog, dan halaman detail buku tetap berfungsi normal.
  - **Steps**:
    - [x] 1. Periksa `apps/web/src/routes/index.tsx` memastikan judul section katalog tetap utuh dan selaras.
    - [x] 2. Periksa penggunaan `BookCover` di `apps/web/src/routes/books.$slug.tsx` untuk memastikan layout detail buku tetap anggun dengan sampul baru.
    - [x] 3. Jalankan `pnpm check` untuk memvalidasi linting, TypeScript types, dan suite test otomatis.
