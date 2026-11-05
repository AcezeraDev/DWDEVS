import * as THREE from "three";
import { sfx } from "./sound";
import { burst } from "./stage";

// Mundos de cor: a mesma identidade em cinco paletas.
export const WORLDS = [
  { id: "verde", name: "Verde", sig: "#2bff88", alt: "#1fd1ba" },
  { id: "lima", name: "Lima", sig: "#c8f031", alt: "#1fd1ba" },
  { id: "ciano", name: "Ciano", sig: "#2ee6d0", alt: "#8a5cff" },
  { id: "violeta", name: "Violeta", sig: "#a98bff", alt: "#ff5fa2" },
  { id: "rosa", name: "Rosa", sig: "#ff6fae", alt: "#ffc14d" },
] as const;

export type WorldId = (typeof WORLDS)[number]["id"];

const KEY = "dw-world";

const raw = (hex: string) => new THREE.Color().setStyle(hex, THREE.NoColorSpace);

// Uniforms compartilhados entre todos os shaders. Os valores ficam em sRGB cru,
// porque esses shaders escrevem a cor direto, sem conversão.
export const accent = { value: raw(WORLDS[0].sig) };
export const accent2 = { value: raw(WORLDS[0].alt) };

let index = 0;
const targetA = raw(WORLDS[0].sig);
const targetB = raw(WORLDS[0].alt);

const listeners = new Set<(i: number) => void>();
const repaints = new Set<{ texture: THREE.CanvasTexture; paint: (c: CanvasRenderingContext2D, w: number, h: number) => void }>();
let repaintTimer = 0;

export const worldHex = () => WORLDS[index].sig;
export const worldIndex = () => index;

/** Cor do mundo atual para canvas: a mesma cor, com transparência. */
export const worldRgba = (alpha: number) => {
  const c = raw(worldHex());
  return `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${alpha})`;
};

/** Aplica a cor do mundo em um material comum do three, que converte a cor na saída. */
export const tintMaterial = (color: THREE.Color) => color.setRGB(accent.value.r, accent.value.g, accent.value.b, THREE.SRGBColorSpace);

/** Texturas desenhadas com a cor do mundo são redesenhadas quando ele muda. */
export function trackPaint(texture: THREE.CanvasTexture, paint: (c: CanvasRenderingContext2D, w: number, h: number) => void) {
  const entry = { texture, paint };
  repaints.add(entry);
  texture.addEventListener("dispose", () => repaints.delete(entry));
}

function applyCss(i: number) {
  const s = document.documentElement.style;
  s.setProperty("--sig", WORLDS[i].sig);
  s.setProperty("--cyan", WORLDS[i].alt);
}

export function subscribeWorld(l: (i: number) => void) {
  listeners.add(l);
  return () => void listeners.delete(l);
}

/** A cor anda até o destino aos poucos: chamar uma vez por quadro. */
export function tickWorld(dt: number) {
  const k = 1 - Math.exp(-5 * dt);
  accent.value.lerp(targetA, k);
  accent2.value.lerp(targetB, k);
}

export function setWorld(i: number, opts: { silent?: boolean } = {}) {
  index = ((i % WORLDS.length) + WORLDS.length) % WORLDS.length;
  targetA.setStyle(WORLDS[index].sig, THREE.NoColorSpace);
  targetB.setStyle(WORLDS[index].alt, THREE.NoColorSpace);
  applyCss(index);
  try {
    localStorage.setItem(KEY, WORLDS[index].id);
  } catch {
    /* navegação privada: a escolha só não fica salva */
  }
  listeners.forEach((l) => l(index));
  clearTimeout(repaintTimer);
  repaintTimer = window.setTimeout(
    () => {
      repaints.forEach(({ texture, paint }) => {
        const el = texture.image as HTMLCanvasElement;
        const c = el.getContext("2d");
        if (!c) return;
        c.clearRect(0, 0, el.width, el.height);
        paint(c, el.width, el.height);
        texture.needsUpdate = true;
      });
    },
    opts.silent ? 0 : 260,
  );
  if (!opts.silent) {
    burst(0, 0);
    sfx.world(index);
  }
}

export function setWorldById(id: string) {
  const i = WORLDS.findIndex((w) => w.id === id);
  if (i < 0) return false;
  setWorld(i);
  return true;
}

/** Restaura o mundo salvo, sem transição e sem som. */
export function initWorld() {
  let saved = "";
  try {
    saved = localStorage.getItem(KEY) ?? "";
  } catch {
    /* sem armazenamento: começa no verde */
  }
  const i = Math.max(0, WORLDS.findIndex((w) => w.id === saved));
  index = i;
  targetA.setStyle(WORLDS[i].sig, THREE.NoColorSpace);
  targetB.setStyle(WORLDS[i].alt, THREE.NoColorSpace);
  accent.value.copy(targetA);
  accent2.value.copy(targetB);
  applyCss(i);
  listeners.forEach((l) => l(i));
}
