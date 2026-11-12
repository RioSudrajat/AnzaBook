import { useState, useRef, type FormEvent, type ChangeEvent, type DragEvent } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import {
  Calendar,
  Camera,
  Check,
  CheckCircle,
  ExternalLink,
  Globe,
  Mail,
  MapPin,
  Trash2,
  Users,
  X,
} from "lucide-react";
import type { CalendarType } from "@starter/shared/validators/community";
import { SmartBackButton } from "@/components/smart-back-button";
import { AppShell } from "@/features/dashboard/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createCalendar } from "@/features/events/api";
import { ApiError } from "@/lib/api/client";

export const Route = createFileRoute("/_protected/communities/new")({
  head: () => ({
    meta: [
      {
        title: "Daftarkan Komunitas Literasi (New Community) | AnzaBook",
      },
    ],
  }),
  component: NewCommunityPage,
});

function XTwitterIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function InstagramIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

const COMMUNITY_TYPES: { value: CalendarType; label: string }[] = [
  { value: "community", label: "Klub Buku & Ruang Baca Komunitas" },
  { value: "publisher", label: "Penerbit / Rumah Produksi Naskah" },
  { value: "author", label: "Kolektif / Ruang Penulis Mandiri" },
];

export default function NewCommunityPage() {
  const sessionUser = Route.useRouteContext().session.user;
  const navigate = useNavigate();

  // General State
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [description, setDescription] = useState("");
  const [communityType, setCommunityType] = useState<CalendarType>("community");
  const [avatarImage, setAvatarImage] = useState("");

  // Location & Details
  const [city, setCity] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [instagram, setInstagram] = useState("");
  const [twitter, setTwitter] = useState("");
  const [website, setWebsite] = useState("");
  const [docTitle, setDocTitle] = useState("");
  const [docUrl, setDocUrl] = useState("");

  // UI state
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!isSlugManuallyEdited) {
      const generated = val
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80);
      setSlug(generated);
    }
  };

  const processImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setFormError("Berkas harus berupa gambar (JPG, PNG, atau WebP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFormError("Ukuran gambar melebihi batas 5MB.");
      return;
    }
    setFormError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 800;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL("image/jpeg", 0.88);
          setAvatarImage(compressed);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImageFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processImageFile(file);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedName = name.trim();
    const trimmedSlug = slug.trim();

    if (trimmedName.length < 3) {
      setFormError("Nama komunitas minimal 3 karakter.");
      return;
    }
    if (trimmedSlug.length < 3) {
      setFormError("Slug URL minimal 3 karakter (hanya huruf kecil, angka, dan strip).");
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createCalendar({
        name: trimmedName,
        slug: trimmedSlug,
        type: communityType,
        description: description.trim() || "",
        avatarUrl: avatarImage || undefined,
        city: city.trim() || undefined,
        contactEmail: contactEmail.trim() || undefined,
        socialLinks: {
          instagram: instagram.trim() || undefined,
          twitter: twitter.trim() || undefined,
          website: website.trim() || undefined,
        },
        verificationDocuments:
          docTitle.trim() && docUrl.trim()
            ? [
                {
                  title: docTitle.trim(),
                  url: docUrl.trim(),
                  fileType: "sk_komunitas",
                },
              ]
            : undefined,
      });

      setCreatedSlug(created.slug);
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else if (err instanceof Error) {
        setFormError(err.message);
      } else {
        setFormError("Gagal mendaftarkan komunitas. Silakan coba lagi.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (createdSlug) {
    return (
      <AppShell user={sessionUser} activeTab="events" title="Daftarkan Komunitas">
        <div className="max-w-2xl mx-auto py-14 text-center space-y-6">
          <div className="size-16 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <CheckCircle className="size-8" />
          </div>

          <div className="space-y-2">
            <h1 className="font-serif text-3xl font-bold">
              Pengajuan Komunitas Berhasil Dikirim
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
              Ruang kalender komunitas <strong>{name}</strong> telah diajukan dan sedang dalam proses peninjauan kurasi &amp; verifikasi oleh Tim Admin AnzaBook. Anda dapat memantau status persetujuan di tab Profil Anda. Setelah disetujui, Anda dapat langsung mengedit tampilan dan mempublikasikan agenda bedah buku.
            </p>
          </div>

          <div className="pt-4 flex items-center justify-center gap-3">
            <Link
              to="/app"
              search={{ tab: "profile" }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-foreground text-background text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              <span>Buka Profil Saya</span>
              <ExternalLink className="size-3.5" />
            </Link>
            <Link
              to="/c/$slug"
              params={{ slug: createdSlug }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border text-xs font-medium hover:bg-muted transition-colors"
            >
              <span>Pratinjau Halaman Komunitas</span>
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell user={sessionUser} activeTab="events" title="Daftarkan Komunitas">
      <SmartBackButton fallbackTo="/partner-program" className="-ml-2 mb-4" />

      {/* Main 2-Column Medium Style Layout */}
      <div className="max-w-4xl w-full mx-auto space-y-12">
        <div className="space-y-2 border-b border-border pb-6">
          <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Pendaftaran Komunitas Literasi &amp; Ruang Baca
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-2xl">
            Kelola ruang temu pembaca kota Anda. Publikasikan kalender agenda, kelola RSVP tiket diskusi, dan peroleh kas afiliasi 10% dari setiap pembelian buku dan keanggotaan Nakama melalui tautan komunitas Anda.
          </p>
        </div>

        {formError && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs space-y-1">
            <p className="font-bold">Gagal Mendaftarkan Komunitas</p>
            <p>{formError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-12">
          {/* ================= SECTION 1: GENERAL ================= */}
          <section className="space-y-8">
            <h2 className="font-serif text-xl font-bold text-foreground">1. Identitas Komunitas</h2>

            {/* Nama Komunitas */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-8 pt-2">
              <div className="w-full sm:w-56 shrink-0 space-y-1">
                <Label htmlFor="comm-name" className="text-sm font-semibold text-foreground">
                  Nama Komunitas<span className="text-red-500">*</span>
                </Label>
              </div>

              <div className="flex-1 max-w-xl space-y-2">
                <Input
                  id="comm-name"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Contoh: Klub Buku Malaka, Pustaka Malam Bandung"
                  className="text-sm rounded-lg"
                  required
                />
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                  <span>Link: anzabook.id/c/</span>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => {
                      setIsSlugManuallyEdited(true);
                      setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 80));
                    }}
                    placeholder="nama-komunitas"
                    className="bg-transparent border-b border-border/80 focus:border-foreground outline-hidden text-foreground font-semibold px-1 py-0.5 text-xs font-mono"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Jenis Ruang Literasi */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-8 pt-2">
              <div className="w-full sm:w-56 shrink-0 space-y-1">
                <Label className="text-sm font-semibold text-foreground">
                  Jenis Ruang
                </Label>
              </div>

              <div className="flex-1 max-w-xl grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {COMMUNITY_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setCommunityType(t.value)}
                    className={`p-3 rounded-xl border text-left text-xs transition-colors cursor-pointer ${
                      communityType === t.value
                        ? "border-foreground bg-muted/40 font-semibold text-foreground"
                        : "border-border text-muted-foreground hover:bg-muted/20"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Deskripsi Komunitas */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-8 pt-2">
              <div className="w-full sm:w-56 shrink-0 space-y-1">
                <Label htmlFor="comm-desc" className="text-sm font-semibold text-foreground">
                  Deskripsi &amp; Visi
                </Label>
              </div>

              <div className="flex-1 max-w-xl space-y-2">
                <Textarea
                  id="comm-desc"
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                  placeholder="Ceritakan fokus bacaan, aktivitas rutin (bedah buku, silent reading, lapak baca), dan jadwal temu..."
                  className="text-sm rounded-lg leading-relaxed resize-none"
                />
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Tampil pada halaman kalender publik dan pratinjau acara.</span>
                  <span className="font-mono">{description.length}/500</span>
                </div>
              </div>
            </div>

            {/* Avatar / Logo Komunitas (Drag & Drop + Local Device) */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-8 pt-2">
              <div className="w-full sm:w-56 shrink-0 space-y-1">
                <Label className="text-sm font-semibold text-foreground">
                  Logo / Avatar Komunitas
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Disematkan di tajuk kalender dan kartu acara.
                </p>
              </div>

              <div className="flex-1 max-w-xl flex flex-col sm:flex-row items-start gap-6">
                <div className="space-y-1.5 flex-1">
                  <h4 className="font-semibold text-xs text-foreground">Unggah Logo</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Tarik dan letakkan berkas gambar atau klik kotak di samping untuk memilih dari perangkat lokal.
                  </p>
                  <p className="text-[11px] font-mono text-muted-foreground">
                    Format: JPG, PNG, WebP • Maks. 5MB
                  </p>
                </div>

                {/* Dropzone Box */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  className={`size-28 sm:size-32 rounded-xl border border-dashed flex flex-col items-center justify-center shrink-0 overflow-hidden relative group cursor-pointer transition-colors ${
                    isDragOver
                      ? "border-foreground bg-muted/60"
                      : "border-border bg-muted/20 hover:border-foreground/60"
                  }`}
                  title="Klik atau seret gambar ke sini"
                >
                  {avatarImage ? (
                    <>
                      <img
                        src={avatarImage}
                        alt="Preview Logo Komunitas"
                        className="size-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[11px] transition-opacity">
                        <Camera className="size-5 mb-0.5" />
                        <span>Ganti</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-2 text-center text-muted-foreground pointer-events-none">
                      <Camera className="size-6 text-muted-foreground/60 mb-1" />
                      <span className="text-[10px]">Pilih logo</span>
                    </div>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>
          </section>

          {/* ================= SECTION 2: LOKASI & KONTAK ================= */}
          <section className="space-y-8 border-t border-border pt-8">
            <h2 className="font-serif text-xl font-bold text-foreground">2. Lokasi &amp; Narahubung</h2>

            {/* Kota Domisili */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-8 pt-2">
              <div className="w-full sm:w-56 shrink-0 space-y-1">
                <Label htmlFor="comm-city" className="text-sm font-semibold text-foreground">
                  Kota Domisili / Basecamp
                </Label>
              </div>

              <div className="flex-1 max-w-xl space-y-1">
                <Input
                  id="comm-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Contoh: Jakarta, Bandung, Malang, Yogyakarta"
                  className="text-xs rounded-lg"
                />
              </div>
            </div>

            {/* Email Kontak */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-8 pt-2">
              <div className="w-full sm:w-56 shrink-0 space-y-1">
                <Label htmlFor="comm-email" className="text-sm font-semibold text-foreground">
                  Email Narahubung
                </Label>
              </div>

              <div className="flex-1 max-w-xl space-y-1">
                <Input
                  id="comm-email"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="kontak@komunitas-anda.org"
                  className="text-xs rounded-lg"
                />
              </div>
            </div>

            {/* Media Sosial */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-8 pt-2">
              <div className="w-full sm:w-56 shrink-0 space-y-1">
                <Label className="text-sm font-semibold text-foreground">
                  Tautan Sosial Komunitas
                </Label>
              </div>

              <div className="flex-1 max-w-xl grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="comm-ig" className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                    <InstagramIcon className="size-3.5" />
                    <span>Instagram</span>
                  </Label>
                  <Input
                    id="comm-ig"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    placeholder="@komunitas.literasi"
                    className="text-xs font-mono rounded-lg"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="comm-x" className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                    <XTwitterIcon className="size-3.5" />
                    <span>X / Twitter</span>
                  </Label>
                  <Input
                    id="comm-x"
                    value={twitter}
                    onChange={(e) => setTwitter(e.target.value)}
                    placeholder="@komunitas_x"
                    className="text-xs font-mono rounded-lg"
                  />
                </div>
              </div>
            </div>
            {/* Dokumen Verifikasi & Legalitas */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-8 pt-2">
              <div className="w-full sm:w-56 shrink-0 space-y-1">
                <Label className="text-sm font-semibold text-foreground">
                  Dokumen Legalitas / Berkas
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Opsional: sertakan tautan berkas SK / akta / surat komunitas untuk mempercepat verifikasi admin.
                </p>
              </div>

              <div className="flex-1 max-w-xl grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="comm-doc-title" className="text-xs font-mono text-muted-foreground">
                    Judul Dokumen
                  </Label>
                  <Input
                    id="comm-doc-title"
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    placeholder="Contoh: SK Kemenkumham / Surat Komunitas"
                    className="text-xs rounded-lg"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="comm-doc-url" className="text-xs font-mono text-muted-foreground">
                    Tautan Dokumen (Google Drive / PDF)
                  </Label>
                  <Input
                    id="comm-doc-url"
                    value={docUrl}
                    onChange={(e) => setDocUrl(e.target.value)}
                    placeholder="https://..."
                    className="text-xs font-mono rounded-lg"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Submit Actions */}
          <div className="pt-8 border-t border-border flex items-center justify-between">
            <Link
              to="/partner-program"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Batal
            </Link>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-foreground text-background hover:opacity-90 min-h-11 px-8 text-xs font-semibold rounded-xl cursor-pointer"
            >
              {isSubmitting ? "Mendaftarkan Komunitas..." : "Daftarkan Komunitas Literasi"}
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
