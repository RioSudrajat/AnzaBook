import { useState, useRef, type FormEvent } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Camera, Globe, Mail, Plus, X } from "lucide-react";
import { InstagramIcon, XTwitterIcon } from "@/components/profile/social-icons";
import { SmartBackButton } from "@/components/smart-back-button";
import { AppShell } from "@/features/dashboard/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useAddPublisherApprovedWriter,
  useAddPublisherMember,
  useApplyPublisher,
  useMySocialProfile,
  useUploadMediaImage,
} from "@/features/social/hooks";
import {
  MAX_PUBLISHER_TOPICS,
  normalizePublisherTopics,
  normalizeSocialLinks,
} from "@/features/publisher/publisher-helpers";
import { ApiError } from "@/lib/api/client";

export const Route = createFileRoute("/_protected/publishers/new")({
  head: () => ({
    meta: [{ title: "Daftarkan Penerbit Mitra | AnzaBook" }],
  }),
  component: NewPublicationPage,
});

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

function NewPublicationPage() {
  const sessionUser = Route.useRouteContext().session.user;
  const navigate = useNavigate();
  const { data: myProfile } = useMySocialProfile();
  const applyPublisherMutation = useApplyPublisher();
  const addMemberMutation = useAddPublisherMember();
  const addApprovedWriterMutation = useAddPublisherApprovedWriter();
  const uploadImageMutation = useUploadMediaImage();

  // General state
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [headerImageUrl, setHeaderImageUrl] = useState("");
  const [isLogoDragOver, setIsLogoDragOver] = useState(false);
  const [isBannerDragOver, setIsBannerDragOver] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const processImageFile = async (
    file: File,
    onSuccess: (uploadedUrl: string) => void,
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
    try {
      const uploaded = await uploadImageMutation.mutateAsync(file);
      onSuccess(uploaded.url);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Gagal mengunggah gambar ke server media.",
      );
    }
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

  // Topics & Editorial submissions state
  const [topics, setTopics] = useState<string[]>([
    "Sastra & Fiksi",
    "Filsafat & Pemikiran",
  ]);
  const [newTopicInput, setNewTopicInput] = useState("");
  const [isAddingTopic, setIsAddingTopic] = useState(false);
  const [isAcceptingSubmissions, setIsAcceptingSubmissions] = useState(true);
  const [submissionGuidelines, setSubmissionGuidelines] = useState("");

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
    const cleaned = topic.trim();
    if (!cleaned) return;
    const nextTopics = normalizePublisherTopics([...topics, cleaned]);
    if (
      nextTopics.length > topics.length &&
      nextTopics.length <= MAX_PUBLISHER_TOPICS
    ) {
      setTopics(nextTopics);
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
    const cleanSlug =
      slug.trim() || cleanName.toLowerCase().replace(/[^a-z0-9-]/g, "");

    if (!cleanName) {
      setFormError("Nama penerbit wajib diisi.");
      return;
    }
    if (!cleanSlug || cleanSlug.length < 2) {
      setFormError(
        "Slug penerbit minimal 2 karakter (hanya huruf kecil, angka, tanda hubung).",
      );
      return;
    }

    try {
      const normalizedTopics = normalizePublisherTopics(topics);
      const normalizedLinks = normalizeSocialLinks({
        website: websiteUrl,
        instagram: instagramHandle,
        twitter: twitterHandle,
      });

      const createdPub = await applyPublisherMutation.mutateAsync({
        name: cleanName,
        slug: cleanSlug,
        ikapiNumber: ikapiNumber.trim() || undefined,
        description: description.trim() || undefined,
        logoUrl: logoUrl.trim() || undefined,
        headerImageUrl: headerImageUrl.trim() || undefined,
        city: city.trim() || undefined,
        address: address.trim() || undefined,
        contactEmail: contactEmail.trim() || undefined,
        socialLinks: normalizedLinks,
        topics: normalizedTopics.length > 0 ? normalizedTopics : undefined,
        isAcceptingSubmissions,
        submissionGuidelines: submissionGuidelines.trim() || undefined,
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

      const editorEmails = editors
        .map((entry) => entry.trim())
        .filter((entry) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entry));

      if (editorEmails.length > 0) {
        await Promise.allSettled(
          editorEmails.map((email) =>
            addMemberMutation.mutateAsync({
              slug: createdPub.slug,
              input: { email, role: "editor" },
            }),
          ),
        );
      }

      const writerIdentifiers = approvedWriters
        .map((entry) => entry.trim())
        .filter((entry) => entry.length >= 2);

      if (writerIdentifiers.length > 0) {
        await Promise.allSettled(
          writerIdentifiers.map((identifier) =>
            addApprovedWriterMutation.mutateAsync({
              slug: createdPub.slug,
              input: { identifier, canFastTrack: true },
            }),
          ),
        );
      }

      if (createdPub.verificationStatus === "verified") {
        navigate({
          to: "/p/$slug/studio",
          params: { slug: createdPub.slug },
        });
      } else {
        navigate({
          to: "/p/$slug",
          params: { slug: createdPub.slug },
        });
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else if (err instanceof Error) {
        setFormError(err.message);
      } else {
        setFormError(
          "Terjadi kesalahan saat mendaftarkan penerbit. Silakan coba kembali.",
        );
      }
    }
  };

  return (
    <AppShell user={sessionUser} activeTab="profile" title="Daftarkan Penerbit">
      <div className="flex items-center justify-between gap-3 mb-6">
        <SmartBackButton fallbackTo="/partner-program" className="-ml-2" />
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={
            applyPublisherMutation.isPending ||
            uploadImageMutation.isPending ||
            !name.trim()
          }
          className="bg-[var(--color-accent)] text-[var(--color-accent-ink)] hover:brightness-95 text-xs px-5 min-h-11 rounded-xl font-semibold cursor-pointer"
        >
          {applyPublisherMutation.isPending
            ? "Menyimpan..."
            : "Daftarkan Penerbit"}
        </Button>
      </div>

      {/* Main Container */}
      <div className="max-w-4xl w-full mx-auto space-y-12 text-[var(--color-ink)]">
        {/* Title Heading */}
        <div className="space-y-1.5 border-b border-[var(--color-rule)] pb-6">
          <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight">
            Daftarkan Penerbit Baru
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-muted)]">
            Daftarkan entitas penerbit mitra Anda untuk menerbitkan karya buku,
            mengelola tim redaksi, dan menjangkau ribuan pembaca setia AnzaBook.
          </p>
        </div>

        {formError && (
          <div
            role="alert"
            className="p-4 rounded-xl bg-[var(--color-error-soft)] border border-[var(--color-error)]/40 text-[var(--color-ink)] text-xs space-y-1"
          >
            <p className="font-bold">Gagal Mendaftarkan Penerbit</p>
            <p>{formError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-12">
          {/* ================= SECTION 1: UMUM ================= */}
          <section className="space-y-8">
            <h2 className="font-serif text-xl font-bold text-foreground">
              Identitas Penerbit
            </h2>

            {/* Field: Nama* */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-8 pt-2">
              <div className="w-full sm:w-56 shrink-0 space-y-1">
                <Label
                  htmlFor="pub-name"
                  className="text-sm font-semibold text-foreground"
                >
                  Nama Penerbit<span className="text-red-500">*</span>
                </Label>
              </div>

              <div className="flex-1 max-w-xl space-y-2">
                <Input
                  id="pub-name"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Ketik nama resmi penerbit..."
                  className="text-sm rounded-lg"
                  required
                />
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                  <span>Tautan: anzabook.id/p/</span>
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

            {/* Field: Deskripsi* */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-8 pt-2">
              <div className="w-full sm:w-56 shrink-0 space-y-1">
                <Label
                  htmlFor="pub-desc"
                  className="text-sm font-semibold text-foreground"
                >
                  Deskripsi Singkat<span className="text-red-500">*</span>
                </Label>
              </div>

              <div className="flex-1 max-w-xl space-y-2">
                <Textarea
                  id="pub-desc"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, 280))}
                  placeholder="Tuliskan deskripsi singkat profil dan visi kurasi penerbit..."
                  className="text-sm rounded-lg leading-relaxed resize-none"
                  required
                />
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <p className="max-w-md leading-normal">
                    Deskripsi ini tampil di kartu profil penerbit dan hasil
                    pencarian AnzaBook.
                  </p>
                  <span className="font-mono ml-2 shrink-0">
                    {description.length}/280
                  </span>
                </div>
              </div>
            </div>

            {/* Field: Logo Penerbit (1:1) */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-8 pt-2">
              <div className="w-full sm:w-56 shrink-0 space-y-1">
                <Label className="text-sm font-semibold text-[var(--color-ink)]">
                  Logo Penerbit (1:1)
                </Label>
                <p className="text-[11px] text-[var(--color-muted)]">
                  Kolom bertanda * wajib diisi.
                </p>
              </div>

              <div className="flex-1 max-w-xl flex flex-col sm:flex-row items-start justify-between gap-6">
                <div className="space-y-1.5 flex-1">
                  <p className="font-semibold text-xs text-[var(--color-ink)]">
                    Unggah Logo Persegi
                  </p>
                  <p className="text-xs text-[var(--color-muted)] leading-relaxed">
                    Logo tampil di bagian atas halaman publik penerbit,
                    direktori eksplorasi, dan studio redaksi.
                  </p>
                  <p className="text-[11px] font-mono text-[var(--color-muted)]">
                    Format: JPG, PNG, WebP — Maks. 5MB
                  </p>
                </div>

                {/* Logo Preview & Dropzone Box */}
                <button
                  type="button"
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
                    if (file)
                      void processImageFile(file, (data) => setLogoUrl(data));
                  }}
                  className={`size-28 sm:size-32 rounded-xl border border-dashed flex flex-col items-center justify-center text-[var(--color-muted)] shrink-0 overflow-hidden relative group cursor-pointer transition-colors ${
                    isLogoDragOver
                      ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
                      : "border-[var(--color-rule)] bg-[var(--color-paper-2)] hover:border-[var(--color-ink)]"
                  }`}
                  aria-label="Pilih atau seret logo penerbit"
                >
                  {logoUrl ? (
                    <>
                      <img
                        src={logoUrl}
                        alt="Pratinjau logo penerbit"
                        className="size-full object-contain p-2"
                      />
                      <span className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[11px] transition-opacity">
                        <Camera className="size-5 mb-0.5" aria-hidden="true" />
                        <span>Ganti Logo</span>
                      </span>
                    </>
                  ) : (
                    <span className="flex flex-col items-center justify-center p-2 text-center pointer-events-none">
                      <Camera
                        className="size-6 opacity-60 mb-1"
                        aria-hidden="true"
                      />
                      <span className="text-[10px]">Pilih logo</span>
                    </span>
                  )}
                </button>

                <input
                  id="publisher-logo-upload"
                  name="publisherLogoFile"
                  aria-label="Unggah logo penerbit"
                  ref={logoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file)
                      void processImageFile(file, (data) => setLogoUrl(data));
                    e.target.value = "";
                  }}
                  className="hidden"
                />
              </div>
            </div>

            {/* Field: Banner Sampul (3:1) */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-8 pt-2">
              <div className="w-full sm:w-56 shrink-0 space-y-1">
                <Label className="text-sm font-semibold text-[var(--color-ink)]">
                  Banner Sampul (3:1)
                </Label>
                <p className="text-[11px] text-[var(--color-muted)]">
                  Opsional untuk header halaman publik &amp; studio.
                </p>
              </div>

              <div className="flex-1 max-w-xl space-y-3">
                <button
                  type="button"
                  onClick={() => bannerInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsBannerDragOver(true);
                  }}
                  onDragLeave={() => setIsBannerDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsBannerDragOver(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file)
                      void processImageFile(file, (data) =>
                        setHeaderImageUrl(data),
                      );
                  }}
                  className={`w-full aspect-[3/1] rounded-xl border border-dashed flex flex-col items-center justify-center text-[var(--color-muted)] overflow-hidden relative group cursor-pointer transition-colors ${
                    isBannerDragOver
                      ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
                      : "border-[var(--color-rule)] bg-[var(--color-paper-2)] hover:border-[var(--color-ink)]"
                  }`}
                  aria-label="Pilih atau seret banner sampul penerbit"
                >
                  {headerImageUrl ? (
                    <>
                      <img
                        src={headerImageUrl}
                        alt="Pratinjau banner sampul penerbit"
                        className="size-full object-cover"
                      />
                      <span className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-xs transition-opacity">
                        <Camera className="size-5 mb-1" aria-hidden="true" />
                        <span>Ganti Banner Sampul</span>
                      </span>
                    </>
                  ) : (
                    <span className="flex flex-col items-center justify-center p-4 text-center pointer-events-none">
                      <Camera
                        className="size-6 opacity-60 mb-1"
                        aria-hidden="true"
                      />
                      <span className="text-xs font-medium text-[var(--color-ink)]">
                        Unggah Banner Sampul (rasio 3:1)
                      </span>
                      <span className="text-[11px] font-mono text-[var(--color-muted)] mt-0.5">
                        JPG, PNG, WebP — Maks. 5MB
                      </span>
                    </span>
                  )}
                </button>

                <input
                  id="publisher-banner-upload"
                  name="publisherBannerFile"
                  aria-label="Unggah banner penerbit"
                  ref={bannerInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file)
                      void processImageFile(file, (data) =>
                        setHeaderImageUrl(data),
                      );
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
                  <Label
                    htmlFor="pub-ikapi"
                    className="text-xs font-medium text-foreground"
                  >
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
                  <Label
                    htmlFor="pub-city"
                    className="text-xs font-medium text-foreground"
                  >
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
                  <Label
                    htmlFor="pub-address"
                    className="text-xs font-medium text-foreground"
                  >
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
                  <Label
                    htmlFor="pub-doc-title"
                    className="text-xs font-medium text-foreground"
                  >
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
                  <Label
                    htmlFor="pub-doc-url"
                    className="text-xs font-medium text-foreground"
                  >
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

          {/* ================= BAGIAN 2: KONTAK & TOPIK KURASI ================= */}
          <section className="space-y-8">
            <h2 className="font-serif text-xl font-bold text-[var(--color-ink)]">
              Kontak &amp; Fokus Kurasi
            </h2>

            {/* Field: Kontak Publik */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-8 pt-2">
              <div className="w-full sm:w-56 shrink-0 space-y-1">
                <Label className="text-sm font-semibold text-[var(--color-ink)]">
                  Kontak Publik
                </Label>
                <p className="text-[11px] text-[var(--color-muted)]">
                  Tautan ini tampil di halaman profil publik penerbit.
                </p>
              </div>

              <div className="flex-1 max-w-xl space-y-3">
                {/* Email */}
                <div className="flex items-center gap-3">
                  <Mail
                    className="size-4 text-[var(--color-muted)] shrink-0"
                    aria-hidden="true"
                  />
                  <Input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="Email resmi redaksi (redaksi@penerbit.id)"
                    className="min-h-11 text-xs bg-[var(--color-paper-2)]"
                  />
                </div>

                {/* X / Twitter */}
                <div className="flex items-center gap-3">
                  <XTwitterIcon className="size-4 text-[var(--color-muted)] shrink-0" />
                  <div className="flex-1 flex items-center rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper-2)] px-3 py-2">
                    <span className="text-xs text-[var(--color-muted)] font-mono shrink-0 mr-1.5">
                      x.com/
                    </span>
                    <input
                      type="text"
                      value={twitterHandle}
                      onChange={(e) =>
                        setTwitterHandle(e.target.value.replace(/^@/, ""))
                      }
                      placeholder="username"
                      className="w-full bg-transparent text-xs font-mono text-[var(--color-ink)] outline-hidden"
                    />
                  </div>
                </div>

                {/* Instagram */}
                <div className="flex items-center gap-3">
                  <InstagramIcon className="size-4 text-[var(--color-muted)] shrink-0" />
                  <div className="flex-1 flex items-center rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper-2)] px-3 py-2">
                    <span className="text-xs text-[var(--color-muted)] font-mono shrink-0 mr-1.5">
                      instagram.com/
                    </span>
                    <input
                      type="text"
                      value={instagramHandle}
                      onChange={(e) =>
                        setInstagramHandle(e.target.value.replace(/^@/, ""))
                      }
                      placeholder="username"
                      className="w-full bg-transparent text-xs font-mono text-[var(--color-ink)] outline-hidden"
                    />
                  </div>
                </div>

                {/* Website */}
                <div className="flex items-center gap-3">
                  <Globe
                    className="size-4 text-[var(--color-muted)] shrink-0"
                    aria-hidden="true"
                  />
                  <Input
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://penerbit.id"
                    className="min-h-11 text-xs font-mono bg-[var(--color-paper-2)]"
                  />
                </div>
              </div>
            </div>

            {/* Field: Topik Kurasi */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-8 pt-2">
              <div className="w-full sm:w-56 shrink-0 space-y-1">
                <Label className="text-sm font-semibold text-[var(--color-ink)]">
                  Fokus Topik Kurasi
                </Label>
              </div>

              <div className="flex-1 max-w-xl space-y-3">
                {/* Selected Topics List */}
                <div className="flex flex-wrap items-center gap-2">
                  {topics.map((topic) => (
                    <span
                      key={topic}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-paper-2)] border border-[var(--color-rule)] text-xs font-medium text-[var(--color-ink)]"
                    >
                      <span>{topic}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTopic(topic)}
                        className="hover:text-[var(--color-error)] cursor-pointer transition-colors"
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
                        className="min-h-11 text-xs w-36 font-sans"
                        autoFocus
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleAddTopic(newTopicInput)}
                        className="min-h-11 px-3 text-xs bg-[var(--color-accent)] text-[var(--color-accent-ink)]"
                      >
                        Tambah
                      </Button>
                      <button
                        type="button"
                        onClick={() => setIsAddingTopic(false)}
                        className="text-[var(--color-muted)] hover:text-[var(--color-ink)] p-2 text-xs"
                      >
                        Batal
                      </button>
                    </div>
                  ) : (
                    topics.length < MAX_PUBLISHER_TOPICS && (
                      <button
                        type="button"
                        onClick={() => setIsAddingTopic(true)}
                        className="inline-flex min-h-11 items-center gap-1 px-3 py-1 rounded-full border border-dashed border-[var(--color-rule)] hover:border-[var(--color-ink)] text-xs text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors cursor-pointer"
                      >
                        <Plus className="size-3" />
                        <span>Tambah topik...</span>
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
                    {PRESET_TOPICS.filter((t) => !topics.includes(t)).map(
                      (preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => handleAddTopic(preset)}
                          className="text-[11px] px-2 py-0.5 rounded-md bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/40 transition-colors cursor-pointer"
                        >
                          + {preset}
                        </button>
                      ),
                    )}
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground leading-relaxed pt-1">
                  Topik kurasi ({topics.length} / {MAX_PUBLISHER_TOPICS})
                  membantu penulis menemukan penerbit yang sesuai dengan
                  kategori naskahnya.
                </p>

                <div className="pt-3 space-y-3 border-t border-border/60">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isAcceptingSubmissions}
                      onChange={(e) =>
                        setIsAcceptingSubmissions(e.target.checked)
                      }
                      className="mt-0.5 size-4 cursor-pointer accent-[var(--color-accent)]"
                    />
                    <span className="text-xs leading-relaxed text-foreground">
                      Buka penerimaan naskah dari penulis independen
                    </span>
                  </label>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="pub-submission-guidelines"
                      className="text-xs font-medium text-foreground"
                    >
                      Panduan Kirim Naskah (Opsional)
                    </Label>
                    <Textarea
                      id="pub-submission-guidelines"
                      rows={3}
                      value={submissionGuidelines}
                      onChange={(e) => setSubmissionGuidelines(e.target.value)}
                      placeholder="Contoh: Sertakan sinopsis utuh dan 3 bab awal berbahasa Indonesia..."
                      className="text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <hr className="border-border/60" />

          {/* ================= BAGIAN 3: TIM REDAKSI & PENULIS ================= */}
          <section className="space-y-8">
            <h2 className="font-serif text-xl font-bold text-[var(--color-ink)]">
              Tim Redaksi &amp; Penulis Rekanan
            </h2>

            {/* Row: Pemilik Penerbit */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-8 pt-2">
              <div className="w-full sm:w-56 shrink-0 space-y-1">
                <Label className="text-sm font-semibold text-[var(--color-ink)]">
                  Pemilik Penerbit
                </Label>
              </div>

              <div className="flex-1 max-w-xl">
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper-2)]">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-[var(--color-paper-3)] border border-[var(--color-rule)] flex items-center justify-center font-bold text-sm text-[var(--color-ink)] overflow-hidden">
                      {myProfile?.image ? (
                        <img
                          src={myProfile.image}
                          alt={myProfile.name}
                          className="size-full object-cover"
                        />
                      ) : (
                        <span>
                          {(myProfile?.name || "U").slice(0, 1).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-xs text-[var(--color-ink)]">
                        {myProfile?.name || "Pengguna AnzaBook"}
                      </p>
                      <p className="text-[11px] text-[var(--color-muted)] font-mono">
                        @{myProfile?.username || "nakama"} — Pemilik Akun Utama
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-md bg-[var(--color-green-soft)] text-[var(--color-green)] border border-[var(--color-green)]/30">
                    Pemilik
                  </span>
                </div>
              </div>
            </div>

            {/* Row: Editor Redaksi */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-8 pt-2">
              <div className="w-full sm:w-56 shrink-0 space-y-1">
                <Label className="text-sm font-semibold text-[var(--color-ink)]">
                  Editor Redaksi
                </Label>
              </div>

              <div className="flex-1 max-w-xl space-y-3">
                <p className="text-xs text-[var(--color-muted)] leading-relaxed">
                  Editor dapat meninjau naskah masuk, menyunting bab, serta
                  menerbitkan buku ke katalog resmi penerbit.
                </p>

                {editors.length > 0 && (
                  <div className="space-y-2">
                    {editors.map((editor) => (
                      <div
                        key={editor}
                        className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/30 text-xs"
                      >
                        <span className="font-mono text-foreground">
                          {editor}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setEditors(editors.filter((e) => e !== editor))
                          }
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
                    className="inline-flex min-h-11 items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-border hover:border-foreground text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    <Plus className="size-3.5" />
                    <span>Tambah Editor Redaksi...</span>
                  </button>
                )}
              </div>
            </div>

            {/* Row: Penulis Rekanan */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-8 pt-2">
              <div className="w-full sm:w-56 shrink-0 space-y-1">
                <Label className="text-sm font-semibold text-foreground">
                  Penulis Rekanan
                </Label>
              </div>

              <div className="flex-1 max-w-xl space-y-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Penulis rekanan tetap dapat mengirim naskah lewat jalur
                  prioritas meskipun penerimaan publik sedang ditutup.
                </p>

                {approvedWriters.length > 0 && (
                  <div className="space-y-2">
                    {approvedWriters.map((writer) => (
                      <div
                        key={writer}
                        className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/30 text-xs"
                      >
                        <span className="font-mono text-foreground">
                          {writer}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setApprovedWriters(
                              approvedWriters.filter((w) => w !== writer),
                            )
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
                    className="inline-flex min-h-11 items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-border hover:border-foreground text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    <Plus className="size-3.5" />
                    <span>Tambah Penulis Rekanan...</span>
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* ================= BOTTOM BAR ================= */}
          <div className="pt-8 border-t border-[var(--color-rule)] flex items-center justify-between">
            <Link
              to="/app"
              search={{ tab: "profile" }}
              className="text-xs text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors"
            >
              Batalkan
            </Link>

            <Button
              type="submit"
              disabled={
                applyPublisherMutation.isPending ||
                uploadImageMutation.isPending ||
                !name.trim()
              }
              className="bg-[var(--color-accent)] text-[var(--color-accent-ink)] hover:brightness-95 text-xs px-6 min-h-11 rounded-xl font-semibold cursor-pointer"
            >
              {applyPublisherMutation.isPending
                ? "Mendaftarkan Penerbit..."
                : "Daftarkan Penerbit"}
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
