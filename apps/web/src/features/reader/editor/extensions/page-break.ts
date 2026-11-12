import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    pageBreak: {
      setPageBreak: () => ReturnType;
    };
  }
}

export const PageBreak = Node.create({
  name: "pageBreak",
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
    // Sesuai Screenshot 2: Pembatas Jeda Halaman / Adegan dengan ✦ ✦ ✦ diapit garis tipis
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "page-break",
        class:
          "tiptap-page-break my-12 py-6 text-center select-none flex items-center justify-center gap-4 text-current/30 w-full",
      }),
      ["div", { class: "w-16 h-px bg-current/25" }],
      [
        "span",
        {
          class:
            "text-xs tracking-[0.6em] opacity-60 select-none text-current font-serif inline-block px-1",
        },
        "✦ ✦ ✦",
      ],
      ["div", { class: "w-16 h-px bg-current/25" }],
    ];
  },

  addCommands() {
    return {
      setPageBreak:
        () =>
        ({ chain }: { chain: () => any }) => {
          return chain()
            .insertContent({
              type: this.name,
            })
            .run();
        },
    };
  },
});
