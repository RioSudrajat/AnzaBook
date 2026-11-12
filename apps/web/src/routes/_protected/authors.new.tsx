import { useState, useRef, type FormEvent, type ChangeEvent, type DragEvent } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import {
  Camera,
  Check,
  CheckCircle,
  ExternalLink,
  Globe,
  Mail,
  MapPin,
  PenTool,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { SmartBackButton } from "@/components/smart-back-button";
import { AppShell } from "@/features/dashboard/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useApplyAuthor, useMySocialProfile } from "@/features/social/hooks";
import { ApiError } from "@/lib/api/client";

export const Route = createFileRoute("/_protected/authors/new")({
  head: () => ({
    meta: [{ title: "Daftar Jadi Penulis Resmi (New Author) | AnzaBook" }],
  }),
  component: NewAuthorPage,
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

const AUTHOR_TOPICS = [
  "Sastra & Fiksi",
  "Esai Kritis & Reflektif",
  "Filsafat & Pemikiran",
  "Puisi & Sajak",
  "Sejarah & Arsip",
  "Sains Populer",
  "Sosial Politik",
  "Kajian Budaya",
];

export default function NewAuthorPage() {
  const sessionUser = Route.useRouteContext().session.user;
  const navigate = useNavigate();
  const { data: myProfile } = useMySocialProfile();
  const applyAuthorMutation = useApplyAuthor();

  // Form State
  const [name, setName] = useState(myProfile?.name || "");
  const [bio, setBio] = useState(myProfile?.bio || "");
  const [avatarImage, setAvatarImage] = useState(myProfile?.image || "");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [claimedBookTitle, setClaimedBookTitle] = useState("");
  const [selectedTopics, setSelectedTopics] = useState<string[]>(["Sastra & Fiksi", "Esai Kritis & Reflektif"]);

  // Social & Contact
  const [contactEmail, setContactEmail] = useState("");
  const [city, setCity] = useState(myProfile?.locationCity || "");
  const [twitter, setTwitter] = useState(myProfile?.socialLinks?.twitter || "");
  const [instagram, setInstagram] = useState(myProfile?.socialLinks?.instagram || "");
  const [website, setWebsite] = useState(myProfile?.socialLinks?.website || "");

  // UI state
  const [isDragOver, setIsDragOver] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleToggleTopic = (topic: string) => {
    if (selectedTopics.includes(topic)) {
      setSelectedTopics(selectedTopics.filter((t) => t !== topic));
    } else {
      setSelectedTopics([...selectedTopics, topic]);
    }
  };

  // Image Processing: Drag & Drop + Click
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

    const trimmedPenName = name.trim();
    const trimmedBio = bio.trim();

    if (trimmedPenName.length < 2) {
      setFormError("Nama penulis minimal 2 karakter.");
      return;
    }
    if (trimmedBio.length < 10) {
      setFormError("Bio kepenulisan minimal 10 karakter.");
      return;
    }

    try {
      await applyAuthorMutation.mutateAsync({
        penName: trimmedPenName,
        bio: `${trimmedBio}${selectedTopics.length > 0 ? `\n\nTopik Utama: ${selectedTopics.join(", ")}` : ""}`,
        portfolioUrl: portfolioUrl.trim() || undefined,
      });
      setIsSubmitted(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else if (err instanceof Error) {
        setFormError(err.message);
      } else {
        setFormError("Gagal mengajukan permohonan penulis. Silakan coba lagi.");
      }
    }
  };

  if (isSubmitted) {
    return (
      <AppShell user={sessionUser} activeTab="profile" title="Pendaftaran Penulis">
        <div className="max-w-2xl mx-auto py-14 text-center space-y-6">
          <div className="size-16 rounded-full bg-muted border border-border text-foreground flex items-center justify-center mx-auto">
            <CheckCircle className="size-8" />
          </div>

          <div className="space-y-2">
            <h1 className="font-serif text-3xl font-bold">
              Permohonan Penulis Resmi Diterima
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
              Terima kasih, <strong>{name}</strong>. Tim kurasi redaksi AnzaBook sedang meninjau rekam jejak kepenulisan Anda. Status verifikasi akan diperbarui langsung di profil Anda.
            </p>
          </div>

          <div className="pt-4 flex items-center justify-center gap-3">
            <Link
              to="/app"
              search={{ tab: "profile" }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-foreground text-background text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              <span>Buka Profil Saya</span>
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell user={sessionUser} activeTab="profile" title="Pendaftaran Penulis">
      <SmartBackButton fallbackTo="/partner-program" className="-ml-2" />

      {/* Main 2-Column Medium Style Layout */}
      <div className="max-w-4xl w-full mx-auto py-4 space-y-12">
        <div className="space-y-2 border-b border-border pb-6">
          <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Formulir Pendaftaran Penulis Resmi
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-2xl">
            Bergabunglah dengan ekosistem penulis independen dan berdaulat AnzaBook. Terbitkan esai reflektif atau naskah buku multi-bab, pertahankan hak cipta 100%, dan peroleh royalti menit baca dari Nakama Royalty Pool.
          </p>
        </div>

        {formError && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs space-y-1">
            <p className="font-bold">Gagal Mengirim Formulir</p>
            <p>{formError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-12">
          {/* ================= SECTION 1: GENERAL ================= */}
          <section className="space-y-8">
            <h2 className="font-serif text-xl font-bold text-foreground">1. Identitas Kepenulisan</h2>

            {/* Nama Penulis */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-8 pt-2">
              <div className="w-full sm:w-56 shrink-0 space-y-1">
                <Label htmlFor="author-name" className="text-sm font-semibold text-foreground">
                  Nama Penulis<span className="text-red-500">*</span>
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Nama ini tampil di profil, sampul buku, dan katalog. Pakai nama pena kalau Anda menulis dengan nama pena.
                </p>
              </div>

              <div className="flex-1 max-w-xl space-y-1">
                <Input
                  id="author-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Raden Kartono, Puan Lestari"
                  className="text-sm rounded-lg"
                  required
                />
              </div>
            </div>

            {/* Bio Kepenulisan */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-8 pt-2">
              <div className="w-full sm:w-56 shrink-0 space-y-1">
                <Label htmlFor="author-bio" className="text-sm font-semibold text-foreground">
                  Bio &amp; Rekam Jejak<span className="text-red-500">*</span>
                </Label>
              </div>

              <div className="flex-1 max-w-xl space-y-2">
                <Textarea
                  id="author-bio"
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value.slice(0, 500))}
                  placeholder="Ceritakan latar belakang kepenulisan Anda, tema pemikiran yang digeluti, atau publikasi karya sebelumnya..."
                  className="text-sm rounded-lg leading-relaxed resize-none"
                  required
                />
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Maksimal 500 karakter.</span>
                  <span className="font-mono">{bio.length}/500</span>
                </div>
              </div>
            </div>

            {/* Foto Avatar Penulis (Drag & Drop + Local Device) */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-8 pt-2">
              <div className="w-full sm:w-56 shrink-0 space-y-1">
                <Label className="text-sm font-semibold text-foreground">
                  Foto Profil Penulis
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Tampil pada halaman direktori penulis dan pembaca naskah.
                </p>
              </div>

              <div className="flex-1 max-w-xl flex flex-col sm:flex-row items-start gap-6">
                <div className="space-y-1.5 flex-1">
                  <h4 className="font-semibold text-xs text-foreground">Unggah Foto</h4>
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
                        alt="Preview Foto Penulis"
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
                      <span className="text-[10px]">Pilih foto</span>
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

          {/* ================= SECTION 2: TOPIK & KARYA ================= */}
          <section className="space-y-8 border-t border-border pt-8">
            <h2 className="font-serif text-xl font-bold text-foreground">2. Topik &amp; Karya Penulis</h2>

            {/* Topik Utama */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-8 pt-2">
              <div className="w-full sm:w-56 shrink-0 space-y-1">
                <Label className="text-sm font-semibold text-foreground">
                  Fokus Topik Bacaan
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Pilih kategori tulisan utama Anda.
                </p>
              </div>

              <div className="flex-1 max-w-xl space-y-3">
                <div className="flex flex-wrap gap-2">
                  {AUTHOR_TOPICS.map((topic) => {
                    const isSelected = selectedTopics.includes(topic);
                    return (
                      <button
                        key={topic}
                        type="button"
                        onClick={() => handleToggleTopic(topic)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors border cursor-pointer ${
                          isSelected
                            ? "bg-foreground text-background border-foreground font-semibold"
                            : "bg-muted/30 hover:bg-muted text-muted-foreground border-border"
                        }`}
                      >
                        {isSelected ? "✓ " : "+ "}
                        {topic}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Portofolio URL */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-8 pt-2">
              <div className="w-full sm:w-56 shrink-0 space-y-1">
                <Label htmlFor="author-portfolio" className="text-sm font-semibold text-foreground">
                  URL Portofolio / Blog
                </Label>
              </div>

              <div className="flex-1 max-w-xl space-y-1">
                <Input
                  id="author-portfolio"
                  value={portfolioUrl}
                  onChange={(e) => setPortfolioUrl(e.target.value)}
                  placeholder="https://tulisan-anda.id atau tautan naskah sampel"
                  className="text-xs font-mono rounded-lg"
                />
              </div>
            </div>
          </section>

          {/* ================= SECTION 3: KONTAK & MEDIA SOSIAL ================= */}
          <section className="space-y-8 border-t border-border pt-8">
            <h2 className="font-serif text-xl font-bold text-foreground">3. Kontak &amp; Jejaring</h2>

            {/* Kota Domisili */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-8 pt-2">
              <div className="w-full sm:w-56 shrink-0 space-y-1">
                <Label htmlFor="author-city" className="text-sm font-semibold text-foreground">
                  Kota Domisili
                </Label>
              </div>

              <div className="flex-1 max-w-xl space-y-1">
                <Input
                  id="author-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Contoh: Yogyakarta, Bandung, Jakarta"
                  className="text-xs rounded-lg"
                />
              </div>
            </div>

            {/* Media Sosial */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-8 pt-2">
              <div className="w-full sm:w-56 shrink-0 space-y-1">
                <Label className="text-sm font-semibold text-foreground">
                  Tautan Sosial
                </Label>
              </div>

              <div className="flex-1 max-w-xl grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="author-x" className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                    <XTwitterIcon className="size-3.5" />
                    <span>X / Twitter</span>
                  </Label>
                  <Input
                    id="author-x"
                    value={twitter}
                    onChange={(e) => setTwitter(e.target.value)}
                    placeholder="@username"
                    className="text-xs font-mono rounded-lg"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="author-ig" className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                    <InstagramIcon className="size-3.5" />
                    <span>Instagram</span>
                  </Label>
                  <Input
                    id="author-ig"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    placeholder="@username"
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
              disabled={applyAuthorMutation.isPending}
              className="bg-foreground text-background hover:opacity-90 min-h-11 px-8 text-xs font-semibold rounded-xl cursor-pointer"
            >
              {applyAuthorMutation.isPending ? "Mengirim Permohonan..." : "Kirim Permohonan Penulis Resmi"}
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
