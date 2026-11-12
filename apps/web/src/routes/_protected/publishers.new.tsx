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
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { SmartBackButton } from "@/components/smart-back-button";
import { AppShell } from "@/features/dashboard/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useApplyPublisher, useMySocialProfile } from "@/features/social/hooks";
import { ApiError } from "@/lib/api/client";

export const Route = createFileRoute("/_protected/publishers/new")({
  head: () => ({
    meta: [{ title: "Daftarkan Penerbit Mitra (New Publication) | AnzaBook" }],
  }),
  component: NewPublicationPage,
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

const PRESET_TOPICS = [
  "Sastra & Fiksi",
  "Filsafat & Pemikiran",
  "Sejarah & Arsip",
  "Sains Populer",
  "Sosial Politik",
  "Puisi & Prosa",
  "Esai Kritis",
  "Ekonomi Politik",
  "Seni & Budaya",
  "Kajian Agraria",
];

export default function NewPublicationPage() {
  const sessionUser = Route.useRouteContext().session.user;
  const navigate = useNavigate();
  const { data: myProfile } = useMySocialProfile();
  const applyPublisherMutation = useApplyPublisher();

  // General state
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [description, setDescription] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [isAvatarDragOver, setIsAvatarDragOver] = useState(false);
  const [isLogoDragOver, setIsLogoDragOver] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const processImageFile = (
    file: File,
    onSuccess: (dataUrl: string) => void,
    maxDim: number = 1000,
  ) => {
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
          const compressed = canvas.toDataURL("image/jpeg", 0.9);
          onSuccess(compressed);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };
  const [ikapiNumber, setIkapiNumber] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [docTitle, setDocTitle] = useState("");
  const [docUrl, setDocUrl] = useState("");

  // Social state
  const [contactEmail, setContactEmail] = useState("");
  const [twitterHandle, setTwitterHandle] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");

  // Topics state
  const [topics, setTopics] = useState<string[]>(["Sastra & Fiksi", "Filsafat & Pemikiran"]);
  const [newTopicInput, setNewTopicInput] = useState("");
  const [isAddingTopic, setIsAddingTopic] = useState(false);

  // People state (Editorial team)
  const [editors, setEditors] = useState<string[]>([]);
  const [newEditorInput, setNewEditorInput] = useState("");
  const [isAddingEditor, setIsAddingEditor] = useState(false);

  const [approvedWriters, setApprovedWriters] = useState<string[]>([]);
  const [newWriterInput, setNewWriterInput] = useState("");
  const [isAddingWriter, setIsAddingWriter] = useState(false);

  const [formError, setFormError] = useState<string | null>(null);

  // Auto-slug generator from Name
  const handleNameChange = (val: string) => {
    setName(val);
    if (!isSlugManuallyEdited) {
      const generatedSlug = val
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80);
      setSlug(generatedSlug);
    }
  };

  const handleSlugChange = (val: string) => {
    setIsSlugManuallyEdited(true);
    setSlug(
      val
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "")
        .slice(0, 80),
    );
  };

  const handleAddTopic = (topic: string) => {
    const trimmed = topic.trim();
    if (trimmed && !topics.includes(trimmed) && topics.length < 10) {
      setTopics([...topics, trimmed]);
      setNewTopicInput("");
      setIsAddingTopic(false);
    }
  };

  const handleRemoveTopic = (topicToRemove: string) => {
    setTopics(topics.filter((t) => t !== topicToRemove));
  };

  const handleAddEditor = () => {
    const trimmed = newEditorInput.trim();
    if (trimmed && !editors.includes(trimmed)) {
      setEditors([...editors, trimmed]);
      setNewEditorInput("");
      setIsAddingEditor(false);
    }
  };

  const handleAddWriter = () => {
    const trimmed = newWriterInput.trim();
    if (trimmed && !approvedWriters.includes(trimmed)) {
      setApprovedWriters([...approvedWriters, trimmed]);
      setNewWriterInput("");
      setIsAddingWriter(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanName = name.trim();
    const cleanSlug = slug.trim() || cleanName.toLowerCase().replace(/[^a-z0-9-]/g, "");

    if (!cleanName) {
      setFormError("Nama penerbit wajib diisi.");
      return;
    }
    if (!cleanSlug || cleanSlug.length < 2) {
      setFormError("Slug penerbit minimal 2 karakter (hanya huruf kecil, angka, tanda hubung).");
      return;
    }

    try {
      const createdPub = await applyPublisherMutation.mutateAsync({
        name: cleanName,
        slug: cleanSlug,
        ikapiNumber: ikapiNumber.trim() || undefined,
        description: description.trim() || undefined,
        logoUrl: logoUrl.trim() || avatarUrl.trim() || undefined,
        city: city.trim() || undefined,
        address: address.trim() || undefined,
        contactEmail: contactEmail.trim() || undefined,
        verificationDocuments:
          docTitle.trim() && docUrl.trim()
            ? [
                {
                  title: docTitle.trim(),
                  url: docUrl.trim(),
                  fileType: "bukti_ikapi",
                },
              ]
            : undefined,
      });

      // Redirect directly to the newly created publisher page
      navigate({
        to: "/p/$slug",
        params: { slug: createdPub.slug },
      });
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else if (err instanceof Error) {
        setFormError(err.message);
      } else {
        setFormError("Terjadi kesalahan saat mendaftarkan penerbit. Silakan coba kembali.");
      }
    }
  };

  return (
    <AppShell user={sessionUser} activeTab="profile" title="Daftarkan Penerbit">
      <div className="flex items-center justify-between gap-3 mb-6">
        <SmartBackButton fallbackTo="/partner-program" className="-ml-2" />
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-muted-foreground">Step 1 of 2</span>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={applyPublisherMutation.isPending || !name.trim()}
            className="bg-foreground text-background hover:opacity-90 text-xs px-4 py-2 h-9 rounded-full font-medium cursor-pointer"
          >
            {applyPublisherMutation.isPending ? "Menyimpan..." : "Lanjut (Next)"}
          </Button>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-4xl w-full mx-auto space-y-12">
        {/* Title Heading */}
        <div className="space-y-1 border-b border-border/60 pb-6">
          <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            New publication
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Daftarkan entitas penerbit mitra Anda untuk menerbitkan karya buku, mengelola tim redaksi, dan menjangkau ribuan pembaca setia AnzaBook.
          </p>
        </div>

        {formError && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs space-y-1">
            <p className="font-bold">Gagal Mendaftarkan Penerbit</p>
            <p>{formError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-12">
          {/* ================= SECTION 1: GENERAL ================= */}
          <section className="space-y-8">
            <h2 className="font-serif text-xl font-bold text-foreground">General</h2>

            {/* Field: Name* */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-8 pt-2">
              <div className="w-full sm:w-56 shrink-0 space-y-1">
                <Label htmlFor="pub-name" className="text-sm font-semibold text-foreground">
                  Name<span className="text-red-500">*</span>
                </Label>
              </div>

              <div className="flex-1 max-w-xl space-y-2">
                <Input
                  id="pub-name"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Type your publication's name"
                  className="text-sm rounded-lg"
                  required
                />
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                  <span>Link: anzabook.id/p/</span>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    placeholder="nama-penerbit"
                    className="bg-transparent border-b border-border/80 focus:border-foreground outline-hidden text-foreground font-semibold px-1 py-0.5 text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Field: Description* */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-8 pt-2">
              <div className="w-full sm:w-56 shrink-0 space-y-1">
                <Label htmlFor="pub-desc" className="text-sm font-semibold text-foreground">
                  Description<span className="text-red-500">*</span>
                </Label>
              </div>

              <div className="flex-1 max-w-xl space-y-2">
                <Textarea
                  id="pub-desc"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, 280))}
                  placeholder="Type a short description"
                  className="text-sm rounded-lg leading-relaxed resize-none"
                  required
                />
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <p className="max-w-md leading-normal">
                    The description is a quick way to tell readers about your publication. It's short and appears on search results and publication preview cards.
                  </p>
                  <span className="font-mono ml-2 shrink-0">{description.length}/280</span>
                </div>
              </div>
            </div>

            {/* Field: Publication avatar* */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-8 pt-2">
              <div className="w-full sm:w-56 shrink-0 space-y-1">
                <Label className="text-sm font-semibold text-foreground">
                  Publication avatar<span className="text-red-500">*</span>
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Items marked with * are required.
                </p>
              </div>

              <div className="flex-1 max-w-xl flex flex-col sm:flex-row items-start justify-between gap-6">
                <div className="space-y-1.5 flex-1">
                  <h4 className="font-semibold text-xs text-foreground">Add avatar</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    The avatar appears with your stories across AnzaBook. Seret dan letakkan gambar dari perangkat Anda atau klik kotak di samping.
                  </p>
                  <p className="text-[11px] font-mono text-muted-foreground">
                    Format: JPG, PNG, WebP • Maks. 5MB
                  </p>
                </div>

                {/* Avatar Preview & Dropzone Box */}
                <div
                  onClick={() => avatarInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsAvatarDragOver(true);
                  }}
                  onDragLeave={() => setIsAvatarDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsAvatarDragOver(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) processImageFile(file, (data) => setAvatarUrl(data), 1000);
                  }}
                  className={`size-28 sm:size-32 rounded-xl border border-dashed flex flex-col items-center justify-center text-muted-foreground shrink-0 overflow-hidden relative group cursor-pointer transition-colors ${
                    isAvatarDragOver
                      ? "border-foreground bg-muted/60"
                      : "border-border bg-muted/20 hover:border-foreground/60"
                  }`}
                  title="Klik atau seret avatar ke sini"
                >
                  {avatarUrl ? (
                    <>
                      <img
                        src={avatarUrl}
                        alt="Avatar Preview"
                        className="size-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[11px] transition-opacity">
                        <Camera className="size-5 mb-0.5" />
                        <span>Ganti</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-2 text-center pointer-events-none">
                      <Camera className="size-6 text-muted-foreground/60 mb-1" />
                      <span className="text-[10px] text-muted-foreground">Pilih avatar</span>
                    </div>
                  )}
                </div>

                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) processImageFile(file, (data) => setAvatarUrl(data), 1000);
                    e.target.value = "";
                  }}
                  className="hidden"
                />
              </div>
            </div>

            {/* Field: Publication logo */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-8 pt-2">
              <div className="w-full sm:w-56 shrink-0 space-y-1">
                <Label className="text-sm font-semibold text-foreground">
                  Publication logo
                </Label>
              </div>

              <div className="flex-1 max-w-xl flex flex-col sm:flex-row items-start justify-between gap-6">
                <div className="space-y-1.5 flex-1">
                  <h4 className="font-semibold text-xs text-foreground">Add logo</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    The logo is displayed at the top of your publication. Seret dan letakkan berkas logo atau klik kotak di samping untuk memilih dari perangkat lokal.
                  </p>
                  <p className="text-[11px] font-mono text-muted-foreground">
                    Format: JPG, PNG, WebP • Maks. 5MB
                  </p>
                </div>

                {/* Logo Preview & Dropzone Box */}
                <div
                  onClick={() => logoInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsLogoDragOver(true);
                  }}
                  onDragLeave={() => setIsLogoDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsLogoDragOver(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) processImageFile(file, (data) => setLogoUrl(data), 1200);
                  }}
                  className={`size-28 sm:size-32 rounded-xl border border-dashed flex flex-col items-center justify-center text-muted-foreground shrink-0 overflow-hidden relative group cursor-pointer transition-colors ${
                    isLogoDragOver
                      ? "border-foreground bg-muted/60"
                      : "border-border bg-muted/20 hover:border-foreground/60"
                  }`}
                  title="Klik atau seret logo ke sini"
                >
                  {logoUrl ? (
                    <>
                      <img
                        src={logoUrl}
                        alt="Logo Preview"
                        className="size-full object-contain p-2"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[11px] transition-opacity">
                        <Camera className="size-5 mb-0.5" />
                        <span>Ganti</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-2 text-center pointer-events-none">
                      <Camera className="size-6 text-muted-foreground/60 mb-1" />
                      <span className="text-[10px] text-muted-foreground">Pilih logo</span>
                    </div>
                  )}
                </div>

                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) processImageFile(file, (data) => setLogoUrl(data), 1200);
                    e.target.value = "";
                  }}
                  className="hidden"
                />
              </div>
            </div>

            {/* Field: IKAPI & Domisili (Indonesian Publishing Ecosystem) */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-8 pt-2">
              <div className="w-full sm:w-56 shrink-0 space-y-1">
                <Label className="text-sm font-semibold text-foreground">
                  Legalitas &amp; Domisili
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Opsional untuk verifikasi lencana IKAPI.
                </p>
              </div>

              <div className="flex-1 max-w-xl grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="pub-ikapi" className="text-xs font-medium text-foreground">
                    Nomor Anggota IKAPI
                  </Label>
                  <Input
                    id="pub-ikapi"
                    value={ikapiNumber}
                    onChange={(e) => setIkapiNumber(e.target.value)}
                    placeholder="Contoh: 042/JTI/2021"
                    className="text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="pub-city" className="text-xs font-medium text-foreground">
                    Kota Operasional Redaksi
                  </Label>
                  <Input
                    id="pub-city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Contoh: Yogyakarta / Bandung"
                    className="text-xs"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <Label htmlFor="pub-address" className="text-xs font-medium text-foreground">
                    Alamat Lengkap Kantor
                  </Label>
                  <Input
                    id="pub-address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Alamat kantor penerbit atau warehouse cetak..."
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="pub-doc-title" className="text-xs font-medium text-foreground">
                    Judul Dokumen Legalitas / IKAPI
                  </Label>
                  <Input
                    id="pub-doc-title"
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    placeholder="Contoh: Sertifikat IKAPI / Akta Penerbit"
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="pub-doc-url" className="text-xs font-medium text-foreground">
                    Tautan Berkas (PDF / Drive)
                  </Label>
                  <Input
                    id="pub-doc-url"
                    value={docUrl}
                    onChange={(e) => setDocUrl(e.target.value)}
                    placeholder="https://..."
                    className="text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          </section>

          <hr className="border-border/60" />

          {/* ================= SECTION 2: SOCIAL AND TOPICS ================= */}
          <section className="space-y-8">
            <h2 className="font-serif text-xl font-bold text-foreground">Social and topics</h2>

            {/* Field: Contact info */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-8 pt-2">
              <div className="w-full sm:w-56 shrink-0 space-y-1">
                <Label className="text-sm font-semibold text-foreground">
                  Contact info
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  These links will be public.
                </p>
              </div>

              <div className="flex-1 max-w-xl space-y-3">
                {/* Email */}
                <div className="flex items-center gap-3">
                  <Mail className="size-4 text-muted-foreground shrink-0" />
                  <Input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="Email resmi redaksi (redaksi@penerbit.id)"
                    className="text-xs"
                  />
                </div>

                {/* X / Twitter */}
                <div className="flex items-center gap-3">
                  <XTwitterIcon className="size-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 flex items-center rounded-lg border border-border bg-card px-3 py-1.5">
                    <span className="text-xs text-muted-foreground font-mono shrink-0 mr-1.5">
                      x.com/
                    </span>
                    <input
                      type="text"
                      value={twitterHandle}
                      onChange={(e) => setTwitterHandle(e.target.value.replace(/^@/, ""))}
                      placeholder="username"
                      className="w-full bg-transparent text-xs font-mono text-foreground outline-hidden"
                    />
                  </div>
                </div>

                {/* Instagram */}
                <div className="flex items-center gap-3">
                  <InstagramIcon className="size-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 flex items-center rounded-lg border border-border bg-card px-3 py-1.5">
                    <span className="text-xs text-muted-foreground font-mono shrink-0 mr-1.5">
                      instagram.com/
                    </span>
                    <input
                      type="text"
                      value={instagramHandle}
                      onChange={(e) => setInstagramHandle(e.target.value.replace(/^@/, ""))}
                      placeholder="username"
                      className="w-full bg-transparent text-xs font-mono text-foreground outline-hidden"
                    />
                  </div>
                </div>

                {/* Website */}
                <div className="flex items-center gap-3">
                  <Globe className="size-4 text-muted-foreground shrink-0" />
                  <Input
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://penerbit.id"
                    className="text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Field: Topics */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-8 pt-2">
              <div className="w-full sm:w-56 shrink-0 space-y-1">
                <Label className="text-sm font-semibold text-foreground">Topics</Label>
              </div>

              <div className="flex-1 max-w-xl space-y-3">
                {/* Selected Topics List */}
                <div className="flex flex-wrap items-center gap-2">
                  {topics.map((topic) => (
                    <span
                      key={topic}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted border border-border text-xs font-medium text-foreground"
                    >
                      <span>{topic}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTopic(topic)}
                        className="hover:text-destructive cursor-pointer transition-colors"
                        title={`Hapus topik ${topic}`}
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}

                  {/* Add Topic Input / Button */}
                  {isAddingTopic ? (
                    <div className="flex items-center gap-1.5">
                      <Input
                        value={newTopicInput}
                        onChange={(e) => setNewTopicInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddTopic(newTopicInput);
                          }
                        }}
                        placeholder="Ketik topik..."
                        className="h-8 text-xs w-36 font-sans"
                        autoFocus
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleAddTopic(newTopicInput)}
                        className="h-8 px-2.5 text-xs bg-foreground text-background"
                      >
                        Tambah
                      </Button>
                      <button
                        type="button"
                        onClick={() => setIsAddingTopic(false)}
                        className="text-muted-foreground hover:text-foreground p-1 text-xs"
                      >
                        Batal
                      </button>
                    </div>
                  ) : (
                    topics.length < 10 && (
                      <button
                        type="button"
                        onClick={() => setIsAddingTopic(true)}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-dashed border-border/80 hover:border-foreground text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      >
                        <Plus className="size-3" />
                        <span>Add a topic...</span>
                      </button>
                    )
                  )}
                </div>

                {/* Preset Suggestions */}
                <div className="space-y-1.5 pt-1">
                  <p className="text-[11px] text-muted-foreground font-mono">
                    Saran fokus kurasi:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_TOPICS.filter((t) => !topics.includes(t)).map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleAddTopic(preset)}
                        className="text-[11px] px-2 py-0.5 rounded-md bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/40 transition-colors cursor-pointer"
                      >
                        + {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground leading-relaxed pt-1">
                  Adding topics (up to 10) allows people to search for and discover your publication. These topics affect which stories show up in readers' recommendations.
                </p>
              </div>
            </div>
          </section>

          <hr className="border-border/60" />

          {/* ================= SECTION 3: PEOPLE ================= */}
          <section className="space-y-8">
            <h2 className="font-serif text-xl font-bold text-foreground">People</h2>

            {/* Row: Owner */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-8 pt-2">
              <div className="w-full sm:w-56 shrink-0 space-y-1">
                <Label className="text-sm font-semibold text-foreground">Owner</Label>
              </div>

              <div className="flex-1 max-w-xl">
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-card">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-zinc-800 border border-border flex items-center justify-center font-bold text-sm text-foreground overflow-hidden">
                      {myProfile?.image ? (
                        <img
                          src={myProfile.image}
                          alt={myProfile.name}
                          className="size-full object-cover"
                        />
                      ) : (
                        <span>{(myProfile?.name || "U").slice(0, 1).toUpperCase()}</span>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-xs text-foreground">
                        {myProfile?.name || "Pengguna AnzaBook"}
                      </p>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        @{myProfile?.username || "nakama"} • Pemilik Akun Utama
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Owner
                  </span>
                </div>
              </div>
            </div>

            {/* Row: Editors */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-8 pt-2">
              <div className="w-full sm:w-56 shrink-0 space-y-1">
                <Label className="text-sm font-semibold text-foreground">Editors</Label>
              </div>

              <div className="flex-1 max-w-xl space-y-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Editors can add or remove stories. They can also review, edit and publish submissions.
                </p>

                {editors.length > 0 && (
                  <div className="space-y-2">
                    {editors.map((editor) => (
                      <div
                        key={editor}
                        className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/30 text-xs"
                      >
                        <span className="font-mono text-foreground">{editor}</span>
                        <button
                          type="button"
                          onClick={() => setEditors(editors.filter((e) => e !== editor))}
                          className="text-muted-foreground hover:text-destructive cursor-pointer"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {isAddingEditor ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={newEditorInput}
                      onChange={(e) => setNewEditorInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddEditor();
                        }
                      }}
                      placeholder="Email atau username editor..."
                      className="h-8 text-xs font-mono"
                      autoFocus
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddEditor}
                      className="h-8 px-3 text-xs bg-foreground text-background"
                    >
                      Simpan
                    </Button>
                    <button
                      type="button"
                      onClick={() => setIsAddingEditor(false)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Batal
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAddingEditor(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-border hover:border-foreground text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    <Plus className="size-3.5" />
                    <span>Add an editor...</span>
                  </button>
                )}
              </div>
            </div>

            {/* Row: Approved writers */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-8 pt-2">
              <div className="w-full sm:w-56 shrink-0 space-y-1">
                <Label className="text-sm font-semibold text-foreground">
                  Approved writers
                </Label>
              </div>

              <div className="flex-1 max-w-xl space-y-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Approved writers can submit or remove their stories from this publication.
                </p>

                {approvedWriters.length > 0 && (
                  <div className="space-y-2">
                    {approvedWriters.map((writer) => (
                      <div
                        key={writer}
                        className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/30 text-xs"
                      >
                        <span className="font-mono text-foreground">{writer}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setApprovedWriters(approvedWriters.filter((w) => w !== writer))
                          }
                          className="text-muted-foreground hover:text-destructive cursor-pointer"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {isAddingWriter ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={newWriterInput}
                      onChange={(e) => setNewWriterInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddWriter();
                        }
                      }}
                      placeholder="Email atau username penulis rekanan..."
                      className="h-8 text-xs font-mono"
                      autoFocus
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddWriter}
                      className="h-8 px-3 text-xs bg-foreground text-background"
                    >
                      Simpan
                    </Button>
                    <button
                      type="button"
                      onClick={() => setIsAddingWriter(false)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Batal
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAddingWriter(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-border hover:border-foreground text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    <Plus className="size-3.5" />
                    <span>Add a writer...</span>
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* ================= BOTTOM BAR ================= */}
          <div className="pt-8 border-t border-border/80 flex items-center justify-between">
            <Link
              to="/app"
              search={{ tab: "profile" }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Batalkan
            </Link>

            <div className="flex items-center gap-4">
              <span className="text-xs font-mono text-muted-foreground">Step 1 of 2</span>
              <Button
                type="submit"
                disabled={applyPublisherMutation.isPending || !name.trim()}
                className="bg-foreground text-background hover:opacity-90 text-xs px-6 py-2.5 h-10 rounded-full font-semibold cursor-pointer"
              >
                {applyPublisherMutation.isPending
                  ? "Mendaftarkan Penerbit..."
                  : "Next (Daftarkan Penerbit)"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
