import { useCallback, useEffect, useRef } from "react";
import {
  ActiveReadingTimerEngine,
  DEFAULT_IDLE_TIMEOUT_MS,
} from "../active-reading-timer-engine";

export type UseActiveReadingTimerOptions = {
  isPaused: boolean;
  isAudioPlaying?: boolean;
  idleTimeoutMs?: number;
};

export type ActiveReadingTimerHandle = {
  getActiveSeconds: () => number;
  recordActivity: () => void;
  reset: () => void;
};

export function useActiveReadingTimer({
  isPaused,
  isAudioPlaying = false,
  idleTimeoutMs = DEFAULT_IDLE_TIMEOUT_MS,
}: UseActiveReadingTimerOptions): ActiveReadingTimerHandle {
  const engineRef = useRef<ActiveReadingTimerEngine | null>(null);
  const idleTimeoutRef = useRef(idleTimeoutMs);

  useEffect(() => {
    idleTimeoutRef.current = idleTimeoutMs;
  }, [idleTimeoutMs]);

  const getEngine = useCallback(() => {
    if (!engineRef.current) {
      const visible =
        typeof document === "undefined"
          ? true
          : document.visibilityState === "visible";
      engineRef.current = new ActiveReadingTimerEngine({
        now: Date.now(),
        idleTimeoutMs: idleTimeoutRef.current,
        isVisible: visible,
      });
    }
    return engineRef.current;
  }, []);

  useEffect(() => {
    getEngine().setPaused(isPaused, Date.now());
  }, [getEngine, isPaused]);

  useEffect(() => {
    getEngine().setAudioPlaying(isAudioPlaying, Date.now());
  }, [getEngine, isAudioPlaying]);

  useEffect(() => {
    if (typeof document === "undefined" || typeof window === "undefined") {
      return;
    }

    const engine = getEngine();
    engine.setVisible(document.visibilityState === "visible", Date.now());

    let lastPointerMoveAt = 0;

    const handleVisibility = () => {
      engine.setVisible(document.visibilityState === "visible", Date.now());
    };

    const handleActivity = () => {
      engine.recordActivity(Date.now());
    };

    const handlePointerMove = () => {
      const now = Date.now();
      if (now - lastPointerMoveAt < 1000) return;
      lastPointerMoveAt = now;
      engine.recordActivity(now);
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("scroll", handleActivity, { passive: true });
    window.addEventListener("wheel", handleActivity, { passive: true });
    window.addEventListener("pointerdown", handleActivity, { passive: true });
    window.addEventListener("pointermove", handlePointerMove, {
      passive: true,
    });
    window.addEventListener("touchstart", handleActivity, { passive: true });
    window.addEventListener("keydown", handleActivity);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("scroll", handleActivity);
      window.removeEventListener("wheel", handleActivity);
      window.removeEventListener("pointerdown", handleActivity);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("touchstart", handleActivity);
      window.removeEventListener("keydown", handleActivity);
    };
  }, [getEngine]);

  const getActiveSeconds = useCallback(
    () => getEngine().getActiveSeconds(Date.now()),
    [getEngine],
  );

  const recordActivity = useCallback(() => {
    getEngine().recordActivity(Date.now());
  }, [getEngine]);

  const reset = useCallback(() => {
    getEngine().reset(Date.now());
  }, [getEngine]);

  return {
    getActiveSeconds,
    recordActivity,
    reset,
  };
}
