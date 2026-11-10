# Desain Spesifikasi: Pembaruan Sampul Buku & Penyempurnaan UI/UX Katalog AnzaBook

**Tanggal**: 5 November 2026  
**Status**: Usulan Desain (Menunggu Persetujuan)  
**Terkait**: `apps/web/src/features/books/components/book-cover.tsx`, `apps/web/src/features/books/components/book-catalog-card.tsx`, `apps/web/src/routes/index.tsx`

---

## 1. Latar Belakang & Tujuan (Intent & The Why)

Tampilan katalog buku AnzaBook saat ini masih membawa residu visual yang terasa "transaksional / e-commerce murah" (misal teks `Edisi Rakyat: Rp29.000` di kartu dan angka harga tercetak di sampul buku). Selain itu, badge `FREE`, `+ FISIK`, dan `PREMIUM` tampak kaku dengan border neon yang kurang menyatu dengan gaya estetika human-crafted (anti-slop).

Tujuan dari pembaruan ini adalah:
1. Menghilangkan label harga (`Rp...`) dan frasa `Edisi Rakyat` dari kartu katalog dan sampul buku.
2. Mempertahankan judul section utama tetap: **"Katalog Edisi Rakyat & Pustaka Digital"**.
3. Menyusun ulang komposisi **Sampul Buku (`BookCover`)** agar memiliki sentuhan grafis artistik (motif visual tematik, bukan polos), dengan logo & teks AnzaBook di kanan atas, judul di area tengah, dan nama penulis di bawah tengah.
4. Menyempurnakan **Badge (`FREE`, `PREMIUM`, `FISIK`)** agar tampil bersih (*clean pill*), halus, dan terintegrasi selaras dengan referensi desain editorial modern.
5. Memperkaya bagian bawah kartu katalog dengan metrik membaca yang fungsional dan bermakna (**jumlah pembaca** dan **jumlah share**), mendampingi tautan aksi **"Lihat Buku →"**.

---

## 2. Pendekatan yang Dipertimbangkan (Approaches)

* **Pendekatan 1 (Opsi A - Terpilih)**: *Horizontal Editorial Layout yang Disempurnakan*
  * Mempertahankan struktur kartu horizontal (sampul di kiri, sinopsis dan meta di kanan) agar pembaca dapat membaca sekilas substansi naskah tanpa harus klik.
  * Mengintegrasikan badge kategori, status akses (`FREE`/`PREMIUM`), dan ketersediaan cetak `FISIK` dengan styling soft-pill.
  * Menempatkan metrik sosial/literasi (`👥 ... pembaca` & `↗ ... dibagikan`) di footer kartu menggantikan harga.
  * **Alasan Dipilih**: Pengguna memilih Opsi A dengan penambahan spesifik agar badge `FISIK` tetap dipertahankan dengan desain bersih.

* **Pendekatan 2 (Opsi B)**: *Vertical Book-First Showcase Grid*
  * Mengubah seluruh grid kartu menjadi vertikal seragam seperti galeri buku referensi.
  * **Kelemahan**: Sinopsis buku hilang dari kartu muka sehingga mengurangi kedalaman eksplorasi bacaan bagi pengguna web desktop/tablet.

---

## 3. Spesifikasi Komponen & Tampilan Detail

### A. Komposisi Sampul Buku (`BookCover`)
1. **Header Sampul (Atas Kanan)**:
   * Logo mini monogram AnzaBook + teks tipis font sans/mono `"AnzaBook"`.
   * Di sudut kiri atas tetap dapat menampilkan tahun rilis (`publishedYear`) dengan elegan.
2. **Area Tengah (Seni Visual & Judul)**:
   * **Elemen Visual / Artwork Grafis**: Disediakan grafis vektor tematik (pola geometris Bauhaus, gelombang abstrak minimalis, irisan arsitektur, atau siluet garis) yang berpadu kontras dengan warna dasar sampul (`coverColor`). Tidak ada sampul yang polos membosankan.
   * **Tipografi Judul**: Font serif tebal dengan *tracking* dan *leading* terukur, kontras tinggi, dan mudah dibaca.
3. **Bagian Bawah Sampul**:
   * **Tengah Bawah**: Nama penulis (`author`) dengan tipografi anggun dan penataan *center-aligned*.
   * **Tanpa Harga**: Semua label `Rp...` dihilangkan sepenuhnya dari sampul.
4. **Efek Fisik Buku**:
   * Lipatan jilid (*book crease & spine highlight*) dan bayangan kedalaman dipertahankan agar memberikan tekstur buku cetak nyata.

### B. Header Kartu & Badge Anti-Slop (`BookCatalogCard`)
1. **Baris Atas (Header)**:
   * **Kiri**: Kategori utama naskah (misal: `Ekonomi Buku`, `Filsafat`), tipografi font mono/sans kecil, muted, elegan.
   * **Kanan (Badges)**:
     * Badge Akses: Soft pill `FREE` (warna sage green lembut) atau `PREMIUM` (warna warm amber lembut) tanpa border neon kasar.
     * Badge Format: Soft pill `FISIK` (abu netral/paper tone) jika buku memiliki edisi cetak fisik (`hasPhysical: true`).
     * Ikon Bendera Bahasa: Bendera negara ID / EN ditempatkan proporsional dan tidak berjejalan.

### C. Footer Kartu & Metrik Membaca (`BookCatalogCard`)
1. **Footer Kiri**:
   * Menggantikan teks harga lama dengan metrik pembaca nyata:
     * `👥 [X]k pembaca` (misal: `1.4k dibaca`)
     * `↗ [Y] dibagikan` (misal: `320 share`)
2. **Footer Kanan**:
   * Tombol aksi halus: `Lihat Buku →` dengan hover state warna aksen.

---

## 4. Batasan & Dependensi (Constraints & Non-Goals)

1. **Non-Goals**:
   * Tidak menghapus `hasPhysical` atau opsi pembelian fisik pada halaman detail buku (`books.$slug.tsx`).
   * Tidak mengubah teks judul utama katalog `"Katalog Edisi Rakyat & Pustaka Digital"`.
2. **Keamanan & Performa**:
   * Semua ilustrasi grafis sampul menggunakan CSS murni / inline SVG ringan sehingga tidak membebani network request gambar eksternal dan tetap instan saat SSR.
   * Responsif di layar ponsel (mobile 360px) hingga layar desktop ultra-wide.

---

## 5. Rencana Pengujian & Verifikasi

1. **Visual Regression**: Memastikan tampilan di desktop (1280px) dan mobile (375px) tidak ada teks meluap (*no horizontal overflow*), kontras teks memenuhi WCAG AA.
2. **Lint & Typecheck**: Menjalankan `pnpm check` untuk memastikan seluruh tipe data TypeScript valid tanpa error.
3. **Pengujian Halaman**: Memverifikasi halaman utama (`/`) dan halaman detail buku (`/books/$slug`) agar sampul baru ter-render sempurna di semua konteks.
