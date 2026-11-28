import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  Camera,
  Globe,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Trash2,
  X,
} from "lucide-react";
import type { CommunityCalendarDto } from "@starter/shared/types";
import { InstagramIcon, XTwitterIcon } from "@/components/profile/social-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageCropModal } from "@/features/social/components/image-crop-modal";
import {
  useUpdateCalendarProfile,
  useUploadMediaImage,
} from "@/features/social/hooks";
import { ApiError } from "@/lib/api/client";
import { isUsableAssetUrl } from "@/lib/media-url";

type EditCommunityProfileDialogProps = {
  open: boolean;
  onClose: () => void;
  calendar: CommunityCalendarDto;
};

function dataUrlToJpegFile(dataUrl: string, filename: string): File {
  const [, base64 = ""] = dataUrl.split(",");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], filename, { type: "image/jpeg" });
}

export function EditCommunityProfileDialog({
  open,
  onClose,
  calendar,
}: EditCommunityProfileDialogProps) {
  if (!open) return null;
  return (
    <EditCommunityProfileDialogContent
      key={calendar.id}
      calendar={calendar}
      onClose={onClose}
    />
  );
}

function EditCommunityProfileDialogContent({
  calendar,
  onClose,
}: {
  calendar: CommunityCalendarDto;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pressedOutsideRef = useRef(false);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();

  const updateProfileMutation = useUpdateCalendarProfile();
  const uploadMediaMutation = useUploadMediaImage();

  const [name, setName] = useState(calendar.name || "");
  const [avatarUrl, setAvatarUrl] = useState(calendar.avatarUrl || "");
  const [coverUrl, setCoverUrl] = useState(calendar.coverUrl || "");
  const [city, setCity] = useState(calendar.city || "");
  const [contactEmail, setContactEmail] = useState(calendar.contactEmail || "");
  const [description, setDescription] = useState(calendar.description || "");
  const [instagram, setInstagram] = useState(
    calendar.socialLinks?.instagram || "",
  );
  const [twitter, setTwitter] = useState(calendar.socialLinks?.twitter || "");
  const [website, setWebsite] = useState(calendar.socialLinks?.website || "");
  const [whatsapp, setWhatsapp] = useState(
    calendar.socialLinks?.whatsapp || "",
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [uploadingTarget, setUploadingTarget] = useState<
    "avatar" | "banner" | null
  >(null);

  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropSourceUrl, setCropSourceUrl] = useState("");
  const [cropTarget, setCropTarget] = useState<"avatar" | "banner">("avatar");

  const isBusy =
    updateProfileMutation.isPending || uploadMediaMutation.isPending;

  // Temporarily hide the native <dialog> while ImageCropModal (non-dialog fixed overlay) is open
  // so ImageCropModal is never trapped underneath the browser top layer.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (!cropModalOpen) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [cropModalOpen]);

  const handleSelectImageFile = (
    e: ChangeEvent<HTMLInputElement>,
    target: "avatar" | "banner",
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMsg("Pilih berkas gambar yang valid (JPG, PNG, atau WebP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg(
        "Ukuran berkas melebihi batas 5MB. Silakan pilih gambar dengan ukuran maksimal 5MB.",
      );
      return;
    }

    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = () => {
      setCropSourceUrl(reader.result as string);
      setCropTarget(target);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedBase64: string) => {
    const target = cropTarget;
    setCropModalOpen(false);
    setErrorMsg(null);
    setUploadingTarget(target);

    try {
      const file = dataUrlToJpegFile(
        croppedBase64,
        target === "avatar" ? "community-logo.jpg" : "community-banner.jpg",
      );
      const uploaded = await uploadMediaMutation.mutateAsync(file);
      if (target === "avatar") {
        setAvatarUrl(uploaded.url);
      } else {
        setCoverUrl(uploaded.url);
      }
    } catch (err) {
      if (err instanceof ApiError || err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Gagal mengunggah gambar komunitas. Silakan coba lagi.");
      }
    } finally {
      setUploadingTarget(null);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isBusy) return;
    setErrorMsg(null);

    const trimmedName = name.trim();
    if (trimmedName.length < 3) {
      setErrorMsg("Nama komunitas minimal 3 karakter.");
      return;
    }

    try {
      await updateProfileMutation.mutateAsync({
        slug: calendar.slug,
        input: {
          name: trimmedName,
          avatarUrl: avatarUrl.trim(),
          coverUrl: coverUrl.trim(),
          city: city.trim(),
          contactEmail: contactEmail.trim(),
          description: description.trim(),
          socialLinks: {
            instagram: instagram.trim(),
            twitter: twitter.trim(),
            website: website.trim(),
            whatsapp: whatsapp.trim(),
          },
        },
      });
      onClose();
    } catch (err) {
      if (err instanceof ApiError || err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Gagal memperbarui profil komunitas. Silakan coba lagi.");
      }
    }
  };

  const isOutsideDialog = (e: React.PointerEvent<HTMLDialogElement>) => {
    const dialog = dialogRef.current;
    if (!dialog) return false;
    const rect = dialog.getBoundingClientRect();
    return (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    );
  };

  const showBanner = isUsableAssetUrl(coverUrl);
  const showAvatar = isUsableAssetUrl(avatarUrl);
  const avatarInitial = (name || calendar.name || "K")
    .slice(0, 1)
    .toUpperCase();

  return (
    <>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        data-lenis-prevent="true"
        {...({ closedby: isBusy ? "none" : "any" } as Record<string, string>)}
        onCancel={(e) => {
          e.preventDefault();
          if (!isBusy) onClose();
        }}
        onPointerDown={(e) => {
          pressedOutsideRef.current =
            e.target === dialogRef.current && isOutsideDialog(e);
        }}
        onPointerUp={(e) => {
          if (
            pressedOutsideRef.current &&
            e.target === dialogRef.current &&
            isOutsideDialog(e) &&
            !isBusy
          ) {
            onClose();
          }
          pressedOutsideRef.current = false;
        }}
        className="m-auto w-[calc(100%-1.5rem)] max-w-2xl h-[min(90dvh,48rem)] max-h-[90dvh] overflow-hidden rounded-2xl border border-[var(--color-rule)] bg-[var(--color-sheet)] p-0 text-[var(--color-ink)] shadow-[var(--shadow-lift)] backdrop:bg-black/60 backdrop:backdrop-blur-xs open:flex open:flex-col"
      >
        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          {/* Sticky Top Bar */}
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--color-rule)] bg-[var(--color-sheet)] px-5 py-3.5">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                disabled={isBusy}
                onClick={onClose}
                aria-label="Tutup editor profil komunitas"
                className="inline-flex min-h-11 min-w-11 -ml-2 shrink-0 items-center justify-center rounded-lg text-[var(--color-muted)] hover:bg-[var(--color-paper-3)] hover:text-[var(--color-ink)] cursor-pointer disabled:opacity-45"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
              <h2
                id={titleId}
                className="font-serif text-base sm:text-lg font-bold truncate text-[var(--color-ink)]"
              >
                Sunting Profil Komunitas
              </h2>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                disabled={isBusy}
                onClick={onClose}
                className="min-h-11 rounded-xl border-[var(--color-rule)] bg-[var(--color-paper)] px-4 text-xs font-medium text-[var(--color-ink)] hover:bg-[var(--color-paper-3)] cursor-pointer"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isBusy}
                className="min-h-11 rounded-xl bg-[var(--color-ink)] px-5 text-xs font-semibold text-[var(--color-paper)] hover:opacity-90 cursor-pointer"
              >
                {updateProfileMutation.isPending
                  ? "Menyimpan..."
                  : uploadMediaMutation.isPending
                    ? "Mengunggah..."
                    : "Simpan"}
              </Button>
            </div>
          </div>

          {/* Scrollable Body */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6 space-y-6">
            {errorMsg && (
              <div
                role="alert"
                className="rounded-xl border border-[var(--color-error)]/35 bg-[var(--color-error-soft)] px-4 py-3 text-xs text-[var(--color-ink)]"
              >
                <p className="font-semibold text-[var(--color-error)]">
                  Gagal Memperbarui Komunitas
                </p>
                <p className="mt-0.5">{errorMsg}</p>
              </div>
            )}

            {/* 1. Visual Branding: Clickable 3:1 Banner + Overlapping 1:1 Logo */}
            <section className="overflow-hidden rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper-2)]">
              <button
                type="button"
                disabled={isBusy}
                onClick={() => bannerFileInputRef.current?.click()}
                className="relative flex h-40 sm:h-48 w-full items-center justify-center overflow-hidden border-b border-[var(--color-rule)] bg-[var(--color-paper-3)] cursor-pointer group focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-focus)] disabled:cursor-wait"
                title="Klik untuk mengunggah banner komunitas (Rasio 3:1)"
              >
                {showBanner ? (
                  <>
                    <img
                      src={coverUrl}
                      alt="Pratinjau banner komunitas"
                      className="size-full object-cover group-hover:opacity-85 transition-opacity"
                    />
                    <span className="absolute inset-0 flex flex-col items-center justify-center bg-black/45 text-white opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">
                      {uploadingTarget === "banner" ? (
                        <Loader2
                          className="size-6 animate-spin mb-1"
                          aria-hidden="true"
                        />
                      ) : (
                        <Camera className="size-6 mb-1" aria-hidden="true" />
                      )}
                      <span className="text-xs font-medium">
                        {uploadingTarget === "banner"
                          ? "Mengunggah banner..."
                          : "Ganti gambar header (3:1)"}
                      </span>
                    </span>
                  </>
                ) : (
                  <span className="flex flex-col items-center justify-center p-4 text-center text-[var(--color-muted)] group-hover:text-[var(--color-ink)] transition-colors">
                    <span className="mb-2 flex size-10 items-center justify-center rounded-full border border-[var(--color-rule)] bg-[var(--color-paper)]">
                      {uploadingTarget === "banner" ? (
                        <Loader2
                          className="size-5 animate-spin"
                          aria-hidden="true"
                        />
                      ) : (
                        <Camera className="size-5" aria-hidden="true" />
                      )}
                    </span>
                    <span className="text-xs font-semibold">
                      {uploadingTarget === "banner"
                        ? "Mengunggah banner..."
                        : "Pilih gambar banner komunitas"}
                    </span>
                    <span className="mt-0.5 font-mono text-[11px]">
                      Rasio 3:1 • Maks. 5MB
                    </span>
                  </span>
                )}
              </button>

              <div className="px-5 pb-5">
                <div className="-mt-12 mb-3 flex flex-wrap items-end justify-between gap-3">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => avatarFileInputRef.current?.click()}
                    className="relative z-10 flex size-24 sm:size-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-[var(--color-paper-2)] bg-[var(--color-paper)] font-serif text-3xl font-bold text-[var(--color-ink)] shadow-sm cursor-pointer group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] disabled:cursor-wait"
                    title="Klik untuk mengunggah logo atau foto komunitas (1:1)"
                  >
                    {showAvatar ? (
                      <img
                        src={avatarUrl}
                        alt="Logo komunitas"
                        className="size-full object-cover group-hover:opacity-80 transition-opacity"
                      />
                    ) : (
                      <span>{avatarInitial}</span>
                    )}

                    <span className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">
                      {uploadingTarget === "avatar" ? (
                        <Loader2
                          className="size-5 animate-spin"
                          aria-hidden="true"
                        />
                      ) : (
                        <Camera className="size-5" aria-hidden="true" />
                      )}
                      <span className="mt-0.5 text-[10px] font-medium">
                        {uploadingTarget === "avatar" ? "Unggah..." : "Ubah"}
                      </span>
                    </span>
                  </button>

                  {(showAvatar || showBanner) && (
                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      {showAvatar && (
                        <Button
                          type="button"
                          variant="outline"
                          disabled={isBusy}
                          onClick={() => setAvatarUrl("")}
                          className="min-h-11 rounded-xl border-[var(--color-rule)] bg-[var(--color-paper)] px-3 text-xs text-[var(--color-ink)] hover:bg-[var(--color-paper-3)] cursor-pointer"
                        >
                          <Trash2
                            className="size-3.5 mr-1 text-[var(--color-muted)]"
                            aria-hidden="true"
                          />
                          <span>Hapus Logo</span>
                        </Button>
                      )}
                      {showBanner && (
                        <Button
                          type="button"
                          variant="outline"
                          disabled={isBusy}
                          onClick={() => setCoverUrl("")}
                          className="min-h-11 rounded-xl border-[var(--color-rule)] bg-[var(--color-paper)] px-3 text-xs text-[var(--color-ink)] hover:bg-[var(--color-paper-3)] cursor-pointer"
                        >
                          <Trash2
                            className="size-3.5 mr-1 text-[var(--color-muted)]"
                            aria-hidden="true"
                          />
                          <span>Hapus Banner</span>
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                <p className="text-xs text-[var(--color-muted)]">
                  Klik logo atau banner di atas untuk mengunggah dan memotong
                  gambar dari perangkat Anda.
                </p>
              </div>

              <input
                ref={avatarFileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                aria-label="Unggah logo komunitas"
                onChange={(e) => handleSelectImageFile(e, "avatar")}
                className="hidden"
              />
              <input
                ref={bannerFileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                aria-label="Unggah banner komunitas"
                onChange={(e) => handleSelectImageFile(e, "banner")}
                className="hidden"
              />
            </section>

            {/* 2. Identitas & Narahubung */}
            <section className="space-y-4 rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-5">
              <h3 className="border-b border-[var(--color-rule)] pb-2.5 font-serif text-base font-bold text-[var(--color-ink)]">
                Identitas Komunitas
              </h3>

              <div className="space-y-1.5">
                <Label
                  htmlFor="dlg-comm-name"
                  className="text-xs font-semibold text-[var(--color-ink)]"
                >
                  Nama Komunitas{" "}
                  <span className="text-[var(--color-error)]">*</span>
                </Label>
                <Input
                  id="dlg-comm-name"
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Klub Baca Senja"
                  required
                  className="min-h-11 rounded-lg border-[var(--color-rule)] bg-[var(--color-paper)] text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="dlg-comm-city"
                    className="text-xs font-semibold text-[var(--color-ink)]"
                  >
                    Kota
                  </Label>
                  <div className="relative">
                    <MapPin
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--color-muted)]"
                      aria-hidden="true"
                    />
                    <Input
                      id="dlg-comm-city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Contoh: Yogyakarta"
                      className="min-h-11 rounded-lg border-[var(--color-rule)] bg-[var(--color-paper)] pl-9 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="dlg-comm-email"
                    className="text-xs font-semibold text-[var(--color-ink)]"
                  >
                    Email Narahubung
                  </Label>
                  <div className="relative">
                    <Mail
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--color-muted)]"
                      aria-hidden="true"
                    />
                    <Input
                      id="dlg-comm-email"
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="halo@komunitas.id"
                      className="min-h-11 rounded-lg border-[var(--color-rule)] bg-[var(--color-paper)] pl-9 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="dlg-comm-desc"
                    className="text-xs font-semibold text-[var(--color-ink)]"
                  >
                    Deskripsi
                  </Label>
                  <span className="font-mono text-[11px] text-[var(--color-muted)]">
                    {description.length} / 2000
                  </span>
                </div>
                <Textarea
                  id="dlg-comm-desc"
                  rows={4}
                  value={description}
                  onChange={(e) =>
                    setDescription(e.target.value.slice(0, 2000))
                  }
                  placeholder="Ceritakan agenda rutin, minat bacaan, dan kegiatan komunitas..."
                  className="rounded-lg border-[var(--color-rule)] bg-[var(--color-paper)] text-sm leading-relaxed"
                />
              </div>
            </section>

            {/* 3. Tautan Sosial */}
            <section className="space-y-4 rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-5">
              <div className="border-b border-[var(--color-rule)] pb-2.5">
                <h3 className="font-serif text-base font-bold text-[var(--color-ink)]">
                  Tautan Sosial
                </h3>
                <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                  Hubungkan anggota dengan kanal publik dan grup diskusi
                  komunitas.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="dlg-comm-ig"
                    className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-ink)]"
                  >
                    <InstagramIcon className="size-3.5 text-[var(--color-muted)]" />
                    <span>Instagram</span>
                  </Label>
                  <Input
                    id="dlg-comm-ig"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    placeholder="@komunitas atau URL"
                    className="min-h-11 rounded-lg border-[var(--color-rule)] bg-[var(--color-paper)] font-mono text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="dlg-comm-x"
                    className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-ink)]"
                  >
                    <XTwitterIcon className="size-3.5 text-[var(--color-muted)]" />
                    <span>X / Twitter</span>
                  </Label>
                  <Input
                    id="dlg-comm-x"
                    value={twitter}
                    onChange={(e) => setTwitter(e.target.value)}
                    placeholder="@komunitas atau URL"
                    className="min-h-11 rounded-lg border-[var(--color-rule)] bg-[var(--color-paper)] font-mono text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="dlg-comm-web"
                    className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-ink)]"
                  >
                    <Globe
                      className="size-3.5 text-[var(--color-muted)]"
                      aria-hidden="true"
                    />
                    <span>Situs Web</span>
                  </Label>
                  <Input
                    id="dlg-comm-web"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://komunitas.id"
                    className="min-h-11 rounded-lg border-[var(--color-rule)] bg-[var(--color-paper)] font-mono text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="dlg-comm-wa"
                    className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-ink)]"
                  >
                    <MessageCircle
                      className="size-3.5 text-[var(--color-muted)]"
                      aria-hidden="true"
                    />
                    <span>WhatsApp</span>
                  </Label>
                  <Input
                    id="dlg-comm-wa"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="+62812... atau tautan wa.me"
                    className="min-h-11 rounded-lg border-[var(--color-rule)] bg-[var(--color-paper)] font-mono text-xs"
                  />
                </div>
              </div>
            </section>
          </div>
        </form>
      </dialog>

      <ImageCropModal
        isOpen={cropModalOpen}
        onCancel={() => setCropModalOpen(false)}
        imageSrc={cropSourceUrl}
        title={
          cropTarget === "avatar"
            ? "Potong Logo Komunitas"
            : "Potong Banner Komunitas"
        }
        aspectRatio={cropTarget === "avatar" ? 1 : 3}
        isCircularMask={false}
        onConfirm={(croppedBase64) => {
          void handleCropComplete(croppedBase64);
        }}
      />
    </>
  );
}
