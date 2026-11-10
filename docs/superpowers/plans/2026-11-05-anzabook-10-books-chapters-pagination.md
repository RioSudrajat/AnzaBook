# Katalog 13 Buku: 7–10 Bab & Multi-Halaman per Bab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Memperkaya katalog AnzaBook menjadi 13 buku kurasi lengkap (10 buku eksisting + 2 novel karya Oke Sudrajat + 1 karya filosofis "Belum Ada Judul" karya Selembar Awan), masing-masing memuat 7–10 bab multi-halaman dengan penanda `<!-- pagebreak -->` dan fallback otomatis, serta indikator nomor halaman di E-Reader.

**Architecture:** 
1. Utilitas pemisah halaman (`chapter-pagination.ts`) di shared/reader untuk memecah teks bab berdasarkan penanda eksplisit `<!-- pagebreak -->` atau secara proporsional per kelompok paragraf (3–4 paragraf per halaman).
2. Perluasan data kurasi di `seed-catalog.ts` untuk 13 buku (total ~105 bab lengkap dengan naskah sastra/filsafat/sains/horor/misteri nyata dan penanda halaman).
3. Sinkronisasi metadata buku (`totalChapters`, `pageCount`) dan penyempurnaan UI E-Reader (`read.$slug.tsx`) untuk menampilkan nomor halaman aktif ("Bab X • Hlm Y dari Z") dan transisi antar halaman/bab yang mulus.

**Tech Stack:** TypeScript, Drizzle ORM, PostgreSQL 17, React 19, TanStack Start, Lucide Icons, Vitest.

---

## Global Constraints
- Naskah harus bermutu tinggi, berbobot, sesuai karakter masing-masing buku (bukan teks lorem ipsum atau placeholder tiruan).
- Buku *Belum Ada Judul* karya Selembar Awan memiliki 10 bab pengembaraan anak Adam menyusuri bumi dengan plot twist menggantung di bab 10 dan ajakan kepada pembaca untuk menuliskan judulnya sendiri.
- Buku *Ghost Back to Campus* dan *Kematian Kedua* karya Oke Sudrajat (Penerbit Anza) masing-masing memuat 10 bab bernuansa horor-komedi kampus dan misteri takdir/kematian.
- Zero breaking changes pada skema database yang sudah ada (memanfaatkan `contentId`, `contentEn`, dan `paragraphsJson`).
- Mengikuti Anti-Slop (Balanced mode): tipografi sastra yang bersih, tanpa ornamen berlebih.

---

### Task 1: Utilitas Parser Multi-Halaman (`chapter-pagination.ts`)
**Files:**
- Create: `apps/web/src/features/reader/lib/chapter-pagination.ts`
- Test: `apps/web/src/features/reader/lib/chapter-pagination.test.ts`

- [ ] **Step 1: Tulis unit test untuk parser halaman bab**
  - Menguji pemisahan teks dengan penanda `<!-- pagebreak -->`.
  - Menguji fallback pemisahan otomatis jika tidak ada penanda (berdasarkan chunk paragraf, default 3 paragraf per halaman).
  - Menguji kalkulasi total halaman dan nomor halaman aktif berdasarkan index paragraf atau index halaman slide.
- [ ] **Step 2: Jalankan test untuk memastikan test gagal (RED)**
  - `pnpm --filter @starter/web test chapter-pagination`
- [ ] **Step 3: Implementasikan fungsi `splitChapterIntoPages` & `getChapterPageInfo`**
  - Mengembalikan struktur `ChapterPage[]` berisi paragraf, nomor halaman, dan teks utuh per halaman.
- [ ] **Step 4: Jalankan test kembali dan pastikan lulus (GREEN)**
  - `pnpm --filter @starter/web test chapter-pagination`

---

### Task 2: Penulisan Naskah Kurasi 13 Buku di `seed-catalog.ts`
**Files:**
- Modify: `apps/api/src/db/seed-catalog.ts`

- [ ] **Step 1: Susun data 7–10 bab untuk 10 buku katalog utama**
  - Buku 1–10: Sains Zenius (8 bab), Kecerdasan Sosial (8 bab), Revolusi Cetak (7 bab), Filsafat Santa (7 bab), Tipografi Proletar (7 bab), Membaca Cepat (8 bab), Madilog (10 bab), Indonesia Menggugat (9 bab), Ekonomi Sirkular (7 bab), Panduan Komunitas (8 bab).
- [ ] **Step 2: Tambahkan 2 buku karya Oke Sudrajat (Penerbit Anza)**
  - *Ghost Back to Campus* (10 Bab, horor-komedi kampus, multi-halaman).
  - *Kematian Kedua* (10 Bab, misteri psikologis karma & reinkarnasi, multi-halaman).
- [ ] **Step 3: Tambahkan karya Selembar Awan: *Belum Ada Judul***
  - *Belum Ada Judul* (10 Bab, pengembaraan anak Adam menyusuri bumi, plot twist open-ending di bab 10, ajakan merumuskan judul).
- [ ] **Step 4: Jalankan migrasi / seed database lokal**
  - `pnpm db:migrate`

---

### Task 3: Integrasi Multi-Halaman ke UI E-Reader
**Files:**
- Modify: `apps/web/src/routes/_protected/read.$slug.tsx`
- Modify: `apps/web/src/features/reader/components/reader-toolbar.tsx`
- Modify: `apps/web/src/features/reader/components/reader-sidebar-toc.tsx`

- [ ] **Step 1: Integrasikan `chapter-pagination` ke dalam `read.$slug.tsx`**
  - Ganti pemotongan slice statis dengan `splitChapterIntoPages`.
  - Dukung navigasi Slide Mode antar halaman dalam satu bab secara halus.
  - Tambahkan transisi otomatis ke bab berikutnya saat tombol *Berikutnya* ditekan di halaman terakhir bab.
- [ ] **Step 2: Tampilkan Indikator Halaman Presisi**
  - Di toolbar atas dan kontrol bawah, tampilkan informasi: `Bab {chapNum} • Halaman {currentPage} dari {totalPages}`.
  - Di mode scroll, tampilkan pembatas halaman elegan berlabel `— Halaman X —` di setiap titik pergantian halaman.
- [ ] **Step 3: Perbarui Daftar Isi (Sidebar TOC)**
  - Tampilkan seluruh bab pada sidebar TOC dengan status bab aktif dan jumlah halaman per bab.

---

### Task 4: Verifikasi Menyeluruh & Testing
**Files:**
- Test: `apps/api/src/test/reading-progress.test.ts`
- Run: `pnpm check`

- [ ] **Step 1: Jalankan typecheck dan lint**
  - `pnpm typecheck`
  - `pnpm lint`
- [ ] **Step 2: Jalankan full test suite**
  - `pnpm test`
- [ ] **Step 3: Verifikasi manual di browser (localhost:3000)**
  - Buka buku baru (*Ghost Back to Campus*, *Kematian Kedua*, *Belum Ada Judul*).
  - Coba navigasi halaman di mode Slide (Halaman 1 -> 2 -> 3 -> Bab berikutnya).
  - Pastikan checkpoint pembaca tersimpan akurat.
