import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type TranslationFieldsSectionProps = {
  isTranslation: boolean;
  onIsTranslationChange: (next: boolean) => void;
  originalTitle: string;
  onOriginalTitleChange: (next: string) => void;
  translator: string;
  onTranslatorChange: (next: string) => void;
  idPrefix: string;
  inputClassName?: string;
};

/**
 * Progressive disclosure for `originalTitle` & `translator` so authors of original
 * Indonesian works are never confused by translation-only bibliography fields.
 */
export function TranslationFieldsSection({
  isTranslation,
  onIsTranslationChange,
  originalTitle,
  onOriginalTitleChange,
  translator,
  onTranslatorChange,
  idPrefix,
  inputClassName = "min-h-11 text-xs bg-[var(--color-paper-2)]",
}: TranslationFieldsSectionProps) {
  const toggleId = `${idPrefix}-is-translation`;
  const origTitleId = `${idPrefix}-orig-title`;
  const translatorId = `${idPrefix}-translator`;

  return (
    <div className="space-y-3 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] p-3">
      <label
        htmlFor={toggleId}
        className="flex items-start gap-2.5 cursor-pointer"
      >
        <input
          id={toggleId}
          type="checkbox"
          checked={isTranslation}
          onChange={(e) => onIsTranslationChange(e.target.checked)}
          className="mt-0.5 size-4 accent-[var(--color-accent)]"
        />
        <span className="space-y-0.5 text-xs">
          <span className="block font-semibold text-[var(--color-ink)]">
            Buku ini edisi terjemahan atau saduran
          </span>
          <span className="block text-[11px] text-[var(--color-muted)]">
            Aktifkan hanya jika buku ini diterjemahkan dari bahasa lain; biarkan
            kosong untuk karya orisinal.
          </span>
        </span>
      </label>

      {isTranslation && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-[var(--color-rule)] pt-3">
          <div className="space-y-1">
            <Label htmlFor={origTitleId} className="text-xs font-semibold">
              Judul Edisi Asli
            </Label>
            <Input
              id={origTitleId}
              value={originalTitle}
              onChange={(e) => onOriginalTitleChange(e.target.value)}
              placeholder="Contoh: Sapiens: A Brief History of Humankind"
              className={inputClassName}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={translatorId} className="text-xs font-semibold">
              Nama Penerjemah
            </Label>
            <Input
              id={translatorId}
              value={translator}
              onChange={(e) => onTranslatorChange(e.target.value)}
              placeholder="Nama penerjemah resmi"
              className={inputClassName}
            />
          </div>
        </div>
      )}
    </div>
  );
}
