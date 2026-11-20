import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Lock, ShieldAlert } from "lucide-react";
import type { DrmClientOs, DrmEventType } from "@starter/shared/validators/drm";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { IS_DRM_TOGGLE_ENABLED } from "@/lib/env";
import type { ReaderTheme } from "./reader-toolbar";

export type DrmShieldTriggerEvent = {
  eventType: DrmEventType;
  triggerDetail: string;
  clientOs: DrmClientOs;
};

type DrmShieldProps = {
  watermarkText: string;
  enabled?: boolean;
  theme?: ReaderTheme;
  onSecurityTrigger?: (event: DrmShieldTriggerEvent) => void;
  children: React.ReactNode;
};

const WATERMARK_INK: Record<ReaderTheme, string> = {
  manila: "rgba(26, 22, 18, 0.072)",
  sepia: "rgba(38, 28, 16, 0.078)",
  night: "rgba(242, 234, 222, 0.085)",
};

const WATERMARK_HOST_CLASS =
  "pointer-events-none fixed inset-0 z-20 overflow-hidden select-none";
const WATERMARK_CANVAS_CLASS =
  "block size-full pointer-events-none select-none";

function detectClientOs(): DrmClientOs {
  if (typeof navigator === "undefined") return "unknown";
  const nav = navigator as Navigator & {
    userAgentData?: { platform?: string };
  };
  const platform = (
    nav.userAgentData?.platform ||
    navigator.platform ||
    ""
  ).toLowerCase();
  const ua = navigator.userAgent.toLowerCase();

  if (ua.includes("android") || platform.includes("android")) return "android";
  if (
    /iphone|ipad|ipod/.test(ua) ||
    (platform.includes("mac") && navigator.maxTouchPoints > 1)
  ) {
    return "ios";
  }
  if (platform.includes("win") || ua.includes("windows")) return "windows";
  if (platform.includes("mac") || ua.includes("mac os")) return "macos";
  if (platform.includes("linux") || ua.includes("linux")) return "linux";
  return "unknown";
}

function hashSeed(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function paintWatermarkCanvas(
  canvas: HTMLCanvasElement | null,
  watermarkText: string,
  theme: ReaderTheme,
) {
  if (!canvas || typeof window === "undefined") return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const width = Math.max(1, window.innerWidth);
  const height = Math.max(1, window.innerHeight);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width = Math.ceil(width * dpr);
  canvas.height = Math.ceil(height * dpr);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const ink = WATERMARK_INK[theme] ?? WATERMARK_INK.manila;
  const label = watermarkText.toUpperCase();
  const seed = hashSeed(label);
  const offsetX = seed % 57;
  const offsetY = seed % 37;

  ctx.save();
  ctx.fillStyle = ink;
  ctx.font = '500 11px "Red Hat Mono", ui-monospace, SFMono-Regular, monospace';
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";

  const stepX = 270;
  const stepY = 124;
  const diagSpan = Math.hypot(width, height) + 280;

  ctx.translate(width / 2, height / 2);
  ctx.rotate((-25 * Math.PI) / 180);

  for (let y = -diagSpan; y <= diagSpan; y += stepY) {
    const rowShift = Math.round(y / stepY) % 2 === 0 ? 0 : stepX / 2;
    for (let x = -diagSpan; x <= diagSpan; x += stepX) {
      ctx.fillText(label, x + rowShift + offsetX, y + offsetY);
    }
  }
  ctx.restore();
}

function isComputedHidden(el: HTMLElement | null): boolean {
  if (!el || !el.isConnected) return true;
  if (el.hasAttribute("hidden")) return true;
  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden") return true;
  const opacity = Number.parseFloat(style.opacity || "1");
  if (!Number.isNaN(opacity) && opacity < 0.5) return true;
  const rect = el.getBoundingClientRect();
  return rect.width < 1 || rect.height < 1;
}

function isEditableTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    Boolean(target.closest("input, textarea, [contenteditable='true']"))
  );
}

/** Protects reader prose against casual capture, printing, DevTools tampering, and DOM scraping. */
export function DrmShield({
  watermarkText,
  enabled = false,
  theme = "manila",
  onSecurityTrigger,
  children,
}: DrmShieldProps) {
  const [isShieldActive, setIsShieldActive] = useState(false);
  const [shieldReason, setShieldReason] = useState<string>(
    "Aktivitas tangkapan layar atau kehilangan fokus terdeteksi.",
  );

  const shieldRootRef = useRef<HTMLDivElement>(null);
  const watermarkHostRef = useRef<HTMLDivElement>(null);
  const watermarkCanvasRef = useRef<HTMLCanvasElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const resumeBtnRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const onTriggerRef = useRef(onSecurityTrigger);
  const enabledRef = useRef(enabled);
  const activeRef = useRef(false);
  const lastVisibilityHiddenAtRef = useRef(0);
  const isEffectiveShieldActive = enabled && isShieldActive;

  useLayoutEffect(() => {
    onTriggerRef.current = onSecurityTrigger;
    enabledRef.current = enabled;
    activeRef.current = isEffectiveShieldActive;
  }, [onSecurityTrigger, enabled, isEffectiveShieldActive]);

  const activateShield = useCallback(
    (eventType: DrmEventType, reason: string, detail?: string) => {
      if (!enabledRef.current) return;
      if (
        !activeRef.current &&
        document.activeElement instanceof HTMLElement &&
        !overlayRef.current?.contains(document.activeElement)
      ) {
        previousFocusRef.current = document.activeElement;
      }
      setShieldReason(reason);
      setIsShieldActive(true);
      onTriggerRef.current?.({
        eventType,
        triggerDetail: detail ?? reason,
        clientOs: detectClientOs(),
      });
    },
    [],
  );

  const handleResume = useCallback(() => {
    setIsShieldActive(false);
    const previous = previousFocusRef.current;
    previousFocusRef.current = null;
    if (previous && previous.isConnected) {
      requestAnimationFrame(() => {
        previous.focus({ preventScroll: true });
      });
    }
  }, []);

  // Move focus into the DRM alertdialog when locked (PRD DRM-04)
  useEffect(() => {
    if (isEffectiveShieldActive) {
      requestAnimationFrame(() => {
        resumeBtnRef.current?.focus({ preventScroll: true });
      });
    }
  }, [isEffectiveShieldActive]);

  // Paint & maintain theme-adaptive canvas watermark
  useEffect(() => {
    if (!enabled) return;
    let frameId = 0;

    const schedulePaint = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        paintWatermarkCanvas(watermarkCanvasRef.current, watermarkText, theme);
      });
    };

    schedulePaint();
    window.addEventListener("resize", schedulePaint, { passive: true });
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", schedulePaint);
    };
  }, [enabled, watermarkText, theme]);

  // Input, shortcut, visibility, print, drag, and DevTools deterrence
  useEffect(() => {
    if (!enabled) return;

    const handleContextMenu = (e: MouseEvent) => {
      if (isEditableTarget(e.target)) return;
      e.preventDefault();
      activateShield(
        "context_menu",
        "Menu konteks (klik kanan / Inspect) dinonaktifkan demi hak cipta.",
        "Klik kanan (contextmenu) pada area naskah",
      );
    };

    const handleCopyCut = (e: ClipboardEvent) => {
      if (isEditableTarget(e.target)) return;
      e.preventDefault();
      activateShield(
        "clipboard_copy",
        "Penyalinan teks naskah dinonaktifkan demi perlindungan hak cipta.",
        `Percobaan ${e.type} teks naskah`,
      );
    };

    const handleDragStart = (e: DragEvent) => {
      if (isEditableTarget(e.target)) return;
      e.preventDefault();
      activateShield(
        "drag_attempt",
        "Penyeretan teks atau konten naskah dinonaktifkan.",
        "Percobaan menyeret konten (dragstart)",
      );
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const hasPrimaryMod = e.ctrlKey || e.metaKey;

      if (e.key === "PrintScreen" || e.code === "PrintScreen") {
        e.preventDefault();
        activateShield(
          "screenshot_shortcut",
          "Tombol PrintScreen terdeteksi.",
          "PrintScreen (keydown)",
        );
        return;
      }

      if (
        e.metaKey &&
        e.shiftKey &&
        (["Digit3", "Digit4", "Digit5", "KeyS"].includes(e.code) ||
          ["3", "4", "5", "s", "S"].includes(e.key))
      ) {
        activateShield(
          "screenshot_shortcut",
          "Pintasan tangkapan layar sistem terdeteksi.",
          `Pintasan screenshot (${e.code || e.key})`,
        );
        return;
      }

      const isDevToolsShortcut =
        e.key === "F12" ||
        e.code === "F12" ||
        (hasPrimaryMod &&
          e.shiftKey &&
          ["KeyI", "KeyJ", "KeyC"].includes(e.code)) ||
        (e.metaKey &&
          e.altKey &&
          ["KeyI", "KeyJ", "KeyC", "KeyU"].includes(e.code)) ||
        (hasPrimaryMod && !e.shiftKey && e.code === "KeyU");

      if (isDevToolsShortcut) {
        e.preventDefault();
        activateShield(
          "devtools_attempt",
          "Akses DevTools dan inspeksi sumber halaman dinonaktifkan.",
          `Pintasan DevTools (${e.code || e.key})`,
        );
        return;
      }

      if (hasPrimaryMod && !e.shiftKey && e.code === "KeyP") {
        e.preventDefault();
        activateShield(
          "print_save_attempt",
          "Fungsi pencetakan dokumen (Print / PDF) dinonaktifkan.",
          "Pintasan cetak halaman (Ctrl/Cmd+P)",
        );
        return;
      }

      if (hasPrimaryMod && !e.shiftKey && e.code === "KeyS") {
        e.preventDefault();
        activateShield(
          "print_save_attempt",
          "Fungsi pengunduhan halaman dinonaktifkan.",
          "Pintasan simpan halaman (Ctrl/Cmd+S)",
        );
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen" || e.code === "PrintScreen") {
        e.preventDefault();
        activateShield(
          "screenshot_shortcut",
          "Tombol PrintScreen terdeteksi.",
          "PrintScreen (keyup)",
        );
      }
    };

    const handleBeforePrint = () => {
      activateShield(
        "print_save_attempt",
        "Permintaan cetak atau ekspor PDF terdeteksi.",
        "Event beforeprint browser",
      );
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        lastVisibilityHiddenAtRef.current = Date.now();
        activateShield(
          "visibility_hidden",
          "Tab atau jendela baca disembunyikan.",
          "Perpindahan tab / aplikasi (visibilitychange: hidden)",
        );
      }
    };

    const handleWindowBlur = () => {
      if (document.activeElement instanceof HTMLIFrameElement) {
        if (shieldRootRef.current?.contains(document.activeElement)) return;
      }
      if (Date.now() - lastVisibilityHiddenAtRef.current < 300) {
        setIsShieldActive(true);
        return;
      }
      activateShield(
        "window_blur",
        "Jendela baca kehilangan fokus.",
        "Jendela kehilangan fokus (window blur)",
      );
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 2) {
        activateShield(
          "multi_touch",
          "Gerakan multi-sentuh terdeteksi.",
          `Sentuhan ${e.touches.length} jari bersamaan`,
        );
      }
    };

    window.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("copy", handleCopyCut);
    window.addEventListener("cut", handleCopyCut);
    window.addEventListener("dragstart", handleDragStart);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("copy", handleCopyCut);
      window.removeEventListener("cut", handleCopyCut);
      window.removeEventListener("dragstart", handleDragStart);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, activateShield]);

  // MutationObserver self-healing anti-tampering guard against DevTools DOM deletion/hiding
  useEffect(() => {
    if (!enabled) return;
    const root = shieldRootRef.current;
    const watermarkHost = watermarkHostRef.current;
    const canvas = watermarkCanvasRef.current;
    const content = contentRef.current;
    if (!root || !watermarkHost || !canvas || !content) return;

    let checkScheduled = false;
    let isRecovering = false;

    const verifyIntegrity = () => {
      checkScheduled = false;
      if (!enabledRef.current || isRecovering) return;

      let tampered = false;

      if (!watermarkHost.isConnected || watermarkHost.parentElement !== root) {
        isRecovering = true;
        root.prepend(watermarkHost);
        tampered = true;
      }

      if (!canvas.isConnected || canvas.parentElement !== watermarkHost) {
        isRecovering = true;
        watermarkHost.appendChild(canvas);
        tampered = true;
      }

      if (
        isComputedHidden(watermarkHost) ||
        isComputedHidden(canvas) ||
        canvas.width < 1 ||
        canvas.height < 1 ||
        watermarkHost.className !== WATERMARK_HOST_CLASS ||
        canvas.className !== WATERMARK_CANVAS_CLASS
      ) {
        isRecovering = true;
        watermarkHost.removeAttribute("hidden");
        watermarkHost.removeAttribute("style");
        watermarkHost.className = WATERMARK_HOST_CLASS;
        canvas.removeAttribute("hidden");
        canvas.removeAttribute("style");
        canvas.className = WATERMARK_CANVAS_CLASS;
        paintWatermarkCanvas(canvas, watermarkText, theme);
        tampered = true;
      }

      if (activeRef.current) {
        const overlay = overlayRef.current;
        if (
          overlay &&
          (!overlay.isConnected || overlay.parentElement !== root)
        ) {
          isRecovering = true;
          root.appendChild(overlay);
          tampered = true;
        }
        if (overlay && isComputedHidden(overlay)) {
          isRecovering = true;
          overlay.removeAttribute("hidden");
          overlay.removeAttribute("style");
          tampered = true;
        }
        if (
          !overlay ||
          !content.classList.contains("blur-2xl") ||
          content.hasAttribute("style")
        ) {
          isRecovering = true;
          content.removeAttribute("style");
          content.className =
            "transition-all duration-150 blur-2xl opacity-10 pointer-events-none filter";
          tampered = true;
        }
      }

      if (isRecovering) {
        requestAnimationFrame(() => {
          isRecovering = false;
        });
      }

      if (tampered) {
        activateShield(
          "dom_tampering",
          "Manipulasi node watermark atau pelindung DRM lewat DevTools terdeteksi.",
          "MutationObserver: node/style watermark atau shield dimodifikasi",
        );
      }
    };

    const scheduleVerify = () => {
      if (isRecovering || checkScheduled) return;
      checkScheduled = true;
      requestAnimationFrame(verifyIntegrity);
    };

    const observer = new MutationObserver(scheduleVerify);
    observer.observe(root, { childList: true });
    observer.observe(watermarkHost, {
      childList: true,
      attributes: true,
      attributeFilter: ["style", "class", "hidden", "aria-hidden"],
    });
    observer.observe(canvas, {
      attributes: true,
      attributeFilter: ["style", "class", "hidden", "width", "height"],
    });
    observer.observe(content, {
      attributes: true,
      attributeFilter: ["style", "class", "hidden"],
    });

    return () => {
      observer.disconnect();
    };
  }, [enabled, watermarkText, theme, activateShield]);

  // Production-only interactive DevTools probe (0ms cost unless Debugger domain is attached)
  useEffect(() => {
    if (!enabled || IS_DRM_TOGGLE_ENABLED || import.meta.env.DEV) return;
    const timer = window.setInterval(() => {
      if (activeRef.current || document.visibilityState !== "visible") return;
      const started = performance.now();
      // eslint-disable-next-line no-debugger
      debugger;
      if (performance.now() - started > 120) {
        activateShield(
          "devtools_attempt",
          "Debugger / DevTools terdeteksi aktif pada jendela baca.",
          "DevTools debugger probe aktif",
        );
      }
    }, 2500);
    return () => window.clearInterval(timer);
  }, [enabled, activateShield]);

  return (
    <div
      ref={shieldRootRef}
      data-drm-protected={enabled ? "true" : "false"}
      data-theme={theme}
      className="relative select-text"
    >
      {/* Theme-Adaptive Repeating Canvas Watermark (Only when DRM is enabled) */}
      {enabled && (
        <div
          ref={watermarkHostRef}
          data-drm-watermark="true"
          className={WATERMARK_HOST_CLASS}
          aria-hidden="true"
        >
          <canvas
            ref={watermarkCanvasRef}
            data-testid="drm-watermark-canvas"
            data-watermark-code={watermarkText}
            data-watermark-theme={theme}
            className={WATERMARK_CANVAS_CLASS}
          />
        </div>
      )}

      {/* Actual Content with Blur Filter on Shield Active */}
      <div
        ref={contentRef}
        data-drm-content="true"
        className={`transition-all duration-150 ${
          isEffectiveShieldActive
            ? "blur-2xl opacity-10 pointer-events-none filter"
            : "blur-none opacity-100"
        }`}
      >
        {children}
      </div>

      {/* Print-Only DRM Blocker Notice (Shown only inside @media print) */}
      {enabled && (
        <div
          data-drm-print-block="true"
          className="min-h-screen flex-col items-center justify-center p-12 text-center gap-4"
        >
          <ShieldAlert className="size-10" />
          <h2 className="font-serif text-2xl font-bold">
            Pencetakan Naskah Dilindungi Hak Cipta (AnzaBook DRM)
          </h2>
          <p className="max-w-md text-sm">
            Naskah digital ini dilindungi oleh AnzaBook dan tidak dapat dicetak
            atau diekspor ke PDF secara langsung.
          </p>
          <p className="font-mono text-xs">ID Sesi Pembaca: {watermarkText}</p>
        </div>
      )}

      {/* Pre-Trigger DRM Shield Overlay (instant lock without fade-in leak) */}
      {isEffectiveShieldActive && (
        <div
          ref={overlayRef}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="drm-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/95 backdrop-blur-md"
        >
          <div className="max-w-md w-full bg-card border border-border rounded-[10px] p-6 shadow-2xl text-center space-y-4">
            <div className="flex justify-center mb-1">
              <Brand asLink={false} />
            </div>

            <div className="space-y-1.5">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground flex items-center justify-center gap-1">
                <Lock className="size-3" />
                Perlindungan Hak Cipta Aktif (DRM)
              </span>
              <h2
                id="drm-title"
                className="font-serif text-lg font-bold text-foreground"
              >
                Tampilan Naskah Terkunci Sementara
              </h2>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              {shieldReason} Demi melindungi hak cipta penulis dan penerjemah,
              naskah disembunyikan secara otomatis saat jendela tidak aktif,
              pintasan tangkapan layar, atau DevTools terdeteksi.
            </p>

            <div className="p-3 bg-muted/40 rounded-[6px] border border-border text-[11px] font-mono text-muted-foreground text-left break-all">
              <span className="opacity-70 block text-[9px] uppercase tracking-wider mb-0.5">
                ID Sesi Watermark Pembaca:
              </span>
              {watermarkText}
            </div>

            <div className="pt-2">
              <Button
                ref={resumeBtnRef}
                onClick={handleResume}
                className="w-full font-mono text-xs"
              >
                Lanjutkan Membaca
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
