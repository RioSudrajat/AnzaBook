import * as React from "react";
import type { Editor } from "@tiptap/react";
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  BarChart2,
  Bold,
  BookOpen,
  Calculator,
  ChevronDown,
  ChevronRight,
  Code,
  Feather,
  FileText,
  FoldVertical,
  Headphones,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Lightbulb,
  Link as LinkIcon,
  List,
  ListOrdered,
  Lock,
  MessageSquare,
  Minus,
  MousePointerClick,
  Quote,
  Redo,
  Sigma,
  Strikethrough,
  Type,
  Undo,
  Users,
  Utensils,
  Video,
} from "lucide-react";
import {
  SubstackInsertDialog,
  type SubstackInsertType,
} from "./substack-insert-dialog";

interface SubstackEditorToolbarProps {
  editor: Editor | null;
  className?: string;
}

export function SubstackEditorToolbar({
  editor,
  className = "",
}: SubstackEditorToolbarProps) {
  // Dropdown states
  const [isStyleMenuOpen, setIsStyleMenuOpen] = React.useState(false);
  const [isTextColorMenuOpen, setIsTextColorMenuOpen] = React.useState(false);
  const [isHighlightMenuOpen, setIsHighlightMenuOpen] = React.useState(false);
  const [isAlignMenuOpen, setIsAlignMenuOpen] = React.useState(false);
  const [isDividerMenuOpen, setIsDividerMenuOpen] = React.useState(false);
  const [isButtonMenuOpen, setIsButtonMenuOpen] = React.useState(false);
  const [isTemplateMenuOpen, setIsTemplateMenuOpen] = React.useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = React.useState(false);
  const [isAudienceSubmenuOpen, setIsAudienceSubmenuOpen] = React.useState(false);

  // Active color indicator
  const [currentTextColor, setCurrentTextColor] = React.useState("#ef4444"); // Red underline by default like Substack
  const [currentHighlightColor, setCurrentHighlightColor] = React.useState("#fef08a"); // Yellow highlighter bar by default

  // Hidden native file inputs for direct device selection (zero prompt / zero link typing)
  const imageInputRef = React.useRef<HTMLInputElement>(null);
  const audioInputRef = React.useRef<HTMLInputElement>(null);
  const videoInputRef = React.useRef<HTMLInputElement>(null);

  // In-App Insert Dialog State for specialized blocks (LaTeX, Collapsible, Poll, etc.)
  const [activeInsertType, setActiveInsertType] = React.useState<SubstackInsertType | null>(null);
  const [insertInitial1, setInsertInitial1] = React.useState<string | undefined>();
  const [insertInitial2, setInsertInitial2] = React.useState<string | undefined>();

  const containerRef = React.useRef<HTMLDivElement>(null);

  // Close menus on click outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsStyleMenuOpen(false);
        setIsTextColorMenuOpen(false);
        setIsHighlightMenuOpen(false);
        setIsAlignMenuOpen(false);
        setIsDividerMenuOpen(false);
        setIsButtonMenuOpen(false);
        setIsTemplateMenuOpen(false);
        setIsMoreMenuOpen(false);
        setIsAudienceSubmenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!editor) {
    return null;
  }

  const closeAllMenus = () => {
    setIsStyleMenuOpen(false);
    setIsTextColorMenuOpen(false);
    setIsHighlightMenuOpen(false);
    setIsAlignMenuOpen(false);
    setIsDividerMenuOpen(false);
    setIsButtonMenuOpen(false);
    setIsTemplateMenuOpen(false);
    setIsMoreMenuOpen(false);
    setIsAudienceSubmenuOpen(false);
  };

  // Helper to dynamically calculate the next chapter number based on document nodes
  const getSuggestedNextChapter = () => {
    let maxChapter = 1;
    editor.state.doc.descendants((node) => {
      if (node.type.name === "chapterBreak") {
        const num = Number(node.attrs.chapterNumber) || 1;
        if (num > maxChapter) maxChapter = num;
      }
    });
    return maxChapter + 1;
  };

  // --- Direct Device File Upload Handlers (Zero Dialog, Native File Picker) ---
  const handleAddImage = () => {
    closeAllMenus();
    imageInputRef.current?.click();
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      editor.chain().focus().setImage({ src: dataUrl, alt: file.name }).run();
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleAddAudio = () => {
    closeAllMenus();
    audioInputRef.current?.click();
  };

  const handleAudioFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      editor
        .chain()
        .focus()
        .insertContent({
          type: "audioEmbed",
          attrs: { src: dataUrl, title: file.name },
        })
        .run();
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleAddVideo = () => {
    closeAllMenus();
    videoInputRef.current?.click();
  };

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      editor
        .chain()
        .focus()
        .insertContent({
          type: "videoEmbed",
          attrs: { src: dataUrl, title: file.name },
        })
        .run();
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleAddLink = () => {
    closeAllMenus();
    const previousUrl = editor.getAttributes("link").href;
    setInsertInitial1(previousUrl || "https://");
    setActiveInsertType("link");
  };

  const handleSetTextColor = (color: string) => {
    setCurrentTextColor(color);
    if (color === "inherit") {
      editor.chain().focus().unsetColor().run();
    } else {
      editor.chain().focus().setColor(color).run();
    }
    setIsTextColorMenuOpen(false);
  };

  const handleSetHighlight = (color: string) => {
    setCurrentHighlightColor(color);
    if (color === "none") {
      editor.chain().focus().unsetHighlight().run();
    } else {
      editor.chain().focus().setHighlight({ color }).run();
    }
    setIsHighlightMenuOpen(false);
  };

  const handleInsertCallout = () => {
    closeAllMenus();
    editor
      .chain()
      .focus()
      .insertContent({
        type: "calloutBox",
        content: [{ type: "text", text: "Tuliskan catatan penting, konteks historis, atau kutipan di sini..." }],
      })
      .run();
  };

  // Button Insertion (Direct Inline Insertion - Zero Dialog)
  const handleInsertSubstackButton = (variant: "free" | "paid" | "custom") => {
    closeAllMenus();
    if (variant === "free") {
      editor
        .chain()
        .focus()
        .insertContent({
          type: "substackButton",
          attrs: { text: "Langganan Gratis", variant: "free", url: "#" },
        })
        .run();
    } else if (variant === "paid") {
      editor
        .chain()
        .focus()
        .insertContent({
          type: "substackButton",
          attrs: { text: "Beli Naskah / Member Nakama", variant: "paid", url: "#" },
        })
        .run();
    } else if (variant === "custom") {
      editor
        .chain()
        .focus()
        .insertContent({
          type: "substackButton",
          attrs: { text: "Kunjungi Halaman Penting", variant: "custom", url: "#" },
        })
        .run();
    }
  };

  // --- Divider & Break Handlers ---
  const handleInsertThinDivider = () => {
    closeAllMenus();
    editor.chain().focus().insertContent({ type: "thinDivider" }).run();
  };

  const handleInsertMediumDivider = () => {
    closeAllMenus();
    editor.chain().focus().insertContent({ type: "mediumDivider" }).run();
  };

  const handleInsertPageBreak = () => {
    closeAllMenus();
    editor.chain().focus().setPageBreak().run();
  };

  // DIRECT INLINE CHAPTER INSERTION (Zero Modal Dialog - 1 Click!)
  const handleInsertChapterBreak = (defaultNum?: number, defaultTitle?: string) => {
    closeAllMenus();
    const nextNum = defaultNum ?? getSuggestedNextChapter();
    const title =
      defaultTitle ??
      (nextNum === 1
        ? "Langkah Pertama di Bawah Naungan Selembar Awan"
        : `Percakapan dengan Batu Karang di Pantai Sepi`);
    // Append the new chapter at the end of the document to preserve preceding chapters
    editor
      .chain()
      .focus("end")
      .insertContent([
        {
          type: "chapterBreak",
          attrs: { chapterNumber: nextNum, title },
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: `Mulai menulis naskah Bab ${nextNum} di sini...`,
            },
          ],
        },
      ])
      .run();
  };

  // Confirm handler for in-app insert dialog
  const handleConfirmInsert = (val1: string, val2?: string) => {
    if (!activeInsertType) return;
    if (activeInsertType === "chapter") {
      const num = parseInt(val1, 10) || 1;
      const title = val2 || `Bab ${num}`;
      editor.chain().focus().setChapterBreak({ chapterNumber: num, title }).run();
    } else if (activeInsertType === "link") {
      editor.chain().focus().extendMarkRange("link").setLink({ href: val1 }).run();
    } else if (activeInsertType === "image") {
      editor.chain().focus().setImage({ src: val1 }).run();
    } else if (activeInsertType === "audio") {
      editor
        .chain()
        .focus()
        .insertContent({
          type: "audioEmbed",
          attrs: { title: val1, src: val2 || "" },
        })
        .run();
    } else if (activeInsertType === "video") {
      editor
        .chain()
        .focus()
        .insertContent({
          type: "videoEmbed",
          attrs: { src: val1, title: val2 || "Video Naskah" },
        })
        .run();
    } else if (activeInsertType === "buttonCustom") {
      editor
        .chain()
        .focus()
        .insertContent({
          type: "substackButton",
          attrs: { text: val1, variant: "custom", url: val2 || "#" },
        })
        .run();
    } else if (activeInsertType === "footnote") {
      editor
        .chain()
        .focus()
        .insertContent({
          type: "footnoteBlock",
          attrs: { note: val1 },
        })
        .run();
    } else if (activeInsertType === "latex") {
      editor
        .chain()
        .focus()
        .insertContent({
          type: "latexBlock",
          attrs: { formula: val1 },
        })
        .run();
    } else if (activeInsertType === "collapsible") {
      editor
        .chain()
        .focus()
        .insertContent({
          type: "collapsible",
          attrs: { summary: val1 },
          content: [
            {
              type: "text",
              text: "Konten teks penjelasan tambahan atau glosarium yang dapat diciutkan...",
            },
          ],
        })
        .run();
    } else if (activeInsertType === "poll") {
      editor
        .chain()
        .focus()
        .insertContent({
          type: "pollBlock",
          attrs: { question: val1 },
        })
        .run();
    } else if (activeInsertType === "prediction") {
      editor
        .chain()
        .focus()
        .insertContent({
          type: "predictionMarket",
          attrs: { question: val1, chance: "74%" },
        })
        .run();
    } else if (activeInsertType === "recipe") {
      editor
        .chain()
        .focus()
        .insertContent({
          type: "recipeBlock",
          attrs: { title: val1 },
          content: [
            {
              type: "text",
              text: "1. Tinjau kelayakan gagasan naskah.\n2. Lakukan kalkulasi HPP secara terbuka.\n3. Rilis bab cuplikan kepada komunitas.",
            },
          ],
        })
        .run();
    }
    setActiveInsertType(null);
  };

  // Template Insertion (Matching SS 1, SS 2, SS 3)
  const handleInsertTemplate = (
    type: "chapter1" | "chapter2" | "sceneBreak" | "opening" | "dialogue" | "essay" | "epilogue"
  ) => {
    closeAllMenus();
    if (type === "chapter1" || type === "opening") {
      // Sesuai Screenshot 1: Chapter 1 dengan border garis tipis atas & bawah
      editor
        .chain()
        .focus()
        .insertContent([
          {
            type: "chapterBreak",
            attrs: {
              chapterNumber: 1,
              title: "Langkah Pertama di Bawah Naungan Selembar Awan",
            },
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Buku di Indonesia selama puluhan tahun diperlakukan seperti barang mewah kosmetik. Dari selembar label harga Rp95.000 di toko buku jaringan besar, biaya kertas dan cetak sebenarnya tidak sampai Rp18.000. Kemana sisa Rp77.000 lainnya menguap?",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Jawabannya ada pada rantai pasok warisan kolonial: konsinyasi dengan potongan 45% sampai 50% bagi pengelola toko, biaya distributor 15%, pajak ganda, dan risiko buku retur yang hangus di gudang. Sistem ini membuat penerbit harus mencetak oplah kecil dengan harga melambung tinggi agar tidak gulung tikar.",
              },
            ],
          },
        ])
        .run();
    } else if (type === "chapter2") {
      // Sesuai Screenshot 3: Chapter 2+ dengan 4 manik bulat diapit garis tipis
      editor
        .chain()
        .focus()
        .insertContent([
          {
            type: "chapterBreak",
            attrs: {
              chapterNumber: 2,
              title: "Percakapan dengan Batu Karang di Pantai Sepi",
            },
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Hari ketujuh perjalanannya membimbing sang anak Adam tiba di sebuah pesisir pantai samudra yang sunyi senyap, jauh dari ingar-bingar dermaga pelabuhan niaga ataupun resor wisata mewah kaum borjuis. Pasir hitam vulkanik terhampar berkilau diterpa deburan ombak raksasa yang menggulung tak kenal lelah sejak ribuan tahun silam.",
              },
            ],
          },
        ])
        .run();
    } else if (type === "sceneBreak") {
      // Sesuai Screenshot 2: Jeda adegan dengan ✦ ✦ ✦ diapit garis tipis
      editor
        .chain()
        .focus()
        .insertContent([
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Ketika ia menoleh ke belakang untuk terakhir kalinya, menara-menara kota metropolitan yang menjulang angkuh di kejauhan tampak seperti deretan nisan kelabu yang perlahan memudar ditelan bias cahaya matahari pagi yang kian menyala terang.",
              },
            ],
          },
          { type: "pageBreak" },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Jalanan setapak yang ia lalui kian lama kian menanjak meniti punggung perbukitan kapur yang tandus. Di tepi jurang yang dalam, seekor burung elang bersayap cokelat tua terbang melayang anggun tanpa mengepakkan sayapnya, memanfaatkan arus udara panas yang membubung dari dasar lembah.",
              },
            ],
          },
        ])
        .run();
    } else if (type === "dialogue") {
      editor
        .chain()
        .focus()
        .insertContent([
          {
            type: "calloutBox",
            content: [{ type: "text", text: "Transkrip Wawancara Eksklusif dengan Tokoh Utama" }],
          },
          {
            type: "paragraph",
            content: [
              { type: "text", marks: [{ type: "bold" }], text: "Pewawancara: " },
              { type: "text", text: "Apa yang membuat Anda berani mendirikan penerbit mandiri?" },
            ],
          },
          {
            type: "paragraph",
            content: [
              { type: "text", marks: [{ type: "bold" }], text: "Narasumber: " },
              { type: "text", text: "Karena literasi adalah hak dasar, bukan kemewahan toko berpendingin udara." },
            ],
          },
        ])
        .run();
    } else if (type === "essay") {
      editor
        .chain()
        .focus()
        .insertContent([
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Analisis Kritis: Paradoks Industri Perbukuan" }] },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Buku di Indonesia selama puluhan tahun diperlakukan seperti barang mewah kosmetik. Dari label harga Rp95.000, biaya produksi riil kurang dari sepertiganya.",
              },
            ],
          },
          { type: "financialChart" },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Dengan transparansi digital dan skema cetak gotong royong, efisiensi rantai pasok dapat dikembalikan seutuhnya kepada penulis dan pembaca.",
              },
            ],
          },
        ])
        .run();
    } else if (type === "epilogue") {
      editor
        .chain()
        .focus()
        .insertContent([
          { type: "pageBreak" },
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Catatan Penutup & Epilog" }] },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Terima kasih telah membaca draf karya ini. Diskusi dan saran perbaikan sangat berharga bagi penyempurnaan naskah sebelum dicetak secara massal.",
              },
            ],
          },
          {
            type: "substackButton",
            attrs: { text: "Dukung Penulis di AnzaBook", variant: "paid", url: "#" },
          },
        ])
        .run();
    }
  };

  // Label for style dropdown
  const currentStyleLabel = editor.isActive("heading", { level: 1 })
    ? "Judul (H1)"
    : editor.isActive("heading", { level: 2 })
    ? "Subjudul (H2)"
    : editor.isActive("heading", { level: 3 })
    ? "Heading 3"
    : editor.isActive("blockquote")
    ? "Kutipan"
    : "Gaya";

  return (
    <div
      ref={containerRef}
      className={`w-full bg-background/95 backdrop-blur-md border-b border-border/80 px-2 sm:px-4 py-1.5 flex items-center justify-between gap-1 overflow-visible select-none z-30 transition-colors shadow-2xs ${className}`}
      role="toolbar"
      aria-label="Substack Editorial Toolbar"
    >
      {/* Hidden file inputs for direct device selection */}
      <input
        type="file"
        ref={imageInputRef}
        onChange={handleImageFileChange}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={audioInputRef}
        onChange={handleAudioFileChange}
        accept="audio/*"
        className="hidden"
      />
      <input
        type="file"
        ref={videoInputRef}
        onChange={handleVideoFileChange}
        accept="video/*"
        className="hidden"
      />
      {/* Left Formatting Tools Group */}
      <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
        {/* 1. Undo */}
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
        >
          <Undo className="size-3.5" />
        </button>

        {/* 2. Redo */}
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
          title="Redo (Ctrl+Y)"
          aria-label="Redo"
        >
          <Redo className="size-3.5" />
        </button>

        <div className="h-4 w-px bg-border/60 mx-0.5" />

        {/* 3. Gaya Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              const next = !isStyleMenuOpen;
              closeAllMenus();
              setIsStyleMenuOpen(next);
            }}
            className={`h-8 px-2 rounded-lg flex items-center gap-1 text-xs font-medium border transition-colors cursor-pointer ${
              isStyleMenuOpen
                ? "bg-muted text-foreground border-border"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
            title="Pilih Gaya Paragraf"
          >
            <span>{currentStyleLabel}</span>
            <ChevronDown className="size-3 opacity-60" />
          </button>

          {isStyleMenuOpen && (
            <div className="absolute top-full left-0 mt-1 w-44 rounded-xl border border-border bg-popover p-1 shadow-lg z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().setParagraph().run();
                  closeAllMenus();
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-muted transition-colors ${
                  editor.isActive("paragraph") ? "font-bold text-[var(--color-accent)]" : ""
                }`}
              >
                <span>Paragraf Normal</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().toggleHeading({ level: 1 }).run();
                  closeAllMenus();
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-muted transition-colors font-serif font-bold ${
                  editor.isActive("heading", { level: 1 }) ? "text-[var(--color-accent)]" : ""
                }`}
              >
                <Heading1 className="size-3.5" />
                <span>Judul Bab (H1)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().toggleHeading({ level: 2 }).run();
                  closeAllMenus();
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-muted transition-colors font-serif font-semibold ${
                  editor.isActive("heading", { level: 2 }) ? "text-[var(--color-accent)]" : ""
                }`}
              >
                <Heading2 className="size-3.5" />
                <span>Subjudul (H2)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().toggleHeading({ level: 3 }).run();
                  closeAllMenus();
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-muted transition-colors font-serif ${
                  editor.isActive("heading", { level: 3 }) ? "text-[var(--color-accent)]" : ""
                }`}
              >
                <Heading3 className="size-3.5" />
                <span>Bagian Kecil (H3)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().toggleBlockquote().run();
                  closeAllMenus();
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-muted transition-colors italic ${
                  editor.isActive("blockquote") ? "text-[var(--color-accent)]" : ""
                }`}
              >
                <Quote className="size-3.5" />
                <span>Kutipan Sastra</span>
              </button>
            </div>
          )}
        </div>

        <div className="h-4 w-px bg-border/60 mx-0.5" />

        {/* 4. Bold */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`size-8 rounded-lg flex items-center justify-center text-xs font-bold transition-colors cursor-pointer ${
            editor.isActive("bold")
              ? "bg-foreground text-background shadow-2xs font-extrabold"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          }`}
          title="Tebal (Ctrl+B)"
          aria-label="Bold"
        >
          <Bold className="size-3.5" />
        </button>

        {/* 5. Italic */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`size-8 rounded-lg flex items-center justify-center text-xs italic transition-colors cursor-pointer ${
            editor.isActive("italic")
              ? "bg-foreground text-background shadow-2xs font-bold"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          }`}
          title="Miring (Ctrl+I)"
          aria-label="Italic"
        >
          <Italic className="size-3.5" />
        </button>

        {/* 6. Strikethrough */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`size-8 rounded-lg flex items-center justify-center text-xs transition-colors cursor-pointer ${
            editor.isActive("strike")
              ? "bg-foreground text-background shadow-2xs font-bold"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          }`}
          title="Coret (Strikethrough)"
          aria-label="Strikethrough"
        >
          <Strikethrough className="size-3.5" />
        </button>

        {/* 7. Code inline */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={`size-8 rounded-lg flex items-center justify-center text-xs font-mono transition-colors cursor-pointer ${
            editor.isActive("code")
              ? "bg-foreground text-background shadow-2xs font-bold"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          }`}
          title="Kode Inline"
          aria-label="Code"
        >
          <Code className="size-3.5" />
        </button>

        {/* 8. Text Color (T + underline) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              const next = !isTextColorMenuOpen;
              closeAllMenus();
              setIsTextColorMenuOpen(next);
            }}
            className="h-8 px-1.5 rounded-lg flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
            title="Warna Teks"
            aria-label="Warna Teks"
          >
            <div className="flex flex-col items-center">
              <span className="font-serif font-bold text-xs leading-none">T</span>
              <div
                className="w-3.5 h-0.5 mt-0.5 rounded-full"
                style={{ backgroundColor: currentTextColor }}
              />
            </div>
            <ChevronDown className="size-2.5 opacity-60 ml-0.5" />
          </button>

          {isTextColorMenuOpen && (
            <div className="absolute top-full left-0 mt-1 w-36 rounded-xl border border-border bg-popover p-1.5 shadow-lg z-50 text-xs animate-in fade-in zoom-in-95 duration-100 space-y-1">
              <div className="px-2 py-0.5 text-[10px] font-mono uppercase text-muted-foreground">Warna Teks</div>
              <button
                type="button"
                onClick={() => handleSetTextColor("inherit")}
                className="w-full text-left px-2 py-1 rounded flex items-center gap-2 hover:bg-muted"
              >
                <span className="size-3 rounded-full border border-border bg-foreground" />
                <span>Bawaan (Default)</span>
              </button>
              <button
                type="button"
                onClick={() => handleSetTextColor("#ef4444")}
                className="w-full text-left px-2 py-1 rounded flex items-center gap-2 hover:bg-muted text-red-500 font-medium"
              >
                <span className="size-3 rounded-full bg-red-500" />
                <span>Merah</span>
              </button>
              <button
                type="button"
                onClick={() => handleSetTextColor("#3b82f6")}
                className="w-full text-left px-2 py-1 rounded flex items-center gap-2 hover:bg-muted text-blue-500 font-medium"
              >
                <span className="size-3 rounded-full bg-blue-500" />
                <span>Biru</span>
              </button>
              <button
                type="button"
                onClick={() => handleSetTextColor("#10b981")}
                className="w-full text-left px-2 py-1 rounded flex items-center gap-2 hover:bg-muted text-emerald-500 font-medium"
              >
                <span className="size-3 rounded-full bg-emerald-500" />
                <span>Hijau</span>
              </button>
              <button
                type="button"
                onClick={() => handleSetTextColor("#f59e0b")}
                className="w-full text-left px-2 py-1 rounded flex items-center gap-2 hover:bg-muted text-amber-500 font-medium"
              >
                <span className="size-3 rounded-full bg-amber-500" />
                <span>Kuning / Emas</span>
              </button>
              <button
                type="button"
                onClick={() => handleSetTextColor("#8b5cf6")}
                className="w-full text-left px-2 py-1 rounded flex items-center gap-2 hover:bg-muted text-purple-500 font-medium"
              >
                <span className="size-3 rounded-full bg-purple-500" />
                <span>Ungu</span>
              </button>
              <button
                type="button"
                onClick={() => handleSetTextColor("#64748b")}
                className="w-full text-left px-2 py-1 rounded flex items-center gap-2 hover:bg-muted text-slate-500"
              >
                <span className="size-3 rounded-full bg-slate-500" />
                <span>Abu-abu</span>
              </button>
            </div>
          )}
        </div>

        {/* 9. Highlight / Stabilo (A + bar) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              const next = !isHighlightMenuOpen;
              closeAllMenus();
              setIsHighlightMenuOpen(next);
            }}
            className="h-8 px-1.5 rounded-lg flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
            title="Sorotan Stabilo"
            aria-label="Sorotan Stabilo"
          >
            <div className="flex flex-col items-center">
              <span className="font-serif font-bold text-xs leading-none">A</span>
              <div
                className="w-3.5 h-1 mt-0.5 rounded-full"
                style={{ backgroundColor: currentHighlightColor }}
              />
            </div>
            <ChevronDown className="size-2.5 opacity-60 ml-0.5" />
          </button>

          {isHighlightMenuOpen && (
            <div className="absolute top-full left-0 mt-1 w-36 rounded-xl border border-border bg-popover p-1.5 shadow-lg z-50 text-xs animate-in fade-in zoom-in-95 duration-100 space-y-1">
              <div className="px-2 py-0.5 text-[10px] font-mono uppercase text-muted-foreground">Warna Sorotan</div>
              <button
                type="button"
                onClick={() => handleSetHighlight("#fef08a")}
                className="w-full text-left px-2 py-1 rounded flex items-center gap-2 hover:bg-muted"
              >
                <span className="size-3 rounded-full bg-yellow-300 border border-yellow-400" />
                <span>Kuning</span>
              </button>
              <button
                type="button"
                onClick={() => handleSetHighlight("#bbf7d0")}
                className="w-full text-left px-2 py-1 rounded flex items-center gap-2 hover:bg-muted"
              >
                <span className="size-3 rounded-full bg-emerald-200 border border-emerald-400" />
                <span>Hijau</span>
              </button>
              <button
                type="button"
                onClick={() => handleSetHighlight("#bae6fd")}
                className="w-full text-left px-2 py-1 rounded flex items-center gap-2 hover:bg-muted"
              >
                <span className="size-3 rounded-full bg-sky-200 border border-sky-400" />
                <span>Biru Muda</span>
              </button>
              <button
                type="button"
                onClick={() => handleSetHighlight("#fed7aa")}
                className="w-full text-left px-2 py-1 rounded flex items-center gap-2 hover:bg-muted"
              >
                <span className="size-3 rounded-full bg-amber-200 border border-amber-400" />
                <span>Oranye</span>
              </button>
              <button
                type="button"
                onClick={() => handleSetHighlight("#fbcfe8")}
                className="w-full text-left px-2 py-1 rounded flex items-center gap-2 hover:bg-muted"
              >
                <span className="size-3 rounded-full bg-pink-200 border border-pink-400" />
                <span>Pink</span>
              </button>
              <button
                type="button"
                onClick={() => handleSetHighlight("none")}
                className="w-full text-left px-2 py-1 rounded flex items-center gap-2 hover:bg-muted text-muted-foreground"
              >
                <span className="size-3 rounded-full border border-dashed border-border" />
                <span>Hapus Sorotan</span>
              </button>
            </div>
          )}
        </div>

        <div className="h-4 w-px bg-border/60 mx-0.5" />

        {/* 10. Link */}
        <button
          type="button"
          onClick={handleAddLink}
          className={`size-8 rounded-lg flex items-center justify-center text-xs transition-colors cursor-pointer ${
            editor.isActive("link")
              ? "bg-[var(--color-accent)] text-white shadow-2xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          }`}
          title="Sisipkan Tautan (Link)"
          aria-label="Insert Link"
        >
          <LinkIcon className="size-3.5" />
        </button>

        {/* 11. Image */}
        <button
          type="button"
          onClick={handleAddImage}
          className="size-8 rounded-lg flex items-center justify-center text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
          title="Sisipkan Gambar / Ilustrasi"
          aria-label="Insert Image"
        >
          <ImageIcon className="size-3.5" />
        </button>

        {/* 12. Audio Embed (Direct Device File Selection) */}
        <button
          type="button"
          onClick={handleAddAudio}
          className="size-8 rounded-lg flex items-center justify-center text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
          title="Sisipkan Audio dari Perangkat (Device File)"
          aria-label="Audio Embed"
        >
          <Headphones className="size-3.5" />
        </button>

        {/* 13. Video Embed (Direct Device File Selection) */}
        <button
          type="button"
          onClick={handleAddVideo}
          className="size-8 rounded-lg flex items-center justify-center text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
          title="Sisipkan Video dari Perangkat (Device File)"
          aria-label="Video Embed"
        >
          <Video className="size-3.5" />
        </button>

        {/* 14. Callout / Speech bubble */}
        <button
          type="button"
          onClick={handleInsertCallout}
          className="size-8 rounded-lg flex items-center justify-center text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
          title="Kotak Catatan / Insight Penulis"
          aria-label="Callout Box"
        >
          <MessageSquare className="size-3.5" />
        </button>

        <div className="h-4 w-px bg-border/60 mx-0.5" />

        {/* 15. Bullet list */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`size-8 rounded-lg flex items-center justify-center text-xs transition-colors cursor-pointer ${
            editor.isActive("bulletList")
              ? "bg-foreground text-background shadow-2xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          }`}
          title="Poin Daftar (Bullet List)"
          aria-label="Bullet List"
        >
          <List className="size-3.5" />
        </button>

        {/* 16. Numbered list */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`size-8 rounded-lg flex items-center justify-center text-xs transition-colors cursor-pointer ${
            editor.isActive("orderedList")
              ? "bg-foreground text-background shadow-2xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          }`}
          title="Daftar Bernomor (Numbered List)"
          aria-label="Numbered List"
        >
          <ListOrdered className="size-3.5" />
        </button>

        {/* 17. Alignment Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              const next = !isAlignMenuOpen;
              closeAllMenus();
              setIsAlignMenuOpen(next);
            }}
            className="h-8 px-1.5 rounded-lg flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
            title="Perataan Teks"
            aria-label="Perataan Teks"
          >
            <AlignLeft className="size-3.5" />
            <ChevronDown className="size-2.5 opacity-60 ml-0.5" />
          </button>

          {isAlignMenuOpen && (
            <div className="absolute top-full left-0 mt-1 w-36 rounded-xl border border-border bg-popover p-1 shadow-lg z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().setTextAlign("left").run();
                  closeAllMenus();
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-muted"
              >
                <AlignLeft className="size-3.5" />
                <span>Rata Kiri</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().setTextAlign("center").run();
                  closeAllMenus();
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-muted"
              >
                <AlignCenter className="size-3.5" />
                <span>Rata Tengah</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().setTextAlign("right").run();
                  closeAllMenus();
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-muted"
              >
                <AlignRight className="size-3.5" />
                <span>Rata Kanan</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().setTextAlign("justify").run();
                  closeAllMenus();
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-muted"
              >
                <AlignJustify className="size-3.5" />
                <span>Rata Kanan-Kiri</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right Dropdown Buttons Group (+ Bab Baru, Pemisah, Tombol, Templat, Lainnya) */}
      <div className="flex items-center gap-1.5 shrink-0 pl-2">
        {/* + Bab Baru (Direct Chapter Break CTA) */}
        <button
          type="button"
          onClick={() => handleInsertChapterBreak()}
          className="h-8 px-2.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold bg-primary/10 hover:bg-primary/20 text-foreground border border-primary/20 transition-all cursor-pointer shrink-0"
          title="Tambah Bab Baru (Bab 1: Format SS 1 / Bab 2+: Format SS 3)"
        >
          <BookOpen className="size-3.5 text-[var(--color-accent)]" />
          <span>+ Bab Baru</span>
        </button>

        {/* Pemisah ▼ (Dividers: Thin, Medium, Scene Break, Bab, Paywall) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              const next = !isDividerMenuOpen;
              closeAllMenus();
              setIsDividerMenuOpen(next);
            }}
            className={`h-8 px-2 rounded-lg flex items-center gap-1 text-xs font-medium border transition-all cursor-pointer ${
              isDividerMenuOpen
                ? "bg-muted text-foreground border-border"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
            title="Pilih Garis Pemisah & Pembatas"
          >
            <Minus className="size-3.5" />
            <span>Pemisah</span>
            <ChevronDown className="size-3 opacity-70" />
          </button>

          {isDividerMenuOpen && (
            <div className="absolute top-full right-0 sm:left-0 mt-1 w-64 rounded-xl border border-border bg-popover p-1.5 shadow-xl z-50 text-xs animate-in fade-in zoom-in-95 duration-100 space-y-1">
              <div className="px-2 py-0.5 text-[10px] font-mono uppercase text-muted-foreground font-bold">
                Garis & Pembatas Naskah
              </div>

              {/* 1. Garis Tipis */}
              <button
                type="button"
                onClick={handleInsertThinDivider}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-muted transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-px bg-current/40 group-hover:bg-foreground" />
                  <span className="font-medium">Garis Tipis</span>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">Hairline</span>
              </button>

              {/* 2. Garis Sedang */}
              <button
                type="button"
                onClick={handleInsertMediumDivider}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-muted transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-0.5 bg-current/70 group-hover:bg-foreground" />
                  <span className="font-medium">Garis Sedang</span>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">Medium</span>
              </button>

              {/* 3. Pembatas Halaman (✦ ✦ ✦ SS 2) */}
              <button
                type="button"
                onClick={handleInsertPageBreak}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-muted transition-colors flex items-center justify-between text-[var(--color-accent)]"
              >
                <div className="flex items-center gap-2">
                  <span className="font-serif text-xs tracking-widest">✦ ✦ ✦</span>
                  <span className="font-medium">Pembatas Halaman</span>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">Scene Break</span>
              </button>

              <div className="h-px bg-border/60 my-1" />

              <div className="px-2 py-0.5 text-[10px] font-mono uppercase text-muted-foreground font-bold">
                Pembatas Bab & Dinding
              </div>

              {/* 4. Pembatas Bab Baru */}
              <button
                type="button"
                onClick={() => handleInsertChapterBreak()}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-muted transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="size-3.5 text-sky-500" />
                  <span className="font-medium">Pembatas Bab Baru</span>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">Chapter</span>
              </button>

              {/* 5. Dinding Gratis */}
              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().setNakamaPaywall().run();
                  closeAllMenus();
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-amber-500/10 text-amber-700 dark:text-amber-300 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Lock className="size-3.5 text-amber-500" />
                  <span className="font-semibold">Dinding Gratis</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500 text-white font-mono uppercase font-bold">
                  Baru
                </span>
              </button>
            </div>
          )}
        </div>

        {/* 18. Tombol ▼ (Substack Button CTA) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              const next = !isButtonMenuOpen;
              closeAllMenus();
              setIsButtonMenuOpen(next);
            }}
            className={`h-8 px-2.5 rounded-lg flex items-center gap-1 text-xs font-medium border transition-all cursor-pointer ${
              isButtonMenuOpen
                ? "bg-muted text-foreground border-border"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
            title="Sisipkan Tombol Aksi (CTA Button)"
          >
            <span>Tombol</span>
            <ChevronDown className="size-3 opacity-70" />
          </button>

          {isButtonMenuOpen && (
            <div className="absolute top-full right-0 mt-1 w-44 rounded-xl border border-border bg-popover p-1 shadow-xl z-50 text-xs animate-in fade-in zoom-in-95 duration-100 space-y-0.5">
              <button
                type="button"
                onClick={() => handleInsertSubstackButton("free")}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-muted transition-colors flex items-center gap-2"
              >
                <MousePointerClick className="size-3.5 text-muted-foreground" />
                <span>Pembaca gratis</span>
              </button>
              <button
                type="button"
                onClick={() => handleInsertSubstackButton("paid")}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-muted transition-colors flex items-center gap-2"
              >
                <Lock className="size-3.5 text-amber-500" />
                <span>Pembaca berbayar</span>
              </button>
              <button
                type="button"
                onClick={() => handleInsertSubstackButton("custom")}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-muted transition-colors flex items-center gap-2"
              >
                <FileText className="size-3.5 text-muted-foreground" />
                <span>Kustom</span>
              </button>
            </div>
          )}
        </div>

        {/* 19. Templat ▼ */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              const next = !isTemplateMenuOpen;
              closeAllMenus();
              setIsTemplateMenuOpen(next);
            }}
            className={`h-8 px-2.5 rounded-lg flex items-center gap-1 text-xs font-medium border transition-all cursor-pointer ${
              isTemplateMenuOpen
                ? "bg-muted text-foreground border-border"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
            title="Sisipkan Templat Naskah Sesuai Format Resmi"
          >
            <span>Templat</span>
            <ChevronDown className="size-3 opacity-70" />
          </button>

          {isTemplateMenuOpen && (
            <div className="absolute top-full right-0 mt-1 w-60 rounded-xl border border-border bg-popover p-1.5 shadow-xl z-50 text-xs animate-in fade-in zoom-in-95 duration-100 space-y-0.5">
              <div className="px-2 py-0.5 text-[10px] font-mono uppercase text-muted-foreground font-bold">
                Format Bab Sesuai Standar
              </div>
              <button
                type="button"
                onClick={() => handleInsertTemplate("chapter1")}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-muted transition-colors flex items-center gap-2"
              >
                <BookOpen className="size-3.5 text-[var(--color-accent)] shrink-0" />
                <div>
                  <div className="font-medium">Bab 1: Permulaan</div>
                  <div className="text-[10px] text-muted-foreground">Header garis atas & bawah (SS 1)</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleInsertTemplate("chapter2")}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-muted transition-colors flex items-center gap-2"
              >
                <BookOpen className="size-3.5 text-sky-500 shrink-0" />
                <div>
                  <div className="font-medium">Bab 2+: Lanjutan</div>
                  <div className="text-[10px] text-muted-foreground">Transisi 4 manik bulat (SS 3)</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleInsertTemplate("sceneBreak")}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-muted transition-colors flex items-center gap-2"
              >
                <span className="font-serif text-xs text-amber-500 shrink-0">✦✦✦</span>
                <div>
                  <div className="font-medium">Jeda Halaman / Adegan</div>
                  <div className="text-[10px] text-muted-foreground">Bintang diamond ✦ ✦ ✦ (SS 2)</div>
                </div>
              </button>

              <div className="h-px bg-border/60 my-1" />

              <div className="px-2 py-0.5 text-[10px] font-mono uppercase text-muted-foreground font-bold">
                Format Lainnya
              </div>
              <button
                type="button"
                onClick={() => handleInsertTemplate("dialogue")}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-muted transition-colors flex items-center gap-2"
              >
                <MessageSquare className="size-3.5 text-sky-500 shrink-0" />
                <span>Dialog / Wawancara</span>
              </button>
              <button
                type="button"
                onClick={() => handleInsertTemplate("essay")}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-muted transition-colors flex items-center gap-2"
              >
                <FileText className="size-3.5 text-emerald-500 shrink-0" />
                <span>Esai / Analisis</span>
              </button>
              <button
                type="button"
                onClick={() => handleInsertTemplate("epilogue")}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-muted transition-colors flex items-center gap-2"
              >
                <Feather className="size-3.5 text-amber-500 shrink-0" />
                <span>Epilog / Penutup</span>
              </button>
            </div>
          )}
        </div>

        {/* 20. Lainnya ▼ (Full 12-item Substack Menu from SS 2) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              const next = !isMoreMenuOpen;
              closeAllMenus();
              setIsMoreMenuOpen(next);
            }}
            className={`h-8 px-2.5 rounded-lg flex items-center gap-1 text-xs font-semibold border transition-all cursor-pointer ${
              isMoreMenuOpen
                ? "bg-[var(--color-accent)] text-white border-[var(--color-accent)]"
                : "border-border/80 bg-muted/40 hover:bg-muted text-foreground"
            }`}
            title="Menu Tambahan Naskah"
          >
            <span>Lainnya</span>
            <ChevronDown className="size-3 opacity-70" />
          </button>

          {isMoreMenuOpen && (
            <div className="absolute top-full right-0 mt-1 w-64 max-h-[calc(100vh-140px)] overflow-y-auto rounded-xl border border-border bg-popover p-1.5 shadow-2xl z-50 text-xs animate-in fade-in zoom-in-95 duration-100 space-y-0.5">
              {/* 1. Konten khusus untuk audiens tertentu > */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsAudienceSubmenuOpen(!isAudienceSubmenuOpen)}
                  className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-muted transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <Users className="size-4 text-muted-foreground" />
                    <span className="font-medium text-foreground">Konten khusus untuk audiens tertentu</span>
                  </div>
                  <ChevronRight className="size-3 opacity-60" />
                </button>

                {isAudienceSubmenuOpen && (
                  <div className="absolute right-full top-0 mr-1 w-48 rounded-xl border border-border bg-popover p-1 shadow-xl z-50 text-xs space-y-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        editor
                          .chain()
                          .focus()
                          .insertContent({
                            type: "audienceGated",
                            attrs: { tier: "free" },
                            content: [{ type: "text", text: "Konten ini dapat dibaca oleh seluruh pengunjung gratis..." }],
                          })
                          .run();
                        closeAllMenus();
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-muted"
                    >
                      <span>🟢 Pembaca gratis</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        editor
                          .chain()
                          .focus()
                          .insertContent({
                            type: "audienceGated",
                            attrs: { tier: "nakama" },
                            content: [{ type: "text", text: "Konten ini hanya dapat dibaca oleh Member Nakama terverifikasi..." }],
                          })
                          .run();
                        closeAllMenus();
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-muted"
                    >
                      <span>⭐ Member Nakama</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        editor
                          .chain()
                          .focus()
                          .insertContent({
                            type: "audienceGated",
                            attrs: { tier: "physical" },
                            content: [{ type: "text", text: "Konten eksklusif untuk pemilik buku edisi cetak fisik..." }],
                          })
                          .run();
                        closeAllMenus();
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-muted"
                    >
                      <span>📦 Pemilik Buku Fisik</span>
                    </button>
                  </div>
                )}
              </div>

              {/* 2. Blok kode */}
              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().toggleCodeBlock().run();
                  closeAllMenus();
                }}
                className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-muted transition-colors flex items-center gap-2.5"
              >
                <Code className="size-4 text-muted-foreground" />
                <span>Blok kode</span>
              </button>

              {/* 3. Pemisah (Page Break / Scene Break) */}
              <button
                type="button"
                onClick={handleInsertPageBreak}
                className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-muted transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <Minus className="size-4 text-muted-foreground" />
                  <span>Pemisah Halaman</span>
                </div>
                <span className="font-serif text-xs opacity-60 tracking-wider">✦ ✦ ✦</span>
              </button>

              {/* 4. Grafik keuangan */}
              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().insertContent({ type: "financialChart" }).run();
                  closeAllMenus();
                }}
                className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-muted transition-colors flex items-center gap-2.5"
              >
                <Calculator className="size-4 text-muted-foreground" />
                <span>Grafik keuangan</span>
              </button>

              {/* 5. Catatan kaki */}
              <button
                type="button"
                onClick={() => {
                  closeAllMenus();
                  setInsertInitial1("Rujukan data dari Perpustakaan Nasional RI.");
                  setActiveInsertType("footnote");
                }}
                className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-muted transition-colors flex items-center gap-2.5"
              >
                <span className="size-4 text-center font-bold text-muted-foreground leading-none">*</span>
                <span>Catatan kaki</span>
              </button>

              {/* 6. LaTeX */}
              <button
                type="button"
                onClick={() => {
                  closeAllMenus();
                  setInsertInitial1("E = mc^2 \\quad \\Longleftrightarrow \\quad \\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}");
                  setActiveInsertType("latex");
                }}
                className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-muted transition-colors flex items-center gap-2.5"
              >
                <Sigma className="size-4 text-muted-foreground" />
                <span>LaTeX</span>
              </button>

              {/* 7. Dinding gratis [Baru] (Paywall) */}
              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().setNakamaPaywall().run();
                  closeAllMenus();
                }}
                className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-amber-500/10 text-amber-700 dark:text-amber-300 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <Lock className="size-4 text-amber-500" />
                  <span className="font-semibold">Dinding gratis</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500 text-white font-mono uppercase font-bold">
                  Baru
                </span>
              </button>

              {/* 8. Konten diciutkan */}
              <button
                type="button"
                onClick={() => {
                  closeAllMenus();
                  setInsertInitial1("Lampiran Data & Glosarium Istilah");
                  setActiveInsertType("collapsible");
                }}
                className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-muted transition-colors flex items-center gap-2.5"
              >
                <FoldVertical className="size-4 text-muted-foreground" />
                <span>Konten diciutkan</span>
              </button>

              {/* 9. Puisi */}
              <button
                type="button"
                onClick={() => {
                  editor
                    .chain()
                    .focus()
                    .insertContent({
                      type: "poetryBlock",
                      content: [
                        {
                          type: "text",
                          text: "Di rimba aksara kita bersua,\nBukan tentang siapa yang berkuasa,\nMelainkan tentang suara yang merdeka,\nMengalir melintasi pulau dan samudra.",
                        },
                      ],
                    })
                    .run();
                  closeAllMenus();
                }}
                className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-muted transition-colors flex items-center gap-2.5"
              >
                <Feather className="size-4 text-muted-foreground" />
                <span>Puisi</span>
              </button>

              {/* 10. Jajak pendapat */}
              <button
                type="button"
                onClick={() => {
                  closeAllMenus();
                  setInsertInitial1("Apakah Anda setuju dengan argumen di bab ini?");
                  setActiveInsertType("poll");
                }}
                className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-muted transition-colors flex items-center gap-2.5"
              >
                <BarChart2 className="size-4 text-muted-foreground" />
                <span>Jajak pendapat</span>
              </button>

              {/* 11. Pasar prediksi */}
              <button
                type="button"
                onClick={() => {
                  closeAllMenus();
                  setInsertInitial1("Peluang adaptasi ke layar lebar dalam 2 tahun");
                  setActiveInsertType("prediction");
                }}
                className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-muted transition-colors flex items-center gap-2.5"
              >
                <Lightbulb className="size-4 text-muted-foreground" />
                <span>Pasar prediksi</span>
              </button>

              {/* 12. Resep */}
              <button
                type="button"
                onClick={() => {
                  closeAllMenus();
                  setInsertInitial1("Prosedur Kurasi Buku Gotong Royong");
                  setActiveInsertType("recipe");
                }}
                className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-muted transition-colors flex items-center gap-2.5"
              >
                <Utensils className="size-4 text-muted-foreground" />
                <span>Resep</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modern In-App Insert Dialog (Zero window.prompt) */}
      <SubstackInsertDialog
        isOpen={activeInsertType !== null}
        onClose={() => setActiveInsertType(null)}
        type={activeInsertType}
        initialValue1={insertInitial1}
        initialValue2={insertInitial2}
        onConfirm={handleConfirmInsert}
      />
    </div>
  );
}
