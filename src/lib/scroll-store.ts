import type Lenis from "lenis";

// Shared, mutable scroll state read inside useFrame (no React re-renders).
export const scrollStore = {
  progress: 0,
  velocity: 0,
  ready: false,
  // 1 → scene still scattered / camera far, 0 → assembled (tweened after the preloader)
  intro: 1,
  lenis: null as Lenis | null,
};

export function scrollToTarget(target: string | number) {
  if (scrollStore.lenis) {
    scrollStore.lenis.scrollTo(target, { duration: 1.6 });
    return;
  }
  if (typeof target === "number") {
    window.scrollTo({ top: target, behavior: "smooth" });
  } else {
    document.querySelector(target)?.scrollIntoView({ behavior: "smooth" });
  }
}

/** Jump to a section behind a full-screen curtain wipe (see <Curtain />). */
export function cinematicTo(target: string, label: string) {
  if (prefersReducedMotion() || !scrollStore.lenis) {
    scrollToTarget(target);
    return;
  }
  window.dispatchEvent(new CustomEvent("dw:goto", { detail: { target, label } }));
}

export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
