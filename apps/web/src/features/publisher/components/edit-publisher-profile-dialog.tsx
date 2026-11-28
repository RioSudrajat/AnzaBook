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
  LoaderCircle,
  Mail,
  MapPin,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import type { PublisherDto } from "@starter/shared/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  MAX_PUBLISHER_TOPICS,
  normalizePublisherTopics,
  normalizeSocialLinks,
} from "@/features/publisher/publisher-helpers";
import { ImageCropModal } from "@/features/social/components/image-crop-modal";
import {
  useUpdatePublisherProfile,
  useUploadMediaImage,
} from "@/features/social/hooks";
import { ApiError } from "@/lib/api/client";
import { isUsableAssetUrl } from "@/lib/media-url";

const SUGGESTED_TOPICS = [
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

type EditPublisherProfileDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  publisher: PublisherDto;
};

function dataUrlToJpegFile(dataUrl: string, filename: string): File {
  const [header, base64] = dataUrl.split(",");
  const mimeMatch = header?.match(/data:([^;]+);base64/);
  const mimeType = mimeMatch?.[1] || "image/jpeg";
  const binary = atob(base64 || "");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], filename, { type: mimeType });
}

function extractErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    const detail = error.details?.[0];
    return detail?.field ? `${detail.field}: ${detail.message}` : error.message;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

function EditPublisherProfileFormContent({
  publisher,
  onClose,
}: {
  publisher: PublisherDto;
  onClose: () => void;
}) {
  const updateMutation = useUpdatePublisherProfile();
  const uploadMutation = useUploadMediaImage();

  const dialogRef = useRef<HTMLDialogElement>(null);
  const discardBtnRef = useRef<HTMLButtonElement>(null);
  const pressedOutsideRef = useRef(false);
  const logoFileRef = useRef<HTMLInputElement>(null);
  const bannerFileRef = useRef<HTMLInputElement>(null);

  const titleId = useId();
  const formId = useId();
  const confirmMessageId = useId();

  const [name, setName] = useState(publisher.name);
  const [logoUrl, setLogoUrl] = useState(publisher.logoUrl || "");
  const [headerImageUrl, setHeaderImageUrl] = useState(
    publisher.headerImageUrl || "",
  );
  const [city, setCity] = useState(publisher.city || "");
  const [address, setAddress] = useState(publisher.address || "");
  const [contactEmail, setContactEmail] = useState(
    publisher.contactEmail || "",
  );
  const [description, setDescription] = useState(publisher.description || "");
  const [website, setWebsite] = useState(publisher.socialLinks?.website || "");
  const [instagram, setInstagram] = useState(
    publisher.socialLinks?.instagram || "",
  );
  const [twitter, setTwitter] = useState(publisher.socialLinks?.twitter || "");
  const [whatsapp, setWhatsapp] = useState(
    publisher.socialLinks?.whatsapp || "",
  );
  const [isAcceptingSubmissions, setIsAcceptingSubmissions] = useState(
    publisher.isAcceptingSubmissions ?? true,
  );
  const [topics, setTopics] = useState<string[]>(() =>
    normalizePublisherTopics(publisher.topics ?? []),
  );
  const [topicInput, setTopicInput] = useState("");
  const [submissionGuidelines, setSubmissionGuidelines] = useState(
    publisher.submissionGuidelines || "",
  );

  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropSourceUrl, setCropSourceUrl] = useState("");
  const [cropTarget, setCropTarget] = useState<"logo" | "banner">("logo");
  const [uploadingTarget, setUploadingTarget] = useState<
    "logo" | "banner" | null
  >(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const initialTopics = normalizePublisherTopics(publisher.topics ?? []);
  const isDirty =
    name !== publisher.name ||
    logoUrl !== (publisher.logoUrl || "") ||
    headerImageUrl !== (publisher.headerImageUrl || "") ||
    city !== (publisher.city || "") ||
    address !== (publisher.address || "") ||
    contactEmail !== (publisher.contactEmail || "") ||
    description !== (publisher.description || "") ||
    website !== (publisher.socialLinks?.website || "") ||
    instagram !== (publisher.socialLinks?.instagram || "") ||
    twitter !== (publisher.socialLinks?.twitter || "") ||
    whatsapp !== (publisher.socialLinks?.whatsapp || "") ||
    isAcceptingSubmissions !== (publisher.isAcceptingSubmissions ?? true) ||
    submissionGuidelines !== (publisher.submissionGuidelines || "") ||
    topics.join("|") !== initialTopics.join("|");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) {
      dialog.showModal();
    }
  }, []);

  const requestClose = () => {
    if (updateMutation.isPending || uploadingTarget !== null) return;
    if (isDirty) {
      setShowDiscardConfirm(true);
      queueMicrotask(() => {
        discardBtnRef.current?.focus();
      });
      return;
    }
    onClose();
  };

  const isPointerOutsideDialog = (
    e: React.PointerEvent<HTMLDialogElement>,
    el: HTMLDialogElement,
  ) => {
    const rect = el.getBoundingClientRect();
    return (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    );
  };

  const handleFileSelected = (
    e: ChangeEvent<HTMLInputElement>,
    target: "logo" | "banner",
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMsg("Pilih berkas gambar yang valid (JPG, PNG, atau WebP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("Ukuran berkas melebihi batas maksimal 5MB.");
      return;
    }

    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = () => {
      setCropSourceUrl(String(reader.result || ""));
      setCropTarget(target);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedBase64: string) => {
    setCropModalOpen(false);
    setErrorMsg(null);
    setUploadingTarget(cropTarget);
    try {
      const filename =
        cropTarget === "logo"
          ? `publisher-logo-${publisher.slug}.jpg`
          : `publisher-banner-${publisher.slug}.jpg`;
      const file = dataUrlToJpegFile(croppedBase64, filename);
      const uploaded = await uploadMutation.mutateAsync(file);
      if (cropTarget === "logo") {
        setLogoUrl(uploaded.url);
      } else {
        setHeaderImageUrl(uploaded.url);
      }
    } catch (err) {
      setErrorMsg(
        extractErrorMessage(err, "Gagal mengunggah gambar ke server media."),
      );
    } finally {
      setUploadingTarget(null);
    }
  };

  const handleAddTopic = (raw: string) => {
    const next = normalizePublisherTopics([...topics, raw]);
    setTopics(next);
    setTopicInput("");
  };

  const handleRemoveTopic = (topicToRemove: string) => {
    setTopics((prev) => prev.filter((item) => item !== topicToRemove));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (name.trim().length < 2) {
      setErrorMsg("Nama penerbit minimal 2 karakter.");
      return;
    }

    try {
      await updateMutation.mutateAsync({
        slug: publisher.slug,
        input: {
          name: name.trim(),
          logoUrl: logoUrl.trim() || null,
          headerImageUrl: headerImageUrl.trim() || null,
          city: city.trim() || null,
          address: address.trim() || null,
          contactEmail: contactEmail.trim() || null,
          description: description.trim() || null,
          socialLinks:
            normalizeSocialLinks({ website, instagram, twitter, whatsapp }) ??
            null,
          topics: normalizePublisherTopics(topics),
          isAcceptingSubmissions,
          submissionGuidelines: submissionGuidelines.trim() || null,
        },
      });
      onClose();
    } catch (err) {
      setErrorMsg(
        extractErrorMessage(err, "Gagal memperbarui profil penerbit."),
      );
    }
  };

  const showBanner = isUsableAssetUrl(headerImageUrl);
  const showLogo = isUsableAssetUrl(logoUrl);
  const logoInitial = (name || publisher.name || "P").slice(0, 1).toUpperCase();

  return (
    <>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        data-lenis-prevent="true"
        {...({ closedby: isDirty ? "none" : "any" } as Record<string, string>)}
        onCancel={(e) => {
          e.preventDefault();
          requestClose();
        }}
        onPointerDown={(e) => {
          if (cropModalOpen) return;
          const el = dialogRef.current;
          if (!el) return;
          pressedOutsideRef.current = isPointerOutsideDialog(e, el);
        }}
        onPointerUp={(e) => {
          if (cropModalOpen) return;
          const el = dialogRef.current;
          if (!el) return;
          const releasedOutside = isPointerOutsideDialog(e, el);
          if (pressedOutsideRef.current && releasedOutside) {
            pressedOutsideRef.current = false;
            requestClose();
          }
          pressedOutsideRef.current = false;
        }}
        className="m-auto w-[min(96vw,46rem)] h-[min(90dvh,50rem)] max-h-[90dvh] overflow-hidden rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-0 text-[var(--color-ink)] shadow-2xl backdrop:bg-black/60 open:flex open:flex-col"
      >
        <form
          id={formId}
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          {/* Sticky Top Header */}
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--color-rule)] bg-[var(--color-paper-2)] px-5 py-3.5 sm:px-6">
            <div className="min-w-0">
              <h1
                id={titleId}
                className="font-serif text-lg sm:text-xl font-bold text-[var(--color-ink)] truncate"
              >
                Sunting Profil Penerbit
              </h1>
              <p className="font-mono text-[11px] text-[var(--color-muted)] truncate">
                @{publisher.slug}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                disabled={updateMutation.isPending || uploadingTarget !== null}
                onClick={requestClose}
                className="min-h-11 px-4 text-xs border-[var(--color-rule)] bg-[var(--color-paper)] hover:bg-[var(--color-paper-3)] cursor-pointer"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending || uploadingTarget !== null}
                className="min-h-11 px-5 text-xs font-semibold bg-[var(--color-accent)] text-[var(--color-accent-ink)] hover:brightness-95 cursor-pointer"
              >
                {updateMutation.isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </header>

          {/* Non-shifting unsaved changes confirmation strip */}
          {showDiscardConfirm && (
            <div
              role="alert"
              className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[var(--color-accent)]/40 bg-[var(--color-accent-soft)] px-5 py-3 text-xs sm:px-6"
            >
              <span id={confirmMessageId} className="font-medium">
                Perubahan profil belum disimpan. Buang perubahan?
              </span>
              <div className="flex items-center gap-2">
                <Button
                  ref={discardBtnRef}
                  type="button"
                  variant="outline"
                  aria-describedby={confirmMessageId}
                  onClick={() => {
                    setShowDiscardConfirm(false);
                    onClose();
                  }}
                  className="min-h-10 px-3 text-xs border-[var(--color-error)]/40 text-[var(--color-error)] hover:bg-[var(--color-error-soft)] cursor-pointer"
                >
                  Buang perubahan
                </Button>
                <Button
                  type="button"
                  onClick={() => setShowDiscardConfirm(false)}
                  className="min-h-10 px-3 text-xs font-semibold bg-[var(--color-ink)] text-[var(--color-paper)] cursor-pointer"
                >
                  Lanjut menyunting
                </Button>
              </div>
            </div>
          )}

          {/* Scrollable Body */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6 space-y-6">
            {errorMsg && (
              <div
                role="alert"
                className="rounded-xl border border-[var(--color-error)]/40 bg-[var(--color-error-soft)] px-4 py-3 text-xs text-[var(--color-ink)]"
              >
                {errorMsg}
              </div>
            )}

            {/* 1. Visual Branding: Clickable 3:1 Banner + Overlapping 1:1 Logo */}
            <section className="rounded-2xl overflow-hidden border border-[var(--color-rule)] bg-[var(--color-paper)]">
              <button
                type="button"
                disabled={uploadingTarget !== null}
                onClick={() => bannerFileRef.current?.click()}
                aria-label="Unggah atau ganti banner penerbit rasio 3 banding 1"
                className="relative flex h-36 sm:h-44 w-full items-center justify-center overflow-hidden border-b border-[var(--color-rule)] bg-[var(--color-paper-3)] cursor-pointer group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
              >
                {showBanner ? (
                  <>
                    <img
                      src={headerImageUrl}
                      alt={`Banner ${name || publisher.name}`}
                      className="size-full object-cover group-hover:opacity-85 transition-opacity"
                    />
                    <span className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 flex flex-col items-center justify-center text-white transition-opacity">
                      <Camera className="size-5 mb-1" aria-hidden="true" />
                      <span className="text-xs font-medium">
                        Ganti banner (3:1)
                      </span>
                    </span>
                  </>
                ) : (
                  <span className="flex flex-col items-center justify-center p-4 text-center text-[var(--color-muted)] group-hover:text-[var(--color-ink)] transition-colors">
                    <span className="size-10 rounded-full border border-[var(--color-rule)] bg-[var(--color-paper-2)] flex items-center justify-center mb-2">
                      <Camera className="size-5" aria-hidden="true" />
                    </span>
                    <span className="text-xs font-semibold">
                      Pilih gambar banner redaksi (Rasio 3:1)
                    </span>
                    <span className="text-[11px] opacity-80 mt-0.5">
                      Klik untuk memilih dari perangkat · Maks. 5MB
                    </span>
                  </span>
                )}

                {uploadingTarget === "banner" && (
                  <span className="absolute inset-0 bg-black/60 flex items-center justify-center gap-2 text-white text-xs font-mono">
                    <LoaderCircle
                      className="size-4 animate-spin"
                      aria-hidden="true"
                    />
                    <span>Mengunggah banner...</span>
                  </span>
                )}
              </button>

              <div className="px-5 pb-5 relative">
                <div className="-mt-12 sm:-mt-14 mb-3 flex flex-wrap items-end justify-between gap-3">
                  <button
                    type="button"
                    disabled={uploadingTarget !== null}
                    onClick={() => logoFileRef.current?.click()}
                    aria-label="Unggah atau ganti logo penerbit rasio 1 banding 1"
                    className="relative flex size-24 sm:size-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-[var(--color-paper)] bg-[var(--color-paper-2)] font-serif text-3xl font-bold text-[var(--color-ink)] shadow-sm cursor-pointer group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
                  >
                    {showLogo ? (
                      <img
                        src={logoUrl}
                        alt={`Logo ${name || publisher.name}`}
                        className="size-full object-contain p-1.5 group-hover:opacity-80 transition-opacity"
                      />
                    ) : (
                      <span>{logoInitial}</span>
                    )}

                    <span className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 flex flex-col items-center justify-center text-white transition-opacity">
                      {uploadingTarget === "logo" ? (
                        <LoaderCircle
                          className="size-5 animate-spin"
                          aria-hidden="true"
                        />
                      ) : (
                        <>
                          <Camera className="size-4" aria-hidden="true" />
                          <span className="text-[10px] mt-0.5 font-medium">
                            Logo 1:1
                          </span>
                        </>
                      )}
                    </span>
                  </button>

                  {(showLogo || showBanner) && (
                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      {showLogo && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setLogoUrl("")}
                          className="min-h-10 px-3 text-xs border-[var(--color-rule)] bg-[var(--color-paper-2)] cursor-pointer"
                        >
                          <Trash2
                            className="size-3.5 mr-1"
                            aria-hidden="true"
                          />
                          <span>Hapus Logo</span>
                        </Button>
                      )}
                      {showBanner && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setHeaderImageUrl("")}
                          className="min-h-10 px-3 text-xs border-[var(--color-rule)] bg-[var(--color-paper-2)] cursor-pointer"
                        >
                          <Trash2
                            className="size-3.5 mr-1"
                            aria-hidden="true"
                          />
                          <span>Hapus Banner</span>
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                <p className="text-xs text-[var(--color-muted)]">
                  Klik area banner (3:1) atau logo (1:1) di atas untuk memotong
                  dan mengunggah gambar langsung dari perangkat.
                </p>
              </div>

              <input
                ref={logoFileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                aria-label="Pilih berkas logo penerbit"
                onChange={(e) => handleFileSelected(e, "logo")}
                className="hidden"
              />
              <input
                ref={bannerFileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                aria-label="Pilih berkas banner penerbit"
                onChange={(e) => handleFileSelected(e, "banner")}
                className="hidden"
              />
            </section>

            {/* 2. Identitas Penerbit */}
            <fieldset className="space-y-4 rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper)] p-5">
              <legend className="px-1 font-serif text-base font-bold text-[var(--color-ink)]">
                Identitas Penerbit
              </legend>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="edit-pub-name"
                    className="text-xs font-semibold"
                  >
                    Nama Penerbit <span aria-hidden="true">*</span>
                  </Label>
                  <Input
                    id="edit-pub-name"
                    name="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    minLength={2}
                    autoFocus
                    className="min-h-11 bg-[var(--color-paper-2)]"
                  />
                </div>

                <div className="space-y-1.5">
                  <span className="block text-xs font-semibold text-[var(--color-ink)]">
                    Slug Penerbit
                  </span>
                  <div className="flex min-h-11 items-center justify-between rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper-3)]/55 px-3 font-mono text-xs text-[var(--color-muted)]">
                    <span>@{publisher.slug}</span>
                    <span className="text-[10px]">Permanen</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="edit-pub-city"
                    className="text-xs font-semibold flex items-center gap-1.5"
                  >
                    <MapPin
                      className="size-3.5 text-[var(--color-muted)]"
                      aria-hidden="true"
                    />
                    <span>Kota / Basis Redaksi</span>
                  </Label>
                  <Input
                    id="edit-pub-city"
                    name="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Contoh: Yogyakarta"
                    className="min-h-11 bg-[var(--color-paper-2)]"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="edit-pub-email"
                    className="text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Mail
                      className="size-3.5 text-[var(--color-muted)]"
                      aria-hidden="true"
                    />
                    <span>Email Narahubung</span>
                  </Label>
                  <Input
                    id="edit-pub-email"
                    name="contactEmail"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder="redaksi@penerbit.id"
                    className="min-h-11 bg-[var(--color-paper-2)]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="edit-pub-address"
                  className="text-xs font-semibold"
                >
                  Alamat Kantor (Opsional)
                </Label>
                <Input
                  id="edit-pub-address"
                  name="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Alamat lengkap redaksi penerbit"
                  className="min-h-11 bg-[var(--color-paper-2)]"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="edit-pub-desc"
                    className="text-xs font-semibold"
                  >
                    Deskripsi &amp; Misi Editorial
                  </Label>
                  <span className="font-mono text-[11px] text-[var(--color-muted)]">
                    {description.length} / 2000
                  </span>
                </div>
                <Textarea
                  id="edit-pub-desc"
                  name="description"
                  rows={3}
                  value={description}
                  onChange={(e) =>
                    setDescription(e.target.value.slice(0, 2000))
                  }
                  placeholder="Ceritakan karakter kurasi, sejarah singkat, dan fokus terbitan penerbit..."
                  className="text-sm bg-[var(--color-paper-2)]"
                />
              </div>

              <div className="space-y-3 border-t border-[var(--color-rule)] pt-4">
                <h2 className="text-xs font-semibold uppercase tracking-wider font-mono text-[var(--color-muted)]">
                  Tautan Sosial &amp; Situs Web
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label
                      htmlFor="edit-pub-website"
                      className="text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Globe className="size-3.5" aria-hidden="true" />
                      <span>Situs Web</span>
                    </Label>
                    <Input
                      id="edit-pub-website"
                      name="website"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://penerbit.id"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      className="min-h-11 font-mono text-xs bg-[var(--color-paper-2)]"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label
                      htmlFor="edit-pub-ig"
                      className="text-xs font-semibold"
                    >
                      Instagram
                    </Label>
                    <Input
                      id="edit-pub-ig"
                      name="instagram"
                      value={instagram}
                      onChange={(e) => setInstagram(e.target.value)}
                      placeholder="@penerbit.id atau URL"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      className="min-h-11 font-mono text-xs bg-[var(--color-paper-2)]"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label
                      htmlFor="edit-pub-x"
                      className="text-xs font-semibold"
                    >
                      X / Twitter
                    </Label>
                    <Input
                      id="edit-pub-x"
                      name="twitter"
                      value={twitter}
                      onChange={(e) => setTwitter(e.target.value)}
                      placeholder="@penerbit atau URL"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      className="min-h-11 font-mono text-xs bg-[var(--color-paper-2)]"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label
                      htmlFor="edit-pub-wa"
                      className="text-xs font-semibold"
                    >
                      WhatsApp Redaksi
                    </Label>
                    <Input
                      id="edit-pub-wa"
                      name="whatsapp"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="https://wa.me/628..."
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      className="min-h-11 font-mono text-xs bg-[var(--color-paper-2)]"
                    />
                  </div>
                </div>
              </div>
            </fieldset>

            {/* 3. Kurasi & Pengajuan Naskah */}
            <fieldset className="space-y-4 rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper)] p-5">
              <legend className="px-1 font-serif text-base font-bold text-[var(--color-ink)]">
                Kurasi &amp; Pengajuan Naskah
              </legend>

              <label
                htmlFor="edit-pub-accepting"
                className="flex items-start justify-between gap-4 rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-4 cursor-pointer"
              >
                <span className="space-y-0.5">
                  <span className="block text-sm font-semibold text-[var(--color-ink)]">
                    Menerima Pengajuan Naskah Baru
                  </span>
                  <span className="block text-xs text-[var(--color-muted)] leading-relaxed">
                    Saat aktif, penulis dapat mengirim draf langsung ke kotak
                    masuk redaksi Anda.
                  </span>
                </span>
                <input
                  id="edit-pub-accepting"
                  name="isAcceptingSubmissions"
                  type="checkbox"
                  {...({ switch: "" } as Record<string, string>)}
                  checked={isAcceptingSubmissions}
                  onChange={(e) => setIsAcceptingSubmissions(e.target.checked)}
                  className="mt-1 size-5 shrink-0 accent-[var(--color-accent)] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
                />
              </label>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--color-ink)]">
                    Topik Kurasi ({topics.length} / {MAX_PUBLISHER_TOPICS})
                  </span>
                </div>

                {topics.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {topics.map((topic) => (
                      <span
                        key={topic}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-rule)] bg-[var(--color-paper-3)] px-3 py-1.5 text-xs font-medium text-[var(--color-ink)]"
                      >
                        <span>{topic}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTopic(topic)}
                          aria-label={`Hapus topik ${topic}`}
                          className="inline-flex size-5 items-center justify-center rounded-full hover:bg-[var(--color-paper)] hover:text-[var(--color-error)] cursor-pointer"
                        >
                          <X className="size-3" aria-hidden="true" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {topics.length < MAX_PUBLISHER_TOPICS && (
                  <div className="space-y-2.5 pt-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Label htmlFor="edit-pub-new-topic" className="sr-only">
                        Tambah topik kurasi
                      </Label>
                      <Input
                        id="edit-pub-new-topic"
                        value={topicInput}
                        onChange={(e) => setTopicInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                            e.preventDefault();
                            if (topicInput.trim()) handleAddTopic(topicInput);
                          }
                        }}
                        placeholder="Tambah topik kurasi baru..."
                        className="min-h-11 flex-1 min-w-44 text-xs bg-[var(--color-paper-2)]"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          if (topicInput.trim()) handleAddTopic(topicInput);
                        }}
                        className="min-h-11 px-4 text-xs cursor-pointer"
                      >
                        <Plus className="size-3.5 mr-1.5" aria-hidden="true" />
                        <span>Tambah Topik</span>
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {SUGGESTED_TOPICS.filter(
                        (preset) =>
                          !topics.some(
                            (existing) =>
                              existing.toLowerCase() === preset.toLowerCase(),
                          ),
                      ).map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => handleAddTopic(preset)}
                          className="min-h-9 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper-2)] px-2.5 text-xs text-[var(--color-muted)] hover:border-[var(--color-ink)] hover:text-[var(--color-ink)] cursor-pointer"
                        >
                          + {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="edit-pub-guidelines"
                  className="text-xs font-semibold"
                >
                  Panduan Pengiriman Naskah
                </Label>
                <Textarea
                  id="edit-pub-guidelines"
                  name="submissionGuidelines"
                  rows={3}
                  value={submissionGuidelines}
                  onChange={(e) =>
                    setSubmissionGuidelines(e.target.value.slice(0, 2000))
                  }
                  placeholder="Contoh: Sertakan sinopsis lengkap dan minimal 3 bab contoh untuk ditinjau redaksi."
                  className="text-sm bg-[var(--color-paper-2)]"
                />
              </div>
            </fieldset>
          </div>
        </form>
      </dialog>

      <ImageCropModal
        isOpen={cropModalOpen}
        onCancel={() => setCropModalOpen(false)}
        imageSrc={cropSourceUrl}
        title={
          cropTarget === "logo"
            ? "Potong Logo Penerbit (1:1)"
            : "Potong Banner Penerbit (3:1)"
        }
        aspectRatio={cropTarget === "logo" ? 1 : 3}
        isCircularMask={cropTarget === "logo"}
        onConfirm={(cropped) => void handleCropComplete(cropped)}
      />
    </>
  );
}

export function EditPublisherProfileDialog({
  isOpen,
  onClose,
  publisher,
}: EditPublisherProfileDialogProps) {
  if (!isOpen) return null;
  return (
    <EditPublisherProfileFormContent
      key={`${publisher.id}-${publisher.updatedAt}`}
      publisher={publisher}
      onClose={onClose}
    />
  );
}
