import { Node, mergeAttributes, type CommandProps } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { ChapterBreakNodeView } from "./chapter-break-view";

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
  priority: 1000,
  group: "block",
  content: "inline*",
  defining: true,
  isolating: true,
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
      // Legacy attribute retained only so historical HTML/JSON parses cleanly into inline content.
      title: {
        default: null,
        parseHTML: (element: HTMLElement) =>
          element.getAttribute("data-chapter-title") || null,
        rendered: false,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="chapter-break"]',
        contentElement: "[data-chapter-title-editable], h1, h2",
      },
    ];
  },

  renderHTML({
    node,
    HTMLAttributes,
  }: {
    node: { attrs: Record<string, unknown> };
    HTMLAttributes: Record<string, unknown>;
  }) {
    const chapterNumber =
      Number(
        node.attrs.chapterNumber || HTMLAttributes["data-chapter-number"],
      ) || 1;

    if (chapterNumber === 1) {
      return [
        "div",
        mergeAttributes(HTMLAttributes, {
          "data-type": "chapter-break",
          "data-chapter-number": chapterNumber,
          class: "tiptap-chapter-break mt-2 mb-10 pt-2 pb-4 text-center w-full",
        }),
        [
          "div",
          {
            class:
              "text-xs font-mono uppercase tracking-[0.2em] opacity-60 mb-2",
          },
          "CHAPTER 1",
        ],
        [
          "h1",
          {
            "data-chapter-title-editable": "true",
            class:
              "font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground",
          },
          0,
        ],
        ["div", { class: "w-full h-px bg-current/15 mt-6" }],
      ];
    }

    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "chapter-break",
        "data-chapter-number": chapterNumber,
        class: "tiptap-chapter-break pt-14 pb-8 text-center w-full",
      }),
      [
        "div",
        {
          class: "flex items-center justify-center gap-3 mb-6 text-current/30",
        },
        ["div", { class: "w-16 h-px bg-current/20" }],
        [
          "div",
          { class: "flex items-center gap-1.5" },
          [
            "span",
            { class: "size-1.5 rounded-full bg-current/40 inline-block" },
          ],
          ["span", { class: "size-2 rounded-full bg-current/70 inline-block" }],
          ["span", { class: "size-2 rounded-full bg-current/70 inline-block" }],
          [
            "span",
            { class: "size-1.5 rounded-full bg-current/40 inline-block" },
          ],
        ],
        ["div", { class: "w-16 h-px bg-current/20" }],
      ],
      [
        "div",
        {
          class: "text-xs font-mono uppercase tracking-[0.2em] opacity-60 mb-2",
        },
        `CHAPTER ${chapterNumber}`,
      ],
      [
        "h2",
        {
          "data-chapter-title-editable": "true",
          class:
            "font-serif text-xl sm:text-2xl font-bold tracking-tight text-foreground",
        },
        0,
      ],
      ["div", { class: "w-full h-px bg-current/15 mt-6" }],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ChapterBreakNodeView);
  },

  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        const { $from } = editor.state.selection;
        if ($from.parent.type.name !== this.name) return false;
        const afterPos = $from.after();
        const nextNode = editor.state.doc.nodeAt(afterPos);
        if (
          nextNode &&
          nextNode.type.name === "paragraph" &&
          nextNode.textContent.trim().length === 0
        ) {
          return editor
            .chain()
            .setTextSelection(afterPos + 1)
            .scrollIntoView()
            .run();
        }
        return editor
          .chain()
          .insertContentAt(afterPos, { type: "paragraph" })
          .setTextSelection(afterPos + 1)
          .scrollIntoView()
          .run();
      },
    };
  },

  onTransaction({ transaction }) {
    if (!transaction.docChanged) return;
    if (transaction.getMeta("anzabookChapterSync")) return;
    const { state, view } = this.editor;
    if (!view) return;
    let chapterIdx = 1;
    let tr = state.tr;
    let modified = false;
    state.doc.descendants((node, pos) => {
      if (node.type.name === "chapterBreak") {
        if (Number(node.attrs.chapterNumber) !== chapterIdx) {
          tr = tr.setNodeMarkup(pos, undefined, {
            ...node.attrs,
            chapterNumber: chapterIdx,
          });
          modified = true;
        }
        chapterIdx += 1;
      }
    });
    if (modified) {
      tr.setMeta("addToHistory", false);
      tr.setMeta("anzabookChapterSync", true);
      view.dispatch(tr);
    }
  },

  addCommands() {
    return {
      setChapterBreak:
        (options?: ChapterBreakOptions) =>
        ({ chain, editor }: CommandProps) => {
          const title = options?.title?.trim() ?? "";
          const insertPos = editor.state.selection.from;
          return chain()
            .insertContent([
              {
                type: this.name,
                attrs: { chapterNumber: options?.chapterNumber || 1 },
                ...(title ? { content: [{ type: "text", text: title }] } : {}),
              },
              { type: "paragraph" },
            ])
            .setTextSelection(insertPos + 1)
            .run();
        },
    };
  },
});
