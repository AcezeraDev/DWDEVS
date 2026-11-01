"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform, type Variants } from "motion/react";
import { Portal } from "./portal";

const SPRING = { type: "spring", stiffness: 300, damping: 30, mass: 1 } as const;

/** "O que fazemos": the blocks of a page drift loose, and click into a finished layout on hover. */
function BuildArt({ ink }: { ink: boolean }) {
  const line = ink ? "border-ink/30" : "border-white/15";
  const fill = ink ? "bg-ink/80" : "bg-acc";
  const soft = ink ? "bg-ink/25" : "bg-white/15";
  const block = (i: number, rest: { x: number; y: number; r: number }): Variants => ({
    rest: { x: rest.x, y: rest.y, rotate: rest.r, opacity: 0.55 },
    hover: { x: 0, y: 0, rotate: 0, opacity: 1, transition: { ...SPRING, delay: i * 0.05 } },
  });
  return (
    <div className={"relative h-36 w-full max-w-[260px] rounded-xl border p-2.5 " + line}>
      <div className="mb-2 flex gap-1">
        {[0, 1, 2].map((k) => (
          <span key={k} className={"size-1.5 rounded-full " + soft} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <motion.span variants={block(0, { x: -18, y: -10, r: -8 })} className={"col-span-3 h-3 rounded " + soft} />
        <motion.span variants={block(1, { x: 22, y: 14, r: 10 })} className={"col-span-2 h-12 rounded " + fill} />
        <motion.span variants={block(2, { x: 26, y: -16, r: 14 })} className={"h-12 rounded " + soft} />
        {[3, 4, 5].map((k) => (
          <motion.span key={k} variants={block(k, { x: (k - 4) * 22, y: 22, r: (k - 4) * 12 })} className={"h-8 rounded " + soft} />
        ))}
      </div>
      <motion.span
        variants={{ rest: { opacity: 0, scale: 0.6 }, hover: { opacity: 1, scale: 1, transition: { ...SPRING, delay: 0.35 } } }}
        className={"mv-label absolute -bottom-3 right-3 rounded-full px-2 py-0.5 text-[9px] " + (ink ? "bg-ink text-acc" : "bg-acc text-ink")}
      >
        sob medida ✓
      </motion.span>
    </div>
  );
}

/** "Para quem": someone searches for a business like yours, and your site comes up first. */
function SearchArt({ ink }: { ink: boolean }) {
  const line = ink ? "border-ink/25 bg-ink/10" : "border-white/15 bg-white/5";
  return (
    <div className="relative h-36 w-full max-w-[280px]">
      <div className={"flex items-center gap-2 rounded-full border px-3 py-2 " + line}>
        <svg viewBox="0 0 24 24" className="size-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <motion.span
          variants={{ rest: { clipPath: "inset(0 100% 0 0)" }, hover: { clipPath: "inset(0 0% 0 0)", transition: { duration: 0.7, ease: "linear" } } }}
          className="truncate font-mono text-[11px]"
        >
          site para minha empresa
        </motion.span>
        <span className="ml-auto h-3 w-px animate-pulse bg-current" />
      </div>
      <motion.div
        variants={{ rest: { y: 18, opacity: 0, scale: 0.96 }, hover: { y: 0, opacity: 1, scale: 1, transition: { ...SPRING, delay: 0.6 } } }}
        className={"mt-3 rounded-2xl border p-3 " + line}
      >
        <p className="font-mono text-[10px] opacity-60">suaempresa.com.br</p>
        <p className="mt-0.5 text-sm font-semibold">Sua empresa · No topo da busca</p>
        <p className="mt-1 text-[11px] tracking-widest">★★★★★</p>
      </motion.div>
      <motion.span
        variants={{ rest: { opacity: 0.6 }, hover: { opacity: 0 } }}
        className="mv-label absolute bottom-6 left-1 text-[9px] opacity-60 pointer-coarse:hidden"
      >
        passe o mouse →
      </motion.span>
    </div>
  );
}

/** "Como funciona": the three stops of the job light up one after the other. */
function StepsArt({ ink }: { ink: boolean }) {
  const steps = ["Conversa", "Protótipo", "No ar"];
  return (
    <div className="relative h-36 w-full max-w-[280px] pt-6">
      <div className={"absolute left-3 right-3 top-[38px] h-px " + (ink ? "bg-ink/20" : "bg-white/15")} />
      <motion.div
        variants={{ rest: { scaleX: 0 }, hover: { scaleX: 1, transition: { duration: 0.9, ease: [0.2, 0.8, 0.2, 1] } } }}
        className="absolute left-3 right-3 top-[38px] h-px origin-left bg-acc shadow-[0_0_10px_var(--acc)]"
      />
      <div className="relative flex justify-between">
        {steps.map((s, i) => (
          <div key={s} className="flex flex-col items-center gap-2">
            <motion.span
              variants={{
                rest: { scale: 1, backgroundColor: "rgba(255,255,255,0.06)" },
                hover: { scale: [1, 1.35, 1], backgroundColor: "var(--acc)", transition: { delay: 0.15 + i * 0.3, duration: 0.45 } },
              }}
              className="grid size-6 place-items-center rounded-full border border-acc/60 text-[10px] font-bold text-ink"
            >
              {i + 1}
            </motion.span>
            <span className="mv-label text-[9px] opacity-75">{s}</span>
          </div>
        ))}
      </div>
      <motion.p
        variants={{ rest: { opacity: 0, y: 8 }, hover: { opacity: 1, y: 0, transition: { delay: 1.05, ...SPRING } } }}
        className="mv-label mt-5 text-center text-[10px] text-acc"
      >
        site publicado ✓
      </motion.p>
    </div>
  );
}

const ART = [BuildArt, SearchArt, StepsArt];

/**
 * A summary card that behaves like a pane of glass with depth: it tilts toward the cursor on a
 * spring, a glare follows the light, and its layers (portal, illustration, text) sit at
 * different depths so they separate as it turns. Hovering plays its illustration.
 */
export function SummaryCard({ i, q, a }: { i: number; q: string; a: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const still = useReducedMotion();
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const sx = useSpring(px, { stiffness: 300, damping: 30, mass: 1 });
  const sy = useSpring(py, { stiffness: 300, damping: 30, mass: 1 });
  const rotateY = useTransform(sx, [0, 1], [-12, 12]);
  const rotateX = useTransform(sy, [0, 1], [10, -10]);
  const glare = useTransform([sx, sy], ([x, y]: number[]) => `radial-gradient(circle at ${x * 100}% ${y * 100}%, rgba(255,255,255,0.18), transparent 50%)`);
  const lime = i === 1;
  const Art = ART[i];
  // Touch screens have no hover: the illustration plays once the card is well inside the screen
  const [touch, setTouch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const on = () => setTouch(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  return (
    <motion.div
      ref={ref}
      initial="rest"
      animate="rest"
      whileHover="hover"
      whileInView={touch ? "hover" : undefined}
      viewport={{ amount: 0.7 }}
      onPointerMove={(e) => {
        if (still || e.pointerType !== "mouse") return;
        const r = ref.current!.getBoundingClientRect();
        px.set((e.clientX - r.left) / r.width);
        py.set((e.clientY - r.top) / r.height);
      }}
      onPointerLeave={() => {
        px.set(0.5);
        py.set(0.5);
      }}
      style={{ rotateX: still ? 0 : rotateX, rotateY: still ? 0 : rotateY, transformPerspective: 1100, transformStyle: "preserve-3d" }}
      className={
        "group relative flex min-h-[60svh] flex-col overflow-hidden rounded-[2rem] p-7 md:p-9 " +
        (lime ? "bg-acc text-ink transition-colors duration-700" : "mv-panel text-paper")
      }
    >
      {/* Faint grid and orbit lines, the card's "space" */}
      <svg aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-[380px] opacity-60" viewBox="0 0 200 200" fill="none">
        {[90, 70, 50].map((r, k) => (
          <ellipse key={r} cx="100" cy="100" rx={r} ry={r * 0.42} transform={`rotate(${-25 + k * 20} 100 100)`} stroke={lime ? "rgba(7,8,10,0.16)" : "rgba(255,255,255,0.07)"} strokeDasharray="2 4" />
        ))}
      </svg>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{ backgroundImage: `radial-gradient(${lime ? "#07080a" : "#f1f0e8"} 1px, transparent 1px)`, backgroundSize: "18px 18px" }}
      />
      <motion.div aria-hidden className="pointer-events-none absolute inset-0 z-20 mix-blend-overlay" style={{ background: glare }} />

      <div className="relative flex items-start justify-between" style={{ transform: "translateZ(40px)" }}>
        <div>
          <span className={"mv-label " + (lime ? "text-ink/60" : "text-acc")}>D-0{i + 1}</span>
          <p className={"mv-label mt-1 text-[9px] " + (lime ? "text-ink/45" : "text-muted")}>Dimensão {["um", "dois", "três"][i]} de três</p>
        </div>
        <span className={"rounded-full p-1 " + (lime ? "bg-ink" : "")}>
          <Portal className="w-20 md:w-24" tilt={false} />
        </span>
      </div>

      <div className={"relative my-6 flex flex-1 items-center " + (lime ? "text-ink" : "text-paper/85")} style={{ transform: "translateZ(70px)" }}>
        <Art ink={lime} />
      </div>

      <div className="relative" style={{ transform: "translateZ(30px)" }}>
        <h3 className="mv-display text-3xl font-bold uppercase leading-none tracking-tight md:text-4xl">{q}</h3>
        <p className={"mt-4 text-lg leading-relaxed " + (lime ? "text-ink/80" : "text-paper/75")}>{a}</p>
      </div>

      <span
        aria-hidden
        className={"mv-display pointer-events-none absolute -bottom-10 -right-3 text-[10rem] font-extrabold leading-none opacity-[0.07] transition-transform duration-700 group-hover:-translate-y-4 group-hover:-rotate-6 " + (lime ? "text-ink" : "text-acc")}
      >
        {["?", "→", "✓"][i]}
      </span>
    </motion.div>
  );
}
