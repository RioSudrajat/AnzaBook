import { Node, mergeAttributes, type CommandProps } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { PageBreakNodeView } from "./page-break-view";
import {
  computeProseMirrorPageContext,
  shouldAutoInsertPageBreakOnEnter,
} from "../page-limit";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    pageBreak: {
      setPageBreak: () => ReturnType;
    };
  }
}

export const PageBreak = Node.create({
  name: "pageBreak",
  priority: 1000,
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  parseHTML() {
    return [
      { tag: 'div[data-type="page-break"]' },
      { tag: 'hr[data-type="page-break"]' },
    ];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "page-break",
        class:
          "tiptap-page-break my-10 py-4 text-center flex items-center justify-center gap-4 text-current/40 w-full",
      }),
      ["div", { class: "flex-1 max-w-20 h-px bg-current/25" }],
      [
        "span",
        {
          class:
            "text-xs tracking-[0.55em] opacity-70 text-current font-serif inline-block px-1",
        },
        "✦ ✦ ✦",
      ],
      ["div", { class: "flex-1 max-w-20 h-px bg-current/25" }],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PageBreakNodeView);
  },

  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        const { state, view } = editor;
        const { selection, doc } = state;
        if (!selection.empty) return false;
        const { $from } = selection;
        if ($from.depth !== 1) return false;

        const parentType = $from.parent.type.name;
        if (parentType === "chapterBreak" || parentType === "pageBreak") {
          return false;
        }

        const cursorAtEndOfBlock =
          $from.parentOffset === $from.parent.content.size;
        const currentBlockHasText = $from.parent.textContent.trim().length > 0;
        const ctx = computeProseMirrorPageContext(doc, $from.pos);

        let renderedPageHeightPx: number | undefined;
        try {
          const pageStartDom = view.nodeDOM(ctx.pageStartChildPos);
          const currentDom = view.nodeDOM($from.before(1));
          if (
            pageStartDom instanceof HTMLElement &&
            currentDom instanceof HTMLElement
          ) {
            const top = pageStartDom.getBoundingClientRect().top;
            const bottom = currentDom.getBoundingClientRect().bottom;
            if (bottom > top) {
              renderedPageHeightPx = bottom - top;
            }
          }
        } catch {
          renderedPageHeightPx = undefined;
        }

        if (
          !shouldAutoInsertPageBreakOnEnter({
            wordsInPage: ctx.wordsInPage,
            charsInPage: ctx.charsInPage,
            renderedPageHeightPx,
            cursorAtEndOfBlock,
            currentBlockHasText,
            parentTypeName: parentType,
          })
        ) {
          return false;
        }

        const afterPos = $from.after(1);
        return editor
          .chain()
          .insertContentAt(afterPos, [
            { type: this.name },
            { type: "paragraph" },
          ])
          .setTextSelection(afterPos + 2)
          .scrollIntoView()
          .run();
      },
    };
  },

  addCommands() {
    return {
      setPageBreak:
        () =>
        ({ chain, editor }: CommandProps) => {
          const { $from } = editor.state.selection;
          const insertPos =
            $from.depth >= 1 ? $from.after(1) : editor.state.selection.to;
          return chain()
            .insertContentAt(insertPos, [
              { type: this.name },
              { type: "paragraph" },
            ])
            .setTextSelection(insertPos + 2)
            .scrollIntoView()
            .run();
        },
    };
  },
});
