import * as React from "react";
import { X, Calendar as CalendarIcon, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { useCreateCalendar } from "../hooks";

interface ApplyCalendarDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (calendarSlug: string) => void;
}

export function ApplyCalendarDialog({
  open,
  onClose,
  onSuccess,
}: ApplyCalendarDialogProps) {
  useBodyScrollLock(open);

  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [type, setType] = React.useState<"community" | "author" | "publisher">(
    "community",
  );
  const [description, setDescription] = React.useState("");
  const [city, setCity] = React.useState("");
  const [contactEmail, setContactEmail] = React.useState("");
  const [instagram, setInstagram] = React.useState("");
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const createCalendarMutation = useCreateCalendar();

  const handleNameChange = (val: string) => {
    setName(val);
    const generatedSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    setSlug(generatedSlug);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (name.length < 3) {
      setErrorMsg("Nama kalender minimal 3 karakter");
      return;
    }
    if (slug.length < 3) {
      setErrorMsg("Slug kalender minimal 3 karakter");
      return;
    }

    const trimmedEmail = contactEmail.trim();
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrorMsg("Format email kontak tidak valid (contoh: halo@komunitas.id atau kosongkan jika tidak ada)");
      return;
    }

    try {
      const res = await createCalendarMutation.mutateAsync({
        name: name.trim(),
        slug: slug.trim(),
        type,
        description: description.trim(),
        city: city.trim() || undefined,
        contactEmail: trimmedEmail || undefined,
        socialLinks: instagram.trim() ? { instagram: instagram.trim() } : undefined,
      });
      if (onSuccess) onSuccess(res.slug);
      onClose();
    } catch (err: any) {
      if (err?.details && Array.isArray(err.details) && err.details.length > 0) {
        const detailMessages = err.details
          .map((d: any) => `${d.message}`)
          .join(" • ");
        setErrorMsg(detailMessages);
      } else {
        setErrorMsg(err.message || "Gagal membuat kalender komunitas.");
      }
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs animate-in fade-in duration-200 select-none"
      style={{ overscrollBehavior: "contain" }}
    >
      <div
        data-lenis-prevent
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#16171b] text-white shadow-2xl"
        style={{ overscrollBehavior: "contain" }}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <CalendarIcon className="size-5 text-amber-400" />
            <h2 className="text-base font-semibold text-white">
              Buat Kalender Acara
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {errorMsg && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-red-300">
              {errorMsg}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-white/80 font-medium">Nama Kalender / Komunitas</label>
            <Input
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Contoh: Klub Buku Senja Jakarta"
              className="bg-white/5 border-white/10 text-white placeholder-white/30"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-white/80 font-medium">Slug Tautan Unik</label>
            <div className="flex items-center rounded-md border border-white/10 bg-white/5 px-3 text-xs text-white/50">
              <span>anzabook.com/c/</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="klub-buku-senja"
                className="flex-1 bg-transparent py-2 pl-1 text-white outline-none"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-white/80 font-medium">Tipe Kalender</label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: "community", label: "Komunitas / TBM" },
                  { id: "author", label: "Penulis" },
                  { id: "publisher", label: "Penerbit" },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setType(t.id)}
                  className={`rounded-lg border px-3 py-2 text-center font-medium transition-colors ${
                    type === t.id
                      ? "border-amber-400 bg-amber-400/10 text-amber-300"
                      : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-white/80 font-medium">Deskripsi Singkat</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tentang agenda, rutinitas pertemuan, atau visi komunitas Anda..."
              className="bg-white/5 border-white/10 text-white placeholder-white/30 min-h-[80px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-white/80 font-medium">Kota / Wilayah</label>
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Jakarta Selatan"
                className="bg-white/5 border-white/10 text-white placeholder-white/30"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-white/80 font-medium">Email Kontak</label>
              <Input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="halo@komunitas.id"
                className="bg-white/5 border-white/10 text-white placeholder-white/30"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-white/80 font-medium">Instagram (Opsional)</label>
            <Input
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="@klubbukusenja"
              className="bg-white/5 border-white/10 text-white placeholder-white/30"
            />
          </div>

          <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-[11px] text-amber-200 flex items-start gap-2">
            <Sparkles className="size-4 shrink-0 mt-0.5 text-amber-400" />
            <div>
              Setelah dibuat, Anda dapat langsung menerbitkan acara publik atau privat ke kalender ini.
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 px-4 py-2 text-xs font-medium text-white transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={createCalendarMutation.isPending}
              className="rounded-xl bg-white px-5 py-2 text-xs font-semibold text-black hover:bg-white/90 disabled:opacity-50 transition-all cursor-pointer shadow-sm"
            >
              {createCalendarMutation.isPending ? "Menyimpan..." : "Buat Kalender"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
