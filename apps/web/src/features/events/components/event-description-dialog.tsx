import * as React from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import {
  AlignLeft,
  Bold,
  Heading1,
  Heading2,
  ImagePlus,
  Italic,
  List,
  ListOrdered,
  Loader2,
  Minus,
  Pencil,
  Pilcrow,
  Plus,
  Quote,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadMediaImage } from "@/features/social/api";
import { isUsableAssetUrl } from "@/lib/media-url";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import {
  markdownToTiptapDoc,
  tiptapDocToMarkdown,
} from "../event-description-doc";
import { EventDescriptionRenderer } from "./event-description-renderer";

interface EventDescriptionDialogProps {
  open: boolean;
  onClose: () => void;
  value: string;
  onSave: (desc: string) => void;
}

export interface EventDescriptionInlineEditorProps {
  value: string;
  onChange: (markdown: string) => void;
  defaultExpanded?: boolean;
}

const DESCRIPTION_PLACEHOLDER =
  "Siapa yang harus datang? Tentang apa acara ini?";

type BlockMenuOption = {
  id: string;
  label: string;
  description: string;
  icon: typeof Heading1;
  prefix?: string;
};

const BLOCK_MENU_OPTIONS: readonly BlockMenuOption[] = [
  {
    id: "paragraph",
    label: "Paragraf",
    description: "Teks isi biasa",
    icon: Pilcrow,
  },
  {
    id: "h1",
    label: "Heading",
    description: "Judul bagian utama",
    icon: Heading1,
    prefix: "H1",
  },
  {
    id: "h2",
    label: "Subheading",
    description: "Subjudul topik atau sesi",
    icon: Heading2,
    prefix: "H2",
  },
  {
    id: "quote",
    label: "Kutipan",
    description: "Cuplikan buku atau catatan sorotan",
    icon: Quote,
  },
  {
    id: "bulletList",
    label: "Daftar Poin",
    description: "Butir agenda atau perlengkapan",
    icon: List,
  },
  {
    id: "orderedList",
    label: "Daftar Bernomor",
    description: "Urutan susunan acara",
    icon: ListOrdered,
  },
  {
    id: "divider",
    label: "Garis Pemisah",
    description: "Batas antar bagian",
    icon: Minus,
  },
  {
    id: "image",
    label: "Unggah Gambar",
    description: "Sisipkan foto venue atau poster pendukung",
    icon: ImagePlus,
  },
];

export function EventDescriptionInlineEditor({
  value,
  onChange,
  defaultExpanded = false,
}: EventDescriptionInlineEditorProps) {
  const [isEditing, setIsEditing] = React.useState(defaultExpanded);
  const [snapshotBeforeEdit, setSnapshotBeforeEdit] = React.useState(value);

  if (!isEditing) {
    if (!value.trim()) {
      return (
        <button
          type="button"
          onClick={() => {
            setSnapshotBeforeEdit(value);
            setIsEditing(true);
          }}
          className="group w-full min-h-16 flex items-start gap-3.5 rounded-xl border border-dashed border-border bg-[var(--color-paper-2)] p-4 text-left hover:border-[var(--color-accent)] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring"
        >
          <AlignLeft
            className="mt-0.5 size-4 text-muted-foreground group-hover:text-[var(--color-accent)] shrink-0"
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1 space-y-1">
            <span className="block text-sm font-semibold text-foreground">
              Tambahkan Deskripsi Acara
            </span>
            <span className="block text-xs text-muted-foreground leading-relaxed">
              Ceritakan topik pembahasan, susunan sesi, atau hal yang perlu
              dibawa peserta.
            </span>
          </div>
          <span className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground group-hover:border-[var(--color-accent)] shrink-0">
            <Pencil className="size-3.5" aria-hidden="true" />
            <span>Tulis</span>
          </span>
        </button>
      );
    }

    return (
      <div className="rounded-xl border border-border bg-[var(--color-paper-2)] overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-background/70 px-4 py-2.5">
          <span className="text-xs font-medium text-muted-foreground">
            Deskripsi Acara
          </span>
          <button
            type="button"
            onClick={() => {
              setSnapshotBeforeEdit(value);
              setIsEditing(true);
            }}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground hover:border-[var(--color-accent)] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring"
          >
            <Pencil className="size-3.5" aria-hidden="true" />
            <span>Sunting</span>
          </button>
        </div>
        <div className="p-4 sm:p-5">
          <EventDescriptionRenderer description={value} />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-[var(--color-paper-2)] overflow-visible shadow-xs">
      <TiptapBlockCanvas
        variant="inline"
        initialMarkdown={value}
        onLiveChange={onChange}
        onDone={(markdown) => {
          onChange(markdown);
          setIsEditing(false);
        }}
        onCancel={() => {
          onChange(snapshotBeforeEdit);
          setIsEditing(false);
        }}
      />
    </div>
  );
}

export function EventDescriptionDialog({
  open,
  onClose,
  value,
  onSave,
}: EventDescriptionDialogProps) {
  useBodyScrollLock(open);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/65 p-3 sm:p-6 backdrop-blur-xs"
      style={{ overscrollBehavior: "contain" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-desc-editor-title"
    >
      <div
        data-lenis-prevent
        className="relative flex h-[86dvh] max-h-[680px] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card text-foreground shadow-2xl"
        style={{ overscrollBehavior: "contain" }}
      >
        <div className="flex items-center justify-between border-b border-border bg-[var(--color-paper-2)] px-5 py-3.5">
          <h2
            id="event-desc-editor-title"
            className="font-serif text-base sm:text-lg font-bold text-foreground"
          >
            Deskripsi Acara
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup editor deskripsi"
            className="size-11 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <TiptapBlockCanvas
          variant="modal"
          initialMarkdown={value}
          onDone={(markdown) => {
            onSave(markdown);
            onClose();
          }}
          onCancel={onClose}
        />
      </div>
    </div>
  );
}

type TiptapBlockCanvasProps = {
  variant: "inline" | "modal";
  initialMarkdown: string;
  onLiveChange?: (markdown: string) => void;
  onDone: (markdown: string) => void;
  onCancel: () => void;
};

function TiptapBlockCanvas({
  variant,
  initialMarkdown,
  onLiveChange,
  onDone,
  onCancel,
}: TiptapBlockCanvasProps) {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [openMenuUpward, setOpenMenuUpward] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [gutterY, setGutterY] = React.useState(0);
  const [charCount, setCharCount] = React.useState(initialMarkdown.length);
  const [isUploadingImage, setIsUploadingImage] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [, setToolbarTick] = React.useState(0);

  const canvasRef = React.useRef<HTMLDivElement | null>(null);
  const gutterButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const onLiveChangeRef = React.useRef(onLiveChange);
  React.useEffect(() => {
    onLiveChangeRef.current = onLiveChange;
  }, [onLiveChange]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: {
          openOnClick: false,
          defaultProtocol: "https",
          HTMLAttributes: {
            rel: "noopener noreferrer",
            target: "_blank",
          },
        },
      }),
      Placeholder.configure({
        placeholder: DESCRIPTION_PLACEHOLDER,
      }),
      Image.configure({
        inline: false,
        allowBase64: false,
      }),
    ],
    content: markdownToTiptapDoc(initialMarkdown),
    editorProps: {
      attributes: {
        placeholder: DESCRIPTION_PLACEHOLDER,
        "aria-label": "Deskripsi acara",
        class: `event-desc-editor ${
          variant === "inline" ? "min-h-[210px]" : "min-h-[280px]"
        } w-full outline-none font-sans text-sm sm:text-[15px] leading-relaxed text-foreground`,
      },
    },
  });

  const syncGutterAndMetrics = React.useCallback(
    (emitLiveUpdate: boolean) => {
      if (!editor || !canvasRef.current) return;
      setToolbarTick((t) => t + 1);
      const nextMarkdown = tiptapDocToMarkdown(editor.getJSON());
      setCharCount(nextMarkdown.length);
      if (emitLiveUpdate) {
        onLiveChangeRef.current?.(nextMarkdown);
      }

      try {
        const { from } = editor.state.selection;
        const canvasRect = canvasRef.current.getBoundingClientRect();
        const resolved = editor.state.doc.resolve(from);
        let topOffset: number | null = null;

        if (resolved.depth >= 1) {
          const blockPos = resolved.before(1);
          const domNode = editor.view.nodeDOM(blockPos);
          if (domNode instanceof HTMLElement) {
            topOffset = domNode.getBoundingClientRect().top - canvasRect.top;
          }
        }

        if (topOffset === null) {
          const coords = editor.view.coordsAtPos(from);
          topOffset = coords.top - canvasRect.top;
        }

        setGutterY(Math.max(0, Math.round(topOffset)));
      } catch {
        // Ignore transient selection positions while ProseMirror mounts.
      }
    },
    [editor],
  );

  React.useEffect(() => {
    if (!editor) return;

    const handleSelectionOrFocus = () => {
      syncGutterAndMetrics(false);
    };
    const handleDocUpdate = () => {
      syncGutterAndMetrics(true);
    };

    editor.on("selectionUpdate", handleSelectionOrFocus);
    editor.on("focus", handleSelectionOrFocus);
    editor.on("update", handleDocUpdate);

    const raf = requestAnimationFrame(() => {
      syncGutterAndMetrics(false);
      editor.commands.focus("end");
    });

    return () => {
      cancelAnimationFrame(raf);
      editor.off("selectionUpdate", handleSelectionOrFocus);
      editor.off("focus", handleSelectionOrFocus);
      editor.off("update", handleDocUpdate);
    };
  }, [editor, syncGutterAndMetrics]);

  React.useEffect(() => {
    if (!isMenuOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (
        !(event.target as HTMLElement | null)?.closest("[data-block-gutter]")
      ) {
        setIsMenuOpen(false);
      }
    };
    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [isMenuOpen]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (isMenuOpen) {
        event.preventDefault();
        event.stopImmediatePropagation();
        setIsMenuOpen(false);
        return;
      }
      if (variant === "modal") {
        event.preventDefault();
        event.stopImmediatePropagation();
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () =>
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [isMenuOpen, onCancel, variant]);

  const handleImageFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !editor) return;

    setUploadError(null);
    setIsUploadingImage(true);
    try {
      const uploaded = await uploadMediaImage(file);
      if (!isUsableAssetUrl(uploaded.url)) {
        setUploadError("URL gambar yang dikembalikan server tidak valid.");
        return;
      }
      editor
        .chain()
        .focus()
        .setImage({
          src: uploaded.url,
          alt: file.name.replace(/\.[^.]+$/, "") || "Gambar acara",
        })
        .createParagraphNear()
        .run();
      setIsMenuOpen(false);
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setUploadError(
        apiErr?.message ||
          "Gagal mengunggah gambar (maksimal 5 MB JPG/PNG/WebP).",
      );
    } finally {
      setIsUploadingImage(false);
    }
  };

  const filteredBlocks = BLOCK_MENU_OPTIONS.filter((option) =>
    `${option.label} ${option.description}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase()),
  );

  const handleRunBlockCommand = (blockId: string) => {
    if (!editor) return;
    switch (blockId) {
      case "paragraph":
        editor.chain().focus().setParagraph().run();
        setIsMenuOpen(false);
        break;
      case "h1":
        editor.chain().focus().toggleHeading({ level: 1 }).run();
        setIsMenuOpen(false);
        break;
      case "h2":
        editor.chain().focus().toggleHeading({ level: 2 }).run();
        setIsMenuOpen(false);
        break;
      case "quote":
        editor.chain().focus().toggleBlockquote().run();
        setIsMenuOpen(false);
        break;
      case "bulletList":
        editor.chain().focus().toggleBulletList().run();
        setIsMenuOpen(false);
        break;
      case "orderedList":
        editor.chain().focus().toggleOrderedList().run();
        setIsMenuOpen(false);
        break;
      case "divider":
        editor.chain().focus().setHorizontalRule().run();
        setIsMenuOpen(false);
        break;
      case "image":
        fileInputRef.current?.click();
        break;
    }
  };

  const handleDone = () => {
    if (!editor) {
      onDone(initialMarkdown);
      return;
    }
    onDone(tiptapDocToMarkdown(editor.getJSON()));
  };

  return (
    <div
      className={
        variant === "modal" ? "flex min-h-0 flex-1 flex-col" : "flex flex-col"
      }
    >
      <div
        className={`flex flex-wrap items-center gap-1 border-b border-border bg-background px-3 sm:px-4 py-2 ${
          variant === "inline" ? "rounded-t-xl" : ""
        }`}
        role="toolbar"
        aria-label="Pemformatan teks deskripsi"
      >
        <ToolbarButton
          label="Heading 1"
          active={Boolean(editor?.isActive("heading", { level: 1 }))}
          onClick={() =>
            editor?.chain().focus().toggleHeading({ level: 1 }).run()
          }
        >
          <Heading1 className="size-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          label="Heading 2"
          active={Boolean(editor?.isActive("heading", { level: 2 }))}
          onClick={() =>
            editor?.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          <Heading2 className="size-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          label="Tebal"
          active={Boolean(editor?.isActive("bold"))}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <Bold className="size-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          label="Miring"
          active={Boolean(editor?.isActive("italic"))}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <Italic className="size-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          label="Kutipan"
          active={Boolean(editor?.isActive("blockquote"))}
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="size-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          label="Daftar Poin"
          active={Boolean(editor?.isActive("bulletList"))}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <List className="size-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          label="Daftar Bernomor"
          active={Boolean(editor?.isActive("orderedList"))}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="size-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          label="Garis Pemisah"
          active={false}
          onClick={() => editor?.chain().focus().setHorizontalRule().run()}
        >
          <Minus className="size-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          label="Unggah Gambar"
          active={false}
          disabled={isUploadingImage}
          onClick={() => fileInputRef.current?.click()}
        >
          {isUploadingImage ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <ImagePlus className="size-4" aria-hidden="true" />
          )}
        </ToolbarButton>

        <span className="ml-auto font-mono text-[11px] tabular-nums text-muted-foreground">
          {charCount}/10000
        </span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => void handleImageFileChange(event)}
      />

      {uploadError && (
        <div
          role="alert"
          className="mx-4 mt-3 rounded-lg border border-[var(--color-error)]/40 bg-[var(--color-error-soft)] px-3 py-2 text-xs text-[var(--color-error)]"
        >
          {uploadError}
        </div>
      )}

      <div
        data-lenis-prevent={variant === "modal" ? true : undefined}
        className={
          variant === "modal"
            ? "relative flex-1 overflow-y-auto px-4 sm:px-6 py-5"
            : "relative px-3 sm:px-5 py-4"
        }
        style={
          variant === "modal" ? { overscrollBehavior: "contain" } : undefined
        }
      >
        <div ref={canvasRef} className="relative pl-12">
          <div
            data-block-gutter
            style={{ transform: `translateY(${gutterY}px)` }}
            className="absolute left-0 top-0 z-20 transition-transform duration-150 ease-out"
          >
            <button
              ref={gutterButtonRef}
              type="button"
              onClick={() => {
                const btnRect =
                  gutterButtonRef.current?.getBoundingClientRect();
                const spaceBelow = btnRect
                  ? window.innerHeight - btnRect.bottom
                  : 400;
                setOpenMenuUpward(spaceBelow < 280);
                setSearchQuery("");
                setIsMenuOpen((prev) => !prev);
              }}
              aria-label="Tambahkan atau ubah format blok"
              aria-expanded={isMenuOpen}
              className={`size-9 min-h-9 min-w-9 flex items-center justify-center rounded-lg border transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring ${
                isMenuOpen
                  ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-foreground"
                  : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
              }`}
              title="Sisipkan blok pada baris ini (+)"
            >
              <Plus className="size-4" aria-hidden="true" />
            </button>

            {isMenuOpen && (
              <div
                className={`absolute left-0 z-30 w-64 rounded-xl border border-border bg-card p-1.5 shadow-xl ${
                  openMenuUpward ? "bottom-11" : "top-11"
                }`}
                style={{ overscrollBehavior: "contain" }}
              >
                <div className="flex items-center gap-2 border-b border-border px-2.5 py-1.5 mb-1">
                  <Search
                    className="size-3.5 text-muted-foreground shrink-0"
                    aria-hidden="true"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari jenis blok..."
                    aria-label="Cari jenis blok"
                    className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none"
                    autoFocus
                  />
                </div>

                <div className="max-h-60 overflow-y-auto space-y-0.5 py-0.5">
                  {filteredBlocks.length === 0 ? (
                    <p className="p-3 text-center text-xs text-muted-foreground">
                      Tidak ada blok yang cocok
                    </p>
                  ) : (
                    filteredBlocks.map((block) => {
                      const Icon = block.icon;
                      return (
                        <button
                          key={block.id}
                          type="button"
                          onClick={() => handleRunBlockCommand(block.id)}
                          className="flex w-full min-h-11 items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left hover:bg-muted transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring"
                        >
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-[var(--color-paper-2)] text-foreground">
                            {block.prefix ? (
                              <span className="font-mono text-[11px] font-bold">
                                {block.prefix}
                              </span>
                            ) : (
                              <Icon className="size-3.5" aria-hidden="true" />
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-xs font-semibold text-foreground">
                              {block.label}
                            </span>
                            <span className="block text-[11px] text-muted-foreground truncate">
                              {block.description}
                            </span>
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <EditorContent editor={editor} />
        </div>
      </div>

      <div
        className={`flex items-center justify-end gap-2 border-t border-border bg-background/70 px-4 py-2.5 ${
          variant === "inline" ? "rounded-b-xl" : ""
        }`}
      >
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="min-h-11"
        >
          Batal
        </Button>
        <Button
          type="button"
          onClick={handleDone}
          className="min-h-11 bg-[var(--color-accent)] text-[var(--color-accent-ink)] hover:opacity-90 font-semibold px-5"
        >
          Selesai
        </Button>
      </div>
    </div>
  );
}

type ToolbarButtonProps = {
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
};

function ToolbarButton({
  label,
  active,
  disabled = false,
  onClick,
  children,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`size-9 min-h-9 min-w-9 flex items-center justify-center rounded-md border text-xs transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-40 ${
        active
          ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-foreground font-semibold"
          : "border-transparent bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
