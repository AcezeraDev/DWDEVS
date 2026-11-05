import gsap from "gsap";
import { sfx } from "./sound";

export const SKIP_INTRO = "dw-skip-intro";
export const CASE_HERO_VH = 1;

/** Ao voltar de um projeto, ninguém precisa rever a abertura. */
export function markSkipIntro() {
  try {
    sessionStorage.setItem(SKIP_INTRO, "1");
  } catch {
    /* sem armazenamento: a abertura só toca de novo */
  }
}

export function consumeSkipIntro() {
  try {
    const v = sessionStorage.getItem(SKIP_INTRO);
    sessionStorage.removeItem(SKIP_INTRO);
    return v === "1";
  } catch {
    return false;
  }
}

type Box = { left: number; top: number; width: number; height: number };

/** A imagem clicada cresce até virar o topo da página do projeto, e a troca de rota acontece por baixo. */
export function flyToCase(src: string, from: Box, navigate: () => void) {
  markSkipIntro();
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    navigate();
    return;
  }
  sfx.whoosh();
  const veil = document.createElement("div");
  veil.setAttribute("data-fly", "");
  veil.className = "fly-veil";
  const img = document.createElement("img");
  img.src = src;
  img.alt = "";
  img.className = "fly-img";
  Object.assign(img.style, { left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px` });
  veil.append(img);
  document.body.append(veil);
  gsap.fromTo(veil, { backgroundColor: "rgba(6,9,7,0)" }, { backgroundColor: "rgba(6,9,7,1)", duration: 0.55, ease: "power2.out" });
  gsap.to(img, {
    left: 0,
    top: 0,
    width: innerWidth,
    height: innerHeight * CASE_HERO_VH,
    duration: 0.85,
    ease: "expo.inOut",
    onComplete: navigate,
  });
}

/** A página do projeto chamou: já pode tirar a imagem voadora. */
export function landCase() {
  document.querySelectorAll<HTMLElement>("[data-fly]").forEach((veil) => {
    gsap.to(veil, { opacity: 0, duration: 0.5, delay: 0.1, ease: "sine.out", onComplete: () => veil.remove() });
  });
}
