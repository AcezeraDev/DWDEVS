import type Lenis from "lenis";
import { DIMENSIONS } from "./data";

/**
 * Shared, mutable state for /multiverso, read every frame by the 3D scene and the HUD (no React
 * re-renders). Scenes are the `[data-scene]` sections, in page order.
 */
export const mv = {
  progress: 0,
  velocity: 0,
  ready: false,
  // 1 → the hole is still a point (before the iris opens), 0 → fully formed
  intro: 1,
  // 0..1 while the hero is pinned: the disk turns from edge-on to face-on and the rings line up
  // into a portal that the camera flies through at the end
  hero: 0,
  // How far each scene has scrolled in (0..1). Their sum is the continuous scene index.
  legs: [0, 0, 0, 0, 0, 0, 0],
  // Which dimension (accent pair) is on, see DIMENSIONS
  dim: 0,
  // 0..1 burst of hyperspace while a nav jump or a project handover runs
  warp: 0,
  // Written by the scene: how much faster the disk's clock runs right now (scroll speed, warps)
  dilation: 1,
  // Written by the scene: the black hole on screen (px)
  hole: { x: 0, y: 0, r: 0 },
  lenis: null as Lenis | null,
};

export const SCENES = ["Início", "Sobre", "Serviços", "Stack", "Projetos", "Processo", "Contato"];

/**
 * Where the black hole sits per scene: screen position (NDC, -1..1), size, how far the disk
 * faces us (0 edge-on, ~1.4 face-on), its roll, its strength and how much of the ring gyroscope
 * shows. Sections that frame something around the hole (projects, process) read these too.
 */
export type HoleKey = { x: number; y: number; s: number; tilt: number; roll: number; o: number; ring: number };

export const KEYS_WIDE: HoleKey[] = [
  { x: 0, y: -0.02, s: 1.5, tilt: 0.16, roll: -0.12, o: 1, ring: 0.75 }, // hero: dead centre, between headline and pitch
  { x: 0.74, y: 0.6, s: 0.95, tilt: 0.75, roll: 0.3, o: 1, ring: 0.7 }, // sobre: above the panels, right
  { x: 0.84, y: -0.62, s: 1.0, tilt: 0.45, roll: -0.4, o: 1, ring: 0.9 }, // serviços: bottom-right, under the copy
  { x: -0.72, y: -0.5, s: 1.0, tilt: 1.0, roll: 0.2, o: 1, ring: 0.8 }, // stack: bottom-left, by the map
  { x: 0, y: 0.12, s: 1.7, tilt: 0.14, roll: -0.08, o: 1, ring: 0.7 }, // projetos: centre of the orbit of sites
  { x: 0.45, y: -0.05, s: 0.95, tilt: 1.25, roll: 0, o: 1, ring: 0.3 }, // processo: centre of the orbit
  { x: 0, y: -0.55, s: 1.5, tilt: 0.2, roll: -0.05, o: 1, ring: 1 }, // contato: under the headline
];

/** Phones and portrait tablets: the copy fills the width, so the hole keeps to the top or edges. */
export const KEYS_TALL: HoleKey[] = [
  { x: 0, y: 0.02, s: 1.0, tilt: 0.16, roll: -0.12, o: 1, ring: 0.7 },
  { x: 0.7, y: 0.74, s: 0.6, tilt: 0.9, roll: 0.3, o: 1, ring: 0.5 },
  { x: -0.7, y: 0.76, s: 0.6, tilt: 0.5, roll: -0.4, o: 1, ring: 0.6 },
  { x: 0.7, y: -0.76, s: 0.6, tilt: 1.1, roll: 0.2, o: 1, ring: 0.5 },
  { x: 0, y: 0.34, s: 0.75, tilt: 0.18, roll: -0.08, o: 1, ring: 0.5 },
  { x: 0, y: 0.36, s: 0.6, tilt: 1.25, roll: 0, o: 1, ring: 0.2 },
  { x: 0, y: -0.6, s: 1.0, tilt: 0.2, roll: -0.05, o: 1, ring: 0.9 },
];

/** Stacked layouts (phones, tablets, portrait): the copy fills the width. Same breakpoint as lg. */
export const stacked = (w: number, h: number) => w < 1024 || w / h < 1;
/** Throwing stars at the hole is on where it is the main act: the hero and the contact. */
export const canFeed = () => {
  const s = mv.legs.reduce((a, b) => a + b, 0);
  return (s < 0.3 && mv.hero < 0.35) || mv.legs[6] > 0.9;
};

export const isTall = () => typeof window !== "undefined" && stacked(window.innerWidth, window.innerHeight);

/** A scene's key for the current screen, as CSS percentages of the viewport. */
export function keyOnScreen(scene: number) {
  const k = (isTall() ? KEYS_TALL : KEYS_WIDE)[scene];
  return { left: (k.x * 0.5 + 0.5) * 100, top: (0.5 - k.y * 0.5) * 100 };
}

export const reduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function scrollToTarget(target: string | number, duration = 1.6) {
  if (mv.lenis) mv.lenis.scrollTo(target, { duration });
  else if (typeof target === "number") window.scrollTo({ top: target, behavior: "smooth" });
  else document.querySelector(target)?.scrollIntoView({ behavior: "smooth" });
}

/** Jump to a section through hyperspace: the stars stretch into streaks while the page flies. */
export function warpTo(target: string) {
  if (reduced() || !mv.lenis) return scrollToTarget(target);
  window.dispatchEvent(new CustomEvent("mv:warp", { detail: target }));
}

/** Apply a dimension's accent pair to the whole page (CSS) — the scene reads mv.dim itself. */
export function applyDimension(i: number) {
  const d = DIMENSIONS[i];
  mv.dim = i;
  const root = document.documentElement.style;
  root.setProperty("--acc", d.acc);
  root.setProperty("--acc-2", d.acc2);
}
