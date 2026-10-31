import { MotionConfig } from "motion/react";
import { AnzaPreloader } from "@/components/motion/anza-preloader";
import { LenisGsapProvider } from "@/components/motion/lenis-gsap-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <LenisGsapProvider>
        <AnzaPreloader />
        {children}
      </LenisGsapProvider>
    </MotionConfig>
  );
}
