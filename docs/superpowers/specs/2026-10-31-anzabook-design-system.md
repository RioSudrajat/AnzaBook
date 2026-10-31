# AnzaBook Design System Specification
**Date:** 2026-10-31  
**Theme Foundation:** Hallmark `Furrow` (Adapted for Literary E-Reader)  
**Architecture:** Opsi 1 — Dual-Zone Literary System (`Literata` + `Plus Jakarta Sans` + `Red Hat Mono`)  
**Component Primitive Standard:** `shadcn/ui` + Tailwind CSS  

---

## 1. Intent & Why

**AnzaBook** adalah aplikasi e-reader yang mengutamakan kenyamanan mata untuk membaca durasi panjang sekaligus kerapian pencatatan progres bacaan.

Mayoritas aplikasi baca buku jatuh ke dua ekstrem yang buruk: terlalu steril seperti *template* SaaS (putih menyilaukan `#FFFFFF`, kartu mengambang dengan *shadow* tebal, font *sans-serif* generik) atau terlalu kuno dengan tekstur kertas palsu yang berlebihan.

Design System AnzaBook menggabungkan:
1. **Materialitas Hallmark Furrow**: Kertas manila hangat (`oklch(96% 0.011 85)`), tinta mendekati hitam (`oklch(18% 0.006 60)`), garis pembatas presisi (*ruled hairlines*), tombol bertekstur cetak (*moulded keys* `6px`), dan satu aksen *tangerine* (`oklch(70% 0.19 40)`) yang berfungsi layaknya pita pembatas buku (*bookmark ribbon*) atau stabilo penanda penting.
2. **Dual-Zone Literary Typography**: Memisahkan secara tegas area **UI Chrome** (navigasi, rak buku, TOC, pengaturan berbasis **shadcn/ui** menggunakan *sans-serif* yang tajam di ukuran kecil) dan **Reading Canvas** (isi buku menggunakan *variable serif* khusus layar digital).

---

## 2. Goals, Non-Goals & Anti-Goals

### Goals
- Menetapkan *Single Source of Truth* untuk seluruh token CSS (`tokens.css` & `DESIGN.md`) berbasis ruang warna **OKLCH**.
- Menyediakan *semantic mapping* yang bersih antara token Hallmark Furrow dan variabel **shadcn/ui** tanpa benturan penamaan (`--accent` dan `--muted`).
- Mendefinisikan aturan baku untuk **Typography**, **Spacing**, **Border Radius**, **Surface Ladder**, **Elevation**, dan **Reading Ergonomics** (termasuk mode baca Siang/Manila, Sepia, dan Malam).
- Memenuhi standar aksesibilitas **WCAG AA/AAA** (kontras minimal 4.5:1 untuk teks UI, >10:1 untuk teks bacaan, dan target sentuh minimal `44x44px`).

### Non-Goals
- Tidak menggunakan generator peta kanvas (*survey map contours*) dari tema asli Furrow, karena fitur tersebut spesifik untuk aplikasi pemetaan lahan/agrikultur dan tidak relevan untuk e-reader.
- Tidak merancang skema *database* atau arsitektur *backend* di dalam dokumen ini.

### Anti-Goals (Hard Bans — Anti-Slop & Hallmark Floor)
- **DILARANG** menggunakan gradien biru-ke-ungu, *neon glow*, atau *blurred orbs* di latar belakang.
- **DILARANG** menggunakan teks putih di atas warna aksen *tangerine* (`--color-accent`); wajib menggunakan tinta gelap (`--color-accent-ink: oklch(18% 0.006 60)`).
- **DILARANG** membuat semua elemen berbentuk kapsul penuh (`border-radius: 9999px`) untuk tombol, input, dan kartu sekaligus.
- **DILARANG** membuat kartu di dalam kartu (*nested bordered/shadowed cards*).
- **DILARANG** menggunakan label *eyebrow* huruf kapital renggang (`UPPERCASE` dengan `letter-spacing` lebar) di atas judul.
- **DILARANG** menganimasikan properti *layout* (`width`, `height`, `top`, `left`) atau menggunakan `transition: all`.

---

## 3. Approaches Considered

1. **Opsi 1: Dual-Zone Literary System (Dipilih)**
   - **Konsep**: `Literata` untuk Reading Canvas & Display Headings, `Plus Jakarta Sans` untuk UI Chrome/shadcn, dan `Red Hat Mono` untuk angka halaman/progres (`tabular-nums`).
   - **Alasan Dipilih**: Memberikan pemisahan kognitif terbaik antara "kontrol aplikasi" dan "isi buku", menjaga keterbacaan komponen shadcn di ukuran `13px–14px`, sekaligus memberi kenyamanan mata maksimal saat membaca bab panjang.
2. **Opsi 2: Classic Press & Index (`Newsreader` + `IBM Plex Sans`)**
   - **Trade-off**: Sangat bernuansa jurnal cetak, namun kontras garis tipis-tebal pada `Newsreader` kurang ramah untuk layar beresolusi rendah pada durasi baca berjam-jam.
3. **Opsi 3: Furrow Native UI (`Red Hat Display/Text` + Reader Override)**
   - **Trade-off**: Halaman perpustakaan dan katalog terasa terlalu teknis seperti aplikasi *logbook* lapangan, kurang merepresentasikan kehangatan aplikasi buku.

---

## 4. Color System (OKLCH Token Architecture)

Semua warna didefinisikan dalam ruang warna **OKLCH** agar persepsi kecerahan (*lightness*) konsisten di seluruh permukaan.

### 4.1 Core Palette — Mode Utama: Furrow Manila (Day)

| Token | Nilai OKLCH | Perkiraan Hex | Peran & Penggunaan |
| :--- | :--- | :--- | :--- |
| `--color-paper` | `oklch(96% 0.011 85)` | `#F6F2E9` | Latar belakang utama aplikasi & kanvas baca default (Manila hangat) |
| `--color-paper-2` | `oklch(99.5% 0.005 85)` | `#FEFDFB` | Permukaan halaman aktif, kartu buku (`Card`), `Popover`, `Dialog`, `Sheet` |
| `--color-paper-3` | `oklch(92% 0.016 85)` | `#EAE3D5` | Permukaan *recessed well*, `hover` pada menu/baris, *secondary button*, *skeleton* |
| `--color-sheet` | `oklch(99.3% 0.004 85)` | `#FDFCFA` | Kilau tepi atas (*inset highlight*) pada tombol *moulded key* & lembaran catatan |
| `--color-ink` | `oklch(18% 0.006 60)` | `#13110F` | Teks utama buku, judul (`h1`–`h4`), ikon aktif, dan garis pembatas utama |
| `--color-ink-2` | `oklch(28% 0.008 60)` | `#2B2825` | Subjudul, teks isi komponen UI sekunder, label navigasi |
| `--color-muted` | `oklch(44% 0.012 60)` | `#56514B` | Meta informasi, nama penulis di kartu kecil, *placeholder*, nomor halaman |
| `--color-rule` | `oklch(88% 0.013 85)` | `#DDD6C7` | Garis pemisah tipis (`1px hairline`) antar baris, border kartu & input |
| `--color-grid` | `oklch(90% 0.014 85)` | `#E3DDD0` | Grid tipis (`8px`) khusus pada komponen kartu catatan (*Notebook Annotation Card*) |

### 4.2 Accent & Semantic Signals

| Token | Nilai OKLCH | Perkiraan Hex | Peran & Penggunaan |
| :--- | :--- | :--- | :--- |
| `--color-accent` | `oklch(70% 0.19 40)` | `#F06A24` | **Furrow Tangerine**: Tombol CTA utama, pita bookmark aktif, indikator tab terpilih |
| `--color-accent-ink` | `oklch(18% 0.006 60)` | `#13110F` | Warna teks/ikon di atas `--color-accent` (**Wajib gelap, kontras 8.4:1**) |
| `--color-accent-soft` | `oklch(91% 0.05 50)` | `#F9E3D4` | Stabilo/*highlight* teks di dalam buku (warna default), latar *chip* aktif |
| `--color-focus` | `oklch(60% 0.19 40)` | `#D1510A` | Cincin fokus keyboard (`:focus-visible` outline `2px solid`) |
| `--color-green` | `oklch(48% 0.11 150)` | `#2E6F48` | Status buku "Selesai Dibaca", sinkronisasi berhasil, *highlight* warna hijau |
| `--color-green-soft` | `oklch(92% 0.04 150)` | `#DCECE1` | Latar *badge* status selesai / *highlight* teks hijau di reader |
| `--color-water` | `oklch(60% 0.05 232)` | `#688296` | Aksen catatan kaki (*footnote*), referensi kamus, *highlight* teks biru-abu |
| `--color-water-soft` | `oklch(92% 0.025 232)` | `#E1E9EE` | Latar *highlight* teks biru-abu di dalam reader |
| `--color-error` | `oklch(52% 0.18 25)` | `#B83227` | Aksi hapus (*destructive*), pesan gagal muat file EPUB/PDF |
| `--color-error-soft` | `oklch(92% 0.04 25)` | `#F7E1DE` | Latar pesan *alert error* |

### 4.3 E-Reader Environment Modes (Sepia & Night)

Sebagai aplikasi e-reader, AnzaBook mendukung pergantian suasana layar baca tanpa merusak kehangatan palet Furrow:

```css
/* Mode Baca 2: Furrow Deep Sepia (Sore / Redup) */
[data-theme="sepia"] {
  --color-paper: oklch(91% 0.022 80);
  --color-paper-2: oklch(94% 0.016 80);
  --color-paper-3: oklch(87% 0.026 80);
  --color-ink: oklch(20% 0.010 55);
  --color-ink-2: oklch(30% 0.012 55);
  --color-muted: oklch(44% 0.015 55);
  --color-rule: oklch(83% 0.022 80);
}

/* Mode Baca 3: Furrow Warm Night (Gelap / Malam — Bukan Hitam Pekat #000) */
.dark, [data-theme="night"] {
  --color-paper: oklch(16% 0.008 65);
  --color-paper-2: oklch(20% 0.010 65);
  --color-paper-3: oklch(24% 0.012 65);
  --color-sheet: oklch(26% 0.012 65);
  --color-ink: oklch(90% 0.010 85);
  --color-ink-2: oklch(78% 0.010 85);
  --color-muted: oklch(64% 0.012 75);
  --color-rule: oklch(28% 0.012 65);
  --color-grid: oklch(23% 0.010 65);
  --color-accent: oklch(72% 0.18 42);
  --color-accent-ink: oklch(16% 0.008 65);
  --color-accent-soft: oklch(28% 0.06 42);
  --color-focus: oklch(72% 0.18 42);
  --color-green: oklch(68% 0.12 150);
  --color-green-soft: oklch(25% 0.05 150);
  --color-water: oklch(70% 0.06 232);
  --color-water-soft: oklch(25% 0.03 232);
  --color-error: oklch(68% 0.17 25);
  --color-error-soft: oklch(26% 0.06 25);
}
```

> **Best Practice Proporsi Warna (5% Accent Rule):**  
> Warna `--color-accent` (Tangerine) adalah sinyal, bukan cat tembok. Penggunaannya dibatasi maksimal **5% dari luas layar** pada satu waktu: hanya untuk 1 tombol CTA utama per layar, pita penanda halaman aktif, cincin fokus, dan *progress bar* buku yang sedang dibuka.

---

## 5. Typography System (Dual-Zone Literary Architecture)

### 5.1 Font Stack & Peran

```css
:root {
  /* 1. Editorial Display & Primary Book Reading Face */
  --font-display: "Literata", Georgia, ui-serif, serif;
  --font-reader: var(--font-display);

  /* 2. UI Chrome, Navigation & shadcn/ui Controls */
  --font-body: "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif;

  /* 3. Outlier: Tabular Figures, Page Counts, Reading Timers, ISBN */
  --font-outlier: "Red Hat Mono", ui-monospace, monospace;

  /* Optional Reader Canvas Alternates (diakses lewat menu 'Aa' Reader) */
  --font-reader-sans: "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif;
  --font-reader-accessible: "Atkinson Hyperlegible", ui-sans-serif, system-ui, sans-serif;
}
```

**Google Fonts Import:**
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&family=Literata:ital,opsz,wght@0,7..72,400..600;1,7..72,400&family=Plus+Jakarta+Sans:wght@400;500;600&family=Red+Hat+Mono:wght@400;500&display=swap" rel="stylesheet">
```

### 5.2 Disiplin Bobot Font (Weight Cap)
Sesuai aturan Hallmark `craft.md` (F19), seluruh aplikasi hanya menggunakan **maksimal 3 bobot font**:
- `400` (Regular): Teks isi buku, deskripsi, paragraf UI.
- `500` (Medium): Label tombol shadcn, item navigasi, *tab*, judul baris tabel, angka metrik mono.
- `600` (SemiBold): Judul halaman (`h1`–`h3`), judul buku, *wordmark*. *(Jangan gunakan `700`/`800`/`900` agar nuansa sastra tetap halus dan tidak berteriak).*

### 5.3 Skala Tipografi UI & Editorial (App Scale)

| Token | Ukuran (`rem` / `px`) | Line Height | Tracking | Font Family & Weight | Penggunaan |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `--text-display` | `clamp(2.25rem, 4vw, 3.25rem)` (36–52px) | `1.08` | `-0.025em` | `--font-display` (`600`) | Judul Hero / Judul Buku pada Halaman Detail |
| `--text-section` (`h1`/`h2`) | `clamp(1.5rem, 2.5vw, 2rem)` (24–32px) | `1.15` | `-0.02em` | `--font-display` (`600`) | Judul Bagian Rak Buku & Judul Bab (`Chapter Title`) |
| `--text-title` (`h3`) | `1.25rem` (20px) | `1.3` | `-0.01em` | `--font-display` (`600`) | Judul Kartu Buku Unggulan / Judul Dialog |
| `--text-lg` | `1.125rem` (18px) | `1.55` | `0` | `--font-body` (`500`) | Subjudul bagian / *Lead paragraph* |
| `--text-base` | `1rem` (16px) | `1.55` | `0` | `--font-body` (`400`) | Teks UI standar, input *form* (mencegah *auto-zoom* iOS) |
| `--text-sm` | `0.875rem` (14px) | `1.45` | `0` | `--font-body` (`400`/`500`) | Komponen utama **shadcn/ui** (Button, Dropdown, Sheet, Table) |
| `--text-xs` | `0.75rem` (12px) | `1.4` | `0` | `--font-body` (`500`) / `--font-outlier` | Label di dalam *input field*, waktu, halaman (`Hal. 42`), tag status |

### 5.4 Standar Ergonomi Reading Canvas (E-Reader Prose Rules)
Area baca buku (`.reader-prose`) memiliki token khusus yang terpisah dari ukuran UI Chrome agar user bisa mengatur kenyamanan baca:
- **Ukuran Default Baca (`--reader-font-size`)**: `1.125rem` (`18px`) di desktop/tablet, `1.0625rem` (`17px`) di mobile — dapat diubah user dalam 5 langkah (`15px`, `17px`, `18px`, `20px`, `24px`).
- **Jarak Antarbaris (`--reader-line-height`)**: `1.7` (ideal untuk teks sastra panjang; opsi user: `1.5` Rapat, `1.7` Normal, `1.9` Lega).
- **Lebar Baris Ideal (`--reader-measure`)**: **`62ch`** (rentang aman `55ch–70ch`). Jangan pernah membiarkan teks buku melebar `100%` di layar monitor lebar karena mata akan lelah mencari awal baris berikutnya.
- **Ritme Paragraf**:
  - Mode Modern (Default): `margin-bottom: 1.25em`, tanpa indentasi baris pertama.
  - Mode Buku Cetak (Opsional): `text-indent: 1.5em` pada `p + p`, dengan `margin-bottom: 0.25em`.
- **Optical & Micro-Typography**:
  - `font-optical-sizing: auto` (membuat `Literata` menyesuaikan ketebalan huruf secara otomatis).
  - `font-variant-numeric: oldstyle-nums proportional-nums` di dalam paragraf cerita (sehingga angka tahun seperti *1984* menyatu indah dengan huruf kecil), sedangkan nomor halaman di *footer* memakai `--font-outlier` dengan `tabular-nums`.
  - `text-wrap: pretty` pada seluruh paragraf `<p>` untuk mencegah satu kata yatim (*orphan word*) di akhir paragraf, dan `text-wrap: balance` pada judul bab.

---

## 6. Spacing, Layout Grid & Surface Ladder

### 6.1 Skala Spasi (4px/8px Base Unit)
Mengikuti tangga spasi Hallmark yang kompatibel langsung dengan *utility class* Tailwind CSS:

```css
:root {
  --space-3xs: 0.125rem; /* 2px  - Hairline offset / micro gap */
  --space-2xs: 0.25rem;  /* 4px  - Icon-to-badge gap (p-1 / gap-1) */
  --space-xs:  0.5rem;   /* 8px  - Button icon gap, compact list gap (p-2 / gap-2) */
  --space-sm:  0.75rem;  /* 12px - Control vertical padding, chip group (p-3 / gap-3) */
  --space-md:  1rem;     /* 16px - Mobile gutter, standard card padding (p-4 / gap-4) */
  --space-lg:  1.5rem;   /* 24px - Desktop card padding, grid column gap (p-6 / gap-6) */
  --space-xl:  2.5rem;   /* 40px - Group separation, reader top/bottom margin (p-10) */
  --space-2xl: 4rem;     /* 64px - Major section spacing (p-16) */
  --space-3xl: 6rem;     /* 96px - Page-level breathing room (p-24) */
  --space-4xl: 9rem;     /* 144px - Marketing/Hero section gap (p-36) */
}
```

### 6.2 Container, Gutter & Viewport Rules
- **Overflow Guard**: `html, body { overflow-x: clip; }` (jangan gunakan `overflow-x: hidden` karena merusak `position: sticky` pada *header* bab).
- **Library / App Container (`--container-app`)**: Maksimal `1280px` (`80rem`), terpusat dengan *fluid gutter* `clamp(1rem, 4vw, 3rem)`. Pada layar `1920px`, margin kiri-kanan membesar sementara lebar grid tetap `1280px`.
- **Reader Canvas Container (`--container-reader`)**: Maksimal `65ch` (`~680px`) untuk mode 1 kolom, atau `1120px` untuk mode 2 kolom (*two-page spread* seperti buku terbuka di layar desktop `>1280px` dengan garis lipatan tengah `1px solid var(--color-rule)`).

### 6.3 The Furrow Surface Ladder (Hierarki Permukaan Tanpa Slop)
Alih-alih membungkus setiap elemen dalam *card* putih berbayangan, AnzaBook menggunakan **4 anak tangga permukaan**:
1. **Tangga 1 — Kertas Dasar (`--color-paper`)**: Kanvas utama tempat teks buku dan daftar rak buku berada.
2. **Tangga 2 — Garis Tinta & Hairline (`--rule-hair: 1px`)**: Pemisah bagian memakai garis atas tegas `1px solid var(--color-ink)`, sedangkan pemisah antar-item daftar buku/bab memakai `1px solid var(--color-rule)`.
3. **Tangga 3 — Recessed Well (`--color-paper-3`, tanpa border)**: Untuk kolom pencarian pasif, latar belakang *segmented control* (`TabsList`), atau bar progres baca.
4. **Tangga 4 — Lembaran Angkat / Notebook Card (`--color-paper-2`)**: Hanya dipakai untuk elemen yang benar-benar independen atau mengambang di atas halaman (Kartu Buku yang sedang dibaca, Kartu Catatan/Kutipan dengan latar grid `8px`, `Popover` pengaturan `Aa`, dan `Dialog`).

---

## 7. Border Radius, Borders & Elevation

### 7.1 Skala Radius (Concentric & Tactile)
Tidak ada elemen kapsul penuh (`9999px`) kecuali titik indikator bulat murni. Setiap tingkat komponen memiliki radius spesifik:

```css
:root {
  --radius-xs:    4px;  /* Highlight teks di dalam paragraf, <kbd>, tag status kecil */
  --radius-pill:  6px;  /* Standar Furrow untuk semua Button, Input, Select, TabsTrigger */
  --radius-card:  10px; /* Kartu buku, DropdownMenu, Popover, Toast */
  --radius-entry: 14px; /* Lembaran catatan (Notebook Card), Dialog, Bottom Sheet */
  
  /* Signature AnzaBook: Asymmetric Book Cover Radius (punggung buku kiri tajam, tepi kanan halus) */
  --radius-book:  3px 8px 8px 3px;
}
```
- **Aturan Konsentris**: Jika kartu luar memiliki radius `14px` (`--radius-entry`) dan *padding* `8px`, maka elemen di sudut dalamnya wajib memakai radius `6px` (`14px - 8px = 6px`).

### 7.2 Elevation & Shadows (Tactile Over Floating)
Sebagian besar elemen duduk rata di atas kertas dengan batas `1px solid var(--color-rule)`. Bayangan hanya diizinkan pada 2 level:

```css
:root {
  /* Level 1: Kartu utama atau sampul buku fisik */
  --shadow-card: 
    0 1px 2px oklch(18% 0.006 60 / 0.08), 
    0 14px 28px -16px oklch(18% 0.006 60 / 0.24);

  /* Level 2: Popover 'Aa', Command Palette, Dialog, atau Notebook Card yang sedang dibuka */
  --shadow-lift: 
    0 1px 1px oklch(18% 0.006 60 / 0.10), 
    0 2px 4px -1px oklch(18% 0.006 60 / 0.10), 
    0 24px 44px -20px oklch(18% 0.006 60 / 0.38);

  /* Z-Index Scale (8 Tingkat Baku) */
  --z-base: 1;
  --z-raised: 10;
  --z-dropdown: 100;
  --z-sticky: 200;
  --z-sticky-nav: 300;
  --z-modal: 400;
  --z-toast: 500;
  --z-tooltip: 600;
}
```

---

## 8. Standar Komponen `shadcn/ui` & Jembatan Token

### 8.1 Jembatan Variabel CSS (`shadcn/ui` <-> Hallmark Furrow)
Di Hallmark, `--color-accent` adalah warna sinyal utama (*tangerine*) dan `--color-muted` adalah warna teks redup. Di `shadcn/ui`, `--accent` adalah warna *background hover* untuk menu/item dropdown, dan `--muted` adalah *background surface* redup. Jembatan di bawah ini mencegah benturan tersebut:

```css
:root {
  /* Pemetaan Inti shadcn/ui */
  --background: var(--color-paper);
  --foreground: var(--color-ink);

  --card: var(--color-paper-2);
  --card-foreground: var(--color-ink);

  --popover: var(--color-paper-2);
  --popover-foreground: var(--color-ink);

  /* Primary = Furrow Tangerine dengan Tinta Gelap */
  --primary: var(--color-accent);
  --primary-foreground: var(--color-accent-ink);

  /* Secondary = Recessed Manila Paper */
  --secondary: var(--color-paper-3);
  --secondary-foreground: var(--color-ink-2);

  /* Muted Surface = Paper-3, Muted Text = Furrow Muted Ink */
  --muted: var(--color-paper-3);
  --muted-foreground: var(--color-muted);

  /* Hover Surface di Dropdown/Command/Menu = Paper-3 (BUKAN Tangerine) */
  --accent: var(--color-paper-3);
  --accent-foreground: var(--color-ink);

  /* Destructive = Warm Crimson */
  --destructive: var(--color-error);
  --destructive-foreground: var(--color-paper-2);

  /* Borders, Inputs & Focus Ring */
  --border: var(--color-rule);
  --input: var(--color-rule);
  --ring: var(--color-focus);

  /* Default Radius shadcn */
  --radius: var(--radius-card); /* 10px untuk surface, 6px untuk button/input */
}
```

### 8.2 Spesifikasi Kustomisasi Komponen `shadcn/ui`

1. **`Button` (Gaya *Furrow Moulded Key*)**:
   - **Radius**: `var(--radius-pill)` (`6px`), **bukan** `rounded-md` atau `rounded-full`.
   - **Ukuran & Target Sentuh**: Default `h-11` (`44px`) di aplikasi dan `h-12` (`48px`) untuk aksi utama; varian `sm` (`36px`) wajib memiliki area sentuh (`::after` atau *padding* luar) minimal `44x44px` di layar sentuh.
   - **Varian `default` (Primary)**: Latar `--primary` (*tangerine*), teks `--primary-foreground` (tinta gelap `500`), border `color-mix(in oklab, var(--color-accent) 78%, var(--color-ink))`, dan efek cetak timbul (*moulded bevel*):
     `box-shadow: inset 0 1px 0 color-mix(in oklab, var(--color-sheet) 35%, transparent), inset 0 -1px 0 color-mix(in oklab, var(--color-ink) 12%, transparent);`
   - **Varian `secondary` / `outline`**: Latar `--color-paper-2`, border `1px solid var(--color-rule)`, `box-shadow: inset 0 1px 0 var(--color-sheet), 0 1px 1px var(--color-rule)`.
   - **Interaksi Tekan (`:active`)**: `transform: translateY(1px)` dalam `120ms` (`--dur-micro`) — memberikan sensasi tombol fisik e-reader yang ditekan.
   - **Aturan Hirarki**: Maksimal **1 tombol Primary (`default`)** yang terlihat pada satu layar (dan 1 di dalam Dialog aktif).

2. **`Input`, `Textarea`, & `Select`**:
   - **Radius**: `6px` (`--radius-pill`).
   - **Latar**: `--color-paper-2` dengan border konstan `1px solid var(--color-muted)`.
   - **Pola Label Dalam (Furrow Field Pattern — Opsional untuk Form Metadata/Filter)**: Tinggi `52px`, label berada di kiri atas dalam ukuran `12px` (`--color-muted`), dan isi di bawahnya; untuk input angka/halaman otomatis memakai `--font-outlier` (`Red Hat Mono`).
   - **Focus State**: Saat `:focus-visible`, munculkan `outline: 2px solid var(--color-focus); outline-offset: -1px;` secara **instan (`0ms`)** tanpa transisi memudar.

3. **`Sheet` & `Popover` (Drawer Daftar Isi / TOC, Catatan, & Menu `Aa`)**:
   - Latar `--color-paper-2`, dipisahkan dari kanvas baca oleh garis tegas `1px solid var(--color-ink)` (bukan border abu-abu samar).
   - Menu pengaturan baca (`Aa`) menampilkan kontrol ukuran huruf, jenis huruf (`Literata`, `Plus Jakarta Sans`, `Atkinson Hyperlegible`), dan 3 tombol mode kertas (`Manila`, `Sepia`, `Malam`) yang langsung mengubah warna secara *real-time*.

4. **`Card` — Dua Varian Khusus AnzaBook**:
   - **Book Shelf Card**: Menampilkan sampul buku dengan `--radius-book` (`3px 8px 8px 3px`) dan efek lipatan punggung buku tipis di sisi kiri (`inset 3px 0 6px oklch(18% 0.006 60 / 0.15)`), judul buku dalam `Literata 600`, penulis dalam `Plus Jakarta Sans 400 --color-muted`, dan persentase baca dalam `Red Hat Mono 500`.
   - **Notebook Annotation Card (Catatan & Kutipan Buku)**: Mengadopsi ciri khas *waterproof notebook card* dari Furrow — radius `14px` (`--radius-entry`), cincin `1px solid var(--color-ink)`, kepala kartu berwarna gelap (`--color-ink`) yang memuat nomor halaman/bab dalam `Red Hat Mono`, dan bagian isi berlatar kertas grid `8px` (`--color-grid`) tempat kutipan buku dan catatan user ditulis.

5. **`Table` & Daftar Bab (Ruled Index)**:
   - Daftar bab (TOC) atau riwayat baca menggunakan gaya **Book as an Index** dari Furrow: garis atas `1px solid var(--color-ink)`, garis pemisah baris `1px solid var(--color-rule)`, tanpa border luar kotak, dan nomor bab/halaman rata kanan menggunakan `Red Hat Mono` (`tabular-nums`).

6. **`Badge` & `Tabs`**:
   - `Badge` tidak memakai kapsul *glow* atau huruf kapital semua; gunakan `border-radius: 4px` (`--radius-xs`), *sentence case* ("Sedang dibaca", "Selesai"), dengan latar `--color-accent-soft` atau `--color-green-soft`.
   - `TabsList` berada di dalam *recessed well* (`--color-paper-3`, radius `8px`, padding `4px`), dan `TabsTrigger` aktif memakai latar `--color-paper-2` (atau `--color-accent` untuk filter utama) dengan radius konsentris `6px`.

---

## 9. Motion, Choreography (GSAP + Lenis) & Accessibility Locks

### 9.1 Liveliness Dials & Dual-Zone Motion Policy
- **Exploration & Marketing Zone (Landing, Catalog, Book Detail, Share Studio, Publisher Studio)**:
  `Dial: ENERGY 2 / RHYTHM 3 / MOTION 3`
  Menggunakan **Lenis** (`lenis`) yang disinkronkan dengan **GSAP** (`gsap` + `ScrollTrigger`) untuk *smooth inertial scrolling* dan koreografi berbasis *scroll-velocity*.
- **Protected Reading Canvas Zone (`/read/$slug`)**:
  `Dial: ENERGY 1 / RHYTHM 1 / MOTION 1`
  **Zero Distraction in Reader**: Saat pembaca masuk ke *Reading Canvas*, instance Lenis dihentikan sementara (`lenis.stop()` / native scroll) dan **dilarang keras** ada animasi *looping*, titik berkedip, atau *scroll-jacking* yang mengganggu fokus mata.

### 9.2 Motion Tokens & Choreography
```css
:root {
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-in: cubic-bezier(0.64, 0, 0.78, 0);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --ease-roll: cubic-bezier(0.625, 0.05, 0, 1);
  --ease-curtain: cubic-bezier(0.76, 0, 0.24, 1);

  --dur-micro: 120ms; /* Button press, checkbox tick, color state */
  --dur-short: 220ms; /* Hover, tooltip, dropdown menu */
  --dur-long:  420ms; /* TOC Sheet drawer, Dialog, page turn transition */
}
```
- Properti utama yang dianimasikan adalah `transform` dan `opacity` (ditambah `filter: blur()` khusus untuk *Literary Curtain Preloader* dan *DRM Pre-Trigger Shield*).
- **Reduced Motion Fallback (R-39)**: Di bawah `@media (prefers-reduced-motion: reduce)`, Lenis dinonaktifkan, *Preloader* langsung dilewati, *Hero Book Carousel* berhenti bergerak otomatis, dan semua durasi transisi dipangkas menjadi instan (`0.01ms`).

### 9.3 Signature Motion Experiences (Adaptasi Malaka Books x Hallmark Furrow)

1. **Opening Literary Curtain Preloader (`AnzaPreloader`)**:
   - **Inspirasi**: Animasi pembuka kutipan bertahap ala `malakabooks.id`, diadaptasi ke estetika kertas & tinta **Hallmark Furrow**.
   - **Mekanisme**: Muncul maksimal 1 kali per sesi tab (`sessionStorage.getItem("anzabook-preloader-v1")`). Latar `--color-ink` (`#13110F`) dengan aksen ikon monogram **AnzaBook** (`/icon.svg`) dan kutipan literasi dalam `Literata` yang menajam bertahap (`filter: blur(10px) -> blur(0px)`, `opacity: 0 -> 1`):
     - Tahap 1 (`0.1s`): *"Selama akses ilmu tidak dipagari harga kertas,"*
     - Tahap 2 (`1.6s`): *"selama itu pula akal sehat warga tetap menyala."*
     - Tahap 3 (`2.9s`): Atribusi & pita aksen Tangerine (`--color-accent`).
   - **Exit & Kontrol**: Pada `4.0s` (atau instan saat tombol **"Lewati"** / `Escape` ditekan), layar terangkat ke atas (`translateY(-100dvh)`) dengan kurva SVG bawah yang melengkung seperti lembaran halaman buku yang dibuka.

2. **Hero 3D Tactile Shelf & Depth-Tilt Book Carousel (`HeroBookStage`)**:
   - **Diferensiasi dari Malaka Books**: Alih-alih *marquee* datar satu arah seperti di `malakabooks.id`, AnzaBook menghadirkan **Rak Perspektif 3D Interaktif (GSAP + Lenis Velocity)** di atas dudukan kayu/kertas presisi (*Furrow Drafting Ledge*).
   - **Koreografi**:
     - Deretan buku dengan proporsi `3:4`, radius asimetris `--radius-book` (`3px 8px 8px 3px`), dan bayangan lipatan punggung buku (`spine crease`) bergerak mengalir mengikuti kecepatan *scroll* (`lenis` velocity factor) dengan susunan busur kedalaman (*arched depth stagger*).
     - **Interactive Spine Pull-Out**: Saat kursor mendekat atau pengguna memfokuskan (`Tab`) sebuah sampul buku, buku tersebut terangkat keluar dari rak (`translate3d(0, -16px, 24px) rotateY(-10deg)`) dan menyingkap kartu indeks mikro berisi **Harga Edisi Rakyat (mulai Rp29.000)**, **Status Stok Cabang**, serta tombol cepat **"Baca Intisari 20 Menit"**.
     - **Kontrol Aksesibilitas (R-39)**: Dilengkapi tombol **Jeda / Putar Rak** (`Pause/Play`) yang terlihat jelas karena animasi berjalan lebih dari 5 detik.

3. **Micro-Interactions & Editorial Scroll Reveals**:
   - **Character-Roll CTA (`SingleLetterRoll`)**: Pada tombol CTA utama di Hero & Navbar, teks melakukan *staggered vertical character roll* (`--ease-roll`, delay `6.7ms` per huruf) saat `:hover`, dipadukan dengan efek tekan fisik Furrow `:active` (`translateY(1px)`).
   - **Ruled Hairline Draw**: Garis pembatas bagian (`--rule-hair: 1px solid var(--color-ink)`) menggambar dari kiri ke kanan (`scaleX(0 -> 1)`, `transform-origin: left`) menggunakan `GSAP ScrollTrigger` saat bagian masuk ke viewport.
   - **Tiered Paper Physical Switcher**: Saat pengguna memilih *Edisi Rakyat (Newsprint 48.8 gsm)*, *Standar (Bookpaper 72 gsm)*, atau *Kolektor (Hardcover)* di halaman detail buku, pratinjau 3D buku bertransisi halus mengubah tekstur warna kertas, ketebalan punggung buku, dan angka penghematan harga (`Red Hat Mono` `tabular-nums`).

### 9.4 Written Purpose Log (Kepatuhan Antislop R-19 & R-31)
| Keputusan Desain / Animasi | Alasan Satu Baris (R-31 / R-19) |
| :--- | :--- |
| **Palet OKLCH Furrow Manila (`#F6F2E9`) & Tinta (`#13110F`)** | Mengurangi silau layar (*eye strain*) pada sesi baca panjang dibanding latar putih murni `#FFFFFF`. |
| **Aksen Tunggal Tangerine (`#F06A24`) dengan Teks Gelap** | Berfungsi layaknya pita pembatas buku (*bookmark*) dan memenuhi kontras WCAG AAA `8.4:1`. |
| **Tipografi `Literata` + `Plus Jakarta Sans` + `Red Hat Mono`** | Memisahkan fokus bacaan panjang (serif optik), kontrol UI tajam (sans), dan angka metrik/harga presisi (mono tabular). |
| **Opening Literary Curtain Preloader** | Membangun ritme tenang sebelum masuk ke ruang baca sekaligus memperkenalkan misi literasi terjangkau AnzaBook. |
| **3D Tactile Shelf Carousel (GSAP + Lenis)** | Memamerkan koleksi buku fisik & digital layaknya meja kurasi toko buku nyata yang merespons interaksi pembaca. |
| **Character-Roll + Moulded Key Press** | Memberi umpan balik taktil yang hidup pada aksi utama tanpa menggunakan efek *neon glow* generik. |

### 9.5 Standar Aksesibilitas & Navigasi Keyboard E-Reader
- **Navigasi Baca**: Mendukung `ArrowRight` / `Space` (halaman berikutnya), `ArrowLeft` (halaman sebelumnya), `b` (pasang/lepas pita *bookmark*), `t` (buka Daftar Isi / TOC), dan `Escape` (tutup panel/kembali).
- **Indikator Fokus**: Setiap elemen interaktif wajib memiliki `:focus-visible` dengan `outline: 2px solid var(--color-focus)` yang muncul seketika (`transition: none` pada outline).
- **UI States Lengkap (R-27)**: Setiap komponen data (Rak Buku, Daftar Catatan, Pencarian di Dalam Buku, dan Kanvas Baca) wajib memiliki **Empty State** (menjelaskan kenapa kosong + 1 tombol aksi nyata, misal *"Belum ada buku di rak kamu. Jelajahi katalog untuk mulai membaca"*), **Loading State** (menyebutkan apa yang sedang dimuat, misal *"Membuka bab 1 dan mendekripsi halaman…"*), dan **Error State** (menjelaskan apa yang gagal + langkah pemulihan).

---

## 10. Deliverables & File Structure (Saat Implementasi)

Setelah dokumen spesifikasi ini disetujui, implementasi sistem desain akan menghasilkan:
1. `DESIGN.md` di *root* repositori (`d:\Projekan\AnzaBook\DESIGN.md`) sebagai aturan desain terkunci yang dibaca otomatis oleh agen (`Hallmark` & `antislop`).
2. `tokens.css` & `base.css` (atau integrasi ke stylesheet utama proyek) yang berisi seluruh variabel OKLCH, skala tipografi, jembatan `shadcn/ui`, *utility classes* khas Furrow (`.btn-moulded`, `.ruled-index`, `.notebook-card`, `.reader-prose`), serta dukungan tema `Manila`, `Sepia`, dan `Night`.
