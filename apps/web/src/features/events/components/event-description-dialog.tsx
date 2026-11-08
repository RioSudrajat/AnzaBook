import * as React from "react";
import {
  X,
  Plus,
  Heading1,
  Heading2,
  ImageIcon,
  Quote,
  Minus,
  List,
  ListOrdered,
  Paperclip,
  Search,
} from "lucide-react";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";

interface EventDescriptionDialogProps {
  open: boolean;
  onClose: () => void;
  value: string;
  onSave: (desc: string) => void;
}

const BLOCK_OPTIONS = [
  {
    id: "h1",
    label: "Heading",
    icon: Heading1,
    prefix: "H1",
    insert: (curr: string) => (curr ? `${curr}\n\n# ` : "# "),
  },
  {
    id: "h2",
    label: "Subheading",
    icon: Heading2,
    prefix: "H2",
    insert: (curr: string) => (curr ? `${curr}\n\n## ` : "## "),
  },
  {
    id: "image",
    label: "Image",
    icon: ImageIcon,
    insert: (curr: string) =>
      curr
        ? `${curr}\n\n![Gambar Acara](https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800)`
        : "![Gambar Acara](https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800)",
  },
  {
    id: "quote",
    label: "Blockquote",
    icon: Quote,
    insert: (curr: string) => (curr ? `${curr}\n\n> ` : "> "),
  },
  {
    id: "divider",
    label: "Divider",
    icon: Minus,
    insert: (curr: string) => (curr ? `${curr}\n\n---\n\n` : "---\n\n"),
  },
  {
    id: "list",
    label: "List",
    icon: List,
    insert: (curr: string) => (curr ? `${curr}\n\n- ` : "- "),
  },
  {
    id: "numbered_list",
    label: "Numbered List",
    icon: ListOrdered,
    insert: (curr: string) => (curr ? `${curr}\n\n1. ` : "1. "),
  },
  {
    id: "attachment",
    label: "Attachment",
    icon: Paperclip,
    insert: (curr: string) =>
      curr
        ? `${curr}\n\n[Lampiran Materi Acara (PDF)](https://example.com/materi.pdf)`
        : "[Lampiran Materi Acara (PDF)](https://example.com/materi.pdf)",
  },
];

export function EventDescriptionDialog({
  open,
  onClose,
  value,
  onSave,
}: EventDescriptionDialogProps) {
  useBodyScrollLock(open);

  const [text, setText] = React.useState(value);
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (open) {
      setText(value);
      setIsMenuOpen(false);
      setSearchQuery("");
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [open, value]);

  if (!open) return null;

  const handleSelectBlock = (insertFn: (curr: string) => string) => {
    const updated = insertFn(text);
    setText(updated);
    setIsMenuOpen(false);
    setSearchQuery("");
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(updated.length, updated.length);
      }
    }, 50);
  };

  const filteredBlocks = BLOCK_OPTIONS.filter((b) =>
    b.label.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleDone = () => {
    onSave(text);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-6 backdrop-blur-xs animate-in fade-in duration-200 select-none"
      style={{ overscrollBehavior: "contain" }}
    >
      <div
        data-lenis-prevent
        className="relative flex h-[85vh] max-h-[640px] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#16171b] text-white shadow-2xl"
        style={{ overscrollBehavior: "contain" }}
      >
        {/* Header matching Screenshot 2: "Deskripsi Acara" + (X) */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h2 className="text-base font-semibold text-white">Deskripsi Acara</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Content Canvas */}
        <div
          data-lenis-prevent
          className="relative flex flex-1 flex-col p-6 overflow-y-auto"
          style={{ overscrollBehavior: "contain" }}
        >
          {/* Top Line with (+) Trigger */}
          <div className="relative flex items-start gap-3">
            {/* (+) Button matching Screenshot 2 */}
            <div className="relative pt-0.5">
              <button
                type="button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`flex size-6 items-center justify-center rounded-md border transition-all ${
                  isMenuOpen
                    ? "border-white/40 bg-white/20 text-white"
                    : "border-white/20 bg-white/5 text-white/60 hover:border-white/40 hover:text-white"
                }`}
                title="Tambahkan Elemen Teks (+)"
              >
                <Plus className="size-3.5" />
              </button>

              {/* Slash / Block Options Popover matching Screenshot 2 */}
              {isMenuOpen && (
                <div
                  className="absolute left-0 top-8 z-20 w-64 rounded-xl border border-white/15 bg-[#202126] p-1.5 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
                  style={{ overscrollBehavior: "contain" }}
                >
                  {/* Search Input */}
                  <div className="flex items-center gap-2 border-b border-white/10 px-2.5 py-1.5 mb-1 text-xs text-white/70">
                    <Search className="size-3.5 text-white/40 shrink-0" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari..."
                      className="w-full bg-transparent text-xs text-white placeholder-white/40 outline-none"
                      autoFocus
                    />
                  </div>

                  {/* Block List */}
                  <div className="max-h-60 overflow-y-auto space-y-0.5 py-0.5 scrollbar-thin scrollbar-thumb-white/10">
                    {filteredBlocks.length === 0 ? (
                      <div className="p-3 text-center text-xs text-white/40">
                        Tidak ada blok yang cocok
                      </div>
                    ) : (
                      filteredBlocks.map((block) => {
                        const Icon = block.icon;
                        return (
                          <button
                            key={block.id}
                            type="button"
                            onClick={() => handleSelectBlock(block.insert)}
                            className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                          >
                            <span className="flex size-5 items-center justify-center rounded text-white/60">
                              {block.prefix ? (
                                <span className="font-mono text-[11px] font-bold">
                                  {block.prefix}
                                </span>
                              ) : (
                                <Icon className="size-4" />
                              )}
                            </span>
                            <span>{block.label}</span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Main Textarea */}
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Siapa yang harus datang? Tentang apa acara ini?"
              rows={12}
              className="w-full resize-none bg-transparent font-sans text-sm text-white placeholder-white/40 leading-relaxed outline-none"
            />
          </div>
        </div>

        {/* Footer with "Selesai" button matching Screenshot 2 */}
        <div className="flex items-center justify-end border-t border-white/10 bg-[#16171b] px-6 py-3.5">
          <button
            type="button"
            onClick={handleDone}
            className="rounded-xl bg-white px-6 py-2 text-xs font-semibold text-black shadow-sm transition-all hover:bg-white/90 active:scale-95 cursor-pointer"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
}
