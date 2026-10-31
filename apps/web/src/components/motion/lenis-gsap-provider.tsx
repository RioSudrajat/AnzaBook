import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouterState } from "@tanstack/react-router";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);

type SmoothScrollContextValue = {
  getLenis: () => Lenis | null;
  velocity: number;
  isPaused: boolean;
  pauseScroll: () => void;
  resumeScroll: () => void;
};

const SmoothScrollContext = createContext<SmoothScrollContextValue>({
  getLenis: () => null,
  velocity: 0,
  isPaused: false,
  pauseScroll: () => {},
  resumeScroll: () => {},
});

export function useSmoothScroll() {
  return useContext(SmoothScrollContext);
}

export function LenisGsapProvider({ children }: { children: ReactNode }) {
  const [velocity, setVelocity] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const lenisRef = useRef<Lenis | null>(null);

  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const isReaderRoute = pathname.startsWith("/read/");

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion || isReaderRoute) {
      if (lenisRef.current) {
        lenisRef.current.destroy();
        lenisRef.current = null;
      }
      return;
    }

    const lenis = new Lenis({
      autoRaf: false,
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.5,
    });

    lenisRef.current = lenis;

    lenis.on("scroll", (e: { velocity: number }) => {
      ScrollTrigger.update();
      if (typeof e.velocity === "number") {
        setVelocity(Math.round(e.velocity * 10) / 10);
      }
    });

    const updateTicker = (time: number) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(updateTicker);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(updateTicker);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [isReaderRoute]);

  const pauseScroll = useCallback(() => {
    if (lenisRef.current) {
      lenisRef.current.stop();
      setIsPaused(true);
    }
  }, []);

  const resumeScroll = useCallback(() => {
    if (lenisRef.current) {
      lenisRef.current.start();
      setIsPaused(false);
    }
  }, []);

  const getLenis = useCallback(() => lenisRef.current, []);

  return (
    <SmoothScrollContext.Provider
      value={{
        getLenis,
        velocity,
        isPaused,
        pauseScroll,
        resumeScroll,
      }}
    >
      {children}
    </SmoothScrollContext.Provider>
  );
}
