import { useId, useRef, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  MapPin,
  Search,
} from "lucide-react";
import {
  createSpotSubmissionSchema,
  googleMapsUrlSchema,
} from "@starter/shared/validators/spots";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  useGeocodeSpot,
  useNearbySpotCheck,
  useSubmitReadingSpot,
} from "../hooks";
import {
  FACILITY_CHIP_ORDER,
  SPOT_CATEGORY_LABELS,
  SPOT_NOISE_LEVEL_OPTIONS,
  SPOT_PRICE_RANGE_OPTIONS,
  applySpotPinLocation,
  buildSpotSubmissionPayload,
  clampIndonesiaCoordinate,
  formatDistanceMeters,
  formatSpotApiError,
  formatSpotCategory,
  getUnrenderedFieldError,
} from "../spots-helpers";
import {
  INDONESIA_DEFAULT_VIEW,
  spotCategoryValues,
  type ReadingSpotDetailDto,
  type SpotGeocodeResultDto,
  type SpotSubmissionFormDraft,
} from "../types";
import { SpotModalDialog } from "./spot-modal-dialog";
import { SpotPinPickerMap } from "./spot-pin-picker-map";

type SubmitSpotDialogProps = {
  open: boolean;
  onClose: () => void;
  defaultCity?: string;
  defaultCenter?: { lat: number; lng: number };
  onOpenExistingSpot: (slug: string) => void;
  onOpenMyContributions: () => void;
};

type WizardStep = 1 | 2 | 3 | 4;

const STEP_3_RENDERED_FIELDS = [
  "name",
  "city",
  "province",
  "district",
  "address",
  "openingHoursText",
  "googleMapsUrl",
  "instagramHandle",
  "websiteUrl",
  "description",
] as const;

const STEP_LABELS: ReadonlyArray<{ step: 1 | 2 | 3; label: string }> = [
  { step: 1, label: "Lokasi & Pin" },
  { step: 2, label: "Cek Duplikat" },
  { step: 3, label: "Detail Tempat" },
];

export function SubmitSpotDialog({
  open,
  onClose,
  defaultCity,
  defaultCenter,
  onOpenExistingSpot,
  onOpenMyContributions,
}: SubmitSpotDialogProps) {
  const [isDirty, setIsDirty] = useState(false);

  return (
    <SpotModalDialog
      open={open}
      onClose={() => {
        setIsDirty(false);
        onClose();
      }}
      title="Usulkan Sudut Baca Baru"
      description="Bantu pembaca se-Indonesia menemukan kafe buku, perpustakaan, toko buku indie, atau TBM nyaman di kotamu."
      dismissMode={isDirty ? "closerequest" : "any"}
      maxWidthClass="max-w-2xl"
    >
      <SubmitSpotWizard
        key={
          open ? `${defaultCity ?? "id"}:${defaultCenter?.lat ?? ""}` : "closed"
        }
        defaultCity={defaultCity}
        defaultCenter={defaultCenter}
        onDirtyChange={setIsDirty}
        onClose={() => {
          setIsDirty(false);
          onClose();
        }}
        onOpenExistingSpot={(slug) => {
          setIsDirty(false);
          onOpenExistingSpot(slug);
        }}
        onOpenMyContributions={() => {
          setIsDirty(false);
          onOpenMyContributions();
        }}
      />
    </SpotModalDialog>
  );
}

function SubmitSpotWizard({
  defaultCity,
  defaultCenter,
  onDirtyChange,
  onClose,
  onOpenExistingSpot,
  onOpenMyContributions,
}: {
  defaultCity?: string;
  defaultCenter?: { lat: number; lng: number };
  onDirtyChange: (dirty: boolean) => void;
  onClose: () => void;
  onOpenExistingSpot: (slug: string) => void;
  onOpenMyContributions: () => void;
}) {
  const initialCoords = clampIndonesiaCoordinate(
    defaultCenter?.lat ?? INDONESIA_DEFAULT_VIEW.lat,
    defaultCenter?.lng ?? INDONESIA_DEFAULT_VIEW.lng,
  );

  const [step, setStep] = useState<WizardStep>(1);
  const [geocodeQuery, setGeocodeQuery] = useState("");
  const [geocodeResults, setGeocodeResults] = useState<SpotGeocodeResultDto[]>(
    [],
  );
  const [geocodeSearched, setGeocodeSearched] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const [confirmedNotDuplicate, setConfirmedNotDuplicate] = useState(false);

  const [draft, setDraft] = useState<SpotSubmissionFormDraft>({
    name: "",
    category: "book_cafe",
    description: "",
    address: "",
    district: "",
    city: defaultCity ?? "",
    province: "",
    latitude: initialCoords.lat,
    longitude: initialCoords.lng,
    googleMapsUrl: "",
    instagramHandle: "",
    websiteUrl: "",
    openingHoursText: "",
    priceRange: "budget",
    noiseLevel: "quiet",
    facilities: {},
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdSpot, setCreatedSpot] = useState<ReadingSpotDetailDto | null>(
    null,
  );

  const stepHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const idPrefix = useId();

  const geocodeMutation = useGeocodeSpot();
  const submitMutation = useSubmitReadingSpot();

  const {
    data: nearbyMatches = [],
    isLoading: isCheckingNearby,
    isError: isNearbyError,
  } = useNearbySpotCheck(
    {
      lat: draft.latitude,
      lng: draft.longitude,
      name: draft.name.trim() || undefined,
      radiusMeters: 100,
    },
    step === 2,
  );

  const updateDraft = <K extends keyof SpotSubmissionFormDraft>(
    key: K,
    value: SpotSubmissionFormDraft[K],
  ) => {
    onDirtyChange(true);
    setDraft((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const goToStep = (nextStep: WizardStep) => {
    setStep(nextStep);
    if (nextStep === 2) {
      setConfirmedNotDuplicate(false);
    }
    requestAnimationFrame(() => {
      stepHeadingRef.current?.focus();
    });
  };

  const handleGeocodeSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = geocodeQuery.trim();
    if (trimmed.length < 2) {
      setGeocodeError("Masukkan minimal 2 karakter untuk mencari alamat.");
      return;
    }
    setGeocodeError(null);
    geocodeMutation.mutate(trimmed, {
      onSuccess: (results) => {
        setGeocodeSearched(true);
        setGeocodeResults(results);
      },
      onError: (err) => {
        setGeocodeSearched(true);
        setGeocodeResults([]);
        setGeocodeError(
          formatSpotApiError(
            err,
            "Pencarian alamat sedang sibuk. Pilih kota preset atau geser pin langsung.",
          ),
        );
      },
    });
  };

  const handleApplyGeocodeResult = (item: SpotGeocodeResultDto) => {
    const clamped = clampIndonesiaCoordinate(item.latitude, item.longitude);
    onDirtyChange(true);
    setDraft((prev) => ({
      ...prev,
      address: item.address || prev.address,
      district: item.district ?? prev.district,
      city: item.city || prev.city,
      province: item.province ?? prev.province,
      latitude: clamped.lat,
      longitude: clamped.lng,
    }));
  };

  const handleSubmitForm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);

    const payload = buildSpotSubmissionPayload(draft);
    const parsed = createSpotSubmissionSchema.safeParse(payload);

    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!nextErrors[key]) {
          nextErrors[key] = issue.message;
        }
      }
      setFieldErrors(nextErrors);

      const firstKey = Object.keys(nextErrors)[0];
      if (firstKey && formRef.current) {
        const target = formRef.current.querySelector<HTMLElement>(
          `[name="${firstKey}"]`,
        );
        target?.focus();
      }
      return;
    }

    submitMutation.mutate(parsed.data, {
      onSuccess: (created) => {
        setCreatedSpot(created);
        onDirtyChange(false);
        goToStep(4);
      },
      onError: (err) => {
        setSubmitError(
          formatSpotApiError(
            err,
            "Gagal mengirim usulan sudut baca. Silakan coba lagi.",
          ),
        );
      },
    });
  };

  return (
    <div className="space-y-5">
      {/* Accessible 3-Step Progress Tracker */}
      {step !== 4 && (
        <nav aria-label="Langkah pengusulan sudut baca">
          <ol className="grid grid-cols-3 gap-2">
            {STEP_LABELS.map((item) => {
              const isCurrent = step === item.step;
              const isCompleted = step > item.step;
              return (
                <li
                  key={item.step}
                  aria-current={isCurrent ? "step" : undefined}
                  className={`rounded-lg border px-2.5 py-2 text-xs transition-colors ${
                    isCurrent
                      ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]/60 text-foreground font-semibold"
                      : isCompleted
                        ? "border-[var(--color-green)]/40 bg-[var(--color-green-soft)]/50 text-foreground"
                        : "border-border bg-[var(--color-paper-2)] text-muted-foreground"
                  }`}
                >
                  <span className="font-mono text-[10px] uppercase tracking-wider block opacity-80">
                    Langkah {item.step}
                  </span>
                  <span className="truncate block">{item.label}</span>
                </li>
              );
            })}
          </ol>
        </nav>
      )}

      {/* STEP 1: Locate & Pin */}
      {step === 1 && (
        <div className="space-y-4">
          <h2
            ref={stepHeadingRef}
            tabIndex={-1}
            className="font-serif text-base font-bold text-foreground focus:outline-none"
          >
            1. Cari Lokasi &amp; Tentukan Titik Pin
          </h2>

          <div className="space-y-1.5">
            <label
              htmlFor={`${idPrefix}-quick-name`}
              className="block text-xs font-semibold text-foreground"
            >
              Nama tempat (opsional di langkah ini, membantu cek duplikat)
            </label>
            <Input
              id={`${idPrefix}-quick-name`}
              value={draft.name}
              onChange={(event) => updateDraft("name", event.target.value)}
              placeholder="Contoh: Kafe Buku Senja, Perpusda Kota..."
              className="min-h-11 bg-background"
            />
          </div>

          <form
            onSubmit={handleGeocodeSearch}
            className="space-y-2"
            role="search"
            aria-label="Cari alamat lewat proxy geocode"
          >
            <label
              htmlFor={`${idPrefix}-geocode`}
              className="block text-xs font-semibold text-foreground"
            >
              Cari alamat atau nama kawasan di Indonesia
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 min-w-0">
                <Search
                  className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id={`${idPrefix}-geocode`}
                  type="search"
                  value={geocodeQuery}
                  onChange={(event) => {
                    setGeocodeQuery(event.target.value);
                    if (geocodeError) setGeocodeError(null);
                  }}
                  placeholder="Contoh: Jl. Braga Bandung, Kemang Jakarta..."
                  enterKeyHint="search"
                  className="w-full min-h-11 rounded-lg border border-border bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
                />
              </div>
              <Button
                type="submit"
                variant="outline"
                disabled={geocodeMutation.isPending}
                className="min-h-11 px-4 shrink-0"
              >
                {geocodeMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  "Cari"
                )}
              </Button>
            </div>

            {geocodeError && (
              <p
                role="alert"
                className="text-xs font-medium text-[var(--color-error)]"
              >
                {geocodeError}
              </p>
            )}

            {geocodeResults.length > 0 && (
              <ul
                aria-label="Hasil pencarian lokasi"
                className="rounded-xl border border-border bg-background divide-y divide-border overflow-hidden"
              >
                {geocodeResults.map((item) => (
                  <li
                    key={`${item.latitude}-${item.longitude}-${item.displayName}`}
                  >
                    <button
                      type="button"
                      onClick={() => handleApplyGeocodeResult(item)}
                      className="w-full min-h-11 px-3.5 py-2.5 text-left hover:bg-muted/60 transition-colors cursor-pointer flex items-start gap-2.5 focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      <MapPin
                        className="size-4 text-[var(--color-accent)] shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground line-clamp-1">
                          {item.displayName}
                        </p>
                        <p className="text-[11px] text-muted-foreground line-clamp-1">
                          {item.city}
                          {item.province ? `, ${item.province}` : ""} ·{" "}
                          <span className="font-mono tabular-nums">
                            {item.latitude.toFixed(4)},{" "}
                            {item.longitude.toFixed(4)}
                          </span>
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {geocodeSearched &&
              !geocodeMutation.isPending &&
              geocodeResults.length === 0 &&
              !geocodeError && (
                <p className="text-xs text-muted-foreground">
                  Hasil pencarian tidak ditemukan? Pilih kota preset atau geser
                  pin langsung di peta di bawah.
                </p>
              )}
          </form>

          <SpotPinPickerMap
            lat={draft.latitude}
            lng={draft.longitude}
            onChange={(nextLat, nextLng, meta) => {
              onDirtyChange(true);
              setDraft((prev) =>
                applySpotPinLocation(prev, nextLat, nextLng, meta),
              );
            }}
          />

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="min-h-11"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={() => goToStep(2)}
              className="min-h-11 bg-[var(--color-accent)] text-[var(--color-accent-ink)] hover:opacity-90 font-semibold"
            >
              <span>Lanjut Cek Duplikat</span>
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2: 100m Duplicate Guard */}
      {step === 2 && (
        <div className="space-y-4">
          <h2
            ref={stepHeadingRef}
            tabIndex={-1}
            className="font-serif text-base font-bold text-foreground focus:outline-none"
          >
            2. Pemeriksaan Duplikat (Radius 100 m)
          </h2>

          <p className="text-xs text-muted-foreground">
            Memeriksa sudut baca yang sudah tercatat di sekitar titik{" "}
            <span className="font-mono tabular-nums text-foreground">
              {draft.latitude.toFixed(5)}, {draft.longitude.toFixed(5)}
            </span>
            .
          </p>

          {isCheckingNearby ? (
            <div className="rounded-xl border border-border bg-[var(--color-paper-2)] p-5 flex items-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              <span>
                Memeriksa sudut baca terdekat dalam radius 100 meter...
              </span>
            </div>
          ) : isNearbyError ? (
            <div
              role="alert"
              className="rounded-xl border border-border bg-[var(--color-paper-2)] p-4 text-xs text-muted-foreground"
            >
              Pemeriksaan duplikat sementara tidak tersedia. Kamu tetap bisa
              melanjutkan pengisian detail sudut baca.
            </div>
          ) : nearbyMatches.length > 0 ? (
            <div className="space-y-3">
              <div
                role="alert"
                className="rounded-xl border border-[var(--color-accent)]/50 bg-[var(--color-accent-soft)]/50 p-4 space-y-3"
              >
                <div className="flex items-start gap-2.5">
                  <AlertTriangle
                    className="size-5 text-[var(--color-accent-text)] shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      Ditemukan {nearbyMatches.length} sudut baca berdekatan
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Apakah maksudmu{" "}
                      <strong className="text-foreground">
                        {nearbyMatches[0]!.name}
                      </strong>{" "}
                      (
                      {formatDistanceMeters(nearbyMatches[0]!.distanceMeters) ??
                        `${nearbyMatches[0]!.distanceMeters} m`}{" "}
                      dari titik ini)? Buka spot &amp; tulis ulasan saja.
                    </p>
                  </div>
                </div>

                <ul className="space-y-2">
                  {nearbyMatches.map((match) => (
                    <li
                      key={match.id}
                      className="rounded-lg border border-border bg-background p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5"
                    >
                      <div className="min-w-0">
                        <p className="font-serif text-sm font-bold text-foreground truncate">
                          {match.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {formatSpotCategory(match.category)} · {match.address}
                          , {match.city} ·{" "}
                          <span className="font-mono tabular-nums">
                            {formatDistanceMeters(match.distanceMeters) ??
                              `${match.distanceMeters} m`}
                          </span>
                        </p>
                      </div>
                      {match.status === "published" ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onOpenExistingSpot(match.slug)}
                          className="min-h-11 shrink-0 text-xs"
                        >
                          Buka Spot &amp; Tulis Ulasan
                        </Button>
                      ) : (
                        <span className="font-mono text-[11px] text-muted-foreground shrink-0">
                          Sedang ditinjau kurasi
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              <label className="min-h-11 flex items-center gap-3 rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs sm:text-sm text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmedNotDuplicate}
                  onChange={(event) =>
                    setConfirmedNotDuplicate(event.target.checked)
                  }
                  className="size-4 accent-[var(--color-accent)] shrink-0"
                />
                <span>
                  Bukan, ini tempat berbeda — lanjutkan pengusulan sudut baca
                  baru
                </span>
              </label>
            </div>
          ) : (
            <div
              role="status"
              className="rounded-xl border border-[var(--color-green)]/40 bg-[var(--color-green-soft)] p-4 flex items-start gap-3"
            >
              <CheckCircle2
                className="size-5 text-[var(--color-green)] shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-foreground">
                  Tidak ditemukan sudut baca serupa dalam radius 100 m
                </p>
                <p className="text-xs text-muted-foreground">
                  Titik ini tampak baru. Lanjutkan untuk melengkapi profil
                  kenyamanan bacanya.
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => goToStep(1)}
              className="min-h-11"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              <span>Kembali ke Pin</span>
            </Button>
            <Button
              type="button"
              disabled={
                isCheckingNearby ||
                (nearbyMatches.length > 0 && !confirmedNotDuplicate)
              }
              onClick={() => goToStep(3)}
              className="min-h-11 bg-[var(--color-accent)] text-[var(--color-accent-ink)] hover:opacity-90 font-semibold"
            >
              <span>Lanjut ke Detail</span>
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: Minimal High-Signal Comfort Form */}
      {step === 3 && (
        <form
          ref={formRef}
          onSubmit={handleSubmitForm}
          className="space-y-4"
          noValidate
        >
          <h2
            ref={stepHeadingRef}
            tabIndex={-1}
            className="font-serif text-base font-bold text-foreground focus:outline-none"
          >
            3. Detail Kenyamanan Baca
          </h2>

          <div className="space-y-1.5">
            <label
              htmlFor={`${idPrefix}-name`}
              className="block text-xs font-semibold text-foreground"
            >
              Nama sudut baca <span aria-hidden="true">*</span>
            </label>
            <Input
              id={`${idPrefix}-name`}
              name="name"
              required
              minLength={2}
              maxLength={180}
              value={draft.name}
              onChange={(event) => updateDraft("name", event.target.value)}
              aria-invalid={Boolean(fieldErrors.name)}
              placeholder="Contoh: Kineruku Bandung"
              className="min-h-11 bg-background"
            />
            {fieldErrors.name && (
              <p
                role="alert"
                className="text-xs font-medium text-[var(--color-error)]"
              >
                {fieldErrors.name}
              </p>
            )}
          </div>

          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold text-foreground">
              Kategori tempat <span aria-hidden="true">*</span>
            </legend>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {spotCategoryValues.map((cat) => {
                const checked = draft.category === cat;
                return (
                  <label
                    key={cat}
                    className={`min-h-11 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs cursor-pointer transition-colors ${
                      checked
                        ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]/60 text-foreground font-semibold"
                        : "border-border bg-background text-foreground hover:border-foreground/30"
                    }`}
                  >
                    <input
                      type="radio"
                      name="category"
                      value={cat}
                      checked={checked}
                      onChange={() => updateDraft("category", cat)}
                      className="size-4 accent-[var(--color-accent)] shrink-0"
                    />
                    <span>{SPOT_CATEGORY_LABELS[cat]}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label
                htmlFor={`${idPrefix}-city`}
                className="block text-xs font-semibold text-foreground"
              >
                Kota / Kabupaten <span aria-hidden="true">*</span>
              </label>
              <Input
                id={`${idPrefix}-city`}
                name="city"
                required
                maxLength={100}
                value={draft.city}
                onChange={(event) => updateDraft("city", event.target.value)}
                aria-invalid={Boolean(fieldErrors.city)}
                placeholder="Contoh: Bandung"
                className="min-h-11 bg-background"
              />
              {fieldErrors.city && (
                <p
                  role="alert"
                  className="text-xs font-medium text-[var(--color-error)]"
                >
                  {fieldErrors.city}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor={`${idPrefix}-province`}
                className="block text-xs font-semibold text-foreground"
              >
                Provinsi <span aria-hidden="true">*</span>
              </label>
              <Input
                id={`${idPrefix}-province`}
                name="province"
                required
                maxLength={100}
                value={draft.province}
                onChange={(event) =>
                  updateDraft("province", event.target.value)
                }
                aria-invalid={Boolean(fieldErrors.province)}
                placeholder="Contoh: Jawa Barat"
                className="min-h-11 bg-background"
              />
              {fieldErrors.province && (
                <p
                  role="alert"
                  className="text-xs font-medium text-[var(--color-error)]"
                >
                  {fieldErrors.province}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor={`${idPrefix}-district`}
              className="block text-xs font-semibold text-foreground"
            >
              Kecamatan / kawasan (opsional)
            </label>
            <Input
              id={`${idPrefix}-district`}
              name="district"
              maxLength={120}
              value={draft.district}
              onChange={(event) => updateDraft("district", event.target.value)}
              aria-invalid={Boolean(fieldErrors.district)}
              placeholder="Contoh: Cidadap / Kemang / Kotabaru"
              className="min-h-11 bg-background"
            />
            {fieldErrors.district && (
              <p
                role="alert"
                className="text-xs font-medium text-[var(--color-error)]"
              >
                {fieldErrors.district}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor={`${idPrefix}-address`}
              className="block text-xs font-semibold text-foreground"
            >
              Alamat lengkap <span aria-hidden="true">*</span>
            </label>
            <Textarea
              id={`${idPrefix}-address`}
              name="address"
              required
              maxLength={500}
              rows={2}
              autoComplete="street-address"
              value={draft.address}
              onChange={(event) => updateDraft("address", event.target.value)}
              aria-invalid={Boolean(fieldErrors.address)}
              placeholder="Jl. Hegarmanah No. 52, Bandung"
              className="text-base sm:text-sm bg-background"
            />
            {fieldErrors.address && (
              <p
                role="alert"
                className="text-xs font-medium text-[var(--color-error)]"
              >
                {fieldErrors.address}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor={`${idPrefix}-hours`}
              className="block text-xs font-semibold text-foreground"
            >
              Jam operasional (opsional)
            </label>
            <Input
              id={`${idPrefix}-hours`}
              name="openingHoursText"
              maxLength={160}
              value={draft.openingHoursText}
              onChange={(event) =>
                updateDraft("openingHoursText", event.target.value)
              }
              aria-invalid={Boolean(fieldErrors.openingHoursText)}
              placeholder="Contoh: Sen–Min 09:00–21:00"
              className="min-h-11 bg-background"
            />
            {fieldErrors.openingHoursText && (
              <p
                role="alert"
                className="text-xs font-medium text-[var(--color-error)]"
              >
                {fieldErrors.openingHoursText}
              </p>
            )}
          </div>

          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold text-foreground">
              Kisaran biaya
            </legend>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SPOT_PRICE_RANGE_OPTIONS.map((option) => {
                const checked = draft.priceRange === option.value;
                return (
                  <label
                    key={option.value}
                    className={`min-h-11 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs cursor-pointer ${
                      checked
                        ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]/60 text-foreground font-semibold"
                        : "border-border bg-background text-foreground"
                    }`}
                  >
                    <input
                      type="radio"
                      name="priceRange"
                      value={option.value}
                      checked={checked}
                      onChange={() => updateDraft("priceRange", option.value)}
                      className="size-4 accent-[var(--color-accent)] shrink-0"
                    />
                    <span className="leading-tight">
                      <span className="block">{option.label}</span>
                      <span className="text-[10px] text-muted-foreground font-normal">
                        {option.hint}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold text-foreground">
              Suasana / tingkat kebisingan
            </legend>
            <div className="grid grid-cols-3 gap-2">
              {SPOT_NOISE_LEVEL_OPTIONS.map((option) => {
                const checked = draft.noiseLevel === option.value;
                return (
                  <label
                    key={option.value}
                    className={`min-h-11 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs cursor-pointer ${
                      checked
                        ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]/60 text-foreground font-semibold"
                        : "border-border bg-background text-foreground"
                    }`}
                  >
                    <input
                      type="radio"
                      name="noiseLevel"
                      value={option.value}
                      checked={checked}
                      onChange={() => updateDraft("noiseLevel", option.value)}
                      className="size-4 accent-[var(--color-accent)] shrink-0"
                    />
                    <span>{option.label}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold text-foreground">
              Fasilitas kenyamanan baca
            </legend>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {FACILITY_CHIP_ORDER.map(({ key, label }) => {
                const checked = Boolean(draft.facilities[key]);
                return (
                  <label
                    key={key}
                    className={`min-h-11 flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs cursor-pointer ${
                      checked
                        ? "border-foreground bg-foreground text-background font-semibold"
                        : "border-border bg-background text-foreground"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) =>
                        updateDraft("facilities", {
                          ...draft.facilities,
                          [key]: event.target.checked,
                        })
                      }
                      className="size-4 accent-[var(--color-accent)] shrink-0"
                    />
                    <span>{label}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="space-y-1.5">
            <label
              htmlFor={`${idPrefix}-gmaps`}
              className="block text-xs font-semibold text-foreground"
            >
              Tautan Google Maps resmi (opsional)
            </label>
            <Input
              id={`${idPrefix}-gmaps`}
              name="googleMapsUrl"
              type="url"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              value={draft.googleMapsUrl}
              onChange={(event) =>
                updateDraft("googleMapsUrl", event.target.value)
              }
              onBlur={() => {
                const trimmed = draft.googleMapsUrl.trim();
                if (!trimmed) return;
                const check = googleMapsUrlSchema.safeParse(trimmed);
                if (!check.success) {
                  setFieldErrors((prev) => ({
                    ...prev,
                    googleMapsUrl:
                      check.error.issues[0]?.message ??
                      "Tautan harus berupa URL Google Maps resmi.",
                  }));
                }
              }}
              aria-invalid={Boolean(fieldErrors.googleMapsUrl)}
              placeholder="https://maps.app.goo.gl/... atau https://maps.google.com/..."
              className="min-h-11 bg-background"
            />
            {fieldErrors.googleMapsUrl && (
              <p
                role="alert"
                className="text-xs font-medium text-[var(--color-error)]"
              >
                {fieldErrors.googleMapsUrl}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label
                htmlFor={`${idPrefix}-ig`}
                className="block text-xs font-semibold text-foreground"
              >
                Username Instagram (opsional)
              </label>
              <Input
                id={`${idPrefix}-ig`}
                name="instagramHandle"
                maxLength={80}
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                value={draft.instagramHandle}
                onChange={(event) =>
                  updateDraft("instagramHandle", event.target.value)
                }
                aria-invalid={Boolean(fieldErrors.instagramHandle)}
                placeholder="@kafebuku"
                className="min-h-11 bg-background"
              />
              {fieldErrors.instagramHandle && (
                <p
                  role="alert"
                  className="text-xs font-medium text-[var(--color-error)]"
                >
                  {fieldErrors.instagramHandle}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor={`${idPrefix}-web`}
                className="block text-xs font-semibold text-foreground"
              >
                Situs web (opsional)
              </label>
              <Input
                id={`${idPrefix}-web`}
                name="websiteUrl"
                type="url"
                maxLength={500}
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                value={draft.websiteUrl}
                onChange={(event) =>
                  updateDraft("websiteUrl", event.target.value)
                }
                aria-invalid={Boolean(fieldErrors.websiteUrl)}
                placeholder="https://contoh.id"
                className="min-h-11 bg-background"
              />
              {fieldErrors.websiteUrl && (
                <p
                  role="alert"
                  className="text-xs font-medium text-[var(--color-error)]"
                >
                  {fieldErrors.websiteUrl}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor={`${idPrefix}-desc`}
              className="block text-xs font-semibold text-foreground"
            >
              Deskripsi kenyamanan baca (opsional)
            </label>
            <Textarea
              id={`${idPrefix}-desc`}
              name="description"
              rows={3}
              maxLength={2000}
              value={draft.description}
              onChange={(event) =>
                updateDraft("description", event.target.value)
              }
              aria-invalid={Boolean(fieldErrors.description)}
              placeholder="Ceritakan singkat suasana tempat, pencahayaan, koleksi buku, atau spot duduk favorit..."
              className="text-base sm:text-sm bg-background"
            />
            {fieldErrors.description && (
              <p
                role="alert"
                className="text-xs font-medium text-[var(--color-error)]"
              >
                {fieldErrors.description}
              </p>
            )}
          </div>

          {(submitError ||
            getUnrenderedFieldError(fieldErrors, STEP_3_RENDERED_FIELDS)) && (
            <div
              role="alert"
              className="rounded-xl border border-[var(--color-error)]/40 bg-[var(--color-error-soft)] px-3.5 py-2.5 text-xs font-medium text-[var(--color-error)]"
            >
              {submitError ??
                getUnrenderedFieldError(fieldErrors, STEP_3_RENDERED_FIELDS)}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              disabled={submitMutation.isPending}
              onClick={() => goToStep(2)}
              className="min-h-11"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              <span>Kembali</span>
            </Button>
            <Button
              type="submit"
              disabled={submitMutation.isPending}
              className="min-h-11 bg-[var(--color-accent)] text-[var(--color-accent-ink)] hover:opacity-90 font-semibold px-5"
            >
              {submitMutation.isPending && (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              )}
              <span>Kirim Usulan Sudut Baca</span>
            </Button>
          </div>
        </form>
      )}

      {/* STEP 4: Outcome */}
      {step === 4 && createdSpot && (
        <div className="space-y-4 py-2">
          <div
            role="status"
            className="rounded-xl border border-[var(--color-green)]/40 bg-[var(--color-green-soft)] p-4 flex items-start gap-3"
          >
            <CheckCircle2
              className="size-5 text-[var(--color-green)] shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div className="space-y-1">
              <h2
                ref={stepHeadingRef}
                tabIndex={-1}
                className="font-serif text-base font-bold text-foreground focus:outline-none"
              >
                {createdSpot.status === "published"
                  ? "Sudut baca langsung tayang!"
                  : "Usulan diterima — sedang ditinjau tim kurasi"}
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {createdSpot.status === "published"
                  ? `${createdSpot.name} di ${createdSpot.city} kini langsung tampil di Peta Sudut Baca Indonesia.`
                  : `${createdSpot.name} di ${createdSpot.city} sudah masuk antrean kurasi. Kamu dapat memantau statusnya kapan saja di Kontribusi Saya.`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="min-h-11"
            >
              Tutup
            </Button>
            {createdSpot.status === "published" ? (
              <Button
                type="button"
                onClick={() => onOpenExistingSpot(createdSpot.slug)}
                className="min-h-11 bg-[var(--color-accent)] text-[var(--color-accent-ink)] hover:opacity-90 font-semibold"
              >
                Lihat di Peta
              </Button>
            ) : (
              <Button
                type="button"
                onClick={onOpenMyContributions}
                className="min-h-11 bg-[var(--color-accent)] text-[var(--color-accent-ink)] hover:opacity-90 font-semibold"
              >
                Pantau di Kontribusi Saya
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
