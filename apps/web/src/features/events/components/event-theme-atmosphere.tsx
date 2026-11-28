import * as React from "react";
import type {
  EventThemeAccentCode,
  EventThemeFontCode,
  EventThemeModeCode,
  EventThemePresetCode,
  EventThemeSpec,
  EventThemeStyleCode,
} from "@starter/shared/validators/community";

export type EventThemePresetMeta = {
  id: EventThemePresetCode;
  name: string;
  tagline: string;
  defaults: EventThemeSpec;
  thumbBg: string;
  thumbPaper: string;
  thumbInk: string;
  thumbAccent: string;
};

export type EventThemeAccentMeta = {
  id: EventThemeAccentCode;
  name: string;
  swatch: string;
  lightAccent: string;
  lightInkOnAccent: string;
  lightSoft: string;
  darkAccent: string;
  darkInkOnAccent: string;
  darkSoft: string;
};

export type EventThemeStyleMeta = {
  id: EventThemeStyleCode;
  name: string;
  subtitle: string;
};

export type EventThemeFontMeta = {
  id: EventThemeFontCode;
  label: string;
  shortLabel: string;
  fontFamily: string;
  sample: string;
};

export type EventThemeModeMeta = {
  id: EventThemeModeCode;
  label: string;
};

export const EVENT_THEME_PRESETS: ReadonlyArray<EventThemePresetMeta> = [
  {
    id: "min",
    name: "Minimal",
    tagline: "Kanvas Manila bersih dan lapang untuk fokus utama",
    defaults: {
      preset: "min",
      accent: "or",
      style: "pl",
      font: "li",
      mode: "a",
    },
    thumbBg: "#EFEAE0",
    thumbPaper: "#FCF9F3",
    thumbInk: "#171412",
    thumbAccent: "#B34009",
  },
  {
    id: "ris",
    name: "Aurora Tinta",
    tagline: "Pendar gradasi hangat dua nada yang lembut",
    defaults: {
      preset: "ris",
      accent: "or",
      style: "ht",
      font: "li",
      mode: "l",
    },
    thumbBg: "#F4E5DB",
    thumbPaper: "#FFF9F4",
    thumbInk: "#1E1613",
    thumbAccent: "#B34009",
  },
  {
    id: "nbk",
    name: "Ubin Kertas",
    tagline: "Pola ubin arsitektural halus dengan ketajaman tinggi",
    defaults: {
      preset: "nbk",
      accent: "am",
      style: "ln",
      font: "li",
      mode: "l",
    },
    thumbBg: "#EAE5DA",
    thumbPaper: "#FCF9F2",
    thumbInk: "#171412",
    thumbAccent: "#824E06",
  },
  {
    id: "sln",
    name: "Ruang Baca",
    tagline: "Suasana senja tenang berpendar lampu baca hangat",
    defaults: {
      preset: "sln",
      accent: "or",
      style: "lb",
      font: "li",
      mode: "d",
    },
    thumbBg: "#131922",
    thumbPaper: "#1E2634",
    thumbInk: "#F6F3EC",
    thumbAccent: "#F07638",
  },
  {
    id: "bot",
    name: "Botani Senja",
    tagline: "Atmosfer amber dan lumut lembut bernuansa teduh",
    defaults: {
      preset: "bot",
      accent: "sa",
      style: "dg",
      font: "cl",
      mode: "d",
    },
    thumbBg: "#241E17",
    thumbPaper: "#312920",
    thumbInk: "#F6F3EC",
    thumbAccent: "#7BB686",
  },
  {
    id: "cin",
    name: "Layar Sinema",
    tagline: "Ruang diskusi gelap kontras tinggi dengan orbit halus",
    defaults: {
      preset: "cin",
      accent: "pl",
      style: "ms",
      font: "jk",
      mode: "d",
    },
    thumbBg: "#16121A",
    thumbPaper: "#231D29",
    thumbInk: "#F6F3EC",
    thumbAccent: "#E07D9A",
  },
  {
    id: "mus",
    name: "Kabut Biru",
    tagline: "Gradasi biru laut teduh dengan kejernihan fokus bacaan",
    defaults: {
      preset: "mus",
      accent: "co",
      style: "hj",
      font: "jk",
      mode: "d",
    },
    thumbBg: "#111B24",
    thumbPaper: "#1A2936",
    thumbInk: "#F2F5F8",
    thumbAccent: "#70A4E8",
  },
];

export const EVENT_THEME_ACCENTS: ReadonlyArray<EventThemeAccentMeta> = [
  {
    id: "or",
    name: "Tangerine",
    swatch: "#D95D20",
    lightAccent: "#B34009",
    lightInkOnAccent: "#FFFFFF",
    lightSoft: "rgba(179, 64, 9, 0.13)",
    darkAccent: "#F07638",
    darkInkOnAccent: "#14110F",
    darkSoft: "rgba(240, 118, 56, 0.22)",
  },
  {
    id: "sa",
    name: "Sage",
    swatch: "#3D6E48",
    lightAccent: "#2F5E39",
    lightInkOnAccent: "#FFFFFF",
    lightSoft: "rgba(47, 94, 57, 0.13)",
    darkAccent: "#7BB686",
    darkInkOnAccent: "#0E1810",
    darkSoft: "rgba(123, 182, 134, 0.20)",
  },
  {
    id: "co",
    name: "Kobalt",
    swatch: "#265999",
    lightAccent: "#204E8A",
    lightInkOnAccent: "#FFFFFF",
    lightSoft: "rgba(32, 78, 138, 0.13)",
    darkAccent: "#70A4E8",
    darkInkOnAccent: "#0C1521",
    darkSoft: "rgba(112, 164, 232, 0.20)",
  },
  {
    id: "pl",
    name: "Marun",
    swatch: "#8E2F4C",
    lightAccent: "#7F2641",
    lightInkOnAccent: "#FFFFFF",
    lightSoft: "rgba(127, 38, 65, 0.13)",
    darkAccent: "#E07D9A",
    darkInkOnAccent: "#1D0E13",
    darkSoft: "rgba(224, 125, 154, 0.20)",
  },
  {
    id: "am",
    name: "Oker",
    swatch: "#9E6410",
    lightAccent: "#824E06",
    lightInkOnAccent: "#FFFFFF",
    lightSoft: "rgba(130, 78, 6, 0.13)",
    darkAccent: "#E5AA46",
    darkInkOnAccent: "#1A1308",
    darkSoft: "rgba(229, 170, 70, 0.20)",
  },
  {
    id: "in",
    name: "Tinta",
    swatch: "#2B2825",
    lightAccent: "#1D1A17",
    lightInkOnAccent: "#FAF7F0",
    lightSoft: "rgba(29, 26, 23, 0.10)",
    darkAccent: "#EFEAE0",
    darkInkOnAccent: "#151311",
    darkSoft: "rgba(239, 234, 224, 0.16)",
  },
];

export const EVENT_THEME_STYLES: ReadonlyArray<EventThemeStyleMeta> = [
  { id: "pl", name: "Polos", subtitle: "Permukaan matte bersih" },
  { id: "gr", name: "Tenun Linen", subtitle: "Anyaman tipis bertepi lembut" },
  { id: "ln", name: "Ubin Halus", subtitle: "Kisi ubin merata bervignette" },
  { id: "ht", name: "Pendar Gradien", subtitle: "Aura dua warna sangat halus" },
  { id: "dg", name: "Cahaya Senja", subtitle: "Kabut amber dan lumut tenang" },
  { id: "hj", name: "Kabut Sejuk", subtitle: "Sapuan diagonal kabut lembut" },
  { id: "lb", name: "Lampu Baca", subtitle: "Pendar hangat dari atas layar" },
  { id: "ms", name: "Orbit Malam", subtitle: "Busur minimalis sudut kanan" },
];

export const EVENT_THEME_FONTS: ReadonlyArray<EventThemeFontMeta> = [
  {
    id: "li",
    label: "Literata",
    shortLabel: "Literata",
    fontFamily: "var(--font-display)",
    sample: "Ag",
  },
  {
    id: "jk",
    label: "Plus Jakarta",
    shortLabel: "Jakarta",
    fontFamily: "var(--font-body)",
    sample: "Ag",
  },
  {
    id: "mn",
    label: "Red Hat Mono",
    shortLabel: "Mono",
    fontFamily: "var(--font-outlier)",
    sample: "09",
  },
  {
    id: "cl",
    label: "Klasik Serif",
    shortLabel: "Klasik",
    fontFamily: "'Georgia', 'Cambria', 'Times New Roman', serif",
    sample: "Aa",
  },
];

export const EVENT_THEME_MODES: ReadonlyArray<EventThemeModeMeta> = [
  { id: "l", label: "Terang" },
  { id: "d", label: "Gelap" },
  { id: "a", label: "Otomatis" },
];

export const HARMONIOUS_THEME_MIXES: ReadonlyArray<EventThemeSpec> = [
  { preset: "ris", accent: "or", style: "ht", font: "li", mode: "l" },
  { preset: "nbk", accent: "am", style: "ln", font: "li", mode: "l" },
  { preset: "sln", accent: "or", style: "lb", font: "li", mode: "d" },
  { preset: "bot", accent: "sa", style: "dg", font: "cl", mode: "d" },
  { preset: "mus", accent: "co", style: "hj", font: "jk", mode: "d" },
  { preset: "cin", accent: "pl", style: "ms", font: "jk", mode: "d" },
];

type PresetTintDef = {
  lightPage: string;
  lightSheet: string;
  lightCard: string;
  lightBorder: string;
  lightRgb: string;
  darkPage: string;
  darkSheet: string;
  darkCard: string;
  darkBorder: string;
  darkRgb: string;
};

const PRESET_TINTS: Record<EventThemePresetCode, PresetTintDef> = {
  min: {
    lightPage: "#F4EFE6",
    lightSheet: "#FCF9F3",
    lightCard: "#FFFFFF",
    lightBorder: "#DDD5C6",
    lightRgb: "252, 249, 243",
    darkPage: "#151412",
    darkSheet: "#1E1C19",
    darkCard: "#25221E",
    darkBorder: "#39342E",
    darkRgb: "30, 28, 25",
  },
  ris: {
    lightPage: "#F5EAE2",
    lightSheet: "#FFF9F5",
    lightCard: "#FFFFFF",
    lightBorder: "#E4CBC0",
    lightRgb: "255, 249, 245",
    darkPage: "#1D1513",
    darkSheet: "#271C19",
    darkCard: "#30231F",
    darkBorder: "#4B3730",
    darkRgb: "39, 28, 25",
  },
  nbk: {
    lightPage: "#EEE9DF",
    lightSheet: "#FAF7F0",
    lightCard: "#FFFFFF",
    lightBorder: "#D8D0C1",
    lightRgb: "250, 247, 240",
    darkPage: "#131C21",
    darkSheet: "#1B272E",
    darkCard: "#223039",
    darkBorder: "#344854",
    darkRgb: "27, 39, 46",
  },
  sln: {
    lightPage: "#EDEAE4",
    lightSheet: "#FAF8F3",
    lightCard: "#FFFFFF",
    lightBorder: "#D6CFC5",
    lightRgb: "250, 248, 243",
    darkPage: "#121720",
    darkSheet: "#1B222F",
    darkCard: "#222B3B",
    darkBorder: "#344157",
    darkRgb: "27, 34, 47",
  },
  bot: {
    lightPage: "#ECEFE8",
    lightSheet: "#F8FAF5",
    lightCard: "#FFFFFF",
    lightBorder: "#CFD7C8",
    lightRgb: "248, 250, 245",
    darkPage: "#1E1914",
    darkSheet: "#28211A",
    darkCard: "#312920",
    darkBorder: "#4A3E31",
    darkRgb: "40, 33, 26",
  },
  cin: {
    lightPage: "#EFECEF",
    lightSheet: "#FAF8FA",
    lightCard: "#FFFFFF",
    lightBorder: "#D8D1DA",
    lightRgb: "250, 248, 250",
    darkPage: "#151218",
    darkSheet: "#1F1A24",
    darkCard: "#26202C",
    darkBorder: "#3E3448",
    darkRgb: "31, 26, 36",
  },
  mus: {
    lightPage: "#EBF0F4",
    lightSheet: "#F7FAFC",
    lightCard: "#FFFFFF",
    lightBorder: "#CCD7E0",
    lightRgb: "247, 250, 252",
    darkPage: "#101A23",
    darkSheet: "#172531",
    darkCard: "#1E2F3E",
    darkBorder: "#32495E",
    darkRgb: "23, 37, 49",
  },
};

export type ResolvedEventTheme = {
  spec: EventThemeSpec;
  presetMeta: EventThemePresetMeta;
  accentMeta: EventThemeAccentMeta;
  styleMeta: EventThemeStyleMeta;
  fontMeta: EventThemeFontMeta;
  modeMeta: EventThemeModeMeta;
  isForcedDark: boolean;
  isForcedLight: boolean;
  isAutoMode: boolean;
  fontFamily: string;
  accentHex: string;
  accentInkHex: string;
  accentSoftHex: string;
  backdropStyle: React.CSSProperties;
  sheetStyle: React.CSSProperties;
  cardStyle: React.CSSProperties;
  glassSurfaceStyle: React.CSSProperties;
  glassElevatedStyle: React.CSSProperties;
  ctaPrimaryStyle: React.CSSProperties;
  cardMutedStyle: React.CSSProperties;
  badgeStyle: React.CSSProperties;
  pageContainerStyle: React.CSSProperties;
  listAccentWash: string;
  swatchGradient: string;
  darkClass: string;
};

export function resolveEventThemeVars(
  spec: EventThemeSpec,
): ResolvedEventTheme {
  const presetMeta =
    EVENT_THEME_PRESETS.find((p) => p.id === spec.preset) ||
    EVENT_THEME_PRESETS[0];
  const accentMeta =
    EVENT_THEME_ACCENTS.find((a) => a.id === spec.accent) ||
    EVENT_THEME_ACCENTS[0];
  const styleMeta =
    EVENT_THEME_STYLES.find((s) => s.id === spec.style) ||
    EVENT_THEME_STYLES[0];
  const fontMeta =
    EVENT_THEME_FONTS.find((f) => f.id === spec.font) || EVENT_THEME_FONTS[0];
  const modeMeta =
    EVENT_THEME_MODES.find((m) => m.id === spec.mode) || EVENT_THEME_MODES[2];

  const palette = PRESET_TINTS[spec.preset] || PRESET_TINTS.min;
  const isForcedDark = spec.mode === "d";
  const isForcedLight = spec.mode === "l";
  const isAutoMode = spec.mode === "a";

  const swatchGradient = `linear-gradient(135deg, ${presetMeta.thumbBg} 0%, ${accentMeta.swatch} 100%)`;
  const listAccentWash = `linear-gradient(135deg, ${accentMeta.swatch}33 0%, ${presetMeta.thumbAccent}24 100%)`;

  if (isAutoMode) {
    const autoAccent = `var(--evt-accent-${spec.accent})`;
    const autoAccentInk = `var(--evt-accent-ink-${spec.accent})`;
    const autoAccentSoft = `var(--evt-accent-soft-${spec.accent})`;
    const autoVars = {
      "--color-accent": autoAccent,
      "--color-accent-text": autoAccent,
      "--color-accent-ink": autoAccentInk,
      "--color-accent-soft": autoAccentSoft,
      "--color-focus": autoAccent,
      "--primary": autoAccent,
      "--primary-foreground": autoAccentInk,
      "--ring": autoAccent,
    } as React.CSSProperties;

    return {
      spec,
      presetMeta,
      accentMeta,
      styleMeta,
      fontMeta,
      modeMeta,
      isForcedDark,
      isForcedLight,
      isAutoMode,
      fontFamily: fontMeta.fontFamily,
      accentHex: autoAccent,
      accentInkHex: autoAccentInk,
      accentSoftHex: autoAccentSoft,
      backdropStyle: {
        ...autoVars,
        backgroundColor: "var(--color-paper)",
        color: "var(--color-ink)",
      },
      sheetStyle: {
        ...autoVars,
        backgroundColor: "var(--color-paper)",
        color: "var(--color-ink)",
      },
      cardStyle: {
        ...autoVars,
        backgroundColor: "var(--color-paper-2)",
        color: "var(--color-ink)",
        borderColor: "var(--color-rule)",
      },
      glassSurfaceStyle: {
        backgroundColor: "var(--evt-surface)",
        color: "var(--color-ink)",
        borderColor: "var(--evt-border-subtle)",
      },
      glassElevatedStyle: {
        backgroundColor: "var(--evt-surface-elevated)",
        color: "var(--color-ink)",
        borderColor: "var(--evt-border-subtle)",
      },
      ctaPrimaryStyle: {
        backgroundColor: autoAccent,
        color: autoAccentInk,
      },
      cardMutedStyle: {
        color: "var(--color-muted)",
      },
      badgeStyle: {
        backgroundColor: "var(--evt-control-bg)",
        color: "var(--color-ink)",
        borderColor: "var(--evt-border-subtle)",
      },
      pageContainerStyle: {
        ...autoVars,
        backgroundColor: "var(--color-paper)",
        color: "var(--color-ink)",
        borderColor: "var(--color-rule)",
      },
      listAccentWash,
      swatchGradient,
      darkClass: "",
    };
  }

  const pageBg = isForcedDark ? palette.darkPage : palette.lightPage;
  const sheetBg = isForcedDark ? palette.darkSheet : palette.lightSheet;
  const cardBg = isForcedDark ? palette.darkCard : palette.lightCard;
  const borderHex = isForcedDark ? palette.darkBorder : palette.lightBorder;
  const surfaceRgb = isForcedDark ? palette.darkRgb : palette.lightRgb;
  const inkHex = isForcedDark ? "#F7F4EE" : "#171412";
  const inkSecondaryHex = isForcedDark
    ? "rgba(247, 244, 238, 0.84)"
    : "rgba(23, 20, 18, 0.80)";
  const mutedHex = isForcedDark
    ? "rgba(247, 244, 238, 0.68)"
    : "rgba(23, 20, 18, 0.62)";
  const glassSurfaceBg = isForcedDark
    ? `rgba(${surfaceRgb}, 0.66)`
    : `rgba(${surfaceRgb}, 0.72)`;
  const glassElevatedBg = isForcedDark
    ? `rgba(${surfaceRgb}, 0.86)`
    : `rgba(${surfaceRgb}, 0.90)`;
  const controlBg = isForcedDark
    ? "rgba(255, 255, 255, 0.065)"
    : "rgba(23, 20, 18, 0.045)";
  const controlHover = isForcedDark
    ? "rgba(255, 255, 255, 0.11)"
    : "rgba(23, 20, 18, 0.085)";
  const borderSubtle = isForcedDark
    ? "rgba(255, 255, 255, 0.11)"
    : "rgba(23, 20, 18, 0.10)";
  const accentHex = isForcedDark
    ? accentMeta.darkAccent
    : accentMeta.lightAccent;
  const accentInkHex = isForcedDark
    ? accentMeta.darkInkOnAccent
    : accentMeta.lightInkOnAccent;
  const accentSoftHex = isForcedDark
    ? accentMeta.darkSoft
    : accentMeta.lightSoft;
  const errorHex = isForcedDark ? "#F97066" : "#B42318";
  const errorInkHex = isForcedDark ? "#151311" : "#FFFFFF";

  const tokenOverrides = {
    "--background": pageBg,
    "--foreground": inkHex,
    "--card": sheetBg,
    "--card-foreground": inkHex,
    "--popover": cardBg,
    "--popover-foreground": inkHex,
    "--primary": accentHex,
    "--primary-foreground": accentInkHex,
    "--secondary": cardBg,
    "--secondary-foreground": inkSecondaryHex,
    "--muted": sheetBg,
    "--muted-foreground": mutedHex,
    "--accent": controlHover,
    "--accent-foreground": inkHex,
    "--destructive": errorHex,
    "--destructive-foreground": errorInkHex,
    "--border": borderHex,
    "--input": borderHex,
    "--ring": accentHex,
    "--color-paper": pageBg,
    "--color-paper-2": sheetBg,
    "--color-paper-3": cardBg,
    "--color-ink": inkHex,
    "--color-ink-2": inkSecondaryHex,
    "--color-muted": mutedHex,
    "--color-rule": borderHex,
    "--color-accent": accentHex,
    "--color-accent-text": accentHex,
    "--color-accent-ink": accentInkHex,
    "--color-accent-soft": accentSoftHex,
    "--color-focus": accentHex,
    "--color-green": isForcedDark ? "#6FD19A" : "#1F6B43",
    "--color-green-soft": isForcedDark
      ? "rgba(111, 209, 154, 0.18)"
      : "rgba(31, 107, 67, 0.12)",
    "--color-water": isForcedDark ? "#78B0F2" : "#205493",
    "--color-water-soft": isForcedDark
      ? "rgba(120, 176, 242, 0.18)"
      : "rgba(32, 84, 147, 0.12)",
    "--color-error": errorHex,
    "--color-error-soft": isForcedDark
      ? "rgba(249, 112, 102, 0.16)"
      : "rgba(180, 35, 24, 0.11)",
    "--evt-surface": glassSurfaceBg,
    "--evt-surface-elevated": glassElevatedBg,
    "--evt-glass-solid": sheetBg,
    "--evt-control-bg": controlBg,
    "--evt-control-hover": controlHover,
    "--evt-border-subtle": borderSubtle,
    "--evt-pattern-tile": isForcedDark
      ? "rgba(255, 255, 255, 0.055)"
      : "rgba(23, 20, 18, 0.045)",
    "--evt-pattern-linen": isForcedDark
      ? "rgba(255, 255, 255, 0.025)"
      : "rgba(23, 20, 18, 0.025)",
    "--evt-pattern-orbit": isForcedDark
      ? "rgba(255, 255, 255, 0.06)"
      : "rgba(23, 20, 18, 0.055)",
    "--evt-pattern-orbit-outer": isForcedDark
      ? "rgba(255, 255, 255, 0.035)"
      : "rgba(23, 20, 18, 0.035)",
    "--evt-vignette": isForcedDark
      ? "radial-gradient(ellipse 85% 85% at 50% 42%, transparent 35%, rgba(0,0,0,0.28) 100%)"
      : "radial-gradient(ellipse 90% 85% at 50% 45%, rgba(255,255,255,0.22) 0%, transparent 100%)",
  } as React.CSSProperties;

  return {
    spec,
    presetMeta,
    accentMeta,
    styleMeta,
    fontMeta,
    modeMeta,
    isForcedDark,
    isForcedLight,
    isAutoMode,
    fontFamily: fontMeta.fontFamily,
    accentHex,
    accentInkHex,
    accentSoftHex,
    backdropStyle: {
      ...tokenOverrides,
      colorScheme: isForcedDark ? "dark" : "light",
      backgroundColor: pageBg,
      color: inkHex,
    },
    sheetStyle: {
      ...tokenOverrides,
      colorScheme: isForcedDark ? "dark" : "light",
      backgroundColor: sheetBg,
      color: inkHex,
      borderColor: borderHex,
    },
    cardStyle: {
      ...tokenOverrides,
      colorScheme: isForcedDark ? "dark" : "light",
      backgroundColor: sheetBg,
      color: inkHex,
      borderColor: borderHex,
    },
    glassSurfaceStyle: {
      backgroundColor: glassSurfaceBg,
      color: inkHex,
      borderColor: borderSubtle,
    },
    glassElevatedStyle: {
      backgroundColor: glassElevatedBg,
      color: inkHex,
      borderColor: borderSubtle,
    },
    ctaPrimaryStyle: isForcedDark
      ? { backgroundColor: "#F7F4EE", color: "#151311" }
      : { backgroundColor: accentHex, color: accentInkHex },
    cardMutedStyle: {
      color: mutedHex,
    },
    badgeStyle: {
      backgroundColor: controlBg,
      color: inkHex,
      borderColor: borderSubtle,
    },
    pageContainerStyle: {
      ...tokenOverrides,
      colorScheme: isForcedDark ? "dark" : "light",
      backgroundColor: pageBg,
      color: inkHex,
      borderColor: borderSubtle,
    },
    listAccentWash,
    swatchGradient,
    darkClass: isForcedDark ? "dark" : "",
  };
}

export function EventAtmosphereBackdrop({
  spec,
}: {
  spec: EventThemeSpec;
  variant?: "studio" | "card" | "page";
}) {
  const isDark = spec.mode === "d";

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none"
    >
      {spec.style === "pl" && (
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 72% 52% at 24% 0%, color-mix(in srgb, var(--color-accent) 11%, transparent), transparent 68%)",
          }}
        />
      )}

      {spec.style === "gr" && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, var(--evt-pattern-linen) 0px, var(--evt-pattern-linen) 1px, transparent 1px, transparent 10px), repeating-linear-gradient(-45deg, var(--evt-pattern-linen) 0px, var(--evt-pattern-linen) 1px, transparent 1px, transparent 10px)",
            maskImage:
              "radial-gradient(ellipse 92% 88% at 50% 45%, black 35%, transparent 96%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 92% 88% at 50% 45%, black 35%, transparent 96%)",
          }}
        />
      )}

      {spec.style === "ln" && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(to right, var(--evt-pattern-tile) 1px, transparent 1px), linear-gradient(to bottom, var(--evt-pattern-tile) 1px, transparent 1px)",
            backgroundSize: "42px 42px",
            maskImage:
              "radial-gradient(ellipse 95% 90% at 50% 40%, rgba(0,0,0,0.85) 20%, rgba(0,0,0,0.25) 100%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 95% 90% at 50% 40%, rgba(0,0,0,0.85) 20%, rgba(0,0,0,0.25) 100%)",
          }}
        />
      )}

      {spec.style === "ht" && (
        <div
          className="absolute inset-0"
          style={{
            background: isDark
              ? "radial-gradient(ellipse 64% 58% at 14% 8%, color-mix(in srgb, var(--color-accent) 18%, transparent), transparent 66%), radial-gradient(ellipse 58% 55% at 88% 82%, rgba(224, 125, 154, 0.22), transparent 68%)"
              : "radial-gradient(ellipse 68% 60% at 12% 10%, color-mix(in srgb, var(--color-accent) 14%, transparent), transparent 68%), radial-gradient(ellipse 60% 56% at 88% 84%, rgba(235, 155, 110, 0.20), transparent 68%)",
          }}
        />
      )}

      {spec.style === "lb" && (
        <div
          className="absolute inset-0"
          style={{
            background: isDark
              ? "radial-gradient(ellipse 65% 52% at 50% -6%, rgba(235, 173, 96, 0.24), transparent 72%), radial-gradient(ellipse 50% 45% at 82% 85%, color-mix(in srgb, var(--color-accent) 10%, transparent), transparent 68%)"
              : "radial-gradient(ellipse 65% 52% at 50% -6%, rgba(224, 152, 68, 0.16), transparent 72%)",
          }}
        />
      )}

      {spec.style === "dg" && (
        <div
          className="absolute inset-0"
          style={{
            background: isDark
              ? "radial-gradient(ellipse 58% 54% at 16% 12%, rgba(196, 138, 66, 0.20), transparent 68%), radial-gradient(ellipse 56% 52% at 84% 78%, rgba(114, 158, 120, 0.20), transparent 68%)"
              : "radial-gradient(ellipse 58% 54% at 16% 12%, rgba(158, 100, 16, 0.12), transparent 68%), radial-gradient(ellipse 56% 52% at 84% 78%, rgba(61, 110, 72, 0.12), transparent 68%)",
          }}
        />
      )}

      {spec.style === "hj" && (
        <div
          className="absolute inset-0"
          style={{
            background: isDark
              ? "linear-gradient(155deg, rgba(112, 164, 232, 0.16) 0%, transparent 48%, color-mix(in srgb, var(--color-accent) 9%, transparent) 100%)"
              : "linear-gradient(155deg, rgba(38, 89, 153, 0.10) 0%, transparent 48%, color-mix(in srgb, var(--color-accent) 6%, transparent) 100%)",
          }}
        />
      )}

      {spec.style === "ms" && (
        <>
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 55% 48% at 85% 10%, color-mix(in srgb, var(--color-accent) 12%, transparent), transparent 66%)",
            }}
          />
          <svg
            viewBox="0 0 800 500"
            className="absolute inset-0 size-full"
            preserveAspectRatio="xMaxYMin slice"
          >
            <circle
              cx="690"
              cy="75"
              r="185"
              fill="none"
              stroke="var(--evt-pattern-orbit)"
            />
            <circle
              cx="690"
              cy="75"
              r="285"
              fill="none"
              stroke="var(--evt-pattern-orbit-outer)"
            />
          </svg>
        </>
      )}

      <div
        className="absolute inset-0"
        style={{ background: "var(--evt-vignette)" }}
      />
    </div>
  );
}

/**
 * Miniature layout specimen thumbnail for the bottom theme dock and style popovers.
 */
export function ThemeMiniatureGraphic({
  styleId,
  bg,
  paper,
  ink,
  accent,
  compact = false,
}: {
  styleId: EventThemeStyleCode;
  bg: string;
  paper: string;
  ink: string;
  accent: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden border border-black/15 shrink-0 ${
        compact
          ? "size-9 rounded-lg"
          : "h-14 w-[84px] rounded-xl p-1.5 flex items-center gap-1.5"
      }`}
      style={{ backgroundColor: bg }}
      aria-hidden="true"
    >
      {styleId === "pl" && (
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse 80% 70% at 20% 0%, ${accent}22, transparent 70%)`,
          }}
        />
      )}

      {styleId === "gr" && (
        <div
          className="absolute inset-0 opacity-45"
          style={{
            backgroundImage: `repeating-linear-gradient(45deg, ${ink}14 0px, ${ink}14 1px, transparent 1px, transparent 5px)`,
          }}
        />
      )}

      {styleId === "ln" && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(to right, ${ink}16 1px, transparent 1px), linear-gradient(to bottom, ${ink}16 1px, transparent 1px)`,
            backgroundSize: "10px 10px",
          }}
        />
      )}

      {styleId === "ht" && (
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at 18% 18%, ${accent}52 0%, transparent 65%), radial-gradient(circle at 85% 85%, ${ink}26 0%, transparent 60%)`,
          }}
        />
      )}

      {styleId === "lb" && (
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse 85% 75% at 50% 0%, ${accent}48, transparent 78%)`,
          }}
        />
      )}

      {styleId === "dg" && (
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at 18% 20%, #C48A4252 0%, transparent 62%), radial-gradient(circle at 84% 82%, ${accent}48 0%, transparent 62%)`,
          }}
        />
      )}

      {styleId === "hj" && (
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(145deg, ${accent}42 0%, transparent 55%, ${accent}22 100%)`,
          }}
        />
      )}

      {styleId === "ms" && (
        <svg viewBox="0 0 40 32" className="absolute inset-0 size-full">
          <circle
            cx="32"
            cy="6"
            r="14"
            fill="none"
            stroke={ink}
            strokeOpacity="0.18"
          />
          <circle
            cx="32"
            cy="6"
            r="22"
            fill="none"
            stroke={ink}
            strokeOpacity="0.10"
          />
        </svg>
      )}

      {!compact && (
        <div className="relative z-10 flex w-full items-center gap-1.5">
          <div
            className="size-6 shrink-0 rounded-[5px] border border-black/10"
            style={{ backgroundColor: paper }}
          />
          <div className="flex-1 space-y-1">
            <div
              className="h-1.5 w-8 rounded-full opacity-55"
              style={{ backgroundColor: ink }}
            />
            <div
              className="h-1 w-10 rounded-full opacity-35"
              style={{ backgroundColor: ink }}
            />
            <div
              className="h-1 w-6 rounded-full opacity-25"
              style={{ backgroundColor: ink }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
