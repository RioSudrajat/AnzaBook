import { Node, mergeAttributes } from "@tiptap/core";

export interface ChapterBreakOptions {
  chapterNumber?: number;
  title?: string;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    chapterBreak: {
      setChapterBreak: (options?: ChapterBreakOptions) => ReturnType;
    };
  }
}

export const ChapterBreak = Node.create({
  name: "chapterBreak",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      chapterNumber: {
        default: 1,
        parseHTML: (element: HTMLElement) =>
          Number(element.getAttribute("data-chapter-number")) || 1,
        renderHTML: (attributes: Record<string, unknown>) => ({
          "data-chapter-number": attributes.chapterNumber,
        }),
      },
      title: {
        default: "Bab Baru",
        parseHTML: (element: HTMLElement) =>
          element.getAttribute("data-chapter-title") || "Bab Baru",
        renderHTML: (attributes: Record<string, unknown>) => ({
          "data-chapter-title": attributes.title,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="chapter-break"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    const chapterNumber = Number(HTMLAttributes["data-chapter-number"]) || 1;
    const title = String(HTMLAttributes["data-chapter-title"] || "Bab Baru");

    // Skenario 1 (Bab 1 Opening Sesuai SS 1): Garis tipis atas, CHAPTER 1, Judul Besar Serif, Garis tipis bawah
    if (chapterNumber === 1) {
      return [
        "div",
        mergeAttributes(HTMLAttributes, {
          "data-type": "chapter-break",
          "data-chapter-number": chapterNumber,
          "data-chapter-title": title,
          class:
            "tiptap-chapter-break my-12 py-8 text-center select-none w-full",
        }),
        ["div", { class: "w-full h-px bg-current/15 mb-8" }],
        [
          "div",
          {
            class:
              "text-xs font-mono uppercase tracking-[0.2em] opacity-60 mb-2 select-none",
          },
          "CHAPTER 1",
        ],
        [
          "h1",
          {
            class:
              "font-serif text-2xl sm:text-3xl font-bold tracking-tight mb-8 text-foreground",
          },
          title,
        ],
        ["div", { class: "w-full h-px bg-current/15" }],
      ];
    }

    // Skenario 2 (Bab 2+ Transition Sesuai SS 3): 4 Beads bulat flanked by lines, CHAPTER X, Judul Besar Serif
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "chapter-break",
        "data-chapter-number": chapterNumber,
        "data-chapter-title": title,
        class:
          "tiptap-chapter-break pt-16 pb-10 text-center select-none w-full",
      }),
      [
        "div",
        { class: "flex items-center justify-center gap-3 mb-6 text-current/30" },
        ["div", { class: "w-16 h-px bg-current/20" }],
        [
          "div",
          { class: "flex items-center gap-1.5" },
          ["span", { class: "size-1.5 rounded-full bg-current/40 inline-block" }],
          ["span", { class: "size-2 rounded-full bg-current/70 inline-block" }],
          ["span", { class: "size-2 rounded-full bg-current/70 inline-block" }],
          ["span", { class: "size-1.5 rounded-full bg-current/40 inline-block" }],
        ],
        ["div", { class: "w-16 h-px bg-current/20" }],
      ],
      [
        "div",
        {
          class:
            "text-xs font-mono uppercase tracking-[0.2em] opacity-60 mb-2 select-none",
        },
        `CHAPTER ${chapterNumber}`,
      ],
      [
        "h2",
        {
          class:
            "font-serif text-xl sm:text-2xl font-bold tracking-tight text-foreground",
        },
        title,
      ],
    ];
  },

  addCommands() {
    return {
      setChapterBreak:
        (options?: ChapterBreakOptions) =>
        ({ chain }: { chain: () => any }) => {
          return chain()
            .insertContent({
              type: this.name,
              attrs: {
                chapterNumber: options?.chapterNumber || 1,
                title: options?.title || "Bab Baru",
              },
            })
            .run();
        },
    };
  },
});
