import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import {
  IosCheckmark,
  IosChevronLeft,
  IosChevronRight,
  IosStar,
} from "@/components/ui/ios-icons";
import { pageFold } from "../page-fold";
import type {
  SlideFragment,
  SlideLeaf,
  SlideSpread,
} from "../slide-pagination";
import "./reader-book.css";

type Step = -1 | 1;
type Turn = {
  step: Step;
  distance: number;
  lift: number;
  width: number;
  height: number;
  bookWidth: number;
  to: SlideSpread;
};
type Gesture = { id: number; x: number; y: number; moved: boolean };
type ReaderSlideViewProps = {
  spreads: SlideSpread[];
  index: number;
  onTurn: (target: SlideSpread) => void;
  onMeasure: (node: HTMLElement | null) => void;
  onFinishSession: () => void;
  onOpenRating: () => void;
  fontClass: string;
  fontSize: number;
  coverColor: string;
  isPremiumPreview: boolean;
  renderFragment: (fragment: SlideFragment, chapterNumber: number) => ReactNode;
};

function Leaf({
  leaf,
  spread,
  fade,
  renderFragment,
  side,
  turning,
}: {
  leaf?: SlideLeaf;
  spread: SlideSpread;
  fade?: boolean;
  renderFragment: ReaderSlideViewProps["renderFragment"];
  side: "left" | "right";
  turning?: boolean;
}) {
  return (
    <section
      className="reader-leaf"
      data-side={side}
      data-reader-fold-front={turning || undefined}
    >
      {leaf?.heading && (
        <header className="reader-leaf-heading">
          <span>BAB {spread.chapter.chapterNumber}</span>
          <h1>{spread.chapter.title}</h1>
        </header>
      )}
      {leaf?.fragments.map((fragment, index) => (
        <p
          key={fragment.paragraph}
          data-preview-fade={
            (fade && index === leaf.fragments.length - 1) || undefined
          }
        >
          {renderFragment(fragment, spread.chapter.chapterNumber)}
        </p>
      ))}
    </section>
  );
}

function paintFold(scene: HTMLDivElement | null, turn: Turn) {
  if (!scene) return;
  const fold = pageFold(
    turn.width,
    turn.height,
    turn.distance,
    turn.lift,
    turn.step < 0,
  );
  const shift = turn.step === 1 ? turn.bookWidth - turn.width : 0;
  const outline = fold.sheetPath(shift);
  const front = scene.querySelector<HTMLElement>("[data-reader-fold-front]")!;
  const back = scene.querySelector<HTMLElement>("[data-reader-fold-back]")!;
  const page = back.firstElementChild as HTMLElement | null;
  const light =
    scene.querySelector<SVGLinearGradientElement>("linearGradient")!;
  const shadow = scene.querySelector<SVGPathElement>(
    "[data-reader-fold] path",
  )!;

  front.style.clipPath = `path("${fold.flatPath}")`;
  back.style.clipPath = `path("${outline}")`;
  if (page) page.style.transform = fold.backTransform(shift);
  light.setAttribute("x1", String(shift + fold.crease.x));
  light.setAttribute("y1", String(fold.crease.y));
  light.setAttribute("x2", String(shift + fold.tip.x));
  light.setAttribute("y2", String(fold.tip.y));
  shadow.setAttribute("d", outline);
  shadow.setAttribute("opacity", String(fold.shade));
}

export function ReaderSlideView({
  spreads,
  index,
  onTurn,
  onMeasure,
  onFinishSession,
  onOpenRating,
  fontClass,
  fontSize,
  coverColor,
  isPremiumPreview,
  renderFragment,
}: ReaderSlideViewProps) {
  const book = useRef<HTMLDivElement>(null);
  const scene = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const gesture = useRef<Gesture | null>(null);
  const activeTurn = useRef<Turn | null>(null);
  const [turn, setTurn] = useState<Turn | null>(null);
  const spread = spreads[index];
  const visible = turn?.to ?? spread;
  const canPrev = index > 0;
  const canNext = index < spreads.length - 1;
  const previewFade = isPremiumPreview && visible === spreads.at(-1);

  useEffect(() => {
    const element = book.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const current = activeTurn.current;
      if (
        !current ||
        (Math.abs(entry.contentRect.width - current.bookWidth) < 1 &&
          Math.abs(entry.contentRect.height - current.height) < 1)
      )
        return;
      cancelAnimationFrame(frame.current);
      frame.current = 0;
      gesture.current = null;
      activeTurn.current = null;
      setTurn(null);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame.current);
    };
  }, []);
  useLayoutEffect(() => {
    if (turn) paintFold(scene.current, activeTurn.current ?? turn);
  }, [turn]);

  function start(step: Step) {
    const target = spreads[index + step];
    const element = book.current;
    if (!target || !spread || !element || activeTurn.current) return null;
    const leaf = element.querySelector<HTMLElement>(".reader-leaf");
    if (!leaf) return null;
    const bounds = leaf.getBoundingClientRect();
    const state = {
      step,
      distance: 1,
      lift: 0,
      width: bounds.width,
      height: bounds.height,
      bookWidth: element.getBoundingClientRect().width,
      to: target,
    };
    activeTurn.current = state;
    return state;
  }

  function finish(commit: boolean, fromButton = false) {
    const state = activeTurn.current;
    if (!state) return;
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const complete = () => {
      activeTurn.current = null;
      setTurn(null);
      if (commit) onTurn(state.to);
    };
    if (reducedMotion) {
      complete();
      return;
    }
    setTurn((current) => current ?? state);
    const destination = commit ? state.width * 2 : 1;
    let began: number | undefined;
    const travel = Math.min(
      1,
      Math.abs(destination - state.distance) / state.width,
    );
    const duration = 140 + travel * (commit ? 190 : 75);
    const animate = (now: number) => {
      began ??= now;
      const progress = Math.min(1, (now - began) / duration);
      const eased = fromButton
        ? progress * progress * (3 - 2 * progress)
        : 1 - Math.pow(1 - progress, 3);
      paintFold(scene.current, {
        ...state,
        distance: state.distance + (destination - state.distance) * eased,
        lift:
          state.lift * (1 - eased) +
          (fromButton ? Math.sin(Math.PI * progress) * state.height * 0.15 : 0),
      });
      if (progress === 1) {
        frame.current = 0;
        complete();
        return;
      }
      frame.current = requestAnimationFrame(animate);
    };
    frame.current = requestAnimationFrame(animate);
  }

  function turnPage(step: Step) {
    const state = start(step);
    if (!state) return;
    finish(true, true);
  }

  function startDrag(event: PointerEvent<HTMLButtonElement>, step: Step) {
    if (!event.isPrimary || event.button !== 0 || !start(step)) return;
    gesture.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function drag(event: PointerEvent<HTMLButtonElement>) {
    const pointer = gesture.current;
    const state = activeTurn.current;
    if (!state || !pointer || pointer.id !== event.pointerId) return;
    const distance = (pointer.x - event.clientX) * state.step;
    const lift = pointer.y - event.clientY;
    pointer.moved ||= Math.hypot(distance, lift) > 8;
    if (!pointer.moved) return;
    const next = {
      ...state,
      distance: Math.min(state.width * 2, Math.max(1, distance)),
      lift,
    };
    activeTurn.current = next;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!turn) setTurn(next);
    if (!frame.current) {
      frame.current = requestAnimationFrame(() => {
        frame.current = 0;
        if (activeTurn.current) paintFold(scene.current, activeTurn.current);
      });
    }
  }

  function endDrag(event: PointerEvent<HTMLButtonElement>) {
    const pointer = gesture.current;
    const state = activeTurn.current;
    if (!state || !pointer || pointer.id !== event.pointerId) return;
    gesture.current = null;
    finish(
      event.type === "pointerup" &&
        (!pointer.moved || state.distance >= state.width * 0.22),
    );
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        document.querySelector('[role="dialog"]') ||
        (event.target instanceof HTMLElement &&
          event.target.closest("input, textarea, select, [contenteditable]"))
      )
        return;
      if (event.key === "ArrowLeft" && canPrev) {
        event.preventDefault();
        turnPage(-1);
      } else if (event.key === "ArrowRight" && canNext) {
        event.preventDefault();
        turnPage(1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const isSpread = turn && turn.bookWidth > turn.width + 1;
  const backSide = !isSpread || turn.step === 1 ? "left" : "right";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={book}
        className={`reader-book ${fontClass}`}
        style={
          {
            "--reader-leaf-size": `${fontSize}px`,
            "--reader-cover": coverColor,
          } as CSSProperties
        }
      >
        <div className="reader-spread reader-measure" aria-hidden="true">
          <section className="reader-leaf" ref={onMeasure}>
            <header className="reader-leaf-heading">
              <span />
              <h1 />
            </header>
          </section>
        </div>
        {visible && (
          <div className="reader-spread reader-spread-paper" inert={!!turn}>
            <Leaf
              side="left"
              leaf={visible.leaves[0]}
              spread={visible}
              fade={previewFade && visible.leaves.length === 1}
              renderFragment={renderFragment}
            />
            <div className="reader-right">
              <Leaf
                side="right"
                leaf={visible.leaves[1]}
                spread={visible}
                fade={previewFade}
                renderFragment={renderFragment}
              />
            </div>
          </div>
        )}
        {turn && spread && (
          <div
            className="reader-turn-scene"
            ref={scene}
            inert
            aria-hidden="true"
          >
            <div className="reader-spread reader-turn">
              <Leaf
                side="left"
                leaf={spread.leaves[0]}
                spread={spread}
                turning={!isSpread || turn.step < 0}
                fade={
                  isPremiumPreview && !canNext && spread.leaves.length === 1
                }
                renderFragment={renderFragment}
              />
              {isSpread && (
                <div className="reader-right">
                  <Leaf
                    side="right"
                    leaf={spread.leaves[1]}
                    spread={spread}
                    turning={turn.step > 0}
                    fade={isPremiumPreview && !canNext}
                    renderFragment={renderFragment}
                  />
                </div>
              )}
            </div>
            <div data-reader-fold-back className="reader-fold-back">
              <div
                className="reader-fold-content"
                style={{ width: turn.width, height: turn.height }}
              >
                <Leaf
                  side={backSide}
                  leaf={turn.to.leaves[backSide === "left" ? 0 : 1]}
                  spread={turn.to}
                  fade={previewFade && turn.to.leaves.length === 1}
                  renderFragment={renderFragment}
                />
              </div>
            </div>
            <svg data-reader-fold className="reader-fold" aria-hidden="true">
              <defs>
                <linearGradient
                  id="reader-fold-light"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop
                    offset="0"
                    stopColor="var(--reader-spine-ink)"
                    stopOpacity=".3"
                  />
                  <stop
                    offset=".28"
                    stopColor="var(--book-cover-text)"
                    stopOpacity=".18"
                  />
                  <stop
                    offset=".68"
                    stopColor="var(--reader-paper)"
                    stopOpacity="0"
                  />
                  <stop
                    offset="1"
                    stopColor="var(--reader-spine-ink)"
                    stopOpacity=".26"
                  />
                </linearGradient>
              </defs>
              <path fill="url(#reader-fold-light)" stroke="var(--color-rule)" />
            </svg>
          </div>
        )}
        {([-1, 1] as const).map((step) => (
          <button
            key={step}
            type="button"
            className="reader-corner"
            data-side={step === 1 ? "right" : "left"}
            aria-label={
              step === 1 ? "Balik lembar berikutnya" : "Balik lembar sebelumnya"
            }
            disabled={step === 1 ? !canNext : !canPrev}
            onPointerDown={(event) => startDrag(event, step)}
            onPointerMove={drag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onLostPointerCapture={endDrag}
            onClick={(event) => {
              if (event.detail === 0) turnPage(step);
            }}
          />
        ))}
        {!visible && (
          <p className="absolute inset-0 grid place-items-center text-sm">
            Menata halaman…
          </p>
        )}
      </div>

      <footer className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-1 py-1 font-sans sm:px-4">
        <Button
          variant="ghost"
          onClick={onOpenRating}
          aria-label="Beri Rating"
          className="min-h-11 min-w-11 justify-self-start px-2"
        >
          <IosStar filled className="size-4 text-primary" />
          <span className="hidden sm:inline">Beri Rating</span>
        </Button>
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Halaman sebelumnya"
            disabled={!canPrev}
            onClick={() => turnPage(-1)}
            className="size-11"
          >
            <IosChevronLeft className="size-4" />
          </Button>
          <span
            aria-live="polite"
            className="whitespace-nowrap px-1 font-mono text-xs tabular-nums"
          >
            {spread && `Page ${index + 1} of ${spreads.length}`}
          </span>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Halaman selanjutnya"
            disabled={!canNext}
            onClick={() => turnPage(1)}
            className="size-11"
          >
            <IosChevronRight className="size-4" />
          </Button>
        </div>
        <Button
          onClick={onFinishSession}
          aria-label="Selesai Baca"
          className="min-h-11 min-w-11 justify-self-end px-2 sm:px-3"
        >
          <IosCheckmark className="size-4" />
          <span className="hidden sm:inline">Selesai Baca</span>
        </Button>
      </footer>
    </div>
  );
}
