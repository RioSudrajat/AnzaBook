import * as React from "react";

// Keeps a counter of active locks so nested or simultaneous dialogs don't prematurely unlock the body
let lockCount = 0;
let prevOverflow = "";
let prevPaddingRight = "";

export function useBodyScrollLock(locked: boolean) {
  React.useEffect(() => {
    if (!locked || typeof window === "undefined") return;

    const lenis = (window as any).__lenis;
    if (lenis && typeof lenis.stop === "function") {
      lenis.stop();
    }

    if (lockCount === 0) {
      prevOverflow = document.body.style.overflow;
      prevPaddingRight = document.body.style.paddingRight;

      const scrollBarWidth =
        window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = "hidden";
      if (scrollBarWidth > 0) {
        document.body.style.paddingRight = `${scrollBarWidth}px`;
      }
    }
    lockCount += 1;

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        document.body.style.overflow = prevOverflow;
        document.body.style.paddingRight = prevPaddingRight;

        const activeLenis = (window as any).__lenis;
        if (activeLenis && typeof activeLenis.start === "function") {
          activeLenis.start();
        }
      }
    };
  }, [locked]);
}
