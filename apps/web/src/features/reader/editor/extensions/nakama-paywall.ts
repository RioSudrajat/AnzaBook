import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    nakamaPaywall: {
      setNakamaPaywall: () => ReturnType;
    };
  }
}

export const NakamaPaywall = Node.create({
  name: "nakamaPaywall",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  parseHTML() {
    return [
      {
        tag: 'div[data-type="nakama-paywall"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "nakama-paywall",
        class:
          "tiptap-nakama-paywall my-10 p-5 rounded-2xl border-2 border-dashed border-amber-500/50 bg-amber-500/10 dark:bg-amber-500/5 flex flex-col items-center justify-center text-center select-none shadow-xs",
      }),
      [
        "div",
        {
          class:
            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-mono text-[11px] font-bold uppercase tracking-wider mb-2",
        },
        "🔒 Batas Cuplikan / Dinding Gratis (Nakama Plan)",
      ],
      [
        "p",
        {
          class: "text-xs text-foreground/80 font-sans max-w-md",
        },
        "Seluruh bab dan paragraf di bawah garis pemisah ini hanya dapat diakses oleh pelanggan Nakama Member atau pembelian buku.",
      ],
      [
        "span",
        {
          class: "text-[10px] font-mono text-muted-foreground mt-2",
        },
        "— Divider Paywall AnzaBook —",
      ],
    ];
  },

  addCommands() {
    return {
      setNakamaPaywall:
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
