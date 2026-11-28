import { useId, useState, type FormEvent } from "react";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { createSpotReportSchema } from "@starter/shared/validators/spots";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useReportSpot } from "../hooks";
import {
  SPOT_REPORT_REASON_LABELS,
  formatSpotApiError,
} from "../spots-helpers";
import type { SpotReportReason } from "../types";
import { SpotModalDialog } from "./spot-modal-dialog";

type SpotOnlyReason = Exclude<SpotReportReason, "review_abuse">;

const SPOT_ONLY_REASONS: readonly SpotOnlyReason[] = [
  "permanently_closed",
  "wrong_location",
  "wrong_info",
  "duplicate",
  "spam",
];

type ReportSpotDialogProps = {
  open: boolean;
  onClose: () => void;
  spotSlug: string;
  spotName: string;
  reviewTarget?: { id: string; authorName: string } | null;
};

export function ReportSpotDialog({
  open,
  onClose,
  spotSlug,
  spotName,
  reviewTarget = null,
}: ReportSpotDialogProps) {
  const isReviewMode = Boolean(reviewTarget);
  const title = isReviewMode
    ? "Laporkan Ulasan"
    : "Laporkan / Koreksi Info Sudut Baca";
  const description = isReviewMode
    ? `Laporkan ulasan dari ${reviewTarget?.authorName ?? "pengguna"} pada ${spotName} agar ditinjau tim moderasi.`
    : `Bantu jaga akurasi peta dengan melaporkan perubahan jam buka, pin meleset, atau tempat tutup untuk ${spotName}.`;

  return (
    <SpotModalDialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      maxWidthClass="max-w-lg"
    >
      <ReportSpotForm
        key={`${spotSlug}:${reviewTarget?.id ?? "spot"}:${open ? "1" : "0"}`}
        spotSlug={spotSlug}
        reviewTarget={reviewTarget}
        onClose={onClose}
      />
    </SpotModalDialog>
  );
}

function ReportSpotForm({
  spotSlug,
  reviewTarget,
  onClose,
}: {
  spotSlug: string;
  reviewTarget: { id: string; authorName: string } | null;
  onClose: () => void;
}) {
  const reportMutation = useReportSpot(spotSlug);
  const isReviewMode = Boolean(reviewTarget);
  const detailsId = useId();
  const detailsErrorId = useId();

  const [reasonType, setReasonType] = useState<SpotReportReason>(
    isReviewMode ? "review_abuse" : "wrong_info",
  );
  const [details, setDetails] = useState("");
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const validateDetails = (value: string): string | null => {
    const parsed = createSpotReportSchema.safeParse({
      reasonType,
      reviewId: reviewTarget?.id,
      details: value,
    });
    if (parsed.success) return null;
    const issue = parsed.error.issues.find(
      (item) => item.path[0] === "details",
    );
    return issue?.message ?? parsed.error.issues[0]?.message ?? null;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);

    const payload = {
      reasonType: isReviewMode ? ("review_abuse" as const) : reasonType,
      ...(reviewTarget ? { reviewId: reviewTarget.id } : {}),
      details: details.trim(),
    };

    const parsed = createSpotReportSchema.safeParse(payload);
    if (!parsed.success) {
      const msg =
        parsed.error.issues[0]?.message ?? "Periksa kembali detail laporan.";
      setDetailsError(msg);
      return;
    }

    reportMutation.mutate(parsed.data, {
      onSuccess: () => {
        setSubmitted(true);
      },
      onError: (err) => {
        setSubmitError(
          formatSpotApiError(err, "Gagal mengirim laporan. Silakan coba lagi."),
        );
      },
    });
  };

  if (submitted) {
    return (
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
            <p className="text-sm font-semibold text-foreground">
              Laporan berhasil dikirim
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Terima kasih telah membantu menjaga kualitas data Peta Sudut Baca
              Indonesia. Tim kurasi akan meninjau laporanmu.
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="button" onClick={onClose} className="min-h-11">
            Selesai
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {!isReviewMode ? (
        <fieldset className="space-y-2.5">
          <legend className="text-sm font-semibold text-foreground">
            Pilih jenis laporan atau koreksi
          </legend>
          <div className="space-y-2">
            {SPOT_ONLY_REASONS.map((reason) => {
              const checked = reasonType === reason;
              return (
                <label
                  key={reason}
                  className={`min-h-11 flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm transition-colors cursor-pointer ${
                    checked
                      ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]/50 text-foreground font-medium"
                      : "border-border bg-background text-foreground hover:border-foreground/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="spot-report-reason"
                    value={reason}
                    checked={checked}
                    onChange={() => {
                      setReasonType(reason);
                      if (submitError) setSubmitError(null);
                    }}
                    className="size-4 accent-[var(--color-accent)] shrink-0"
                  />
                  <span>{SPOT_REPORT_REASON_LABELS[reason]}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ) : (
        <div className="rounded-xl border border-border bg-[var(--color-paper-2)] px-3.5 py-3 text-xs text-muted-foreground flex items-center gap-2.5">
          <AlertTriangle
            className="size-4 text-[var(--color-accent-text)] shrink-0"
            aria-hidden="true"
          />
          <span>
            Alasan:{" "}
            <strong className="text-foreground">
              Ulasan tidak pantas / spam
            </strong>
          </span>
        </div>
      )}

      <div className="space-y-1.5">
        <label
          htmlFor={detailsId}
          className="block text-sm font-semibold text-foreground"
        >
          Detail laporan <span aria-hidden="true">*</span>
        </label>
        <p className="text-xs text-muted-foreground">
          Jelaskan singkat apa yang perlu dikoreksi (minimal 5 karakter).
        </p>
        <Textarea
          id={detailsId}
          name="details"
          rows={4}
          required
          minLength={5}
          maxLength={1000}
          value={details}
          onChange={(event) => {
            const next = event.target.value;
            setDetails(next);
            if (submitError) {
              setSubmitError(null);
            }
            if (detailsError && next.trim().length >= 5) {
              setDetailsError(null);
            }
          }}
          onBlur={() => {
            if (details.length > 0) {
              setDetailsError(validateDetails(details));
            }
          }}
          aria-invalid={Boolean(detailsError)}
          aria-describedby={detailsError ? detailsErrorId : undefined}
          placeholder={
            isReviewMode
              ? "Contoh: Ulasan mengandung spam promosi tautan atau kata-kata kasar."
              : "Contoh: Kafe ini sudah pindah alamat sejak bulan lalu / jam buka baru 10.00–22.00."
          }
          className="text-base sm:text-sm bg-background"
        />
        <div className="flex items-center justify-between gap-2 text-xs">
          {detailsError ? (
            <p
              id={detailsErrorId}
              role="alert"
              className="text-[var(--color-error)] font-medium"
            >
              {detailsError}
            </p>
          ) : (
            <span className="text-muted-foreground">
              Laporan akan ditinjau oleh tim kurasi.
            </span>
          )}
          <span className="font-mono tabular-nums text-muted-foreground shrink-0">
            {details.trim().length}/1000
          </span>
        </div>
      </div>

      {submitError && (
        <div
          role="alert"
          className="rounded-xl border border-[var(--color-error)]/40 bg-[var(--color-error-soft)] px-3.5 py-2.5 text-xs font-medium text-[var(--color-error)]"
        >
          {submitError}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={reportMutation.isPending}
          className="min-h-11"
        >
          Batal
        </Button>
        <Button
          type="submit"
          disabled={reportMutation.isPending}
          className="min-h-11 bg-[var(--color-accent)] text-[var(--color-accent-ink)] hover:opacity-90 font-semibold"
        >
          {reportMutation.isPending && (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          )}
          <span>Kirim Laporan</span>
        </Button>
      </div>
    </form>
  );
}
