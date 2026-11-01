"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { AnimatePresence, motion } from "motion/react";
import { RollText } from "@/components/ui-kit";
import { Label } from "./chrome";
import { Portal } from "./portal";
import { SERVICES, STACK } from "./data";
import { mv, reduced, warpTo } from "./store";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const SPRING = { type: "spring", stiffness: 300, damping: 30, mass: 1 } as const;

function ServiceCard({ s, onOpen }: { s: (typeof SERVICES)[number]; onOpen: () => void }) {
  return (
    <motion.button
      layoutId={`svc-${s.n}`}
      onClick={onOpen}
      data-cursor="open"
      transition={SPRING}
      style={{ borderRadius: 28 }}
      className="group mv-panel mv-spot flex h-full min-h-[440px] w-full flex-col overflow-hidden p-7 text-left md:p-8"
    >
      <div className="flex items-start justify-between">
        <motion.span layoutId={`svc-portal-${s.n}`} transition={SPRING} className="block w-28 transition-transform duration-700 group-hover:scale-110">
          <Portal className="w-full">
            <span className="mv-display text-lg font-bold text-acc">{s.n}</span>
          </Portal>
        </motion.span>
        <span className="mv-label rounded-full border border-white/10 px-3 py-1.5 text-muted transition-colors group-hover:border-acc group-hover:text-acc">Abrir +</span>
      </div>
      <motion.h3 layoutId={`svc-title-${s.n}`} transition={SPRING} className="mv-display mt-10 text-2xl font-bold uppercase leading-[1.05] tracking-tight md:text-[1.7rem]">
        {s.title}
      </motion.h3>
      <p className="mt-4 text-paper/70">{s.text}</p>
      <ul className="mt-auto flex flex-wrap gap-2 pt-6">
        {s.items.map((it) => (
          <li key={it} className="mv-label rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-paper/70">
            {it}
          </li>
        ))}
      </ul>
    </motion.button>
  );
}

/**
 * Services as portals: each card carries one; clicking it, the card opens into the whole
 * screen (shared layout), the portal grows to the size of a doorway and the details come through.
 */
export function Portals() {
  const [open, setOpen] = useState<number | null>(null);
  const s = open === null ? null : SERVICES[open];

  useEffect(() => {
    if (open === null) return;
    mv.lenis?.stop();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("keydown", esc);
      mv.lenis?.start();
    };
  }, [open]);

  return (
    <section id="servicos" data-scene="2" className="relative px-4 py-28 md:px-10 md:py-36">
      <div className="mx-auto max-w-[1400px]">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <Label index="03">O que sai daqui</Label>
            <h2 className="mv-collapse mv-display mt-6 text-[clamp(2.2rem,6.5vw,6.5rem)] font-extrabold uppercase leading-[0.92] tracking-[-0.04em]">
              Do zero <br />
              <span className="mv-outline">ao deploy.</span>
            </h2>
          </div>
          <p className="max-w-sm text-paper/65">
            Cuidamos de tudo: estrutura, design, desenvolvimento, animações, publicação e ajustes depois que o site vai ao ar.
            Abra cada portal para ver o que entra.
          </p>
        </div>

        <div className="mv-rise mt-16 grid gap-5 [perspective:1400px] md:grid-cols-2 xl:grid-cols-4">
          {SERVICES.map((x, i) => (
            <div key={x.n} className="min-h-[440px]">
              {open !== i && <ServiceCard s={x} onOpen={() => setOpen(i)} />}
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {s && (
          <motion.div key="veil" className="fixed inset-0 z-[60] bg-ink/80 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(null)} />
        )}
        {s && (
          <div key="sheet" className="pointer-events-none fixed inset-0 z-[61] grid place-items-center p-4 md:p-10" data-lenis-prevent>
            <motion.article
              layoutId={`svc-${s.n}`}
              transition={SPRING}
              style={{ borderRadius: 32 }}
              role="dialog"
              aria-modal="true"
              aria-label={s.title}
              className="mv-panel pointer-events-auto relative grid max-h-[calc(100svh-2rem)] w-full max-w-5xl gap-8 overflow-y-auto p-7 md:grid-cols-[0.9fr_1.1fr] md:items-center md:p-12"
            >
              <motion.span layoutId={`svc-portal-${s.n}`} transition={SPRING} className="group mx-auto block w-[min(62vw,360px)]" data-cursor="open">
                <Portal className="w-full">
                  <span className="mv-display text-5xl font-extrabold text-acc md:text-7xl">{s.n}</span>
                </Portal>
              </motion.span>
              <div>
                <motion.h3 layoutId={`svc-title-${s.n}`} transition={SPRING} className="mv-display text-3xl font-bold uppercase leading-[1.02] tracking-tight md:text-5xl">
                  {s.title}
                </motion.h3>
                <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0, transition: { ...SPRING, delay: 0.15 } }} exit={{ opacity: 0, transition: { duration: 0.15 } }}>
                  <p className="mt-5 text-lg text-paper/75">{s.text}</p>
                  <p className="mv-label mt-8 text-muted">O que entra</p>
                  <ul className="mt-3 grid gap-x-6 sm:grid-cols-2">
                    {s.items.map((it, k) => (
                      <motion.li
                        key={it}
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0, transition: { ...SPRING, delay: 0.22 + k * 0.06 } }}
                        className="flex items-center gap-3 border-b border-white/10 py-3 text-paper/85"
                      >
                        <span className="size-1.5 rounded-full bg-acc" />
                        {it}
                      </motion.li>
                    ))}
                  </ul>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <button
                      onClick={() => {
                        setOpen(null);
                        setTimeout(() => warpTo("#contato"), 350);
                      }}
                      className="rounded-full bg-acc px-6 py-3.5 font-semibold text-ink transition-transform hover:scale-[1.04]"
                    >
                      <RollText>Pedir orçamento</RollText>
                    </button>
                    <button onClick={() => setOpen(null)} className="mv-glass rounded-full px-6 py-3.5 text-paper/80 hover:text-acc">
                      <RollText>Fechar portal</RollText>
                    </button>
                  </div>
                </motion.div>
              </div>
            </motion.article>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}

/** Where each constellation sits in the map (viewBox 1000×620), how wide it spreads, its spin. */
const SKY = [
  { x: 210, y: 175, r: 125, turn: -0.6, spin: 0.06 },
  { x: 735, y: 165, r: 140, turn: 0.4, spin: -0.045 },
  { x: 300, y: 470, r: 105, turn: 1.2, spin: 0.075 },
  { x: 760, y: 465, r: 115, turn: 2.1, spin: -0.055 },
];

type StarEls = { pt: SVGGElement | null; label: SVGTextElement | null; spoke: SVGLineElement | null; packet: SVGCircleElement | null };

/**
 * The stack as a living star map. Each group is a constellation slowly turning on itself (labels
 * stay upright), its stars twinkle, pulses of light run from the core out to every tool, and a
 * shooting star crosses the map now and then. The lines draw themselves as it scrolls in, the
 * map drifts with the cursor in depth, and hovering a group lights it up and spins it faster.
 */
export function Constellation() {
  const root = useRef<HTMLElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const activeRef = useRef<number | null>(null);
  const els = useRef<StarEls[][]>(STACK.map((g) => g.items.map(() => ({ pt: null, label: null, spoke: null, packet: null }))));
  const loops = useRef<(SVGPolylineElement | null)[]>([]);
  const cores = useRef<(SVGCircleElement | null)[]>([]);
  const meteor = useRef<SVGLineElement>(null);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  const stars = useMemo(
    () =>
      STACK.map((g, gi) => {
        const c = SKY[gi];
        return g.items.map((name, i) => {
          const a = c.turn + (i / g.items.length) * Math.PI * 2;
          const rr = c.r * (0.72 + ((i * 37) % 10) / 30);
          return { name, a, rr, x: c.x + Math.cos(a) * rr, y: c.y + Math.sin(a) * rr * 0.8, right: Math.cos(a) >= 0 };
        });
      }),
    []
  );

  useGSAP(
    () => {
      if (reduced()) return;
      const tl = gsap.timeline({ scrollTrigger: { trigger: ".sky", start: "top 85%", end: "center 55%", scrub: 0.8 } });
      tl.fromTo(".sky-line", { strokeDashoffset: 1 }, { strokeDashoffset: 0, stagger: 0.04, ease: "none", duration: 0.5 }, 0)
        .fromTo(".sky-star", { scale: 0, transformOrigin: "center", transformBox: "fill-box" }, { scale: 1, stagger: 0.03, ease: "back.out(3)", duration: 0.3 }, 0.1)
        .fromTo(".sky-name", { opacity: 0 }, { opacity: 1, stagger: 0.02, duration: 0.3 }, 0.3);

      // Every frame: turn each constellation, move its stars, spokes, loop and pulses
      const spin = SKY.map(() => 0);
      const shoot = { t: 1, x: 0, y: 0, dx: 0, dy: 0, wait: 2 };
      let visible = false;
      const io = new IntersectionObserver(([e]) => void (visible = e.isIntersecting));
      io.observe(root.current!);
      let time = 0;
      const tick = (_: number, ms: number) => {
        if (!visible) return;
        const dt = Math.min(ms / 1000, 0.05);
        time += dt;
        SKY.forEach((c, gi) => {
          spin[gi] += dt * c.spin * (activeRef.current === gi ? 2.2 : 1);
          const pts: string[] = [];
          stars[gi].forEach((s, i) => {
            const a = s.a + spin[gi];
            const x = c.x + Math.cos(a) * s.rr;
            const y = c.y + Math.sin(a) * s.rr * 0.8;
            pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
            const e = els.current[gi][i];
            e.pt?.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
            e.pt?.style.setProperty("--tw", (0.55 + 0.45 * Math.sin(time * (1.4 + (i % 3) * 0.5) + i * 1.7 + gi)).toFixed(2));
            if (e.label) {
              const right = Math.cos(a) >= 0;
              e.label.setAttribute("x", String(right ? 12 : -12));
              e.label.setAttribute("text-anchor", right ? "start" : "end");
            }
            e.spoke?.setAttribute("x2", x.toFixed(1));
            e.spoke?.setAttribute("y2", y.toFixed(1));
            // A pulse running out from the core along the spoke
            const f = (time * 0.32 + i * 0.23 + gi * 0.11) % 1;
            if (e.packet) {
              e.packet.setAttribute("cx", (c.x + (x - c.x) * f).toFixed(1));
              e.packet.setAttribute("cy", (c.y + (y - c.y) * f).toFixed(1));
              e.packet.setAttribute("opacity", Math.sin(Math.PI * f).toFixed(2));
            }
          });
          pts.push(pts[0]);
          loops.current[gi]?.setAttribute("points", pts.join(" "));
          cores.current[gi]?.setAttribute("r", (9 + Math.sin(time * 1.6 + gi * 1.3) * 1.6).toFixed(2));
        });
        // Shooting star: waits a few seconds, then streaks across part of the map
        if (shoot.t >= 1) {
          shoot.wait -= dt;
          if (shoot.wait <= 0) {
            Object.assign(shoot, { t: 0, x: 100 + Math.random() * 600, y: 20 + Math.random() * 200, dx: 260 + Math.random() * 160, dy: 120 + Math.random() * 90, wait: 3 + Math.random() * 4 });
          }
        } else shoot.t = Math.min(1, shoot.t + dt / 0.9);
        const m = meteor.current;
        if (m) {
          const k = shoot.t < 1 ? shoot.t : 1;
          const hx = shoot.x + shoot.dx * k;
          const hy = shoot.y + shoot.dy * k;
          m.setAttribute("x1", hx.toFixed(1));
          m.setAttribute("y1", hy.toFixed(1));
          m.setAttribute("x2", (hx - shoot.dx * 0.35).toFixed(1));
          m.setAttribute("y2", (hy - shoot.dy * 0.35).toFixed(1));
          m.setAttribute("opacity", shoot.t < 1 ? Math.sin(Math.PI * shoot.t).toFixed(2) : "0");
        }
      };
      gsap.ticker.add(tick);

      const cleanups = [() => gsap.ticker.remove(tick), () => io.disconnect()];
      if (window.matchMedia("(pointer: fine)").matches) {
        const groups = gsap.utils.toArray<SVGGElement>(".sky-group");
        const movers = groups.map((g) => ({ x: gsap.quickTo(g, "x", { duration: 1.2, ease: "power3.out" }), y: gsap.quickTo(g, "y", { duration: 1.2, ease: "power3.out" }) }));
        const move = (e: PointerEvent) => {
          const px = e.clientX / window.innerWidth - 0.5;
          const py = e.clientY / window.innerHeight - 0.5;
          movers.forEach((m, i) => {
            const depth = 14 + i * 9;
            m.x(px * depth);
            m.y(py * depth);
          });
        };
        window.addEventListener("pointermove", move);
        cleanups.push(() => window.removeEventListener("pointermove", move));
      }
      return () => cleanups.forEach((f) => f());
    },
    { scope: root }
  );

  const dim = (gi: number) => (active === null || active === gi ? 1 : 0.18);

  return (
    <section id="stack" data-scene="3" ref={root} className="relative px-4 py-28 md:px-10 md:py-36">
      <div className="mx-auto max-w-[1400px]">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <Label index="04">Nossa caixa de ferramentas</Label>
            <h2 className="mv-collapse mv-display mt-6 text-[clamp(2.2rem,6vw,6rem)] font-extrabold uppercase leading-[0.92] tracking-[-0.04em]">
              Ferramentas <br />
              <span className="text-acc">de ponta.</span>
            </h2>
          </div>
          <p className="max-w-sm text-paper/65">O que usamos para levar cada site do rascunho ao ar. Passe o mouse numa constelação para destacar.</p>
        </div>

        <div className="mv-glass relative mt-14 overflow-hidden rounded-[2rem] p-3 md:p-6">
          <svg viewBox="0 0 1000 620" className="sky w-full" role="img" aria-label="Mapa das ferramentas que usamos, agrupadas em quatro constelações">
            <defs>
              <linearGradient id="sky-meteor" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#f1f0e8" />
                <stop offset="1" stopColor="var(--acc)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <line ref={meteor} stroke="url(#sky-meteor)" strokeWidth="2" strokeLinecap="round" opacity="0" />
            {STACK.map((g, gi) => {
              const c = SKY[gi];
              const list = stars[gi];
              return (
                <g
                  key={g.group}
                  className="sky-group transition-opacity duration-500"
                  style={{ opacity: dim(gi) }}
                  onMouseEnter={() => setActive(gi)}
                  onMouseLeave={() => setActive(null)}
                >
                  <circle cx={c.x} cy={c.y} r={c.r * 1.25} fill="none" stroke="var(--acc)" strokeOpacity="0.06" strokeDasharray="2 6" />
                  {list.map((s, i) => (
                    <line
                      key={`c-${s.name}`}
                      ref={(el) => void (els.current[gi][i].spoke = el)}
                      className="sky-line"
                      x1={c.x}
                      y1={c.y}
                      x2={s.x}
                      y2={s.y}
                      stroke="var(--acc)"
                      strokeOpacity="0.28"
                      strokeWidth="1"
                      pathLength={1}
                      strokeDasharray="1"
                    />
                  ))}
                  <polyline
                    ref={(el) => void (loops.current[gi] = el)}
                    className="sky-line"
                    points={[...list, list[0]].map((s) => `${s.x},${s.y}`).join(" ")}
                    fill="none"
                    stroke="var(--acc-2)"
                    strokeOpacity="0.45"
                    strokeWidth="1"
                    pathLength={1}
                    strokeDasharray="1"
                  />
                  {list.map((s, i) => (
                    <circle key={`p-${s.name}`} ref={(el) => void (els.current[gi][i].packet = el)} r="2.4" fill="var(--acc)" opacity="0" style={{ filter: "drop-shadow(0 0 4px var(--acc))" }} />
                  ))}
                  <circle
                    ref={(el) => void (cores.current[gi] = el)}
                    className="sky-star"
                    cx={c.x}
                    cy={c.y}
                    r="9"
                    fill="var(--acc)"
                    style={{ filter: "drop-shadow(0 0 12px var(--acc))" }}
                  />
                  <text x={c.x} y={c.y + 34} textAnchor="middle" className="sky-name fill-paper font-mono text-[15px] uppercase tracking-[0.14em] md:text-[13px]">
                    {g.group}
                  </text>
                  {list.map((s, i) => (
                    <g key={s.name} ref={(el) => void (els.current[gi][i].pt = el)} className="sky-pt" transform={`translate(${s.x} ${s.y})`}>
                      <circle r="14" fill="transparent" />
                      <circle className="sky-star sky-dot" r="4.5" fill="#f1f0e8" style={{ filter: "drop-shadow(0 0 6px var(--acc))" }} />
                      <text
                        ref={(el) => void (els.current[gi][i].label = el)}
                        x={s.right ? 12 : -12}
                        y={5}
                        textAnchor={s.right ? "start" : "end"}
                        className="sky-name sky-label hidden fill-paper/75 text-[14px] md:block"
                      >
                        {s.name}
                      </text>
                    </g>
                  ))}
                </g>
              );
            })}
          </svg>

          {/* Legend (wide) / full list (phones, where the star names would be too small) */}
          <ul className="mt-2 grid gap-3 border-t border-white/10 pt-5 sm:grid-cols-2 lg:grid-cols-4">
            {STACK.map((g, gi) => (
              <li key={g.group} onMouseEnter={() => setActive(gi)} onMouseLeave={() => setActive(null)} className="rounded-2xl px-3 py-2 transition-colors hover:bg-white/5">
                <p className="mv-display flex items-center gap-2 text-sm font-bold uppercase tracking-tight">
                  <span className="size-2 rounded-full bg-acc" />
                  {g.group}
                  <span className="mv-label ml-auto text-muted">0{gi + 1}</span>
                </p>
                <p className="mt-2 text-sm text-paper/60 md:hidden">{g.items.join(" · ")}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
