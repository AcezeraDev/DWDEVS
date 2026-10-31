import type Lenis from "lenis";

// Shared, mutable scroll state read inside useFrame (no React re-renders).
export const scrollStore = {
  progress: 0,
  velocity: 0,
  ready: false,
  // 1 → scene still scattered / camera far, 0 → assembled (tweened after the preloader)
  intro: 1,
  // 0..1 while the hero is pinned: the headline gets swallowed and the camera falls into the hole
  dive: 0,
  // Which chapter of the page is on screen (see [data-chapter]); drives the rail and the CTA
  chapter: 0,
  // How far each chapter has scrolled in (0..1 per [data-chapter] n). Their sum is the scene's
  // continuous chapter, so every morph follows the scroll instead of playing on a timer.
  legs: [0, 0, 0, 0, 0],
  // Written by the scene each frame for the DOM and the lens pass: horizon flash (0..1), scroll
  // speed (0..1), held-click charge (0..1), the hole on screen (px) and the service planets (px).
  fx: {
    crossing: 0,
    speed: 0,
    charge: 0,
    // 0..1 while one project hands over to the next: the hyperspace jet speeds up
    warp: 0,
    // 0..1 peaking as the camera flies through a section portal
    portal: 0,
    hole: { x: 0, y: 0, r: 0 },
    planets: [0, 1, 2, 3].map(() => ({ x: 0, y: 0, o: 0, active: 0 })),
  },
  // Services orbit (desktop): `on` while its section is pinned, `p` = 0..3 which planet is in front
  orbit: { on: 0, p: 0 },
  lenis: null as Lenis | null,
};

/** Where the black hole sits on screen (NDC) in the projects chapter; the project cards come out of it. */
export const JET_POINT = { x: 0.82, y: 0.58 };

/** Where the black hole sits on screen (NDC) at the bottom of the hero dive. */
export const DIVE_POINT = { x: 0, y: 0.1 };

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

/** Center of `el` in the coordinates of `root`, ignoring CSS transforms (layout only). */
export function offsetIn(el: HTMLElement, root: HTMLElement) {
  let x = el.offsetWidth / 2;
  let y = el.offsetHeight / 2;
  let n: HTMLElement | null = el;
  while (n && n !== root) {
    x += n.offsetLeft;
    y += n.offsetTop;
    n = n.offsetParent as HTMLElement | null;
  }
  if (!n) {
    // `root` was not in the offsetParent chain: both offsets are page-relative then
    const r = offsetIn(root, document.body);
    x -= r.x - root.offsetWidth / 2;
    y -= r.y - root.offsetHeight / 2;
  }
  return { x, y };
}
