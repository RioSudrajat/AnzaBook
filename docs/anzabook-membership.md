# Menjalankan keanggotaan Nakama

## QRIS Midtrans sandbox

1. Buat akun Midtrans Sandbox dan aktifkan **Other QRIS** pada Snap.
2. Tambahkan `MIDTRANS_ENV=sandbox` dan `MIDTRANS_SERVER_KEY` pada `.env.local`. Server key tetap di API.
3. Daftarkan alamat HTTPS API yang dapat dijangkau Midtrans, diikuti `/api/membership/webhooks/midtrans`, sebagai **Payment Notification URL**. Untuk percobaan lokal, layar status checkout juga dapat meminta API memeriksa pembayaran langsung ke Midtrans.
4. Jalankan `pnpm dev:prepare`, lalu `pnpm dev`. Buka halaman Nakama, pilih paket, dan selesaikan QRIS dalam sandbox. Status order mengikuti konfirmasi server Midtrans dan aplikasi mengaktifkan akun tujuan setelah nominal, metode, serta status pembayaran cocok.

[Panduan integrasi Snap](https://docs.midtrans.com/docs/snap-snap-integration-guide) · [Simulasi QRIS](https://docs.midtrans.com/docs/qris)

## Pajak pada harga paket

Harga paket adalah subtotal sebelum pajak. API menghitung pajak dari subtotal dan membulatkannya ke rupiah terdekat, lalu menyimpan rinciannya per pesanan. Total yang terlihat di checkout sama dengan nominal yang dikirim ke Midtrans. Sandbox memakai `MEMBERSHIP_TAX_RATE_BPS=1100` sebagai contoh pengujian. Paket Rp60.000 ditambah pajak Rp6.600 menghasilkan total Rp66.600.

Sebelum menyalakan pembayaran live, tetapkan tarif efektif yang berlaku untuk bisnis dan produk. Konfigurasi live membutuhkan `MEMBERSHIP_TAX_RATE_BPS` eksplisit, termasuk `0` bila sesuai. Rincian pesanan lama tetap memakai tarif saat pesanan dibuat. [Referensi item dan total Snap](https://docs.midtrans.com/reference/json-objects)

## Login Google dan pengingat Gmail

Untuk login, atur `GOOGLE_CLIENT_ID` dan `GOOGLE_CLIENT_SECRET` dari aplikasi OAuth Google. Daftarkan URL API yang diikuti `/api/auth/callback/google` sebagai **Authorized redirect URI**. Pada konfigurasi lokal bawaan, URL-nya `http://localhost:4000/api/auth/callback/google`. [Better Auth Google](https://better-auth.com/docs/authentication/google)

Untuk pengingat, gunakan kotak surat Gmail atau Google Workspace yang akan menjadi pengirim. Aktifkan Gmail API pada proyek Google dan siapkan OAuth refresh token dengan izin `https://www.googleapis.com/auth/gmail.send`. Simpan `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN` dan `GMAIL_FROM` hanya di lingkungan API. [Otorisasi Gmail API](https://developers.google.com/workspace/gmail/api/auth/web-server) · [Pengiriman Gmail API](https://developers.google.com/workspace/gmail/api/guides/sending)

API memproses antrean sekitar sekali per menit selama layanan berjalan. Pengingat dijadwalkan tujuh hari sebelum akses berakhir dan saat akses berakhir. Akun tujuan memerlukan email terverifikasi dan preferensi pengingat aktif. Perpanjangan membatalkan pengingat untuk periode lama.

Akun yang dibuat dengan email dan kata sandi bisa mengirim tautan verifikasi dari **Pengaturan → Akun** setelah Gmail API dikonfigurasi. Login Google menggunakan status verifikasi dari Google.

## Klaim edisi cetak

Kode klaim dari seed hanya berlaku di lingkungan pengembangan dan pengujian. Migrasi menandai kode demo lama, sehingga API produksi hanya menerima kode dari penerbit yang tidak ditandai sebagai demo.
