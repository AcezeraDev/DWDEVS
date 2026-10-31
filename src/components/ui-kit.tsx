"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { cn } from "@/lib/utils";
import { prefersReducedMotion, scrollStore } from "@/lib/scroll-store";

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
      <span>{children}</span>
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
      gsap.to(r, {
        width: big ? 92 : next === "link" ? 56 : next === "blob" ? 70 : 34,
        height: big ? 92 : next === "link" ? 56 : next === "blob" ? 70 : 34,
        backgroundColor: big ? "rgba(200,240,49,1)" : next === "blob" ? "rgba(200,240,49,0.15)" : "rgba(200,240,49,0)",
        duration: 0.35,
        ease: "power3.out",
      });
      gsap.to(d, { scale: next ? 0 : 1, duration: 0.2 });
      setLabel(next === "view" ? "Ver site" : next === "drag" ? "Arraste" : next === "blob" ? "Clique" : "");
    };

    const move = (e: MouseEvent) => {
      dx(e.clientX);
      dy(e.clientY);
      rx(e.clientX);
      ry(e.clientY);
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
        <span className="label text-[10px] font-medium text-ink">{label === "Clique" ? "" : label}</span>
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
