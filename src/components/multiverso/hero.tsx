"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import SplitType from "split-type";
import { AnimatePresence, motion } from "motion/react";
import { Magnetic, RollText } from "@/components/ui-kit";
import { canFeed, mv, reduced, warpTo } from "./store";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * Hero: the black hole sits in the middle of the screen, the headline above it and the pitch
 * below. Scrolling opens the headline like a door (top half up, bottom half down) while the scene
 * turns the disk toward us and flies through the portal. Clicking empty space throws a star at
 * the hole (see Feeder).
 */
export function Hero() {
  const root = useRef<HTMLElement>(null);
  const [fed, setFed] = useState(0);

  useEffect(() => {
    const on = () => setFed((n) => n + 1);
    window.addEventListener("mv:feed", on);
    return () => window.removeEventListener("mv:feed", on);
  }, []);

  useGSAP(
    () => {
      const split = new SplitType(".hero-line", { types: "words,chars" });
      gsap.set(".hero-line .word", { whiteSpace: "nowrap" });
      const chars = gsap.utils.toArray<HTMLElement>(".hero-line .char");
      // The intro moves the inner pieces; the scroll below only ever moves the wrappers, so the
      // two never fight over the same opacity or transform
      gsap.set(".hero-in", { opacity: 0, y: 24 });
      gsap.set(chars, { opacity: 0 });

      // Intro: letters tune in from the hole outward, each one out of a smear of light
      let intro: gsap.core.Timeline | null = null;
      const play = () => {
        const tl = (intro = gsap.timeline());
        if (reduced()) {
          tl.set(chars, { opacity: 1 }).set(".hero-in", { opacity: 1, y: 0 });
          return;
        }
        tl.fromTo(
          chars,
          { opacity: 0, scaleY: 3, scaleX: 0.4, yPercent: (i: number) => (i % 2 ? 90 : -90), filter: "blur(14px) brightness(2)" },
          { opacity: 1, scaleY: 1, scaleX: 1, yPercent: 0, filter: "blur(0px) brightness(1)", duration: 1.1, ease: "expo.out", stagger: { each: 0.03, from: "center" } }
        )
          .fromTo(root.current, { "--echo-o": 0 }, { "--echo-o": 0.75, duration: 0.6 }, 0.9)
          .to(".hero-in", { opacity: 1, y: 0, duration: 0.9, ease: "power3.out", stagger: 0.08 }, 0.5);
      };
      window.addEventListener("mv:ready", play, { once: true });
      if (mv.ready) play();

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: root.current,
            start: "top top",
            end: "+=170%",
            pin: true,
            scrub: 0.6,
            onUpdate: (self) => {
              mv.hero = self.progress;
              if (intro?.isActive()) intro.progress(1);
            },
            onLeaveBack: () => void (mv.hero = 0),
          },
        });
        // The portal opens between the two halves of the headline
        tl.fromTo(".hero-top", { yPercent: 0, opacity: 1, filter: "blur(0px)" }, { yPercent: -160, opacity: 0, filter: "blur(8px)", duration: 0.34, ease: "power2.in", immediateRender: false }, 0.04)
          .fromTo(".hero-bottom", { yPercent: 0, opacity: 1, filter: "blur(0px)" }, { yPercent: 160, opacity: 0, filter: "blur(8px)", duration: 0.34, ease: "power2.in", immediateRender: false }, 0.04)
          .fromTo(".hero-out", { opacity: 1 }, { opacity: 0, duration: 0.14, immediateRender: false }, 0)
          .to({}, { duration: 0.15 }, 0.85);
      });

      return () => {
        window.removeEventListener("mv:ready", play);
        mm.revert();
        split.revert();
      };
    },
    { scope: root }
  );

  return (
    <section
      id="top"
      data-scene="0"
      ref={root}
      className="relative flex h-svh flex-col items-center px-4 pb-5 pt-24 text-center md:px-10 md:pt-28"
      style={{ "--echo-o": 0 } as React.CSSProperties}
    >
      {/* Top half: who and what */}
      <div className="hero-top relative z-10">
        <p className="hero-in mv-label mb-4 flex items-center justify-center gap-3 text-muted">
          <span className="size-2 rounded-full bg-acc [animation:mv-blink_1.6s_steps(2)_infinite]" />
          Estúdio de sites · Mauá, SP
        </p>
        <h1 className="mv-display text-[clamp(2.2rem,9.6vw,4.6rem)] font-extrabold uppercase leading-[0.92] tracking-[-0.04em] lg:text-[clamp(3rem,6.4vw,7.6rem)]">
          <span className="block">
            <span data-text="Sites de outra" className="hero-line mv-echo">
              Sites de <span className="mv-outline">outra</span>
            </span>
          </span>
          <span className="block">
            <span data-text="dimensão." className="hero-line mv-echo text-acc">
              dimensão.
            </span>
          </span>
        </h1>
      </div>

      {/* The middle is left to the black hole */}
      <div className="hero-out relative w-full flex-1" aria-hidden>
        <p className="hero-in mv-label pointer-events-none absolute left-1/2 top-1/2 hidden w-max -translate-y-1/2 translate-x-[calc(min(22vw,330px))] text-left leading-relaxed text-muted lg:block">
          Clique no espaço
          <br />
          <span className="text-paper/60">para alimentar o buraco negro</span>
          <br />
          <span className="text-acc">{String(fed).padStart(2, "0")} estrelas engolidas</span>
        </p>
        <p className="hero-in mv-label pointer-events-none absolute right-1/2 top-1/2 hidden w-max -translate-y-1/2 -translate-x-[calc(min(22vw,330px))] text-right leading-relaxed text-muted lg:block">
          Buraco negro em tempo real
          <br />
          <span className="text-paper/60">arraste para girar o disco</span>
        </p>
      </div>

      {/* Bottom half: the pitch and the way in */}
      <div className="hero-bottom relative z-10 flex flex-col items-center">
        <p className="hero-in max-w-2xl text-base leading-relaxed text-paper/75 sm:text-lg">
          A <strong className="font-semibold text-paper">DWdevs</strong> cria o site da sua empresa do zero: design, programação e
          publicação. Você fala direto com os dois desenvolvedores, do primeiro contato até o site no ar.
        </p>
        <div className="hero-in mt-6 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          <Magnetic>
            <button
              onClick={() => warpTo("#projetos")}
              className="group flex items-center gap-3 rounded-full bg-acc py-3 pl-6 pr-3 text-[15px] font-semibold text-ink shadow-[0_18px_60px_-12px_var(--acc)] transition-colors duration-700 sm:py-3.5 sm:pl-7 sm:text-base"
            >
              <RollText>Ver projetos</RollText>
              <span className="grid size-8 place-items-center rounded-full bg-ink text-acc transition-transform duration-500 group-hover:rotate-45">↗</span>
            </button>
          </Magnetic>
          <Magnetic>
            <button
              onClick={() => warpTo("#contato")}
              className="mv-glass rounded-full px-6 py-3.5 text-[15px] font-medium text-paper transition-colors hover:text-acc sm:px-7 sm:text-base"
            >
              <RollText>Pedir orçamento</RollText>
            </button>
          </Magnetic>
        </div>

        <div className="hero-in mt-6 hidden w-[calc(100vw-80px)] max-w-[1400px] items-center justify-between gap-6 border-t border-white/10 pt-4 md:flex">
          <ul className="flex flex-wrap gap-2">
            {["Sites institucionais", "Landing pages", "Sites 3D interativos"].map((t) => (
              <li key={t} className="mv-label rounded-full border border-white/10 px-3 py-1.5 text-paper/70 transition-colors hover:border-acc hover:text-acc">
                {t}
              </li>
            ))}
          </ul>
          <span className="mv-label flex items-center gap-3 text-paper/60">
            Role para atravessar
            <span className="grid size-7 place-items-center rounded-full border border-acc/60 text-acc [animation:scroll-dot_1.6s_ease-in-out_infinite]">↓</span>
          </span>
          <dl className="flex items-center gap-6">
            {[
              ["4", "sites no ar"],
              ["2", "devs, sem repasse"],
              ["0", "templates"],
            ].map(([v, l]) => (
              <div key={l} className="flex items-baseline gap-2">
                <dt className="sr-only">{l}</dt>
                <dd className="mv-display text-xl font-bold text-paper">{v}</dd>
                <span aria-hidden className="mv-label text-muted">
                  {l}
                </span>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <PortalReadout />
    </section>
  );
}

const PHASES = [null, "Alinhando os anéis", "Abrindo o portal", "Atravessando"];
const phaseOf = (h: number) => (h > 0.93 || h < 0.12 ? 0 : h < 0.4 ? 1 : h < 0.66 ? 2 : 3);

/** While the hero is pinned: which beat of the crossing you are in, and how far through it. */
function PortalReadout() {
  const [phase, setPhase] = useState(0);
  const count = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    let shown = 0;
    const tick = () => {
      const p = phaseOf(mv.hero * (1 - Math.min(1, mv.legs[1] * 3)));
      if (p !== shown) setPhase((shown = p));
      if (count.current) count.current.textContent = String(Math.round(Math.min(1, Math.max(0, (mv.hero - 0.12) / 0.8)) * 100)).padStart(3, "0");
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);
  const label = PHASES[phase];
  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 bottom-8 z-20 flex justify-center">
      <AnimatePresence mode="popLayout" initial={false}>
        {label && (
          <motion.div
            key={phase}
            initial={{ y: 26, opacity: 0, scale: 0.9, filter: "blur(8px)" }}
            animate={{ y: 0, opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ y: -26, opacity: 0, scale: 0.95, filter: "blur(8px)" }}
            transition={{ type: "spring", stiffness: 300, damping: 30, mass: 1 }}
            className="mv-label flex items-center gap-4 rounded-full border border-white/10 bg-ink/70 px-5 py-2.5 text-paper/85 backdrop-blur-xl"
          >
            <span className="flex gap-1">
              {[1, 2, 3].map((i) => (
                <span key={i} className={"h-1 w-4 rounded-full transition-colors " + (i <= phase ? "bg-acc" : "bg-white/20")} />
              ))}
            </span>
            {label}
            <span
              ref={(el) => {
                if (el) count.current = el;
              }}
              className="mv-display text-sm font-bold tabular-nums text-acc"
            >
              000
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

type Body = { x: number; y: number; vx: number; vy: number; trail: { x: number; y: number }[]; c: string; s: number };
type Spark = { x: number; y: number; vx: number; vy: number; life: number; c: string };

const STAR_COLORS = ["--acc", "--acc-2", "--rose"];

/**
 * Feed the black hole: a click on empty space (where the hole is the main act: hero and contact)
 * throws a star from there. Gravity pulls it into a spiral that tightens until it crosses the
 * horizon; then the scene answers (flash, a gravitational wave, a little more mass) via `mv:feed`.
 */
export function Feeder() {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (reduced()) return;
    const cv = canvas.current!;
    const ctx = cv.getContext("2d")!;
    const dpr = Math.min(window.devicePixelRatio, 2);
    const bodies: Body[] = [];
    const sparks: Spark[] = [];
    let down: { x: number; y: number } | null = null;
    const colors: Record<string, string> = {};

    const resize = () => {
      cv.width = window.innerWidth * dpr;
      cv.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const readColors = () => {
      const cs = getComputedStyle(document.documentElement);
      STAR_COLORS.forEach((k) => (colors[k] = cs.getPropertyValue(k).trim() || "#c8f031"));
    };
    const busy = (t: EventTarget | null) => !!(t as HTMLElement)?.closest?.("a, button, input, textarea, [role=dialog], [data-no-feed]");

    const press = (e: PointerEvent) => void (down = busy(e.target) ? null : { x: e.clientX, y: e.clientY });
    const release = (e: PointerEvent) => {
      if (!down || !canFeed()) return;
      // A drag turns the disk instead; only a still click throws a star
      if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
      down = null;
      if (bodies.length > 14) bodies.shift();
      readColors();
      const h = mv.hole;
      const dx = e.clientX - h.x;
      const dy = e.clientY - h.y;
      const r = Math.max(Math.hypot(dx, dy), 30);
      // Thrown sideways at a bit under orbital speed, so it spirals in instead of falling straight
      const GM = 5e7;
      const v = Math.sqrt(GM / r) * (0.75 + Math.random() * 0.2);
      const dir = Math.random() < 0.5 ? 1 : -1;
      bodies.push({ x: e.clientX, y: e.clientY, vx: (-dy / r) * v * dir, vy: (dx / r) * v * dir, trail: [], c: colors[STAR_COLORS[(Math.random() * 3) | 0]], s: 2 + Math.random() * 1.5 });
      for (let i = 0; i < 10; i++) {
        const a = Math.random() * Math.PI * 2;
        sparks.push({ x: e.clientX, y: e.clientY, vx: Math.cos(a) * 90, vy: Math.sin(a) * 90, life: 0.5, c: colors["--acc"] });
      }
    };

    const tick = (_: number, ms: number) => {
      const dt = Math.min(ms / 1000, 0.033);
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      if (!bodies.length && !sparks.length) return;
      const h = mv.hole;
      const horizon = Math.max(h.r * 1.05, 14);
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      for (let i = bodies.length - 1; i >= 0; i--) {
        const b = bodies[i];
        // Several small steps per frame: the pull gets steep near the hole
        for (let k = 0; k < 4; k++) {
          const dx = h.x - b.x;
          const dy = h.y - b.y;
          const r2 = Math.max(dx * dx + dy * dy, 100);
          const r = Math.sqrt(r2);
          const a = 5e7 / r2;
          const drag = 0.55 + 300 / r;
          const s = dt / 4;
          b.vx += ((dx / r) * a - b.vx * drag * 0.25) * s;
          b.vy += ((dy / r) * a - b.vy * drag * 0.25) * s;
          b.x += b.vx * s;
          b.y += b.vy * s;
        }
        b.trail.unshift({ x: b.x, y: b.y });
        if (b.trail.length > 26) b.trail.pop();
        const r = Math.hypot(h.x - b.x, h.y - b.y);
        // Trail: thins out behind, and the head stretches as it nears the hole
        for (let t = 1; t < b.trail.length; t++) {
          const k = 1 - t / b.trail.length;
          ctx.strokeStyle = b.c;
          ctx.globalAlpha = k * 0.8;
          ctx.lineWidth = k * b.s * 2;
          ctx.beginPath();
          ctx.moveTo(b.trail[t - 1].x, b.trail[t - 1].y);
          ctx.lineTo(b.trail[t].x, b.trail[t].y);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#fffbe8";
        ctx.shadowColor = b.c;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.s, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        if (r < horizon) {
          bodies.splice(i, 1);
          window.dispatchEvent(new Event("mv:feed"));
        } else if (b.trail.length > 25 && r > Math.hypot(window.innerWidth, window.innerHeight) * 1.5) bodies.splice(i, 1);
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i];
        p.life -= dt;
        if (p.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        ctx.globalAlpha = p.life * 2;
        ctx.fillStyle = p.c;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointerdown", press);
    window.addEventListener("pointerup", release);
    gsap.ticker.add(tick);
    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointerdown", press);
      window.removeEventListener("pointerup", release);
      gsap.ticker.remove(tick);
    };
  }, []);

  return <canvas ref={canvas} aria-hidden className="pointer-events-none fixed inset-0 z-[5] h-full w-full" />;
}
