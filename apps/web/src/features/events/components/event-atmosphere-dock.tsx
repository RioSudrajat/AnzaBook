import * as React from "react";
import {
  Check,
  ChevronDown,
  Layers,
  Monitor,
  Moon,
  Palette,
  Shuffle,
  Sun,
  Type,
} from "lucide-react";
import type { EventThemeSpec } from "@starter/shared/validators/community";
import {
  EVENT_THEME_ACCENTS,
  EVENT_THEME_FONTS,
  EVENT_THEME_MODES,
  EVENT_THEME_PRESETS,
  EVENT_THEME_STYLES,
  HARMONIOUS_THEME_MIXES,
  ThemeMiniatureGraphic,
} from "./event-theme-atmosphere";

export interface EventAtmosphereDockProps {
  value: EventThemeSpec;
  onChange: (next: EventThemeSpec) => void;
}

type DockPopover = "accent" | "style" | "font" | "mode" | null;

export function EventAtmosphereDock({
  value,
  onChange,
}: EventAtmosphereDockProps) {
  const [isDesktopTrayOpen, setIsDesktopTrayOpen] = React.useState(true);
  const [isMobileTrayOpen, setIsMobileTrayOpen] = React.useState(false);
  const [openPopover, setOpenPopover] = React.useState<DockPopover>(null);
  const dockRef = React.useRef<HTMLDivElement | null>(null);

  const activePreset =
    EVENT_THEME_PRESETS.find((p) => p.id === value.preset) ||
    EVENT_THEME_PRESETS[0];
  const activeAccent =
    EVENT_THEME_ACCENTS.find((a) => a.id === value.accent) ||
    EVENT_THEME_ACCENTS[0];
  const activeStyle =
    EVENT_THEME_STYLES.find((s) => s.id === value.style) ||
    EVENT_THEME_STYLES[0];
  const activeFont =
    EVENT_THEME_FONTS.find((f) => f.id === value.font) || EVENT_THEME_FONTS[0];
  const activeMode =
    EVENT_THEME_MODES.find((m) => m.id === value.mode) || EVENT_THEME_MODES[2];

  React.useEffect(() => {
    if (!openPopover) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (
        dockRef.current &&
        !dockRef.current.contains(event.target as Node | null)
      ) {
        setOpenPopover(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        setOpenPopover(null);
      }
    };
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [openPopover]);

  const handleRacikMix = () => {
    const currentIdx = HARMONIOUS_THEME_MIXES.findIndex(
      (mix) =>
        mix.preset === value.preset &&
        mix.style === value.style &&
        mix.accent === value.accent &&
        mix.mode === value.mode,
    );
    const nextMix =
      HARMONIOUS_THEME_MIXES[(currentIdx + 1) % HARMONIOUS_THEME_MIXES.length];
    onChange({ ...nextMix });
  };

  return (
    <div
      ref={dockRef}
      role="region"
      aria-label="Bilah Atmosfer dan Tema Acara"
      style={{
        backgroundColor: "var(--evt-surface-elevated, var(--color-paper-2))",
        borderColor: "var(--evt-border-subtle, var(--border))",
      }}
      className="evt-glass-elevated relative z-30 shrink-0 border-t px-3 sm:px-6 lg:px-8 pt-1.5 pb-[max(0.625rem,env(safe-area-inset-bottom,0px))]"
    >
      <div className="mx-auto max-w-[1380px] space-y-2">
        <div className="hidden md:flex justify-center">
          <button
            type="button"
            aria-expanded={isDesktopTrayOpen}
            aria-label={
              isDesktopTrayOpen
                ? "Ciutkan galeri tema"
                : "Bentangkan galeri tema"
            }
            onClick={() => setIsDesktopTrayOpen((prev) => !prev)}
            className="group flex h-5 w-24 items-center justify-center rounded-full cursor-pointer focus-visible:outline-2 focus-visible:outline-ring"
          >
            <span className="h-1 w-10 rounded-full bg-foreground/20 group-hover:bg-foreground/45 transition-colors" />
          </button>
        </div>

        <div
          className={`${isMobileTrayOpen ? "block" : "hidden"} ${
            isDesktopTrayOpen ? "md:block" : "md:hidden"
          }`}
        >
          <div
            role="radiogroup"
            aria-label="Pilihan tema dasar acara"
            className="flex items-stretch md:justify-center gap-3 overflow-x-auto pb-1 pt-0.5 px-1"
          >
            {EVENT_THEME_PRESETS.map((preset) => {
              const selected = value.preset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  title={preset.tagline}
                  onClick={() => {
                    onChange({ ...preset.defaults });
                    setOpenPopover(null);
                  }}
                  className="group flex shrink-0 flex-col items-center gap-1.5 rounded-xl p-1 text-center transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <div
                    className={`rounded-xl transition-shadow ${
                      selected
                        ? "ring-2 ring-[var(--color-accent)] ring-offset-2 ring-offset-background"
                        : "ring-1 ring-transparent group-hover:ring-foreground/25"
                    }`}
                  >
                    <ThemeMiniatureGraphic
                      styleId={preset.defaults.style}
                      bg={preset.thumbBg}
                      paper={preset.thumbPaper}
                      ink={preset.thumbInk}
                      accent={preset.thumbAccent}
                    />
                  </div>
                  <span
                    className={`text-[11px] leading-tight whitespace-nowrap ${
                      selected
                        ? "font-semibold text-foreground"
                        : "font-medium text-muted-foreground group-hover:text-foreground"
                    }`}
                  >
                    {preset.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="relative flex items-center justify-between md:justify-center gap-2 text-xs">
          <div className="flex flex-1 md:flex-none min-w-0 items-center gap-1.5 sm:gap-2 overflow-x-auto sm:overflow-visible sm:flex-wrap pb-0.5 sm:pb-0">
            <button
              type="button"
              aria-expanded={isMobileTrayOpen}
              onClick={() => {
                setIsMobileTrayOpen((prev) => !prev);
                setOpenPopover(null);
              }}
              style={{
                backgroundColor: "var(--evt-control-bg, var(--background))",
                borderColor: "var(--evt-border-subtle, var(--border))",
              }}
              className="md:hidden inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border px-3 font-medium text-foreground cursor-pointer focus-visible:outline-2 focus-visible:outline-ring"
            >
              <Palette
                className="size-3.5 text-[var(--color-accent)]"
                aria-hidden="true"
              />
              <span>Tema: {activePreset.name}</span>
              <ChevronDown
                className={`size-3.5 transition-transform ${
                  isMobileTrayOpen ? "rotate-180" : ""
                }`}
                aria-hidden="true"
              />
            </button>

            <div className="sm:relative shrink-0">
              <button
                type="button"
                aria-expanded={openPopover === "accent"}
                onClick={() =>
                  setOpenPopover((prev) =>
                    prev === "accent" ? null : "accent",
                  )
                }
                style={{
                  backgroundColor:
                    openPopover === "accent"
                      ? "var(--evt-control-hover, var(--background))"
                      : "var(--evt-control-bg, var(--background))",
                  borderColor:
                    openPopover === "accent"
                      ? "var(--color-accent)"
                      : "var(--evt-border-subtle, var(--border))",
                }}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 font-medium text-foreground transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring"
              >
                <span
                  className="size-3.5 rounded-full border border-black/15 shrink-0"
                  style={{ backgroundColor: activeAccent.swatch }}
                  aria-hidden="true"
                />
                <span>
                  <span className="text-muted-foreground mr-1 hidden sm:inline">
                    Warna
                  </span>
                  {activeAccent.name}
                </span>
                <ChevronDown
                  className="size-3.5 text-muted-foreground rotate-180"
                  aria-hidden="true"
                />
              </button>

              {openPopover === "accent" && (
                <div
                  role="dialog"
                  aria-label="Pilih warna aksen acara"
                  style={{
                    backgroundColor: "var(--popover)",
                    borderColor: "var(--evt-border-subtle, var(--border))",
                  }}
                  className="absolute inset-x-0 bottom-[calc(100%+0.5rem)] sm:inset-x-auto sm:bottom-13 sm:left-0 z-40 sm:w-64 rounded-2xl border p-3.5 text-popover-foreground shadow-2xl space-y-2.5"
                >
                  <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                    Warna Aksen
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {EVENT_THEME_ACCENTS.map((accent) => {
                      const active = value.accent === accent.id;
                      return (
                        <button
                          key={accent.id}
                          type="button"
                          aria-pressed={active}
                          onClick={() => {
                            onChange({ ...value, accent: accent.id });
                            setOpenPopover(null);
                          }}
                          className={`min-h-11 flex flex-col items-center justify-center gap-1 rounded-xl border px-2 py-1.5 text-[11px] transition-colors cursor-pointer ${
                            active
                              ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] font-semibold text-foreground"
                              : "border-border bg-background/60 text-foreground hover:border-foreground/30"
                          }`}
                        >
                          <span
                            className="size-4 rounded-full border border-black/15 shrink-0"
                            style={{ backgroundColor: accent.swatch }}
                            aria-hidden="true"
                          />
                          <span className="truncate">{accent.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="sm:relative shrink-0">
              <button
                type="button"
                aria-expanded={openPopover === "style"}
                onClick={() =>
                  setOpenPopover((prev) => (prev === "style" ? null : "style"))
                }
                style={{
                  backgroundColor:
                    openPopover === "style"
                      ? "var(--evt-control-hover, var(--background))"
                      : "var(--evt-control-bg, var(--background))",
                  borderColor:
                    openPopover === "style"
                      ? "var(--color-accent)"
                      : "var(--evt-border-subtle, var(--border))",
                }}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 font-medium text-foreground transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring"
              >
                <Layers
                  className="size-3.5 text-[var(--color-accent)] shrink-0"
                  aria-hidden="true"
                />
                <span>
                  <span className="text-muted-foreground mr-1 hidden sm:inline">
                    Gaya
                  </span>
                  {activeStyle.name}
                </span>
                <ChevronDown
                  className="size-3.5 text-muted-foreground rotate-180"
                  aria-hidden="true"
                />
              </button>

              {openPopover === "style" && (
                <div
                  role="dialog"
                  aria-label="Pilih gaya atmosfer latar"
                  style={{
                    backgroundColor: "var(--popover)",
                    borderColor: "var(--evt-border-subtle, var(--border))",
                  }}
                  className="absolute inset-x-0 bottom-[calc(100%+0.5rem)] sm:inset-x-auto sm:bottom-13 sm:left-0 z-40 sm:w-[348px] rounded-2xl border p-3.5 text-popover-foreground shadow-2xl space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                      Gaya Atmosfer
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      8 variasi
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {EVENT_THEME_STYLES.map((styleOpt) => {
                      const active = value.style === styleOpt.id;
                      const isDarkStamp =
                        value.mode === "d" ||
                        (value.mode === "a" &&
                          activePreset.defaults.mode === "d");
                      return (
                        <button
                          key={styleOpt.id}
                          type="button"
                          aria-pressed={active}
                          onClick={() => {
                            onChange({ ...value, style: styleOpt.id });
                            setOpenPopover(null);
                          }}
                          className={`min-h-12 flex items-center justify-between gap-2 rounded-xl border p-2 text-left transition-colors cursor-pointer ${
                            active
                              ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-foreground"
                              : "border-border bg-background/60 text-foreground hover:border-foreground/30"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <ThemeMiniatureGraphic
                              compact
                              styleId={styleOpt.id}
                              bg={isDarkStamp ? "#1B232C" : "#F3EDE2"}
                              paper={isDarkStamp ? "#242F3B" : "#FFFDF9"}
                              ink={isDarkStamp ? "#F4EFE6" : "#151311"}
                              accent={activeAccent.swatch}
                            />
                            <div className="min-w-0">
                              <span className="block text-xs font-semibold truncate">
                                {styleOpt.name}
                              </span>
                              <span className="block text-[10px] text-muted-foreground leading-snug truncate">
                                {styleOpt.subtitle}
                              </span>
                            </div>
                          </div>
                          {active && (
                            <Check className="size-3.5 shrink-0 text-[var(--color-accent)]" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="sm:relative shrink-0">
              <button
                type="button"
                aria-expanded={openPopover === "font"}
                onClick={() =>
                  setOpenPopover((prev) => (prev === "font" ? null : "font"))
                }
                style={{
                  backgroundColor:
                    openPopover === "font"
                      ? "var(--evt-control-hover, var(--background))"
                      : "var(--evt-control-bg, var(--background))",
                  borderColor:
                    openPopover === "font"
                      ? "var(--color-accent)"
                      : "var(--evt-border-subtle, var(--border))",
                }}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 font-medium text-foreground transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring"
              >
                <Type
                  className="size-3.5 text-muted-foreground shrink-0"
                  aria-hidden="true"
                />
                <span>
                  <span className="text-muted-foreground mr-1 hidden sm:inline">
                    Tipografi
                  </span>
                  {activeFont.shortLabel}
                </span>
                <ChevronDown
                  className="size-3.5 text-muted-foreground rotate-180"
                  aria-hidden="true"
                />
              </button>

              {openPopover === "font" && (
                <div
                  role="dialog"
                  aria-label="Pilih tipografi judul acara"
                  style={{
                    backgroundColor: "var(--popover)",
                    borderColor: "var(--evt-border-subtle, var(--border))",
                  }}
                  className="absolute inset-x-0 bottom-[calc(100%+0.5rem)] sm:inset-x-auto sm:bottom-13 sm:right-0 sm:left-auto z-40 sm:w-64 rounded-2xl border p-3 text-popover-foreground shadow-2xl space-y-2"
                >
                  <div className="px-1 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                    Gaya Huruf Judul
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {EVENT_THEME_FONTS.map((fontOpt) => {
                      const active = value.font === fontOpt.id;
                      return (
                        <button
                          key={fontOpt.id}
                          type="button"
                          aria-pressed={active}
                          onClick={() => {
                            onChange({ ...value, font: fontOpt.id });
                            setOpenPopover(null);
                          }}
                          className={`min-h-12 flex flex-col items-start justify-center gap-0.5 rounded-xl border px-3 py-2 text-left text-xs transition-colors cursor-pointer ${
                            active
                              ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] font-semibold text-foreground"
                              : "border-border bg-background/60 text-foreground hover:border-foreground/30"
                          }`}
                        >
                          <span
                            className="text-base font-bold leading-none"
                            style={{ fontFamily: fontOpt.fontFamily }}
                          >
                            {fontOpt.sample}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {fontOpt.shortLabel}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="sm:relative shrink-0">
              <button
                type="button"
                aria-expanded={openPopover === "mode"}
                onClick={() =>
                  setOpenPopover((prev) => (prev === "mode" ? null : "mode"))
                }
                style={{
                  backgroundColor:
                    openPopover === "mode"
                      ? "var(--evt-control-hover, var(--background))"
                      : "var(--evt-control-bg, var(--background))",
                  borderColor:
                    openPopover === "mode"
                      ? "var(--color-accent)"
                      : "var(--evt-border-subtle, var(--border))",
                }}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 font-medium text-foreground transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring"
              >
                {value.mode === "l" ? (
                  <Sun
                    className="size-3.5 text-muted-foreground"
                    aria-hidden="true"
                  />
                ) : value.mode === "d" ? (
                  <Moon
                    className="size-3.5 text-muted-foreground"
                    aria-hidden="true"
                  />
                ) : (
                  <Monitor
                    className="size-3.5 text-muted-foreground"
                    aria-hidden="true"
                  />
                )}
                <span>
                  <span className="text-muted-foreground mr-1 hidden sm:inline">
                    Tampilan
                  </span>
                  {activeMode.label}
                </span>
                <ChevronDown
                  className="size-3.5 text-muted-foreground rotate-180"
                  aria-hidden="true"
                />
              </button>

              {openPopover === "mode" && (
                <div
                  role="dialog"
                  aria-label="Pilih mode tampilan terang atau gelap"
                  style={{
                    backgroundColor: "var(--popover)",
                    borderColor: "var(--evt-border-subtle, var(--border))",
                  }}
                  className="absolute inset-x-0 bottom-[calc(100%+0.5rem)] sm:inset-x-auto sm:bottom-13 sm:right-0 sm:left-auto z-40 sm:w-48 rounded-2xl border p-2 text-popover-foreground shadow-2xl space-y-1"
                >
                  {EVENT_THEME_MODES.map((modeOpt) => {
                    const active = value.mode === modeOpt.id;
                    const Icon =
                      modeOpt.id === "l"
                        ? Sun
                        : modeOpt.id === "d"
                          ? Moon
                          : Monitor;
                    return (
                      <button
                        key={modeOpt.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => {
                          onChange({ ...value, mode: modeOpt.id });
                          setOpenPopover(null);
                        }}
                        className={`min-h-11 flex w-full items-center justify-between gap-2 rounded-xl px-2.5 text-left text-xs transition-colors cursor-pointer ${
                          active
                            ? "bg-[var(--color-accent-soft)] font-semibold text-foreground"
                            : "text-foreground hover:bg-muted"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <Icon className="size-3.5" aria-hidden="true" />
                          <span>{modeOpt.label}</span>
                        </span>
                        {active && (
                          <Check className="size-3.5 text-[var(--color-accent)]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleRacikMix}
            title="Racik kombinasi tema harmonis secara instan"
            style={{
              backgroundColor: "var(--evt-control-bg, var(--background))",
              borderColor: "var(--evt-border-subtle, var(--border))",
            }}
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border px-3 font-medium text-foreground hover:border-[var(--color-accent)] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring"
          >
            <Shuffle
              className="size-3.5 text-[var(--color-accent)]"
              aria-hidden="true"
            />
            <span className="hidden sm:inline">Racik</span>
          </button>
        </div>
      </div>
    </div>
  );
}
