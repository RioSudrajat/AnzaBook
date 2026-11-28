# Rencana Implementasi Best-Practice: Perombakan UX Studio, Profil Entitas, Alur Naskah, & Pembelian Buku Digital Satuan

**Worktree Terisolasi:** `/home/selembarawan/Projects/personal/AnzaBook/.worktrees/fix-studio-ux-publishing-digital-purchase`  
**Branch:** `fix/studio-ux-publishing-digital-purchase` (bercabang dari `main` @ `2251511`)  
**Mode Desain Aktif:** `antislop active: strict (project preference)` — Hallmark `Furrow`.

Dokumen ini adalah salinan kerja di repositori dari artefak rencana implementasi utama yang telah dikunci sesuai keputusan Owner, untuk dieksekusi dengan siklus TDD (_Red-Green-Refactor_) sesuai urutan kontrak monorepo (`packages/shared` -> `apps/api` -> `apps/web`).

## Keputusan yang Telah Dikunci Owner

- **Toggle `Publish` vs `Draft` Katalog Terbit:** Opsi 2 — via `manuscript_submissions.published_book_id` + `is_catalog_revision` (penerbitan ulang _in-place_ tanpa mengganggu versi live saat disunting).
- **Midtrans Sandbox Pembelian Buku Satuan:** Opsi 2 — perluas `book_purchases` dengan kolom siklus hidup Midtrans + berbagi gateway Snap QRIS dengan `membership-payment.ts` dan webhook Midtrans / `scripts/simulate-pay.mjs`.
- **Hapus Buku Terbit:** _Soft-Archive_ (`books.is_archived = true`) bila buku sudah memiliki pembelian lunas (`paidPurchaseCount > 0`), dan _Hard-Delete_ bila belum pernah dibeli (`0`).
- **2 Buku Seed `single_purchase`:** `revolusi-cetak-kedaulatan-membaca` (**Rp129.000**) dan `ghost-back-to-campus` (**Rp99.000**).
- **Klaim Kode Cetak Tetap Dipertahankan:** UI `ClaimCodeDialog` & logika `claimPrintCode` dipertahankan pada detail buku berbayar (`accessTier === "premium" || hasClaimedDigital`); hanya fitur stok toko fisik (`StoreMap`, `LiveStockTracker`, tombol `Stok Toko`, `BookInventoryDialog`) yang dihapus.
- **Migrasi Drizzle `0020_*`:** Disetujui Owner untuk digenerate sebagai migrasi maju baru.

## Urutan Eksekusi Fase

1. **Fase 1 — Kontrak Bersama & Migrasi Drizzle (`0020_*`):**
   - Pangkas `BookDistributionModel` menjadi `free_open | nakama_subscription | single_purchase` dan `AccessTier` menjadi `free | premium` (pertahankan `claimPrintCodeSchema`).
   - Pisahkan validasi simpan draf (boleh string kosong `""`) dari validasi kirim/terbitkan naskah (wajib judul, sinopsis, dan isi bab).
   - Tambahkan `books.is_archived`, `manuscript_submissions.is_catalog_revision`, serta kolom order Midtrans pada `book_purchases`.
2. **Fase 2 — Layanan Backend, Aturan Hapus/Arsip Aman, Revisi Katalog, Seed 2 Buku Satuan, & Midtrans Checkout:**
   - `DELETE /api/publisher/manuscripts/:idOrSlug` & `DELETE /api/publisher/:slug/manuscripts/:idOrSlug`.
   - `POST /api/publisher/:slug/books/:bookId/revision-draft` & `DELETE /api/publisher/:slug/books/:bookId` (soft-archive bila `paidPurchaseCount > 0`, hard-delete bila `0`).
   - `POST /api/books/:slug/checkout`, `GET /api/books/purchases/:purchaseId`, `POST /api/books/purchases/:purchaseId/refresh`, dukungan settlement `book_purchases` di webhook Midtrans + `scripts/simulate-pay.mjs` (dengan tetap menjaga `claimPrintCode` membuka akses penuh).
   - Perbaiki `seed-catalog.ts` agar menyimpan `distributionModel` & `digitalPriceIdr`; ubah `revolusi-cetak-kedaulatan-membaca` (Rp129.000) dan `ghost-back-to-campus` (Rp99.000) menjadi `single_purchase`.
3. **Fase 3 — Header Profil Entitas, `<VerifiedBadge />` Centang Biru, `@slug`, Pill `3 + +n`, Menu `⋯` Bagikan Profil, & Modal Edit Profil Penerbit/Komunitas:**
   - Seragamkan User, Penulis, Penerbit, dan Komunitas Literasi (`/c/$slug` ikut dibersihkan dari tab Pengaturan Profil lama & tombol Bagikan ganda).
4. **Fase 4 — Navigasi `Back` Kontekstual & Persistensi Sub-Tab di URL:**
   - Sinkronkan `subtab` di `/app`, `tab` & `catalogView` di `/p/$slug/studio`, validasi `returnTo`, dan perbaiki exit Editor serta `SmartBackButton`.
5. **Fase 5 — Placeholder Asli di Editor, Pratinjau `Terbuka`/`Terkunci`, & Drawer Konfigurasi/Penerbitan Read-Only Preview:**
   - Hapus teks default palsu saat buat draf; tampilkan placeholder murni; tambahkan sakelar `Terbuka | Terkunci` pada pratinjau naskah berbayar; jadikan Editor satu-satunya tempat edit judul/sinopsis/sampul.
6. **Fase 6 — Kartu List Draf/Katalog Interaktif (`⋮` Drawer), Toggle `Publish`/`Draft`, & Penghapusan UI Stok Toko Fisik (Pertahankan Klaim Kode Cetak):**
   - Sampul placeholder `2:3`, klik badan kartu langsung ke editor/detail buku, drawer `⋮` (`Edit`, `Bagikan`, `Hapus`), toggle `Publish | Draft` di `Katalog Terbit`, hapus komponen stok toko fisik namun tetap tampilkan `ClaimCodeDialog` pada buku berbayar.
7. **Fase 7 — Kartu Pembelian Buku Satuan Digital & Halaman Checkout Midtrans Sandbox (`books.$slug.checkout.$purchaseId.tsx`):**
   - Badge harga di kartu katalog + `SinglePurchaseCard` (Rp129.000 / Rp99.000) berdampingan rapi dengan opsi Klaim Kode Cetak + halaman tunggu/konfirmasi QRIS Midtrans Sandbox.
8. **Fase 8 — Verifikasi Akhir:**
   - Jalankan `pnpm check && pnpm format:check && pnpm build` dan `pnpm test:e2e`.
