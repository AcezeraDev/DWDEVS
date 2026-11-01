"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { RollText } from "@/components/ui-kit";
import { DIMENSIONS, NAV } from "./data";
import { SCENES, applyDimension, mv, reduced, scrollToTarget, warpTo } from "./store";

export function MvLogo({ className }: { className?: string }) {
  return (
    <span className={cn("mv-display text-lg font-bold tracking-tight", className)}>
      <span className="text-acc transition-colors duration-700">DW</span>
      <span className="font-medium text-paper">devs</span>
    </span>
  );
}

export function Label({ index, children, className }: { index: string; children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("mv-label flex items-center gap-3 text-muted", className)}>
      <span className="text-acc">{index}</span>
      <span className="h-px w-8 bg-white/20" />
      <span>{children}</span>
    </p>
  );
}

const finishIntro = () => {
  mv.ready = true;
  mv.lenis?.start();
  window.dispatchEvent(new Event("mv:ready"));
};

/**
 * Preloader: a ring charges while the coordinates of the destination lock in, then an iris opens
 * from the middle of the screen and the black hole forms out of a point behind it.
 */
export function Iris() {
  const root = useRef<HTMLDivElement>(null);
  const arc = useRef<SVGCircleElement>(null);
  const edge = useRef<HTMLDivElement>(null);
  const count = useRef<HTMLSpanElement>(null);
  const coords = useRef<HTMLSpanElement>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (reduced()) {
      mv.intro = 0;
      finishIntro();
      const id = requestAnimationFrame(() => setDone(true));
      return () => cancelAnimationFrame(id);
    }
    const target = "RA 14h 29m 43s · DEC −62° 40′ 46″";
    const glyphs = "0123456789°′″hms·+−";
    const p = { v: 0 };
    const iris = { r: 0 };
    const tl = gsap.timeline();
    tl.to(p, {
      v: 1,
      duration: 1.7,
      ease: "power2.inOut",
      onUpdate: () => {
        if (count.current) count.current.textContent = String(Math.round(p.v * 100)).padStart(3, "0");
        if (arc.current) arc.current.style.strokeDashoffset = String(1 - p.v);
        if (coords.current) {
          const shown = Math.floor(p.v * target.length);
          coords.current.textContent =
            target.slice(0, shown) + target.slice(shown).replace(/[^\s]/g, () => glyphs[(Math.random() * glyphs.length) | 0]);
        }
      },
    })
      .to(".iris-word", { yPercent: -120, opacity: 0, duration: 0.5, ease: "power3.in", stagger: 0.04 }, "+=0.15")
      .to(
        iris,
        {
          r: 1,
          duration: 1.3,
          ease: "expo.inOut",
          onUpdate: () => {
            root.current?.style.setProperty("--r", `${iris.r * 150}vmax`);
            if (edge.current) edge.current.style.transform = `translate(-50%, -50%) scale(${iris.r * 3})`;
          },
        },
        "-=0.15"
      )
      .call(finishIntro, [], "-=0.7")
      .to(mv, { intro: 0, duration: 2.6, ease: "expo.out" }, "-=1.1")
      .call(() => setDone(true), [], "-=1.6");
    return () => void tl.kill();
  }, []);

  if (done) return null;

  return (
    <div
      ref={root}
      className="fixed inset-0 z-[80] bg-ink"
      style={
        {
          "--r": "0vmax",
          maskImage: "radial-gradient(circle at 50% 50%, transparent var(--r), #000 calc(var(--r) + 1px))",
          WebkitMaskImage: "radial-gradient(circle at 50% 50%, transparent var(--r), #000 calc(var(--r) + 1px))",
        } as React.CSSProperties
      }
    >
      <div
        ref={edge}
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 size-[100vmax] rounded-full border-2 border-acc shadow-[0_0_60px_var(--acc),inset_0_0_60px_var(--acc)]"
        style={{ transform: "translate(-50%, -50%) scale(0)" }}
      />
      <div className="flex h-full flex-col justify-between p-6 md:p-10">
        <div className="flex items-center justify-between overflow-hidden">
          <span className="iris-word inline-block">
            <MvLogo />
          </span>
          <span className="iris-word mv-label inline-block text-muted">Mauá · SP</span>
        </div>
        <div className="flex flex-col items-center gap-6 overflow-hidden text-center">
          <svg viewBox="0 0 120 120" className="iris-word size-28 -rotate-90 md:size-36" aria-hidden>
            <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
            <circle ref={arc} cx="60" cy="60" r="54" fill="none" stroke="var(--acc)" strokeWidth="1.5" pathLength={1} strokeDasharray="1" strokeDashoffset="1" />
            <circle cx="60" cy="60" r="3" fill="var(--acc)" />
          </svg>
          <p className="iris-word mv-label text-paper/80">Abrindo um portal para a DWdevs</p>
          <span ref={coords} className="iris-word mv-label text-[10px] text-muted" />
        </div>
        <div className="flex items-end justify-between gap-6 overflow-hidden">
          <p className="iris-word max-w-xs text-xl font-medium leading-snug text-paper md:text-2xl">
            Criamos sites rápidos, bonitos e <span className="text-acc">feitos sob medida.</span>
          </p>
          <span ref={count} className="iris-word mv-display text-6xl font-bold tabular-nums text-acc md:text-8xl">
            000
          </span>
        </div>
      </div>
    </div>
  );
}

/** Four dots, one per dimension. Picking one sends a membrane across the screen (DimensionJump). */
function DimensionSwitch() {
  const [dim, setDim] = useState(0);
  useEffect(() => {
    const on = (e: Event) => setDim((e as CustomEvent<number>).detail);
    window.addEventListener("mv:dim-set", on);
    return () => window.removeEventListener("mv:dim-set", on);
  }, []);
  return (
    <div className="flex items-center gap-2 rounded-full border border-white/10 px-2.5 py-1.5" role="group" aria-label="Trocar a dimensão (cor do site)">
      <span className="mv-label hidden text-[10px] text-muted lg:inline">{DIMENSIONS[dim].id}</span>
      {DIMENSIONS.map((d, i) => (
        <button
          key={d.id}
          aria-label={`Dimensão ${d.name}`}
          aria-pressed={i === dim}
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            window.dispatchEvent(new CustomEvent("mv:dim", { detail: { i, x: r.left + r.width / 2, y: r.top + r.height / 2 } }));
          }}
          className="grid size-5 place-items-center rounded-full"
        >
          <span
            className={"block rounded-full transition-all duration-500 " + (i === dim ? "size-3.5 ring-2 ring-white/30 ring-offset-2 ring-offset-ink" : "size-2 hover:size-3")}
            style={{ background: d.acc }}
          />
        </button>
      ))}
    </div>
  );
}

export function MvNav() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const show = () => gsap.to(ref.current, { y: 0, opacity: 1, duration: 1, ease: "expo.out", delay: 0.3 });
    window.addEventListener("mv:ready", show, { once: true });
    if (mv.ready) show();
    return () => window.removeEventListener("mv:ready", show);
  }, []);

  return (
    <header ref={ref} className="fixed inset-x-0 top-4 z-50 mx-auto w-[calc(100%-32px)] max-w-6xl opacity-0" style={{ transform: "translateY(-6rem)" }}>
      <nav className="mv-glass flex items-center justify-between gap-3 rounded-full py-2 pl-5 pr-2">
        <a href="#top" onClick={(e) => (e.preventDefault(), scrollToTarget(0, 2))} aria-label="DWdevs, voltar ao topo">
          <MvLogo />
        </a>
        <ul className="hidden items-center lg:flex">
          {NAV.map((n) => (
            <li key={n.id}>
              <a
                href={n.id}
                onClick={(e) => (e.preventDefault(), warpTo(n.id))}
                className="block rounded-full px-3.5 py-2 text-sm text-paper/70 transition-colors hover:bg-white/5 hover:text-acc"
              >
                <RollText>{n.label}</RollText>
              </a>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2">
          <DimensionSwitch />
          <a
            href="#contato"
            onClick={(e) => (e.preventDefault(), warpTo("#contato"))}
            className="hidden rounded-full bg-acc px-5 py-2.5 text-sm font-semibold text-ink transition-[transform,background-color] duration-500 hover:scale-[1.04] sm:block"
          >
            <RollText>Fale com a gente</RollText>
          </a>
        </div>
      </nav>
    </header>
  );
}

/**
 * Changing dimension: a glowing membrane grows out of the dot that was picked; as it covers the
 * screen the accent swaps everywhere (page and 3D), then it thins out. Double-clicking empty
 * space jumps to the next dimension from the click.
 */
export function DimensionJump() {
  const film = useRef<HTMLDivElement>(null);
  const busy = useRef(false);

  useEffect(() => {
    const jump = (i: number, x: number, y: number) => {
      if (busy.current || i === mv.dim) return;
      const el = film.current;
      if (!el || reduced()) {
        applyDimension(i);
        window.dispatchEvent(new CustomEvent("mv:dim-set", { detail: i }));
        return;
      }
      busy.current = true;
      const reach = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
      el.style.borderColor = DIMENSIONS[i].acc;
      el.style.boxShadow = `0 0 80px ${DIMENSIONS[i].acc}, inset 0 0 120px ${DIMENSIONS[i].acc}66`;
      gsap
        .timeline({ onComplete: () => void (busy.current = false) })
        .set(el, { display: "block", left: x, top: y, width: reach * 2, height: reach * 2, xPercent: -50, yPercent: -50, scale: 0, opacity: 1 })
        .to(el, { scale: 1, duration: 0.7, ease: "power3.in" })
        .call(() => {
          applyDimension(i);
          window.dispatchEvent(new CustomEvent("mv:dim-set", { detail: i }));
        })
        .to(el, { scale: 1.25, opacity: 0, duration: 0.6, ease: "power2.out" })
        .set(el, { display: "none" });
    };
    const onDim = (e: Event) => {
      const { i, x, y } = (e as CustomEvent<{ i: number; x: number; y: number }>).detail;
      jump(i, x, y);
    };
    const onDbl = (e: MouseEvent) => {
      if ((e.target as HTMLElement)?.closest?.("a, button, input, textarea, p, h1, h2, h3, li")) return;
      jump((mv.dim + 1) % DIMENSIONS.length, e.clientX, e.clientY);
    };
    window.addEventListener("mv:dim", onDim);
    window.addEventListener("dblclick", onDbl);
    return () => {
      window.removeEventListener("mv:dim", onDim);
      window.removeEventListener("dblclick", onDbl);
    };
  }, []);

  return <div ref={film} aria-hidden className="pointer-events-none fixed z-[74] hidden rounded-full border-2 bg-ink/30" />;
}

/**
 * Nav jumps go through hyperspace: the stars stretch into lines (scene), the destination's name
 * flashes in the middle, and the page flies there.
 */
export function WarpLabel() {
  const [label, setLabel] = useState<string | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    const go = (e: Event) => {
      const target = (e as CustomEvent<string>).detail;
      if (busy.current || !mv.lenis) return;
      busy.current = true;
      setLabel(NAV.find((n) => n.id === target)?.label ?? "");
      const tl = gsap.timeline({
        onComplete: () => {
          busy.current = false;
          setLabel(null);
        },
      });
      tl.to(mv, { warp: 1, duration: 0.45, ease: "power2.in" })
        .call(() => mv.lenis?.scrollTo(target, { duration: 1.25, easing: (t) => 1 - Math.pow(1 - t, 3) }), [], 0.2)
        .call(() => setLabel(null), [], 1.25)
        .to(mv, { warp: 0, duration: 0.9, ease: "power2.out" }, 1.2);
    };
    window.addEventListener("mv:warp", go);
    return () => window.removeEventListener("mv:warp", go);
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[72] grid place-items-center">
      <AnimatePresence>
        {label && (
          <motion.span
            key={label}
            initial={{ opacity: 0, scale: 0.6, filter: "blur(16px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 1.6, filter: "blur(18px)" }}
            transition={{ type: "spring", stiffness: 300, damping: 30, mass: 1 }}
            className="mv-display text-[clamp(2.6rem,10vw,9rem)] font-extrabold uppercase tracking-tight text-acc"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Readout in the corner: which dimension and scene you are in, and the time dilation of the
 * disk (it speeds up with the scroll).
 */
export function Hud() {
  const scene = useRef<HTMLSpanElement>(null);
  const dil = useRef<HTMLSpanElement>(null);
  const dim = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let shown = -1;
    let shownDim = -1;
    const tick = () => {
      const s = Math.min(Math.round(mv.legs.reduce((a, b) => a + b, 0) - mv.legs[0]), SCENES.length - 1);
      if (s !== shown && scene.current) {
        shown = s;
        scene.current.textContent = `${String(s + 1).padStart(2, "0")}/${String(SCENES.length).padStart(2, "0")} · ${SCENES[s]}`;
      }
      if (mv.dim !== shownDim && dim.current) {
        shownDim = mv.dim;
        dim.current.textContent = `${DIMENSIONS[mv.dim].id} · ${DIMENSIONS[mv.dim].name}`;
      }
      if (dil.current) dil.current.textContent = `×${mv.dilation.toFixed(2)}`;
      if (bar.current) bar.current.style.transform = `scaleY(${mv.progress})`;
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);

  return (
    <>
      {/* One line up the left edge, inside the page gutter, so it never sits on copy */}
      <div
        aria-hidden
        className="mv-label pointer-events-none fixed left-[18px] top-1/2 z-40 hidden origin-center whitespace-nowrap text-[10px] text-muted xl:flex"
        style={{ transform: "translate(-50%, -50%) rotate(-90deg)" }}
      >
        <span className="flex gap-6">
          <span>
            <span className="text-paper/40">Dimensão </span>
            <span ref={dim} className="text-acc" />
          </span>
          <span>
            <span className="text-paper/40">Cena </span>
            <span ref={scene} className="text-paper/80" />
          </span>
          <span>
            <span className="text-paper/40">Dilatação </span>
            <span ref={dil} className="tabular-nums text-paper/80" />
          </span>
        </span>
      </div>
      <div aria-hidden className="pointer-events-none fixed right-5 top-1/2 z-40 hidden h-40 w-px -translate-y-1/2 bg-white/10 xl:block">
        <span ref={bar} className="absolute inset-0 origin-top scale-y-0 bg-acc" />
      </div>
    </>
  );
}

/**
 * Cursor: a ring with a comet tail in the accent colour. The tail stretches with speed; over
 * links the ring opens, and over project windows or drag areas it says what a click does.
 */
export function Comet() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (reduced() || !window.matchMedia("(pointer: fine)").matches) return;
    const root = document.documentElement;
    root.classList.add("mv-cursor");
    const cv = canvas.current!;
    const ctx = cv.getContext("2d")!;
    const r = ring.current!;
    const dpr = Math.min(window.devicePixelRatio, 2);
    const trail: { x: number; y: number }[] = [];
    const mouse = { x: -100, y: -100 };
    const head = { x: -100, y: -100 };
    let acc = "200,240,49";
    let frame = 0;
    let mode = "";
    gsap.set(r, { xPercent: -50, yPercent: -50 });
    const rx = gsap.quickTo(r, "x", { duration: 0.35, ease: "power3.out" });
    const ry = gsap.quickTo(r, "y", { duration: 0.35, ease: "power3.out" });

    const resize = () => {
      cv.width = window.innerWidth * dpr;
      cv.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const setMode = (next: string) => {
      if (next === mode) return;
      mode = next;
      const big = next === "view" || next === "open";
      const ring = big ? 96 : next === "feed" ? 72 : next === "link" ? 52 : next === "drag" ? 76 : 26;
      gsap.to(r, { width: ring, height: ring, backgroundColor: big ? "var(--acc)" : "rgba(0,0,0,0)", duration: 0.4, ease: "power3.out" });
      setLabel(next === "view" ? "Ver site" : next === "open" ? "Abrir" : next === "drag" ? "Arraste" : next === "feed" ? "Clique" : "");
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      rx(e.clientX);
      ry(e.clientY);
      const t = (e.target as HTMLElement)?.closest?.("[data-cursor], a, button") as HTMLElement | null;
      setMode(t?.dataset.cursor ?? (t ? "link" : root.dataset.mvCursor ?? ""));
    };
    const tick = () => {
      if (frame++ % 30 === 0) {
        const hex = getComputedStyle(root).getPropertyValue("--acc").trim().replace("#", "");
        if (hex.length === 6) acc = [0, 2, 4].map((k) => parseInt(hex.slice(k, k + 2), 16)).join(",");
      }
      head.x += (mouse.x - head.x) * 0.45;
      head.y += (mouse.y - head.y) * 0.45;
      trail.unshift({ x: head.x, y: head.y });
      if (trail.length > 22) trail.pop();
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      ctx.lineCap = "round";
      for (let i = 1; i < trail.length; i++) {
        const k = 1 - i / trail.length;
        ctx.strokeStyle = `rgba(${acc},${k * 0.75})`;
        ctx.lineWidth = k * 5;
        ctx.beginPath();
        ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
        ctx.lineTo(trail[i].x, trail[i].y);
        ctx.stroke();
      }
      ctx.fillStyle = `rgba(${acc},1)`;
      ctx.beginPath();
      ctx.arc(head.x, head.y, 3, 0, Math.PI * 2);
      ctx.fill();
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", move);
    gsap.ticker.add(tick);
    gsap.set(r, { opacity: 1 });
    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", move);
      gsap.ticker.remove(tick);
      root.classList.remove("mv-cursor");
    };
  }, []);

  return (
    <>
      <canvas ref={canvas} aria-hidden className="pointer-events-none fixed inset-0 z-[70] h-full w-full" />
      <div
        ref={ring}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[71] flex size-[26px] items-center justify-center rounded-full border border-acc/70 opacity-0"
      >
        <span className={"mv-label text-[10px] font-medium " + (label === "Clique" ? "text-acc" : "text-ink")}>{label}</span>
      </div>
    </>
  );
}
