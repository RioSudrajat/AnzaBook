# AnzaBook

> Platform digital publishing, reading and community.

AnzaBook adalah ekosistem literasi modern yang menyatukan ruang baca digital, penerbitan naskah mandiri, dan komunitas pembaca dalam satu platform terpadu.

---

## Fitur Utama

- **Digital Publishing & E-Reader Studio**: Platform kurasi naskah terintegrasi dengan e-reader modern, tipografi ramah mata, slide page spread, dan sistem manajemen anotasi/kutipan.
- **Reading Experience**: Pustaka digital terkurasi, rak buku personal, pelacakan sesi baca (*reading progress*), dan pencatatan refleksi baca.
- **Community & Events**: Kalender kegiatan literasi, RSVP acara komunitas buku, dan ruang interaksi pembaca serta penulis.
- **Partner & Publisher Ecosystem**: Akses kolaborasi untuk penerbit mandiri, komunitas independen, dan kurator editorial.

---

## Arsitektur Monorepo

```text
Browser ──cookies + Origin──▶ Express API :4000 ── routes → services → Drizzle → PostgreSQL
   ▲                              ▲
   └── HTML + data ── Web :3000 ──┘ SSR: forwards visitor cookie & X-Request-Id
```

- **`apps/web`**: Web app berbasis [TanStack Start](https://tanstack.com/start) (React 19, Vite, Nitro SSR), TanStack Query, Tailwind CSS v4, shadcn/ui, dan Motion.
- **`apps/api`**: RESTful API berbasis Express 5, Better Auth, Drizzle ORM, pool PostgreSQL, RBAC permissions, dan structured pino logging.
- **`packages/shared`**: Kontrak TypeScript terpadu (skema validasi Zod, permission RBAC, tipe API DTO, dan identitas situs).

---

## Memulai Cepat (Quick Start)

### Prasyarat
1. **Node.js 22.12+**
2. **Docker Desktop** (untuk database PostgreSQL lokal)
3. **pnpm** (`corepack enable` jika belum terpasang)

### Instalasi dan Menjalankan

1. Siapkan environment dan database lokal otomatis:
   ```sh
   pnpm run setup
   ```
2. Jalankan development server:
   ```sh
   pnpm dev
   ```

- **Aplikasi Web**: [http://localhost:3000](http://localhost:3000)
- **API Server**: [http://localhost:4000/api/health](http://localhost:4000/api/health)

> [!NOTE]
> Ketik `pnpm run setup` dan `pnpm run doctor` secara lengkap (jangan singgung `pnpm setup` / `pnpm doctor` karena perintah bawaan pnpm memiliki fungsi berbeda).

---

## Perintah Penting (Commands)

| Perintah | Deskripsi |
| :--- | :--- |
| `pnpm run setup` | Menyiapkan environment `.env.local`, menyalakan database Docker, dan migrasi skema |
| `pnpm dev` | Menjalankan API (`:4000`) dan Web (`:3000`) secara bersamaan |
| `pnpm dev:api` / `pnpm dev:web` | Menjalankan salah satu aplikasi saja |
| `pnpm db:up` / `pnpm db:down` | Menjalankan atau menghentikan container PostgreSQL lokal (data tetap aman) |
| `pnpm db:status` / `pnpm db:logs` | Memeriksa status dan log container database |
| `pnpm db:generate` | Membuat file migrasi SQL baru saat skema diubah |
| `pnpm db:migrate` | Menerapkan migrasi tertunda ke database |
| `pnpm db:studio` | Membuka Drizzle Studio di browser untuk inspeksi visual |
| `pnpm role:set <email> <role>` | Memberikan role akses (misal: `admin`, `author`, `publisher`) |
| `pnpm run doctor` | Memeriksa kompatibilitas node, pnpm, konfigurasi auth, dan koneksi database |
| `pnpm check` | Menjalankan linter, typecheck, dan unit test |

---

## Dokumentasi & Referensi Lanjutan

Untuk panduan mendalam seputar arsitektur teknis dan pengembangan sistem:

- [Arsitektur Sistem](docs/architecture.md) — Alur data, SSR, dan boundary komunikasi.
- [Standar Backend](docs/backend.md) — Konvensi rute Express, validasi Zod, dan Drizzle service.
- [Standar Frontend](docs/frontend.md) — Struktur rute TanStack, hook TanStack Query, dan UI components.
- [Membership & Midtrans](docs/anzabook-membership.md) — Integrasi pembayaran QRIS Midtrans & paket membership.
- [Pengembangan Lokal](docs/local-development.md) — Panduan Docker, port loopback, dan debugging.
- [Starter Technical Reference](docs/starter-reference.md) — Referensi teknis dasar starter monorepo.
- [Agent & AI Guidelines](AGENTS.md) — Alur kerja dan instruksi rekayasa untuk coding assistant.

---

## Lisensi

Didistribusikan di bawah lisensi MIT. Lihat [LICENSE](LICENSE) untuk detail.
