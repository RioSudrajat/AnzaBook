# Rencana Arsitektur & Alur Lengkap: Profil Sosial, Penulis, Komunitas, Penerbit Mitra, Kurasi Naskah, & Agenda (Revisi v5 — Final Terkunci)

**Tanggal:** 9 November 2026  
**Status:** Blueprint Arsitektur Produk & Keamanan Naskah (Keputusan Terkunci)  
**Referensi Utama:**
* [`PRD_AnzaBook.md`](file:///d:/Projekan/AnzaBook/PRD_AnzaBook.md)
* [`2026-11-09-b2b2c-publisher-community-monetization.md`](file:///d:/Projekan/AnzaBook/docs/superpowers/specs/2026-11-09-b2b2c-publisher-community-monetization.md) *(Skema B2B2C Penerbit Mitra A/B/C & Komisi Afiliasi Komunitas 10%)*
* [`2026-11-09-community-events-plan.md`](file:///d:/Projekan/AnzaBook/docs/superpowers/specs/2026-11-09-community-events-plan.md)

---

## 1. Bedah Komparasi Platform Referensi (Medium vs Goodreads vs Substack vs Strava)

Ketika merancang ekosistem **Pembaca + Penulis + Komunitas + Penerbit Mitra** di AnzaBook, kita menggabungkan kekuatan terbaik dari tiap platform referensi dan menyesuaikannya dengan kebutuhan **Hybrid Publisher Aggregator** AnzaBook:

### 1.1 Kenapa di Medium yang Terlihat Hanya "Partner Program" (Harus Member Berbayar)?
1. **Medium Partner Program (Monetisasi Penulis):** Di Medium, siapa pun bisa langsung menulis artikel (*Story*), tetapi untuk menjadi penulis resmi yang mendapat bagi hasil royalti (*Partner Program*), Medium mewajibkan syarat: **(a)** Harus berlangganan *Medium Member* berbayar (\$5/bulan) terlebih dulu, **(b)** Sudah menerbitkan minimal 1 tulisan dalam 6 bulan terakhir, dan **(c)** Tinggal di negara yang didukung Stripe.
2. **Medium Publication (Rumah Redaksi / Majalah):** Di Medium, *Publication* adalah wadah kurasi artikel (seperti majalah/penerbit). Tombol buatnya tersembunyi di `Menu Avatar -> Manage publications -> New publication`, dan **Medium juga mewajibkan akun berbayar (Medium Member)** untuk bisa membuat *Publication* baru demi mencegah spam.
3. **Kenapa AnzaBook Memakai Model Hybrid Aggregator (Bukan Blog Lepas ala Medium)?**
   * Medium menerbitkan artikel lepas tanpa ISBN, tanpa edisi cetak fisik, dan tanpa risiko pembajakan buku cetak di lokapasar.
   * Sedangkan AnzaBook adalah **Hybrid Aggregator ("Mitra Distribusi, Bukan Pesaing")** yang melayani:
     1. **Penulis Independen** (yang mengajukan naskah buku lewat *Studio Pengajuan Naskah* di dalam app),
     2. **Penerbit Mitra B2B2C** (yang membawa katalog buku baru maupun *backlist* mereka dengan pilihan Skema A *Phygital Bundling*, Skema B *Nakama Revenue Pool 55:45*, atau Skema C *Ala Carte 75:25*), dan
     3. **Komunitas Literasi & TBM** (sebagai mesin akuisisi *Zero-CAC* yang mendapat halaman agenda gratis, *auto-unlock* sampel buku bagi peserta RSVP, dan **komisi afiliasi 10% ke Kas Komunitas**).

### 1.2 Peta Adaptasi Best Practice untuk AnzaBook

| Aspek Fitur | Referensi Terbaik | Cara Kerja di Platform Asli | Implementasi Terbaik di AnzaBook |
| :--- | :--- | :--- | :--- |
| **Profil Pembaca & Aktivitas Baca** | **Goodreads + Strava** | Profil user menampilkan bio, buku yang sedang/selesai dibaca, ulasan/rating, kutipan, dan daftar teman/followers. | Tab ke-5 navigasi utama adalah **`Profile`** (`/app?tab=profile` & `/u/$username`). Menampilkan **Bio**, Statistik Baca, Rak *Sedang Dibaca* & *Tamat*, Ulasan/Rating, Kutipan, serta **Followers/Following**. Tombol **`Settings ⚙️`** berada di dalam halaman Profile. |
| **Status Akun Penulis (`Author`)** | **Goodreads Author Program** | Pembaca biasa mengajukan klaim profil penulis via form di dalam aplikasi -> diverifikasi tim internal -> akun mendapat *Badge Author* dan terhubung ke buku-bukunya. | User mengajukan **Upgrade / Klaim Penulis** dari `Profile -> Settings`. Tim internal AnzaBook meng-ACC di `/admin`. Setelah di-ACC, profil user mendapat badge **`Penulis Resmi`**, terhubung ke katalog bukunya (`author_user_id`), bisa di-*Follow*, dan bisa mengajukan naskah atau membuat acara. |
| **Entitas Komunitas (`Community` / TBM)** | **Strava Clubs + Luma Calendar** | Komunitas bukan akun login terpisah, melainkan halaman organisasi yang dibuat oleh akun personal, memiliki Pengurus (*Owner/Admin*) dan Anggota (*Members*) yang klik *Join*. | User mengajukan pembuatan **Komunitas / TBM** via form di app -> di-ACC tim internal di `/admin` -> Halaman `/c/$slug` aktif dengan pemisahan jelas antara **Pengurus** (yang mengelola agenda & melihat **Kas Afiliasi 10%**) dan **Anggota** (user yang klik **Gabung Komunitas**). |
| **Entitas Penerbit Mitra (`Partner Publisher`)** | **Spotify for Artists / Gramedia Mitra** | Rumah penerbit memiliki halaman katalog resmi dan portal manajemen judul, kode klaim cetak, serta laporan royalti. | Penerbit mengajukan akun **Penerbit Mitra** (`/p/$slug`) -> diverifikasi internal -> dapat mendaftarkan judul buku dengan pilihan **Skema A (Phygital Claim Code)**, **Skema B (Nakama Pool 55%)**, atau **Skema C (Ala Carte 75%)**. |
| **Pencarian Jejaring (`Explore`)** | **Goodreads + Substack** | Halaman eksplorasi memisahkan tab pencarian antara Karya, Penulis, Komunitas/Publikasi, dan Pembaca. | Di `Explore` (`/app?tab=explore`), terdapat sub-tab: **`Buku`** (dengan filter Penerbit & Skema Akses), **`Penulis`**, **`Komunitas`**, dan **`Pembaca`** (cari sesama user, lihat buku yang sedang mereka baca & rating mereka, lalu *Follow*). |

---

## 2. Keputusan Terkunci: Studio Pengajuan Naskah di Dalam App & Keamanan Anti-Bocor

> [!IMPORTANT]
> **KEPUTUSAN ARSITEKTUR TERKUNCI:**
> Jangan suruh penulis/penerbit memakai GForm luar, dan **jangan pernah menyimpan file `.pdf` mentah di bucket publik!**
> Kita menyediakan **Studio Pengajuan Naskah di dalam App** (mendukung ketik langsung per bab **ATAU** pilih file `.docx`/`.txt` dari laptop yang langsung di-convert di browser menjadi teks per bab), disimpan aman di PostgreSQL, lalu masuk ke **Editor Internal (`/admin`)** untuk disunting dan diterbitkan oleh tim internal AnzaBook!

### 2.1 Bagaimana Studio Pengajuan Naskah Bekerja dari Hulu ke Hilir
1. **Tahap 1 — Input Naskah oleh Penulis / Penerbit Mitra di Dalam App:**
   * Penulis Resmi (dari tab `Profile -> Karya & Studio Penulis`) atau Pengurus Penerbit Mitra membuka **Studio Pengajuan Naskah**.
   * Mengisi Metadata & Skema Distribusi Buku:
     * Judul Buku, Kategori/Genre, Bahasa, Sinopsis, & Estimasi Halaman.
     * **Pilihan Skema Distribusi & Monetisasi (`DRM-05` & B2B2C):**
       * **Skema A (`print_claim_only` — Phygital Bundling):** Hanya Bab 1 terbuka; Bab 2+ khusus pemilik Kode Klaim Buku Cetak Asli (500 kode pertama gratis, selanjutnya Rp1.500–Rp3.000/kode aktif).
       * **Skema B (`sample_only` — Nakama Revenue Pool):** Masuk langganan Nakama dengan bagi hasil **55% Creator Pool : 45% AnzaBook** proporsional berdasarkan durasi baca valid di `reading_sessions`.
       * **Skema C (`alacarte_only` — Beli Putus Digital):** Dijual satuan per judul (misal Rp45.000) dengan bagi hasil **75% Penerbit : 25% AnzaBook**.
       * **Akses Terbuka (`free_open`):** Untuk buletin mingguan atau karya domain publik.
     * **Simulasi Ekonomi Cetak Rakyat:** Terintegrasi dengan [`calculatePrintEconomics`](file:///d:/Projekan/AnzaBook/apps/api/src/routes/publisher.routes.ts#L8-L12).
   * **Input Isi Bab (2 Metode Aman Tanpa Upload File Mentah ke Bucket Publik):**
     * **Metode 1 (Ketik / Tempel per Bab):** Editor bab terstruktur di dalam aplikasi.
     * **Metode 2 (Client-Side `.docx` / `.txt` Extractor):** Penulis memilih file `.docx` atau `.txt` dari laptopnya -> browser mengekstrak teks dan memecahnya otomatis menjadi Bab 1, Bab 2, dst. secara lokal di memori browser -> mengirim teks bersih terstruktur ke PostgreSQL (`manuscript_submissions` & `manuscript_chapters`). Tidak ada satu pun file `.pdf` atau `.docx` utuh yang tersimpan di *storage bucket* publik!
2. **Tahap 2 — Kurasi, Penyuntingan, & Penerbitan di Editor Internal (`/admin`):**
   * Tim redaksi internal AnzaBook membuka tab **`Editor & Kurasi Naskah Masuk`** di `/admin`.
   * Menyunting paragraf (`content_id`, `content_en`, `blueprint_content`), mengatur sampul, memilih skema distribusi final, dan menekan tombol **`Terbitkan ke Katalog`** (serta men-generate batch kode klaim fisik jika menggunakan Skema A).

---

## 3. Arsitektur Identitas Sosial: Pembaca, Penulis, Komunitas, & Penerbit Mitra

### 3.1 Perubahan Tabel `user` (Menambahkan `bio` & Status Penulis)
Kita memperluas tabel [`user`](file:///d:/Projekan/AnzaBook/apps/api/src/db/schema/user.ts#L3-L26) agar setiap pengguna memiliki identitas sosial yang utuh:
* `bio` (`text`, default `""`, maks 300 karakter) — ditampilkan di halaman `Profile` dan kartu direktori `Explore > Pembaca / Penulis`.
* `location_city` (`varchar(80)`, opsional) — kota domisili pembaca/penulis (untuk rekomendasi komunitas & acara terdekat).
* `website_url` / `social_links` (`jsonb`, opsional) — tautan media sosial.
* `author_status` (`"none"` | `"pending"` | `"verified"` | `"rejected"`, default `"none"`) — status verifikasi sebagai Penulis Resmi.
* `author_pen_name` (`varchar(160)`, opsional) — nama pena yang terhubung ke buku di katalog (`books.author_user_id`).

### 3.2 Tabel Relasi Sosial, Komunitas, Penerbit Mitra, & Kas Afiliasi
1. **`user_follows` (Jejaring Follow User ↔ User & User → Penulis):**
   * `id` (uuid, PK), `follower_user_id`, `following_user_id`, `is_subscribed_updates` (boolean), `created_at`.
2. **Pemisahan Jelas di Komunitas (`community_calendars` + `community_calendar_members` + `community_wallet_ledgers`):**
   * **`community_calendars` (Profil Organisasi Komunitas / TBM):**
     * Memiliki status `verification_status`: `"pending"` -> `"verified"` -> `"rejected"`.
     * Hanya komunitas berstatus `verified`/`trusted` yang muncul di direktori publik `Explore > Komunitas` dan bisa menerbitkan acara publik di `Agenda`.
   * **`community_calendar_members` (Pengurus Inti vs Anggota Komunitas):**
     * `role`: `"owner"` (Pendiri), `"admin"` (Pengurus/panitia), `"checkin_staff"` (Relawan meja registrasi), dan `"member"` (Pembaca yang klik **"Gabung Komunitas"**).
   * **`community_wallet_ledgers` (Kas Komunitas & Komisi Afiliasi 10%):**
     * Mencatat pemasukan komisi afiliasi **10%** setiap kali peserta acara bedah buku atau pengunjung link afiliasi komunitas (`?ref=cal_<slug>`) membeli buku *Ala Carte* atau berlangganan *Nakama*, ditambah pendapatan bersih dari acara berbayar (*Creator Stage* dengan potongan *ticketing fee* 5%–10%).
3. **Entitas Penerbit Mitra (`publishers` + `publisher_members` + `book_claim_batches` + `book_purchases`):**
   * Mewadahi penerbit eksternal yang bekerja sama dengan AnzaBook menggunakan Skema A (*Phygital Bundling*), Skema B (*Nakama Revenue Pool 55:45*), atau Skema C (*Ala Carte 75:25*) sebagaimana dirinci pada [`2026-11-09-b2b2c-publisher-community-monetization.md`](file:///d:/Projekan/AnzaBook/docs/superpowers/specs/2026-11-09-b2b2c-publisher-community-monetization.md).
4. **`author_applications` & `manuscript_submissions`:**
   * Menyimpan pengajuan verifikasi penulis dan draf naskah per bab di PostgreSQL untuk ditinjau di `/admin`.

---

## 4. Alur Lengkap (End-to-End Flow) di Aplikasi

### 4.1 Navigasi Utama: `Profile` Menggantikan `Settings`
1. **5 Menu Utama di Sidebar ([`app-sidebar.tsx`](file:///d:/Projekan/AnzaBook/apps/web/src/features/dashboard/components/app-sidebar.tsx)) & Mobile Bottom Bar ([`app.tsx`](file:///d:/Projekan/AnzaBook/apps/web/src/routes/_protected/app.tsx)):**
   * `Home` · `Explore` · `Agenda` · `Library` · **`Profile`**
2. **Halaman `Profile` (`/app?tab=profile` & rute publik `/u/$username`):**
   * **Header Profil:** Avatar, Nama, `@username`, Kota, **Bio**, Badge (`Nakama`, `Penulis Resmi ✓`, `Pengurus/Anggota Komunitas`, `Tim Penerbit Mitra`), serta penghitung `Followers` · `Following` · `Buku Tamat` · `Sesi Baca`.
   * **Tombol Aksi Kanan Atas:**
     * Profil sendiri: **`Edit Profil`** & **`Pengaturan (Settings) ⚙️`**.
     * Profil orang lain (`/u/$username`): **`Ikuti (Follow)`** + toggle **`Langganan Update 🔔`**.
   * **4 Sub-Tab Profil:**
     1. **`Aktivitas & Bacaan`:** Buku *Sedang Dibaca*, *Selesai Dibaca*, dan riwayat sesi baca.
     2. **`Ulasan & Kutipan`:** Rating bintang, ulasan buku, dan *highlight*/komentar marjinalia.
     3. **`Komunitas & Agenda`:** Komunitas yang diikuti dan agenda acara.
     4. **`Studio Penulis & Penerbit`** *(Tampil jika terverifikasi sebagai Penulis atau Pengurus Penerbit Mitra)*: Daftar buku yang diterbitkan, ringkasan pembaca/royalti, generator kode klaim fisik (Skema A), dan tombol **`+ Ajukan Naskah Buku Baru`**.
3. **Panel `Settings` di Dalam `Profile`:**
   * Berisi tab `Akun & Bio`, `Status Penulis, Komunitas & Penerbit`, `Hadiah Voucher`, `Preferensi Baca`, `Notifikasi`, dan `Riwayat Iuran`.
   * Di sub-tab **`Status Penulis, Komunitas & Penerbit`**, pengguna dapat mengajukan:
     1. **Verifikasi Akun Penulis Resmi**
     2. **Pendaftaran Komunitas Literasi / TBM Baru**
     3. **Kemitraan Penerbit Buku (B2B2C)**

---

### 4.2 Halaman Komunitas (`/c/$slug`): Pengurus, Anggota, & Kas Afiliasi 10%
* **Header Komunitas:** Logo, Nama, Badge `Terverifikasi ✓`, Kota, Deskripsi, tombol **`Gabung Komunitas`**, tombol **`Langganan Agenda 🔔`**, dan tombol **`Bagikan Link Afiliasi Komunitas`**.
* **Tab di Halaman Komunitas:**
  1. **`Agenda Acara`:** Acara mendatang & arsip acara (peserta yang RSVP acara bedah buku otomatis mendapat akses sampel buku yang dibedah).
  2. **`Pengurus & Anggota`:** Memisahkan dengan tegas daftar **Pengurus Inti (`Owner` & `Admin`)** di bagian atas dan **Anggota Komunitas (`Members`)** beserta aktivitas baca mereka di bagian bawah.
  3. **`Kelola & Kas Komunitas`** *(Khusus Owner/Admin)*:
     * Kelola anggota & pengurus, buat acara baru (Gratis atau Berbayar *Creator Stage*).
     * **Panel Kas & Komisi Afiliasi (10%):** Menampilkan total saldo kas komunitas dari komisi afiliasi 10% pembelian buku/Nakama oleh peserta acara, riwayat mutasi kas transparan, dan tautan afiliasi khusus komunitas (`?ref=cal_<slug>`).

---

## 5. Perbaikan Wajib pada Fitur Acara (Hasil Audit Sebelumnya)
1. **Sinkronisasi API `getLocationSuggestions`** agar lokasi terbaru & toko mitra muncul kembali di popover lokasi, ditambah input URL rapat online.
2. **Filter `visibility = "public"`** pada `listEvents` dan pengecekan `calendar.verificationStatus === "verified"` pada `createEvent`.
3. **Tampilkan Tiket Check-in (`CHK-XXXXXX` + QR), Link Rapat Online, & `logisticsNotes`** di `EventDetailDrawer` dan `/events/$slug` bagi peserta berstatus `going`.
4. **Pemilih Buku Katalog AnzaBook (`bookId`)** di form Buat/Edit Acara + **Auto-Unlock Sampel Buku** bagi peserta yang RSVP acara bedah buku tersebut.
5. **Peta Tile Asli & Tema Acara (`themePreset`)** di tampilan detail acara, serta penghapusan tombol mati Stripe.
