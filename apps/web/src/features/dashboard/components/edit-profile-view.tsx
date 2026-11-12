import { useState, useRef, useEffect, type FormEvent, type ChangeEvent } from "react";
import {
  ArrowLeft,
  Camera,
  Check,
  CheckCircle,
  ExternalLink,
  Globe,
  Layers,
  MapPin,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMySocialProfile, useUpdateSocialProfile } from "@/features/social/hooks";
import { ImageCropModal } from "@/features/social/components/image-crop-modal";
import { authClient } from "@/lib/auth-client";
import { ApiError } from "@/lib/api/client";

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

function LinkedInIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.2a1.66 1.66 0 0 0-1.66 1.66c0 .92.74 1.66 1.66 1.66.92 0 1.66-.74 1.66-1.66 0-.92-.74-1.66-1.66-1.66Z" />
    </svg>
  );
}

type EditProfileViewProps = {
  onBack: () => void;
};

export function EditProfileView({ onBack }: EditProfileViewProps) {
  const { data: profile, isLoading } = useMySocialProfile();
  const updateProfileMutation = useUpdateSocialProfile();

  // Profile Form States
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [image, setImage] = useState("");
  const [headerImage, setHeaderImage] = useState("");
  const [locationCity, setLocationCity] = useState("");

  // Social Links
  const [instagram, setInstagram] = useState("");
  const [twitter, setTwitter] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [website, setWebsite] = useState("");

  // Status & Feedback
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Hidden File Inputs
  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);

  // Cropper Modal State
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropSourceUrl, setCropSourceUrl] = useState("");
  const [cropTarget, setCropTarget] = useState<"avatar" | "banner">("avatar");

  // Handle Edit Substack Modal State
  const [isHandleModalOpen, setIsHandleModalOpen] = useState(false);
  const [handleChoice, setHandleChoice] = useState<"current" | "suggested" | "custom">("current");
  const [customHandleInput, setCustomHandleInput] = useState("");
  const [handleError, setHandleError] = useState<string | null>(null);

  // Pre-fill existing data when profile is loaded
  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setUsername(profile.username || "");
      setBio(profile.bio || "");
      setImage(profile.image || "");
      setHeaderImage(profile.headerImage || profile.socialLinks?.headerImage || "");
      setLocationCity(profile.locationCity || "");
      setInstagram(profile.socialLinks?.instagram || "");
      setTwitter(profile.socialLinks?.twitter || "");
      setLinkedin(profile.socialLinks?.linkedin || "");
      setWebsite(profile.socialLinks?.website || "");
    }
  }, [profile]);

  // Suggested Handle (Substack Style: e.g. "tuanlangit1")
  const suggestedHandle =
    (name || profile?.name || "nakama")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 20) + "1";

  // Handle Local Device File Selection for Avatar
  const handleAvatarFileSelected = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMsg("Pilih berkas gambar yang valid (JPG, PNG, atau WebP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("Ukuran berkas melebihi batas 5MB. Silakan pilih foto dengan ukuran maksimal 5MB.");
      return;
    }

    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = () => {
      setCropSourceUrl(reader.result as string);
      setCropTarget("avatar");
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Handle Local Device File Selection for Banner
  const handleBannerFileSelected = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMsg("Pilih berkas gambar yang valid (JPG, PNG, atau WebP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("Ukuran berkas melebihi batas 5MB. Silakan pilih gambar header dengan ukuran maksimal 5MB.");
      return;
    }

    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = () => {
      setCropSourceUrl(reader.result as string);
      setCropTarget("banner");
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Confirm Cropped Image from CropModal
  const handleCropComplete = (croppedBase64: string) => {
    if (cropTarget === "avatar") {
      setImage(croppedBase64);
    } else {
      setHeaderImage(croppedBase64);
    }
    setCropModalOpen(false);
  };

  // Save Handle from Substack Modal
  const handleSaveHandle = () => {
    setHandleError(null);
    let chosen = "";
    if (handleChoice === "current") {
      chosen = profile?.username || username;
    } else if (handleChoice === "suggested") {
      chosen = suggestedHandle;
    } else {
      const cleanCustom = customHandleInput
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "")
        .slice(0, 30);
      if (cleanCustom.length < 3) {
        setHandleError("Handle khusus minimal 3 karakter (hanya huruf, angka, underscore).");
        return;
      }
      chosen = cleanCustom;
    }

    setUsername(chosen);
    setIsHandleModalOpen(false);
  };

  // Submit Profile Changes
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg("Nama tidak boleh kosong.");
      return;
    }

    try {
      // 1. Update Social Profile via API
      await updateProfileMutation.mutateAsync({
        name: trimmedName,
        username: username.trim() || undefined,
        bio: bio.trim(),
        image: image || undefined,
        locationCity: locationCity.trim() || undefined,
        socialLinks: {
          instagram: instagram.trim() || undefined,
          twitter: twitter.trim() || undefined,
          linkedin: linkedin.trim() || undefined,
          website: website.trim() || undefined,
          headerImage: headerImage || undefined,
        },
      });

      // 2. Also sync auth user record if name or image changed
      await authClient.updateUser({
        name: trimmedName,
        image: image || undefined,
      });

      setSuccessMsg("Profil berhasil diperbarui!");
      setTimeout(() => {
        onBack();
      }, 700);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMsg(err.message);
      } else if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Gagal menyimpan profil. Silakan coba beberapa saat lagi.");
      }
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center text-xs font-mono text-muted-foreground animate-pulse">
        Memuat formulir profil...
      </div>
    );
  }

  const avatarLetter = (name || profile?.name || "N").slice(0, 1).toUpperCase();

  return (
    <div className="space-y-6 max-w-3xl pb-12">
      {/* Top Breadcrumb & Action Header */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-border">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <ArrowLeft className="size-4" />
          <span>Kembali ke Profil</span>
        </button>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={onBack}
            className="text-xs h-9 cursor-pointer"
          >
            Batal
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={updateProfileMutation.isPending}
            className="bg-foreground text-background hover:opacity-90 text-xs font-semibold h-9 px-5 rounded-lg cursor-pointer"
          >
            {updateProfileMutation.isPending ? "Menyimpan..." : "Done (Simpan)"}
          </Button>
        </div>
      </div>

      {/* Feedback Alerts */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs space-y-1">
          <p className="font-bold">Gagal Memperbarui Profil</p>
          <p>{errorMsg}</p>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle className="size-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* ================================================================= */}
        {/* 1. VISUAL BRANDING: HEADER & AVATAR FROM LOCAL DEVICE             */}
        {/* ================================================================= */}
        <section className="space-y-3">
          <div className="relative rounded-2xl overflow-hidden border border-border bg-card shadow-xs">
            {/* Header / Banner Dropzone & Click Area */}
            <div
              onClick={() => bannerFileInputRef.current?.click()}
              className="w-full h-44 sm:h-52 relative bg-zinc-900 flex items-center justify-center cursor-pointer group select-none overflow-hidden"
              title="Klik untuk memilih gambar header dari perangkat"
            >
              {headerImage ? (
                <>
                  <img
                    src={headerImage}
                    alt="Header Preview"
                    className="size-full object-cover group-hover:opacity-85 transition-opacity"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity">
                    <Camera className="size-6 mb-1" />
                    <span className="text-xs font-medium">Ganti gambar header</span>
                    <span className="text-[10px] text-zinc-300 font-mono mt-0.5">Maks. 5MB</span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center p-4 text-center text-zinc-400 group-hover:text-white transition-colors relative z-10">
                  <div className="size-10 rounded-full bg-zinc-800/80 border border-zinc-700 flex items-center justify-center mb-2">
                    <Camera className="size-5" />
                  </div>
                  <p className="text-xs font-medium">Letakkan gambar header Anda di sini</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Klik untuk memilih gambar dari perangkat • Rasio 3:1 (Maks. 5MB)
                  </p>
                </div>
              )}

              {/* AnzaBook watermark */}
              <div className="absolute bottom-2 right-3 z-10 pointer-events-none opacity-40 text-[10px] font-mono text-zinc-400">
                AnzaBook Pustaka Rakyat
              </div>
            </div>

            {/* Profile Avatar Overlay Positioned over Banner */}
            <div className="p-6 pt-0 relative flex flex-col sm:flex-row items-center sm:items-end justify-between gap-4 -mt-14 sm:-mt-16">
              <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                {/* Avatar Click to Upload */}
                <div
                  onClick={() => avatarFileInputRef.current?.click()}
                  className="size-24 sm:size-28 rounded-full bg-zinc-800 border-4 border-card flex items-center justify-center font-bold text-3xl text-foreground shrink-0 overflow-hidden shadow-lg cursor-pointer group relative ring-1 ring-border/80"
                  title="Klik untuk memilih foto profil dari perangkat"
                >
                  {image ? (
                    <img
                      src={image}
                      alt="Avatar"
                      className="size-full object-cover group-hover:opacity-80 transition-opacity"
                    />
                  ) : (
                    <span>{avatarLetter}</span>
                  )}

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity">
                    <Camera className="size-5" />
                    <span className="text-[9px] mt-0.5 font-medium">Ubah</span>
                  </div>
                </div>

                <div className="space-y-1 pt-2 sm:pt-6">
                  <h3 className="font-serif text-lg font-bold text-foreground">
                    Foto &amp; Header Profil
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Klik pada foto profil atau banner di atas untuk mengunggah dari perangkat lokal.
                  </p>
                </div>
              </div>

              {/* Quick Actions for Images */}
              <div className="flex items-center gap-2">
                {image && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setImage("")}
                    className="h-8 text-xs border-border/80 cursor-pointer"
                  >
                    <Trash2 className="size-3.5 mr-1 text-muted-foreground" />
                    <span>Hapus Foto</span>
                  </Button>
                )}
                {headerImage && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setHeaderImage("")}
                    className="h-8 text-xs border-border/80 cursor-pointer"
                  >
                    <Trash2 className="size-3.5 mr-1 text-muted-foreground" />
                    <span>Hapus Header</span>
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Hidden File Inputs */}
          <input
            ref={avatarFileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleAvatarFileSelected}
            className="hidden"
          />
          <input
            ref={bannerFileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleBannerFileSelected}
            className="hidden"
          />
        </section>

        {/* ================================================================= */}
        {/* 2. GENERAL PROFILE: NAME, HANDLE, BIO                             */}
        {/* ================================================================= */}
        <section className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-xs">
          <h3 className="font-serif text-base font-bold text-foreground border-b border-border pb-3">
            Informasi Umum
          </h3>

          {/* Name Field */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-name" className="text-xs font-semibold text-foreground">
              Nama Tampilan <span className="text-red-500">*</span>
            </Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama yang tampil di profil dan sampul buku"
              className="text-sm rounded-lg"
              required
            />
            <p className="text-[11px] text-muted-foreground">
              Penulis yang memakai nama pena cukup mengisinya di sini.
            </p>
          </div>

          {/* Handle Field (Substack Aesthetic) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">Handle</Label>
            <div className="flex items-center justify-between p-3 rounded-lg border border-border/80 bg-muted/20">
              <div className="font-mono text-xs sm:text-sm text-foreground flex items-center gap-1">
                <span className="text-muted-foreground">@</span>
                <span className="font-bold">{username || "belum_diatur"}</span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setCustomHandleInput(username);
                  setHandleChoice("current");
                  setHandleError(null);
                  setIsHandleModalOpen(true);
                }}
                className="h-8 px-3 text-xs font-medium border-border/80 cursor-pointer"
              >
                Edit Handle
              </Button>
            </div>
            <p className="text-[11px] font-mono text-muted-foreground">
              Tautan profil Anda: <span className="text-foreground">anzabook.id/u/@{username || "username"}</span>
            </p>
          </div>

          {/* Bio Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-bio" className="text-xs font-semibold text-foreground">
                Bio
              </Label>
              <span className="text-[11px] font-mono text-muted-foreground">
                {bio.length} / 1000
              </span>
            </div>
            <Textarea
              id="edit-bio"
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 1000))}
              placeholder="Tuliskan catatan singkat tentang ketertarikan bacaan atau karya Anda..."
              className="text-sm rounded-lg leading-relaxed resize-none"
            />
          </div>
        </section>

        {/* ================================================================= */}
        {/* 3. PENCITRAAN MEREK & IDENTITAS KEPENULISAN                        */}
        {/* ================================================================= */}
        <section className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-xs">
          <div className="border-b border-border pb-3">
            <h3 className="font-serif text-base font-bold text-foreground">
              Domisili
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Kota yang tampil di profil publik Anda.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="space-y-1.5">
              <Label htmlFor="edit-city" className="text-xs font-semibold text-foreground">
                Kota Domisili (Opsional)
              </Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="edit-city"
                  value={locationCity}
                  onChange={(e) => setLocationCity(e.target.value)}
                  placeholder="Contoh: Jakarta, Bandung, Yogyakarta"
                  className="pl-9 text-xs h-10 rounded-lg"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* 4. SOCIAL MEDIA & TAUTAN EKSTERNAL                                */}
        {/* ================================================================= */}
        <section className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-xs">
          <div className="border-b border-border pb-3">
            <h3 className="font-serif text-base font-bold text-foreground">
              Tautan Media Sosial &amp; Website
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Hubungkan pembaca dengan kanal publik, media sosial, atau portofolio pribadi Anda.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Instagram */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-ig" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <InstagramIcon className="size-3.5 text-muted-foreground" />
                <span>Instagram</span>
              </Label>
              <Input
                id="edit-ig"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="@username atau URL lengkap"
                className="text-xs h-10 font-mono rounded-lg"
              />
            </div>

            {/* X / Twitter */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-twitter" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <XTwitterIcon className="size-3.5 text-muted-foreground" />
                <span>X / Twitter</span>
              </Label>
              <Input
                id="edit-twitter"
                value={twitter}
                onChange={(e) => setTwitter(e.target.value)}
                placeholder="@username atau URL lengkap"
                className="text-xs h-10 font-mono rounded-lg"
              />
            </div>

            {/* LinkedIn */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-linkedin" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <LinkedInIcon className="size-3.5 text-muted-foreground" />
                <span>LinkedIn</span>
              </Label>
              <Input
                id="edit-linkedin"
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
                placeholder="profil-linkedin atau URL"
                className="text-xs h-10 font-mono rounded-lg"
              />
            </div>

            {/* Website Pribadi */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-website" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Globe className="size-3.5 text-muted-foreground" />
                <span>Website Pribadi / Blog</span>
              </Label>
              <Input
                id="edit-website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://situs-anda.com"
                className="text-xs h-10 font-mono rounded-lg"
              />
            </div>
          </div>
        </section>

        {/* Bottom Save Bar */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="text-xs h-10 px-5 cursor-pointer"
          >
            Batal
          </Button>
          <Button
            type="submit"
            disabled={updateProfileMutation.isPending}
            className="bg-foreground text-background hover:opacity-90 text-xs font-semibold h-10 px-6 rounded-lg cursor-pointer"
          >
            {updateProfileMutation.isPending ? "Menyimpan Perubahan..." : "Simpan Perubahan Profil"}
          </Button>
        </div>
      </form>

      {/* Canvas Image Cropper Modal */}
      <ImageCropModal
        isOpen={cropModalOpen}
        onCancel={() => setCropModalOpen(false)}
        imageSrc={cropSourceUrl}
        title={
          cropTarget === "avatar"
            ? "Potong Foto Profil"
            : "Potong Gambar Header"
        }
        aspectRatio={cropTarget === "avatar" ? 1 : 3}
        isCircularMask={cropTarget === "avatar"}
        onConfirm={handleCropComplete}
      />

      {/* Substack-Style Handle Selection Modal */}
      {isHandleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-serif text-lg font-bold text-foreground">
                Ganti Handle / Username
              </h3>
              <button
                type="button"
                onClick={() => setIsHandleModalOpen(false)}
                className="p-1 rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Handle Anda digunakan untuk tautan profil publik (misal: <code>anzabook.id/u/@{username}</code>) dan sebutan catatan marjinalia.
            </p>

            {handleError && (
              <p className="text-xs text-destructive font-mono">{handleError}</p>
            )}

            <div className="space-y-3">
              {/* Option 1: Current Handle */}
              <label
                onClick={() => setHandleChoice("current")}
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                  handleChoice === "current"
                    ? "border-foreground bg-muted/40"
                    : "border-border hover:bg-muted/20"
                }`}
              >
                <div>
                  <p className="text-xs font-semibold text-foreground font-mono">
                    @{profile?.username || username}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Gunakan handle saat ini</p>
                </div>
                <div
                  className={`size-4 rounded-full border flex items-center justify-center ${
                    handleChoice === "current"
                      ? "border-foreground bg-foreground text-background"
                      : "border-muted-foreground"
                  }`}
                >
                  {handleChoice === "current" && <Check className="size-3" />}
                </div>
              </label>

              {/* Option 2: Suggested Handle */}
              <label
                onClick={() => setHandleChoice("suggested")}
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                  handleChoice === "suggested"
                    ? "border-foreground bg-muted/40"
                    : "border-border hover:bg-muted/20"
                }`}
              >
                <div>
                  <p className="text-xs font-semibold text-foreground font-mono">
                    @{suggestedHandle}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Saran otomatis berbasis nama</p>
                </div>
                <div
                  className={`size-4 rounded-full border flex items-center justify-center ${
                    handleChoice === "suggested"
                      ? "border-foreground bg-foreground text-background"
                      : "border-muted-foreground"
                  }`}
                >
                  {handleChoice === "suggested" && <Check className="size-3" />}
                </div>
              </label>

              {/* Option 3: Custom Handle */}
              <label
                onClick={() => setHandleChoice("custom")}
                className={`p-3 rounded-xl border flex flex-col gap-2 cursor-pointer transition-colors ${
                  handleChoice === "custom"
                    ? "border-foreground bg-muted/40"
                    : "border-border hover:bg-muted/20"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-foreground">Tulis handle sendiri</p>
                  <div
                    className={`size-4 rounded-full border flex items-center justify-center ${
                      handleChoice === "custom"
                        ? "border-foreground bg-foreground text-background"
                        : "border-muted-foreground"
                    }`}
                  >
                    {handleChoice === "custom" && <Check className="size-3" />}
                  </div>
                </div>

                {handleChoice === "custom" && (
                  <div className="pt-1">
                    <Input
                      value={customHandleInput}
                      onChange={(e) => setCustomHandleInput(e.target.value)}
                      placeholder="contoh: puan_lestari"
                      className="text-xs font-mono h-9"
                      autoFocus
                    />
                  </div>
                )}
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsHandleModalOpen(false)}
                className="text-xs cursor-pointer"
              >
                Batal
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSaveHandle}
                className="bg-foreground text-background hover:opacity-90 text-xs font-semibold cursor-pointer"
              >
                Terapkan Handle
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
