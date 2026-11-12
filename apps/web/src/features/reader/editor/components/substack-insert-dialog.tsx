import * as React from "react";
import {
  BookOpen,
  Calculator,
  Code,
  Feather,
  FileText,
  FoldVertical,
  Headphones,
  Image as ImageIcon,
  Lightbulb,
  Link as LinkIcon,
  MousePointerClick,
  Sigma,
  Sparkles,
  Utensils,
  Video,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type SubstackInsertType =
  | "chapter"
  | "link"
  | "image"
  | "audio"
  | "video"
  | "buttonCustom"
  | "footnote"
  | "latex"
  | "collapsible"
  | "poll"
  | "prediction"
  | "recipe";

export interface SubstackInsertConfig {
  type: SubstackInsertType;
  title: string;
  description: string;
  icon: React.ReactNode;
  field1Label: string;
  field1Placeholder?: string;
  field1Default?: string;
  field2Label?: string;
  field2Placeholder?: string;
  field2Default?: string;
  confirmLabel: string;
}

export const INSERT_CONFIGS: Record<SubstackInsertType, SubstackInsertConfig> = {
  chapter: {
    type: "chapter",
    title: "Tambah Bab Baru Naskah",
    description: "Tentukan nomor bab dan judul untuk memecah alur naskah secara terstruktur.",
    icon: <BookOpen className="size-5 text-[var(--color-accent)]" />,
    field1Label: "Nomor Bab (Angka)",
    field1Placeholder: "misal: 2",
    field1Default: "2",
    field2Label: "Judul Bab",
    field2Placeholder: "misal: Percakapan dengan Batu Karang di Pantai Sepi",
    field2Default: "Percakapan dengan Batu Karang di Pantai Sepi",
    confirmLabel: "Sisipkan Bab Baru",
  },
  link: {
    type: "link",
    title: "Sisipkan Tautan (Link)",
    description: "Masukkan alamat URL web tujuan untuk tautan naskah.",
    icon: <LinkIcon className="size-5 text-blue-500" />,
    field1Label: "Alamat URL Tautan",
    field1Placeholder: "https://example.com",
    field1Default: "https://",
    confirmLabel: "Terapkan Tautan",
  },
  image: {
    type: "image",
    title: "Sisipkan Gambar / Ilustrasi",
    description: "Masukkan URL gambar langsung dari CDN, Unsplash, atau media eksternal.",
    icon: <ImageIcon className="size-5 text-emerald-500" />,
    field1Label: "URL Gambar Langsung",
    field1Placeholder: "https://images.unsplash.com/photo-...",
    field1Default: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=800",
    confirmLabel: "Sisipkan Gambar",
  },
  audio: {
    type: "audio",
    title: "Sisipkan Audio / Podcast Narasi",
    description: "Sematkan pemutar audio narasi atau siniar resmi bab naskah.",
    icon: <Headphones className="size-5 text-purple-500" />,
    field1Label: "Judul Audio / Narasi",
    field1Placeholder: "misal: Audio Narasi Bab Resmi",
    field1Default: "Audio Narasi Bab Resmi",
    field2Label: "URL Berkas Audio (MP3 / Stream)",
    field2Placeholder: "https://...",
    field2Default: "https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg",
    confirmLabel: "Sisipkan Audio",
  },
  video: {
    type: "video",
    title: "Sisipkan Video Embed",
    description: "Sematkan video bedah bab atau catatan dokumentasi penulis.",
    icon: <Video className="size-5 text-rose-500" />,
    field1Label: "URL Video Embed (YouTube / MP4)",
    field1Placeholder: "https://www.youtube.com/embed/...",
    field1Default: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    field2Label: "Keterangan / Judul Video",
    field2Placeholder: "misal: Video Bedah Bab & Catatan Penulis",
    field2Default: "Video Bedah Bab & Catatan Penulis",
    confirmLabel: "Sisipkan Video",
  },
  buttonCustom: {
    type: "buttonCustom",
    title: "Sisipkan Tombol Aksi Kustom",
    description: "Tambahkan tombol tautan aksi khusus yang menarik perhatian pembaca.",
    icon: <MousePointerClick className="size-5 text-amber-500" />,
    field1Label: "Teks Tombol Aksi",
    field1Placeholder: "misal: Baca Bab Tambahan",
    field1Default: "Buka Halaman Spesial",
    field2Label: "URL Tujuan",
    field2Placeholder: "https://anzabook.com",
    field2Default: "https://anzabook.com",
    confirmLabel: "Sisipkan Tombol",
  },
  footnote: {
    type: "footnote",
    title: "Sisipkan Catatan Kaki (Footnote)",
    description: "Cantumkan rujukan pustaka atau penjelasan konteks historis di akhir bacaan.",
    icon: <FileText className="size-5 text-sky-500" />,
    field1Label: "Teks Catatan Kaki & Referensi",
    field1Placeholder: "misal: Rujukan data dari Arsip Nasional Republik Indonesia.",
    field1Default: "Rujukan data dari Perpustakaan Nasional RI.",
    confirmLabel: "Sisipkan Catatan Kaki",
  },
  latex: {
    type: "latex",
    title: "Sisipkan Formula Matematika (LaTeX)",
    description: "Tuliskan notasi rumus sains atau persamaan kalkulus dalam format KaTeX / LaTeX.",
    icon: <Sigma className="size-5 text-indigo-500" />,
    field1Label: "Sintaks Formula LaTeX",
    field1Placeholder: "misal: E = mc^2",
    field1Default: "E = mc^2 \\quad \\Longleftrightarrow \\quad \\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}",
    confirmLabel: "Sisipkan Rumus",
  },
  collapsible: {
    type: "collapsible",
    title: "Sisipkan Konten Diciutkan (Accordion)",
    description: "Sembunyikan catatan pelengkap atau glosarium agar tidak memadati naskah utama.",
    icon: <FoldVertical className="size-5 text-slate-500" />,
    field1Label: "Judul Accordion / Glosarium",
    field1Placeholder: "misal: Lampiran Data & Glosarium Istilah",
    field1Default: "Lampiran Data & Glosarium Istilah",
    confirmLabel: "Sisipkan Accordion",
  },
  poll: {
    type: "poll",
    title: "Sisipkan Jajak Pendapat",
    description: "Buat pemungutan suara langsung untuk mengukur respon atau sudut pandang pembaca.",
    icon: <Calculator className="size-5 text-teal-500" />,
    field1Label: "Pertanyaan Jajak Pendapat",
    field1Placeholder: "misal: Apakah Anda sepakat dengan tesis di bab ini?",
    field1Default: "Apakah Anda setuju dengan argumen di bab ini?",
    confirmLabel: "Sisipkan Jajak Pendapat",
  },
  prediction: {
    type: "prediction",
    title: "Sisipkan Pasar Prediksi Naskah",
    description: "Buka proyeksi interaktif peluang masa depan dari topik yang dibahas naskah.",
    icon: <Lightbulb className="size-5 text-amber-500" />,
    field1Label: "Pernyataan Prediksi",
    field1Placeholder: "misal: Peluang adaptasi ke layar lebar dalam 2 tahun",
    field1Default: "Peluang adaptasi ke layar lebar dalam 2 tahun",
    confirmLabel: "Sisipkan Prediksi",
  },
  recipe: {
    type: "recipe",
    title: "Sisipkan Petunjuk / Prosedur",
    description: "Tampilkan urutan langkah praktis terstruktur di dalam bab naskah.",
    icon: <Utensils className="size-5 text-orange-500" />,
    field1Label: "Judul Prosedur",
    field1Placeholder: "misal: Prosedur Kurasi Buku Gotong Royong",
    field1Default: "Prosedur Kurasi Buku Gotong Royong",
    confirmLabel: "Sisipkan Prosedur",
  },
};

interface SubstackInsertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  type: SubstackInsertType | null;
  initialValue1?: string;
  initialValue2?: string;
  onConfirm: (val1: string, val2?: string) => void;
}

export function SubstackInsertDialog({
  isOpen,
  onClose,
  type,
  initialValue1,
  initialValue2,
  onConfirm,
}: SubstackInsertDialogProps) {
  const config = type ? INSERT_CONFIGS[type] : null;

  const [value1, setValue1] = React.useState("");
  const [value2, setValue2] = React.useState("");

  React.useEffect(() => {
    if (config) {
      setValue1(initialValue1 ?? config.field1Default ?? "");
      setValue2(initialValue2 ?? config.field2Default ?? "");
    }
  }, [config, initialValue1, initialValue2]);

  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!isOpen) return;
      if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !config) {
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value1.trim()) return;
    onConfirm(value1.trim(), value2.trim());
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="insert-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs text-foreground animate-in fade-in duration-100"
    >
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative max-w-lg w-full rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 z-10">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border/80 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-muted/60 border border-border/50 shrink-0">
              {config.icon}
            </div>
            <div>
              <h3
                id="insert-dialog-title"
                className="font-serif text-base sm:text-lg font-bold text-foreground leading-snug"
              >
                {config.title}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {config.description}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
            aria-label="Tutup Dialog"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              {config.field1Label}
            </Label>
            <Input
              autoFocus
              type={config.type === "chapter" ? "number" : "text"}
              min={config.type === "chapter" ? 1 : undefined}
              value={value1}
              onChange={(e) => setValue1(e.target.value)}
              placeholder={config.field1Placeholder}
              required
              className="h-10 text-xs font-sans"
            />
          </div>

          {config.field2Label && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                {config.field2Label}
              </Label>
              <Input
                type="text"
                value={value2}
                onChange={(e) => setValue2(e.target.value)}
                placeholder={config.field2Placeholder}
                className="h-10 text-xs font-sans"
              />
            </div>
          )}

          {/* Quick presets for Images if type is image */}
          {config.type === "image" && (
            <div className="space-y-1 pt-1">
              <div className="text-[10px] font-mono text-muted-foreground uppercase">
                Contoh Sampul &amp; Ilustrasi Pilihan
              </div>
              <div className="flex flex-wrap gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() =>
                    setValue1(
                      "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=800"
                    )
                  }
                  className="px-2 py-1 rounded-md bg-muted/50 hover:bg-muted border border-border/60 text-[11px]"
                >
                  Buku Sastra
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setValue1(
                      "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=80&w=800"
                    )
                  }
                  className="px-2 py-1 rounded-md bg-muted/50 hover:bg-muted border border-border/60 text-[11px]"
                >
                  Perpustakaan
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setValue1(
                      "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=800"
                    )
                  }
                  className="px-2 py-1 rounded-md bg-muted/50 hover:bg-muted border border-border/60 text-[11px]"
                >
                  Buku Terbuka
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/80">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-9 px-4 text-xs font-medium"
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              className="h-9 px-4 text-xs font-semibold bg-[var(--color-accent)] hover:opacity-90 text-white"
            >
              {config.confirmLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
