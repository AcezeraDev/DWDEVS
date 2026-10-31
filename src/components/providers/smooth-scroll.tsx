"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { prefersReducedMotion, scrollStore } from "@/lib/scroll-store";

gsap.registerPlugin(ScrollTrigger);

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const updateFromWindow = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      scrollStore.progress = max > 0 ? window.scrollY / max : 0;
    };

    if (prefersReducedMotion()) {
      window.addEventListener("scroll", updateFromWindow, { passive: true });
      updateFromWindow();
      return () => window.removeEventListener("scroll", updateFromWindow);
    }

    const lenis = new Lenis({ lerp: 0.075, wheelMultiplier: 0.95, touchMultiplier: 1.3 });
    scrollStore.lenis = lenis;
    (window as unknown as { __lenis?: Lenis }).__lenis = lenis;
    if (!scrollStore.ready) lenis.stop();

    const root = document.documentElement;
    lenis.on("scroll", (e: Lenis) => {
      scrollStore.progress = e.progress || 0;
      scrollStore.velocity = e.velocity;
      root.style.setProperty("--skew", `${gsap.utils.clamp(-5, 5, e.velocity * -0.12)}deg`);
      ScrollTrigger.update();
    });

    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
      scrollStore.lenis = null;
    };
  }, []);

  return <>{children}</>;
}
