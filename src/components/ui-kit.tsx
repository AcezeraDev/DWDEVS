"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { cn } from "@/lib/utils";
import { DIVE_POINT, cinematicTo, prefersReducedMotion, scrollStore, scrollToTarget } from "@/lib/scroll-store";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("font-display text-xl font-extrabold tracking-tight", className)}>
      <span className="text-lime">DW</span>
      <span className="font-semibold text-paper">devs</span>
    </span>
  );
}

export function SectionLabel({ index, children }: { index: string; children: React.ReactNode }) {
  return (
    <div className="label flex items-center gap-3 text-muted">
      <span className="text-lime">({index})</span>
      <span className="h-px w-10 bg-white/20" />
      <span className="scramble">{children}</span>
    </div>
  );
}

/** Pulls its child toward the cursor and springs back on leave. */
export function Magnetic({
  children,
  strength = 0.35,
  className,
}: {
  children: React.ReactNode;
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion() || !window.matchMedia("(pointer: fine)").matches) return;
    const xTo = gsap.quickTo(el, "x", { duration: 0.6, ease: "power3.out" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.6, ease: "power3.out" });
    const move = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * strength);
      yTo((e.clientY - (r.top + r.height / 2)) * strength);
    };
    const leave = () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: "elastic.out(1, 0.4)" });
    };
    el.addEventListener("mousemove", move);
    el.addEventListener("mouseleave", leave);
    return () => {
      el.removeEventListener("mousemove", move);
      el.removeEventListener("mouseleave", leave);
    };
  }, [strength]);

  return (
    <div ref={ref} className={cn("inline-block", className)}>
      {children}
    </div>
  );
}

export function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    document.documentElement.classList.add("has-cursor");
    const d = dot.current!;
    const r = ring.current!;
    gsap.set([d, r], { xPercent: -50, yPercent: -50, opacity: 1 });
    const dx = gsap.quickTo(d, "x", { duration: 0.08 });
    const dy = gsap.quickTo(d, "y", { duration: 0.08 });
    const rx = gsap.quickTo(r, "x", { duration: 0.45, ease: "power3.out" });
    const ry = gsap.quickTo(r, "y", { duration: 0.45, ease: "power3.out" });

    let mode = "";
    const setMode = (next: string) => {
      if (next === mode) return;
      mode = next;
      const big = next === "view" || next === "drag";
      const ring = next === "hole" ? 86 : big ? 92 : next === "link" ? 56 : next === "blob" ? 70 : 34;
      gsap.to(r, {
        width: ring,
        height: ring,
        backgroundColor: big ? "rgba(200,240,49,1)" : next === "blob" || next === "hole" ? "rgba(200,240,49,0.1)" : "rgba(200,240,49,0)",
        duration: 0.35,
        ease: "power3.out",
      });
      gsap.to(d, { scale: next ? 0 : 1, duration: 0.2 });
      setLabel(next === "view" ? "Ver site" : next === "drag" ? "Arraste" : next === "hole" ? "Segure" : "");
    };

    const move = (e: MouseEvent) => {
      dx(e.clientX);
      dy(e.clientY);
      // The ring is pulled toward the black hole when it gets close, like light bending around it
      const h = scrollStore.fx.hole;
      const gx = h.x - e.clientX;
      const gy = h.y - e.clientY;
      const reach = Math.max(h.r * 3.2, 90);
      const k = h.r > 0 ? Math.pow(Math.max(0, 1 - Math.hypot(gx, gy) / reach), 2) * 0.45 : 0;
      rx(e.clientX + gx * k);
      ry(e.clientY + gy * k);
      const t = (e.target as HTMLElement)?.closest?.("[data-cursor], a, button") as HTMLElement | null;
      const fromScene = document.documentElement.dataset.cursor;
      if (t?.dataset.cursor) setMode(t.dataset.cursor);
      else if (t) setMode("link");
      else setMode(fromScene ?? "");
    };
    window.addEventListener("mousemove", move);
    return () => {
      window.removeEventListener("mousemove", move);
      document.documentElement.classList.remove("has-cursor");
    };
  }, []);

  return (
    <>
      <div
        ref={dot}
        className="pointer-events-none fixed left-0 top-0 z-[70] size-2 rounded-full bg-lime opacity-0"
      />
      <div
        ref={ring}
        className="pointer-events-none fixed left-0 top-0 z-[70] flex size-[34px] items-center justify-center rounded-full border border-lime/70 opacity-0"
      >
        <span className={"label text-[10px] font-medium " + (label === "Segure" ? "text-lime" : "text-ink")}>{label}</span>
      </div>
    </>
  );
}

export function Preloader() {
  const root = useRef<HTMLDivElement>(null);
  const count = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const finish = () => {
      scrollStore.ready = true;
      scrollStore.lenis?.start();
      window.dispatchEvent(new Event("dw:ready"));
      setDone(true);
    };
    if (prefersReducedMotion()) {
      scrollStore.intro = 0;
      finish();
      return;
    }
    const obj = { v: 0 };
    const tl = gsap.timeline();
    tl.to(obj, {
      v: 100,
      duration: 1.6,
      ease: "power2.inOut",
      onUpdate: () => {
        if (count.current) count.current.textContent = String(Math.round(obj.v)).padStart(3, "0");
        if (bar.current) bar.current.style.transform = `scaleX(${obj.v / 100})`;
      },
    })
      .to(".pre-word", { yPercent: -110, duration: 0.6, ease: "power3.in", stagger: 0.05 }, "+=0.1")
      .to(root.current, { clipPath: "inset(0 0 100% 0)", duration: 0.9, ease: "expo.inOut" }, "-=0.2")
      .call(finish)
      // Camera dolly-in + cubes assembling start as the curtain lifts
      .to(scrollStore, { intro: 0, duration: 2.8, ease: "expo.out" }, "-=0.7");
    return () => {
      tl.kill();
    };
  }, []);

  if (done) return null;

  return (
    <div
      ref={root}
      className="fixed inset-0 z-[80] flex flex-col justify-between bg-ink p-6 md:p-10"
      style={{ clipPath: "inset(0 0 0% 0)" }}
    >
      <div className="flex items-center justify-between overflow-hidden">
        <span className="pre-word inline-block">
          <Logo />
        </span>
        <span className="pre-word label inline-block text-muted">Mauá · SP</span>
      </div>
      <div className="overflow-hidden">
        <div className="pre-word flex items-end justify-between gap-6">
          <p className="max-w-xs font-display text-2xl font-semibold leading-tight text-paper md:text-3xl">
            Criamos sites rápidos, bonitos e <span className="text-lime">feitos sob medida.</span>
          </p>
          <span ref={count} className="font-display text-7xl font-extrabold tabular-nums text-lime md:text-[10rem] md:leading-none">
            000
          </span>
        </div>
        <div className="mt-6 h-px w-full bg-white/10">
          <div ref={bar} className="h-px origin-left scale-x-0 bg-lime" />
        </div>
      </div>
    </div>
  );
}

/** Label that rolls up to a duplicate of itself when its link/button is hovered. */
export function RollText({ children }: { children: string }) {
  return (
    <span className="roll">
      <span data-text={children}>{children}</span>
    </span>
  );
}

/**
 * Global pointer effects, delegated from the document:
 * - `.spot` elements get --mx/--my for a spotlight + glowing border that follows the cursor
 * - `[data-tilt]` elements tilt in 3D toward the cursor (value = max degrees)
 */
export function Interactions() {
  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches || prefersReducedMotion()) return;
    let tiltEl: HTMLElement | null = null;

    const reset = (el: HTMLElement) =>
      gsap.to(el, { rotationX: 0, rotationY: 0, duration: 1, ease: "elastic.out(1, 0.5)" });

    const move = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      const spot = target?.closest?.(".spot") as HTMLElement | null;
      if (spot) {
        const r = spot.getBoundingClientRect();
        spot.style.setProperty("--mx", `${e.clientX - r.left}px`);
        spot.style.setProperty("--my", `${e.clientY - r.top}px`);
      }
      const tilt = target?.closest?.("[data-tilt]") as HTMLElement | null;
      if (tiltEl && tiltEl !== tilt) reset(tiltEl);
      tiltEl = tilt;
      if (tilt) {
        const max = Number(tilt.dataset.tilt) || 6;
        const r = tilt.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        gsap.to(tilt, {
          rotationY: px * max * 2,
          rotationX: -py * max * 2,
          transformPerspective: 1100,
          duration: 0.6,
          ease: "power3.out",
        });
      }
    };
    document.addEventListener("pointermove", move);
    return () => document.removeEventListener("pointermove", move);
  }, []);
  return null;
}

/** Full-screen two-layer wipe used when jumping between sections from the nav. */
export function Curtain() {
  const lime = useRef<HTMLDivElement>(null);
  const ink = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLSpanElement>(null);
  const busy = useRef(false);

  useEffect(() => {
    const go = (e: Event) => {
      const { target, label } = (e as CustomEvent<{ target: string; label: string }>).detail;
      if (busy.current) return;
      busy.current = true;
      if (text.current) text.current.textContent = label;
      gsap
        .timeline({ onComplete: () => void (busy.current = false) })
        .set([lime.current, ink.current], { clipPath: "inset(100% 0 0 0)", display: "flex" })
        .set(text.current, { yPercent: 120 })
        .to(lime.current, { clipPath: "inset(0% 0 0 0)", duration: 0.55, ease: "expo.in" })
        .to(ink.current, { clipPath: "inset(0% 0 0 0)", duration: 0.6, ease: "expo.inOut" }, "-=0.25")
        .to(text.current, { yPercent: 0, duration: 0.6, ease: "expo.out" }, "-=0.2")
        .call(() => {
          scrollStore.lenis?.scrollTo(target, { immediate: true, force: true });
        })
        .to(text.current, { yPercent: -120, duration: 0.45, ease: "expo.in" }, "+=0.15")
        .to(ink.current, { clipPath: "inset(0 0 100% 0)", duration: 0.75, ease: "expo.inOut" })
        .to(lime.current, { clipPath: "inset(0 0 100% 0)", duration: 0.75, ease: "expo.inOut" }, "-=0.62")
        .set([lime.current, ink.current], { display: "none" });
    };
    window.addEventListener("dw:goto", go);
    return () => window.removeEventListener("dw:goto", go);
  }, []);

  return (
    <>
      <div ref={lime} className="pointer-events-none fixed inset-0 z-[75] hidden bg-lime" />
      <div ref={ink} className="pointer-events-none fixed inset-0 z-[76] hidden items-center justify-center bg-ink">
        <span className="overflow-hidden">
          <span
            ref={text}
            className="block font-display text-[clamp(3rem,12vw,12rem)] font-extrabold uppercase leading-none tracking-[-0.04em] text-lime"
          />
        </span>
      </div>
    </>
  );
}

const CHAPTERS = [
  { id: "#top", label: "Início" },
  { id: "#sobre", label: "Sobre" },
  { id: "#servicos", label: "Serviços" },
  { id: "#projetos", label: "Projetos" },
  { id: "#contato", label: "Contato" },
];

/**
 * Thin rail on the right edge (wide screens only): how far down the page you are, which chapter
 * of the journey is on screen, and a jump to any of them.
 */
export function ChapterRail() {
  const fill = useRef<HTMLSpanElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const onChapter = (e: Event) => setActive((e as CustomEvent<number>).detail);
    const tick = () => {
      if (fill.current) fill.current.style.transform = `scaleY(${scrollStore.progress})`;
    };
    window.addEventListener("dw:chapter", onChapter);
    gsap.ticker.add(tick);
    return () => {
      window.removeEventListener("dw:chapter", onChapter);
      gsap.ticker.remove(tick);
    };
  }, []);

  return (
    <nav
      aria-label="Capítulos da página"
      className="fixed right-4 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-center gap-5 xl:flex"
    >
      <span className="label text-[10px] tabular-nums text-lime">0{active + 1}</span>
      <div className="relative flex flex-col items-center gap-7 py-1">
        <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/10" />
        <span ref={fill} className="absolute inset-y-0 left-1/2 w-px origin-top -translate-x-1/2 scale-y-0 bg-lime/70" />
        {CHAPTERS.map((c, i) => (
          <a
            key={c.id}
            href={c.id}
            aria-label={c.label}
            aria-current={i === active ? "step" : undefined}
            onClick={(e) => {
              e.preventDefault();
              if (i === 0) scrollToTarget(0);
              else cinematicTo(c.id, c.label);
            }}
            className="group relative grid size-3 place-items-center"
          >
            <span
              className={
                "block rounded-full transition-all duration-500 " +
                (i === active ? "size-3 bg-lime shadow-[0_0_14px_rgba(200,240,49,0.8)]" : "size-1.5 bg-white/35 group-hover:bg-paper")
              }
            />
            <span
              className={
                "label pointer-events-none absolute right-6 whitespace-nowrap rounded-full bg-ink/80 px-2.5 py-1 text-[10px] backdrop-blur transition-all duration-500 " +
                "translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 " + (i === active ? "text-lime" : "text-paper")
              }
            >
              {c.label}
            </span>
          </a>
        ))}
      </div>
    </nav>
  );
}

/**
 * Screen-space layer between the 3D scene and the page: the edges close in while you fall into
 * the black hole (and a little on fast scrolls), a shock ring and a white-lime flash mark the
 * crossing of the horizon, and a readout counts the fall.
 */
export function HorizonFx() {
  const vignette = useRef<HTMLDivElement>(null);
  const flash = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const hud = useRef<HTMLDivElement>(null);
  const count = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const bump = (x: number, a: number, b: number) => Math.max(0, Math.min((x - a) / (b - a), 1));
    const tick = () => {
      const dive = scrollStore.dive * (1 - scrollStore.legs[1]);
      const { crossing, speed } = scrollStore.fx;
      if (vignette.current) vignette.current.style.opacity = String(Math.min(1, dive * 0.95 + speed * 0.45));
      if (flash.current) flash.current.style.opacity = String(crossing * 0.75);
      if (ring.current) {
        const t = bump(dive, 0.84, 1);
        ring.current.style.opacity = String(Math.sin(t * Math.PI) * 0.9);
        ring.current.style.transform = `translate(-50%, -50%) scale(${0.15 + t * t * 4})`;
      }
      if (hud.current) {
        hud.current.style.opacity = String(Math.min(bump(dive, 0.3, 0.42), 1 - bump(dive, 0.9, 0.98)));
        if (count.current) count.current.textContent = String(Math.round(dive * 100)).padStart(3, "0");
      }
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);

  const cx = `${(DIVE_POINT.x * 0.5 + 0.5) * 100}%`;
  const cy = `${(0.5 - DIVE_POINT.y * 0.5) * 100}%`;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[5] overflow-hidden">
      <div
        ref={vignette}
        className="absolute inset-0 opacity-0"
        style={{ background: `radial-gradient(ellipse 70% 65% at ${cx} ${cy}, transparent 35%, rgba(3,4,5,0.92) 100%)` }}
      />
      <div
        ref={flash}
        className="absolute inset-0 opacity-0 mix-blend-screen"
        style={{ background: `radial-gradient(circle at ${cx} ${cy}, #f6ffd8 0%, rgba(200,240,49,0.85) 18%, rgba(200,240,49,0.15) 55%, transparent 75%)` }}
      />
      <div
        ref={ring}
        className="absolute size-[60vmax] rounded-full border-2 border-lime opacity-0 shadow-[0_0_80px_rgba(200,240,49,0.6),inset_0_0_80px_rgba(200,240,49,0.4)]"
        style={{ left: cx, top: cy }}
      />
      <div ref={hud} className="label absolute bottom-10 left-1/2 flex -translate-x-1/2 items-center gap-4 whitespace-nowrap text-paper/70 opacity-0">
        <span className="hidden h-px w-10 bg-lime/60 sm:block" />
        <span className="sm:hidden">Horizonte de eventos</span>
        <span className="hidden sm:inline">Atravessando o horizonte de eventos</span>
        <span ref={count} className="font-display text-base font-bold tabular-nums text-lime">000</span>
        <span className="hidden h-px w-10 bg-lime/60 sm:block" />
      </div>
    </div>
  );
}

type Dust = { x: number; y: number; vx: number; vy: number; life: number; max: number; r: number; c: string };
type Rift = { x: number; y: number; t: number };
const DUST_COLORS = ["200,240,49", "31,209,186", "245,242,230"];

/**
 * Stardust: the cursor sheds glowing motes that drift and fade, and every click opens a small
 * portal (a ring that blooms and collapses, throwing sparks). Desktop mouse only.
 */
export function Stardust() {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (prefersReducedMotion() || !window.matchMedia("(pointer: fine)").matches) return;
    const cv = canvas.current!;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio, 2);
    const dust: Dust[] = [];
    const rifts: Rift[] = [];
    let last = { x: -1, y: -1 };

    const resize = () => {
      cv.width = window.innerWidth * dpr;
      cv.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const spawn = (x: number, y: number, speed: number, n: number, life = 0.9) => {
      for (let i = 0; i < n && dust.length < 220; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = Math.random() * speed;
        dust.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 6, life, max: life, r: 0.6 + Math.random() * 1.6, c: DUST_COLORS[(Math.random() * 3) | 0] });
      }
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const moved = last.x < 0 ? 0 : Math.hypot(e.clientX - last.x, e.clientY - last.y);
      last = { x: e.clientX, y: e.clientY };
      spawn(e.clientX, e.clientY, 18, Math.min(3, 1 + (moved / 18) | 0));
    };
    const click = (e: MouseEvent) => {
      rifts.push({ x: e.clientX, y: e.clientY, t: 0 });
      spawn(e.clientX, e.clientY, 160, 26, 0.8);
    };
    const tick = (_: number, deltaMs: number) => {
      const dt = Math.min(deltaMs / 1000, 0.05);
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      ctx.globalCompositeOperation = "lighter";
      for (let i = dust.length - 1; i >= 0; i--) {
        const d = dust[i];
        d.life -= dt;
        if (d.life <= 0) {
          dust.splice(i, 1);
          continue;
        }
        d.vx *= 0.96;
        d.vy *= 0.96;
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        const k = d.life / d.max;
        ctx.fillStyle = `rgba(${d.c},${k * 0.85})`;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r * (0.5 + k), 0, Math.PI * 2);
        ctx.fill();
      }
      for (let i = rifts.length - 1; i >= 0; i--) {
        const r = rifts[i];
        r.t += dt / 0.7;
        if (r.t >= 1) {
          rifts.splice(i, 1);
          continue;
        }
        // Opens fast, then collapses back into a point
        const open = Math.sin(Math.PI * Math.min(r.t * 1.4, 1));
        const radius = 8 + 46 * Math.sqrt(r.t);
        const g = ctx.createRadialGradient(r.x, r.y, radius * 0.2, r.x, r.y, radius);
        g.addColorStop(0, "rgba(7,8,10,0)");
        g.addColorStop(0.75, `rgba(31,209,186,${0.25 * open})`);
        g.addColorStop(0.92, `rgba(200,240,49,${0.9 * open})`);
        g.addColorStop(1, "rgba(200,240,49,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(r.x, r.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", move);
    window.addEventListener("click", click);
    gsap.ticker.add(tick);
    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("click", click);
      gsap.ticker.remove(tick);
    };
  }, []);

  return <canvas ref={canvas} aria-hidden className="pointer-events-none fixed inset-0 z-[66] h-full w-full" />;
}
