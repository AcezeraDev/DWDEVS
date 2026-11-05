import gsap from "gsap";
import { sfx } from "./sound";

// A equipe de cursores. Cada um persegue um alvo com uma mola, então nenhum movimento
// tem início ou fim bruscos: as animações só movem o alvo, nunca o cursor em si.
// Os alvos ficam em coordenadas da página, e os cursores acompanham o conteúdo durante a rolagem.

export type Cursor = {
  el: HTMLElement;
  art: HTMLElement;
  label: HTMLElement;
  trail: HTMLElement[];
  small: boolean;
  busy: boolean;
  on: boolean;
  t: { x: number; y: number };
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  lx: number;
  ly: number;
  press: number;
  pop: number;
  lp: number;
  history: { x: number; y: number }[];
  baseLabel: string;
};

const STIFFNESS = 70;
const DAMPING = 13.5; // abaixo do amortecimento crítico (16,7): passa um pouco do ponto e assenta

export function createCrew(root: HTMLElement) {
  const fx = root;
  const cursors: Cursor[] = gsap.utils.toArray<HTMLElement>("[data-cur]", root).map((el) => {
    const trail = [...el.parentElement!.querySelectorAll<HTMLElement>(`[data-trail="${el.dataset.cur}"]`)];
    const label = el.querySelector("span")!;
    return {
      el,
      art: el.querySelector("svg") as unknown as HTMLElement,
      label,
      trail,
      small: el.classList.contains("small"),
      busy: false,
      on: false,
      t: { x: innerWidth / 2, y: innerHeight * 0.75 },
      x: innerWidth / 2,
      y: innerHeight * 0.75,
      vx: 0,
      vy: 0,
      rot: 0,
      lx: 0,
      ly: 0,
      press: 0,
      pop: 0,
      lp: 1,
      history: [],
      baseLabel: label.textContent ?? "",
    };
  });

  const tick = () => {
    const dt = Math.min(gsap.ticker.deltaRatio(60) / 60, 1 / 24);
    const now = gsap.ticker.time;
    cursors.forEach((c, i) => {
      if (!c.on && !c.busy) return;
      // Fora de serviço, o cursor nunca fica parado: flutua de leve em volta do alvo
      const idle = c.busy ? 0 : 1;
      const tx = c.t.x + Math.sin(now * 1.3 + i * 2.1) * 12 * idle;
      const ty = gsap.utils.clamp(10, innerHeight - 56, c.t.y - scrollY + Math.cos(now * 1.1 + i) * 9 * idle);
      const cx = gsap.utils.clamp(10, innerWidth - 110, tx);
      c.vx += ((cx - c.x) * STIFFNESS - c.vx * DAMPING) * dt;
      c.vy += ((ty - c.y) * STIFFNESS - c.vy * DAMPING) * dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;

      const speed = Math.hypot(c.vx, c.vy);
      // Inclina na direção do voo e estica com a velocidade
      c.rot += (gsap.utils.clamp(-34, 34, c.vx * 0.026) - c.rot) * Math.min(1, dt * 11);
      const stretch = Math.min(0.26, speed * 0.00016);
      const scale = (1 - c.press * 0.3) * (1 + c.pop * 0.4);
      // A etiqueta vem atrasada, como se fosse arrastada pelo cursor
      c.lx += (gsap.utils.clamp(-30, 30, -c.vx * 0.022) - c.lx) * Math.min(1, dt * 8);
      c.ly += (gsap.utils.clamp(-16, 16, -c.vy * 0.022) - c.ly) * Math.min(1, dt * 8);

      c.el.style.transform = `translate3d(${c.x.toFixed(2)}px,${c.y.toFixed(2)}px,0)`;
      c.art.style.transform = `rotate(${c.rot.toFixed(2)}deg) scale(${(scale * (1 + stretch)).toFixed(3)},${(scale * (1 - stretch * 0.6)).toFixed(3)})`;
      c.label.style.transform = `translate3d(${c.lx.toFixed(1)}px,${c.ly.toFixed(1)}px,0) rotate(${(c.rot * -0.25).toFixed(1)}deg) scale(${c.lp.toFixed(3)})`;

      // Rastro de pontos que aparece só em alta velocidade
      c.history.unshift({ x: c.x, y: c.y });
      if (c.history.length > c.trail.length * 3 + 1) c.history.pop();
      const glow = Math.min(1, Math.max(0, speed - 120) / 700);
      const visible = parseFloat(c.el.style.opacity || "0");
      c.trail.forEach((dot, k) => {
        const h = c.history[Math.min(c.history.length - 1, (k + 1) * 3)];
        dot.style.transform = `translate3d(${h.x.toFixed(1)}px,${h.y.toFixed(1)}px,0) scale(${(1 - k * 0.16).toFixed(2)})`;
        dot.style.opacity = (glow * visible * (0.55 - k * 0.11)).toFixed(2);
      });
    });
  };
  gsap.ticker.add(tick);

  /** Move o alvo em arco, com a curva para um lado sorteado. */
  const fly = (c: Cursor, x: number, y: number, duration = 0.62, ease = "sine.inOut") => {
    const p = { v: 0 };
    let sx = 0;
    let sy = 0;
    let mx = 0;
    let my = 0;
    return gsap.to(p, {
      v: 1,
      duration,
      ease,
      onStart: () => {
        sx = c.t.x;
        sy = c.t.y;
        const dx = x - sx;
        const dy = y - sy;
        const bend = (Math.random() > 0.5 ? 1 : -1) * (0.16 + Math.random() * 0.2);
        mx = (sx + x) / 2 - dy * bend;
        my = (sy + y) / 2 + dx * bend;
      },
      onUpdate: () => {
        const b = p.v;
        const a = 1 - b;
        c.t.x = a * a * sx + 2 * a * b * mx + b * b * x;
        c.t.y = a * a * sy + 2 * a * b * my + b * b * y;
      },
    });
  };

  const show = (c: Cursor) => {
    if (c.on) return;
    c.on = true;
    gsap.to(c.el, { autoAlpha: 1, duration: 0.25, overwrite: "auto" });
    c.pop = 1;
    gsap.to(c, { pop: 0, duration: 0.7, ease: "elastic.out(1,0.45)", overwrite: "auto" });
  };

  const hide = (c: Cursor) => {
    c.on = false;
    c.trail.forEach((d) => (d.style.opacity = "0"));
    return gsap.to(c.el, { autoAlpha: 0, duration: 0.45, ease: "sine.inOut", overwrite: "auto" });
  };

  /** Clique: o cursor afunda, volta com mola e solta um anel. */
  const click = (c: Cursor, color = c.el.style.getPropertyValue("--c")) => {
    gsap.fromTo(c, { press: 1 }, { press: 0, duration: 0.55, ease: "elastic.out(1,0.4)", overwrite: "auto" });
    sfx.tick();
    const ring = document.createElement("i");
    ring.className = "cur-ring";
    ring.style.setProperty("--c", color);
    ring.style.left = `${c.x}px`;
    ring.style.top = `${c.y}px`;
    fx.append(ring);
    gsap.fromTo(ring, { scale: 0.2, opacity: 0.9 }, { scale: 2.6, opacity: 0, duration: 0.6, ease: "power2.out", onComplete: () => ring.remove() });
  };

  /** Faíscas: "+" que saltam quando um bloco fica pronto. */
  const sparks = (c: Cursor, count = 5) => {
    for (let i = 0; i < count; i++) {
      const s = document.createElement("i");
      s.className = "cur-spark";
      s.style.setProperty("--c", c.el.style.getPropertyValue("--c"));
      s.style.left = `${c.x}px`;
      s.style.top = `${c.y}px`;
      fx.append(s);
      const a = Math.random() * Math.PI * 2;
      const d = 22 + Math.random() * 40;
      gsap.fromTo(
        s,
        { x: 0, y: 0, scale: 0.4, rotate: 0, opacity: 1 },
        { x: Math.cos(a) * d, y: Math.sin(a) * d, scale: 1, rotate: 180, opacity: 0, duration: 0.65 + Math.random() * 0.3, ease: "power2.out", onComplete: () => s.remove() },
      );
    }
  };

  /** Farelos de borracha: caem atrás do cursor enquanto ele apaga. */
  const crumbs = (c: Cursor, color: string) => {
    const s = document.createElement("i");
    s.className = "cur-crumb";
    s.style.background = color;
    s.style.left = `${c.x + 4}px`;
    s.style.top = `${c.y + 6}px`;
    fx.append(s);
    gsap.fromTo(
      s,
      { x: 0, y: 0, opacity: 0.9, rotate: Math.random() * 90 },
      { x: (Math.random() - 0.5) * 34, y: 26 + Math.random() * 40, opacity: 0, rotate: 200, duration: 0.6 + Math.random() * 0.4, ease: "power1.in", onComplete: () => s.remove() },
    );
  };

  const setLabel = (c: Cursor, text?: string) => {
    const next = text ?? c.baseLabel;
    if (c.label.textContent === next) return;
    c.label.textContent = next;
    gsap.fromTo(c, { lp: 0.7 }, { lp: 1, duration: 0.5, ease: "back.out(2.4)", overwrite: "auto" });
  };

  const destroy = () => {
    gsap.ticker.remove(tick);
    cursors.forEach((c) => gsap.killTweensOf(c));
    fx.querySelectorAll(".cur-ring,.cur-spark,.cur-crumb").forEach((n) => n.remove());
  };

  return { cursors, fly, show, hide, click, sparks, crumbs, setLabel, destroy };
}
