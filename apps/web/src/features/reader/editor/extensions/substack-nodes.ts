import { Node, mergeAttributes } from "@tiptap/core";

export const SubstackButton = Node.create({
  name: "substackButton",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      text: { default: "Berlangganan Sekarang" },
      variant: { default: "free" }, // 'free' | 'paid' | 'custom'
      url: { default: "#" },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="substack-button"]',
        getAttrs: (element) => {
          if (typeof element === "string") return false;
          return {
            text: element.getAttribute("data-text") || element.textContent || "Berlangganan",
            variant: element.getAttribute("data-variant") || "free",
            url: element.getAttribute("data-url") || "#",
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const isPaid = HTMLAttributes.variant === "paid";
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "substack-button",
        "data-text": HTMLAttributes.text,
        "data-variant": HTMLAttributes.variant,
        "data-url": HTMLAttributes.url,
        class: "my-6 flex justify-center items-center select-none",
      }),
      [
        "a",
        {
          href: HTMLAttributes.url,
          target: "_blank",
          rel: "noopener noreferrer",
          class: `inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-xs font-semibold shadow-xs transition-all cursor-pointer ${
            isPaid
              ? "bg-amber-500 hover:bg-amber-600 text-black font-bold"
              : "bg-[var(--color-accent)] hover:opacity-90 text-white font-medium"
          }`,
        },
        HTMLAttributes.text,
      ],
    ];
  },
});

export const AudioEmbed = Node.create({
  name: "audioEmbed",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      title: { default: "Audio Narasi Bab / Podcast Naskah" },
      src: { default: "" },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="audio-embed"]',
        getAttrs: (element) => {
          if (typeof element === "string") return false;
          return {
            title: element.getAttribute("data-title") || "Audio Narasi",
            src: element.getAttribute("data-src") || "",
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "audio-embed",
        "data-title": HTMLAttributes.title,
        "data-src": HTMLAttributes.src,
        class:
          "my-6 p-4 rounded-2xl border border-border/80 bg-muted/30 flex flex-col sm:flex-row items-center gap-3 shadow-2xs select-none",
      }),
      [
        "div",
        { class: "flex items-center gap-3 w-full" },
        [
          "div",
          {
            class:
              "size-10 rounded-full bg-[var(--color-accent)]/15 text-[var(--color-accent)] flex items-center justify-center shrink-0 font-bold",
          },
          "🎧",
        ],
        [
          "div",
          { class: "min-w-0 flex-1" },
          [
            "div",
            { class: "font-serif text-sm font-semibold text-foreground truncate" },
            HTMLAttributes.title,
          ],
          [
            "div",
            { class: "text-[11px] font-mono text-muted-foreground" },
            "Audio Narasi Resmi AnzaBook",
          ],
        ],
      ],
      [
        "audio",
        {
          controls: "true",
          src: HTMLAttributes.src,
          class: "w-full sm:w-64 h-8 mt-2 sm:mt-0 shrink-0",
        },
      ],
    ];
  },
});

export const VideoEmbed = Node.create({
  name: "videoEmbed",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: "https://www.youtube.com/embed/dQw4w9WgXcQ" },
      title: { default: "Video Ilustrasi / Bedah Naskah" },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="video-embed"]',
        getAttrs: (element) => {
          if (typeof element === "string") return false;
          return {
            src: element.getAttribute("data-src") || "",
            title: element.getAttribute("data-title") || "Video Naskah",
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "video-embed",
        "data-src": HTMLAttributes.src,
        "data-title": HTMLAttributes.title,
        class:
          "my-8 rounded-2xl border border-border/80 overflow-hidden bg-black/90 shadow-sm",
      }),
      [
        "div",
        { class: "aspect-video w-full flex items-center justify-center bg-muted/20 relative" },
        [
          "iframe",
          {
            src: HTMLAttributes.src,
            title: HTMLAttributes.title,
            class: "w-full h-full border-0",
            allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
            allowfullscreen: "true",
          },
        ],
      ],
      [
        "div",
        { class: "p-2.5 bg-background border-t border-border/60 text-xs text-muted-foreground font-serif italic text-center" },
        HTMLAttributes.title,
      ],
    ];
  },
});

export const CalloutBox = Node.create({
  name: "calloutBox",
  group: "block",
  content: "inline*",
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      type: { default: "note" }, // 'note' | 'warning' | 'idea'
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="callout-box"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "callout-box",
        class:
          "my-6 p-4 rounded-xl border-l-4 border-l-[var(--color-accent)] bg-muted/40 border border-border/60 text-sm font-sans leading-relaxed shadow-2xs",
      }),
      ["div", { class: "font-semibold mb-1 flex items-center gap-1.5 text-foreground" }, "💡 Catatan Penulis:"],
      ["div", { class: "text-muted-foreground italic" }, 0],
    ];
  },
});

export const FinancialChart = Node.create({
  name: "financialChart",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      retailPrice: { default: "95.000" },
      printCost: { default: "18.000" },
      royaltyAuthor: { default: "25.000" },
      publisherShare: { default: "32.000" },
      distribution: { default: "20.000" },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="financial-chart"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "financial-chart",
        class:
          "my-8 p-5 rounded-2xl border border-border/80 bg-muted/20 font-mono text-xs shadow-2xs select-none",
      }),
      [
        "div",
        { class: "flex items-center justify-between border-b border-border/60 pb-2 mb-3" },
        [
          "span",
          { class: "font-bold text-foreground flex items-center gap-1.5" },
          "📊 Transparansi Kalkulasi HPP & Bagi Hasil",
        ],
        [
          "span",
          { class: "px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold" },
          "Open Pricing",
        ],
      ],
      [
        "div",
        { class: "grid grid-cols-2 sm:grid-cols-4 gap-2 text-center" },
        [
          "div",
          { class: "p-2 rounded-lg bg-background border border-border/40" },
          ["div", { class: "text-muted-foreground text-[10px]" }, "Biaya Cetak"],
          ["div", { class: "font-bold text-foreground mt-0.5" }, `Rp ${HTMLAttributes.printCost}`],
        ],
        [
          "div",
          { class: "p-2 rounded-lg bg-background border border-border/40" },
          ["div", { class: "text-muted-foreground text-[10px]" }, "Royalti Penulis"],
          ["div", { class: "font-bold text-amber-600 dark:text-amber-400 mt-0.5" }, `Rp ${HTMLAttributes.royaltyAuthor}`],
        ],
        [
          "div",
          { class: "p-2 rounded-lg bg-background border border-border/40" },
          ["div", { class: "text-muted-foreground text-[10px]" }, "Penerbit & Editor"],
          ["div", { class: "font-bold text-foreground mt-0.5" }, `Rp ${HTMLAttributes.publisherShare}`],
        ],
        [
          "div",
          { class: "p-2 rounded-lg bg-background border border-border/40" },
          ["div", { class: "text-muted-foreground text-[10px]" }, "Harga Resmi"],
          ["div", { class: "font-bold text-[var(--color-accent)] mt-0.5" }, `Rp ${HTMLAttributes.retailPrice}`],
        ],
      ],
    ];
  },
});

export const LatexBlock = Node.create({
  name: "latexBlock",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      formula: { default: "E = mc^2 \\quad \\Longleftrightarrow \\quad \\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}" },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="latex-block"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "latex-block",
        class:
          "my-6 p-4 rounded-xl border border-border/70 bg-muted/30 text-center font-mono text-sm shadow-2xs select-none",
      }),
      ["div", { class: "text-[10px] uppercase font-bold tracking-widest text-muted-foreground/70 mb-1" }, "Formula LaTeX"],
      ["div", { class: "text-base py-1 font-serif italic text-foreground tracking-wide" }, HTMLAttributes.formula],
    ];
  },
});

export const Collapsible = Node.create({
  name: "collapsible",
  group: "block",
  content: "inline*",
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      summary: { default: "Klik untuk melihat rincian / lampiran tersembunyi" },
    };
  },

  parseHTML() {
    return [{ tag: 'details[data-type="collapsible"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "details",
      mergeAttributes(HTMLAttributes, {
        "data-type": "collapsible",
        class:
          "my-4 p-3.5 rounded-xl border border-border/80 bg-muted/20 text-sm transition-all open:bg-muted/40",
      }),
      [
        "summary",
        { class: "font-semibold text-foreground cursor-pointer select-none hover:text-[var(--color-accent)]" },
        HTMLAttributes.summary,
      ],
      ["div", { class: "pt-3 border-t border-border/40 mt-2 text-muted-foreground" }, 0],
    ];
  },
});

export const PoetryBlock = Node.create({
  name: "poetryBlock",
  group: "block",
  content: "inline*",
  selectable: true,
  draggable: true,

  parseHTML() {
    return [{ tag: 'div[data-type="poetry-block"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "poetry-block",
        class:
          "my-8 py-4 px-6 mx-auto max-w-md text-center italic font-serif leading-loose border-y border-border/50 text-foreground/90 select-text",
      }),
      0,
    ];
  },
});

export const PollBlock = Node.create({
  name: "pollBlock",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      question: { default: "Menurut Anda, bagaimana nasib akhir protagonis di bab selanjutnya?" },
      option1: { default: "Menerima tawaran penerbit independen" },
      option2: { default: "Mendirikan percetakan gotong royong" },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="poll-block"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "poll-block",
        class:
          "my-8 p-5 rounded-2xl border border-border/80 bg-background shadow-xs select-none",
      }),
      ["div", { class: "font-bold text-foreground text-sm mb-3 flex items-center gap-2" }, "📊 Jajak Pendapat Pembaca"],
      ["div", { class: "text-xs text-muted-foreground mb-4 font-medium" }, HTMLAttributes.question],
      [
        "div",
        { class: "space-y-2" },
        [
          "button",
          {
            type: "button",
            class:
              "w-full text-left p-2.5 rounded-lg border border-border/60 hover:border-[var(--color-accent)] hover:bg-muted/30 text-xs font-medium transition-all flex items-center justify-between",
          },
          ["span", {}, HTMLAttributes.option1],
          ["span", { class: "font-mono text-muted-foreground text-[10px]" }, "54%"],
        ],
        [
          "button",
          {
            type: "button",
            class:
              "w-full text-left p-2.5 rounded-lg border border-border/60 hover:border-[var(--color-accent)] hover:bg-muted/30 text-xs font-medium transition-all flex items-center justify-between",
          },
          ["span", {}, HTMLAttributes.option2],
          ["span", { class: "font-mono text-muted-foreground text-[10px]" }, "46%"],
        ],
      ],
    ];
  },
});

export const PredictionMarket = Node.create({
  name: "predictionMarket",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      question: { default: "Apakah buku fisik akan terbit sebelum Q3?" },
      chance: { default: "78%" },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="prediction-market"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "prediction-market",
        class:
          "my-6 p-4 rounded-xl border border-border/80 bg-muted/20 shadow-2xs select-none flex items-center justify-between gap-3",
      }),
      [
        "div",
        { class: "min-w-0" },
        ["div", { class: "text-[10px] font-mono uppercase tracking-wider text-muted-foreground" }, "💡 Pasar Prediksi Alur"],
        ["div", { class: "font-semibold text-xs text-foreground mt-0.5" }, HTMLAttributes.question],
      ],
      [
        "div",
        { class: "px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-mono font-bold text-xs shrink-0" },
        HTMLAttributes.chance,
      ],
    ];
  },
});

export const RecipeBlock = Node.create({
  name: "recipeBlock",
  group: "block",
  content: "inline*",
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      title: { default: "Petunjuk Langkah Demi Langkah / Resep" },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="recipe-block"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "recipe-block",
        class:
          "my-6 p-4 rounded-xl border border-border/80 bg-amber-500/5 text-xs shadow-2xs leading-relaxed",
      }),
      ["div", { class: "font-bold text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-1.5" }, `🍴 ${HTMLAttributes.title}`],
      ["div", { class: "text-foreground" }, 0],
    ];
  },
});

export const AudienceGated = Node.create({
  name: "audienceGated",
  group: "block",
  content: "inline*",
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      tier: { default: "nakama" }, // 'free' | 'nakama' | 'physical'
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="audience-gated"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const isNakama = HTMLAttributes.tier === "nakama";
    const isPhysical = HTMLAttributes.tier === "physical";
    const label = isPhysical
      ? "📦 Khusus Pemilik Buku Fisik"
      : isNakama
      ? "⭐ Khusus Member Nakama"
      : "🟢 Terbuka Pembaca Gratis";

    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "audience-gated",
        class:
          "my-6 p-4 rounded-2xl border-2 border-dashed border-border/80 bg-muted/20 relative shadow-2xs",
      }),
      [
        "div",
        {
          class:
            "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider mb-2 bg-background border border-border/60 text-foreground",
        },
        label,
      ],
      ["div", { class: "text-foreground/90 font-serif" }, 0],
    ];
  },
});

export const FootnoteBlock = Node.create({
  name: "footnoteBlock",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      index: { default: "1" },
      note: { default: "Catatan kaki referensi pustaka atau penjelasan konteks historis." },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="footnote-block"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "footnote-block",
        class:
          "my-4 pt-2 border-t border-border/60 text-[11px] font-serif italic text-muted-foreground flex items-start gap-1.5 select-text",
      }),
      ["span", { class: "font-mono font-bold text-foreground shrink-0" }, `[${HTMLAttributes.index}]`],
      ["span", {}, HTMLAttributes.note],
    ];
  },
});

export const ThinDivider = Node.create({
  name: "thinDivider",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  parseHTML() {
    return [
      { tag: 'div[data-type="divider-thin"]' },
      { tag: 'hr[data-type="divider-thin"]' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "divider-thin",
        class: "my-8 border-t border-current/15 w-full select-none",
      }),
    ];
  },
});

export const MediumDivider = Node.create({
  name: "mediumDivider",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  parseHTML() {
    return [
      { tag: 'div[data-type="divider-medium"]' },
      { tag: 'hr[data-type="divider-medium"]' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "divider-medium",
        class: "my-8 border-t-2 border-current/30 w-full select-none",
      }),
    ];
  },
});
